import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { appConfigSchema, applicationSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // WebSocket Server Setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
  });

  // Prevent browser caching for all API routes
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    next();
  });

  // Config Routes
  app.get("/api/config", async (req, res) => {
    const config = await storage.getConfig();
    res.json(config);
  });

  app.post("/api/config", async (req, res) => {
    try {
      const config = appConfigSchema.parse(req.body);
      const updated = await storage.updateConfig(config);
      broadcast({ type: "config_updated", data: updated });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: "Invalid config data" });
    }
  });

  // Application Routes
  app.get("/api/applications", async (req, res) => {
    const apps = await storage.getApplications();
    // Strip base64 photos from the list endpoint to dramatically improve load time
    const appsWithoutPhotos = apps.map(app => ({
      ...app,
      statsPhoto: "" // Don't send the heavy base64 string
    }));
    res.json(appsWithoutPhotos);
  });

  app.get("/api/applications/:id/photo", async (req, res) => {
    const { id } = req.params;
    const app = await storage.getApplication(id);
    if (app && app.statsPhoto) {
      res.json({ statsPhoto: app.statsPhoto });
    } else {
      res.status(404).json({ error: "Photo not found" });
    }
  });

  app.get("/api/applications/check", async (req, res) => {
    const { query, server } = req.query;
    if (!query || !server) {
      return res.status(400).json({ error: "Query and server are required" });
    }

    const apps = await storage.getApplications();
    const q = String(query).toLowerCase().trim();
    const s = String(server);

    // Search by nickname, VK (normalized), or IP
    const foundApps = apps.filter(app =>
      app.server === s && (
        app.nickname.toLowerCase() === q ||
        app.vk.toLowerCase().includes(q) ||
        app.ip === q
      )
    ).sort((a, b) => b.createdAt - a.createdAt);

    if (foundApps.length > 0) {
      res.json(foundApps.map(a => ({
        status: a.status,
        nickname: a.nickname,
        server: a.server,
        createdAt: a.createdAt,
        rejectionReason: a.rejectionReason
      })));
    } else {
      res.status(404).json({ error: "Заявка не найдена. Проверьте правильность введенных данных и выбранный сервер." });
    }
  });

  app.post("/api/applications", async (req, res) => {
    try {
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || req.ip;
      const appData = { ...req.body, ip: String(clientIp || "127.0.0.1") };
      const newApp = await storage.createApplication(appData);
      broadcast({ type: "app_created", data: newApp });
      res.json(newApp);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid application data" });
    }
  });

  app.patch("/api/applications/:id", async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const updated = await storage.updateApplicationStatus(id, status, reason);
    if (updated) {
      broadcast({ type: "app_updated", data: updated });
      res.json(updated);
    } else {
      res.status(404).json({ error: "Application not found" });
    }
  });

  app.patch("/api/applications/:id/notes", async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    console.log(`Patching notes for ${id}:`, notes);
    const updated = await storage.updateApplicationNotes(id, notes);
    if (updated) {
      broadcast({ type: "app_updated", data: updated });
      res.json(updated);
    } else {
      console.log(`Application ${id} not found for notes patch`);
      res.status(404).json({ error: "Application not found" });
    }
  });

  app.delete("/api/applications/:id", async (req, res) => {
    const { id } = req.params;
    const success = await storage.deleteApplication(id);
    if (success) {
      broadcast({ type: "app_deleted", id });
      res.sendStatus(200);
    } else {
      res.status(404).json({ error: "Application not found" });
    }
  });

  // Stats Routes
  app.get("/api/stats", async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.post("/api/visits", async (req, res) => {
    await storage.incrementVisits();
    const stats = await storage.getStats();
    broadcast({ type: "stats_updated", data: stats });
    res.sendStatus(200);
  });

  app.get("/api/stats/peak-hours", async (req, res) => {
    const apps = await storage.getApplications();
    const hours = Array(24).fill(0);
    apps.forEach(app => {
      const date = new Date(app.createdAt);
      const hour = date.getHours();
      hours[hour]++;
    });
    res.json(hours);
  });

  app.post("/api/applications/bulk", async (req, res) => {
    try {
      const { ids, action, reason } = req.body;
      if (!Array.isArray(ids) || !action) {
        return res.status(400).json({ error: "Invalid bulk data" });
      }

      const results = [];
      for (const id of ids) {
        if (action === "approve") {
          const updated = await storage.updateApplicationStatus(id, "approved");
          if (updated) {
            results.push(updated);
            broadcast({ type: "app_updated", data: updated });
          }
        } else if (action === "reject") {
          const updated = await storage.updateApplicationStatus(id, "rejected", reason);
          if (updated) {
            results.push(updated);
            broadcast({ type: "app_updated", data: updated });
          }
        } else if (action === "delete") {
          const success = await storage.deleteApplication(id);
          if (success) {
            broadcast({ type: "app_deleted", id });
          }
        }
      }
      res.json({ success: true, count: results.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI Analysis Route
  app.post("/api/analyze-application", async (req, res) => {
    try {
      const { application } = req.body;
      if (!application) return res.status(400).json({ error: "Application data required" });

      const nickname = application.nickname || "";
      const ageRaw = String(application.age || "0");
      const age = parseInt(ageRaw) || 0;
      const hours = parseInt(application.dailyHours) || 0;
      const exp = application.experience || "";
      const why = application.whyMe || "";
      const about = application.about || "";
      const tz = String(application.timezone || "");

      let score = 50;
      const pros: string[] = [];
      const cons: string[] = [];
      const grammar: string[] = [];

      // RP Nickname (CRMP)
      if (/^[A-Z][a-z]+_[A-Z][a-z]+$/.test(nickname)) {
        score += 10;
        pros.push("Ник в формате RP (CRMP)");
      } else {
        score -= 25;
        cons.push("Ник не в формате RP (Пример: Ivan_Ivanov)");
      }

      // Age Sanity
      if (age > 100 || ageRaw === "123") {
        score -= 40;
        cons.push(`Указан нереальный возраст: ${ageRaw}`);
      } else if (age >= 18) {
        score += 15;
        pros.push("Совершеннолетний (18+)");
      } else if (age >= 16) {
        score += 10;
        pros.push("Подходящий возраст (16+)");
      } else if (age >= 14) {
        score += 0; // Neutral, new minimum
        pros.push("Минимальный возраст (14+)");
      } else {
        score -= 20;
        cons.push("Возраст ниже критериев (менее 14)");
      }

      // Timezone / Online Sanity
      if (tz === "123" || (Number(tz) > 14 || Number(tz) < -12)) {
        score -= 15;
        cons.push(`Подозрительный часовой пояс: ${tz}`);
      }
      if (hours >= 100) {
        score -= 20;
        cons.push(`Нереальный онлайн: ${hours} ч.`);
      } else if (hours >= 5) {
        score += 15;
        pros.push("Высокий онлайн (5+ часов)");
      }

      // Profanity Filter
      const bad = ["хуй", "пизд", "еба", "бля", "сука", "гандон", "мудак", "член", "даун", "лох", "чмо"];
      const fields = { nickname, exp, why, about };
      Object.entries(fields).forEach(([key, val]) => {
        if (bad.some(word => val.toLowerCase().includes(word))) {
          score = 0;
          const fieldName = key === 'nickname' ? 'Ник' : (key === 'exp' ? 'Опыт' : (key === 'why' ? 'Почему именно вы' : 'О себе'));
          cons.push(`${fieldName}: ОБНАРУЖЕНА НЕЦЕНЗУРНАЯ ЛЕКСИКА`);
          grammar.push(`${fieldName}: содержит мат или оскорбления`);
        }
      });

      // Content Quality
      if (exp.length > 100) { score += 10; pros.push("Опыт: Подробно описан"); }
      else if (exp.length < 20) { score -= 10; cons.push("Опыт: Слишком краткое описание"); }

      if (why.length > 100) { score += 10; pros.push("Мотивация: Убедительная"); }
      else if (why.length < 15) { score -= 15; cons.push("Мотивация: Практически отсутствует"); }

      // Grammar Simulation
      if (exp.length > 5 && !/^[А-Я]/.test(exp)) { grammar.push("Опыт: Нет заглавной буквы в начале"); score -= 5; }
      if (why.length > 5 && !/^[А-Я]/.test(why)) { grammar.push("Мотивация: Нет заглавной буквы в начале"); score -= 5; }
      if ((exp + why + about).length > 20 && !/[.!?](\s|$)/.test(exp + why + about)) { grammar.push("Общее: Отсутствуют знаки препинания в конце"); score -= 5; }

      score = Math.max(0, Math.min(100, score));
      res.json({
        score, pros, cons, grammar,
        verdict: score > 75 ? "Рекомендуется к одобрению" : (score > 45 ? "Стоит присмотреться" : "Высокий риск отказа")
      });
    } catch (e) {
      res.status(500).json({ error: "AI Processing Error" });
    }
  });

  // AI Chat Interactive Route
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });
      const input = message.toLowerCase();
      let response = "\u042f \u0430\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e \u0434\u0430\u043d\u043d\u044b\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435: \"\u043e\u0446\u0435\u043d\u0438 \u041d\u0438\u043a_\u0418\u0433\u0440\u043e\u043a\u0430\" \u0438\u043b\u0438 \"\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0437\u0430\u044f\u0432\u043e\u043a \u043e\u0436\u0438\u0434\u0430\u0435\u0442\".";

      // Pattern matching for nickname
      const nickMatch = message.match(/(?:\u043e\u0446\u0435\u043d\u0438|\u043f\u043e\u0441\u043c\u043e\u0442\u0440\u0438|\u043a\u0442\u043e \u0442\u0430\u043a\u043e\u0439|\u043d\u0438\u043a|\u043d\u0430\u0439\u0434\u0438|\u0437\u0430\u044f\u0432\u043a\u0430 \u043e\u0442)[\s:]+([A-Za-z\u0410-\u042f\u0430-\u044f\u0451\u04510-9_]+)/i);

      if (nickMatch) {
        const targetNick = nickMatch[1];
        const apps = await storage.getApplications();
        const foundApp = apps.find(a => a.nickname.toLowerCase() === targetNick.toLowerCase())
          || apps.find(a => a.nickname.toLowerCase().includes(targetNick.toLowerCase()));

        if (foundApp) {
          const ageNum = parseInt(foundApp.age) || 0;
          const isExpSus = foundApp.experience.length < 10 || /^\d+$/.test(foundApp.experience);
          const isAboutSus = foundApp.about.length < 10 || /^\d+$/.test(foundApp.about);
          const hasGoodNick = /^[A-Z][a-z]+_[A-Z][a-z]+$/.test(foundApp.nickname);
          const statusLabel = foundApp.status === "approved" ? "\u2705 \u041e\u0434\u043e\u0431\u0440\u0435\u043d\u0430" : foundApp.status === "rejected" ? "\u274c \u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430" : "\u23f3 \u041e\u0436\u0438\u0434\u0430\u0435\u0442";

          let assessment = "";
          if (isExpSus || isAboutSus) {
            assessment = "\u26a0\ufe0f \u041a\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0430: \u0434\u0430\u043d\u043d\u044b\u0435 \u0432 \u043f\u043e\u043b\u044f\u0445 \u043e\u043f\u044b\u0442\u0430/\u043e \u0441\u0435\u0431\u0435 \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b (\u0441\u043b\u0438\u0448\u043a\u043e\u043c \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0435 \u0438\u043b\u0438 \u0446\u0438\u0444\u0440\u044b). \u0412\u0435\u0440\u043e\u044f\u0442\u0435\u043d \u0444\u0435\u0439\u043a.";
          } else if (!hasGoodNick) {
            assessment = "\u26a0\ufe0f \u041d\u0438\u043a \u043d\u0435 \u0432 RP-\u0444\u043e\u0440\u043c\u0430\u0442\u0435. \u041e\u0441\u0442\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043d\u0443\u0436\u043d\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0432\u0440\u0443\u0447\u043d\u0443\u044e.";
          } else {
            assessment = ageNum < 16
              ? "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442 \u043c\u043e\u043b\u043e\u0434, \u043d\u043e \u0435\u0441\u043b\u0438 \u043e\u043f\u044b\u0442 \u0445\u043e\u0440\u043e\u0448\u0438\u0439 \u2014 \u043c\u043e\u0436\u043d\u043e \u0440\u0430\u0441\u0441\u043c\u0430\u0442\u0440\u0438\u0432\u0430\u0442\u044c."
              : "\u0412\u043e\u0437\u0440\u0430\u0441\u0442\u043d\u043e\u0439 \u0446\u0435\u043d\u0437 \u0438 \u043d\u0438\u043a \u0432 \u043f\u043e\u0440\u044f\u0434\u043a\u0435. \u0414\u0430\u043d\u043d\u044b\u0435 \u0432\u044b\u0433\u043b\u044f\u0434\u044f\u0442 \u0430\u0434\u0435\u043a\u0432\u0430\u0442\u043d\u043e.";
          }

          response = `\u041d\u0430\u0448\u0435\u043b \u0437\u0430\u044f\u0432\u043a\u0443: **${foundApp.nickname}** (${foundApp.server})\n**\u0421\u0442\u0430\u0442\u0443\u0441:** ${statusLabel}\n**\u0412\u043e\u0437\u0440\u0430\u0441\u0442:** ${foundApp.age} | **\u0423\u0440\u043e\u0432\u0435\u043d\u044c:** ${foundApp.level} | **\u041e\u043d\u043b\u0430\u0439\u043d:** ${foundApp.online} \u0447.\n**\u0411\u043b\u0438\u0446-\u043e\u0446\u0435\u043d\u043a\u0430:** ${assessment}\n\n\u0414\u043b\u044f \u043f\u043e\u043b\u043d\u043e\u0433\u043e \u0430\u043d\u0430\u043b\u0438\u0437\u0430 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u043a\u043d\u043e\u043f\u043a\u0443 **'\u0410\u043d\u0430\u043b\u0438\u0437 \u0418\u0418'** \u0432 \u0440\u0430\u0437\u0432\u0435\u0440\u043d\u0443\u0442\u043e\u0439 \u0437\u0430\u044f\u0432\u043a\u0435.`;
        } else {
          response = `\u041d\u0435 \u043d\u0430\u0448\u0435\u043b \u0437\u0430\u044f\u0432\u043a\u0443 \u0441 \u043d\u0438\u043a\u043e\u043c \u043f\u043e\u0445\u043e\u0436\u0438\u043c \u043d\u0430 **${targetNick}**. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043d\u0430\u043f\u0438\u0441\u0430\u043d\u0438\u0435.`;
        }
      } else if (input.includes("\u0441\u043a\u043e\u043b\u044c\u043a\u043e") && (input.includes("\u0437\u0430\u044f\u0432\u043e\u043a") || input.includes("\u043e\u0436\u0438\u0434\u0430\u0435\u0442") || input.includes("\u0432\u0441\u0435\u0433\u043e"))) {
        const apps = await storage.getApplications();
        const pending = apps.filter(a => a.status === "pending").length;
        const approved = apps.filter(a => a.status === "approved").length;
        const rejected = apps.filter(a => a.status === "rejected").length;
        response = `\ud83d\udcca **\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043f\u043e \u0437\u0430\u044f\u0432\u043a\u0430\u043c:**\n\u23f3 \u041e\u0436\u0438\u0434\u0430\u044e\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438: **${pending}**\n\u2705 \u041e\u0434\u043e\u0431\u0440\u0435\u043d\u043e: **${approved}**\n\u274c \u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e: **${rejected}**\n\u0412\u0441\u0435\u0433\u043e \u0432 \u0431\u0430\u0437\u0435: **${apps.length}**`;
      } else if (input.includes("\u043f\u043e\u0441\u043b\u0435\u0434\u043d") && (input.includes("\u0437\u0430\u044f\u0432\u043a") || input.includes("\u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442"))) {
        const apps = await storage.getApplications();
        const sorted = [...apps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const last = sorted[0];
        if (last) {
          const statusLabel = last.status === "approved" ? "\u2705 \u041e\u0434\u043e\u0431\u0440\u0435\u043d\u0430" : last.status === "rejected" ? "\u274c \u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430" : "\u23f3 \u041e\u0436\u0438\u0434\u0430\u0435\u0442";
          response = `\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0437\u0430\u044f\u0432\u043a\u0430: **${last.nickname}** (${last.server})\n\u0421\u0442\u0430\u0442\u0443\u0441: ${statusLabel} | \u0412\u043e\u0437\u0440\u0430\u0441\u0442: ${last.age} | \u0423\u0440\u043e\u0432\u0435\u043d\u044c: ${last.level}`;
        } else {
          response = "\u0412 \u0431\u0430\u0437\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0437\u0430\u044f\u0432\u043e\u043a.";
        }
      } else if (input.includes("\u043f\u0440\u0438\u0432\u0435\u0442") || input.includes("\u0437\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439") || input.includes("\u0445\u0430\u0439")) {
        response = "\u041f\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e! \u042f \u0418\u0418-\u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a Reynov Production. \u041c\u043e\u0433\u0443 \u043d\u0430\u0439\u0442\u0438 \u0437\u0430\u044f\u0432\u043a\u0443 \u043f\u043e \u043d\u0438\u043a\u0443, \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0443 \u0438\u043b\u0438 \u043e\u0442\u0432\u0435\u0442\u0438\u0442\u044c \u043d\u0430 \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u043f\u043e \u043c\u043e\u0434\u0435\u0440\u0430\u0446\u0438\u0438.";
      } else if (input.includes("\u0441\u043e\u0432\u0435\u0442") || input.includes("\u043f\u043e\u0434\u0441\u043a\u0430\u0436\u0438") || input.includes("\u043a\u0430\u043a")) {
        response = "\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0441\u043e\u0432\u0435\u0442: \u0432\u0441\u0435\u0433\u0434\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0439 \u043f\u043e\u043b\u0435 '\u041f\u043e\u0447\u0435\u043c\u0443 \u0438\u043c\u0435\u043d\u043d\u043e \u0432\u044b'. \u0415\u0441\u043b\u0438 \u0442\u0430\u043c \u0448\u0430\u0431\u043b\u043e\u043d \u0438\u043b\u0438 \u043c\u0435\u043d\u044c\u0448\u0435 2 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0439 \u2014 \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442 \u043d\u0435 \u0441\u0435\u0440\u044c\u0435\u0437\u0435\u043d. \u0422\u0430\u043a\u0436\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0439 RP-\u043d\u0438\u043a (\u0444\u043e\u0440\u043c\u0430\u0442: \u0418\u043c\u044f_\u0424\u0430\u043c\u0438\u043b\u0438\u044f).";
      } else if (input.includes("\u043e\u0448\u0438\u0431\u043a") || input.includes("\u0433\u0440\u0430\u043c\u043e\u0442\u043d")) {
        response = "\u042f \u043f\u043e\u0434\u0441\u0432\u0435\u0447\u0438\u0432\u0430\u044e \u043e\u0448\u0438\u0431\u043a\u0438 \u0432 \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u044b\u0445 \u043f\u043e\u043b\u044f\u0445 (\u041e\u041f\u042b\u0422, \u041c\u041e\u0422\u0418\u0412\u0410\u0426\u0418\u042f, \u041e \u0421\u0415\u0411\u0415). \u041e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u0437\u0430\u0433\u043b\u0430\u0432\u043d\u044b\u0445 \u0431\u0443\u043a\u0432 \u0438 \u0437\u043d\u0430\u043a\u043e\u0432 \u043f\u0440\u0435\u043f\u0438\u043d\u0430\u043d\u0438\u044f \u0441\u043d\u0438\u0436\u0430\u044e\u0442 \u043e\u0446\u0435\u043d\u043a\u0443.";
      } else if (input.includes("\u043a\u0440\u0438\u0442\u0435\u0440\u0438") || input.includes("\u043f\u0440\u0430\u0432\u0438\u043b") || input.includes("\u043e\u0442\u0431\u043e\u0440")) {
        response = "\u041e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u043a\u0440\u0438\u0442\u0435\u0440\u0438\u0438: \u0432\u043e\u0437\u0440\u0430\u0441\u0442 14+ (\u043f\u0440\u0435\u0434\u043f\u043e\u0447\u0442\u0438\u0442\u0435\u043b\u044c\u043d\u043e 16+), \u0443\u0440\u043e\u0432\u0435\u043d\u044c 5-10+, RP-\u043d\u0438\u043a (\u0418\u043c\u044f_\u0424\u0430\u043c\u0438\u043b\u0438\u044f), \u0433\u0440\u0430\u043c\u043e\u0442\u043d\u0430\u044f \u0440\u0435\u0447\u044c, \u043e\u043f\u044b\u0442 100+ \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432. \u041d\u043e\u043b\u044c \u0442\u043e\u043b\u0435\u0440\u0430\u043d\u0442\u043d\u043e\u0441\u0442\u0438 \u043a \u043c\u0430\u0442\u0443.";
      } else if (input.includes("\u0432\u043e\u0437\u0440\u0430\u0441\u0442") || input.includes("\u043b\u0435\u0442")) {
        response = "\u041c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u043e\u0437\u0440\u0430\u0441\u0442 \u2014 14 \u043b\u0435\u0442. 16+ \u043f\u043e\u043b\u0443\u0447\u0430\u044e\u0442 \u0431\u043e\u043d\u0443\u0441 \u043f\u0440\u0438 \u0430\u043d\u0430\u043b\u0438\u0437\u0435. 18+ \u2014 \u0432\u044b\u0441\u0448\u0438\u0439 \u043f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442.";
      } else if (input.includes("\u0441\u0435\u0440\u0432\u0435\u0440") || input.includes("\u043c\u043e\u0441\u043a\u0432\u0430") || input.includes("\u043f\u0438\u0442\u0435\u0440") || input.includes("\u0435\u043a\u0430\u0442\u0435\u0440\u0438\u043d\u0431\u0443\u0440\u0433")) {
        response = "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u0430: \u041c\u043e\u0441\u043a\u0432\u0430, \u041f\u0438\u0442\u0435\u0440, \u0415\u043a\u0430\u0442\u0435\u0440\u0438\u043d\u0431\u0443\u0440\u0433. \u041f\u0440\u0438 \u0430\u043d\u0430\u043b\u0438\u0437\u0435 \u044f \u0443\u0447\u0438\u0442\u044b\u0432\u0430\u044e, \u043e\u0442\u043a\u0440\u044b\u0442 \u043b\u0438 \u043d\u0430\u0431\u043e\u0440 \u043d\u0430 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0441\u0435\u0440\u0432\u0435\u0440.";
      } else if (input.includes("\u0441\u043f\u0430\u0441\u0438\u0431\u043e") || input.includes("\u0431\u043b\u0430\u0433\u043e\u0434\u0430\u0440\u044e")) {
        response = "\u0420\u0430\u0434 \u043f\u043e\u043c\u043e\u0447\u044c! \u0423\u0441\u043f\u0435\u0448\u043d\u043e\u0439 \u043c\u043e\u0434\u0435\u0440\u0430\u0446\u0438\u0438!";
      } else if (input.includes("\u043a\u0442\u043e \u0442\u044b") || input.includes("\u0447\u0442\u043e \u0443\u043c\u0435\u0435\u0448\u044c")) {
        response = "\u042f \u2014 Advanced Analytics Engine v5.0 (Reynov Production). \u0423\u043c\u0435\u044e:\n\u2022 \u041d\u0430\u0445\u043e\u0434\u0438\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0438 \u043f\u043e \u043d\u0438\u043a\u0443: \u043e\u0446\u0435\u043d\u0438 \u041d\u0438\u043a_\u0418\u0433\u0440\u043e\u043a\u0430\n\u2022 \u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0443: \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0437\u0430\u044f\u0432\u043e\u043a \u043e\u0436\u0438\u0434\u0430\u0435\u0442\n\u2022 \u0410\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u043e\u0432 \u0447\u0435\u0440\u0435\u0437 \u043a\u043d\u043e\u043f\u043a\u0443 '\u0410\u043d\u0430\u043b\u0438\u0437 \u0418\u0418'\n\u2022 \u041e\u0442\u0432\u0435\u0447\u0430\u0442\u044c \u043d\u0430 \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u043f\u043e \u043f\u0440\u0430\u0432\u0438\u043b\u0430\u043c \u043c\u043e\u0434\u0435\u0440\u0430\u0446\u0438\u0438";
      }
      res.json({ response });
    } catch (e) {
      res.status(500).json({ error: "AI Chat Error" });
    }
  });

  return httpServer;
}

