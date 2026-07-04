"use client";
import { useEffect, useState } from "react";

interface Props {
  loading: boolean;
  hasMessages: boolean;
}

export function AvatarHero({ loading, hasMessages }: Props) {
  const [imgSrc, setImgSrc] = useState("/arun-avatar.png");

  useEffect(() => {
    setImgSrc(loading ? "/arun-avatar-thinking.png" : "/arun-avatar.png");
  }, [loading]);

  /* ── Floating compact avatar (active chat mode) ─────────── */
  if (hasMessages) {
    return (
      <div className="absolute bottom-24 right-4 z-20 flex flex-col items-end gap-2 select-none pointer-events-none">
        {loading && (
          <div
            className="relative rounded-2xl px-3 py-2 mr-3"
            style={{ background: "#ffffff", border: "1px solid rgba(232,92,42,0.2)", boxShadow: "0 4px 12px rgba(232,92,42,0.08)" }}
          >
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#e85c2a", animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <div
              className="absolute -bottom-2 right-5 w-0 h-0"
              style={{
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "10px solid rgba(232,92,42,0.12)",
              }}
            />
          </div>
        )}
        <div
          className={`relative transition-all duration-500 ${loading ? "animate-thinking" : "animate-float"}`}
          style={{ width: 140, height: 178 }}
        >
          <div
            className="absolute bottom-0 left-1/2 rounded-full"
            style={{
              width: 90, height: 18,
              background: loading
                ? "radial-gradient(ellipse, rgba(232,92,42,0.4) 0%, transparent 70%)"
                : "radial-gradient(ellipse, rgba(232,92,42,0.2) 0%, transparent 70%)",
              filter: "blur(6px)",
              transform: "translateX(-50%) scaleY(0.5)",
            }}
          />
          <img
            src={imgSrc}
            alt="Arun Karthik"
            className="w-full h-full object-contain drop-shadow-2xl transition-all duration-500"
            style={{
              filter: loading
                ? "drop-shadow(0 0 16px rgba(232,92,42,0.5)) drop-shadow(0 0 32px rgba(232,92,42,0.25))"
                : "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
            }}
          />
        </div>
        <style>{`
          @keyframes dotBounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
            40%            { transform: translateY(-5px); opacity: 1; }
          }
          @keyframes thinking {
            0%,100% { transform: translateY(0px) rotate(-1deg); }
            25%     { transform: translateY(-8px) rotate(1deg); }
            75%     { transform: translateY(-4px) rotate(-0.5deg); }
          }
          .animate-thinking { animation: thinking 0.9s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  /* ── Full hero (empty / no messages state) ──────────────── */
  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div className="relative flex flex-col items-center">
        {/* Speech bubble */}
        <div
          className="relative mb-4 rounded-2xl px-5 py-3 text-center max-w-xs transition-all duration-300"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(232,92,42,0.18)",
            boxShadow: "0 4px 16px rgba(232,92,42,0.08)",
            minHeight: 68,
          }}
        >
          <p className="text-sm font-semibold mb-0.5" style={{ color: "#1a1209" }}>
            Hi, I&apos;m Arun Karthik 👋
          </p>
          {loading ? (
            <p className="text-sm h-5 flex items-center justify-center gap-1">
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#e85c2a", animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </span>
              <span className="text-xs ml-1" style={{ color: "#9e8876" }}>thinking</span>
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#6b5c4e" }}>
              What would you like to know about me?
            </p>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2.5 w-0 h-0"
            style={{
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "12px solid rgba(232,92,42,0.12)",
            }}
          />
        </div>

        {/* Character */}
        <div
          className={`relative transition-all duration-500 ${loading ? "animate-thinking" : "animate-float"}`}
          style={{ width: 280, height: 360 }}
        >
          <div
            className="absolute bottom-0 left-1/2 rounded-full transition-all duration-500"
            style={{
              width: 180, height: 36,
              background: loading
                ? "radial-gradient(ellipse, rgba(232,92,42,0.35) 0%, transparent 70%)"
                : "radial-gradient(ellipse, rgba(232,92,42,0.18) 0%, transparent 70%)",
              filter: "blur(10px)",
              transform: "translateX(-50%) scaleY(0.5)",
            }}
          />
          <img
            src={imgSrc}
            alt="Arun Karthik"
            className="w-full h-full object-contain drop-shadow-2xl transition-all duration-500"
            style={{
              filter: loading
                ? "drop-shadow(0 0 24px rgba(232,92,42,0.5)) drop-shadow(0 0 48px rgba(232,92,42,0.25))"
                : "drop-shadow(0 8px 24px rgba(0,0,0,0.15))",
            }}
          />
          {loading && (
            <>
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, transparent 40%, rgba(232,92,42,0.06) 100%)",
                  animation: "pulseRing 1.5s ease-in-out infinite",
                }}
              />
              <div
                className="absolute"
                style={{ width: "100%", height: "100%", top: 0, left: 0, animation: "orbitParticle 2s linear infinite" }}
              >
                <div
                  className="absolute w-2.5 h-2.5 rounded-full"
                  style={{
                    top: "10%", left: "50%",
                    background: "radial-gradient(circle, #f07a50, #e85c2a)",
                    boxShadow: "0 0 10px rgba(232,92,42,0.7)",
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes pulseRing {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%     { opacity: 1; transform: scale(1.05); }
        }
        @keyframes orbitParticle {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes thinking {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          25%     { transform: translateY(-8px) rotate(1deg); }
          75%     { transform: translateY(-4px) rotate(-0.5deg); }
        }
        .animate-thinking { animation: thinking 0.9s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
