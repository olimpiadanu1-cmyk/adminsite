import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export type Application = {
  id: string;
  login: string;
  realName: string;
  age: string;
  timezone: string;
  online: string;
  about: string;
  bans: string;
  nickname: string;
  level: string;
  experience: string;
  adminExp: string;
  faction: string;
  vk: string;
  server: string;
  statsPhoto: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
};

export type ServerConfig = {
  password: string;
  isOpen: boolean;
};

export type AppConfig = {
  adminPassword: string;
  servers: Record<string, ServerConfig>;
};

const DEFAULT_CONFIG: AppConfig = {
  adminPassword: "reynovadminlist",
  servers: {
    "Москва": { password: "listadminmsk", isOpen: true },
    "Питер": { password: "adminspiter", isOpen: true },
    "Екатеринбург": { password: "ekbadminlist", isOpen: true }
  }
};

export const getConfig = (): AppConfig => {
  const data = localStorage.getItem("gta_config");
  return data ? JSON.parse(data) : DEFAULT_CONFIG;
};

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem("gta_config", JSON.stringify(config));
};

export const getApplications = (): Application[] => {
  const data = localStorage.getItem("gta_applications");
  return data ? JSON.parse(data) : [];
};

export const saveApplication = (app: Omit<Application, "id" | "status" | "createdAt">) => {
  const apps = getApplications();
  apps.push({
    ...app,
    id: Math.random().toString(36).substring(2, 9),
    status: "pending",
    createdAt: Date.now(),
  });
  localStorage.setItem("gta_applications", JSON.stringify(apps));
};

export const updateApplicationStatus = (id: string, status: "approved" | "rejected") => {
  const apps = getApplications();
  const updated = apps.map((app) => (app.id === id ? { ...app, status } : app));
  localStorage.setItem("gta_applications", JSON.stringify(updated));
};

export const useAdminUnlock = () => {
  const [, setLocation] = useLocation();
  const [keys, setKeys] = useState<string[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const key = e.key.toLowerCase();
      setKeys((prev) => {
        const newKeys = [...prev, key].slice(-4);
        if (newKeys.join("") === "reyn") {
          setShowPrompt(true);
          return [];
        }
        return newKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { showPrompt, setShowPrompt, setLocation };
};
