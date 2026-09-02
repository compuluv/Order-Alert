import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  UtensilsCrossed,
  TrendingUp,
  Loader2,
  Printer,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet } from "@/lib/api";
import { money, type DailyReport } from "@/lib/dining";

export default function StaffReport() {
  const [date, setDate] = useState<string>("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daily-report", date],
    queryFn: () => apiGet<DailyReport>(`/reports/daily${date ? `?date=${date}` : ""}`),
    refetchInterval: 30000,
  });

  const maxHour = Math.max(1, ...(data?.by_hour ?? []).map((h) => h.revenue));
  const maxItem = Math.max(1, ...(data?.top_items ?? []).map((i) => i.qty));

  const stats = [
    { icon: DollarSign, label: "Sales", value: data ? money(data.revenue) : "—", tid: "stat-revenue" },
    { icon: Receipt, label: "Orders", value: data ? String(data.order_count) : "—", tid: "stat-orders" },
    { icon: UtensilsCrossed, label: "Items sold", value: data ? String(data.items_sold) : "—", tid: "stat-items" },
    { icon: TrendingUp, label: "Avg order", value: data ? money(data.average_order) : "—", tid: "stat-average" },
  ];

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        backTo="/staff"
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            data-testid="print-report-button"
          >
            <Printer className="size-4" /> Print
          </Button>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/staff"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          data-testid="report-back-link"
        >
          <ArrowLeft className="size-4" /> Back to board
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#EA580C]">
              Manager
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
              Daily sales report
            </h1>
            <p className="mt-1 text-sm text-[#A89C94]" data-testid="report-date-label">
              {data ? `${data.date} · ${data.timezone}` : "Loading…"}
            </p>
          </div>
          <div>
            <Label htmlFor="report-date">Pick a day</Label>
            <Input
              id="report-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
              data-testid="report-date-input"
            />
          </div>
        </div>

        {isLoading && (
          <p className="mt-8 flex items-center gap-2 text-sm text-[#A89C94]" data-testid="report-loading">
            <Loader2 className="size-4 animate-spin" /> Crunching the numbers…
          </p>
        )}
        {isError && (
          <p
            className="mt-8 rounded-xl border border-[#3D322C] bg-[#1A1614] p-5 text-sm text-[#B5A9A1]"
            data-testid="report-error-state"
          >
            Couldn&apos;t load the report. Try again in a moment.
          </p>
        )}

        {data && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map(({ icon: Icon, label, value, tid }) => (
                <div
                  key={label}
                  data-testid={tid}
                  className="rounded-2xl border border-[#2E2622] bg-[#1A1614] p-5 transition-transform duration-200 ease-out hover:-translate-y-1"
                >
                  <Icon className="size-5 text-[#F59E0B]" />
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#A89C94]">
                    {label}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-[#FAF6F3]">{value}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-[#A89C94]" data-testid="report-collected-summary">
              <span className="font-mono text-[#10B981]">{data.collected_count}</span> collected ·{" "}
              <span className="font-mono text-[#F59E0B]">{data.outstanding_count}</span> still open
            </p>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section
                className="rounded-2xl border border-[#2E2622] bg-[#1A1614] p-5 sm:p-6"
                data-testid="report-top-items"
              >
                <h2 className="font-serif text-xl font-semibold text-[#FAF6F3]">
                  Best sellers
                </h2>
                {data.top_items.length === 0 ? (
                  <p className="mt-4 text-sm text-[#6b615a]" data-testid="report-top-items-empty">
                    No orders on this day.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {data.top_items.map((item, i) => (
                      <li key={item.name} data-testid={`report-item-${i}`}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-[#F5EFEB]">
                            <span className="font-mono text-[#A89C94]">{i + 1}.</span> {item.name}
                          </span>
                          <span className="shrink-0 font-mono text-[#F59E0B]">
                            {item.qty} · {money(item.revenue)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#241E1A]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#EA580C] to-[#F59E0B] transition-[width] duration-500"
                            style={{ width: `${(item.qty / maxItem) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                className="rounded-2xl border border-[#2E2622] bg-[#1A1614] p-5 sm:p-6"
                data-testid="report-by-category"
              >
                <h2 className="font-serif text-xl font-semibold text-[#FAF6F3]">By category</h2>
                {data.by_category.length === 0 ? (
                  <p className="mt-4 text-sm text-[#6b615a]">Nothing sold yet.</p>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {data.by_category.map((c) => (
                      <li
                        key={c.name}
                        className="flex items-baseline justify-between border-b border-[#241E1A] pb-2 text-sm last:border-0"
                        data-testid={`report-category-${c.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <span className="text-[#D6CBC3]">{c.name}</span>
                        <span className="font-mono text-[#F5EFEB]">
                          {c.qty} items · {money(c.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section
              className="mt-6 rounded-2xl border border-[#2E2622] bg-[#1A1614] p-5 sm:p-6"
              data-testid="report-by-hour"
            >
              <h2 className="font-serif text-xl font-semibold text-[#FAF6F3]">Busiest hours</h2>
              {data.by_hour.length === 0 ? (
                <p className="mt-4 text-sm text-[#6b615a]">No orders on this day.</p>
              ) : (
                <div className="mt-6 flex items-end gap-2 overflow-x-auto pb-2">
                  {data.by_hour.map((h) => (
                    <div
                      key={h.hour}
                      className="flex min-w-12 flex-1 flex-col items-center gap-2"
                      data-testid={`report-hour-${h.hour.replace(":", "")}`}
                    >
                      <span className="font-mono text-[10px] text-[#A89C94]">{money(h.revenue)}</span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-[#EA580C] to-[#F59E0B] transition-[height] duration-500"
                        style={{ height: `${Math.max(6, (h.revenue / maxHour) * 140)}px` }}
                      />
                      <span className="font-mono text-[10px] text-[#D6CBC3]">{h.hour}</span>
                      <span className="font-mono text-[10px] text-[#6b615a]">{h.orders}x</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
