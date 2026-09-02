import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Bell, BellOff, CookingPot, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import PickupAlert from "@/components/PickupAlert";
import WaitBanner from "@/components/WaitBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { audioReady, notify, startAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  askNotificationPermission,
  money,
  qrSrc,
  type Order,
  type OrderStatus,
} from "@/lib/dining";

const STEPS: { status: OrderStatus; label: string; note: string }[] = [
  { status: "received", label: "Order received", note: "Sent to the counter" },
  {
    status: "pay_now",
    label: "Pay at the counter",
    note: "We'll alarm your phone — pay first, then we start making it",
  },
  { status: "preparing", label: "Being made", note: "Paid — your order is now being prepared" },
  {
    status: "ready",
    label: "Ready — collect it",
    note: "We'll alarm your phone again, then come grab it",
  },
];

const stepIndex = (s: OrderStatus) =>
  s === "served" ? STEPS.length - 1 : STEPS.findIndex((x) => x.status === s);

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const [sound, setSound] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [armed, setArmed] = useState(() => audioReady());
  const lastStatus = useRef<OrderStatus | null>(null);
  const lastPingAt = useRef<string | null>(null);

  const { data: order, isError, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiGet<Order>(`/orders/${orderId}`),
    // Stop polling once the order is gone (e.g. staff cleared the board), so a
    // stale tab doesn't hammer the API with 404s forever.
    refetchInterval: (query) => (query.state.error ? false : 4000),
    retry: false,
  });

  // A vanished order must not keep the alarm ringing.
  useEffect(() => {
    if (isError) stopAlarm();
  }, [isError]);

  useEffect(() => {
    askNotificationPermission();
  }, []);

  useEffect(() => {
    if (!order) return;
    const wasKnown = lastStatus.current !== null;
    const changed = wasKnown && lastStatus.current !== order.status;
    lastStatus.current = order.status;

    const alarmStatus = order.status === "ready" || order.status === "pay_now";
    // Staff can re-ping without changing status — updated_at moves, so re-fire the alarm.
    const rePinged =
      alarmStatus && lastPingAt.current !== null && lastPingAt.current !== order.updated_at;
    lastPingAt.current = order.updated_at;

    if (alarmStatus && (changed || !wasKnown || rePinged)) {
      setAlertOpen(true);
      if (sound) startAlarm();
      if (order.status === "pay_now") {
        notify(
          "Please come pay now",
          `Order ${order.code} — pay at the counter so we can start making it.`,
        );
        toast.warning("Come pay at the counter now", {
          description: `Order ${order.code} · ${money(order.total)} to pay`,
          duration: 20000,
        });
      } else {
        notify("Your order is ready!", `Order ${order.code} — come collect it at the counter.`);
        toast.success("Ready — come collect at the counter", {
          description: `Order ${order.code}`,
          duration: 20000,
        });
      }
    } else if (changed) {
      toast.info(STATUS_LABEL[order.status]);
      if (!alarmStatus) stopAlarm();
    }
  }, [order, sound]);

  useEffect(() => () => stopAlarm(), []);

  const active = order ? stepIndex(order.status) : -1;
  const claimUrl = order ? `${window.location.origin}/status/${order.code}` : "";

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        backTo="/"
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = !sound;
              setSound(next);
              if (next) {
                unlockAudio();
                setArmed(true);
              } else {
                stopAlarm();
              }
            }}
            data-testid="sound-toggle-button"
          >
            {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            {sound ? "Alarm on" : "Alarm off"}
          </Button>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
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

        {order && (order.status === "ready" || order.status === "pay_now") && alertOpen && (
          <PickupAlert
            code={order.code}
            total={order.total}
            variant={order.status === "pay_now" ? "pay" : "collect"}
            onDismiss={() => setAlertOpen(false)}
          />
        )}

        {order && order.status === "cancelled" && (
          <div
            className="mt-6 rounded-xl border-2 border-[#78716C] bg-[#1C1917] p-5"
            data-testid="cancelled-banner"
          >
            <p className="font-serif text-xl font-bold text-[#E7E5E4]">
              This order was cancelled — it wasn&apos;t paid for in time
            </p>
            <p className="mt-1 text-sm text-[#A8A29E]">
              Nothing was charged. Please order again at the counter or from your phone.
            </p>
          </div>
        )}

        {order && order.status !== "ready" && order.status !== "pay_now" && order.status !== "cancelled" && (
          <div className="mt-6" data-testid="tracker-wait-banner">
            <WaitBanner compact />
          </div>
        )}

        {order && order.status !== "ready" && order.status !== "pay_now" && !armed && (
          <div
            className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#F59E0B] bg-[#241E1A] p-4"
            data-testid="arm-alarm-prompt"
          >
            <Bell className="size-5 shrink-0 text-[#F59E0B]" />
            <p className="min-w-0 flex-1 text-sm text-[#F5EFEB]">
              Tap to switch on the loud pickup alarm — it&apos;s a noisy room, so we&apos;ll flash
              and sound this screen when your food is ready.
            </p>
            <Button
              onClick={() => {
                unlockAudio();
                setArmed(true);
                toast.success("Alarm armed — keep this screen open");
              }}
              data-testid="arm-alarm-button"
            >
              Turn on alarm
            </Button>
          </div>
        )}

        {order && (order.status === "ready" || order.status === "pay_now") && !alertOpen && (
          <div
            className={`mt-6 flex flex-wrap items-center gap-3 rounded-xl border-2 p-4 ${
              order.status === "pay_now"
                ? "border-[#EF4444] bg-[#2b1211]"
                : "border-[#10B981] bg-[#0f2b22]"
            }`}
            data-testid="ready-reminder-banner"
          >
            <p
              className={`min-w-0 flex-1 font-serif text-lg font-semibold ${
                order.status === "pay_now" ? "text-[#FECACA]" : "text-[#A7F3D0]"
              }`}
            >
              {order.status === "pay_now"
                ? `Pay at the counter now (${money(order.total)}) — we start making it once you've paid`
                : "Ready — collect it at the counter"}
            </p>
            <Button onClick={() => setAlertOpen(true)} data-testid="show-pickup-alert-button">
              {order.status === "pay_now" ? "Show my pay screen" : "Show my pickup screen"}
            </Button>
          </div>
        )}

        {order && !isError && (
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
                <Badge variant="outline" data-testid="order-pickup-badge">
                  Pay &amp; collect at counter
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
                Show this at the counter when you pay &amp; collect, or scan it later to reopen this
                tracker.
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
