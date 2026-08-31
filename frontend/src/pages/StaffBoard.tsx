import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, QrCode, Search, Timer, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPatch } from "@/lib/api";
import {
  STATUS_LABEL,
  STAFF_PIN_KEY,
  elapsed,
  money,
  playChime,
  type Order,
  type OrderStatus,
} from "@/lib/dining";

const COLUMNS: { status: OrderStatus; title: string; accent: string; next?: OrderStatus; cta?: string }[] = [
  { status: "received", title: "New tickets", accent: "#6366F1", next: "preparing", cta: "Start cooking" },
  { status: "preparing", title: "In the kitchen", accent: "#F59E0B", next: "ready", cta: "PING guest to collect" },
  { status: "ready", title: "Pinged — waiting at counter", accent: "#10B981", next: "served", cta: "Paid & collected" },
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

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
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
                  {items.map((o) => (
                    <article
                      key={o.id}
                      data-testid={`staff-ticket-${o.code}`}
                      className="animate-slidein rounded-xl border border-[#3D322C] bg-[#1A1614] p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-extrabold tracking-wider text-[#F59E0B]">
                          {o.code}
                        </span>
                        <span className="ml-auto flex items-center gap-1 font-mono text-xs text-[#A89C94]">
                          <Timer className="size-3" /> {elapsed(o.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#D6CBC3]">{o.customer_name}</p>
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
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-mono text-sm text-[#B5A9A1]">{money(o.total)}</span>
                        {col.next && (
                          <Button
                            size="sm"
                            disabled={advance.isPending}
                            onClick={() => advance.mutate({ id: o.id, status: col.next as OrderStatus })}
                            data-testid={`staff-advance-button-${o.code}`}
                          >
                            {col.cta}
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
