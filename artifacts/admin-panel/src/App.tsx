import { useState, useEffect, useCallback } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { motion } from "framer-motion";
import { ShieldCheck, KeyRound, Lock, Loader2, Phone, ArrowRight, LogOut } from "lucide-react";

import { Layout } from "@/components/layout";
import SetupPage from "@/pages/setup";
import LocationsPage from "@/pages/locations";
import UsersPage from "@/pages/users";
import IssuesPage from "@/pages/issues";
import ShopsAdminPage from "@/pages/shops";
import {
  getAdminToken, setAdminToken, getMe, requestOtp, verifyOtp,
  setUnauthorizedHandler, logoutAdmin, type AdminUser,
} from "@/lib/api";

const queryClient = new QueryClient();

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("972")) return "+" + digits;
  if (digits.startsWith("0")) return "+972" + digits.slice(1);
  return "+" + digits;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
// Uses the same OTP login flow as the campus-app, but additionally verifies
// that the returned account has role === "admin". Non-admins get a clear
// Hebrew error message and their token is discarded immediately.
function LoginScreen({ onLoggedIn }: { onLoggedIn: (u: AdminUser) => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const res = await requestOtp(normalized);
      setPhone(normalized);
      setDevOtp(res.otp ?? null);
      setStep("otp");
    } catch (err: any) {
      setError(err?.message || "שליחת קוד נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const verified = await verifyOtp(phone, otp);
      // Persist the token before fetching /me so that the auth header is sent.
      setAdminToken(verified.token);
      const me = await getMe();
      if (me.role !== "admin") {
        // Clean up immediately — this account is not allowed in.
        await logoutAdmin();
        setError("אין לכם הרשאות מנהל. אנא פנו למנהל מערכת.");
        return;
      }
      onLoggedIn(me);
    } catch (err: any) {
      setError(err?.message || "אימות נכשל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-5 shadow-xl">
            <ShieldCheck className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">פאנל ניהול קמפוס</h1>
          <p className="text-muted-foreground text-sm mt-1.5">נדרש אימות מנהל כדי להמשיך</p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel" inputMode="tel" dir="ltr" autoFocus required value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+972 50 123 4567"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading || !phone.trim()}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>שליחת קוד אימות <ArrowRight className="w-4 h-4 rotate-180" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-muted-foreground text-center" dir="ltr">{phone}</p>
            {devOtp && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="text-accent text-lg">🧪</span>
                <div>
                  <p className="text-xs text-accent font-semibold">פיתוח — קוד מודפס מהשרת</p>
                  <p className="text-sm font-mono font-bold text-foreground mt-0.5 tracking-widest">{devOtp}</p>
                </div>
              </div>
            )}
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} dir="ltr" autoFocus
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-card border border-border text-foreground text-center text-xl tracking-widest focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading || otp.length < 6}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "אימות וכניסה"}
            </button>
            <button type="button" onClick={() => { setStep("phone"); setOtp(""); setDevOtp(null); setError(null); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
              שינוי מספר טלפון
            </button>
          </form>
        )}

        <div className="mt-8 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">הודעת אבטחה</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            פאנל זה מיועד למנהלים מורשים בלבד. כל הפעולות נרשמות בלוג. ההתחברות נשמרת עד יציאה ידנית.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── App Router ────────────────────────────────────────────────────────────────
function AppRouter({ admin, onLogout }: { admin: AdminUser; onLogout: () => void }) {
  return (
    <Switch>
      <Route path="/">
        <Layout active="setup" admin={admin} onLogout={onLogout}><SetupPage /></Layout>
      </Route>
      <Route path="/setup">
        <Layout active="setup" admin={admin} onLogout={onLogout}><SetupPage /></Layout>
      </Route>
      <Route path="/locations">
        <Layout active="locations" admin={admin} onLogout={onLogout}><LocationsPage /></Layout>
      </Route>
      <Route path="/users">
        <Layout active="users" admin={admin} onLogout={onLogout}><UsersPage /></Layout>
      </Route>
      <Route path="/issues">
        <Layout active="issues" admin={admin} onLogout={onLogout}><IssuesPage /></Layout>
      </Route>
      <Route path="/shops">
        <Layout active="shops" admin={admin} onLogout={onLogout}><ShopsAdminPage /></Layout>
      </Route>
      <Route>
        <Layout active="setup" admin={admin} onLogout={onLogout}><SetupPage /></Layout>
      </Route>
    </Switch>
  );
}

// ── Auth Guard ────────────────────────────────────────────────────────────────
// On mount: if a token exists, call /me to verify it's still valid AND that
// the user is still an admin. If anything fails the user is sent back to the
// login screen. A central 401 handler is installed so any later request that
// returns 401 (token revoked from another device, user demoted) instantly
// kicks them out.
function AuthGuard() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const handleLogout = useCallback(async () => {
    await logoutAdmin();
    setAdmin(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAdminToken(null);
      setAdmin(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAdminToken()) {
        if (!cancelled) setBootstrapping(false);
        return;
      }
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== "admin") {
          await logoutAdmin();
          setAdmin(null);
        } else {
          setAdmin(me);
        }
      } catch {
        if (!cancelled) {
          setAdminToken(null);
          setAdmin(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (bootstrapping) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!admin) return <LoginScreen onLoggedIn={setAdmin} />;
  return <AppRouter admin={admin} onLogout={handleLogout} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthGuard />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

// Re-exported for callers that want the icon without adding a separate import.
export { LogOut };
