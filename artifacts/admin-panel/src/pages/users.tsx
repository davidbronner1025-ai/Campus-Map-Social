import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Users, Phone, Trash2, UserPlus, Loader2, RefreshCw, Clock, User, Copy, Check, Map, List } from "lucide-react";

interface AppUser {
  id: number;
  phone: string;
  displayName: string | null;
  title: string | null;
  avatarUrl: string | null;
  bannerColor: string;
  visibility: string;
  lat: number | null;
  lng: number | null;
  lastSeen: string | null;
}

const ISRAEL_CENTER: [number, number] = [31.77, 35.21];

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function makeAdminUserIcon(user: AppUser) {
  const isEmoji = user.avatarUrl?.startsWith("emoji:");
  const emoji = isEmoji ? escHtml(user.avatarUrl!.slice(6)) : null;
  const initial = escHtml((user.displayName?.[0] || "?").toUpperCase());
  const bg = escHtml(user.bannerColor || "#1e293b");
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const active = user.lastSeen ? new Date(user.lastSeen).getTime() >= fiveMinAgo : false;
  const border = active ? "#4ade80" : "#64748b";
  const content = emoji
    ? `<span style="font-size:16px;line-height:1;">${emoji}</span>`
    : `<span style="font-size:12px;font-weight:700;color:white;">${initial}</span>`;

  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${bg};border:2.5px solid ${border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      ${content}
    </div>`,
  });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ url, name, color }: { url: string | null; name: string; color: string }) {
  const isEmoji = url?.startsWith("emoji:");
  if (isEmoji) return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: color }}>
      {url!.slice(6)}
    </div>
  );
  if (url) return <img src={url} alt={name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />;
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: color }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ phone: string; otp: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [view, setView] = useState<"list" | "map">("list");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users");
      if (r.ok) setUsers(await r.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Auto-refresh every 30s when on map view
  useEffect(() => {
    if (view !== "map") return;
    const interval = setInterval(fetchUsers, 30_000);
    return () => clearInterval(interval);
  }, [view, fetchUsers]);

  const deleteUser = async (id: number) => {
    if (!confirm("Remove this user from the platform?")) return;
    setDeleting(id);
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (r.ok) setUsers(p => p.filter(u => u.id !== id));
    } finally { setDeleting(null); }
  };

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setInviting(true);
    setError("");
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Failed to invite"); return; }
      setInviteResult({ phone: d.phone, otp: d.otp });
      setPhone("");
      fetchUsers();
    } catch { setError("Network error"); }
    finally { setInviting(false); }
  };

  const copyOtp = () => {
    if (!inviteResult) return;
    navigator.clipboard.writeText(`Campus App — Phone: ${inviteResult.phone}  |  OTP: ${inviteResult.otp}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = users.filter(u =>
    !searchQ || (u.displayName || "").toLowerCase().includes(searchQ.toLowerCase()) ||
    u.phone.includes(searchQ)
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Invite card */}
      <div className="px-4 pt-4 pb-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Invite User</p>
              <p className="text-xs text-muted-foreground">Add a phone number to grant access</p>
            </div>
          </div>
          <form onSubmit={inviteUser} className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+972..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
            </div>
            <button type="submit" disabled={inviting || !phone.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-all active:scale-95">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
            </button>
          </form>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}

          {inviteResult && (
            <div className="mt-3 bg-primary/8 border border-primary/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-primary mb-2">✅ User created — Share this:</p>
              <div className="bg-background rounded-lg p-2.5 font-mono text-xs text-foreground leading-relaxed">
                <p>📱 Phone: <strong>{inviteResult.phone}</strong></p>
                <p>🔑 OTP Code: <strong className="text-primary text-base tracking-widest">{inviteResult.otp}</strong></p>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={copyOtp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium transition-all active:scale-95">
                  {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
                <button onClick={() => setInviteResult(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View toggle tabs */}
      <div className="px-4 pb-3 flex gap-2">
        <button onClick={() => setView("list")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <List className="w-4 h-4" /> User List
        </button>
        <button onClick={() => setView("map")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === "map" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <Map className="w-4 h-4" /> Live Map
        </button>
        <div className="flex-1" />
        <button onClick={fetchUsers} disabled={loading} className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {view === "map" ? (
        <div className="px-4 pb-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden" style={{ height: "calc(100dvh - 280px)" }}>
            <MapContainer center={ISRAEL_CENTER} zoom={14} style={{ width: "100%", height: "100%" }}>
              <TileLayer
                attribution="&copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                attribution=""
              />
              {users.filter(u => u.lat && u.lng).map(u => (
                <Marker key={u.id} position={[u.lat!, u.lng!]} icon={makeAdminUserIcon(u)}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-semibold">{u.displayName || u.phone}</p>
                      {u.title && <p className="text-gray-500">{u.title}</p>}
                      <p className="text-gray-400 mt-1">Last seen: {timeAgo(u.lastSeen)}</p>
                      <p className="text-gray-400">Visibility: {u.visibility || "campus"}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-500" /> Active (last 5 min)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-500 border border-slate-600" /> Inactive
            </span>
            <span className="ml-auto">{users.filter(u => u.lat && u.lng).length} users on map</span>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 pb-3 grid grid-cols-3 gap-3">
            {[
              { label: "Total Users", value: users.length, icon: Users },
              { label: "Active Today", value: users.filter(u => u.lastSeen && Date.now() - new Date(u.lastSeen).getTime() < 86400000).length, icon: Clock },
              { label: "With Profile", value: users.filter(u => u.displayName).length, icon: User },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <s.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* User list */}
          <div className="px-4 pb-6 space-y-2">
            {loading && (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mx-auto" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No users yet</p>
                <p className="text-xs text-muted-foreground mt-1">Invite people using the form above</p>
              </div>
            )}
            {filtered.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-2xl p-3.5 flex items-start gap-3">
                <Avatar url={u.avatarUrl} name={u.displayName || u.phone} color={u.bannerColor} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.displayName || <span className="text-muted-foreground italic">No name set</span>}</p>
                  {u.title && <p className="text-xs text-muted-foreground truncate">{u.title}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />{u.phone}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />{timeAgo(u.lastSeen)}
                    </span>
                    {u.lat && u.lng && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">📍 On campus</span>}
                    {u.visibility === "ghost" && <span className="text-xs bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded-md">👻 Ghost</span>}
                  </div>
                </div>
                <button onClick={() => deleteUser(u.id)} disabled={deleting === u.id}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
                  {deleting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
