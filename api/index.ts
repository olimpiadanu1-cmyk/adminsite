import { type Request, Response, NextFunction } from "express";
import express from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

let routesRegistered = false;
const registerPromise = registerRoutes(httpServer, app);

export default async (req: Request, res: Response) => {
    if (!routesRegistered) {
        await registerPromise;
        routesRegistered = true;
    }
    return app(req, res);
};
