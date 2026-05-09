import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Camera,
  Save,
  Loader2,
  LogOut,
  Pencil,
  Eye,
  EyeOff,
  MessageSquare,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { updateMe, getMyStats, type UserStats } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const BANNER_COLORS = [
  "#0f172a",
  "#1e293b",
  "#1a2233",
  "#172033",
  "#0c2340",
  "#1a1a2e",
  "#16213e",
  "#0a1628",
  "#1c1c2e",
  "#200a0a",
  "#0d2e1a",
  "#1a0d2e",
];

const AVATAR_EMOJIS = [
  "😀",
  "😎",
  "🤓",
  "🧑‍💻",
  "👩‍💻",
  "🧑‍🎓",
  "👨‍🎓",
  "🦸",
  "🧙",
  "🦊",
  "🐺",
  "🦁",
  "🐯",
  "🦄",
  "🐸",
  "🦋",
  "🌊",
  "🔥",
  "⚡",
  "🌈",
  "🎯",
  "🚀",
  "💫",
  "🎓",
];

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, refreshUser, logout } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [title, setTitle] = useState(user?.title || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [bannerColor, setBannerColor] = useState(
    user?.bannerColor || "#1a2233",
  );
  const [visibility, setVisibility] = useState<"campus" | "ghost">(
    user?.visibility || "campus",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    getMyStats()
      .then(setStats)
      .catch((err) => {
        console.warn("[profile] failed to load stats", err);
      });
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateMe({
        displayName,
        title: title || null,
        avatarUrl: avatarUrl || null,
        bannerColor,
        visibility,
      });
      await refreshUser();
      navigate("/");
    } catch (err: any) {
      console.error("[profile] save failed", err);
      setSaveError(err?.message || "שמירת הפרופיל נכשלה. נסו שוב.");
    } finally {
      setSaving(false);
    }
  };

  const selectEmoji = (emoji: string) => {
    setAvatarUrl(`emoji:${emoji}`);
    setEmojiPickerOpen(false);
  };

  const displayAvatar = avatarUrl?.startsWith("emoji:")
    ? avatarUrl.slice(6)
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Banner */}
      <div
        className="relative h-40 flex-shrink-0"
        style={{ background: bannerColor }}
      >
        <button
          onClick={() => navigate("/")}
          aria-label="Go back"
          className="absolute top-4 left-4 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="absolute -bottom-10 left-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-4 border-background bg-card flex items-center justify-center overflow-hidden shadow-xl">
              {displayAvatar ? (
                <span className="text-4xl">{displayAvatar}</span>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">😀</span>
              )}
            </div>
            <button
              onClick={() => setEmojiPickerOpen(true)}
              aria-label="Edit avatar"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-14 pb-8 space-y-5">
        {/* Display name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Display Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Title / Status
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Computer Science • 3rd year"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Avatar URL or emoji */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Avatar URL (or pick emoji ↑)
          </label>
          <input
            value={avatarUrl?.startsWith("emoji:") ? "" : avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Banner color */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Banner Color
          </label>
          <div className="flex gap-2.5 flex-wrap">
            {BANNER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setBannerColor(c)}
                aria-label={`Select banner color ${c}`}
                className={`w-9 h-9 rounded-xl border-2 transition-all ${bannerColor === c ? "border-primary scale-110" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {/* Ghost Mode Toggle */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Map Visibility
          </label>
          <button
            onClick={() =>
              setVisibility((v) => (v === "campus" ? "ghost" : "campus"))
            }
            className={`w-full px-4 py-3.5 rounded-xl border flex items-center gap-3 transition-all ${
              visibility === "ghost"
                ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
                : "bg-card border-border text-foreground"
            }`}
          >
            {visibility === "ghost" ? (
              <EyeOff className="w-5 h-5 text-violet-400" />
            ) : (
              <Eye className="w-5 h-5 text-emerald-400" />
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">
                {visibility === "ghost" ? "Ghost Mode" : "Visible on Map"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {visibility === "ghost"
                  ? "You're invisible — others can't see you on the map"
                  : "Other students can see your location on the map"}
              </p>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                visibility === "ghost" ? "bg-violet-500" : "bg-emerald-500"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  visibility === "ghost" ? "left-[18px]" : "left-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Activity Stats */}
        {stats && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Campus Activity
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <MessageSquare className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">
                  {stats.messagesPosted}
                </p>
                <p className="text-[10px] text-muted-foreground">Messages</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <CalendarCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">
                  {stats.eventsJoined}
                </p>
                <p className="text-[10px] text-muted-foreground">Events</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <AlertTriangle className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">
                  {stats.issuesReported}
                </p>
                <p className="text-[10px] text-muted-foreground">Reports</p>
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Profile
            </>
          )}
        </button>
        {saveError && (
          <p
            role="alert"
            className="text-xs text-red-400 text-center -mt-2"
            dir="rtl"
          >
            {saveError}
          </p>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-card border border-border text-muted-foreground text-sm flex items-center justify-center gap-2 hover:text-destructive hover:border-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>

        <p className="text-xs text-muted-foreground text-center">
          {user?.phone}
        </p>
      </div>

      {/* Emoji picker overlay */}
      {emojiPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => setEmojiPickerOpen(false)}
        >
          <div
            className="w-full bg-card rounded-t-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Choose Avatar
            </h3>
            <div className="grid grid-cols-8 gap-3">
              {AVATAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => selectEmoji(e)}
                  aria-label={`Select emoji ${e}`}
                  className="text-3xl h-12 w-12 rounded-xl hover:bg-secondary active:scale-90 transition-all flex items-center justify-center"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
