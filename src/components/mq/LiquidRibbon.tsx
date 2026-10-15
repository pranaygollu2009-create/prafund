/**
 * LiquidRibbon — a full-screen canvas that paints ONE medium glossy liquid
 * band in the brand green, drifting slowly and meandering. Every few
 * seconds it picks a new random flow direction and curve, so the motion
 * wanders instead of looping one way.
 *
 * Single canvas + requestAnimationFrame; pauses when hidden; one static
 * frame under prefers-reduced-motion.
 */
import { useEffect, useRef } from "react";

const GREEN_DARK = "#2DE39F"; // brighter emerald for dark mode
const GREEN_LIGHT = "#0DBF7A"; // deeper emerald so it reads on white

/**
 * Meander state: the band's baseline follows a slow value-noise walk.
 * `target` is re-randomized every MEANDER_MS and the current values ease
 * toward it, which produces smooth, constantly-changing drift direction —
 * up, down, left-bias, right-bias — never the same loop twice.
 */
interface Meander {
  // baseline position as fraction of height
  y: number;
  targetY: number;
  // space-domain wave phase (moves the curves along the band)
  phase: number;
  targetPhase: number;
  // wave steepness multiplier (1 = gentle slope); re-rolled per meander
  curl: number;
  targetCurl: number;
  // amplitude as fraction of height
  amp: number;
  targetAmp: number;
  // secondary-wave weight
  detail: number;
  targetDetail: number;
}

const MEANDER_MS = 3800; // new direction roughly every 3.8s

export function LiquidRibbon() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c2d = ctx;

    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    // Start somewhere mid-screen with gentle motion.
    const m: Meander = {
      y: 0.42,
      targetY: rnd(0.25, 0.6),
      phase: 0,
      targetPhase: rnd(-2, 2),
      curl: 1,
      targetCurl: rnd(0.5, 1.6),
      amp: 0.08,
      targetAmp: rnd(0.05, 0.11),
      detail: 0.35,
      targetDetail: rnd(0.2, 0.5),
    };
    let lastMeander = performance.now();

    const retarget = () => {
      m.targetY = rnd(0.2, 0.68);
      m.targetPhase = m.phase + rnd(-1.6, 1.6);
      m.targetCurl = rnd(0.4, 1.7) * (Math.random() < 0.5 ? -1 : 1);
      m.targetAmp = rnd(0.04, 0.13);
      m.targetDetail = rnd(0.15, 0.55);
      lastMeander = performance.now();
    };

    let lastT = performance.now();
    let smoothT = 0;

    function waveY(x: number) {
      const k = (x / Math.max(w, 1)) * Math.PI * 2;
      const amp = m.amp * h;
      return (
        h * m.y +
        Math.sin(k * m.curl + m.phase) * amp +
        Math.sin(k * m.curl * 2.7 + m.phase * 1.6) * amp * m.detail
      );
    }

    const draw = () => {
      const green = document.documentElement.classList.contains("dark")
        ? GREEN_DARK
        : GREEN_LIGHT;
      c2d.clearRect(0, 0, w, h);
      c2d.lineCap = "round";
      c2d.lineJoin = "round";

      c2d.beginPath();
      const step = Math.max(8, Math.floor(w / 100));
      for (let x = -step, first = true; x <= w + step; x += step, first = false) {
        const y = waveY(x);
        if (first) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      }

      // Soft wide body.
      c2d.strokeStyle = green;
      c2d.globalAlpha = 0.18;
      c2d.lineWidth = 74;
      c2d.stroke();
      // Mid band for depth.
      c2d.globalAlpha = 0.3;
      c2d.lineWidth = 38;
      c2d.stroke();
      // Glossy bright crest.
      c2d.globalAlpha = 0.85;
      c2d.lineWidth = 7;
      c2d.stroke();
      c2d.globalAlpha = 1;
    };

    const loop = (t: number) => {
      if (!running) return;
      const dt = Math.min(t - lastT, 100);
      lastT = t;
      smoothT += dt;

      // Re-roll the drift target every MEANDER_MS.
      if (t - lastMeander > MEANDER_MS) retarget();

      // Ease everything toward its target (slow, watery).
      const k = 1 - Math.pow(0.94, dt / 16.7);
      m.y += (m.targetY - m.y) * k;
      m.amp += (m.targetAmp - m.amp) * k;
      m.curl += (m.targetCurl - m.curl) * k;
      m.detail += (m.targetDetail - m.detail) * k;
      m.phase += (m.targetPhase - m.phase) * k * 0.5;

      draw();
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      draw();
      // A single drift frame so a static ribbon is still positioned nicely.
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        lastT = performance.now();
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
