import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";

const app: Express = express();

// ── Trust proxy (we run behind Replit's proxy / future load balancer) ──
// Required so express-rate-limit reads X-Forwarded-For correctly.
app.set("trust proxy", 1);

// ── Security headers ──
app.use(helmet({
  // We serve only JSON to a separate frontend; CSP not relevant here.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── CORS ──
// In dev, allow Vite preview origins. In prod, lock to known domains via
// CORS_ORIGINS env (comma-separated). Falls back to permissive when unset.
const corsOriginsEnv = process.env["CORS_ORIGINS"];
const corsOrigins = corsOriginsEnv
  ? corsOriginsEnv.split(",").map(s => s.trim()).filter(Boolean)
  : null;

app.use(cors({
  origin: corsOrigins ?? true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

// ── Cookie parser (required for Replit Auth session cookies) ──
app.use(cookieParser());

// ── Body parsing with explicit limits (DoS protection) ──
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// ── Replit Auth middleware — loads OIDC session on every request ──
// Sets req.user and req.isAuthenticated() when a valid session cookie exists.
// Must run after cookieParser and body parsing, before routes.
app.use(authMiddleware);

// ── Rate limiters ──
// Global: 600 requests / 5min per IP — generous for normal use, blocks runaway scripts
const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי בקשות, נסו שוב בעוד מספר דקות" },
});

// Auth: 10 OTP requests / hour per IP — blocks SMS-spam abuse
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי ניסיונות התחברות, נסו שוב בעוד שעה" },
});

// Writes: 60 create/update operations / minute per IP
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD",
  message: { error: "יותר מדי פעולות, האטו לרגע" },
});

app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api", writeLimiter);

// ── Health check (public, no rate limit affects it meaningfully) ──
app.get("/health", (_req, res) => { res.json({ ok: true, ts: Date.now() }); });

// ── Routes ──
app.use("/api", router);

// ── 404 ──
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "נתיב לא נמצא" });
});

// ── Global error middleware ──
// Sanitizes errors so internal details (SQL, stack) never leak to clients.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  // Always log full error server-side
  console.error(`[error] ${req.method} ${req.path}`, err);
  // Never leak internals in 5xx responses
  const msg = status >= 500
    ? "שגיאה פנימית, נסו שוב"
    : (typeof err?.message === "string" ? err.message : "שגיאה");
  if (!res.headersSent) {
    res.status(status).json({ error: msg });
  }
});

export default app;
