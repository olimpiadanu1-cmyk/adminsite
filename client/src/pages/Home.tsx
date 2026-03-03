import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { saveApplication, useAdminUnlock } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import bgImage from "@/assets/bg.png";
import { ShieldAlert, Send } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const { showPrompt, setShowPrompt, setLocation } = useAdminUnlock();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      server: "Москва"
    }
  });

  const onSubmit = (data: any) => {
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
    if (password === "reynovadminlist") {
      setShowPrompt(false);
      setLocation("/admin");
    } else {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Неверный пароль доступа.",
      });
    }
    setPassword("");
  };

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div className="relative w-full max-w-4xl space-y-8 glass-panel p-8 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/50 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h2 className="mt-6 text-4xl font-display font-bold tracking-wider text-white uppercase" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
            Заявка на пост <span className="text-primary">Администратора</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400 font-sans tracking-wide">
            Заполните форму ниже для подачи заявления. Все поля обязательны к заполнению.
          </p>
        </div>

        <form className="mt-8 space-y-6 font-sans" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ваш логин *</label>
              <input 
                {...register("login", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Логин аккаунта"
                data-testid="input-login"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ваше имя (В реальной жизни) *</label>
              <input 
                {...register("realName", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Иван Иванов"
                data-testid="input-real-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ваш возраст *</label>
              <input 
                type="number"
                {...register("age", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="18"
                data-testid="input-age"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Часовой пояс *</label>
              <input 
                {...register("timezone", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="МСК (UTC+3)"
                data-testid="input-timezone"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ваш средний онлайн *</label>
              <input 
                {...register("online", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="4-5 часов"
                data-testid="input-online"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Игровой сервер *</label>
              <select 
                {...register("server", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white focus:outline-none focus:ring-1 focus:ring-primary [&>option]:bg-gray-900"
                data-testid="select-server"
              >
                <option value="Москва">Москва</option>
                <option value="Питер">Питер</option>
                <option value="Екатеринбург">Екатеринбург</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Расскажите о себе (В реальной жизни) *</label>
            <textarea 
              {...register("about", { required: true })}
              rows={3}
              className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Коротко о себе, увлечениях, почему хотите на эту должность..."
              data-testid="input-about"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Имели ли вы баны на нашем проекте? (Укажите причины) *</label>
            <textarea 
              {...register("bans", { required: true })}
              rows={2}
              className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Нет / Да (укажите причину)"
              data-testid="input-bans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Игровой никнейм и логин авторизации *</label>
              <input 
                {...register("nickname", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="John_Doe (login123)"
                data-testid="input-nickname"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ваш игровой уровень *</label>
              <input 
                type="number"
                {...register("level", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Максимальный уровень"
                data-testid="input-level"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Опыт игры на GTA V проектах (Только IC!!! Где был, должности) *</label>
            <textarea 
              {...register("experience", { required: true })}
              rows={3}
              className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="LSPD - Лейтенант (John Doe) | FIB - Капитан..."
              data-testid="input-experience"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Были ли хелпером/администратором в GTA 5? (Указать ник) *</label>
            <textarea 
              {...register("adminExp", { required: true })}
              rows={2}
              className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Да, на проекте X, ник Admin_John"
              data-testid="input-admin-exp"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Если станете следящим, то за какой фракцией? (до 3-ех) *</label>
            <input 
              {...register("faction", { required: true })}
              className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="LSPD, FIB, GOV"
              data-testid="input-faction"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Ссылка на профиль Vkontakte *</label>
              <input 
                {...register("vk", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="https://vk.com/id..."
                data-testid="input-vk"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Статистика (Ссылка на фото) *</label>
              <input 
                {...register("statsPhoto", { required: true })}
                className="w-full px-4 py-3 rounded-md gaming-input text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="https://imgur.com/... (вставьте ссылку)"
                data-testid="input-photo"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-display font-medium rounded-md text-white gaming-button focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              data-testid="button-submit-application"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Отправка...
                </span>
              ) : (
                <span className="flex items-center">
                  ОТПРАВИТЬ ЗАЯВЛЕНИЕ
                  <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
          <form 
            onSubmit={handleAdminLogin}
            className="glass-panel p-8 rounded-xl max-w-md w-full animate-in zoom-in-95"
          >
            <h3 className="text-2xl font-display font-bold text-white mb-6 text-center text-primary">Доступ Restricted</h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль администратора"
              className="w-full px-4 py-3 rounded-md gaming-input text-white mb-6 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowPrompt(false)}
                className="flex-1 py-2 px-4 rounded-md bg-gray-800 text-white hover:bg-gray-700 transition-colors font-sans uppercase tracking-wider"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 rounded-md gaming-button text-white font-sans uppercase tracking-wider"
              >
                Вход
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
