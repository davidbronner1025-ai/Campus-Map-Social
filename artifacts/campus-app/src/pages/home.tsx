import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus, User, RefreshCw, X, Send, ThumbsUp, ThumbsDown,
  MessageCircle, Trash2, ChevronDown, MapPin, Clock, Smile, Navigation
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocationEngine } from "@/hooks/useLocationEngine";
import {
  getNearbyMessages, pinMessage, deleteMessage, reactToMessage,
  getReplies, postReply, type NearbyMessage, type Reply
} from "@/lib/api";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Israel center fallback
const ISRAEL_CENTER: [number, number] = [31.8, 35.2];
const FALLBACK_ZOOM = 13;

// ── Invitation Config ──────────────────────────────────────────────────────
const INVITE_TYPES = [
  { key: "smoke",     emoji: "🚬", label: "Smoke",      color: "#a78bfa", bgClass: "bg-violet-500/10 border-violet-500/30" },
  { key: "carpool",   emoji: "🚗", label: "Carpool",    color: "#60a5fa", bgClass: "bg-blue-500/10 border-blue-500/30" },
  { key: "phone_game",emoji: "📱", label: "Phone Game", color: "#34d399", bgClass: "bg-emerald-500/10 border-emerald-500/30" },
  { key: "food_order",emoji: "🍕", label: "Food Order", color: "#fb923c", bgClass: "bg-orange-500/10 border-orange-500/30" },
  { key: "football",  emoji: "⚽", label: "Football",   color: "#4ade80", bgClass: "bg-green-500/10 border-green-500/30" },
];

function getInviteConfig(type: string | null) {
  return INVITE_TYPES.find(t => t.key === type) || null;
}

// ── Custom map marker via DivIcon ──────────────────────────────────────────
function makeMarker(emoji: string, color: string, pulse = false) {
  return L.divIcon({
    className: "",
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    html: `
      <div style="position:relative;width:40px;height:50px;">
        ${pulse ? `<div style="position:absolute;top:2px;left:2px;width:36px;height:36px;border-radius:50%;background:${color};opacity:0.3;animation:ping-slow 2s ease-in-out infinite;"></div>` : ""}
        <div style="width:40px;height:40px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:${color};border:2.5px solid rgba(255,255,255,0.85);box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:16px;line-height:1;">${emoji}</span>
        </div>
      </div>`,
  });
}

// ── Map center updater ─────────────────────────────────────────────────────
function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const didFly = useRef(false);
  useEffect(() => {
    if (!didFly.current) { map.flyTo(center, zoom, { duration: 1.4 }); didFly.current = true; }
  }, [center, zoom, map]);
  return null;
}

// ── Time formatter ─────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 36, color }: { url: string | null; name: string; size?: number; color?: string }) {
  const isEmoji = url?.startsWith("emoji:");
  const style = { width: size, height: size, flexShrink: 0 };
  if (isEmoji) {
    return (
      <div style={{ ...style, background: color || "#1e293b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55 }}>
        {url!.slice(6)}
      </div>
    );
  }
  if (url) {
    return <img src={url} alt={name} style={{ ...style, borderRadius: 8, objectFit: "cover" }} />;
  }
  return (
    <div style={{ ...style, background: color || "#1e293b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.4 }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ── Message Card ───────────────────────────────────────────────────────────
function MessageCard({
  msg, currentUserId, onDelete, onReact, onOpenReplies
}: {
  msg: NearbyMessage; currentUserId: number;
  onDelete: (id: number) => void;
  onReact: (id: number, type: "yes" | "no") => void;
  onOpenReplies: (msg: NearbyMessage) => void;
}) {
  const invite = getInviteConfig(msg.invitationType);
  const isOwn = msg.userId === currentUserId;
  const yesCount = msg.reactions.filter(r => r.type === "yes").length;
  const noCount = msg.reactions.filter(r => r.type === "no").length;
  const myReaction = msg.reactions.find(r => r.userId === currentUserId);

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${invite ? `border-l-2` : ""}`}
      style={invite ? { borderLeftColor: invite.color } : {}}>

      {/* Invitation header */}
      {invite && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="text-lg">{invite.emoji}</span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: invite.color }}>
            {invite.label} Invitation
          </span>
          {msg.maxParticipants && (
            <span className="ml-auto text-xs text-muted-foreground">{yesCount}/{msg.maxParticipants}</span>
          )}
        </div>
      )}

      {/* Author row */}
      <div className="px-4 pt-3 flex items-start gap-3">
        <Avatar url={msg.author?.avatarUrl || null} name={msg.author?.displayName || "?"} color={msg.author?.bannerColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{msg.author?.displayName || "Unknown"}</span>
            {msg.author?.title && <span className="text-xs text-muted-foreground">· {msg.author.title}</span>}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5" />{timeAgo(msg.createdAt)}
          </span>
        </div>
        {isOwn && (
          <button onClick={() => onDelete(msg.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {msg.type === "invitation" ? (
          <>
            <button onClick={() => onReact(msg.id, "yes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${myReaction?.type === "yes" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/20"}`}>
              <ThumbsUp className="w-3.5 h-3.5" /> Yes {yesCount > 0 && yesCount}
            </button>
            <button onClick={() => onReact(msg.id, "no")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${myReaction?.type === "no" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground hover:bg-destructive/20"}`}>
              <ThumbsDown className="w-3.5 h-3.5" /> No {noCount > 0 && noCount}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => onReact(msg.id, "yes")}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all ${myReaction?.type === "yes" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"}`}>
              👍 {yesCount || ""}
            </button>
            <button onClick={() => onReact(msg.id, "no")}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all ${myReaction?.type === "no" ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"}`}>
              👎 {noCount || ""}
            </button>
          </div>
        )}
        <button onClick={() => onOpenReplies(msg)} className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/10">
          <MessageCircle className="w-3.5 h-3.5" />
          {msg.replyCount > 0 ? msg.replyCount : "Reply"}
        </button>
      </div>
    </div>
  );
}

// ── Replies Sheet ──────────────────────────────────────────────────────────
function RepliesSheet({ msg, currentUserId, onClose }: { msg: NearbyMessage; currentUserId: number; onClose: () => void }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getReplies(msg.id).then(setReplies).catch(() => {});
  }, [msg.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await postReply(msg.id, text.trim());
      setReplies(p => [...p, r]);
      setText("");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div>
          <p className="text-sm font-semibold">Replies</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{msg.content}</p>
        </div>
      </div>

      {/* Replies list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {replies.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No replies yet. Be the first!</p>
          </div>
        )}
        {replies.map(r => (
          <div key={r.id} className={`flex gap-3 ${r.userId === currentUserId ? "flex-row-reverse" : ""}`}>
            <Avatar url={r.author?.avatarUrl || null} name={r.author?.displayName || "?"} size={32} />
            <div className={`max-w-[75%] ${r.userId === currentUserId ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
              <p className="text-xs text-muted-foreground px-1">{r.author?.displayName}</p>
              <div className={`px-3 py-2 rounded-2xl text-sm ${r.userId === currentUserId ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}>
                {r.content}
              </div>
              <p className="text-[10px] text-muted-foreground px-1">{timeAgo(r.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a reply..."
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
        <button onClick={send} disabled={!text.trim() || sending}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 transition-all active:scale-95">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Compose Sheet ──────────────────────────────────────────────────────────
const EMOJI_QUICK = ["😊","😂","❤️","🔥","👍","🙏","😍","🤔","😎","🎉","💯","⚽","🍕","🎮","☕","🚗"];

function ComposeSheet({ onClose, onPosted, userLat, userLng }: {
  onClose: () => void; onPosted: () => void; userLat: number; userLng: number;
}) {
  const [msgType, setMsgType] = useState<"regular" | "invitation">("regular");
  const [inviteType, setInviteType] = useState<string>("");
  const [content, setContent] = useState("");
  const [maxPart, setMaxPart] = useState(10);
  const [expiryMins, setExpiryMins] = useState(120);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const addEmoji = (e: string) => {
    setContent(p => p + e);
    textRef.current?.focus();
  };

  const canSend = content.trim().length > 0 && (msgType === "regular" || inviteType);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await pinMessage({
        lat: userLat, lng: userLng, content: content.trim(),
        type: msgType,
        ...(msgType === "invitation" && { invitationType: inviteType, maxParticipants: maxPart }),
        expiresInMinutes: expiryMins,
      });
      onPosted();
      onClose();
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      <div className="px-5 pb-safe space-y-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-base">Pin a Message</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Message type toggle */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button onClick={() => setMsgType("regular")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${msgType === "regular" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}>
            💬 Message
          </button>
          <button onClick={() => { setMsgType("invitation"); if (!inviteType) setInviteType("smoke"); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${msgType === "invitation" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}>
            🎯 Invitation
          </button>
        </div>

        {/* Invitation type picker */}
        {msgType === "invitation" && (
          <div className="grid grid-cols-5 gap-2">
            {INVITE_TYPES.map(t => (
              <button key={t.key} onClick={() => setInviteType(t.key)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${inviteType === t.key ? "scale-105" : "opacity-60 hover:opacity-80"}`}
                style={inviteType === t.key ? { borderColor: t.color, background: t.color + "20", color: t.color } : { borderColor: "transparent", background: "hsl(var(--secondary))" }}>
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[10px]">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Invitation settings */}
        {msgType === "invitation" && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Max people</label>
              <input type="number" min={2} max={50} value={maxPart} onChange={e => setMaxPart(+e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Expires in (min)</label>
              <select value={expiryMins} onChange={e => setExpiryMins(+e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary">
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>
          </div>
        )}

        {/* Text input */}
        <div className="relative">
          <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
            placeholder={msgType === "invitation"
              ? "Add details to your invitation..."
              : "What's on your mind? Pin it for nearby people..."}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
        </div>

        {/* Emoji quick access */}
        <div>
          <div className="flex gap-1.5 flex-wrap">
            {EMOJI_QUICK.map(e => (
              <button key={e} onClick={() => addEmoji(e)}
                className="text-lg w-9 h-9 rounded-lg hover:bg-secondary active:scale-90 transition-all flex items-center justify-center">
                {e}
              </button>
            ))}
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="w-9 h-9 rounded-lg hover:bg-secondary transition-all flex items-center justify-center text-muted-foreground">
              <Smile className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Send button */}
        <button onClick={send} disabled={!canSend || sending}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {sending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <><MapPin className="w-4 h-4" /> Pin Message</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { pos, error: locError, requestPermission } = useLocationEngine(true);

  const [messages, setMessages] = useState<NearbyMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState(false);
  const [replyTarget, setReplyTarget] = useState<NearbyMessage | null>(null);
  const [feedOpen, setFeedOpen] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const mapCenter: [number, number] = pos ? [pos.lat, pos.lng] : ISRAEL_CENTER;
  const mapZoom = pos ? 17 : FALLBACK_ZOOM;

  const fetchMessages = useCallback(async () => {
    if (!pos) return;
    setLoading(true);
    try {
      const msgs = await getNearbyMessages(pos.lat, pos.lng, 300);
      setMessages(msgs);
      setLastRefresh(new Date());
    } catch {} finally { setLoading(false); }
  }, [pos]);

  // Initial fetch + periodic refresh every 30s
  useEffect(() => {
    if (!pos) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 30_000);
    return () => clearInterval(interval);
  }, [pos, fetchMessages]);

  const handleDelete = async (id: number) => {
    await deleteMessage(id);
    setMessages(p => p.filter(m => m.id !== id));
  };

  const handleReact = async (id: number, type: "yes" | "no") => {
    await reactToMessage(id, type);
    fetchMessages();
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-dvh overflow-hidden relative">
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border z-20">
        <div className="flex items-center gap-3">
          <Avatar url={user.avatarUrl} name={user.displayName || "?"} color={user.bannerColor} size={34} />
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{user.displayName || "Set your name"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {pos ? `${messages.length} messages nearby` : locError ? "Location unavailable" : "Locating..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchMessages} className="p-2 rounded-xl hover:bg-secondary transition-colors" disabled={loading}>
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => navigate("/profile")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <User className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── MAP ── */}
      <div className="relative" style={{ height: feedOpen ? "40%" : "calc(100% - 56px)" }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ width: "100%", height: "100%" }}>
          <TileLayer
            attribution="&copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            attribution=""
          />
          {pos && <MapCenterUpdater center={[pos.lat, pos.lng]} zoom={17} />}

          {/* User position marker */}
          {pos && (
            <Marker position={[pos.lat, pos.lng]}
              icon={makeMarker("📍", "#3b82f6", true)} />
          )}

          {/* Message markers */}
          {messages.map(msg => {
            const inv = getInviteConfig(msg.invitationType);
            const emoji = inv ? inv.emoji : (msg.author?.avatarUrl?.startsWith("emoji:") ? msg.author.avatarUrl.slice(6) : "💬");
            const color = inv ? inv.color : "#64748b";
            return (
              <Marker key={msg.id} position={[msg.lat, msg.lng]} icon={makeMarker(emoji, color)} />
            );
          })}
        </MapContainer>

        {/* Location permission notice */}
        {!pos && !locError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
            <div className="bg-card border border-border rounded-2xl p-5 text-center max-w-xs mx-4 shadow-xl">
              <Navigation className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">Enable Location</p>
              <p className="text-xs text-muted-foreground mb-4">See messages pinned by people around you</p>
              <button onClick={requestPermission} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
                Share Location
              </button>
            </div>
          </div>
        )}

        {/* Expand/collapse toggle */}
        <button onClick={() => setFeedOpen(p => !p)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-card/90 backdrop-blur-sm border border-border px-4 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors shadow-lg">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${feedOpen ? "" : "rotate-180"}`} />
          {feedOpen ? "Expand map" : "Show feed"}
        </button>
      </div>

      {/* ── FEED ── */}
      {feedOpen && (
        <div className="flex-1 overflow-y-auto">
          {/* Feed header */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm px-4 py-2.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Nearby Messages {messages.length > 0 && <span className="text-muted-foreground font-normal">({messages.length})</span>}
            </h2>
            {lastRefresh && (
              <span className="text-xs text-muted-foreground">Updated {timeAgo(lastRefresh.toISOString())}</span>
            )}
          </div>

          <div className="px-4 py-3 space-y-3 pb-24">
            {messages.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📍</div>
                <p className="text-muted-foreground text-sm font-medium">No messages nearby</p>
                <p className="text-muted-foreground text-xs mt-1">Be the first to pin a message!</p>
              </div>
            )}
            {messages.map(msg => (
              <MessageCard key={msg.id} msg={msg} currentUserId={user.id}
                onDelete={handleDelete}
                onReact={handleReact}
                onOpenReplies={setReplyTarget}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── FAB: Compose ── */}
      {!compose && !replyTarget && pos && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
          onClick={() => setCompose(true)}
          className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
          <MessageSquarePlus className="w-6 h-6" />
        </motion.button>
      )}

      {/* ── Compose Sheet ── */}
      <AnimatePresence>
        {compose && pos && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setCompose(false)} />
            <ComposeSheet onClose={() => setCompose(false)} onPosted={fetchMessages} userLat={pos.lat} userLng={pos.lng} />
          </>
        )}
      </AnimatePresence>

      {/* ── Replies Sheet ── */}
      <AnimatePresence>
        {replyTarget && (
          <RepliesSheet msg={replyTarget} currentUserId={user.id} onClose={() => setReplyTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
