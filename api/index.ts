import { type Request, Response, NextFunction } from "express";
import express from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Глобальное обещание для инициализации маршрутов
let initializationPromise: Promise<any> | null = null;

async function initializeApp() {
    if (!initializationPromise) {
        initializationPromise = registerRoutes(httpServer, app);
    }
    return initializationPromise;
}

export default async (req: Request, res: Response) => {
    try {
        await initializeApp();
        return app(req, res);
    } catch (error) {
        console.error("Vercel Serverless Function Init Error:", error);
        res.status(500).json({ error: "Internal Server Error during initialization" });
    }
};
