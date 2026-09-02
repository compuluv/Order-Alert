import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, QrCode, Search, Timer, Loader2, Lock, Tv, MessageSquare, BarChart3, ClipboardList, AlertTriangle, BellRing, Martini } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPatch } from "@/lib/api";
import {
  STATUS_LABEL,
  STAFF_PIN_KEY,
  elapsed,
  isDrinkLine,
  money,
  playChime,
  type Order,
  type OrderStatus,
} from "@/lib/dining";

const UNPAID_WARN_MINUTES = 4;

const minutesSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

const COLUMNS: {
  status: OrderStatus;
  title: string;
  accent: string;
  next?: OrderStatus;
  cta?: string;
}[] = [
  {
    status: "received",
    title: "New — needs payment",
    accent: "#6366F1",
    next: "pay_now",
    cta: "PING guest to pay",
  },
  {
    status: "pay_now",
    title: "Pinged — waiting on payment",
    accent: "#EF4444",
    next: "preparing",
    cta: "Paid — start cooking",
  },
  {
    status: "preparing",
    title: "In the kitchen",
    accent: "#F59E0B",
    next: "ready",
    cta: "PING guest to collect",
  },
  {
    status: "ready",
    title: "Ready — waiting at counter",
    accent: "#10B981",
    next: "served",
    cta: "Collected",
  },
];

export default function StaffBoard() {
  const qc = useQueryClient();
  const [sound, setSound] = useState(true);
  const [q, setQ] = useState("");
  const knownIds = useRef<Set<string> | null>(null);

  const { data: orders, isError, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/orders"),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!orders) return;
    const ids = new Set(orders.map((o) => o.id));
    if (knownIds.current) {
      const fresh = orders.filter((o) => !knownIds.current?.has(o.id) && o.status === "received");
      if (fresh.length > 0) {
        if (sound) playChime("new");
        toast.info(`${fresh.length} new order${fresh.length > 1 ? "s" : ""} in`, {
          description: fresh.map((o) => `${o.code} · ${o.customer_name}`).join(", "),
        });
      }
    }
    knownIds.current = ids;
  }, [orders, sound]);

  const { data: smsInfo } = useQuery({
    queryKey: ["sms-status"],
    queryFn: () => apiGet<{ configured: boolean }>("/sms/status"),
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiPatch<Order>(`/orders/${id}/status`, { status }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      toast.success(`${order.code} → ${STATUS_LABEL[order.status]}`);
    },
    onError: () => toast.error("Could not update that ticket."),
  });

  const rePing = useMutation({
    mutationFn: (id: string) => apiPatch<Order>(`/orders/${id}/status`, { status: "pay_now" }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      toast.warning(`Pinged ${order.customer_name} again to pay`, {
        description: `${order.code} · ${money(order.total)}`,
      });
    },
    onError: () => toast.error("Could not re-ping that guest."),
  });

  const drinksPending = (orders ?? []).filter(
    (o) =>
      (o.status === "preparing" || o.status === "ready") &&
      !o.drinks_done &&
      o.lines.some(isDrinkLine),
  );

  const drinksDone = useMutation({
    mutationFn: (id: string) => apiPatch<Order>(`/orders/${id}/drinks-done`, {}),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Drinks poured for ${order.customer_name}`);
    },
    onError: () => toast.error("Could not update the bar ticket."),
  });

  const filtered = (orders ?? []).filter((o) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      o.code.toLowerCase().includes(term) || o.customer_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        backTo="/"
        right={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSound((s) => !s);
                if (!sound) playChime("new");
              }}
              data-testid="staff-sound-toggle-button"
            >
              {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />}
              Alerts
            </Button>
            <Link
              to="/staff/menu"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              data-testid="staff-menu-link"
            >
              <ClipboardList className="size-4" /> Menu
            </Link>
            <Link
              to="/staff/report"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              data-testid="staff-report-link"
            >
              <BarChart3 className="size-4" /> Sales
            </Link>
            <Link
              to="/counter"
              target="_blank"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              data-testid="counter-display-link"
            >
              <Tv className="size-4" /> Counter TV
            </Link>
            <Link
              to="/staff/qr"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              data-testid="staff-tables-link"
            >
              <QrCode className="size-4" /> Order QR
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem(STAFF_PIN_KEY);
                window.location.reload();
              }}
              data-testid="staff-lock-button"
            >
              <Lock className="size-4" /> Lock
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#EA580C]">
              Kitchen &amp; bar command centre
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
              Live orders
            </h1>
            <p
              className="mt-2 flex items-center gap-1.5 text-xs text-[#A89C94]"
              data-testid="sms-mode-indicator"
            >
              <MessageSquare className="size-3.5" />
              {smsInfo?.configured
                ? "Texts are live — guests get an SMS when you ping them"
                : "SMS in demo mode — add Twilio keys to send real texts"}
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A89C94]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code or name"
              className="pl-9"
              data-testid="staff-search-input"
            />
          </div>
        </div>

        {isLoading && (
          <p className="mt-8 flex items-center gap-2 text-sm text-[#A89C94]" data-testid="staff-loading">
            <Loader2 className="size-4 animate-spin" /> Loading the board…
          </p>
        )}
        {isError && (
          <p
            className="mt-8 rounded-xl border border-[#3D322C] bg-[#1A1614] p-5 text-sm text-[#B5A9A1]"
            data-testid="staff-error-state"
          >
            The order feed is offline. Ticket printing continues at the pass.
          </p>
        )}

        {drinksPending.length > 0 && (
          <section
            className="mt-8 rounded-2xl border-2 border-[#38BDF8] bg-[#0d1f28] p-5"
            data-testid="bar-drinks-panel"
          >
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#7DD3FC]">
              <Martini className="size-6" /> Bar — pour these now
              <span
                className="ml-auto rounded-full bg-[#0c4a6e] px-3 py-0.5 font-mono text-sm text-[#7DD3FC]"
                data-testid="bar-drinks-count"
              >
                {drinksPending.length}
              </span>
            </h2>
            <p className="mt-1 text-sm text-[#94b8c9]">
              Paid — send drinks out straight away while the food cooks.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {drinksPending.map((o) => (
                <div
                  key={o.id}
                  data-testid={`bar-ticket-${o.code}`}
                  className="rounded-xl border border-[#0369A1] bg-[#0b1922] p-4"
                >
                  <p className="break-words font-serif text-xl font-extrabold text-[#E0F2FE]">
                    {o.customer_name}
                  </p>
                  <p className="font-mono text-xs tracking-widest text-[#7DD3FC]">{o.code}</p>
                  <ul className="mt-2 space-y-1">
                    {o.lines.filter(isDrinkLine).map((l, i) => (
                      <li key={`${l.item_id}-${i}`} className="text-base text-[#CFEAF7]">
                        <span className="font-mono text-[#7DD3FC]">{l.qty}×</span> {l.name}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className="mt-3 w-full !bg-[#0284C7] text-base font-bold hover:!bg-[#0369A1]"
                    disabled={drinksDone.isPending}
                    onClick={() => drinksDone.mutate(o.id)}
                    data-testid={`bar-drinks-done-button-${o.code}`}
                  >
                    Drinks poured
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((o) => o.status === col.status);
            return (
              <section
                key={col.status}
                data-testid={`staff-column-${col.status}`}
                className="rounded-2xl border border-[#2E2622] bg-[#131010] p-4"
              >
                <header className="flex items-center gap-2 border-b border-[#2E2622] pb-3">
                  <span className="size-2.5 rounded-full" style={{ background: col.accent }} />
                  <h2 className="font-serif text-lg font-semibold text-[#FAF6F3]">{col.title}</h2>
                  <span
                    className="ml-auto rounded-full bg-[#241E1A] px-2.5 py-0.5 font-mono text-xs text-[#F59E0B]"
                    data-testid={`staff-column-count-${col.status}`}
                  >
                    {items.length}
                  </span>
                </header>
                <div className="mt-4 space-y-3">
                  {items.length === 0 && (
                    <p className="py-6 text-center text-sm text-[#6b615a]" data-testid={`staff-empty-${col.status}`}>
                      Nothing here
                    </p>
                  )}
                  {items.map((o) => {
                    const waitingMins = minutesSince(o.updated_at);
                    const overdue = col.status === "pay_now" && waitingMins >= UNPAID_WARN_MINUTES;
                    return (
                    <article
                      key={o.id}
                      data-testid={`staff-ticket-${o.code}`}
                      className={`animate-slidein rounded-xl border p-4 ${
                        overdue
                          ? "border-[#EF4444] bg-[#2b1211] animate-chime"
                          : "border-[#3D322C] bg-[#1A1614]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <p
                          className="min-w-0 flex-1 break-words font-serif text-2xl font-extrabold leading-tight text-[#FAF6F3]"
                          data-testid={`staff-ticket-name-${o.code}`}
                        >
                          {o.customer_name}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-[#A89C94]">
                          <Timer className="size-3" /> {elapsed(o.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs tracking-widest text-[#F59E0B]">
                        {o.code}
                      </p>
                      {overdue && (
                        <p
                          className="mt-2 flex items-center gap-1.5 rounded-md bg-[#7F1D1D] px-2 py-1.5 text-xs font-bold text-[#FEE2E2]"
                          data-testid={`unpaid-warning-${o.code}`}
                        >
                          <AlertTriangle className="size-3.5" />
                          Pinged {waitingMins}m ago — still not paid
                        </p>
                      )}
                      <ul className="mt-3 space-y-1">
                        {o.lines.map((l, i) => (
                          <li key={`${l.item_id}-${i}`} className="text-sm text-[#D6CBC3]">
                            <span className="font-mono text-[#F59E0B]">{l.qty}×</span> {l.name}
                            {l.option && <span className="text-[#A89C94]"> · {l.option}</span>}
                          </li>
                        ))}
                      </ul>
                      {o.notes && (
                        <p className="mt-2 rounded-md bg-[#241E1A] p-2 text-xs italic text-[#F59E0B]">
                          {o.notes}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-sm text-[#B5A9A1]">{money(o.total)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {col.status === "pay_now" && (
                            <Button
                              size="default"
                              variant="outline"
                              className={overdue ? "text-sm font-bold !border-[#EF4444] !text-[#FCA5A5]" : "text-sm font-bold"}
                              disabled={rePing.isPending}
                              onClick={() => rePing.mutate(o.id)}
                              data-testid={`re-ping-button-${o.code}`}
                            >
                              <BellRing className="size-3.5" /> Ping again
                            </Button>
                          )}
                          {col.next && (
                          <Button
                            size="lg"
                            className={
                              col.status === "received"
                                ? "!bg-[#EF4444] text-base font-bold hover:!bg-[#DC2626]"
                                : "text-base font-bold"
                            }
                            disabled={advance.isPending}
                            onClick={() => advance.mutate({ id: o.id, status: col.next as OrderStatus })}
                            data-testid={`staff-advance-button-${o.code}`}
                          >
                            {col.cta}
                          </Button>
                        )}
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
