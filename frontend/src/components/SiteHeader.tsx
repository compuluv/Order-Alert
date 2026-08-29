import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

export default function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[#2E2622] bg-[#0D0B0A]/85 backdrop-blur-xl"
      data-testid="site-header"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-home-link">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[#EA580C] to-[#F59E0B] transition-transform duration-200 group-hover:rotate-6">
            <Flame className="size-5 text-[#1A1005]" />
          </span>
          <span className="leading-none">
            <span className="block font-serif text-base font-bold tracking-tight text-[#FAF6F3] sm:text-lg">
              Central Bar &amp; Grill
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#A89C94]">
              est. 2006 · Toronto
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
