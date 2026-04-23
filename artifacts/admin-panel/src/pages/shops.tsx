import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Plus, Trash2, RefreshCw, Pencil, X, Check, ToggleLeft, ToggleRight } from "lucide-react";

type ShopMenuItem = { name: string; price: string; description?: string };
type AdminShop = {
  id: number;
  name: string;
  icon: string;
  description: string | null;
  hours: string | null;
  discount: string | null;
  color: string;
  menuItems: ShopMenuItem[];
  active: boolean;
  sortOrder: number;
};

const BASE = "/api";
const EMOJIS = ["🏪","🍕","☕","🍔","🌮","🥗","🍜","🍣","🥤","🧃","🍰","🍩","📚","💊","🛒","🎮","💈"];
const COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];

const empty = (): Partial<AdminShop> => ({ name: "", icon: "🏪", description: "", hours: "", discount: "", color: "#6366f1", menuItems: [], active: true, sortOrder: 0 });

export default function ShopsPage() {
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AdminShop> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuInput, setMenuInput] = useState({ name: "", price: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/admin/shops`);
      setShops(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(empty()); setEditId(null); };
  const openEdit = (s: AdminShop) => { setEditing({ ...s }); setEditId(s.id); };
  const closeEdit = () => { setEditing(null); setEditId(null); setMenuInput({ name: "", price: "", description: "" }); };

  const handleSave = async () => {
    if (!editing?.name) return;
    setSaving(true);
    try {
      const url = editId ? `${BASE}/admin/shops/${editId}` : `${BASE}/admin/shops`;
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (res.ok) { await load(); closeEdit(); }
    } catch {} finally { setSaving(false); }
  };

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch(`${BASE}/admin/shops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      setShops(prev => prev.map(s => s.id === id ? { ...s, active } : s));
    } catch {}
  };

  const deleteShop = async (id: number) => {
    if (!confirm("Delete this shop?")) return;
    try {
      await fetch(`${BASE}/admin/shops/${id}`, { method: "DELETE" });
      setShops(prev => prev.filter(s => s.id !== id));
    } catch {}
  };

  const addMenuItem = () => {
    if (!menuInput.name) return;
    setEditing(e => ({ ...e, menuItems: [...(e?.menuItems || []), { ...menuInput }] }));
    setMenuInput({ name: "", price: "", description: "" });
  };

  const removeMenuItem = (i: number) => {
    setEditing(e => ({ ...e, menuItems: (e?.menuItems || []).filter((_, j) => j !== i) }));
  };

  if (editing !== null) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <h2 className="text-base font-bold text-foreground flex-1">{editId ? "Edit Shop" : "New Shop"}</h2>
          <button onClick={handleSave} disabled={saving || !editing.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Icon & Name */}
          <div className="flex gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Icon</label>
              <div className="flex flex-wrap gap-1.5 w-36">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEditing(v => ({ ...v, icon: e }))}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center border transition-all ${editing.icon === e ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Preview</label>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: (editing.color || "#6366f1") + "25" }}>
                {editing.icon || "🏪"}
              </div>
            </div>
          </div>
          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Name *</label>
            <input value={editing.name || ""} onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
              placeholder="Shop name" className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
            <input value={editing.description || ""} onChange={e => setEditing(v => ({ ...v, description: e.target.value }))}
              placeholder="Short description" className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          {/* Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Hours</label>
              <input value={editing.hours || ""} onChange={e => setEditing(v => ({ ...v, hours: e.target.value }))}
                placeholder="e.g. 8am–10pm" className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Discount/Deal</label>
              <input value={editing.discount || ""} onChange={e => setEditing(v => ({ ...v, discount: e.target.value }))}
                placeholder="e.g. 10% off" className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>
          {/* Color */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setEditing(v => ({ ...v, color: c }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${editing.color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          {/* Sort Order & Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Sort Order</label>
              <input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing(v => ({ ...v, sortOrder: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Active</label>
              <button onClick={() => setEditing(v => ({ ...v, active: !v?.active }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${editing.active ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-card border-border text-muted-foreground"}`}>
                {editing.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {editing.active ? "Active" : "Hidden"}
              </button>
            </div>
          </div>
          {/* Menu Items */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Menu Items</label>
            {(editing.menuItems || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.price}{item.description ? ` · ${item.description}` : ""}</p>
                </div>
                <button onClick={() => removeMenuItem(i)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={menuInput.name} onChange={e => setMenuInput(v => ({ ...v, name: e.target.value }))}
                placeholder="Item name" className="flex-1 px-2.5 py-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
              <input value={menuInput.price} onChange={e => setMenuInput(v => ({ ...v, price: e.target.value }))}
                placeholder="Price" className="w-16 px-2.5 py-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary" />
              <button onClick={addMenuItem} className="px-2.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex-shrink-0">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Shops & Deals</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> New Shop
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No shops yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {shops.map(shop => (
              <div key={shop.id} className={`bg-card border rounded-xl overflow-hidden ${shop.active ? "border-border" : "border-border/50 opacity-60"}`}>
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: shop.color + "20" }}>
                    {shop.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                      {shop.discount && (
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: shop.color }}>
                          {shop.discount}
                        </span>
                      )}
                    </div>
                    {shop.hours && <p className="text-xs text-muted-foreground">🕐 {shop.hours}</p>}
                    <p className="text-[11px] text-muted-foreground">{(shop.menuItems as any[]).length} menu items</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleActive(shop.id, !shop.active)}
                      className={`p-1.5 rounded-lg border transition-all ${shop.active ? "text-emerald-400 border-emerald-400/25 bg-emerald-400/10" : "text-muted-foreground border-border"}`}>
                      {shop.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(shop)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteShop(shop.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
