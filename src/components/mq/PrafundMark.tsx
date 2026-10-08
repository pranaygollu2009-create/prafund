/**
 * The Prafund brand mark: a "P" whose bowl is a coin — the fund in one glyph —
 * on an emerald-to-sky gradient drawn from the app's gain and info accents.
 * Fixed brand colors by design, so it looks identical in light and dark mode.
 */
export function PrafundMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Prafund"
    >
      <defs>
        <linearGradient id="prafund-mark" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#prafund-mark)" />
      <path d="M22.5 13.5v37" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <circle cx="36.5" cy="24" r="11" stroke="#fff" strokeWidth="7" />
    </svg>
  );
}
