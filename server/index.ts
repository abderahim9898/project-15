import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleWorkforceData } from "./routes/workforce";
import { handleAttendanceData } from "./routes/attendance";
import { handlePerformanceData } from "./routes/performance";
import { handleTurnoverData } from "./routes/turnover";
import { handleAdminAuth, handleGoogleSheetsUpload } from "./routes/admin";
import { handleRecruitmentData } from "./routes/recruitment";
import { handleSortieData } from "./routes/sortie";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.get("/api/workforce", handleWorkforceData);
  app.get("/api/attendance", handleAttendanceData);
  app.get("/api/performance", handlePerformanceData);
  app.get("/api/turnover", handleTurnoverData);
  app.get("/api/recruitment", handleRecruitmentData);
  app.get("/api/sortie", handleSortieData);
  app.get("/api/admin/auth", handleAdminAuth);
  app.post("/api/admin/upload", handleGoogleSheetsUpload);

  return app;
}
