/**
 * LiquidRibbon — a full-screen canvas that paints ONE volumetric liquid
 * wave, shaded like 3D glass: soft body, depth core, glossy crest, and a
 * specular highlight that slides along the curve. The motion NEVER stops:
 * the wave continuously travels through the band, and the baseline drifts
 * on a slow never-ending noise walk (no pause-and-restart — targets blend
 * seamlessly forever).
 *
 * Single canvas + requestAnimationFrame; pauses when hidden; one static
 * frame under prefers-reduced-motion.
 */
import { useEffect, useRef } from "react";

const GREEN_LIGHT = "#4ED9A4"; // soft mint that blends into white pages
const GREEN_DARK = "#2DE39F"; // brighter emerald for dark mode

/**
 * `paused` freezes the wave in place (and shows a still frame) when the
 * user turns animations off from the header toggle.
 */
export function LiquidRibbon({ paused = false }: { paused?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c2d = ctx;

    let raf = 0;
    let running = true;
    let stoppedByPref = false;
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
      // Resetting width clears the buffer — repaint the still frame so the
      // paused/reduced-motion band never shows as an empty canvas.
      if (!running) draw(0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* Continuous motion model
     * -----------------------
     * travel:  the wave pattern slides horizontally through the band at a
     *          constant slow speed (this is the "flowing water" part — it
     *          never pauses or reverses).
     * walk:    three superposed slow sine drifts on the baseline height,
     *          amplitude and curl, each with its own long period and random
     *          phase. Because the walk terms are sum-of-sines, the baseline
     *          wanders forever without snapping or stopping.
     */
    const SPEED = 0.00006; // wave pattern travel (px-frac per ms) — slow flow
    const P1 = 21000; // long drift period ms (baseline)
    const P2 = 13000; // medium drift period ms (amplitude)
    const P3 = 17000; // med drift period ms (curl)
    const seed = Math.random() * 1000;

    function waveState(t: number) {
      const a = (2 * Math.PI * t) / P1 + seed;
      const b = (2 * Math.PI * t) / P2 + seed * 2.7;
      const c = (2 * Math.PI * t) / P3 + seed * 4.1;
      return {
        y: 0.44 + 0.16 * Math.sin(a) * Math.sin(a * 0.7 + 1.3), // baseline walk
        amp: 0.075 + 0.045 * (0.5 + 0.5 * Math.sin(b)), // breathing amplitude
        curl: 1.35 + 0.8 * Math.sin(c), // waving steepness
        detail: 0.32 + 0.16 * Math.sin(b * 1.6 + 2.0), // secondary ripple weight
      };
    }

    /** Volumetric baseline y(x, t). */
    function yAt(x: number, t: number, s: ReturnType<typeof waveState>) {
      const k = (x / Math.max(w, 1)) * Math.PI * 2;
      const phase = k * s.curl - t * SPEED;
      const amp = s.amp * h;
      return (
        h * s.y +
        Math.sin(phase) * amp +
        Math.sin(phase * 2.7 + k * 0.8) * amp * s.detail
      );
    }

    const draw = (t: number) => {
      const isDark = document.documentElement.classList.contains("dark");
      const green = isDark ? GREEN_DARK : GREEN_LIGHT;
      const s = waveState(t);
      c2d.clearRect(0, 0, w, h);
      c2d.lineCap = "round";
      c2d.lineJoin = "round";

      const step = Math.max(6, Math.floor(w / 130));

      const trace = () => {
        c2d.beginPath();
        for (let x = -step, first = true; x <= w + step; x += step, first = false) {
          const y = yAt(x, t, s);
          if (first) c2d.moveTo(x, y);
          else c2d.lineTo(x, y);
        }
      };

      // 1) Shadow: soft under-glow gives the band lift off the page.
      //    Light mode uses a pale mint glow (never black) so it blends;
      //    dark mode keeps the deep green-black depth vein.
      trace();
      c2d.strokeStyle = isDark
        ? "rgba(0, 40, 25, 0.55)"
        : "rgba(78, 217, 164, 0.28)";
      c2d.save();
      c2d.translate(0, 16);
      c2d.globalAlpha = isDark ? 0.5 : 0.55;
      c2d.lineWidth = 80;
      c2d.stroke();
      c2d.restore();

      // 2) Volumetric body: same path, three thickness layers = fake 3D
      //    shading so the band looks rounded like a glass tube. Layer
      //    opacity is tuned per theme: airy on white, denser on dark.
      trace();
      c2d.globalAlpha = isDark ? 0.16 : 0.13;
      c2d.lineWidth = 96;
      c2d.stroke();
      c2d.globalAlpha = isDark ? 0.34 : 0.26;
      c2d.lineWidth = 54;
      c2d.stroke();
      c2d.globalAlpha = isDark ? 0.75 : 0.55;
      c2d.lineWidth = 26;
      c2d.stroke();

      // 3) Glossy crest.
      trace();
      c2d.globalAlpha = isDark ? 0.95 : 0.8;
      c2d.strokeStyle = green;
      c2d.lineWidth = 8;
      c2d.stroke();

      // 4) Specular highlight: a short bright streak that slides along the
      //    curve — the detail that sells the 3D glass look.
      const hlX = w * (0.12 + 0.76 * (0.5 + 0.5 * Math.sin(t * SPEED * 0.9)));
      const span = w * 0.16;
      c2d.save();
      c2d.beginPath();
      for (let x = hlX - span / 2, first = true; x <= hlX + span / 2; x += step, first = false) {
        const y = yAt(x, t, s);
        if (first) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      }
      const grad = c2d.createLinearGradient(hlX - span / 2, 0, hlX + span / 2, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.85)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      c2d.strokeStyle = grad;
      c2d.lineWidth = 4;
      c2d.globalAlpha = 0.9;
      c2d.stroke();
      c2d.restore();

      c2d.globalAlpha = 1;
    };

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    if (reduced || paused) {
      stoppedByPref = true;
      running = false;
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced && !stoppedByPref) {
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
  }, [paused]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="mq-ribbon pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
