"use client";
import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { X } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onGuest: () => void;
}

export function AuthModal({ open, onClose, onGuest }: AuthModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="absolute bottom-6 right-6 w-80 rounded-2xl p-7 flex flex-col gap-5 animate-fade-in"
        style={{
          background: "#ffffff",
          border: "1px solid #ede8e2",
          boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(232,92,42,0.08)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ color: "#9e8876" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff2ec"; (e.currentTarget as HTMLElement).style.color = "#e85c2a"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9e8876"; }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#e85c2a,#f07a50)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-bold leading-snug" style={{ color: "#1a1209" }}>
            Log in or sign up for free
          </h2>
          <p className="text-xs mt-1.5" style={{ color: "#9e8876" }}>Save and sync your conversations</p>
        </div>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-95 active:scale-[.98]"
            style={{ background: "#fff2ec", color: "#1a1209", border: "1px solid rgba(232,92,42,0.2)" }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            onClick={() => signIn("github", { callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
            style={{ background: "#24292e" }}
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "#ede8e2" }} />
          <span className="text-xs" style={{ color: "#9e8876" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "#ede8e2" }} />
        </div>

        {/* Guest */}
        <button
          onClick={onGuest}
          className="w-full py-2.5 rounded-xl text-sm transition-all"
          style={{ border: "1px solid #ede8e2", color: "#6b5c4e" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8f5f1"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          Continue as guest
          <span className="ml-1.5 text-xs" style={{ color: "#9e8876" }}>(history won't be saved)</span>
        </button>

        <p className="text-center text-[10px] leading-relaxed" style={{ color: "#b8a898" }}>
          By signing in you agree that your questions may be used to improve answer quality.
          No personal data beyond your email is stored.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9L37.5 9C33.8 5.6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10.3 0 19.3-7.5 19.3-20 0-1.3-.1-2.7-.3-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 12 24 12c3 0 5.7 1.1 7.8 2.9L37.5 9C33.8 5.6 29.2 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.8 13.4-4.7l-6.2-5.2C29.3 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.9 6l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}
