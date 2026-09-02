import { Link } from "react-router-dom";
import { UtensilsCrossed, Martini, ArrowLeft, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import WaitBanner from "@/components/WaitBanner";
import { buttonVariants } from "@/components/ui/button";

const FOOD_IMG =
  "https://images.unsplash.com/photo-1610057098265-05f2bcbedd55?crop=entropy&cs=srgb&fm=jpg&w=900&q=80";
const DRINK_IMG =
  "https://images.unsplash.com/photo-1625321643320-5321f48312b2?crop=entropy&cs=srgb&fm=jpg&w=900&q=80";

const CHOICES = [
  {
    to: "/order/food",
    label: "Food",
    blurb: "Jerk chicken, curry goat, seafood, sides & starters",
    img: FOOD_IMG,
    icon: UtensilsCrossed,
    tid: "choose-food-button",
    accent: "#EA580C",
  },
  {
    to: "/order/drinks",
    label: "Drinks",
    blurb: "Rum punch, cocktails, daiquiris & island blends",
    img: DRINK_IMG,
    icon: Martini,
    tid: "choose-drinks-button",
    accent: "#10B981",
  },
];

/** Step 1 of ordering: food or drinks. */
export default function OrderChoice() {
  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          data-testid="choice-back-link"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#EA580C]">
          Step 1 of 2
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
          What are you after?
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[#A89C94]">
          Pick a menu to start. You can add from the other one before you send your order.
        </p>

        <div className="mt-6 max-w-xl">
          <WaitBanner compact />
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {CHOICES.map(({ to, label, blurb, img, icon: Icon, tid, accent }) => (
            <Link
              key={label}
              to={to}
              data-testid={tid}
              className="group relative overflow-hidden rounded-3xl border-2 border-[#2E2622] transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:border-[color:var(--accent-c)] focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ ["--accent-c" as string]: accent }}
            >
              <img
                src={img}
                alt={label}
                className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-72"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,11,10,0.25)_0%,rgba(13,11,10,0.88)_65%,rgba(13,11,10,0.97)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <span
                  className="grid size-11 place-items-center rounded-xl"
                  style={{ background: accent }}
                >
                  <Icon className="size-5 text-[#0D0B0A]" />
                </span>
                <h2 className="mt-3 font-serif text-3xl font-extrabold text-[#FAF6F3] sm:text-4xl">
                  {label}
                </h2>
                <p className="mt-1 text-sm text-[#C8BCB4]">{blurb}</p>
                <span
                  className="mt-3 inline-flex items-center gap-1.5 font-sans text-sm font-semibold"
                  style={{ color: accent }}
                >
                  See the {label.toLowerCase()} menu
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
