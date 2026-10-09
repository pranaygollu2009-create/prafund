import { Link } from "@tanstack/react-router";
import { HelpCircle, Menu, Moon, Sun, UserRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DISCLAIMER, SUPPORT_EMAIL } from "@/lib/mq/data";
import { useSession } from "@/lib/mq/auth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/dashboard", label: "Simulator" },
  { to: "/markets", label: "Markets" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/invest", label: "Invest" },
  { to: "/learn", label: "Learn" },
  { to: "/reviews", label: "Reviews" },
  { to: "/users", label: "Community" },
  { to: "/help", label: "Help" },
  { to: "/about", label: "About" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden
        className="h-9 w-auto shrink-0"
      />
      <span className="font-display text-lg font-bold tracking-tight">Prafund</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useSession();

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="mq-liquid" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">

        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/help"
              aria-label="Help center"
              className="hidden size-9 place-items-center rounded-md border border-border text-info transition-colors hover:bg-info-soft sm:grid"
            >
              <HelpCircle className="size-4" aria-hidden />
            </Link>
            {user ? (
              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold sm:flex"
              >
                <UserRound className="size-4" aria-hidden />
                My profile
              </Link>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: undefined, mode: undefined }}
                className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground sm:block"
              >
                Log In
              </Link>
            )}
            <Link
              to={user ? "/dashboard" : "/start"}
              className="hidden rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] sm:block"
            >
              {user ? "Continue" : "Start Playing"}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded-md border border-border lg:hidden"
            >
              {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-border bg-background px-4 pb-4 lg:hidden">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-3 text-base font-medium text-foreground"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to={user ? "/profile" : "/auth"}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-3 text-base font-medium text-foreground"
            >
              {user ? "My profile" : "Log In"}
            </Link>
            <Link
              to={user ? "/dashboard" : "/start"}
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-md bg-primary px-4 py-3 text-center text-base font-semibold text-primary-foreground"
            >
              {user ? "Continue" : "Start Playing"}
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1 pb-24 lg:pb-0">{children}</main>

      <footer className="border-t border-border bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">Learn money by making decisions.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Explore</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/how-it-works">How It Works</Link>
              </li>
              <li>
                <Link to="/help">Help Center</Link>
              </li>
              <li>
                <Link to="/learn">Glossary &amp; Lessons</Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Support</p>
            <a className="mt-3 block break-all text-info" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <div className="border-t border-border px-4 py-6">
          <p className="mx-auto max-w-6xl text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
        </div>
      </footer>

      <MobileTabs />
      </div>
    </div>

  );
}

function MobileTabs() {
  const tabs = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Journey" },
    { to: "/markets", label: "Markets" },
    { to: "/invest", label: "Invest" },
    { to: "/learn", label: "Learn" },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/85 backdrop-blur-xl lg:hidden">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeProps={{ className: "text-primary font-semibold" }}
          className="py-3 text-center text-xs text-muted-foreground"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("fundition.theme", next ? "dark" : "light");
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid size-9 place-items-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary"
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
