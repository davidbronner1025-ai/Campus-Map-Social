import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Map, MapPin, LogOut, Terminal } from "lucide-react";
import { motion } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/setup", label: "Sector Init", icon: Terminal },
    { href: "/locations", label: "Tactical Map", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row dark hud-bg-grid relative">
      <div className="scanlines"></div>
      
      {/* Sidebar HUD */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-primary bg-card/80 flex-shrink-0 flex flex-col z-20 game-hud-border m-4 md:mr-0 md:h-[calc(100vh-2rem)]">
        <div className="p-6 flex items-center gap-4 border-b border-primary/30">
          <div className="w-12 h-12 bg-primary/20 flex items-center justify-center border border-primary shadow-[0_0_10px_rgba(0,255,204,0.5)]">
            <Map className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-primary leading-tight tracking-widest drop-shadow-[0_0_8px_rgba(0,255,204,0.8)]">CAMPUS_CMD</h1>
            <p className="text-xs text-primary/60 font-mono tracking-widest">v2.0 // ADMIN</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-display font-bold tracking-widest uppercase transition-all cursor-pointer relative overflow-hidden group border border-transparent",
                    isActive
                      ? "text-primary-foreground border-primary bg-primary shadow-[0_0_15px_rgba(0,255,204,0.4)]"
                      : "text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/10"
                  )}
                >
                  <item.icon className="w-5 h-5 z-10 relative" />
                  <span className="z-10 relative">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-primary/30">
          <div className="flex items-center gap-3 px-4 py-3 text-sm font-display font-bold tracking-widest text-destructive/80 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/50 cursor-pointer transition-colors uppercase">
            <LogOut className="w-5 h-5" />
            <span>Terminate Session</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden p-4">
        {children}
      </main>
    </div>
  );
}
