import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { saveApplication, useAdminUnlock, getConfig } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import bgImage from "@/assets/bg.png";
import logoImage from "@assets/photo_2025-09-12_14-10-05.png_1772531750546.jpg";
import { Send, Lock } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const { showPrompt, setShowPrompt, setLocation } = useAdminUnlock();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const config = getConfig();

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      server: "Москва"
    }
  });

  const selectedServer = watch("server");
  const isServerOpen = config.servers[selectedServer]?.isOpen;

  const onSubmit = (data: any) => {
    if (!config.servers[data.server]?.isOpen) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: `Набор на сервер ${data.server} временно закрыт.`,
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      saveApplication(data);
      toast({
        title: "Заявка успешно отправлена!",
        description: "Ожидайте ответа от руководства сервера.",
      });
      reset();
      setIsSubmitting(false);
    }, 800);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

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
          <div className="mx-auto w-24 h-24 mb-6 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse">
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
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
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ваш логин *</label>
              <input {...register("login", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="Логин аккаунта" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ваше имя *</label>
              <input {...register("realName", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="Имя (в жизни)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ваш возраст *</label>
              <input type="number" {...register("age", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="18" />
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
              <select {...register("server", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm appearance-none [&>option]:bg-gray-900">
                {Object.entries(config.servers).map(([name, cfg]) => (
                  <option key={name} value={name}>{name} {!cfg.isOpen ? '(Закрыто)' : ''}</option>
                ))}
              </select>
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
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ник и логин *</label>
              <input {...register("nickname", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="John_Doe (login123)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Игровой уровень *</label>
              <input type="number" {...register("level", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="Уровень персонажа" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Опыт на GTA V проектах *</label>
            <textarea {...register("experience", { required: true })} rows={2} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm resize-none" placeholder="Где играли, какие должности..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Опыт администратора *</label>
            <textarea {...register("adminExp", { required: true })} rows={2} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm resize-none" placeholder="Были ли хелпером/админом? (Ник)" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ссылка на VK *</label>
              <input {...register("vk", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="vk.com/id..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ссылка на статистику *</label>
              <input {...register("statsPhoto", { required: true })} className="w-full px-4 py-3 rounded-xl gaming-input text-white text-sm" placeholder="imgur.com/..." />
            </div>
          </div>

          <div className="pt-6">
            {!isServerOpen ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center gap-3 animate-in shake duration-500">
                <Lock className="w-5 h-5 text-red-500" />
                <p className="text-red-400 text-sm font-bold uppercase tracking-wide">Набор на {selectedServer} закрыт</p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm sm:text-lg font-display font-black rounded-xl text-white gaming-button focus:outline-none focus:ring-2 focus:ring-primary shadow-xl shadow-primary/20"
              >
                {isSubmitting ? "ОТПРАВКА..." : (
                  <span className="flex items-center gap-3">
                    ОТПРАВИТЬ ЗАЯВЛЕНИЕ <Send className="w-5 h-5" />
                  </span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in">
          <form onSubmit={handleAdminLogin} className="glass-panel p-8 rounded-2xl max-w-sm w-full animate-in zoom-in-95 border border-white/10 mx-4">
            <h3 className="text-xl font-display font-black text-white mb-6 text-center text-primary uppercase tracking-[0.2em]">ACCESS KEY</h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-4 rounded-xl gaming-input text-white mb-6 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary font-bold bg-black/50"
              autoFocus
            />
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowPrompt(false)} className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-black border border-white/5">Отмена</button>
              <button type="submit" className="flex-1 py-3 px-4 rounded-xl gaming-button text-white uppercase tracking-widest text-[10px] font-black">Вход</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
