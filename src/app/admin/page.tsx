"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Upload, RefreshCw, Check, AlertCircle, Lock, Eye, EyeOff,
  Github, Trash2, Download, Star, ExternalLink,
  LayoutDashboard, Calendar, Linkedin, FileText, MessageSquareDot,
  Sparkles, Search, X, Quote, Filter, CheckSquare, Square,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Compute HMAC-SHA256 of `message` keyed with `secret`.
 * Returns a base64-encoded signature.
 * The raw admin password is NEVER sent over the wire — only this derived signature.
 */
async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  // base64-encode so it survives query-string encoding
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

type Section = "overview" | "github" | "calendar" | "linkedin" | "files" | "testimonials";
type Status = { type: "idle" | "loading" | "success" | "error"; message?: string };

interface GithubRepo {
  name: string; full_name: string; description: string; language: string;
  stars: number; topics: string[]; url: string; updated_at: string | null;
  indexed: boolean; last_indexed: string | null;
}

interface Testimonial {
  id: string; name: string; role: string | null; company: string | null;
  message: string; tags: string[]; user_id: string | null;
  is_guest: boolean; created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  if (status.type === "idle") return null;
  const base = "text-xs mt-1 flex items-center gap-1";
  if (status.type === "loading") return <p className={cn(base, "text-orange-400")}><RefreshCw size={11} className="animate-spin" /> Processing…</p>;
  if (status.type === "success") return <p className={cn(base, "text-emerald-600")}><Check size={12} /> {status.message}</p>;
  return <p className={cn(base, "text-red-500")}><AlertCircle size={12} /> {status.message}</p>;
}

// ── Shared field style ────────────────────────────────────────────
const fieldCls = "w-full bg-white border border-[#e0d8d0] rounded-xl px-3 py-2.5 text-sm text-[#1a1209] placeholder:text-[#b8a898] focus:outline-none focus:border-[#e85c2a] focus:ring-2 focus:ring-[#e85c2a]/10 transition-all";

// ── Section: Overview ─────────────────────────────────────────────
function OverviewSection({ adminPassword }: { adminPassword: string }) {
  const [tCount, setTCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/testimonials/`)
      .then(r => r.json())
      .then((d: Testimonial[]) => setTCount(d.length))
      .catch(() => {});
  }, []);

  const stats = [
    { label: "Testimonials", value: tCount !== null ? tCount : "—", icon: MessageSquareDot, color: "#e85c2a" },
    { label: "Admin access", value: "Active", icon: Check, color: "#16a34a" },
  ];

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1209" }}>Dashboard Overview</h2>
      <p className="text-sm mb-8" style={{ color: "#9e8876" }}>Manage data sources and testimonials from here.</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: "#ffffff", border: "1px solid #ede8e2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${s.color}18` }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "#1a1209" }}>{s.value}</p>
              <p className="text-xs" style={{ color: "#9e8876" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={{ background: "#fff5f0", border: "1px solid rgba(232,92,42,0.2)" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "#e85c2a" }}>Quick tips</p>
        <ul className="text-xs space-y-1.5" style={{ color: "#6b5c4e" }}>
          <li>→ Use <strong>GitHub Repos</strong> to index your code into the RAG vector store</li>
          <li>→ Upload your LinkedIn CSV or custom files to enrich the knowledge base</li>
          <li>→ Go to <strong>Testimonials</strong> to review and bulk-delete posted reviews</li>
        </ul>
      </div>
    </div>
  );
}

// ── Section: GitHub ───────────────────────────────────────────────
function GitHubSection() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ingestStatus, setIngestStatus] = useState<Status>({ type: "idle" });
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<Status>({ type: "idle" });
  const [deleteStatus, setDeleteStatus] = useState<Record<string, Status>>({});
  const [filter, setFilter] = useState<"all" | "indexed" | "not_indexed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/github");
      if (!res.ok) throw new Error("Failed");
      setRepos(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = repos.filter(r =>
    filter === "all" ? true : filter === "indexed" ? r.indexed : !r.indexed
  );
  const indexedCount = repos.filter(r => r.indexed).length;

  // Selected repos split by indexed status (for contextual action buttons)
  const selectedIndexed = repos.filter(r => selected.has(r.name) && r.indexed).map(r => r.name);
  const selectedUnindexed = repos.filter(r => selected.has(r.name) && !r.indexed).map(r => r.name);

  function toggle(name: string) {
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }
  function toggleAll() {
    const vis = filtered.map(r => r.name);
    const allOn = vis.every(n => selected.has(n));
    setSelected(prev => { const n = new Set(prev); vis.forEach(name => allOn ? n.delete(name) : n.add(name)); return n; });
  }

  async function ingestSelected() {
    if (!selectedUnindexed.length) return;
    setIngestStatus({ type: "loading" });
    try {
      const res = await fetch("/api/admin/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo_names: selectedUnindexed }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed");
      setIngestStatus({ type: "success", message: `+${d.chunks_added} chunks across ${selectedUnindexed.length} repo(s)` });
      setSelected(new Set());
      await load();
    } catch (e: unknown) { setIngestStatus({ type: "error", message: e instanceof Error ? e.message : "Failed" }); }
  }

  async function bulkDeleteSelected() {
    if (!selectedIndexed.length) return;
    setBulkDeleteStatus({ type: "loading" });
    try {
      const res = await fetch("/api/admin/github", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_names: selectedIndexed }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed");
      setBulkDeleteStatus({ type: "success", message: `${d.chunks_deleted} chunks removed from ${selectedIndexed.length} repo(s)` });
      setSelected(new Set());
      await load();
    } catch (e: unknown) { setBulkDeleteStatus({ type: "error", message: e instanceof Error ? e.message : "Failed" }); }
  }

  async function deleteRepo(name: string) {
    setDeleteStatus(s => ({ ...s, [name]: { type: "loading" } }));
    try {
      const res = await fetch(`/api/admin/github/${encodeURIComponent(name)}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed");
      setDeleteStatus(s => ({ ...s, [name]: { type: "success", message: `${d.chunks_deleted} chunks removed` } }));
      await load();
    } catch (e: unknown) { setDeleteStatus(s => ({ ...s, [name]: { type: "error", message: e instanceof Error ? e.message : "Failed" } })); }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#1a1209" }}>GitHub Repositories</h2>
          <p className="text-sm mt-0.5" style={{ color: "#9e8876" }}>
            {loading ? "Loading…" : `${repos.length} repos · ${indexedCount} indexed`}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #ede8e2" }}>
        {/* Filter + action bar */}
        <div className="flex items-center justify-between px-5 py-3 gap-3 flex-wrap"
          style={{ background: "#f8f5f1", borderBottom: "1px solid #ede8e2" }}>
          <div className="flex items-center gap-1">
            {(["all", "indexed", "not_indexed"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filter === f ? "text-white" : "text-[#6b5c4e] hover:bg-orange-50")}
                style={filter === f ? { background: "linear-gradient(135deg,#e85c2a,#f07a50)" } : {}}>
                {f === "all" ? "All" : f === "indexed" ? "Indexed" : "Not indexed"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedUnindexed.length > 0 && (
              <button onClick={ingestSelected} disabled={ingestStatus.type === "loading"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
                <Download size={12} /> Index {selectedUnindexed.length}
              </button>
            )}
            {selectedIndexed.length > 0 && (
              <button onClick={bulkDeleteSelected} disabled={bulkDeleteStatus.type === "loading"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
                {bulkDeleteStatus.type === "loading"
                  ? <RefreshCw size={12} className="animate-spin" />
                  : <Trash2 size={12} />}
                Remove {selectedIndexed.length} indexed
              </button>
            )}
            <button onClick={toggleAll} className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: "#e85c2a", border: "1px solid rgba(232,92,42,0.3)" }}>
              {filtered.every(r => selected.has(r.name)) ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>

        {(ingestStatus.type !== "idle" || bulkDeleteStatus.type !== "idle") && (
          <div className="px-5 py-2 border-b flex flex-col gap-0.5" style={{ borderColor: "#ede8e2" }}>
            <StatusBadge status={ingestStatus} />
            <StatusBadge status={bulkDeleteStatus} />
          </div>
        )}

        {/* Repo list */}
        <div className="divide-y divide-[#f0ebe5] max-h-[520px] overflow-y-auto bg-white">
          {loading && repos.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e85c2a", borderTopColor: "transparent" }} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-sm py-12" style={{ color: "#9e8876" }}>No repos found</p>
          )}

          {filtered.map(repo => {
            const isSel = selected.has(repo.name);
            const delSt = deleteStatus[repo.name] ?? { type: "idle" };
            return (
              <div key={repo.name}
                className={cn("flex items-start gap-3 px-5 py-4 transition-colors", isSel ? "bg-orange-50/60" : "hover:bg-[#faf7f4]")}>
                <input type="checkbox" checked={isSel} onChange={() => toggle(repo.name)}
                  className="mt-1 shrink-0 cursor-pointer accent-[#e85c2a]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={repo.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: "#1a1209" }}>
                      {repo.name} <ExternalLink size={11} style={{ color: "#9e8876" }} />
                    </a>
                    {repo.language && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0ebe5", color: "#6b5c4e" }}>{repo.language}</span>}
                    {repo.indexed
                      ? <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#dcfce7", color: "#16a34a" }}><Check size={9} /> Indexed</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0ebe5", color: "#9e8876" }}>Not indexed</span>}
                    <span className="text-xs flex items-center gap-0.5" style={{ color: "#9e8876" }}><Star size={10} /> {repo.stars}</span>
                  </div>
                  {repo.description && <p className="text-xs mt-0.5 truncate" style={{ color: "#6b5c4e" }}>{repo.description}</p>}
                  {repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {repo.topics.slice(0, 5).map(t => (
                        <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#fff2ec", color: "#c04a18" }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {repo.last_indexed && <p className="text-xs mt-1" style={{ color: "#b8a898" }}>Last indexed: {new Date(repo.last_indexed).toLocaleDateString()}</p>}
                  <StatusBadge status={delSt} />
                </div>
                {repo.indexed && (
                  <button onClick={() => deleteRepo(repo.name)} disabled={delSt.type === "loading"}
                    className="shrink-0 p-1.5 rounded-lg transition-all hover:bg-red-50 disabled:opacity-30"
                    style={{ color: "#dc2626" }} title="Remove from index">
                    {delSt.type === "loading" ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Section: Calendar ─────────────────────────────────────────────
function CalendarSection() {
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function sync() {
    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/ingest/calendar", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed");
      setStatus({ type: "success", message: `+${d.chunks_added} chunks indexed` });
    } catch (e: unknown) { setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed" }); }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1209" }}>Google Calendar</h2>
      <p className="text-sm mb-8" style={{ color: "#9e8876" }}>Re-sync past events and availability summary into the knowledge base.</p>
      <div className="rounded-2xl p-6 flex items-center justify-between gap-4"
        style={{ background: "#ffffff", border: "1px solid #ede8e2" }}>
        <div>
          <p className="font-medium" style={{ color: "#1a1209" }}>Sync Calendar Events</p>
          <p className="text-sm mt-0.5" style={{ color: "#9e8876" }}>Pull recent events from your primary Google Calendar</p>
          <StatusBadge status={status} />
        </div>
        <button onClick={sync} disabled={status.type === "loading"}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
          <RefreshCw size={14} className={status.type === "loading" ? "animate-spin" : ""} />
          Sync
        </button>
      </div>
    </div>
  );
}

// ── Section: LinkedIn ─────────────────────────────────────────────
function LinkedInSection() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function upload() {
    if (!file) return;
    setStatus({ type: "loading" });
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/ingest/linkedin", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed");
      setStatus({ type: "success", message: `+${d.chunks_added} chunks indexed` });
      setFile(null);
    } catch (e: unknown) { setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed" }); }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1209" }}>LinkedIn</h2>
      <p className="text-sm mb-2" style={{ color: "#9e8876" }}>Upload your LinkedIn data export as individual CSVs.</p>
      <p className="text-xs mb-8 rounded-lg px-3 py-2" style={{ color: "#6b5c4e", background: "#fff5f0", border: "1px solid rgba(232,92,42,0.15)" }}>
        LinkedIn → Settings &amp; Privacy → Data privacy → Get a copy of your data → Request archive
      </p>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #ede8e2" }}>
        <label className="block text-xs font-semibold mb-2" style={{ color: "#6b5c4e" }}>Select CSV file</label>
        <input type="file" accept=".csv"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="text-sm mb-4 block file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:cursor-pointer"
          style={{ color: "#6b5c4e" }} />
        <StatusBadge status={status} />
        <button onClick={upload} disabled={!file || status.type === "loading"}
          className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
          <Upload size={14} /> Upload & Index
        </button>
      </div>
    </div>
  );
}

// ── Section: Custom Files ─────────────────────────────────────────
function FilesSection() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function upload() {
    if (!file) return;
    setStatus({ type: "loading" });
    const fd = new FormData(); fd.append("file", file);
    if (title.trim()) fd.append("source_title", title.trim());
    try {
      const res = await fetch("/api/ingest/file", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed");
      setStatus({ type: "success", message: `+${d.chunks_added} chunks indexed` });
      setFile(null); setTitle("");
    } catch (e: unknown) { setStatus({ type: "error", message: e instanceof Error ? e.message : "Failed" }); }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1209" }}>Custom Files</h2>
      <p className="text-sm mb-8" style={{ color: "#9e8876" }}>Upload any PDF, DOCX, MD, or TXT — resume, blog posts, project docs.</p>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid #ede8e2" }}>
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b5c4e" }}>Source title <span style={{ color: "#b8a898" }}>(optional)</span></label>
        <input className={cn(fieldCls, "mb-4")} placeholder={file?.name.replace(/\.[^.]+$/, "") || "e.g. Resume · Q1 2025"}
          value={title} onChange={e => setTitle(e.target.value)} />
        <label className="block text-xs font-semibold mb-2" style={{ color: "#6b5c4e" }}>Select file (.pdf .docx .md .txt)</label>
        <input type="file" accept=".pdf,.docx,.md,.txt,.markdown"
          onChange={e => { setFile(e.target.files?.[0] || null); setTitle(""); }}
          className="text-sm mb-4 block file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:cursor-pointer"
          style={{ color: "#6b5c4e" }} />
        <StatusBadge status={status} />
        <button onClick={upload} disabled={!file || status.type === "loading"}
          className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
          <Upload size={14} /> Upload & Index
        </button>
      </div>
    </div>
  );
}

// ── Section: Testimonials Manager ────────────────────────────────
function TestimonialsSection({ adminPassword }: { adminPassword: string }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<Status>({ type: "idle" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "guests" | "signed_in">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/testimonials/`);
      const data = await res.json();
      setTestimonials(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = testimonials.filter(t => {
    const matchesFilter = filter === "all" ? true : filter === "guests" ? t.is_guest : !t.is_guest;
    const q = search.toLowerCase();
    const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.message.toLowerCase().includes(q) || (t.company ?? "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));

  function toggleAll() {
    const ids = filtered.map(t => t.id);
    const allOn = ids.every(id => selected.has(id));
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => allOn ? n.delete(id) : n.add(id)); return n; });
  }

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function deleteSingle(id: string) {
    try {
      const ts = Math.floor(Date.now() / 1000);
      const sig = await hmacSign(`${id}:${ts}`, adminPassword);
      const url = `${API_URL}/testimonials/${id}?sig=${encodeURIComponent(sig)}&ts=${ts}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      setTestimonials(prev => prev.filter(t => t.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e: unknown) {
      setDeleteStatus({ type: "error", message: e instanceof Error ? e.message : "Delete failed" });
    }
  }

  async function bulkDelete() {
    if (!selected.size) return;
    setDeleting(true);
    setDeleteStatus({ type: "loading" });
    try {
      const ts = Math.floor(Date.now() / 1000);
      const ids = Array.from(selected);
      const sortedIds = [...ids].sort().join(",");
      const sig = await hmacSign(`bulk:${sortedIds}:${ts}`, adminPassword);
      const res = await fetch(`${API_URL}/testimonials/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, sig, ts }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed");
      setDeleteStatus({ type: "success", message: `${d.deleted} testimonial(s) deleted` });
      setTestimonials(prev => prev.filter(t => !selected.has(t.id)));
      setSelected(new Set());
    } catch (e: unknown) {
      setDeleteStatus({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    } finally { setDeleting(false); }
  }

  return (
    <div className="p-8 flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#1a1209" }}>Testimonials</h2>
          <p className="text-sm mt-0.5" style={{ color: "#9e8876" }}>
            {testimonials.length} total · {selected.size} selected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ color: "#6b5c4e", border: "1px solid #e0d8d0" }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          {selected.size > 0 && (
            <button onClick={bulkDelete} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
              {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete {selected.size}
            </button>
          )}
        </div>
      </div>

      {deleteStatus.type !== "idle" && <StatusBadge status={deleteStatus} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9e8876" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, message, company…"
            className={cn(fieldCls, "pl-9 py-2")} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9e8876" }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1">
          {(["all", "signed_in", "guests"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                filter === f ? "text-white" : "text-[#6b5c4e] hover:bg-orange-50")}
              style={filter === f ? { background: "linear-gradient(135deg,#e85c2a,#f07a50)" } : { border: "1px solid #e0d8d0" }}>
              <Filter size={11} />
              {f === "all" ? "All" : f === "signed_in" ? "Signed in" : "Guests"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden flex-1" style={{ border: "1px solid #ede8e2" }}>
        {/* Table header */}
        <div className="flex items-center gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{ background: "#f8f5f1", borderBottom: "1px solid #ede8e2", color: "#9e8876" }}>
          <button onClick={toggleAll} className="shrink-0" title="Select all visible">
            {allSelected
              ? <CheckSquare size={15} style={{ color: "#e85c2a" }} />
              : <Square size={15} style={{ color: "#9e8876" }} />}
          </button>
          <span className="w-36 shrink-0">Person</span>
          <span className="flex-1">Message</span>
          <span className="w-32 shrink-0">Tags</span>
          <span className="w-24 shrink-0">Date</span>
          <span className="w-8 shrink-0" />
        </div>

        {/* Rows */}
        <div className="overflow-y-auto divide-y divide-[#f0ebe5] bg-white" style={{ maxHeight: "calc(100vh - 380px)" }}>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e85c2a", borderTopColor: "transparent" }} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Quote size={28} style={{ color: "#e0d8d0" }} />
              <p className="text-sm" style={{ color: "#9e8876" }}>No testimonials match</p>
            </div>
          )}
          {filtered.map(t => {
            const isSel = selected.has(t.id);
            const date = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const initials = t.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={t.id}
                className={cn("flex items-start gap-3 px-5 py-4 transition-colors group", isSel ? "bg-orange-50/60" : "hover:bg-[#faf7f4]")}>
                <input type="checkbox" checked={isSel} onChange={() => toggle(t.id)}
                  className="mt-1 shrink-0 cursor-pointer accent-[#e85c2a]" />

                {/* Person */}
                <div className="w-36 shrink-0 flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "#1a1209" }}>{t.name}</p>
                    {(t.role || t.company) && (
                      <p className="text-[10px] truncate" style={{ color: "#9e8876" }}>
                        {[t.role, t.company].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block"
                      style={t.is_guest
                        ? { background: "#f0ebe5", color: "#9e8876" }
                        : { background: "#fff2ec", color: "#c04a18" }}>
                      {t.is_guest ? "Guest" : "Signed in"}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <p className="flex-1 text-xs leading-relaxed line-clamp-3" style={{ color: "#3d2c1e" }}>{t.message}</p>

                {/* Tags */}
                <div className="w-32 shrink-0 flex flex-wrap gap-1">
                  {(t.tags ?? []).slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "#fff2ec", color: "#c04a18", border: "1px solid rgba(232,92,42,0.2)" }}>
                      {tag}
                    </span>
                  ))}
                  {(t.tags ?? []).length > 2 && (
                    <span className="text-[10px]" style={{ color: "#9e8876" }}>+{t.tags.length - 2}</span>
                  )}
                </div>

                {/* Date */}
                <span className="w-24 shrink-0 text-[11px]" style={{ color: "#9e8876" }}>{date}</span>

                {/* Delete */}
                <button onClick={() => deleteSingle(t.id)}
                  className="w-8 shrink-0 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                  style={{ color: "#dc2626" }} title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Nav item ──────────────────────────────────────────────────────
function NavItem({
  id, icon: Icon, label, badge, active, onClick,
}: {
  id: Section; icon: React.ElementType; label: string;
  badge?: number; active: boolean; onClick: (id: Section) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
      style={active
        ? { background: "linear-gradient(135deg,rgba(232,92,42,0.12),rgba(240,122,80,0.08))", color: "#e85c2a", border: "1px solid rgba(232,92,42,0.2)" }
        : { color: "#6b5c4e", border: "1px solid transparent" }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#faf7f4"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Password gate ─────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);

  function check() {
    if (!ADMIN_PASSWORD || pw === ADMIN_PASSWORD) { onAuth(pw); }
    else setErr(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#f8f5f1" }}>
      <div className="rounded-2xl p-8 max-w-sm w-full"
        style={{ background: "#ffffff", border: "1px solid #ede8e2", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
          <Lock size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-bold mb-1" style={{ color: "#1a1209" }}>Admin Panel</h1>
        <p className="text-sm mb-6" style={{ color: "#9e8876" }}>Enter your admin password to continue</p>
        <div className="relative mb-2">
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === "Enter" && check()}
            placeholder="Admin password"
            className={cn(fieldCls, "pr-11", err && "border-red-400 ring-2 ring-red-100")}
          />
          <button onClick={() => setShow(v => !v)} type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "#9e8876" }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {err && <p className="text-xs text-red-500 mb-3 flex items-center gap-1"><AlertCircle size={11} /> Incorrect password</p>}
        <button onClick={check}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)", boxShadow: "0 4px 14px rgba(232,92,42,0.3)" }}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [tCount, setTCount] = useState(0);

  useEffect(() => {
    if (!authed) return;
    fetch(`${API_URL}/testimonials/`)
      .then(r => r.json())
      .then((d: Testimonial[]) => setTCount(d.length))
      .catch(() => {});
  }, [authed]);

  if (!authed) {
    return <PasswordGate onAuth={pw => { setAdminPassword(pw); setAuthed(true); }} />;
  }

  const navGroups = [
    {
      label: "Overview",
      items: [{ id: "overview" as Section, icon: LayoutDashboard, label: "Dashboard" }],
    },
    {
      label: "Data Sources",
      items: [
        { id: "github" as Section, icon: Github, label: "GitHub Repos" },
        { id: "calendar" as Section, icon: Calendar, label: "Google Calendar" },
        { id: "linkedin" as Section, icon: Linkedin, label: "LinkedIn" },
        { id: "files" as Section, icon: FileText, label: "Custom Files" },
      ],
    },
    {
      label: "Content",
      items: [
        { id: "testimonials" as Section, icon: MessageSquareDot, label: "Testimonials", badge: tCount },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#f8f5f1" }}>
      {/* Header */}
      <header className="shrink-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: "#ffffff", borderBottom: "1px solid #ede8e2" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide" style={{ color: "#1a1209" }}>Admin Panel</h1>
            <p className="text-[11px]" style={{ color: "#9e8876" }}>Arun Karthik · RAG Portfolio</p>
          </div>
        </div>
        <Link href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
          style={{ color: "#6b5c4e", border: "1px solid #e0d8d0" }}>
          <ArrowLeft size={14} />
          Back to Site
        </Link>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="shrink-0 w-56 flex flex-col overflow-y-auto py-4 px-3 gap-5"
          style={{ background: "#ffffff", borderRight: "1px solid #ede8e2" }}>
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5" style={{ color: "#b8a898" }}>
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(item => (
                  <NavItem key={item.id} {...item} active={section === item.id} onClick={setSection} />
                ))}
              </div>
            </div>
          ))}

          {/* Sign out of admin */}
          <div className="mt-auto pt-4" style={{ borderTop: "1px solid #f0ebe5" }}>
            <button onClick={() => setAuthed(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
              style={{ color: "#9e8876" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#faf7f4"; (e.currentTarget as HTMLElement).style.color = "#e85c2a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#9e8876"; }}>
              <Lock size={14} />
              Lock panel
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {section === "overview" && <OverviewSection adminPassword={adminPassword} />}
          {section === "github" && <GitHubSection />}
          {section === "calendar" && <CalendarSection />}
          {section === "linkedin" && <LinkedInSection />}
          {section === "files" && <FilesSection />}
          {section === "testimonials" && <TestimonialsSection adminPassword={adminPassword} />}
        </main>
      </div>
    </div>
  );
}
