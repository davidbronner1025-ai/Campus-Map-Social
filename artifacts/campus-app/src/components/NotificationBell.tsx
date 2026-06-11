import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCheck, ThumbsUp, MessageCircle, Calendar, MapPin } from "lucide-react";
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  type AppNotification,
} from "@/lib/api";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getNotifIcon(type: AppNotification["type"]) {
  switch (type) {
    case "reaction": return <ThumbsUp className="w-4 h-4 text-yellow-400" />;
    case "reply": return <MessageCircle className="w-4 h-4 text-blue-400" />;
    case "event_join": return <Calendar className="w-4 h-4 text-green-400" />;
    case "nearby_event": return <MapPin className="w-4 h-4 text-purple-400" />;
    case "chat_message": return <MessageCircle className="w-4 h-4 text-indigo-400" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function NotificationBell() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await getNotifications(30);
      setNotifs(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const handleOpen = () => {
    setOpen(true);
    fetchNotifs();
  };

  const handleTap = async (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationRead(notif.id).catch(() => {});
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setOpen(false);

    if (notif.referenceType === "event" && notif.referenceId) {
      navigate(`/?viewEvent=${notif.referenceId}`);
    } else if (notif.referenceType === "conversation" && notif.referenceId) {
      navigate(`/?open=${notif.referenceId}`);
    } else if (notif.referenceType === "message" && notif.referenceId) {
      navigate(`/?viewMessage=${notif.referenceId}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} aria-label="Notifications" className="p-2 rounded-xl hover:bg-secondary transition-colors relative">
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-[320px] max-h-[420px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} aria-label="Mark all read"
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Mark all read">
                      <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {notifs.length === 0 && (
                  <div className="text-center py-10">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                    <p className="text-xs text-muted-foreground">No notifications yet</p>
                  </div>
                )}
                {notifs.map(n => (
                  <button key={n.id} onClick={() => handleTap(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 ${!n.read ? "bg-primary/5" : ""}`}>
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      {getNotifIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${!n.read ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {n.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <div className="mt-2 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
