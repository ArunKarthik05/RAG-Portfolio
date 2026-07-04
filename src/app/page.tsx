"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { ChatInterface } from "@/components/ChatInterface";
import { AuthModal } from "@/components/AuthModal";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { Github, Linkedin, Mail, Sparkles, LogOut, User, MessageSquareDot, Menu, ChevronDown, LogIn } from "lucide-react";
import Link from "next/link";

const SOCIAL_LINKS = [
  { href: "https://github.com/ArunKarthik05", icon: Github, label: "GitHub" },
  { href: "https://www.linkedin.com/in/arun-karthik-3b08b5218/", icon: Linkedin, label: "LinkedIn" },
  { href: "mailto:ak05032k2@gmail.com", icon: Mail, label: "Email" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const [isGuest, setIsGuest] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.email ?? null;
  const authVisible = status !== "loading" && !session && !isGuest;
  const handleGuest = () => setIsGuest(true);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createConversation = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_guest: false }),
      });
      const data = await res.json();
      return data.id ?? null;
    } catch { return null; }
  }, [userId]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#f8f5f1" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(232,92,42,0.2)" }} />
            <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#e85c2a", borderTopColor: "transparent" }} />
          </div>
          <p className="text-xs tracking-widest uppercase" style={{ color: "#9e8876" }}>Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#f8f5f1" }}>
      <AuthModal open={authVisible} onClose={handleGuest} onGuest={handleGuest} />

      {/* Header */}
      <header
        className="shrink-0 z-10 flex items-center justify-between px-3 sm:px-6 py-3"
        style={{ background: "#ffffff", borderBottom: "1px solid #ede8e2" }}
      >
        {/* Left: hamburger (mobile, signed-in only) + brand logo → home */}
        <div className="flex items-center gap-2">
          {userId && (
            <button
              className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: "#9e8876" }}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
            >
              <Menu size={18} />
            </button>
          )}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}
            >
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide" style={{ color: "#1a1209" }}>Arun Karthik</h1>
              {/* Subtitle — desktop only */}
              <p className="hidden sm:block text-[11px]" style={{ color: "#9e8876" }}>AI Portfolio · Ask me anything</p>
            </div>
          </Link>
        </div>

        {/* Center: Testimonials pill — desktop only */}
        <Link
          href="/testimonials"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#e85c2a,#f07a50)",
            boxShadow: "0 0 0 3px rgba(232,92,42,0.15), 0 4px 14px rgba(232,92,42,0.35)",
          }}
        >
          <MessageSquareDot size={14} />
          Testimonials
        </Link>

        {/* Right */}
        <div className="flex items-center gap-1.5">

          {/* ── Desktop: social icon buttons ── */}
          <div className="hidden sm:flex items-center gap-1">
            {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={label}
                className="p-2 rounded-lg transition-all"
                style={{ color: "#9e8876" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e85c2a"; (e.currentTarget as HTMLElement).style.background = "#fff2ec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9e8876"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>

          {/* ── Desktop: user avatar + sign-out ── */}
          {session ? (
            <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-2" style={{ borderLeft: "1px solid #ede8e2" }}>
              {session.user?.image ? (
                <img src={session.user.image} alt="avatar"
                  className="w-7 h-7 rounded-full" style={{ border: "2px solid rgba(232,92,42,0.3)" }} />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "#fff2ec", border: "1px solid rgba(232,92,42,0.3)" }}>
                  <User size={13} style={{ color: "#e85c2a" }} />
                </div>
              )}
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: "#9e8876" }}
                title="Sign out"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e85c2a"; (e.currentTarget as HTMLElement).style.background = "#fff2ec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9e8876"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            /* ── Desktop: Login button (not signed in) ── */
            <button
              onClick={() => setIsGuest(false)}
              className="hidden sm:flex items-center gap-1.5 ml-1 pl-2 py-1.5 pr-3 rounded-lg text-xs font-semibold transition-all"
              style={{ borderLeft: "1px solid #ede8e2", color: "#e85c2a" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff2ec"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <LogIn size={14} />
              Login
            </button>
          )}

          {/* ── Mobile: Reviews pill ── */}
          <Link
            href="/testimonials"
            className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}
          >
            <MessageSquareDot size={12} />
            Reviews
          </Link>

          {/* ── Mobile: dropdown trigger ── */}
          <div className="sm:hidden relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1 p-1.5 rounded-lg"
              style={{ color: "#9e8876" }}
              aria-label="More options"
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt="avatar"
                  className="w-7 h-7 rounded-full" style={{ border: "2px solid rgba(232,92,42,0.3)" }} />
              ) : (
                <User size={17} />
              )}
              <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-lg z-50"
                style={{ background: "#ffffff", border: "1px solid #ede8e2" }}
              >
                {/* Social links */}
                <div className="px-2 py-2" style={{ borderBottom: "1px solid #ede8e2" }}>
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9e8876" }}>Connect</p>
                  {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ color: "#1a1209" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff2ec"; (e.currentTarget as HTMLElement).style.color = "#e85c2a"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#1a1209"; }}
                    >
                      <Icon size={15} style={{ color: "#e85c2a", flexShrink: 0 }} />
                      {label}
                    </a>
                  ))}
                </div>

                {/* Auth row */}
                <div className="px-2 py-2">
                  {session ? (
                    <>
                      {session.user?.name && (
                        <p className="px-3 py-1 text-xs truncate" style={{ color: "#9e8876" }}>{session.user.name}</p>
                      )}
                      <button
                        onClick={() => { setDropdownOpen(false); signOut(); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{ color: "#1a1209" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff2ec"; (e.currentTarget as HTMLElement).style.color = "#e85c2a"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#1a1209"; }}
                      >
                        <LogOut size={15} style={{ color: "#e85c2a", flexShrink: 0 }} />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setDropdownOpen(false); setIsGuest(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ color: "#1a1209" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff2ec"; (e.currentTarget as HTMLElement).style.color = "#e85c2a"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#1a1209"; }}
                    >
                      <LogIn size={15} style={{ color: "#e85c2a", flexShrink: 0 }} />
                      Login
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar
          userId={userId}
          activeConversationId={activeConversationId}
          onSelect={(id) => { setActiveConversationId(id); setChatKey((k) => k + 1); }}
          onNew={() => { setActiveConversationId(null); setChatKey((k) => k + 1); }}
          refreshTrigger={sidebarRefresh}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-hidden min-w-0">
          <ChatInterface
            key={chatKey}
            sourceFilter={{ source_types: null, repo_filter: null }}
            userId={userId}
            isGuest={isGuest}
            onRequestSignIn={() => setIsGuest(false)}
            activeConversationId={activeConversationId}
            onConversationCreated={setActiveConversationId}
            createConversation={createConversation}
            onSidebarRefresh={() => setSidebarRefresh((r) => r + 1)}
          />
        </main>
      </div>
    </div>
  );
}
