"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Sparkles, Send, Loader2, Building2, Briefcase,
  Quote, ShieldCheck, Users, TrendingUp, Pencil, Trash2, X, Check, Plus,
  Github, Linkedin, Mail, LogOut, User, MessageSquareDot,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const QUALITY_SUGGESTIONS = [
  "Problem Solver", "Team Player", "Fast Learner", "Great Communicator",
  "Technically Strong", "Reliable", "Innovative", "Detail-Oriented",
  "Proactive", "Leadership", "Mentorship", "Clean Code",
];

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  message: string;
  tags: string[];
  user_id: string | null;
  is_guest: boolean;
  created_at: string;
}

/* ── Tag picker ───────────────────────────────────────────── */
function TagPicker({ selected, onChange }: { selected: string[]; onChange: (t: string[]) => void }) {
  const [custom, setCustom] = useState("");

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (selected.length < 3) {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const v = custom.trim();
    if (!v || selected.includes(v) || selected.length >= 3) return;
    onChange([...selected, v]);
    setCustom("");
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold" style={{ color: "#6b5c4e" }}>
        What qualities did you love most about Arun?
        <span className="ml-1 font-normal" style={{ color: "#b8a898" }}>(pick up to 3)</span>
      </p>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
              style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)", color: "#fff" }}
            >
              {tag}<X size={10} />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {QUALITY_SUGGESTIONS.filter((q) => !selected.includes(q)).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            disabled={selected.length >= 3}
            className="px-2.5 py-1 rounded-full text-xs transition-all disabled:opacity-40"
            style={{ background: "#faf7f4", border: "1px solid rgba(232,92,42,0.2)", color: "#6b5c4e" }}
            onMouseEnter={e => {
              if (selected.length < 3) {
                (e.currentTarget as HTMLElement).style.background = "#fff2ec";
                (e.currentTarget as HTMLElement).style.color = "#e85c2a";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "#faf7f4";
              (e.currentTarget as HTMLElement).style.color = "#6b5c4e";
            }}
          >
            + {tag}
          </button>
        ))}
      </div>

      {selected.length < 3 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="Or type a custom quality…"
            className="flex-1 text-xs rounded-lg px-3 py-1.5"
            style={{ background: "#faf7f4", border: "1px solid #e0d8d0", color: "#1a1209", outline: "none" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#e85c2a"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#e0d8d0"; }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
            style={{ background: "#fff2ec", color: "#e85c2a", border: "1px solid rgba(232,92,42,0.2)" }}
          >
            <Plus size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Testimonial card ─────────────────────────────────────── */
function TestimonialCard({
  t, index, currentUserId, onUpdated, onDeleted,
}: {
  t: Testimonial;
  index: number;
  currentUserId: string | null;
  onUpdated: (updated: Testimonial) => void;
  onDeleted: (id: string) => void;
}) {
  const isOwner = !!currentUserId && t.user_id === currentUserId;
  const initials = t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const date = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const accents = ["#e85c2a", "#f07a50", "#c04a18"];
  const accent = accents[index % accents.length];

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eName, setEName] = useState(t.name);
  const [eRole, setERole] = useState(t.role ?? "");
  const [eCompany, setECompany] = useState(t.company ?? "");
  const [eMessage, setEMessage] = useState(t.message);
  const [eTags, setETags] = useState<string[]>(t.tags ?? []);

  const fieldStyle: React.CSSProperties = {
    width: "100%", background: "#faf7f4", border: "1px solid #e0d8d0",
    borderRadius: "0.5rem", padding: "0.4rem 0.65rem",
    fontSize: "0.75rem", color: "#1a1209", outline: "none",
  };

  async function saveEdit() {
    if (!eName.trim() || !eMessage.trim() || !currentUserId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/testimonials/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: eName.trim(), role: eRole.trim() || null, company: eCompany.trim() || null, message: eMessage.trim(), tags: eTags, user_id: currentUserId }),
      });
      if (!res.ok) throw new Error();
      const updated: Testimonial = await res.json();
      onUpdated(updated);
      setEditing(false);
    } catch { /* silent */ } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!currentUserId) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/testimonials/${t.id}?user_id=${encodeURIComponent(currentUserId)}`, { method: "DELETE" });
      onDeleted(t.id);
    } catch { setDeleting(false); }
  }

  if (editing) {
    return (
      <div className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: "#ffffff", border: "2px solid #e85c2a", boxShadow: "0 0 0 4px rgba(232,92,42,0.08)" }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#e85c2a" }}>Editing your testimonial</p>
        <input style={fieldStyle} value={eName} onChange={e => setEName(e.target.value)} placeholder="Name" />
        <div className="grid grid-cols-2 gap-2">
          <input style={fieldStyle} value={eRole} onChange={e => setERole(e.target.value)} placeholder="Role" />
          <input style={fieldStyle} value={eCompany} onChange={e => setECompany(e.target.value)} placeholder="Company" />
        </div>
        <textarea
          style={{ ...fieldStyle, resize: "none", minHeight: 80 } as React.CSSProperties}
          value={eMessage} onChange={e => setEMessage(e.target.value)} placeholder="Message"
        />
        <TagPicker selected={eTags} onChange={setETags} />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={saveEdit} disabled={saving || !eName.trim() || !eMessage.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button"
            onClick={() => { setEditing(false); setEName(t.name); setERole(t.role ?? ""); setECompany(t.company ?? ""); setEMessage(t.message); setETags(t.tags ?? []); }}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ border: "1px solid #e0d8d0", color: "#6b5c4e" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-0.5 relative group"
      style={{ background: "#ffffff", border: "1px solid #ede8e2", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
      {isOwner && (
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "#fff2ec", color: "#e85c2a" }} title="Edit">
            <Pencil size={12} />
          </button>
          <button onClick={confirmDelete} disabled={deleting} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "#fef2f2", color: "#dc2626" }} title="Delete">
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      )}
      <Quote size={18} style={{ color: accent, opacity: 0.5 }} />
      <p className="text-sm leading-relaxed flex-1" style={{ color: "#3d2c1e" }}>{t.message}</p>
      {t.tags && t.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: "#fff2ec", color: "#c04a18", border: "1px solid rgba(232,92,42,0.2)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid #f0ebe5" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
          style={{ background: `linear-gradient(135deg,${accent},#f07a50)` }}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: "#1a1209" }}>{t.name}</p>
          {(t.role || t.company) && (
            <p className="text-xs truncate" style={{ color: "#9e8876" }}>
              {[t.role, t.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span className="text-[11px] shrink-0" style={{ color: "#b8a898" }}>{date}</span>
      </div>
    </div>
  );
}

/* ── Stat pill ────────────────────────────────────────────── */
function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(232,92,42,0.15)" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
        <Icon size={15} className="text-white" />
      </div>
      <div>
        <p className="text-base font-bold leading-none" style={{ color: "#1a1209" }}>{value}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "#9e8876" }}>{label}</p>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function TestimonialsPage() {
  const { data: session, status } = useSession();
  const currentUserId = session?.user?.email ?? null;

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [fetching, setFetching] = useState(true);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/testimonials/`)
      .then((r) => r.json())
      .then(setTestimonials)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/testimonials/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), role: role.trim() || null, company: company.trim() || null,
          message: message.trim(), tags, user_id: currentUserId,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const created: Testimonial = await res.json();
      setTestimonials((prev) => [created, ...prev]);
      setMessage(""); setRole(""); setCompany(""); setTags([]);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%", background: "#faf7f4", border: "1px solid #e0d8d0",
    borderRadius: "0.625rem", padding: "0.45rem 0.7rem",
    fontSize: "0.8rem", color: "#1a1209", outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#e85c2a";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,92,42,0.1)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#e0d8d0";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f1" }}>

      {/* ── Sticky nav ──────────────────────────────────────── */}
      <header className="shrink-0 z-20 sticky top-0 flex items-center justify-between px-6 py-3"
        style={{ background: "#ffffff", borderBottom: "1px solid #ede8e2" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide" style={{ color: "#1a1209" }}>Arun Karthik</h1>
            <p className="text-[11px]" style={{ color: "#9e8876" }}>AI Portfolio · Ask me anything</p>
          </div>
        </div>

        <Link href="/"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)", boxShadow: "0 0 0 3px rgba(232,92,42,0.15), 0 4px 14px rgba(232,92,42,0.35)" }}>
          <MessageSquareDot size={14} />
          Back to Chat
        </Link>

        <div className="flex items-center gap-1">
          {[
            { href: "https://github.com/ArunKarthik05", icon: Github, label: "GitHub" },
            { href: "https://www.linkedin.com/in/arun-karthik-3b08b5218/", icon: Linkedin, label: "LinkedIn" },
            { href: "mailto:ak05032k2@gmail.com", icon: Mail, label: "Email" },
          ].map(({ href, icon: Icon, label }) => (
            <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer" aria-label={label}
              className="p-2 rounded-lg transition-all" style={{ color: "#9e8876" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e85c2a"; (e.currentTarget as HTMLElement).style.background = "#fff2ec"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9e8876"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <Icon size={15} />
            </a>
          ))}
          {status !== "loading" && session && (
            <div className="flex items-center gap-2 ml-1 pl-2" style={{ borderLeft: "1px solid #ede8e2" }}>
              {session.user?.image ? (
                <img src={session.user.image} alt="avatar" className="w-7 h-7 rounded-full"
                  style={{ border: "2px solid rgba(232,92,42,0.3)" }} />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "#fff2ec", border: "1px solid rgba(232,92,42,0.3)" }}>
                  <User size={13} style={{ color: "#e85c2a" }} />
                </div>
              )}
              <button onClick={() => signOut()} className="p-1.5 rounded-lg transition-all"
                style={{ color: "#9e8876" }} title="Sign out"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e85c2a"; (e.currentTarget as HTMLElement).style.background = "#fff2ec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9e8876"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero — left: avatar + headline + stats │ right: form ── */}
      <section className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#fff5f0 0%,#f8f5f1 60%,#fff2ec 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(232,92,42,0.08),transparent 70%)", transform: "translate(30%,-30%)" }} />

        <div className="max-w-6xl mx-auto px-6 py-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

            {/* Left — identity + stats */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full"
                    style={{ background: "radial-gradient(circle,rgba(232,92,42,0.2),transparent 70%)", transform: "scale(1.3)" }} />
                  <div className="relative w-24 h-24 rounded-full overflow-hidden"
                    style={{ border: "3px solid #e85c2a", boxShadow: "0 0 0 6px rgba(232,92,42,0.12), 0 8px 32px rgba(232,92,42,0.2)" }}>
                    <img src="/arun-testimonials.png" alt="Arun Karthik" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "#ffffff", border: "2px solid rgba(232,92,42,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                    <ShieldCheck size={14} style={{ color: "#e85c2a" }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#e85c2a" }}>Social proof</p>
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight" style={{ color: "#1a1209" }}>
                    What people say<br />
                    <span style={{ color: "#e85c2a" }}>about working with me</span>
                  </h2>
                </div>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: "#6b5c4e" }}>
                I&apos;ve had the privilege of collaborating with engineers, recruiters, and teams.
                Here&apos;s what they have to say - unfiltered and genuine.
              </p>

              <div className="flex flex-wrap gap-3">
                <StatPill icon={Users} value={`${testimonials.length}`} label="Testimonials" />
                <StatPill icon={TrendingUp} value="Always" label="Learning & Growing" />
                <StatPill icon={ShieldCheck} value="Real" label="Verified people" />
              </div>
            </div>

            {/* Right — compact form */}
            <div className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(232,92,42,0.2)", boxShadow: "0 8px 32px rgba(232,92,42,0.1)" }}>
              <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
                <h3 className="text-sm font-bold text-white">Share your experience</h3>
                <p className="text-[11px] text-white/70 mt-0.5">
                  {currentUserId ? `Signed in as ${currentUserId}` : "Posting as guest"}
                </p>
              </div>

              <div className="p-4" style={{ background: "#ffffff" }}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                  <div>
                    <label className="text-[11px] font-semibold mb-0.5 block" style={{ color: "#6b5c4e" }}>Your name *</label>
                    <input style={fieldStyle} placeholder="e.g. Priya Sharma" value={name}
                      onChange={e => setName(e.target.value)} onFocus={onFocus} onBlur={onBlur} required />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: "#6b5c4e" }}>
                        <Briefcase size={9} /> Role
                      </label>
                      <input style={fieldStyle} placeholder="Engineer" value={role}
                        onChange={e => setRole(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: "#6b5c4e" }}>
                        <Building2 size={9} /> Company
                      </label>
                      <input style={fieldStyle} placeholder="Zoho" value={company}
                        onChange={e => setCompany(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold mb-0.5 block" style={{ color: "#6b5c4e" }}>Your message *</label>
                    <textarea
                      style={{ ...fieldStyle, resize: "none", minHeight: 68 } as React.CSSProperties}
                      placeholder="Share what it was like working with Arun…"
                      value={message} onChange={e => setMessage(e.target.value)}
                      onFocus={onFocus} onBlur={onBlur} required minLength={10} maxLength={1000}
                    />
                    <p className="text-right text-[10px] -mt-1" style={{ color: "#b8a898" }}>{message.length}/1000</p>
                  </div>

                  <div className="rounded-lg p-2.5" style={{ background: "#faf7f4", border: "1px solid #e0d8d0" }}>
                    <TagPicker selected={tags} onChange={setTags} />
                  </div>

                  {error && <p className="text-[11px] font-medium" style={{ color: "#dc2626" }}>{error}</p>}
                  {submitted && (
                    <div className="rounded-lg px-3 py-2 text-[11px] font-medium flex items-center gap-2"
                      style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                      <ShieldCheck size={12} /> Thank you! Your testimonial has been posted.
                    </div>
                  )}

                  <button type="submit" disabled={submitting || !name.trim() || !message.trim()}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 active:scale-[.98]"
                    style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)", boxShadow: "0 4px 14px rgba(232,92,42,0.3)" }}>
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                    {submitting ? "Posting…" : "Post testimonial"}
                  </button>

                  <p className="text-center text-[10px]" style={{ color: "#b8a898" }}>
                    All testimonials are posted publicly.
                  </p>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Testimonials grid ───────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-12">

        {/* Section header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Quote size={18} style={{ color: "#e85c2a" }} />
            <h3 className="text-lg font-bold" style={{ color: "#1a1209" }}>All Testimonials</h3>
          </div>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right,rgba(232,92,42,0.2),transparent)" }} />
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "#fff2ec", color: "#e85c2a", border: "1px solid rgba(232,92,42,0.2)" }}>
            {testimonials.length} {testimonials.length === 1 ? "review" : "reviews"}
          </span>
        </div>

        {/* Styled parent container */}
        <div className="rounded-3xl p-6 md:p-8"
          style={{
            background: "linear-gradient(145deg,#ffffff 0%,#fdf9f6 100%)",
            border: "1.5px solid #ede8e2",
            boxShadow: "0 4px 32px rgba(232,92,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}>

          {/* Decorative top strip */}
          <div className="h-1 w-full rounded-full mb-6"
            style={{ background: "linear-gradient(to right,#e85c2a,#f07a50,rgba(232,92,42,0.1))" }} />

          {fetching ? (
            <div className="flex items-center justify-center h-48 gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(232,92,42,0.2)" }} />
                <div className="absolute inset-0 rounded-full border-2 animate-spin"
                  style={{ borderColor: "#e85c2a", borderTopColor: "transparent" }} />
              </div>
              <span className="text-sm" style={{ color: "#9e8876" }}>Loading…</span>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl"
              style={{ border: "2px dashed #e0d8d0" }}>
              <Quote size={28} style={{ color: "#e0d8d0" }} />
              <p className="text-sm font-medium" style={{ color: "#9e8876" }}>No testimonials yet</p>
              <p className="text-xs" style={{ color: "#b8a898" }}>Be the first to share your experience ↑</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {testimonials.map((t, i) => (
                <TestimonialCard
                  key={t.id}
                  t={t}
                  index={i}
                  currentUserId={currentUserId}
                  onUpdated={(updated) => setTestimonials((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
                  onDeleted={(id) => setTestimonials((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}

          {/* Decorative bottom strip */}
          {testimonials.length > 0 && (
            <div className="h-px w-full mt-6"
              style={{ background: "linear-gradient(to right,transparent,rgba(232,92,42,0.15),transparent)" }} />
          )}
        </div>
      </div>

    </div>
  );
}
