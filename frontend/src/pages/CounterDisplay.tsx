import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CookingPot, BellRing, CreditCard } from "lucide-react";
import { apiGet } from "@/lib/api";
import { elapsed, money, type Order } from "@/lib/dining";

/**
 * Big-screen display for the TV above the counter.
 * Ready orders stay up until staff mark them collected; new arrivals flash in.
 */
export default function CounterDisplay() {
  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/orders"),
    refetchInterval: 4000,
  });

  const ready = (orders ?? []).filter((o) => o.status === "ready");
  const payNow = (orders ?? []).filter((o) => o.status === "pay_now");
  const cooking = (orders ?? []).filter(
    (o) => o.status === "received" || o.status === "preparing",
  );

  // Track which codes are newly ready so they can flash in.
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);

  useEffect(() => {
    if (!orders) return;
    // First load: adopt whatever is already ready without flashing the whole board.
    if (seen.current === null) {
      seen.current = new Set(ready.map((o) => o.code));
      return;
    }
    const known = seen.current;
    const incoming = ready.filter((o) => !known.has(o.code)).map((o) => o.code);
    if (incoming.length) {
      setFresh((f) => [...f, ...incoming]);
      incoming.forEach((c) => known.add(c));
      const t = window.setTimeout(
        () => setFresh((f) => f.filter((c) => !incoming.includes(c))),
        12000,
      );
      return () => clearTimeout(t);
    }
  }, [orders, ready]);

  return (
    <div className="min-h-screen bg-[#0D0B0A] p-6 lg:p-10" data-testid="counter-display">
      <header className="flex items-baseline justify-between border-b-2 border-[#2E2622] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#EA580C] lg:text-sm">
            Central Bar &amp; Grill
          </p>
          <h1 className="mt-1 font-serif text-4xl font-extrabold tracking-tight text-[#FAF6F3] lg:text-6xl">
            Order Pickup
          </h1>
        </div>
        <p className="text-right font-sans text-lg text-[#A89C94] lg:text-2xl">
          Pay &amp; collect
          <span className="block font-serif font-bold text-[#F59E0B]">at the counter</span>
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        {/* NOW SERVING */}
        <section data-testid="counter-ready-section">
          <h2 className="flex items-center gap-3 font-serif text-3xl font-bold text-[#10B981] lg:text-4xl">
            <BellRing className="size-8 lg:size-10" /> NOW SERVING
          </h2>
          {ready.length === 0 ? (
            <p
              className="mt-8 rounded-3xl border-2 border-dashed border-[#2E2622] p-12 text-center font-sans text-2xl text-[#6b615a]"
              data-testid="counter-ready-empty"
            >
              No orders waiting
            </p>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {ready.map((o) => {
                const isNew = fresh.includes(o.code);
                return (
                  <li
                    key={o.id}
                    data-testid={`counter-ready-${o.code}`}
                    className={`rounded-3xl border-4 p-5 text-center lg:p-7 ${
                      isNew
                        ? "animate-flashcard border-[#FAFFFE]"
                        : "border-[#10B981] bg-[#10B981]"
                    }`}
                  >
                    <p
                      className="break-words font-serif text-3xl font-extrabold leading-tight text-[#022C22] lg:text-5xl"
                      data-testid={`counter-ready-name-${o.code}`}
                    >
                      {o.customer_name}
                    </p>
                    <p
                      className="mt-2 font-mono text-base font-bold tracking-widest text-[#064E3B] lg:text-xl"
                      data-testid={`counter-ready-code-${o.code}`}
                    >
                      {o.code}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* COME PAY */}
        <section data-testid="counter-pay-section">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-[#EF4444] lg:text-2xl">
            <CreditCard className="size-6" /> Come pay now
          </h2>
          {payNow.length === 0 ? (
            <p
              className="mt-5 rounded-xl border border-[#2E2622] p-6 text-center text-base text-[#6b615a]"
              data-testid="counter-pay-empty"
            >
              Nobody waiting to pay
            </p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {payNow.map((o) => (
                <li
                  key={o.id}
                  data-testid={`counter-pay-${o.code}`}
                  className="flex items-center gap-3 rounded-xl border-2 border-[#EF4444] bg-[#2b1211] px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate font-serif text-xl font-bold text-[#FECACA] lg:text-2xl">
                    {o.customer_name}
                  </span>
                  <span className="font-mono text-sm text-[#FCA5A5]">{o.code}</span>
                  <span className="font-mono text-sm font-bold text-[#FAFFFE]">
                    {money(o.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* STILL COOKING */}
        <section data-testid="counter-cooking-section">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-[#F59E0B] lg:text-2xl">
            <CookingPot className="size-6" /> Still cooking
          </h2>
          {cooking.length === 0 ? (
            <p
              className="mt-5 rounded-xl border border-[#2E2622] p-6 text-center text-base text-[#6b615a]"
              data-testid="counter-cooking-empty"
            >
              Kitchen&apos;s all caught up
            </p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {cooking.map((o) => (
                <li
                  key={o.id}
                  data-testid={`counter-cooking-${o.code}`}
                  className="flex items-center gap-3 rounded-xl border border-[#3D322C] bg-[#1A1614] px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-[#F5EFEB] lg:text-xl">
                    {o.customer_name}
                  </span>
                  <span className="font-mono text-sm text-[#F59E0B]">{o.code}</span>
                  <span className="font-mono text-sm text-[#A89C94]">{elapsed(o.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
