import { useState, useEffect } from "react";
import { Application, getApplications, updateApplicationStatus } from "@/lib/store";
import { Shield, Check, X, ChevronDown, ChevronUp, ExternalLink, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import bgImage from "@/assets/bg.png";

export default function Admin() {
  const [, setLocation] = useLocation();
  const [activeServer, setActiveServer] = useState<string>("Москва");
  const [applications, setApplications] = useState<Application[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Check if coming through normal flow or direct link
    // For mockup, we just load data
    setApplications(getApplications());
  }, []);

  const handleUpdateStatus = (id: string, status: "approved" | "rejected") => {
    updateApplicationStatus(id, status);
    setApplications(getApplications());
  };

  const filteredApps = applications.filter((app) => app.server === activeServer);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs uppercase tracking-wider">Одобрено</span>;
      case "rejected":
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs uppercase tracking-wider">Отклонено</span>;
      default:
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs uppercase tracking-wider">Ожидает</span>;
    }
  };

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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/10 glass-panel flex flex-col shadow-2xl z-20">
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50 shadow-[0_0_10px_rgba(225,29,72,0.3)]">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white tracking-wider leading-tight">ADMIN</h1>
              <p className="text-xs text-primary font-medium tracking-widest uppercase">System Control</p>
            </div>
          </div>

          <div className="p-4 flex-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 pl-2">Сервера</h2>
            <div className="space-y-2">
              {["Москва", "Питер", "Екатеринбург"].map((server) => (
                <button
                  key={server}
                  onClick={() => setActiveServer(server)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 flex items-center justify-between ${
                    activeServer === server 
                      ? "bg-primary/20 text-white border border-primary/50 shadow-[inset_0_0_15px_rgba(225,29,72,0.2)]" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                  data-testid={`btn-filter-${server}`}
                >
                  <span className="font-medium tracking-wide">{server}</span>
                  {activeServer === server && <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={() => setLocation("/")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выход
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-white tracking-wide flex items-center gap-3">
                  {activeServer} 
                  <span className="text-sm bg-white/10 px-3 py-1 rounded-md text-gray-300 font-sans font-normal border border-white/5">
                    {filteredApps.length} заявок
                  </span>
                </h2>
                <p className="text-gray-400 mt-1">Панель управления заявками на пост администратора</p>
              </div>
            </header>

            {filteredApps.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center border border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Shield className="w-8 h-8 text-gray-500 opacity-50" />
                </div>
                <h3 className="text-xl font-display text-gray-400 mb-2">Нет заявок</h3>
                <p className="text-gray-500">В разделе сервера "{activeServer}" пока нет новых заявок.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApps.sort((a, b) => b.createdAt - a.createdAt).map((app) => (
                  <div 
                    key={app.id} 
                    className="glass-panel rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors shadow-lg"
                  >
                    {/* Compact View */}
                    <div 
                      className="p-5 flex items-center gap-6 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-gray-900 flex items-center justify-center">
                        {app.statsPhoto ? (
                          <img src={app.statsPhoto} alt="Stats" className="w-full h-full object-cover opacity-80" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-gray-600">No Img</span>'; }} />
                        ) : (
                          <span className="text-xs text-gray-600">No Img</span>
                        )}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Никнейм</p>
                          <p className="font-bold text-white">{app.nickname}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Онлайн</p>
                          <p className="text-gray-300 font-medium">{app.online}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">VK</p>
                          <a href={app.vk} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline flex items-center gap-1 w-fit">
                            Профиль <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex justify-end pr-4">
                          {getStatusBadge(app.status)}
                        </div>
                      </div>

                      <div className="shrink-0 text-gray-500 p-2 hover:bg-white/5 rounded-full transition-colors">
                        {expandedId === app.id ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>

                    {/* Expanded View */}
                    {expandedId === app.id && (
                      <div className="border-t border-white/10 bg-black/40 p-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-8 mb-8">
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-widest border-b border-white/10 pb-2">Личные данные</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                              <span className="text-gray-500">Логин:</span> <span className="text-white">{app.login}</span>
                              <span className="text-gray-500">Имя:</span> <span className="text-white">{app.realName}</span>
                              <span className="text-gray-500">Возраст:</span> <span className="text-white">{app.age}</span>
                              <span className="text-gray-500">Часовой пояс:</span> <span className="text-white">{app.timezone}</span>
                            </div>
                            
                            <div className="pt-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">О себе</span>
                              <p className="bg-white/5 p-3 rounded-md text-gray-300 text-sm border border-white/5">{app.about}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-widest border-b border-white/10 pb-2">Игровые данные</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                              <span className="text-gray-500">Уровень:</span> <span className="text-white">{app.level}</span>
                              <span className="text-gray-500">Баны:</span> <span className="text-white">{app.bans}</span>
                              <span className="text-gray-500">Желаемая фракция:</span> <span className="text-white">{app.faction}</span>
                            </div>

                            <div className="pt-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Опыт (GTA V)</span>
                              <p className="bg-white/5 p-3 rounded-md text-gray-300 text-sm border border-white/5">{app.experience}</p>
                            </div>

                            <div className="pt-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Опыт Администратора</span>
                              <p className="bg-white/5 p-3 rounded-md text-gray-300 text-sm border border-white/5">{app.adminExp}</p>
                            </div>
                          </div>
                        </div>

                        {app.status === "pending" && (
                          <div className="flex gap-4 justify-end border-t border-white/10 pt-6">
                            <button
                              onClick={() => handleUpdateStatus(app.id, "rejected")}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 transition-all font-medium tracking-wide uppercase text-sm"
                              data-testid={`btn-reject-${app.id}`}
                            >
                              <X className="w-4 h-4" /> Отклонить
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(app.id, "approved")}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 transition-all font-medium tracking-wide uppercase text-sm"
                              data-testid={`btn-approve-${app.id}`}
                            >
                              <Check className="w-4 h-4" /> Одобрить
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
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(225,29,72,0.5);
        }
      `}} />
    </div>
  );
}
