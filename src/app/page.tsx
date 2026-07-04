"use client";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { ChatInterface } from "@/components/ChatInterface";
import { AuthModal } from "@/components/AuthModal";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { Github, Linkedin, Mail, Sparkles, LogOut, User, MessageSquareDot } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const { data: session, status } = useSession();
  const [isGuest, setIsGuest] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  const userId = session?.user?.email ?? null;
  const authVisible = status !== "loading" && !session && !isGuest;
  const handleGuest = () => setIsGuest(true);

  const createConversation = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;
    try {
      const res = await fetch(`${API_URL}/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, is_guest: false }),
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
        className="shrink-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: "#ffffff", borderBottom: "1px solid #ede8e2" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center glow-purple"
            style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}
          >
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide" style={{ color: "#1a1209" }}>Arun Karthik</h1>
            <p className="text-[11px]" style={{ color: "#9e8876" }}>AI Portfolio · Ask me anything</p>
          </div>
        </div>

        {/* Center — Testimonials glowing pill */}
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

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {[
            { href: "https://github.com/ArunKarthik05", icon: Github, label: "GitHub" },
            { href: "https://www.linkedin.com/in/arun-karthik-3b08b5218/", icon: Linkedin, label: "LinkedIn" },
            { href: "mailto:ak05032k2@gmail.com", icon: Mail, label: "Email" },
          ].map(({ href, icon: Icon, label }) => (
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

          {session && (
            <div className="flex items-center gap-2 ml-1 pl-2" style={{ borderLeft: "1px solid #ede8e2" }}>
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
          )}
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
        />
        <main className="flex-1 overflow-hidden">
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
