import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import PublicMapPage from "@/pages/map-public";

function Router() {
  const { token, isLoading } = useAuth();
  const [loc] = useLocation();

  // Public map — no auth required
  if (loc === "/map") return <PublicMapPage />;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!token) return <AuthPage />;

  return (
    <Switch>
      <Route path="/profile" component={ProfilePage} />
      <Route component={HomePage} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </AuthProvider>
  );
}

export default App;
