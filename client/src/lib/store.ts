import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import { Application, AppConfig, SiteStats } from "@shared/schema";

export type { Application, AppConfig, SiteStats };

export const useConfig = () => {
  return useQuery<AppConfig>({
    queryKey: ["/api/config"],
  });
};

export const useApplications = () => {
  return useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });
};

export const useStats = () => {
  return useQuery<SiteStats>({
    queryKey: ["/api/stats"],
  });
};

export const incrementVisits = async () => {
  await apiRequest("POST", "/api/visits");
};

export const saveApplication = async (app: Omit<Application, "id" | "status" | "createdAt" | "reviewedAt">) => {
  const res = await apiRequest("POST", "/api/applications", app);
  return res.json();
};

export const updateApplicationStatus = async (id: string, status: "approved" | "rejected", reason?: string) => {
  const res = await apiRequest("PATCH", `/api/applications/${id}`, { status, reason });
  return res.json();
};

export const updateApplicationNotes = async (id: string, notes: string) => {
  const res = await apiRequest("PATCH", `/api/applications/${id}/notes`, { notes });
  return res.json();
};

export const deleteApplication = async (id: string) => {
  await apiRequest("DELETE", `/api/applications/${id}`);
};

export const saveConfig = async (config: AppConfig) => {
  const res = await apiRequest("POST", "/api/config", config);
  return res.json();
};

// WebSocket Hook for real-time updates
export const useRealtimeUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let socket: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "config_updated") {
            queryClient.invalidateQueries({ queryKey: ["/api/config"] });
          } else if (message.type === "app_created" || message.type === "app_updated" || message.type === "app_deleted") {
            queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
          } else if (message.type === "stats_updated") {
            queryClient.setQueryData(["/api/stats"], message.data);
          }
        } catch (e) {
          console.error("WS Message Error:", e);
        }
      };

      socket.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);
};

// Date Formatter Utility (formatted for MSK)
export const formatMSKDate = (timestamp: number | undefined) => {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
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
