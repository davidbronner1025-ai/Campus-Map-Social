import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Trash2, RefreshCw, CheckCircle, Clock, Circle } from "lucide-react";
import { adminFetch } from "@/lib/api";

type IssueStatus = "open" | "in_progress" | "resolved";

type AdminIssue = {
  id: number;
  locationId: number | null;
  floor: number | null;
  category: string;
  description: string | null;
  status: IssueStatus;
  isPublic: boolean;
  createdAt: string;
  locationName: string | null;
  reporterName: string | null;
};

const BASE = "/api";

const CATEGORY_EMOJI: Record<string, string> = {
  maintenance: "🔧", cleanliness: "🧹", safety: "⚠️",
  noise: "🔊", lighting: "💡", other: "📝",
};

const STATUS_CONFIG: Record<IssueStatus, { label: string; icon: any; color: string }> = {
  open: { label: "Open", icon: Circle, color: "text-red-400 bg-red-400/10 border-red-400/25" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/25" },
  resolved: { label: "Resolved", icon: CheckCircle, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
};

const STATUS_CYCLE: IssueStatus[] = ["open", "in_progress", "resolved"];

export default function IssuesPage() {
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | IssueStatus>("all");

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      setIssues(await adminFetch<AdminIssue[]>("/admin/issues"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const updateStatus = async (id: number, status: IssueStatus) => {
    try {
      await adminFetch(`/admin/issues/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch {}
  };

  const deleteIssue = async (id: number) => {
    if (!confirm("Delete this report?")) return;
    try {
      await adminFetch(`/admin/issues/${id}`, { method: "DELETE" });
      setIssues(prev => prev.filter(i => i.id !== id));
    } catch {}
  };

  const cycleStatus = (current: IssueStatus): IssueStatus => {
    const idx = STATUS_CYCLE.indexOf(current);
    return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  };

  const filtered = filter === "all" ? issues : issues.filter(i => i.status === filter);
  const counts = {
    open: issues.filter(i => i.status === "open").length,
    in_progress: issues.filter(i => i.status === "in_progress").length,
    resolved: issues.filter(i => i.status === "resolved").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-foreground">Issue Reports</h2>
          </div>
          <button onClick={loadIssues} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto">
          {(["all", "open", "in_progress", "resolved"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
              }`}
            >
              {s === "all"
                ? `All (${issues.length})`
                : s === "open" ? `Open (${counts.open})`
                : s === "in_progress" ? `In Progress (${counts.in_progress})`
                : `Resolved (${counts.resolved})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <CheckCircle className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No issues here</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filtered.map(issue => {
              const sc = STATUS_CONFIG[issue.status];
              const StatusIcon = sc.icon;
              return (
                <div key={issue.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-start gap-3 p-3">
                    <div className="text-xl mt-0.5 flex-shrink-0">
                      {CATEGORY_EMOJI[issue.category] || "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground capitalize">{issue.category}</span>
                        {issue.floor !== null && (
                          <span className="text-[11px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                            Floor {issue.floor === 0 ? "G" : issue.floor > 0 ? `+${issue.floor}` : issue.floor}
                          </span>
                        )}
                        {issue.locationName && (
                          <span className="text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            📍 {issue.locationName}
                          </span>
                        )}
                      </div>
                      {issue.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{issue.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          {issue.reporterName || "Anonymous"} · {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 pb-3">
                    <button
                      onClick={() => updateStatus(issue.id, cycleStatus(issue.status))}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex-1 justify-center ${sc.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {sc.label} → {STATUS_CONFIG[cycleStatus(issue.status)].label}
                    </button>
                    <button
                      onClick={() => deleteIssue(issue.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/25 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
