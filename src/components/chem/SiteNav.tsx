import { Link } from "@tanstack/react-router";
import { Atom } from "lucide-react";

const LINKS = [
  { to: "/", label: "Universe" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-neon shadow-glow">
            <Atom className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold">
            SmartChem<span className="text-gradient">Vision</span>
          </span>
        </Link>
        <nav className="no-scrollbar ml-auto flex gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border py-8 text-center text-xs text-muted-foreground">
      SmartChemVision · Live data from PubChem (NIH) · AI insights are predictions — verify before lab use.
    </footer>
  );
}
