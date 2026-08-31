import { Link } from "react-router-dom";
import { Printer, ExternalLink, ArrowLeft, ScanLine } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { qrSrc } from "@/lib/dining";

/** A single "Scan to order" poster — no table numbers, one QR for the whole room. */
export default function StaffQr() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const orderUrl = `${origin}/order`;

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            data-testid="print-poster-button"
          >
            <Printer className="size-4" /> Print poster
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/staff"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          data-testid="qr-back-link"
        >
          <ArrowLeft className="size-4" /> Back to board
        </Link>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#EA580C]">
          Front of house
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
          Scan-to-order poster
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A89C94]">
          One QR for the whole room — print a few and put them on the tables, the bar and by the
          door. Every scan opens the same menu; guests pay and collect at the counter.
        </p>

        <div
          className="mx-auto mt-8 max-w-md rounded-3xl border-4 border-[#EA580C] bg-[#1A1614] p-7 text-center"
          data-testid="order-qr-poster"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#A89C94]">
            Central Bar &amp; Grill
          </p>
          <h2 className="mt-2 font-serif text-3xl font-extrabold leading-tight text-[#F59E0B]">
            Scan to order
          </h2>
          <p className="mt-1 text-sm text-[#D6CBC3]">
            Order from your phone — no queue, no waiting for a server.
          </p>
          <div className="mx-auto mt-5 rounded-2xl bg-[#FAF6F3] p-4">
            <img
              src={qrSrc(orderUrl)}
              alt="QR code to open the menu"
              className="w-full"
              data-testid="order-qr-image"
            />
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-[#A7F3D0]">
            <ScanLine className="size-4" />
            <span className="text-sm font-semibold">
              We&apos;ll alert your phone when it&apos;s ready
            </span>
          </div>
          <p className="mt-2 text-xs text-[#A89C94]">Then pay &amp; collect at the counter.</p>
        </div>

        <Link
          to="/order"
          className={`${buttonVariants({ variant: "outline" })} mx-auto mt-6 flex max-w-md`}
          data-testid="qr-preview-link"
        >
          <ExternalLink className="size-3.5" /> Preview what guests see
        </Link>
      </div>
    </div>
  );
}
