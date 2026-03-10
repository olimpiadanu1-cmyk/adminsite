import { useState, useEffect, useRef } from "react";
import { AppConfig, useConfig, useApplications, updateApplicationStatus, updateApplicationNotes, deleteApplication, saveConfig, useRealtimeUpdates, formatMSKDate, useStats, useAdminUnlock } from "@/lib/store";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Shield,
  Settings,
  Users,
  ClipboardList,
  LogOut,
  Power,
  Lock,
  Unlock,
  Eye,
  BarChart3,
  TrendingUp,
  Globe,
  Save,
  Search,
  MessageSquare,
  Activity,
  History,
  Trash2,
  CheckSquare,
  Square,
  Bot,
  Cpu,
  Sparkles,
  AlertTriangle,
  Menu,
  Minus,
  Maximize2
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, useDragControls, AnimatePresence } from "framer-motion";
import bgImage from "@/assets/bg_pleasant.png";
import { useToast } from "@/hooks/use-toast";

const getPlural = (n: number, one: string, two: string, five: string) => {
  let n1 = Math.abs(n) % 100;
  let n2 = n1 % 10;
  if (n1 > 10 && n1 < 20) return five;
  if (n2 > 1 && n2 < 5) return two;
  if (n2 === 1) return one;
  return five;
};

export default function Admin() {
  useRealtimeUpdates();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { showPrompt, setShowPrompt } = useAdminUnlock();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string>("full");
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: stats, isLoading: statsLoading } = useStats();

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(true);

  // Loading Progress Bar Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showLoading) {
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [showLoading]);

  // Finish loading when data is ready
  useEffect(() => {
    if (!appsLoading && !configLoading && !statsLoading && loadingProgress >= 30) {
      setLoadingProgress(100);
      const timer = setTimeout(() => setShowLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [appsLoading, configLoading, statsLoading, loadingProgress]);

  const [activeServer, setActiveServer] = useState<string>("Москва");
  const [activeTab, setActiveTab] = useState<"applications" | "settings">("applications");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending">("pending");
  const [visibleCount, setVisibleCount] = useState(50);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [peakHoursData, setPeakHoursData] = useState<Record<number, number>>({});
  const [unlockCode, setUnlockCode] = useState("");

  useEffect(() => {
    fetch("/api/stats/peak-hours")
      .then(res => res.json())
      .then(data => setPeakHoursData(data))
      .catch(console.error);
  }, [applications]);
  const [newBlacklistIP, setNewBlacklistIP] = useState("");
  const [newBlacklistVK, setNewBlacklistVK] = useState("");
  const [showAllIPs, setShowAllIPs] = useState(false);
  const [showAllVKs, setShowAllVKs] = useState(false);
  const [appPhotos, setAppPhotos] = useState<{ [key: string]: string | null }>({});
  const [loadingPhotos, setLoadingPhotos] = useState<{ [key: string]: boolean }>({});

  // AI Assistant State
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    score: number;
    pros: string[];
    cons: string[];
    grammar: string[];
    verdict: string;
    targetNickname?: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const dragControls = useDragControls();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isAiChatMinimized, setIsAiChatMinimized] = useState(false);
  const [aiWindowDimensions, setAiWindowDimensions] = useState({ width: 400, height: 600 });

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingMessage, isAnalyzing, aiAnalysis]);

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isSendingMessage) return;

    const message = userMessage.trim();
    setUserMessage("");
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsSendingMessage(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось отправить сообщение", variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAnalyzeWithAI = async (app: any) => {
    setExpandedId(app.id); // Ensure the app is expanded to see the context
    setIsAiChatOpen(true);
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/analyze-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application: app })
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis({ ...data, targetNickname: app.nickname });
      } else {
        toast({ title: "Ошибка ИИ", description: "Не удалось проанализировать заявку", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Ошибка соединения", description: "ИИ помощник недоступен", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig(config);
    }
  }, [config, localConfig]);

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
    setIsAuthenticated(true);
  }, [setLocation]);

  // Inactivity Timer (1 hour)
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour

    const checkInactivity = () => {
      if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
        setIsAuthenticated(false);
        setShowPrompt(false);
      }
    };

    const interval = setInterval(checkInactivity, 30000); // Check every 30s

    const resetTimer = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [lastActivity, isAuthenticated, setShowPrompt]);

  // Handle re-authentication via REYN
  useEffect(() => {
    if (showPrompt && !isAuthenticated) {
      const adminRole = localStorage.getItem("admin_role");
      if (adminRole) {
        setIsAuthenticated(true);
        setLastActivity(Date.now());
      }
    }
  }, [showPrompt, isAuthenticated]);

  if (!isAuthenticated && !showPrompt) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-sans text-gray-500">
        <div className="flex flex-col items-center gap-4">
          <Lock className="w-12 h-12 opacity-20" />
          <p className="text-xs uppercase tracking-widest font-black">Система заблокирована</p>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] opacity-40 italic">Введите код разблокировки для доступа</p>
            <input
              type="text"
              maxLength={4}
              autoFocus
              value={unlockCode}
              onChange={(e) => {
                const val = e.target.value.toUpperCase(); // Force uppercase for visibility
                setUnlockCode(val);
                if (val.toLowerCase() === "reyn") {
                  const adminRole = localStorage.getItem("admin_role");
                  if (adminRole) {
                    setIsAuthenticated(true);
                    setLastActivity(Date.now());
                    setUnlockCode("");
                    setShowPrompt(false);
                  }
                }
              }}
              className="mt-2 bg-black/50 border border-white/10 rounded-lg px-4 py-2 w-32 text-center text-white outline-none focus:border-primary/50 tracking-[0.3em] font-mono transition-colors"
              placeholder="••••"
            />
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    let reason: string | undefined = undefined;
    if (status === "rejected") {
      const input = window.prompt("Введите причину отказа (необязательно):", "");
      if (input === null) return; // User clicked Cancel
      reason = input.trim() || undefined;
    }

    try {
      await updateApplicationStatus(id, status, reason);
      toast({ title: status === "approved" ? "Заявка одобрена" : "Заявка отклонена" });
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm("Вы уверены, что хотите навсегда удалить эту заявку?")) return;
    try {
      await deleteApplication(id);
      toast({ title: "Заявка удалена" });
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось удалить заявку", variant: "destructive" });
    }
  };

  const handleSaveConfig = async () => {
    if (!localConfig) return;
    try {
      await saveConfig(localConfig);
      toast({ title: "Настройки сохранены", description: "Конфигурация серверов успешно обновлена." });
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
    }
  };

  const selectServer = (server: string) => {
    setActiveServer(server);
    setActiveTab("applications");
  };

  const filteredApps = (applications || []).filter((app) => {
    const matchesServer = role === "full" ? app.server === activeServer : app.server === role;
    const matchesSearch =
      app.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.vk.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" ? true : app.status === "pending";
    return matchesServer && matchesSearch && matchesFilter;
  });

  const displayedApps = filteredApps.sort((a, b) => b.createdAt - a.createdAt).slice(0, visibleCount);
  const handleSaveNotes = async (id: string) => {
    const notes = editingNotes[id];
    if (notes === undefined) return;
    try {
      await updateApplicationNotes(id, notes);
      toast({ title: "Заметка сохранена" });
    } catch (e) {
      console.error("Failed to save admin notes:", e);
      toast({ title: "Ошибка", description: "Не удалось сохранить заметку", variant: "destructive" });
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !window.confirm(`Вы уверены, что хотите навсегда удалить ${selectedIds.size} заявок?`)) return;

    let reason: string | undefined = undefined;
    if (action === 'reject') {
      const input = window.prompt(`Введите общую причину отказа для ${selectedIds.size} заявок (необязательно):`, "");
      if (input === null) return; // User clicked Cancel
      reason = input.trim() || undefined;
    }

    try {
      const res = await fetch("/api/applications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, reason })
      });
      if (!res.ok) throw new Error("Bulk action failed");
      toast({ title: "Успех", description: `Массовое действие выполнено для ${selectedIds.size} заявок.` });
      setSelectedIds(new Set());
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось выполнить действие", variant: "destructive" });
    }
  };

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

  if (showLoading) {
    return (
      <div
        className="min-h-screen relative bg-black flex flex-col items-center justify-center p-6 text-white overflow-hidden"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl"></div>

        <div className="relative z-10 w-full max-w-md text-center">
          <div className="mb-8 relative flex justify-center">
            <div className="w-24 h-24 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/50 animate-pulse shadow-[0_0_30px_rgba(225,29,72,0.3)]">
              <Shield className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full animate-pulse -z-10"></div>
          </div>

          <h1 className="text-2xl font-display font-black tracking-[0.3em] uppercase mb-2">Загрузка данных</h1>
          <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-8">Инициализация системы безопасности</p>

          <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-500 relative"
              style={{ width: `${loadingProgress}%` }}
            >
              <div className="absolute inset-0 bg-[length:20px_20px] bg-gradient-to-r from-white/10 to-transparent animate-shimmer"></div>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center text-[10px] font-black tracking-widest uppercase">
            <span className="text-primary italic animate-pulse">
              {loadingProgress < 30 ? "Подключение..." :
                loadingProgress < 60 ? "Синхронизация..." :
                  loadingProgress < 90 ? "Сборка архивов..." : "Готово"}
            </span>
            <span className="text-gray-400">{Math.round(loadingProgress)}%</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 flex items-center gap-2">
          <div className="w-1 h-1 bg-primary rounded-full animate-ping"></div>
          <span className="text-[8px] font-black text-white/20 tracking-[0.3em] uppercase">Status: decrypting_payload_v3</span>
        </div>
      </div>
    );
  }

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
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10 backdrop-blur-[2px]"></div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-b border-white/10 z-[30] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center border border-primary/50">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display font-black text-white tracking-[0.2em] text-[10px] uppercase">RAGE PANEL</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Backdrop */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 border-r border-white/10 glass-panel flex flex-col shadow-2xl z-[50] transition-all duration-300 transform lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarMinimized ? 'w-20' : 'w-64'}`}>
          <div className="p-6 border-b border-white/10 flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex-shrink-0 flex items-center justify-center border border-primary/50">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              {!isSidebarMinimized && (
                <div className="truncate">
                  <h1 className="font-display font-black text-white tracking-widest leading-tight text-sm uppercase truncate">
                    {role === "full" ? "АДМИН ПАНЕЛЬ" : "ОГРАНИЧЕННЫЙ ДОСТУП"}
                  </h1>
                  <p className="text-[10px] text-primary font-black tracking-[0.2em] uppercase truncate">
                    {role === "full" ? "ПОЛНЫЙ ДОСТУП" : `${activeServer} МОД`}
                  </p>
                </div>
              )}
            </div>
            <button
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-gray-500"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                className="hidden lg:flex p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all ml-1"
              >
                {isSidebarMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="p-4 flex-1 space-y-6 overflow-hidden">
            <div>
              {!isSidebarMinimized && (
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 pl-2">Сервера</h2>
              )}
              <div className="space-y-1">
                {(role === "full" ? ["Москва", "Питер", "Екатеринбург"] : [role]).map((server) => (
                  <button
                    key={server}
                    onClick={() => {
                      selectServer(server);
                      setIsSidebarOpen(false);
                    }}
                    title={isSidebarMinimized ? server : ""}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-between group ${activeServer === server && activeTab === "applications"
                      ? "bg-primary/20 text-white border border-primary/30"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                      } ${isSidebarMinimized ? 'justify-center px-0' : ''}`}
                  >
                    {!isSidebarMinimized && <span className="font-bold tracking-wide text-sm">{server}</span>}
                    {isSidebarMinimized && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-all"></div>
                    )}
                    {!isSidebarMinimized && activeServer === server && activeTab === "applications" && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
                  </button>
                ))}
              </div>
            </div>

            {canEditSettings && (
              <div>
                {!isSidebarMinimized && (
                  <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 pl-2">Управление</h2>
                )}
                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setIsSidebarOpen(false);
                  }}
                  title={isSidebarMinimized ? "Настройки" : ""}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 ${activeTab === "settings" ? "bg-white/10 text-white border border-white/20" : "text-gray-400 hover:bg-white/5"
                    } ${isSidebarMinimized ? 'justify-center px-0' : ''}`}
                >
                  <Settings className="w-4 h-4" />
                  {!isSidebarMinimized && <span className="font-bold tracking-wide text-sm">Настройки</span>}
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
              title={isSidebarMinimized ? "Выйти" : ""}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] text-gray-500 hover:text-white hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest font-black ${isSidebarMinimized ? 'px-0' : ''}`}
            >
              <LogOut className="w-4 h-4" />
              {!isSidebarMinimized && <span>ВЫЙТИ ИЗ СИСТЕМЫ</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full overflow-y-auto p-4 sm:p-8 custom-scrollbar relative pt-20 lg:pt-8 bg-black/50 lg:bg-transparent">
          <div className="max-w-5xl mx-auto">
            {activeTab === "settings" && canEditSettings ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-black text-white tracking-widest flex items-center gap-3 uppercase">
                      ЯДРО <span className="text-primary">СИСТЕМЫ</span>
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm">Управление глобальными параметрами доступа</p>
                  </div>
                  <button
                    onClick={handleSaveConfig}
                    className="gaming-button w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-black text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/80 transition-all"
                  >
                    <Save className="w-5 h-5" /> СОХРАНИТЬ ИЗМЕНЕНИЯ
                  </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {localConfig && Object.entries(localConfig.servers).map(([name, cfg]: [string, any]) => (
                      <div key={name} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-black text-white uppercase tracking-widest">{name}</span>
                          <button
                            onClick={() => {
                              if (!localConfig) return;
                              setLocalConfig({
                                ...localConfig,
                                servers: {
                                  ...localConfig.servers,
                                  [name]: { ...cfg, isOpen: !cfg.isOpen }
                                }
                              });
                            }}
                            className={`p-2 rounded-xl transition-all ${cfg.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}
                          >
                            {cfg.isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5 opacity-40" />}
                          </button>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] text-gray-600 uppercase font-black tracking-widest block">Пароль сервера</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            <input
                              type="text"
                              value={cfg.password}
                              onChange={(e) => {
                                if (!localConfig) return;
                                setLocalConfig({
                                  ...localConfig,
                                  servers: {
                                    ...localConfig.servers,
                                    [name]: { ...cfg, password: e.target.value }
                                  }
                                });
                              }}
                              className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white font-bold focus:outline-none focus:border-primary/40 transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Blacklist Panel - Left column, below servers */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                      <div className="flex items-center gap-3 mb-8">
                        <Shield className="w-6 h-6 text-primary" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Чёрный список</h3>
                      </div>

                      {/* IP Blacklist */}
                      <div className="space-y-3 mb-6">
                        <label className="text-[10px] text-gray-600 uppercase font-black tracking-widest block">Блокировка по IP-адресу</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="192.168.1.1"
                            value={newBlacklistIP}
                            onChange={(e) => setNewBlacklistIP(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-sm text-white font-bold focus:outline-none focus:border-primary/40 transition-all font-mono"
                          />
                          <button
                            onClick={() => {
                              if (!localConfig || !newBlacklistIP.trim()) return;
                              const updated = { ...localConfig, blacklistedIPs: [...(localConfig.blacklistedIPs || []), newBlacklistIP.trim()] };
                              setLocalConfig(updated);
                              setNewBlacklistIP("");
                            }}
                            className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-black hover:bg-primary/30 transition-all tracking-wider"
                          >
                            + Добавить
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(localConfig?.blacklistedIPs || []).slice(0, showAllIPs ? undefined : 1).map((ip, i) => (
                            <div key={i} className="flex items-center justify-between bg-black/40 rounded-xl px-4 py-2 border border-white/5">
                              <span className="text-xs font-mono text-gray-300">{ip}</span>
                              <button onClick={() => {
                                if (!localConfig) return;
                                setLocalConfig({ ...localConfig, blacklistedIPs: localConfig.blacklistedIPs.filter((_, idx) => idx !== i) });
                              }} className="text-red-500 hover:text-red-400 text-xs font-black transition-colors">✕</button>
                            </div>
                          ))}
                          {(localConfig?.blacklistedIPs || []).length === 0 && <p className="text-[10px] text-gray-700 italic">Список пуст</p>}
                          {(localConfig?.blacklistedIPs || []).length > 1 && (
                            <button
                              onClick={() => setShowAllIPs(!showAllIPs)}
                              className="text-[10px] text-primary/70 hover:text-primary font-black uppercase tracking-widest transition-colors mt-1"
                            >
                              {showAllIPs ? '▲ Скрыть' : `▼ Показать все (${(localConfig?.blacklistedIPs || []).length})`}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* VK Blacklist */}
                      <div className="space-y-3">
                        <label className="text-[10px] text-gray-600 uppercase font-black tracking-widest block">Блокировка по ВК</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="vk.com/nickname"
                            value={newBlacklistVK}
                            onChange={(e) => setNewBlacklistVK(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-sm text-white font-bold focus:outline-none focus:border-primary/40 transition-all font-mono"
                          />
                          <button
                            onClick={() => {
                              if (!localConfig || !newBlacklistVK.trim()) return;
                              const updated = { ...localConfig, blacklistedVKs: [...(localConfig.blacklistedVKs || []), newBlacklistVK.trim()] };
                              setLocalConfig(updated);
                              setNewBlacklistVK("");
                            }}
                            className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-black hover:bg-primary/30 transition-all tracking-wider"
                          >
                            + Добавить
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(localConfig?.blacklistedVKs || []).slice(0, showAllVKs ? undefined : 1).map((vk, i) => (
                            <div key={i} className="flex items-center justify-between bg-black/40 rounded-xl px-4 py-2 border border-white/5">
                              <span className="text-xs font-mono text-gray-300">{vk}</span>
                              <button onClick={() => {
                                if (!localConfig) return;
                                setLocalConfig({ ...localConfig, blacklistedVKs: localConfig.blacklistedVKs.filter((_, idx) => idx !== i) });
                              }} className="text-red-500 hover:text-red-400 text-xs font-black transition-colors">✕</button>
                            </div>
                          ))}
                          {(localConfig?.blacklistedVKs || []).length === 0 && <p className="text-[10px] text-gray-700 italic">Список пуст</p>}
                          {(localConfig?.blacklistedVKs || []).length > 1 && (
                            <button
                              onClick={() => setShowAllVKs(!showAllVKs)}
                              className="text-[10px] text-primary/70 hover:text-primary font-black uppercase tracking-widest transition-colors mt-1"
                            >
                              {showAllVKs ? '▲ Скрыть' : `▼ Показать все (${(localConfig?.blacklistedVKs || []).length})`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                      <div className="flex items-center gap-3 mb-8">
                        <History className="w-6 h-6 text-primary" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Ограничения</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Кулдаун заявок</label>
                            <span className="text-primary font-black text-lg">
                              {localConfig?.cooldownDays || 3} {getPlural(localConfig?.cooldownDays || 3, "день", "дня", "дней")}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={localConfig?.cooldownDays || 3}
                            onChange={(e) => {
                              if (!localConfig) return;
                              setLocalConfig({ ...localConfig, cooldownDays: parseInt(e.target.value) });
                            }}
                            className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                            Игрок сможет подать новую заявку только через {localConfig?.cooldownDays || 3} {getPlural(localConfig?.cooldownDays || 3, "день", "дня", "дней")} после предыдущей.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                      <div className="flex items-center gap-3 mb-8">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Статистика сайта</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
                          <p className="text-[10px] text-gray-600 uppercase font-black mb-2 tracking-widest">Просмотры</p>
                          <div className="flex items-center gap-3">
                            <Eye className="w-4 h-4 text-primary" />
                            <span className="text-xl font-black text-white">{stats?.visits || 0}</span>
                          </div>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
                          <p className="text-[10px] text-gray-600 uppercase font-black mb-2 tracking-widest">Всего заявок</p>
                          <div className="flex items-center gap-3">
                            <ClipboardList className="w-4 h-4 text-primary" />
                            <span className="text-xl font-black text-white">{stats?.totalApplications || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 space-y-4">
                        <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Визуализация</p>
                        <div className="h-48 flex items-end gap-3 px-4 pb-6 bg-black/40 rounded-3xl border border-white/10 relative overflow-hidden">
                          <div className="absolute inset-0 bg-grid-white opacity-[0.02]"></div>
                          {stats && Object.entries(stats.serverStats).map(([name, count]) => {
                            const max = Math.max(...Object.values(stats.serverStats), 1);
                            const heightPercentage = Math.max((count / max) * 100, 5);
                            return (
                              <div key={name} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative z-10">
                                <span className="text-[10px] font-black text-white shrink-0 group-hover:scale-110 transition-transform">
                                  {count}
                                </span>
                                <div className="w-full flex-1 flex items-end">
                                  <div
                                    className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.2)] group-hover:shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all relative overflow-hidden"
                                    style={{ height: `${heightPercentage}%` }}
                                  >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  </div>
                                </div>
                                <span className="text-[8px] font-black text-gray-500 uppercase truncate w-full text-center shrink-0">{name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-8 space-y-4">
                        <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Пиковые часы подачи (Время МСК)</p>
                        <div className="h-48 w-full bg-black/40 rounded-3xl border border-white/10 relative overflow-x-auto overflow-y-hidden custom-scrollbar">
                          <div className="absolute inset-0 bg-grid-white opacity-[0.02] pointer-events-none"></div>
                          <div className="flex items-end gap-1 sm:gap-2 px-4 pb-6 h-full min-w-[600px]">
                            {Object.keys(peakHoursData).length > 0 ? Array.from({ length: 24 }, (_, i) => {
                              const count = peakHoursData[i] || 0;
                              const max = Math.max(...Object.values(peakHoursData), 1);
                              const heightPercentage = Math.max((count / max) * 100, 5);
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative z-10 hover:bg-white/5 rounded-t-lg transition-colors" title={`${count} заявок в ${i}:00`}>
                                  <span className={`text-[10px] font-black shrink-0 transition-transform group-hover:-translate-y-1 ${count > 0 ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-gray-600'}`}>
                                    {count}
                                  </span>
                                  <div className="w-full flex-1 flex items-end px-0.5">
                                    <div
                                      className={`w-full rounded-md transition-all relative overflow-hidden ${count === max && max > 0 ? 'bg-gradient-to-t from-primary/60 to-primary shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'bg-primary/20'}`}
                                      style={{ height: `${heightPercentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[8px] font-black text-gray-500 uppercase truncate w-full text-center shrink-0">{i}:00</span>
                                </div>
                              );
                            }) : (
                              <div className="w-full text-center text-xs text-gray-500 font-bold uppercase tracking-widest mt-20">Недостаточно данных</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 space-y-4">
                        <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Заявки по серверам</p>
                        {stats && Object.entries(stats.serverStats).map(([name, count]) => (
                          <div key={name} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                            <span className="text-xs font-bold text-gray-400">{name}</span>
                            <span className="text-xs font-black text-white">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-black text-white tracking-widest flex items-center gap-4 uppercase">
                      {activeServer}
                      <span className="text-[10px] bg-white/5 px-4 py-1.5 rounded-full text-gray-400 font-black border border-white/10 tracking-[0.2em]">
                        {filteredApps.filter(a => a.status === "pending").length} В ОЧЕРЕДИ
                      </span>
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm tracking-wide">
                      {role === "full" ? "Полный контроль всех входящих заявлений" : `Заявления на сервер ${activeServer}`}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
                    <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => { setFilterStatus("pending"); setVisibleCount(50); }}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filterStatus === "pending" ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                        Новые
                      </button>
                      <button
                        onClick={() => { setFilterStatus("all"); setVisibleCount(50); }}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filterStatus === "all" ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                        Все
                      </button>
                    </div>
                    <div className="relative w-full sm:w-64 shrink-0">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="ПОИСК (НИК / ВК)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-[10px] text-white font-black placeholder:text-gray-700 focus:outline-none focus:border-primary/40 transition-all tracking-widest uppercase"
                      />
                    </div>
                  </div>
                </header>

                {/* Floating Bulk Action Bar */}
                <AnimatePresence>
                  {selectedIds.size > 0 && role === "full" && (
                    <motion.div
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl p-3 px-6 flex items-center gap-6"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                          {selectedIds.size}
                        </span>
                        <span className="text-xs font-black uppercase tracking-widest text-gray-300 hidden sm:inline-block">Выбрано</span>
                      </div>

                      <div className="h-8 w-px bg-white/10"></div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBulkAction('approve')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                          <Check className="w-4 h-4" /> <span className="hidden sm:inline-block">Одобрить</span>
                        </button>
                        <button
                          onClick={() => handleBulkAction('reject')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                          <Minus className="w-4 h-4" /> <span className="hidden sm:inline-block">Отклонить</span>
                        </button>
                        <button
                          onClick={() => handleBulkAction('delete')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                          <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline-block">Удалить</span>
                        </button>
                      </div>

                      <div className="h-8 w-px bg-white/10"></div>

                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors active:scale-95"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                    {role === "full" && (
                      <div className="flex items-center px-2 py-2 mb-2">
                        <button
                          onClick={() => {
                            if (selectedIds.size === displayedApps.length) {
                              setSelectedIds(new Set());
                            } else {
                              setSelectedIds(new Set(displayedApps.map(a => a.id)));
                            }
                          }}
                          className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group cursor-pointer"
                        >
                          {selectedIds.size === displayedApps.length ? (
                            <CheckSquare className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(225,29,72,0.5)]" />
                          ) : (
                            <Square className="w-5 h-5 group-hover:bg-white/5 rounded" />
                          )}
                          <span className="text-xs font-black uppercase tracking-widest">Выбрать все на странице</span>
                        </button>
                      </div>
                    )}
                    {displayedApps.map((app) => (
                      <div key={app.id} className={`glass-panel rounded-2xl overflow-hidden border transition-all shadow-xl group relative ${selectedIds.has(app.id) ? 'border-primary shadow-primary/20' : 'border-white/5 hover:border-white/10'}`}>
                        <div className="p-4 sm:p-5 flex items-center gap-3 sm:gap-6 cursor-pointer" onClick={async () => {
                          const isExpanding = expandedId !== app.id;
                          setExpandedId(isExpanding ? app.id : null);

                          // Fetch photo on demand if expanding and we don't have it yet
                          if (isExpanding && appPhotos[app.id] === undefined && !loadingPhotos[app.id]) {
                            setLoadingPhotos(prev => ({ ...prev, [app.id]: true }));
                            try {
                              const res = await fetch(`/api/applications/${app.id}/photo`);
                              if (res.ok) {
                                const data = await res.json();
                                setAppPhotos(prev => ({ ...prev, [app.id]: data.statsPhoto }));
                              } else {
                                setAppPhotos(prev => ({ ...prev, [app.id]: null }));
                              }
                            } catch (e) {
                              console.error("Failed to load photo", e);
                              setAppPhotos(prev => ({ ...prev, [app.id]: null }));
                            } finally {
                              setLoadingPhotos(prev => ({ ...prev, [app.id]: false }));
                            }
                          }
                        }}>
                          {role === "full" && (
                            <div
                              className="shrink-0 cursor-pointer rounded-lg p-1 hover:bg-white/5 transition-colors z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(selectedIds);
                                if (newSet.has(app.id)) newSet.delete(app.id);
                                else newSet.add(app.id);
                                setSelectedIds(newSet);
                              }}
                            >
                              {selectedIds.has(app.id) ? (
                                <CheckSquare className="w-6 h-6 text-primary drop-shadow-[0_0_10px_rgba(225,29,72,0.8)]" />
                              ) : (
                                <Square className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                              )}
                            </div>
                          )}
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            {loadingPhotos[app.id] ? (
                              <span className="text-[10px] text-gray-500 font-black animate-pulse">ЗГРЗК...</span>
                            ) : appPhotos[app.id] ? (
                              <img
                                src={appPhotos[app.id] as string}
                                alt="Stats"
                                className="w-full h-full object-cover opacity-90"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://via.placeholder.com/150?text=IMG';
                                }}
                              />
                            ) : (
                              <span className="text-[10px] text-gray-700 font-black">ФОТО</span>
                            )}
                          </div>
                          <div className="flex-1 flex flex-nowrap items-center gap-4 lg:gap-8 overflow-hidden">
                            <div className="min-w-[140px] shrink-0">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1 font-black">Никнейм</p>
                              <p className="font-black text-white truncate text-sm">{app.nickname}</p>
                            </div>
                            <div className="w-[80px] shrink-0 hidden sm:block">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1 font-black">Онлайн</p>
                              <p className="text-gray-300 font-bold text-sm">{app.online}</p>
                            </div>
                            <div className="w-[100px] shrink-0 hidden lg:block">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1 font-black">Дата подачи</p>
                              <p className="text-gray-400 font-mono text-[10px]">{new Intl.DateTimeFormat("ru-RU", { day: '2-digit', month: '2-digit' }).format(new Date(app.createdAt))}</p>
                            </div>
                            <div className="w-[100px] shrink-0 hidden md:block">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1 font-black">ССЫЛКА ВК</p>
                              <a href={app.vk} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-white transition-colors flex items-center gap-2 text-xs font-black">ПРОФИЛЬ <ExternalLink className="w-3 h-3" /></a>
                            </div>
                            <div className="flex-1 flex justify-end items-center shrink-0">
                              {getStatusBadge(app.status)}
                            </div>
                          </div>
                          <div className="shrink-0 text-gray-700 p-2 hover:bg-white/5 rounded-full transition-all">{expandedId === app.id ? <ChevronUp className="w-5 h-5 transition-transform" /> : <ChevronDown className="w-5 h-5 transition-transform" />}</div>
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
                                  <span className="text-gray-600 font-black uppercase tracking-widest">Форум:</span> <a href={app.forumLink} target="_blank" rel="noreferrer" className="text-primary hover:text-white transition-colors truncate font-bold">ОТКРЫТЬ ПРОФИЛЬ</a>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10 border-t border-white/5 pt-8">
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                  <TrendingUp className="w-3 h-3" /> СТАТИСТИКА
                                </h4>
                                <div className="space-y-3 text-xs">
                                  <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-gray-600 font-black uppercase tracking-widest">АЙПИ АДРЕС:</span>
                                    <span className="text-white font-mono">{app.ip || "Неизвестно"}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-gray-600 font-black uppercase tracking-widest">Подана (МСК):</span>
                                    <span className="text-white font-mono">{formatMSKDate(app.createdAt)}</span>
                                  </div>
                                  {app.reviewedAt && (
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-gray-600 font-black uppercase tracking-widest">Рассмотрена (МСК):</span>
                                      <span className="text-white font-mono">{formatMSKDate(app.reviewedAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                  <MessageSquare className="w-3 h-3" /> ЗАМЕТКИ АДМИНИСТРАЦИИ
                                </h4>
                                <div className="relative">
                                  <textarea
                                    value={editingNotes[app.id] ?? app.adminNotes ?? ""}
                                    onChange={(e) => setEditingNotes({ ...editingNotes, [app.id]: e.target.value })}
                                    placeholder="Оставьте внутреннюю заметку..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[10px] text-gray-300 font-bold focus:outline-none focus:border-primary/40 transition-all min-h-[80px]"
                                  />
                                  <button
                                    onClick={() => handleSaveNotes(app.id)}
                                    className="absolute bottom-2 right-2 p-2 bg-primary/20 hover:bg-primary/40 rounded-lg transition-all text-primary"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
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
                                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video max-w-2xl mx-auto flex items-center justify-center relative">
                                  {loadingPhotos[app.id] ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  ) : appPhotos[app.id] ? (
                                    <img
                                      src={appPhotos[app.id] as string}
                                      alt="Статистика персонажа"
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = 'https://via.placeholder.com/800x450?text=ОШИБКА+ЗАГРУЗКИ+ИЗОБРАЖЕНИЯ';
                                      }}
                                    />
                                  ) : (
                                    <span className="text-gray-700 font-black uppercase tracking-widest" > Изображение не предоставлено</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-end border-t border-white/10 pt-8">
                              {role === "full" && (
                                <button
                                  onClick={() => handleDeleteApplication(app.id)}
                                  className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 transition-all font-black uppercase text-[10px] tracking-widest sm:mr-auto"
                                >
                                  <Trash2 className="w-4 h-4" /> УДАЛИТЬ ЗАЯВКУ
                                </button>
                              )}
                              {app.status === "pending" && (
                                <>
                                  <button onClick={() => handleUpdateStatus(app.id, "rejected")} className="flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 transition-all font-black uppercase text-[10px] tracking-widest">
                                    <X className="w-4 h-4" /> ОТКЛОНИТЬ ЗАЯВКУ
                                  </button>
                                  <button onClick={() => handleUpdateStatus(app.id, "approved")} className="flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-500/10">
                                    <Check className="w-4 h-4" /> ОДОБРИТЬ КАНДИДАТА
                                  </button>
                                  <button
                                    onClick={() => handleAnalyzeWithAI(app)}
                                    className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all font-black uppercase text-[10px] tracking-widest"
                                  >
                                    <Bot className="w-4 h-4" /> АНАЛИЗ ИИ
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {displayedApps.length < filteredApps.length && (
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 50)}
                        className="w-full py-4 mt-6 rounded-xl border border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all shadow-xl"
                      >
                        Загрузить еще ({filteredApps.length - displayedApps.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Floating Button & Window */}
      <div className="fixed bottom-8 right-0 sm:right-8 z-[100] flex flex-col items-end gap-4 pointer-events-none w-full sm:w-auto px-4 sm:px-0">
        {/* Chat Window */}
        {isAiChatOpen && !isAiChatMinimized && (
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragConstraints={{ left: -window.innerWidth + (aiWindowDimensions.width), right: 0, top: -window.innerHeight + (aiWindowDimensions.height), bottom: 0 }}
            className="pointer-events-auto relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            style={{
              width: aiWindowDimensions.width,
              maxHeight: '85vh',
              height: aiWindowDimensions.height
            }}
          >
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 flex flex-col h-full bg-black/95 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              {/* Header - Drag Handle */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="p-5 border-b border-white/10 bg-gradient-to-r from-primary/20 to-transparent flex items-center justify-between cursor-move active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">ИИ Помощник</h3>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[8px] text-green-400 font-black uppercase">Система готова</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsAiChatMinimized(true)}
                    className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAiChatOpen(false);
                      setAiAnalysis(null);
                      setChatMessages([]);
                    }}
                    className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/60 min-h-[300px] p-6">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="relative">
                      <Cpu className="w-12 h-12 text-primary animate-spin" />
                      <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Анализ данных...</p>
                      <p className="text-[8px] text-gray-600 uppercase font-bold">Оценка качеств кандидата</p>
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-6 animate-in fade-in duration-500 mb-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Результат анализа</p>
                        <p className="text-sm font-black text-white">{aiAnalysis.targetNickname || 'Текущая заявка'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Оценка</p>
                        <p className={`text-xl font-black ${aiAnalysis.score > 75 ? 'text-green-400' : (aiAnalysis.score > 45 ? 'text-yellow-400' : 'text-red-500')}`}>
                          {aiAnalysis.score}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-primary uppercase tracking-widest pl-1">Вердикт</p>
                        <div className={`p-4 rounded-xl border font-bold text-xs ${aiAnalysis.score > 75 ? 'bg-green-500/10 border-green-500/20 text-green-400' : (aiAnalysis.score > 45 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-red-500/10 border-red-500/20 text-red-500')}`}>
                          {aiAnalysis.verdict}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-green-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Плюсы
                          </p>
                          <div className="space-y-1">
                            {aiAnalysis.pros.map((p, i) => (
                              <div key={i} className="text-[10px] text-gray-400 font-bold bg-white/5 p-2 rounded-lg leading-tight">{p}</div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-red-500 uppercase tracking-widest pl-1 flex items-center gap-1">
                            <X className="w-3 h-3" /> Минусы
                          </p>
                          <div className="space-y-1">
                            {aiAnalysis.cons.map((c, i) => (
                              <div key={i} className="text-[10px] text-gray-400 font-bold bg-white/5 p-2 rounded-lg leading-tight">{c}</div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {aiAnalysis.grammar.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-yellow-500 uppercase tracking-widest pl-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Ошибки
                          </p>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                            {aiAnalysis.grammar.map((g, i) => (
                              <div key={i} className="text-[10px] text-gray-500 font-medium list-item ml-4 pl-1">{g}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="w-12 h-12 text-white/5 mb-4" />
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Нет активных данных</p>
                    <p className="text-[8px] text-gray-700 uppercase mt-1">Выберите заявку и нажмите кнопку "Анализ ИИ"</p>
                  </div>
                )}

                {chatMessages.length > 0 && (
                  <div className="mt-6 space-y-4 pt-4 border-t border-white/5">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-[10px] font-bold leading-tight ${msg.role === 'user'
                          ? 'bg-primary text-white rounded-br-none'
                          : 'bg-white/5 text-gray-300 rounded-bl-none border border-white/5'
                          }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isSendingMessage && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 p-3 rounded-2xl rounded-bl-none border border-white/5 flex gap-1">
                          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 bg-black/80 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Спросите совет или задайте вопрос..."
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userMessage.trim() || isSendingMessage}
                  className="p-2 bg-primary/20 text-primary border border-primary/40 rounded-xl hover:bg-primary/40 transition-all disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>

              {/* Footer */}
              <div className="p-4 bg-black/95 border-t border-white/10">
                <p className="text-[8px] text-gray-600 font-black uppercase text-center tracking-[0.2em]">
                  Reynov Production 2.0
                </p>
              </div>

              {/* Resize Handles */}
              {/* Right */}
              <div
                className="absolute inset-y-0 right-0 w-1 cursor-ew-resize z-50 hover:bg-primary/30 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = aiWindowDimensions.width;
                  const onMouseMove = (m: MouseEvent) => {
                    const newWidth = Math.max(320, Math.min(800, startWidth + (m.clientX - startX)));
                    setAiWindowDimensions(prev => ({ ...prev, width: newWidth }));
                  };
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              />
              {/* Left */}
              <div
                className="absolute inset-y-0 left-0 w-1 cursor-ew-resize z-50 hover:bg-primary/30 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = aiWindowDimensions.width;
                  const onMouseMove = (m: MouseEvent) => {
                    const newWidth = Math.max(320, Math.min(800, startWidth + (startX - m.clientX)));
                    setAiWindowDimensions(prev => ({ ...prev, width: newWidth }));
                  };
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              />
              {/* Top */}
              <div
                className="absolute inset-x-0 top-0 h-1 cursor-ns-resize z-50 hover:bg-primary/30 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startHeight = aiWindowDimensions.height;
                  const onMouseMove = (m: MouseEvent) => {
                    const newHeight = Math.max(400, Math.min(window.innerHeight - 100, startHeight + (startY - m.clientY)));
                    setAiWindowDimensions(prev => ({ ...prev, height: newHeight }));
                  };
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              />
              {/* Bottom */}
              <div
                className="absolute inset-x-0 bottom-0 h-1 cursor-ns-resize z-50 hover:bg-primary/30 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startHeight = aiWindowDimensions.height;
                  const onMouseMove = (m: MouseEvent) => {
                    const newHeight = Math.max(400, Math.min(window.innerHeight - 100, startHeight + (m.clientY - startY)));
                    setAiWindowDimensions(prev => ({ ...prev, height: newHeight }));
                  };
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              />
              {/* Corner Bottom-Right */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-[60] flex items-center justify-center group"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startWidth = aiWindowDimensions.width;
                  const startHeight = aiWindowDimensions.height;
                  const onMouseMove = (m: MouseEvent) => {
                    const newWidth = Math.max(320, Math.min(800, startWidth + (m.clientX - startX)));
                    const newHeight = Math.max(400, Math.min(window.innerHeight - 100, startHeight + (m.clientY - startY)));
                    setAiWindowDimensions({ width: newWidth, height: newHeight });
                  };
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              >
                <div className="w-2 h-2 border-r-2 border-b-2 border-white/20 group-hover:border-primary transition-colors"></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Minimized Bubble or Floating Toggle */}
        <AnimatePresence>
          {(isAiChatMinimized || (!isAiChatOpen && !isAnalyzing)) && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => {
                if (isAiChatMinimized) {
                  setIsAiChatMinimized(false);
                } else {
                  setIsAiChatOpen(true);
                }
              }}
              className="pointer-events-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:scale-110 active:scale-95 transition-all relative border-2 border-white/20"
            >
              <Bot className="w-8 h-8 text-white shadow-xl" />
              {(isAiChatMinimized || isAnalyzing) && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-black flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.4); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(225,29,72,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(225,29,72,0.6); }
      `}} />
    </div >
  );
}
