/**
 * LiquidRibbon — a full-screen canvas that paints glossy, flowing liquid
 * ribbons in the brand's emerald→sky palette, animating continuously like
 * dark water. Single canvas + requestAnimationFrame; pauses when the tab is
 * hidden; renders one static frame when prefers-reduced-motion is set.
 */
import { useEffect, useRef } from "react";

const PALETTE = {
  light: ["#38E8C8", "#19C8F2", "#7DE8F8", "#12E095"],
  dark: ["#2DD4BF", "#22D3EE", "#A5F3FC", "#34D399"],
};

interface Band {
  y: number; // 0..1 baseline across the screen height
  amp: number; // amplitude as a fraction of height
  speed: number; // phase drift per ms
  freq: number; // wave cycles across the width
  width: number; // stroke width in px
  color: number; // palette index
  alpha: number;
  phase: number;
}

const BANDS: Band[] = [
  { y: 0.34, amp: 0.105, speed: 0.00035, freq: 1.5, width: 120, color: 2, alpha: 0.28, phase: 0.0 },
  { y: 0.4, amp: 0.09, speed: -0.00028, freq: 1.9, width: 90, color: 0, alpha: 0.4, phase: 1.8 },
  { y: 0.46, amp: 0.115, speed: 0.00021, freq: 1.3, width: 64, color: 1, alpha: 0.55, phase: 3.4 },
  { y: 0.52, amp: 0.08, speed: -0.00033, freq: 2.2, width: 30, color: 1, alpha: 0.7, phase: 5.1 },
  { y: 0.58, amp: 0.095, speed: 0.00026, freq: 1.7, width: 14, color: 3, alpha: 0.65, phase: 2.6 },
  { y: 0.63, amp: 0.07, speed: -0.0004, freq: 2.7, width: 6, color: 2, alpha: 0.5, phase: 4.2 },
];

export function LiquidRibbon() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const paletteQuery = () =>
      document.documentElement.classList.contains("dark") ? PALETTE.dark : PALETTE.light;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function waveY(b: Band, x: number, t: number) {
      const amp = b.amp * h;
      const k = (x / Math.max(w, 1)) * Math.PI * 2;
      return (
        h * b.y +
        Math.sin(k * b.freq + t * b.speed * Math.PI + b.phase) * amp +
        Math.sin(k * b.freq * 2.3 - t * b.speed * 700 * Math.PI + b.phase) * amp * 0.35
      );
    }

    const c2d = ctx;
    const draw = (t: number) => {
      const palette = paletteQuery();
      c2d.clearRect(0, 0, w, h);
      c2d.lineCap = "round";
      c2d.lineJoin = "round";

      for (const b of BANDS) {
        c2d.beginPath();
        const step = Math.max(6, Math.floor(w / 120));
        for (let x = -step, first = true; x <= w + step; x += step, first = false) {
          const y = waveY(b, x, t);
          if (first) c2d.moveTo(x, y);
          else c2d.lineTo(x, y);
        }
        c2d.strokeStyle = palette[b.color]!;
        c2d.globalAlpha = b.alpha;
        c2d.lineWidth = b.width;

        // Glassy look: wide soft body + a thin bright crest on top.
        c2d.stroke();
        if (b.width > 40) {
          c2d.globalAlpha = Math.min(1, b.alpha + 0.35);
          c2d.lineWidth = Math.max(2, b.width * 0.12);
          c2d.stroke();
        }
      }
      c2d.globalAlpha = 1;
    };

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="mq-ribbon pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
