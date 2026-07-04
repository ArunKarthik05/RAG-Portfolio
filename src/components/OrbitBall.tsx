"use client";

interface Props {
  active: boolean;   // true = generating response
  faded?: boolean;   // true = background mode while messages visible
}

export function OrbitBall({ active, faded = false }: Props) {
  return (
    <div
      className="relative flex items-center justify-center transition-all duration-700"
      style={{
        width: faded ? 120 : 200,
        height: faded ? 120 : 200,
        opacity: faded ? 0.3 : 1,
      }}
    >
      {/* Ripple waves — only when active */}
      {active && (
        <>
          {[0, 0.6, 1.2].map((delay) => (
            <div
              key={delay}
              className="absolute inset-0 rounded-full animate-ripple"
              style={{
                border: "1px solid rgba(139,92,246,0.5)",
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </>
      )}

      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: active
            ? "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(109,40,217,0.15) 50%, transparent 70%)"
            : "radial-gradient(circle, rgba(109,40,217,0.2) 0%, rgba(79,20,160,0.08) 50%, transparent 70%)",
          filter: "blur(20px)",
          transform: "scale(1.5)",
        }}
      />

      {/* 3-D scene */}
      <div className="scene relative" style={{ width: faded ? 100 : 160, height: faded ? 100 : 160 }}>
        <div className="preserve-3d relative w-full h-full">

          {/* Sphere */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-500 ${active ? "animate-pulse-orb-active" : "animate-pulse-orb"}`}
            style={{
              background: active
                ? `radial-gradient(circle at 35% 30%,
                    rgba(220,180,255,0.9),
                    rgba(139,92,246,0.95) 35%,
                    rgba(88,28,220,1) 65%,
                    rgba(30,8,80,1))`
                : `radial-gradient(circle at 35% 30%,
                    rgba(180,140,240,0.7),
                    rgba(109,40,217,0.9) 40%,
                    rgba(60,10,150,1) 70%,
                    rgba(20,5,50,1))`,
              boxShadow: active
                ? "0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(109,40,217,0.2), inset -10px -10px 30px rgba(0,0,0,0.5)"
                : "0 0 30px rgba(109,40,217,0.3), 0 0 80px rgba(109,40,217,0.1), inset -8px -8px 24px rgba(0,0,0,0.6)",
            }}
          >
            {/* Specular highlight */}
            <div
              className="absolute rounded-full"
              style={{
                width: "35%", height: "25%",
                top: "15%", left: "20%",
                background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 100%)",
                filter: "blur(4px)",
              }}
            />
          </div>

          {/* Orbiting ring 1 */}
          <div
            className="absolute inset-0 animate-orbit preserve-3d"
            style={{ transform: "rotateX(75deg) rotateZ(0deg)" }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: `1.5px solid rgba(167,139,250,${active ? 0.6 : 0.3})`,
                boxShadow: `0 0 8px rgba(139,92,246,${active ? 0.4 : 0.15})`,
              }}
            />
          </div>

          {/* Orbiting ring 2 */}
          <div
            className="absolute animate-orbit-rev preserve-3d"
            style={{
              inset: "-12%",
              transform: "rotateX(60deg) rotateZ(0deg)",
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: `1px solid rgba(236,72,153,${active ? 0.4 : 0.15})`,
                boxShadow: `0 0 6px rgba(236,72,153,${active ? 0.3 : 0.1})`,
              }}
            />
          </div>

          {/* Equatorial belt */}
          <div
            className="absolute preserve-3d"
            style={{
              inset: "5%",
              transform: "rotateX(85deg)",
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: `1px dashed rgba(167,139,250,${active ? 0.3 : 0.1})`,
              }}
            />
          </div>

        </div>
      </div>

      {/* Status label */}
      {!faded && (
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs transition-all duration-300"
          style={{ color: active ? "rgba(167,139,250,0.8)" : "rgba(139,92,246,0.4)" }}
        >
          {active ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Generating…
            </span>
          ) : (
            "Ask me anything"
          )}
        </div>
      )}
    </div>
  );
}
