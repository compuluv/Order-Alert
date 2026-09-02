import { Link } from "react-router-dom";
import { Flame, ArrowLeft } from "lucide-react";

/**
 * Shared top bar. `backTo` renders a Back button on the left (pass null to hide it,
 * e.g. on the landing page where there's nowhere to go back to).
 */
export default function SiteHeader({
  right,
  backTo = "/",
}: {
  right?: React.ReactNode;
  backTo?: string | null;
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[#2E2622] bg-[#0D0B0A]/85 backdrop-blur-xl"
      data-testid="site-header"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 lg:px-8">
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#3D322C] bg-[#1A1614] px-3 py-2 font-sans text-sm font-bold text-[#F5EFEB] transition-colors duration-150 hover:border-[#F59E0B] hover:text-[#F59E0B] sm:px-4 sm:text-base"
            data-testid="header-back-button"
          >
            <ArrowLeft className="size-5" /> Back
          </Link>
        )}

        <Link to="/" className="group flex min-w-0 items-center gap-2" data-testid="brand-home-link">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#EA580C] to-[#F59E0B] transition-transform duration-200 group-hover:rotate-6 sm:size-9">
            <Flame className="size-4 text-[#1A1005] sm:size-5" />
          </span>
          <span className="min-w-0 leading-none">
            <span className="block truncate font-serif text-sm font-bold tracking-tight text-[#FAF6F3] sm:text-lg">
              Central Bar &amp; Grill
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[#A89C94] sm:block">
              est. 2006 · Toronto
            </span>
          </span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}
