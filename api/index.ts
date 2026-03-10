import { type Request, Response, NextFunction } from "express";
import express from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Middleware для логирования (упрощенный для Vercel)
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (req.path.startsWith("/api")) {
            console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
    });
    next();
});

// Регистрация маршрутов
const promise = (async () => {
    await registerRoutes(httpServer, app);

    // Обработка ошибок
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Vercel API Error:", err);
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
    });
})();

// Vercel экспортирует функцию обработки
export default async (req: Request, res: Response) => {
    await promise;
    return app(req, res);
};
