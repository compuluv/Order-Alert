import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Bell, BellOff, CookingPot, Receipt, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  money,
  playChime,
  qrSrc,
  type Order,
  type OrderStatus,
} from "@/lib/dining";

const STEPS: { status: OrderStatus; label: string; note: string }[] = [
  { status: "received", label: "Order received", note: "The kitchen has your ticket" },
  { status: "preparing", label: "On the grill", note: "Your food is being cooked fresh" },
  { status: "ready", label: "Ready for you", note: "We'll ring you — come collect or sit tight" },
];

const stepIndex = (s: OrderStatus) => (s === "served" ? 2 : STEPS.findIndex((x) => x.status === s));

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const [sound, setSound] = useState(true);
  const lastStatus = useRef<OrderStatus | null>(null);

  const { data: order, isError, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiGet<Order>(`/orders/${orderId}`),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!order) return;
    if (lastStatus.current && lastStatus.current !== order.status) {
      if (order.status === "ready") {
        if (sound) playChime("ready");
        toast.success("Your order is ready!", {
          description: `Order ${order.code} — Table ${order.table_number}`,
        });
      } else {
        toast.info(STATUS_LABEL[order.status]);
      }
    }
    lastStatus.current = order.status;
  }, [order, sound]);

  const active = order ? stepIndex(order.status) : -1;
  const claimUrl = order ? `${window.location.origin}/status/${order.code}` : "";

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSound((s) => !s);
              if (!sound) playChime("new");
            }}
            data-testid="sound-toggle-button"
          >
            {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            {sound ? "Chime on" : "Chime off"}
          </Button>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          data-testid="status-back-link"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>

        <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
          Order tracker
        </h1>

        {isLoading && (
          <p className="mt-6 flex items-center gap-2 text-sm text-[#A89C94]" data-testid="status-loading">
            <Loader2 className="size-4 animate-spin" /> Fetching your order…
          </p>
        )}
        {isError && (
          <p
            className="mt-6 rounded-xl border border-[#3D322C] bg-[#1A1614] p-5 text-sm text-[#B5A9A1]"
            data-testid="status-error-state"
          >
            We couldn&apos;t find that order. Double-check the code on your receipt, or ask your
            server.
          </p>
        )}

        {order && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="animate-rise rounded-2xl border border-[#3D322C] bg-[#1A1614] p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="font-mono text-2xl font-extrabold tracking-widest text-[#F59E0B] sm:text-3xl"
                  data-testid="order-code"
                >
                  {order.code}
                </span>
                <Badge
                  className={STATUS_COLOR[order.status]}
                  data-testid="order-status-badge"
                >
                  {STATUS_LABEL[order.status]}
                </Badge>
                <Badge variant="outline" data-testid="order-table-badge">
                  Table {order.table_number}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[#A89C94]" data-testid="order-customer-name">
                For {order.customer_name}
                {order.phone ? ` · ${order.phone}` : ""}
              </p>

              <ol className="mt-7 space-y-1" data-testid="status-tracker">
                {STEPS.map((step, i) => {
                  const done = i < active;
                  const now = i === active;
                  return (
                    <li key={step.status} className="flex gap-4" data-testid={`status-step-${step.status}`}>
                      <div className="flex flex-col items-center">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300 ${
                            done
                              ? "border-[#10B981] bg-[#10B981] text-[#022C22]"
                              : now
                                ? "border-[#F59E0B] bg-[#F59E0B] text-[#1E1303] animate-chime"
                                : "border-[#3D322C] bg-[#241E1A] text-[#6b615a]"
                          }`}
                        >
                          {done ? (
                            <Check className="size-4" />
                          ) : step.status === "preparing" ? (
                            <CookingPot className="size-4" />
                          ) : step.status === "ready" ? (
                            <Bell className="size-4" />
                          ) : (
                            <Receipt className="size-4" />
                          )}
                        </span>
                        {i < STEPS.length - 1 && (
                          <span
                            className={`my-1 w-0.5 flex-1 min-h-8 ${done ? "bg-[#10B981]" : "bg-[#2E2622]"}`}
                          />
                        )}
                      </div>
                      <div className="pb-6">
                        <p
                          className={`font-serif text-lg font-semibold ${
                            i <= active ? "text-[#FAF6F3]" : "text-[#6b615a]"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-sm text-[#A89C94]">{step.note}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="border-t border-[#2E2622] pt-4">
                {order.lines.map((l, i) => (
                  <div
                    key={`${l.item_id}-${i}`}
                    className="flex items-baseline justify-between py-1.5 text-sm"
                    data-testid={`receipt-line-${i}`}
                  >
                    <span className="text-[#D6CBC3]">
                      <span className="font-mono text-[#F59E0B]">{l.qty}×</span> {l.name}
                      {l.option && <span className="text-[#A89C94]"> · {l.option}</span>}
                    </span>
                    <span className="font-mono text-[#F5EFEB]">{money(l.price * l.qty)}</span>
                  </div>
                ))}
                {order.notes && (
                  <p className="mt-2 text-xs italic text-[#A89C94]" data-testid="order-notes">
                    Note: {order.notes}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-[#2E2622] pt-3">
                  <span className="text-sm uppercase tracking-wider text-[#B5A9A1]">Total</span>
                  <span className="font-mono text-xl font-bold text-[#F59E0B]" data-testid="order-total">
                    {money(order.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="animate-rise rounded-2xl border border-[#3D322C] bg-[#241E1A] p-5 text-center sm:p-6">
              <h2 className="font-serif text-lg font-semibold text-[#FAF6F3]">Your claim QR</h2>
              <p className="mt-1 text-sm text-[#BCB1A8]">
                Show this at the counter, or scan it later to reopen this tracker.
              </p>
              <div className="mx-auto mt-4 w-full max-w-[220px] rounded-xl bg-[#FAF6F3] p-3">
                <img
                  src={qrSrc(claimUrl)}
                  alt={`Claim QR for order ${order.code}`}
                  className="w-full"
                  data-testid="order-claim-qr"
                />
              </div>
              <p className="mt-3 font-mono text-xs tracking-widest text-[#A89C94]">{order.code}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
