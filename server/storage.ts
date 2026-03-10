import { type User, type InsertUser, type Application, type AppConfig, type SiteStats } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Applications
  getApplications(): Promise<Application[]>;
  createApplication(app: Omit<Application, "id" | "createdAt" | "status" | "reviewedAt">): Promise<Application>;
  updateApplicationStatus(id: string, status: Application["status"], reason?: string): Promise<Application | undefined>;
  updateApplicationNotes(id: string, notes: string): Promise<Application | undefined>;

  // Config
  getConfig(): Promise<AppConfig>;
  updateConfig(config: AppConfig): Promise<AppConfig>;

  // Stats
  getStats(): Promise<SiteStats>;
  incrementVisits(): Promise<void>;
}

export class JSONStorage implements IStorage {
  private users: Map<string, User>;
  private applications: Map<string, Application>;
  private config: AppConfig;
  private visits: number;
  private filePath: string;

  constructor() {
    this.users = new Map();
    this.applications = new Map();
    this.visits = 0;
    this.filePath = path.resolve(process.cwd(), "data.json");

    const initialConfig: AppConfig = {
      adminPassword: "reynovadminlist",
      servers: {
        "Москва": { isOpen: true, password: "reynovmoscow" },
        "Питер": { isOpen: true, password: "reynovpiter" },
        "Екатеринбург": { isOpen: true, password: "reynovekb" }
      },
      cooldownDays: 3,
      blacklistedIPs: [],
      blacklistedVKs: [],
    };
    this.config = initialConfig;

    this.loadData();
  }

  private loadData() {
    if (fs.existsSync(this.filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        this.config = data.config || this.config;
        this.visits = data.visits || 0;
        if (data.applications) {
          data.applications.forEach((app: Application) => {
            this.applications.set(app.id, app);
          });
        }
        if (data.users) {
          data.users.forEach((user: User) => {
            this.users.set(user.id, user);
          });
        }
      } catch (e) {
        console.error("Error loading data from data.json", e);
      }
    } else {
      this.saveData();
    }
  }

  private saveData() {
    const data = {
      config: this.config,
      visits: this.visits,
      applications: Array.from(this.applications.values()),
      users: Array.from(this.users.values())
    };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    this.saveData();
    return user;
  }

  async getApplications(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }

  async getApplication(id: string): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async createApplication(appData: Omit<Application, "id" | "createdAt" | "status" | "reviewedAt">): Promise<Application> {
    // VK Validation
    if (!appData.vk.toLowerCase().includes("vk.com")) {
      throw new Error("Ссылка на ВК должна содержать vk.com");
    }

    // Check blacklists
    const blacklistedIPs = this.config.blacklistedIPs || [];
    const blacklistedVKs = this.config.blacklistedVKs || [];

    if (blacklistedIPs.includes(appData.ip)) {
      throw new Error("Вы не можете подать заявку.");
    }

    const normalizedVk = appData.vk.toLowerCase().trim();
    if (blacklistedVKs.some(v => normalizedVk.includes(v.toLowerCase().trim()))) {
      throw new Error("Вы не можете подать заявку.");
    }

    // NEW Logic: Check all applications for the last 7 days for the report
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;

    const recentApps = Array.from(this.applications.values()).filter(
      (a) => (a.vk === appData.vk || a.ip === appData.ip) &&
        a.server === appData.server &&
        a.createdAt > sevenDaysAgo
    ).sort((a, b) => b.createdAt - a.createdAt);

    // Check rate limit: configurable days
    const cooldownMs = (this.config.cooldownDays || 3) * 24 * 60 * 60 * 1000;
    const cooldownLimit = Date.now() - cooldownMs;
    const days = this.config.cooldownDays || 3;

    const blockingApp = recentApps.find(a => a.createdAt > cooldownLimit);

    if (blockingApp) {
      const days = this.config.cooldownDays || 3;
      throw new Error(
        `У вас уже есть заявки за последние 7 дней на сервер ${appData.server}.\n\n` +
        `Проверить статус своей заявки можно в разделе «Результаты».\n` +
        `Следующую можно будет подать только через ${days} дн.`
      );
    }

    const id = randomUUID();
    const app: Application = {
      ...appData,
      id,
      status: "pending",
      createdAt: Date.now()
    };
    this.applications.set(id, app);
    this.saveData();
    return app;
  }

  async updateApplicationStatus(id: string, status: Application["status"], reason?: string): Promise<Application | undefined> {
    const app = this.applications.get(id);
    if (app) {
      app.status = status;
      app.reviewedAt = Date.now();
      if (reason !== undefined) {
        app.rejectionReason = reason;
      }
      this.saveData();
      return app;
    }
    return undefined;
  }

  async updateApplicationNotes(id: string, notes: string): Promise<Application | undefined> {
    const app = this.applications.get(id);
    if (app) {
      app.adminNotes = notes;
      this.saveData();
      return app;
    }
    return undefined;
  }

  async deleteApplication(id: string): Promise<boolean> {
    const deleted = this.applications.delete(id);
    if (deleted) {
      this.saveData();
    }
    return deleted;
  }

  async getConfig(): Promise<AppConfig> {
    return this.config;
  }

  async updateConfig(config: AppConfig): Promise<AppConfig> {
    this.config = config;
    this.saveData();
    return config;
  }

  async getStats(): Promise<SiteStats> {
    const apps = Array.from(this.applications.values());
    const serverStats: Record<string, number> = {};

    // Initialize server stats
    Object.keys(this.config.servers).forEach(name => {
      serverStats[name] = 0;
    });

    apps.forEach(app => {
      if (serverStats[app.server] !== undefined) {
        serverStats[app.server]++;
      }
    });

    return {
      visits: this.visits,
      totalApplications: apps.length,
      serverStats
    };
  }

  async incrementVisits(): Promise<void> {
    this.visits++;
    this.saveData();
  }

  async cleanupOldApplications(): Promise<void> {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let hasDeleted = false;

    // Iterate and identify old reviewed applications
    for (const [id, app] of Array.from(this.applications.entries())) {
      if ((app.status === "approved" || app.status === "rejected") && app.reviewedAt) {
        if (now - app.reviewedAt > SEVEN_DAYS_MS) {
          this.applications.delete(id);
          hasDeleted = true;
        }
      }
    }

    if (hasDeleted) {
      console.log("Cleaned up old applications (> 7 days)");
      this.saveData();
    }
  }
}

export const storage = new JSONStorage();

// Start background cleanup job (runs every hour)
setInterval(() => {
  storage.cleanupOldApplications().catch(console.error);
}, 60 * 60 * 1000);
