import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { QrCode, ChefHat, ArrowRight, Music, Fish, Disc3 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TABLES } from "@/lib/dining";

const HERO =
  "https://images.unsplash.com/photo-1632852576480-c10a8e19496a?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80";

const NIGHTS = [
  { icon: Music, day: "Wednesdays", title: "Karaoke Night", desc: "Sing your heart out, 8pm till late" },
  { icon: Fish, day: "Thursdays", title: "Seafood & Ladies Night", desc: "Garlic butter crab & lobster specials" },
  { icon: Disc3, day: "Sundays", title: "Oldies Sundays", desc: "Reggae, lovers rock & soul vibes" },
];

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        right={
          <Link
            to="/staff"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            data-testid="header-staff-link"
          >
            <ChefHat className="size-4" /> Staff
          </Link>
        }
      />

      <section className="relative overflow-hidden border-b border-[#2E2622]">
        <img
          src={HERO}
          alt="Jerk chicken platter"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,11,10,0.86)_0%,rgba(13,11,10,0.72)_50%,rgba(13,11,10,0.97)_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:py-24">
          <div className="animate-rise">
            <Badge className="bg-[#EA580C] text-white" data-testid="hero-badge">
              Scan · Order · Get Pinged
            </Badge>
            <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.05] tracking-tight text-[#FAF6F3] sm:text-5xl lg:text-[3.5rem]">
              Bold Caribbean flavours,
              <span className="block text-[#F59E0B]">served without the wait.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#D6CBC3]">
              Scan the QR tent on your table, order jerk chicken, curry goat or a rum punch right
              from your phone, and we&apos;ll ring your phone the moment it leaves the kitchen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/table/1"
                className={buttonVariants({ size: "lg" })}
                data-testid="hero-start-order-button"
              >
                <QrCode className="size-4" /> Start an order
              </Link>
              <Link
                to="/staff/tables"
                className={buttonVariants({ variant: "outline", size: "lg" })}
                data-testid="hero-table-qr-link"
              >
                Table QR codes <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="animate-rise rounded-2xl border border-[#3D322C] bg-[#1A1614]/85 p-5 shadow-2xl shadow-black/50 backdrop-blur-md sm:p-6">
            <h2 className="font-serif text-xl font-semibold text-[#FAF6F3]">Sat down already?</h2>
            <p className="mt-1 text-sm text-[#A89C94]">Pick your table number to open the menu.</p>
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
              {TABLES.map((t) => (
                <Link
                  key={t}
                  to={`/table/${t}`}
                  data-testid={`home-table-${t}-link`}
                  className="grid h-12 place-items-center rounded-lg border border-[#3D322C] bg-[#241E1A] font-mono text-sm font-bold text-[#F5EFEB] transition-colors duration-150 hover:border-[#EA580C] hover:bg-[#EA580C] hover:text-white"
                >
                  {t}
                </Link>
              ))}
            </div>

            <div className="mt-6 border-t border-[#2E2622] pt-5">
              <Label htmlFor="claim-code" className="text-[#D6CBC3]">
                Scanned your receipt QR? Track an order
              </Label>
              <form
                className="mt-2 flex gap-2"
                data-testid="track-order-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim()) navigate(`/status/${code.trim().toUpperCase()}`);
                }}
              >
                <Input
                  id="claim-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CB-1234"
                  className="font-mono"
                  data-testid="track-order-code-input"
                />
                <Button type="submit" variant="secondary" data-testid="track-order-submit-button">
                  Track
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-[#F5EFEB] sm:text-3xl">
          Weekly vibes
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {NIGHTS.map(({ icon: Icon, day, title, desc }) => (
            <div
              key={day}
              data-testid={`night-card-${day.toLowerCase()}`}
              className="rounded-xl border border-[#2E2622] bg-[#1A1614] p-5 transition-transform duration-200 ease-out hover:-translate-y-1 hover:border-[#3D322C]"
            >
              <Icon className="size-6 text-[#F59E0B]" />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#EA580C]">
                {day}
              </p>
              <h3 className="mt-1 font-serif text-lg font-semibold text-[#FAF6F3]">{title}</h3>
              <p className="mt-1 text-sm text-[#A89C94]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#2E2622] px-4 py-8 text-center text-sm text-[#A89C94] sm:px-6">
        2007 Lawrence Ave W, Toronto · Open Wed–Mon 12:00pm – 2:00am
      </footer>
    </div>
  );
}
