import { useState, useEffect, useCallback } from "react";
import { Users, Phone, Trash2, UserPlus, Loader2, RefreshCw, Clock, User, Copy, Check } from "lucide-react";

interface AppUser {
  id: number;
  phone: string;
  displayName: string | null;
  title: string | null;
  avatarUrl: string | null;
  bannerColor: string;
  lat: number | null;
  lng: number | null;
  lastSeen: string | null;
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users");
      if (r.ok) setUsers(await r.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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

      {/* Search + count */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
        </div>
        <button onClick={fetchUsers} disabled={loading} className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
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
              </div>
            </div>
            <button onClick={() => deleteUser(u.id)} disabled={deleting === u.id}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
              {deleting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
