import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

import { Layout } from "@/components/layout";
import SetupPage from "@/pages/setup";
import LocationsPage from "@/pages/locations";
import UsersPage from "@/pages/users";
import IssuesPage from "@/pages/issues";
import ShopsAdminPage from "@/pages/shops";
import { setUnauthorizedHandler } from "@/lib/api";

const queryClient = new QueryClient();

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
      </div>
      <div className="w-full max-w-sm relative z-10 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-5 shadow-xl">
          <ShieldCheck className="w-9 h-9 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1.5">פאנל ניהול קמפוס</h1>
        <p className="text-muted-foreground text-sm mb-8">נדרש אימות מנהל כדי להמשיך</p>

        <button
          onClick={onLogin}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          כניסה למערכת
        </button>

        <div className="mt-8 bg-card border border-border rounded-xl p-4 text-right">
          <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            הודעת אבטחה
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            פאנל זה מיועד למנהלים מורשים בלבד. כל הפעולות נרשמות בלוג. ההתחברות נשמרת עד יציאה ידנית.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── App Router ────────────────────────────────────────────────────────────────
function AppRouter({ onLogout }: { onLogout: () => void }) {
  return (
    <Switch>
      <Route path="/">
        <Layout active="setup" onLogout={onLogout}><SetupPage /></Layout>
      </Route>
      <Route path="/setup">
        <Layout active="setup" onLogout={onLogout}><SetupPage /></Layout>
      </Route>
      <Route path="/locations">
        <Layout active="locations" onLogout={onLogout}><LocationsPage /></Layout>
      </Route>
      <Route path="/users">
        <Layout active="users" onLogout={onLogout}><UsersPage /></Layout>
      </Route>
      <Route path="/issues">
        <Layout active="issues" onLogout={onLogout}><IssuesPage /></Layout>
      </Route>
      <Route path="/shops">
        <Layout active="shops" onLogout={onLogout}><ShopsAdminPage /></Layout>
      </Route>
      <Route>
        <Layout active="setup" onLogout={onLogout}><SetupPage /></Layout>
      </Route>
    </Switch>
  );
}

// ── Auth Guard ────────────────────────────────────────────────────────────────
function AuthGuard() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  // Wire up the global 401 handler — any rejected API call bounces to login.
  // We redirect to /api/login (NOT /api/logout) so the session is preserved
  // and the OIDC flow can silently re-authenticate without wiping state.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const returnTo = encodeURIComponent(window.location.pathname || "/");
      window.location.href = `/api/login?returnTo=${returnTo}`;
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen onLogin={login} />;
  return <AppRouter onLogout={logout} />;
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

export { LogOut };
