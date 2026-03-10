import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { saveApplication, useConfig, incrementVisits, useAdminUnlock } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import bgImage from "@/assets/bg_pleasant.png";
import logoImage from "@assets/photo_2025-09-12_14-10-05.png_1772531750546.jpg";
import { Send, Lock, Upload, Eye, EyeOff, Info, ChevronUp, ChevronDown, Monitor, Smartphone, X, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading } = useConfig();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statsPhotoPreview, setStatsPhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showStatusCheck, setShowStatusCheck] = useState(false);
  const [statusQuery, setStatusQuery] = useState("");
  const [statusResult, setStatusResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const { showPrompt, setShowPrompt, setLocation } = useAdminUnlock();
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      setShowPrompt(true);
      toast({
        title: "Скрытый вход",
        description: "Введите пароль администратора",
      });
    }, 10000); // 10 seconds
  };

  const endPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  useEffect(() => {
    incrementVisits();
  }, []);

  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm({
    defaultValues: {
      login: "",
      realName: "",
      age: "",
      timezone: "",
      online: "",
      server: "Москва",
      about: "",
      bans: "",
      nickname: "",
      level: "",
      experience: "",
      adminExp: "",
      vk: "",
      forumLink: "",
      statsPhoto: "", // Will store base64 string
    }
  });

  const selectedServer = watch("server");
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [showForumGuide, setShowForumGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'pc' | 'mobile'>('pc');
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const isServerOpen = config?.servers[selectedServer]?.isOpen;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setShowServerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 1024;
          let { width, height } = img;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "Файл слишком большой. Максимальный размер 15МБ",
        });
        return;
      }
      const compressed = await compressImage(file);
      setValue("statsPhoto", compressed);
      setStatsPhotoPreview(compressed);
    }
  };


  const onSubmit = async (data: any) => {
    if (!config) return;

    // VK Validation
    if (!data.vk.toLowerCase().includes("vk.com")) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Ссылка на ВК должна содержать vk.com",
      });
      return;
    }

    if (!data.statsPhoto) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пожалуйста, загрузите скриншот статистики",
      });
      return;
    }

    if (!config.servers[data.server]?.isOpen) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: `Набор на сервер ${data.server} временно закрыт.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use nickname as login for backend compatibility if needed
      const submissionData = { ...data, login: data.nickname };
      await saveApplication(submissionData);
      toast({
        title: "Заявка успешно отправлена!",
        description: "Рассмотрение занимает обычно 24-48 часов. Если вам одобрят - с вами свяжется Красная Администрация сервера. Проверить статус можно кнопкой «Результаты».",
      });
      reset();
      setStatsPhotoPreview(null); // Clear preview after reset
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось отправить заявку.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    if (password === config.adminPassword) {
      setShowPrompt(false);
      localStorage.setItem("admin_role", "full");
      setLocation("/admin");
      return;
    }
    for (const [serverName, serverCfg] of Object.entries(config.servers)) {
      if (password === serverCfg.password) {
        setShowPrompt(false);
        localStorage.setItem("admin_role", serverName);
        setLocation("/admin");
        return;
      }
    }
    toast({ variant: "destructive", title: "Ошибка", description: "Неверный пароль доступа." });
    setPassword("");
  };

  const handleStatusCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusQuery) return;

    setIsChecking(true);
    setStatusError(null);
    setStatusResult(null);

    try {
      const resp = await fetch(`/api/applications/check?query=${encodeURIComponent(statusQuery)}&server=${encodeURIComponent(selectedServer)}`);
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Заявка не найдена");
      }
      const data = await resp.json();
      setStatusResult(data);
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Загрузка конфигурации...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Ошибка загрузки конфигурации.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8 overflow-x-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-background/95 via-background/90 to-primary/5 backdrop-blur-[1px]"></div>

      {/* Top Status Menu - Responsive Fix */}
      <div className="relative z-10 w-full max-w-4xl mb-6 animate-in slide-in-from-top duration-700">
        <div className="glass-panel p-3 sm:p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 border border-white/10 shadow-2xl">
          {Object.entries(config.servers).map(([name, cfg]) => (
            <div key={name} className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/20 border border-white/5">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">{name}</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${cfg.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-xs sm:text-sm font-display font-bold uppercase tracking-wide ${cfg.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                  {cfg.isOpen ? 'Набор Открыт' : 'Набор Закрыт'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-3xl glass-panel p-6 sm:p-10 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500 mb-12 border border-white/10">
        <div className="text-center mb-10">
          <div
            className="mx-auto w-24 h-24 mb-6 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse cursor-pointer select-none active:scale-95 transition-transform"
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
          >
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover pointer-events-none" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tighter text-white uppercase leading-none">
            ЗАЯВКА НА ПОСТ
          </h2>
          <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tighter text-primary uppercase leading-none mt-1" style={{ textShadow: '0 0 15px rgba(225,29,72,0.5)' }}>
            АДМИНИСТРАТОРА
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-gray-400 font-sans tracking-wide max-w-md mx-auto">
            Заполните форму ниже для подачи заявления. Все поля обязательны к заполнению.
          </p>
        </div>

        <form className="space-y-6 font-sans" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ваше имя *</label>
              <input {...register("realName", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="Имя (в жизни)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ваш возраст *</label>
              <div className="relative group">
                <input
                  type="number"
                  {...register("age", {
                    required: true,
                    onChange: (e) => {
                      // No more UI restrictions, only numeric check
                    }
                  })}
                  className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Возраст"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(getValues("age")) || 14;
                      setValue("age", String(current + 1));
                    }}
                    className="p-0.5 hover:text-primary transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(getValues("age")) || 14;
                      if (current > 14) setValue("age", String(current - 1));
                    }}
                    className="p-0.5 hover:text-primary transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Часовой пояс *</label>
              <input {...register("timezone", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="МСК (UTC+3)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Средний онлайн *</label>
              <input {...register("online", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="4-5 часов" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Игровой сервер *</label>
              <div className="relative" ref={serverDropdownRef}>
                <div
                  onClick={() => setShowServerDropdown(!showServerDropdown)}
                  className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all"
                >
                  <span>{selectedServer} {config?.servers[selectedServer]?.isOpen ? "" : "(Закрыто)"}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showServerDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showServerDropdown && (
                  <div className="absolute z-[60] left-0 right-0 mt-2 p-1 rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    {(config ? Object.entries(config.servers) : []).map(([name, cfg]) => (
                      <div
                        key={name}
                        onClick={() => {
                          setValue("server", name);
                          setShowServerDropdown(false);
                        }}
                        className={`px-4 py-3 rounded-xl cursor-pointer transition-all ${selectedServer === name ? 'bg-primary text-white font-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ссылка на форумный аккаунт *</label>
                <button
                  type="button"
                  onClick={() => setShowForumGuide(true)}
                  className="p-1 hover:bg-white/5 rounded-lg text-primary transition-all active:scale-95"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <input {...register("forumLink", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="https://forum.ragerussia.online/members/..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Расскажите о себе *</label>
            <textarea {...register("about", { required: true })} rows={3} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm resize-none" placeholder="Коротко о себе..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Баны на проекте *</label>
            <textarea {...register("bans", { required: true })} rows={2} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm resize-none" placeholder="Нет / Да (причины)" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-white/5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Игровой Ник *</label>
              <input {...register("nickname", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="Fernando_Namikazze" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Игровой уровень *</label>
              <div className="relative group">
                <input
                  type="number"
                  {...register("level", { required: true })}
                  className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Уровень персонажа"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(getValues("level")) || 0;
                      setValue("level", String(current + 1));
                    }}
                    className="p-0.5 hover:text-primary transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(getValues("level")) || 0;
                      if (current > 0) setValue("level", String(current - 1));
                    }}
                    className="p-0.5 hover:text-primary transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Опыт на CRMP проектах *</label>
            <textarea {...register("experience", { required: true })} rows={2} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm resize-none" placeholder="Где играли, какие должности..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Опыт администратора *</label>
            <textarea {...register("adminExp", { required: true })} rows={2} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm resize-none" placeholder="Были ли админом у нас? (Ник с которого стояли)" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ссылка на VK *</label>
              <input {...register("vk", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="vk.com/id..." />
            </div>
            <div className="space-y-1.5">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">СКРИНШОТ СТАТИСТИКИ (ФОТО) *</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="stats-photo-upload"
                  />
                  <label
                    htmlFor="stats-photo-upload"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-8 focus:outline-none focus:border-primary/50 text-white placeholder:text-gray-700 transition-all font-bold text-sm cursor-pointer hover:bg-white/10 flex flex-col items-center justify-center gap-2"
                  >
                    {statsPhotoPreview ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/20">
                        <img src={statsPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-black">ИЗМЕНИТЬ ФОТО</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-primary/50" />
                        <span className="text-gray-400 text-xs">НАЖМИТЕ ДЛЯ ЗАГРУЗКИ СКРИНШОТА</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {!isServerOpen ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-[2] p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center gap-3 animate-in shake duration-500">
                  <Lock className="w-5 h-5 text-red-500" />
                  <p className="text-red-400 text-xs font-bold uppercase tracking-wide">
                    Набор на {{
                      "Москва": "Москву",
                      "Питер": "Питер",
                      "Екб": "Екб"
                    }[selectedServer] || selectedServer} закрыт
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatusCheck(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-display font-black text-sm hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-widest"
                >
                  <Search className="w-5 h-5 text-primary" /> Результаты
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative flex-[2] flex justify-center py-4 px-4 border border-transparent text-sm sm:text-lg font-display font-black rounded-xl text-white gaming-button focus:outline-none focus:ring-2 focus:ring-primary shadow-xl shadow-primary/20"
                >
                  {isSubmitting ? "ОТПРАВКА..." : (
                    <span className="flex items-center gap-3">
                      ОТПРАВИТЬ ЗАЯВЛЕНИЕ <Send className="w-5 h-5" />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusCheck(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-display font-black text-sm hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-widest"
                >
                  <Search className="w-5 h-5 text-primary" /> Результаты
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in">
          <form onSubmit={handleAdminLogin} className="glass-panel p-8 rounded-2xl max-w-sm w-full animate-in zoom-in-95 border border-white/10 mx-4">
            <h3 className="text-xl font-display font-black text-white mb-6 text-center text-primary uppercase tracking-[0.2em]">КЛЮЧ ДОСТУПА</h3>
            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-4 pr-12 rounded-xl gaming-input text-white text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary font-bold bg-black/50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowPrompt(false)} className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-black border border-white/5">Отмена</button>
              <button type="submit" className="flex-1 py-3 px-4 rounded-xl gaming-button text-white uppercase tracking-widest text-[10px] font-black">Вход</button>
            </div>
          </form>
        </div>
      )}

      {/* Status Check Modal */}
      <AnimatePresence>
        {showStatusCheck && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowStatusCheck(false);
                setStatusResult(null);
                setStatusError(null);
                setStatusQuery("");
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/50">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Проверка статуса</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Введите данные заявки</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStatusCheck(false);
                    setStatusResult(null);
                    setStatusError(null);
                    setStatusQuery("");
                  }}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <form onSubmit={handleStatusCheck} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ник, ВК или IP</label>
                    <div className="relative">
                      <input
                        value={statusQuery}
                        onChange={(e) => setStatusQuery(e.target.value)}
                        placeholder="Например: Fernando_Namikazze"
                        className="w-full px-4 py-4 rounded-xl gaming-input text-white text-sm bg-black/40 focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="submit"
                        disabled={isChecking || !statusQuery}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-lg text-white hover:bg-primary/80 disabled:opacity-50 transition-all"
                      >
                        {isChecking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-600 font-bold px-1 uppercase tracking-wide">
                      Поиск ведется по серверу: <span className="text-primary">{selectedServer}</span>
                    </p>
                  </div>
                </form>

                <AnimatePresence mode="wait">
                  {statusError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center"
                    >
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-xs text-red-400 font-bold leading-relaxed">
                        {statusError}
                      </p>
                    </motion.div>
                  )}

                  {statusResult && Array.isArray(statusResult) && (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {statusResult.map((result, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-6 rounded-2xl border text-center relative overflow-hidden ${result.status === 'approved'
                            ? 'bg-green-500/10 border-green-500/30'
                            : result.status === 'rejected'
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-yellow-500/10 border-yellow-500/30'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                              #{statusResult.length - idx}
                            </span>
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                              {new Date(result.createdAt).toLocaleString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>

                          <div className="mb-4">
                            {result.status === 'approved' ? (
                              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                            ) : result.status === 'rejected' ? (
                              <XCircle className="w-10 h-10 text-red-500 mx-auto" />
                            ) : (
                              <Clock className="w-10 h-10 text-yellow-500 mx-auto animate-pulse" />
                            )}
                          </div>

                          <h4 className={`text-md font-black uppercase tracking-widest mb-1 ${result.status === 'approved'
                            ? 'text-green-500'
                            : result.status === 'rejected'
                              ? 'text-red-500'
                              : 'text-yellow-500'
                            }`}>
                            {result.status === 'approved'
                              ? 'Одобрено'
                              : result.status === 'rejected'
                                ? 'Отклонено'
                                : 'В ожидании'}
                          </h4>

                          <p className="text-[9px] text-gray-400 font-bold uppercase mb-4">
                            Заявка от {result.nickname}
                          </p>

                          <div className="pt-4 border-t border-white/5">
                            {result.status === 'rejected' && result.rejectionReason && (
                              <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-left">
                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1 italic">Причина отказа:</p>
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide">{result.rejectionReason}</p>
                              </div>
                            )}
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                              {result.status === 'approved'
                                ? 'С вами свяжется руководство в ближайшее время'
                                : result.status === 'rejected'
                                  ? 'Вы можете подать новую заявку через 3 дня после последнего рассмотрения'
                                  : 'Ваша заявка находится на стадии рассмотрения'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-4 bg-black/60 border-t border-white/10 flex justify-center">
                <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">
                  Reynov Production 2.0
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forum Guide Modal */}
      <AnimatePresence>
        {showForumGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForumGuide(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(225,29,72,0.2)]">
                    <Info className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Гайд по ссылке на профиль</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Как найти и скопировать ссылку</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForumGuide(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-2 bg-black/40 border-b border-white/5 gap-2">
                <button
                  onClick={() => setGuideTab('pc')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${guideTab === 'pc' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                  <Monitor className="w-4 h-4" /> ДЛЯ ПК
                </button>
                <button
                  onClick={() => setGuideTab('mobile')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${guideTab === 'mobile' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                  <Smartphone className="w-4 h-4" /> ДЛЯ ТЕЛЕФОНА
                </button>
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto custom-scrollbar bg-black/20 flex-1">
                <div className="space-y-8">
                  {guideTab === 'pc' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="grid gap-4">
                        {[
                          { step: 1, text: "Зайдите на главную страницу форума (forum.ragerussia.online)" },
                          { step: 2, text: "В правой панели 'Пользователи онлайн' найдите себя (вы будете самым первым)" },
                          { step: 3, text: "Нажмите на свой ник дважды" },
                          { step: 4, text: "Вас перекинет на профиль — копируйте ссылку и вставьте в анкету" }
                        ].map((item) => (
                          <div key={item.step} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 items-start hover:border-primary/20 transition-colors">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-sm">
                              {item.step}
                            </span>
                            <p className="text-xs font-bold text-gray-300 leading-relaxed pt-1">{item.text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl group relative">
                        <video key="pc-video" controls className="w-full h-full object-contain">
                          <source src="/guidpc.mp4" type="video/mp4" />
                          Ваш браузер не поддерживает видео.
                        </video>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid gap-4">
                        {[
                          { step: 1, text: "Зайдите на главную страницу форума (forum.ragerussia.online)" },
                          { step: 2, text: "Листайте вниз, пока не увидите панель 'Пользователи онлайн'" },
                          { step: 3, text: "Найдите себя в списке (вы стоите самым первым) и дважды нажмите на ник" },
                          { step: 4, text: "После перехода в профиль — копируйте ссылку и вставьте в анкету" }
                        ].map((item) => (
                          <div key={item.step} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 items-start hover:border-primary/20 transition-colors">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-sm">
                              {item.step}
                            </span>
                            <p className="text-xs font-bold text-gray-300 leading-relaxed pt-1">{item.text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                        <video key="mobile-video" controls className="w-full h-full object-contain">
                          <source src="/guidtel.mp4" type="video/mp4" />
                          Ваш браузер не поддерживает видео.
                        </video>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-black/60 border-t border-white/10 flex justify-center">
                <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">
                  Reynov Production 2.0
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
