import { useState, useEffect } from "react";
import { Application, getApplications, updateApplicationStatus, getConfig, saveConfig, AppConfig } from "@/lib/store";
import { Shield, Check, X, ChevronDown, ChevronUp, ExternalLink, LogOut, Settings, Save, Lock, Unlock } from "lucide-react";
import { useLocation } from "wouter";
import bgImage from "@/assets/bg.png";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<string>("full");
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [activeServer, setActiveServer] = useState<string>("Москва");
  const [applications, setApplications] = useState<Application[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const adminRole = localStorage.getItem("admin_role");
    if (!adminRole) {
      setLocation("/");
      return;
    }
    setRole(adminRole);
    if (adminRole !== "full") {
      setActiveServer(adminRole);
    }
    setApplications(getApplications());
  }, [setLocation]);

  const handleUpdateStatus = (id: string, status: "approved" | "rejected") => {
    updateApplicationStatus(id, status);
    setApplications(getApplications());
  };

  const handleSaveConfig = () => {
    saveConfig(config);
    toast({ title: "Настройки сохранены", description: "Конфигурация серверов успешно обновлена." });
  };

  const toggleServer = (serverName: string) => {
    const newConfig = { ...config };
    newConfig.servers[serverName].isOpen = !newConfig.servers[serverName].isOpen;
    setConfig(newConfig);
  };

  const updateServerPassword = (serverName: string, pass: string) => {
    const newConfig = { ...config };
    newConfig.servers[serverName].password = pass;
    setConfig(newConfig);
  };

  const selectServer = (server: string) => {
    setActiveServer(server);
    setShowSettings(false);
  };

  const filteredApps = applications.filter((app) => 
    role === "full" ? app.server === activeServer : app.server === role
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Одобрено</span>;
      case "rejected":
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Отклонено</span>;
      default:
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Ожидает</span>;
    }
  };

  const canEditSettings = role === "full";

  return (
    <div 
      className="min-h-screen relative bg-black font-sans text-gray-200"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl"></div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/10 glass-panel flex flex-col shadow-2xl z-20">
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-black text-white tracking-widest leading-tight text-sm uppercase">RESTRICTED</h1>
              <p className="text-[10px] text-primary font-black tracking-[0.2em] uppercase">
                {role === "full" ? "ROOT ACCESS" : `${activeServer} MOD`}
              </p>
            </div>
          </div>

          <div className="p-4 flex-1 space-y-6">
            <div>
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 pl-2">Сервера</h2>
              <div className="space-y-1">
                {(role === "full" ? ["Москва", "Питер", "Екатеринбург"] : [role]).map((server) => (
                  <button
                    key={server}
                    onClick={() => selectServer(server)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-between group ${
                      activeServer === server && !showSettings
                        ? "bg-primary/20 text-white border border-primary/30" 
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="font-bold tracking-wide text-sm">{server}</span>
                    {activeServer === server && !showSettings && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
                  </button>
                ))}
              </div>
            </div>

            {canEditSettings && (
              <div>
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 pl-2">Управление</h2>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 ${
                    showSettings ? "bg-white/10 text-white border border-white/20" : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-bold tracking-wide text-sm">Настройки</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={() => {
                localStorage.removeItem("admin_role");
                setLocation("/");
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] text-gray-500 hover:text-white hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest font-black"
            >
              <LogOut className="w-4 h-4" />
              ВЫЙТИ ИЗ СИСТЕМЫ
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar relative">
          <div className="max-w-5xl mx-auto">
            {showSettings && canEditSettings ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-black text-white tracking-widest flex items-center gap-3 uppercase">
                      SYSTEM <span className="text-primary">CORE</span>
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm">Управление глобальными параметрами доступа</p>
                  </div>
                  <button 
                    onClick={handleSaveConfig}
                    className="gaming-button w-full sm:w-auto px-8 py-3 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                  >
                    <Save className="w-4 h-4" /> СОХРАНИТЬ ИЗМЕНЕНИЯ
                  </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(config.servers).map(([name, cfg]) => (
                    <div key={name} className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="font-display font-black text-white text-lg uppercase tracking-wider">{name}</h3>
                        <button 
                          onClick={() => toggleServer(name)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            cfg.isOpen ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {cfg.isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {cfg.isOpen ? 'OPEN' : 'LOCKED'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">MOD KEY</label>
                        <input
                          type="text"
                          value={cfg.password}
                          onChange={(e) => updateServerPassword(name, e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-primary focus:outline-none focus:border-primary transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <header className="mb-8">
                  <h2 className="text-3xl font-display font-black text-white tracking-widest flex items-center gap-4 uppercase">
                    {activeServer} 
                    <span className="text-[10px] bg-white/5 px-4 py-1.5 rounded-full text-gray-400 font-black border border-white/10 tracking-[0.2em]">
                      {filteredApps.length} QUEUED
                    </span>
                  </h2>
                  <p className="text-gray-400 mt-1 text-sm tracking-wide">
                    {role === "full" ? "Полный контроль всех входящих заявлений" : `Заявления на сервер ${activeServer}`}
                  </p>
                </header>

                {filteredApps.length === 0 ? (
                  <div className="glass-panel rounded-3xl p-16 text-center border border-white/5 shadow-inner">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                      <Shield className="w-10 h-10 text-gray-700" />
                    </div>
                    <h3 className="text-xl font-display font-black text-gray-500 mb-2 uppercase tracking-widest">Нет входящих данных</h3>
                    <p className="text-gray-600 text-sm">Система готова к приему новых заявлений на сервер {activeServer}.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredApps.sort((a, b) => b.createdAt - a.createdAt).map((app) => (
                      <div key={app.id} className="glass-panel rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all shadow-xl group">
                        <div className="p-5 flex items-center gap-6 cursor-pointer" onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            {app.statsPhoto ? (
                              <img 
                                src={app.statsPhoto} 
                                alt="Stats" 
                                className="w-full h-full object-cover opacity-90" 
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://via.placeholder.com/150?text=IMG';
                                }}
                              />
                            ) : (
                              <span className="text-[10px] text-gray-700 font-black">N/A</span>
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                            <div className="hidden sm:block">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1 font-black">Никнейм</p>
                              <p className="font-black text-white truncate text-sm">{app.nickname}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1 font-black">Онлайн</p>
                              <p className="text-gray-300 font-bold text-sm">{app.online}</p>
                            </div>
                            <div className="hidden sm:block">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1 font-black">VK LINK</p>
                              <a href={app.vk} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-white transition-colors flex items-center gap-2 text-xs font-black">PROFIL <ExternalLink className="w-3 h-3" /></a>
                            </div>
                            <div className="flex justify-end">{getStatusBadge(app.status)}</div>
                          </div>
                          <div className="shrink-0 text-gray-700 p-2 hover:bg-white/5 rounded-full transition-all">{expandedId === app.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                        </div>

                        {expandedId === app.id && (
                          <div className="border-t border-white/10 bg-black/60 p-8 animate-in slide-in-from-top-4 duration-300">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
                                <div className="space-y-6">
                                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/10 pb-3">ЛИЧНЫЙ ПРОФИЛЬ</h4>
                                  <div className="grid grid-cols-2 gap-y-4 text-xs">
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Логин:</span> <span className="text-white font-bold">{app.login}</span>
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Имя:</span> <span className="text-white font-bold">{app.realName}</span>
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Возраст:</span> <span className="text-white font-bold">{app.age} лет</span>
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Пояс:</span> <span className="text-white font-bold">{app.timezone}</span>
                                  </div>
                                </div>
                                <div className="space-y-6">
                                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/10 pb-3">ИГРОВАЯ СВОДКА</h4>
                                  <div className="grid grid-cols-2 gap-y-4 text-xs">
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Игровой Ник:</span> <span className="text-white font-mono font-bold">{app.nickname}</span>
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Уровень:</span> <span className="text-white font-bold">{app.level} LVL</span>
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Статус:</span> {getStatusBadge(app.status)}
                                  </div>
                                </div>
                             </div>
                             
                             <div className="space-y-8 mb-10">
                                <div className="space-y-3">
                                  <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em] block font-black">БИОГРАФИЯ</span>
                                  <div className="bg-black/40 p-6 rounded-2xl text-gray-400 text-sm border border-white/5 leading-relaxed font-medium italic shadow-inner">
                                    "{app.about}"
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em] block font-black">СЕРВЕРНЫЙ ОПЫТ</span>
                                  <div className="bg-black/40 p-6 rounded-2xl text-gray-400 text-sm border border-white/5 leading-relaxed font-medium shadow-inner">
                                    {app.experience}
                                  </div>
                                </div>
                                {app.adminExp && (
                                  <div className="space-y-3">
                                    <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em] block font-black">АДМИН. СТАЖ</span>
                                    <div className="bg-black/40 p-6 rounded-2xl text-gray-400 text-sm border border-white/5 leading-relaxed font-medium shadow-inner">
                                      {app.adminExp}
                                    </div>
                                  </div>
                                )}
                                <div className="space-y-3">
                                  <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em] block font-black">СТАТИСТИКА ПЕРСОНАЖА</span>
                                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video max-w-2xl mx-auto flex items-center justify-center">
                                    {app.statsPhoto ? (
                                      <img 
                                        src={app.statsPhoto} 
                                        alt="Character Statistics" 
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = 'https://via.placeholder.com/800x450?text=ERROR+LOADING+IMAGE';
                                        }}
                                      />
                                    ) : (
                                      <span className="text-gray-700 font-black uppercase tracking-widest">Изображение не предоставлено</span>
                                    )}
                                  </div>
                                </div>
                             </div>

                             {app.status === "pending" && (
                               <div className="flex flex-col sm:flex-row gap-4 justify-end border-t border-white/10 pt-8">
                                 <button onClick={() => handleUpdateStatus(app.id, "rejected")} className="flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 transition-all font-black uppercase text-[10px] tracking-widest">
                                   <X className="w-4 h-4" /> ОТКЛОНИТЬ ЗАЯВКУ
                                 </button>
                                 <button onClick={() => handleUpdateStatus(app.id, "approved")} className="flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-500/10">
                                   <Check className="w-4 h-4" /> ОДОБРИТЬ КАНДИДАТА
                                 </button>
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.4); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(225,29,72,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(225,29,72,0.6); }
      `}} />
    </div>
  );
}
