import { Link } from "react-router-dom";
import { Printer, ExternalLink, ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { TABLES, qrSrc } from "@/lib/dining";

export default function StaffTables() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        right={
          <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="print-tents-button">
            <Printer className="size-4" /> Print tents
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/staff" className={buttonVariants({ variant: "ghost", size: "sm" })} data-testid="tables-back-link">
          <ArrowLeft className="size-4" /> Back to board
        </Link>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#EA580C]">
          Front of house
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
          Table QR tents
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A89C94]">
          Print one per table. A guest scans it and lands straight on the menu locked to that table
          number.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {TABLES.map((t) => (
            <div
              key={t}
              data-testid={`table-qr-card-${t}`}
              className="rounded-2xl border border-[#3D322C] bg-[#1A1614] p-5 text-center transition-transform duration-200 ease-out hover:-translate-y-1"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A89C94]">
                Central Bar &amp; Grill
              </p>
              <p className="mt-1 font-serif text-2xl font-bold text-[#F59E0B]">Table {t}</p>
              <div className="mx-auto mt-3 rounded-xl bg-[#FAF6F3] p-3">
                <img
                  src={qrSrc(`${origin}/table/${t}`)}
                  alt={`QR code for table ${t}`}
                  className="w-full"
                  data-testid={`table-qr-image-${t}`}
                />
              </div>
              <Link
                to={`/table/${t}`}
                className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4 w-full`}
                data-testid={`table-qr-preview-link-${t}`}
              >
                <ExternalLink className="size-3.5" /> Open menu
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
