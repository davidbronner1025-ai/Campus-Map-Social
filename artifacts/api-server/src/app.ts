import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

// ─── Security & Parsing ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || true,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Simple rate limiter (per IP, in-memory) ──────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120; // 120 requests per minute per IP

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }
  next();
});

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

// ─── Admin PIN auth middleware ─────────────────────────────────────────────
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
app.use("/api/admin", (req: Request, res: Response, next: NextFunction) => {
  const pin = req.headers["x-admin-pin"] as string;
  if (pin !== ADMIN_PIN) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Global error handler (prevents server crashes) ────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.message, err.stack);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
