import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MapPin, Plus, Users, X, MessageCircle, Search, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getConversations, getChatMessages, sendChatMessage, createConversation,
  getNearbyUsers, markConversationRead,
  type ConversationListItem, type ChatMsg, type NearbyUser,
} from "@/lib/api";
import { useLocationEngine } from "@/hooks/useLocationEngine";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Avatar({ url, name, size = 44, color }: { url: string | null; name: string; size?: number; color?: string }) {
  const isEmoji = url?.startsWith("emoji:");
  const s = { width: size, height: size, flexShrink: 0 } as const;
  if (isEmoji) return (
    <div style={{ ...s, background: color || "#1e293b", borderRadius: size / 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5 }}>
      {url!.slice(6)}
    </div>
  );
  if (url) return <img src={url} alt={name} style={{ ...s, borderRadius: size / 3, objectFit: "cover" }} />;
  return (
    <div style={{ ...s, background: color || "#1e293b", borderRadius: size / 3, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export function ConversationRow({ conv, currentUserId, onClick }: {
  conv: ConversationListItem; currentUserId: number; onClick: () => void;
}) {
  const other = conv.members.find(m => m.userId !== currentUserId);
  const displayName = conv.type === "group"
    ? conv.name || "Group Chat"
    : other?.displayName || "User";
  const avatarUrl = conv.type === "group" ? null : (other?.avatarUrl || null);
  const avatarColor = conv.type === "group" ? "#6366f1" : (other?.bannerColor || "#1e293b");
  const preview = conv.lastMessage
    ? (conv.lastMessage.messageType === "location" ? "📍 Shared location" : conv.lastMessage.content)
    : "No messages yet";
  const ts = conv.lastMessage?.createdAt || conv.createdAt;

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left">
      <div className="relative">
        {conv.type === "group" ? (
          <div style={{ width: 48, height: 48, borderRadius: 16, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users className="w-5 h-5 text-white" />
          </div>
        ) : (
          <Avatar url={avatarUrl} name={displayName} size={48} color={avatarColor} />
        )}
        {conv.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-semibold text-sm truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground"}`}>{displayName}</p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{timeAgo(ts)}</span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{preview}</p>
      </div>
    </button>
  );
}

export function NewChatSheet({ onClose, onCreated, currentUserId }: {
  onClose: () => void; onCreated: (convId: number) => void; currentUserId: number;
}) {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { pos } = useLocationEngine(false);

  useEffect(() => {
    if (!pos) { setLoading(false); return; }
    getNearbyUsers(pos.lat, pos.lng, 5000)
      .then(u => setUsers(u.filter(x => x.id !== currentUserId)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pos, currentUserId]);

  const filtered = search.trim()
    ? users.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()))
    : users;

  const startDirectChat = async (userId: number) => {
    try {
      const conv = await createConversation({ type: "direct", memberIds: [userId] });
      onCreated(conv.id);
    } catch {}
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    try {
      const conv = await createConversation({ type: "group", name: groupName.trim(), memberIds: selectedIds });
      onCreated(conv.id);
    } catch {}
  };

  const toggleSelected = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-foreground">New Chat</h3>
      </div>

      <div className="flex gap-2 px-4 pt-3">
        <button onClick={() => { setMode("direct"); setSelectedIds([]); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === "direct" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
          Direct
        </button>
        <button onClick={() => setMode("group")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${mode === "group" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
          <UserPlus className="w-3 h-3" /> Group
        </button>
      </div>

      {mode === "group" && (
        <div className="px-4 pt-3">
          <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name..."
            className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" />
          {selectedIds.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">{selectedIds.length} selected</p>
          )}
        </div>
      )}

      <div className="px-4 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No nearby users found</p>
          </div>
        )}
        {filtered.map(u => (
          <button key={u.id}
            onClick={() => mode === "direct" ? startDirectChat(u.id) : toggleSelected(u.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left ${mode === "group" && selectedIds.includes(u.id) ? "bg-primary/10" : ""}`}>
            <Avatar url={u.avatarUrl} name={u.displayName} size={40} color={u.bannerColor} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.displayName || "User"}</p>
              {u.title && <p className="text-xs text-muted-foreground truncate">{u.title}</p>}
            </div>
            {mode === "group" && (
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.includes(u.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                {selectedIds.includes(u.id) && <span className="text-primary-foreground text-[10px]">✓</span>}
              </div>
            )}
          </button>
        ))}
      </div>

      {mode === "group" && selectedIds.length > 0 && groupName.trim() && (
        <div className="px-4 py-3 border-t border-border">
          <button onClick={createGroup}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            Create Group ({selectedIds.length} members)
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function ChatDetail({ convId, currentUserId, onBack }: {
  convId: number; currentUserId: number; onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [convInfo, setConvInfo] = useState<ConversationListItem | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { pos } = useLocationEngine(false);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await getChatMessages(convId);
      setMessages(msgs);
    } catch {}
  }, [convId]);

  useEffect(() => {
    fetchMessages();
    markConversationRead(convId).catch(() => {});
    getConversations().then(convs => {
      const c = convs.find(x => x.id === convId);
      if (c) setConvInfo(c);
    }).catch(() => {});
    const interval = setInterval(() => {
      fetchMessages();
      markConversationRead(convId).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [convId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const content = text.trim();
    const optimistic: ChatMsg = {
      id: Date.now(), conversationId: convId, senderId: currentUserId,
      content, messageType: "text", lat: null, lng: null,
      createdAt: new Date().toISOString(),
      senderName: "", senderAvatar: null, senderBannerColor: "#1e293b",
    };
    setMessages(prev => [...prev, optimistic]);
    setText("");
    try {
      const real = await sendChatMessage(convId, { content });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m));
      markConversationRead(convId).catch(() => {});
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally { setSending(false); }
  };

  const shareLocation = async () => {
    if (!pos || sending) return;
    setSending(true);
    try {
      await sendChatMessage(convId, {
        content: `📍 ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
        messageType: "location", lat: pos.lat, lng: pos.lng,
      });
      fetchMessages();
    } catch (err: any) {
      console.error("[chat] shareLocation failed", err);
      alert(err?.message || "שיתוף המיקום נכשל. נסו שוב.");
    } finally { setSending(false); }
  };

  const other = convInfo?.members.find(m => m.userId !== currentUserId);
  const title = convInfo?.type === "group"
    ? (convInfo.name || "Group Chat")
    : (other?.displayName || "Chat");
  const avatarUrl = convInfo?.type === "group" ? null : (other?.avatarUrl || null);
  const avatarColor = convInfo?.type === "group" ? "#6366f1" : (other?.bannerColor || "#1e293b");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {convInfo?.type === "group" ? (
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users className="w-4 h-4 text-white" />
          </div>
        ) : (
          <Avatar url={avatarUrl} name={title} size={36} color={avatarColor} />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{title}</p>
          {convInfo?.type === "group" && (
            <p className="text-[10px] text-muted-foreground">{convInfo.members.length} members</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Send the first message!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.senderId === currentUserId;
          const showAvatar = !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId);
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
              {!isOwn && showAvatar && (
                <div className="mr-2 flex-shrink-0 self-end">
                  <Avatar url={msg.senderAvatar} name={msg.senderName || "?"} size={28} color={msg.senderBannerColor} />
                </div>
              )}
              {!isOwn && !showAvatar && <div className="w-[36px] flex-shrink-0" />}
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                {showAvatar && !isOwn && convInfo?.type === "group" && (
                  <p className="text-[10px] text-muted-foreground px-2 mb-0.5">{msg.senderName}</p>
                )}
                <div className={`px-3.5 py-2 text-sm leading-relaxed ${
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                    : "bg-card border border-border rounded-2xl rounded-bl-md"
                }`}>
                  {msg.messageType === "location" ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-xs">{msg.content}</span>
                    </div>
                  ) : msg.content}
                </div>
                <p className="text-[9px] text-muted-foreground px-2 mt-0.5">{timeAgo(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm flex gap-2">
        {pos && (
          <button onClick={shareLocation} disabled={sending}
            className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </button>
        )}
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..."
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
        <button onClick={send} disabled={!text.trim() || sending}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all active:scale-95 flex-shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ChatsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [convs, setConvs] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const openParam = params.get("open");
  const [activeChat, setActiveChat] = useState<number | null>(openParam ? parseInt(openParam) : null);

  const fetchConvs = useCallback(async () => {
    try {
      const c = await getConversations();
      setConvs(c);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchConvs();
    const interval = setInterval(fetchConvs, 10000);
    return () => clearInterval(interval);
  }, [fetchConvs]);

  const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  if (!user) return null;

  if (activeChat) {
    return (
      <ChatDetail convId={activeChat} currentUserId={user.id}
        onBack={() => { setActiveChat(null); fetchConvs(); }} />
    );
  }

  return (
    <div className="flex flex-col h-full bg-background" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <h1 className="font-bold text-lg text-foreground">Chats</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowNew(true)}
            className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-0">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border animate-pulse">
                <div className="w-11 h-11 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 bg-muted rounded" />
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
                <div className="h-3 w-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}
        {!loading && convs.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground text-sm font-medium">No chats yet</p>
            <p className="text-muted-foreground text-xs mt-1">Start a conversation with nearby people!</p>
            <button onClick={() => setShowNew(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              New Chat
            </button>
          </div>
        )}
        {convs.map(c => (
          <ConversationRow key={c.id} conv={c} currentUserId={user.id}
            onClick={() => setActiveChat(c.id)} />
        ))}
      </div>

      <div className="border-t border-border bg-card/90 backdrop-blur-sm flex">
        <button onClick={() => navigate("/")}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors">
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] font-medium">Map</span>
        </button>
        <button
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-primary transition-colors relative">
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {totalUnread > 0 && (
              <div className="absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                {totalUnread > 99 ? "99+" : totalUnread}
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium">Chats</span>
        </button>
      </div>

      <AnimatePresence>
        {showNew && (
          <NewChatSheet
            onClose={() => setShowNew(false)}
            onCreated={(id) => { setShowNew(false); setActiveChat(id); }}
            currentUserId={user.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
