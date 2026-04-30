import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Settings, MapPin, Users, Map, LogOut, AlertTriangle, ShoppingBag } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  active: "setup" | "locations" | "users" | "issues" | "shops";
  admin?: { displayName: string; phone: string };
  onLogout?: () => void | Promise<void>;
}

const NAV = [
  { key: "setup",     href: "/setup",     label: "Setup",     icon: Settings },
  { key: "locations", href: "/locations", label: "Locations", icon: MapPin },
  { key: "users",     href: "/users",     label: "Users",     icon: Users },
  { key: "issues",    href: "/issues",    label: "Issues",    icon: AlertTriangle },
  { key: "shops",     href: "/shops",     label: "Shops",     icon: ShoppingBag },
];

export function Layout({ children, active, admin, onLogout }: LayoutProps) {
  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      // Fallback for any caller that didn't pass an onLogout handler.
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col bg-background" style={{ minHeight: "100dvh" }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Map className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">Campus Admin</h1>
            <div className="flex items-center gap-2">
              <span className="admin-badge">Admin</span>
              {admin && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={admin.phone}>
                  {admin.displayName}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>

      {/* Bottom tab navigation */}
      <nav className="flex-shrink-0 bg-card border-t border-border grid grid-cols-5" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map(item => {
          const isActive = active === item.key;
          return (
            <Link key={item.key} href={item.href}>
              <div className={cn(
                "relative flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
                {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                <item.icon className={cn("w-5 h-5 transition-all", isActive && "scale-110")} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
