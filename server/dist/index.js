import "dotenv/config";
import { pinoHttp } from "pino-http";
import { logger } from "./logger.js";
import express from "express";
import cors from "cors";
import { prisma } from "./db/prisma.js";
// Routes
import aiRoutes from "./routes/ai.js";
import guidesRoutes from "./routes/guides.js";
import paymentsRoutes from "./routes/payments.js";
import analyticsRoutes from "./routes/analytics.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";
// Express app
const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
// Request logging
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== "production" }));
// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));
// Health check
app.get("/health", async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: "connected",
        });
    }
    catch {
        res.status(503).json({
            status: "degraded",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: "disconnected",
        });
    }
});
// Routes
app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use("/guides", guidesRoutes);
app.use("/payments", paymentsRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/upload", uploadRoutes);
// Error handler
app.use((err, _req, res, _next) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({
        error: process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
    });
});
// 404 fallback
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
// Start server
app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, "GuideHub backend started");
});
export default app;
