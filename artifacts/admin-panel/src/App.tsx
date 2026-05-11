import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ShieldCheck, KeyRound, Eye, EyeOff, Lock } from "lucide-react";
import { motion } from "framer-motion";

import { Layout } from "@/components/layout";
import RootPage from "@/pages/root";
import SetupPage from "@/pages/setup";
import LocationsPage from "@/pages/locations";
import UsersPage from "@/pages/users";
import IssuesPage from "@/pages/issues";
import ShopsAdminPage from "@/pages/shops";

const queryClient = new QueryClient();

// Admin PIN — set VITE_ADMIN_PIN env var to override. Default: 1234
const ADMIN_PIN = (import.meta as any).env?.VITE_ADMIN_PIN || "1234";
const SESSION_KEY = "campus_admin_unlocked";

// ── PIN Screen ────────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
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
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Enter your admin PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
              className={`w-full pl-10 pr-10 py-3.5 rounded-xl bg-card border text-foreground text-center text-xl tracking-widest focus:outline-none focus:border-primary transition-colors ${error ? "border-destructive animate-shake" : "border-border"}`}
            />
            <button type="button" onClick={() => setShowPin(p => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-destructive text-sm text-center">Incorrect PIN</p>}
          <button type="submit" disabled={!pin}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40">
            Unlock
          </button>
        </form>

        <div className="mt-8 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Security Notice</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This panel is for authorized administrators only. All actions are logged. The session expires when you close the browser.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── App Router ────────────────────────────────────────────────────────────────
function AppRouter() {
  return (
    <Switch>
      <Route path="/">
        <RootPage />
      </Route>
      <Route path="/setup">
        <Layout active="setup"><SetupPage /></Layout>
      </Route>
      <Route path="/locations">
        <Layout active="locations"><LocationsPage /></Layout>
      </Route>
      <Route path="/users">
        <Layout active="users"><UsersPage /></Layout>
      </Route>
      <Route path="/issues">
        <Layout active="issues"><IssuesPage /></Layout>
      </Route>
      <Route path="/shops">
        <Layout active="shops"><ShopsAdminPage /></Layout>
      </Route>
      <Route>
        <RootPage />
      </Route>
    </Switch>
  );
}

// ── PIN Guard ─────────────────────────────────────────────────────────────────
function PinGuard() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;
  return <AppRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <PinGuard />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
