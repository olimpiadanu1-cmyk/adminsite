import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Application Schema
export const applicationSchema = z.object({
  id: z.string(),
  login: z.string(),
  realName: z.string(),
  age: z.string(),
  timezone: z.string(),
  online: z.string(),
  about: z.string(),
  nickname: z.string(),
  level: z.string(),
  experience: z.string(),
  adminExp: z.string().optional(),
  vk: z.string(),
  statsPhoto: z.string().optional(),
  server: z.string(),
  forumLink: z.string().optional().default(""),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: z.number(),
  reviewedAt: z.number().optional(),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  ip: z.string(),
});

export type Application = z.infer<typeof applicationSchema>;

// Config Schema
export const serverConfigSchema = z.object({
  isOpen: z.boolean(),
  password: z.string(),
});

export const appConfigSchema = z.object({
  adminPassword: z.string(),
  servers: z.record(z.string(), serverConfigSchema),
  cooldownDays: z.number().default(3),
  blacklistedIPs: z.array(z.string()).default([]),
  blacklistedVKs: z.array(z.string()).default([]),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

// Stats Schema
export const siteStatsSchema = z.object({
  visits: z.number(),
  totalApplications: z.number(),
  serverStats: z.record(z.string(), z.number()),
});

export type SiteStats = z.infer<typeof siteStatsSchema>;
