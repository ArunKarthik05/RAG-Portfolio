"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  alpha: number;
}

export function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 14000));
    particles.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const onMouseMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMouseMove);

    const MAX_DIST = 130;
    const MOUSE_DIST = 110;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const pts = particles.current;

      for (const p of pts) {
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_DIST && d > 0) {
          const force = (MOUSE_DIST - d) / MOUSE_DIST * 0.5;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.alpha})`;
        ctx.fill();
      }

      raf.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 90% 70% at 15% 10%, #1a0533 0%, #08070f 55%, #050308 100%)",
      }} />
      {/* Purple orbs */}
      <div className="absolute animate-drift" style={{
        width: 700, height: 700, top: "-15%", left: "-10%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(109,40,217,0.2) 0%, transparent 70%)",
        filter: "blur(60px)",
      }} />
      <div className="absolute animate-drift" style={{
        width: 500, height: 500, bottom: "0%", right: "-5%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
        filter: "blur(50px)", animationDelay: "8s",
      }} />
      <div className="absolute" style={{
        width: 400, height: 400, top: "35%", left: "45%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)",
        filter: "blur(60px)",
      }} />
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Subtle scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
      }} />
    </div>
  );
}
