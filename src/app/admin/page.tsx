"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Upload, RefreshCw, Check, AlertCircle, Lock, Eye, EyeOff,
  Github, Trash2, Download, ChevronDown, ChevronUp, Star, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

type Status = { type: "idle" | "loading" | "success" | "error"; message?: string };

interface GithubRepo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  stars: number;
  topics: string[];
  url: string;
  updated_at: string | null;
  indexed: boolean;
  last_indexed: string | null;
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  if (status.type === "idle") return null;
  if (status.type === "loading")
    return <p className="text-xs text-sky-400/50 mt-1 flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Processing…</p>;
  if (status.type === "success")
    return <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> {status.message}</p>;
  return <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {status.message}</p>;
}

// ── GitHub repo manager ───────────────────────────────────────
function GitHubManager() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ingestStatus, setIngestStatus] = useState<Status>({ type: "idle" });
  const [deleteStatus, setDeleteStatus] = useState<Record<string, Status>>({});
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<"all" | "indexed" | "not_indexed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/github");
      if (!res.ok) throw new Error("Failed to load repos");
      const data: GithubRepo[] = await res.json();
      console.log(data);
      setRepos(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleAll() {
    const visible = filtered.map(r => r.name);
    const allOn = visible.every(n => selected.has(n));
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(n => allOn ? next.delete(n) : next.add(n));
      return next;
    });
  }

  async function ingestSelected() {
    if (selected.size === 0) return;
    setIngestStatus({ type: "loading" });
    try {
      const res = await fetch("/api/admin/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_names: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setIngestStatus({ type: "success", message: `+${data.chunks_added} chunks indexed across ${selected.size} repo(s)` });
      setSelected(new Set());
      await load();
    } catch (e: any) {
      setIngestStatus({ type: "error", message: e.message });
    }
  }

  async function deleteRepo(repoName: string) {
    setDeleteStatus(s => ({ ...s, [repoName]: { type: "loading" } }));
    try {
      const res = await fetch(`/api/admin/github/${encodeURIComponent(repoName)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setDeleteStatus(s => ({ ...s, [repoName]: { type: "success", message: `${data.chunks_deleted} chunks removed` } }));
      await load();
    } catch (e: any) {
      setDeleteStatus(s => ({ ...s, [repoName]: { type: "error", message: e.message } }));
    }
  }

  const filtered = repos.filter(r =>
    filter === "all" ? true : filter === "indexed" ? r.indexed : !r.indexed
  );

  const indexedCount = repos.filter(r => r.indexed).length;

  return (
    <div className="glass gradient-border rounded-2xl overflow-hidden mb-4">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Github size={18} className="text-slate-300" />
          <div className="text-left">
            <p className="font-semibold text-white">GitHub Repositories</p>
            <p className="text-xs text-sky-400/50">
              {loading ? "Loading…" : `${repos.length} repos · ${indexedCount} indexed`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); load(); }}
            disabled={loading}
            className="p-1.5 rounded-lg text-sky-400/50 hover:text-sky-300 hover:bg-sky-500/10 transition-colors disabled:opacity-30"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          {open ? <ChevronUp size={16} className="text-sky-400/40" /> : <ChevronDown size={16} className="text-sky-400/40" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5">
          {/* Filter + actions bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {(["all", "indexed", "not_indexed"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs transition-colors",
                    filter === f
                      ? "bg-sky-500/20 text-sky-300"
                      : "text-sky-400/40 hover:text-sky-300 hover:bg-sky-500/10"
                  )}
                >
                  {f === "all" ? "All" : f === "indexed" ? "Indexed" : "Not indexed"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={ingestSelected}
                  disabled={ingestStatus.type === "loading"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
                >
                  <Download size={12} />
                  Index {selected.size} repo{selected.size > 1 ? "s" : ""}
                </button>
              )}
              <button
                onClick={toggleAll}
                className="text-xs text-sky-400/50 hover:text-sky-300 transition-colors px-2 py-1"
              >
                {filtered.every(r => selected.has(r.name)) ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>

          <div className="px-5 py-2">
            <StatusBadge status={ingestStatus} />
          </div>

          {/* Repo list */}
          <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
            {loading && repos.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <RefreshCw size={16} className="text-sky-400/40 animate-spin" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-sm text-sky-400/30 py-8">No repos found</p>
            )}

            {filtered.map(repo => {
              const isSelected = selected.has(repo.name);
              const delSt = deleteStatus[repo.name] ?? { type: "idle" };

              return (
                <div
                  key={repo.name}
                  className={cn(
                    "flex items-start gap-3 px-5 py-3.5 transition-colors",
                    isSelected ? "bg-sky-500/5" : "hover:bg-white/[0.02]"
                  )}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(repo.name)}
                    className="mt-1 accent-sky-500 shrink-0 cursor-pointer"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-white hover:text-sky-300 transition-colors flex items-center gap-1"
                      >
                        {repo.name}
                        <ExternalLink size={11} className="text-sky-400/40" />
                      </a>
                      {repo.language && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                          {repo.language}
                        </span>
                      )}
                      {repo.indexed ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                          <Check size={10} /> Indexed
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-400">
                          Not indexed
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-0.5">
                        <Star size={10} /> {repo.stars}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-xs text-sky-400/50 mt-0.5 truncate">{repo.description}</p>
                    )}

                    {repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {repo.topics.slice(0, 5).map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400/70">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {repo.last_indexed && (
                      <p className="text-xs text-slate-600 mt-1">
                        Last indexed: {new Date(repo.last_indexed).toLocaleDateString()}
                      </p>
                    )}

                    <StatusBadge status={delSt} />
                  </div>

                  {/* Delete (only if indexed) */}
                  {repo.indexed && (
                    <button
                      onClick={() => deleteRepo(repo.name)}
                      disabled={delSt.type === "loading"}
                      title="Remove from index"
                      className="shrink-0 p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 mt-0.5"
                    >
                      {delSt.type === "loading"
                        ? <RefreshCw size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sourceTitle, setSourceTitle] = useState("");
  const [status, setStatus] = useState<Record<string, Status>>({
    calendar: { type: "idle" },
    linkedin: { type: "idle" },
    file: { type: "idle" },
  });

  function checkAuth() {
    if (password === ADMIN_PASSWORD) { setAuthed(true); setAuthError(false); }
    else setAuthError(true);
  }

  async function triggerIngest(source: string, formData?: FormData) {
    setStatus(s => ({ ...s, [source]: { type: "loading" } }));
    try {
      const res = await fetch(`/api/ingest/${source}`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setStatus(s => ({ ...s, [source]: { type: "success", message: `+${data.chunks_added} chunks indexed` } }));
    } catch (err: any) {
      setStatus(s => ({ ...s, [source]: { type: "error", message: err.message } }));
    }
  }

  async function handleFileUpload(endpoint: "linkedin" | "file") {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (endpoint === "file" && sourceTitle.trim()) fd.append("source_title", sourceTitle.trim());
    await triggerIngest(endpoint, fd);
    setFile(null);
    setSourceTitle("");
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse 80% 60% at 20% 20%, #0c1f4a, #020c1b 70%)" }}>
        <div className="glass gradient-border rounded-2xl p-8 max-w-sm w-full">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
            <Lock size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Admin Panel</h1>
          <p className="text-sm text-sky-400/60 mb-6">Enter your admin password to continue</p>
          <div className="relative mb-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(false); }}
              onKeyDown={(e) => e.key === "Enter" && checkAuth()}
              placeholder="Admin password"
              className={cn(
                "w-full glass-light border rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-sky-400/30 focus:outline-none focus:ring-1 transition-colors",
                authError
                  ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  : "border-sky-500/15 focus:border-sky-500/40 focus:ring-sky-500/20"
              )}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/40 hover:text-sky-300 transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {authError
            ? <p className="text-xs text-red-400 mb-3 flex items-center gap-1"><AlertCircle size={11} /> Incorrect password</p>
            : <div className="mb-3" />}
          <button onClick={checkAuth}
            className="w-full rounded-xl py-3 text-sm font-medium text-white transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4"
      style={{ background: "radial-gradient(ellipse 80% 60% at 20% 20%, #0c1f4a, #020c1b 70%)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Admin — Data Ingest</h1>
        <p className="text-sky-400/60 text-sm mb-8">Manage data sources in the RAG vector store.</p>

        {/* ── GitHub with full CRUD ── */}
        <GitHubManager />

        {/* ── Google Calendar ── */}
        <div className="glass gradient-border rounded-2xl p-5 flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="font-medium text-white">Google Calendar</p>
            <p className="text-sm text-sky-400/50">Re-sync past events and availability summary</p>
            <StatusBadge status={status["calendar"]} />
          </div>
          <button onClick={() => triggerIngest("calendar")} disabled={status["calendar"].type === "loading"}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
            <RefreshCw size={14} className={status["calendar"].type === "loading" ? "animate-spin" : ""} />
            Sync
          </button>
        </div>

        {/* ── LinkedIn ── */}
        <div className="glass gradient-border rounded-2xl p-5 mb-4">
          <p className="font-medium text-white mb-1">LinkedIn</p>
          <p className="text-sm text-sky-400/50 mb-2">Upload your LinkedIn data as individual CSVs.</p>
          <p className="text-xs text-sky-400/30 mb-4">LinkedIn → Settings &amp; Privacy → Data privacy → Get a copy of your data → Request archive</p>
          <input type="file" accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-sky-300/60 mb-3 block file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-sky-500/20 file:text-sky-300 file:text-xs" />
          <StatusBadge status={status["linkedin"]} />
          <button onClick={() => handleFileUpload("linkedin")} disabled={!file || status["linkedin"].type === "loading"}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
            <Upload size={14} /> Upload & Index
          </button>
        </div>

        {/* ── Custom File ── */}
        <div className="glass gradient-border rounded-2xl p-5">
          <p className="font-medium text-white mb-1">Custom File</p>
          <p className="text-sm text-sky-400/50 mb-4">Upload any PDF, DOCX, MD, or TXT (resume, blog posts, project docs).</p>
          <label className="block text-xs text-sky-400/50 mb-1">
            Source title <span className="text-sky-500/30">(optional — shown in references)</span>
          </label>
          <input type="text" value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)}
            placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "e.g. Resume · Q1 2025"}
            className="w-full glass-light border border-sky-500/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-sky-400/25 mb-4 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 transition-colors" />
          <input type="file" accept=".pdf,.docx,.md,.txt,.markdown"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setSourceTitle(""); }}
            className="text-sm text-sky-300/60 mb-3 block file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-sky-500/20 file:text-sky-300 file:text-xs" />
          <StatusBadge status={status["file"]} />
          <button onClick={() => handleFileUpload("file")} disabled={!file || status["file"].type === "loading"}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
            <Upload size={14} /> Upload & Index
          </button>
        </div>
      </div>
    </div>
  );
}
