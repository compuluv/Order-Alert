import { useEffect, useState } from "react";
import { BellRing, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stopAlarm } from "@/lib/alarm";
import { money, qrSrc } from "@/lib/dining";

/**
 * Full-screen, high-contrast strobing takeover shown the moment an order is ready.
 * Built for a loud room: it flashes, it sounds, and it does not go away until the
 * guest taps "On my way".
 */
export default function PickupAlert({
  code,
  total,
  onDismiss,
}: {
  code: string;
  total: number;
  onDismiss: () => void;
}) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setOn((v) => !v), 420);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 transition-colors duration-200"
      style={{ background: on ? "#10B981" : "#0D0B0A" }}
      data-testid="pickup-alert-overlay"
    >
      <div
        className="w-full max-w-lg rounded-3xl border-4 p-6 text-center transition-colors duration-200 sm:p-8"
        style={{
          borderColor: on ? "#022C22" : "#10B981",
          background: on ? "#FAFFFE" : "#111917",
        }}
      >
        <BellRing
          className="mx-auto size-14 animate-bounce"
          style={{ color: on ? "#059669" : "#10B981" }}
        />
        <h1
          className="mt-4 font-serif text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl"
          style={{ color: on ? "#022C22" : "#FAFFFE" }}
          data-testid="pickup-alert-heading"
        >
          YOUR ORDER IS READY
        </h1>
        <p
          className="mt-3 text-lg font-semibold sm:text-xl"
          style={{ color: on ? "#064E3B" : "#A7F3D0" }}
        >
          Come to the counter to pay &amp; collect
        </p>

        <div
          className="mt-6 rounded-2xl p-4 transition-colors duration-200"
          style={{ background: on ? "#022C22" : "#241E1A" }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#A7F3D0]">
            Order number
          </p>
          <p
            className="font-mono text-4xl font-extrabold tracking-widest text-[#F59E0B] sm:text-5xl"
            data-testid="pickup-alert-code"
          >
            {code}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 border-t border-white/15 pt-3">
            <CreditCard className="size-4 text-[#A7F3D0]" />
            <span className="text-sm text-[#A7F3D0]">Amount due at counter</span>
            <span
              className="font-mono text-xl font-bold text-[#FAFFFE]"
              data-testid="pickup-alert-total"
            >
              {money(total)}
            </span>
          </div>
        </div>

        <div className="mx-auto mt-5 w-full max-w-[170px] rounded-xl bg-white p-2.5">
          <img
            src={qrSrc(`${window.location.origin}/status/${code}`)}
            alt={`Claim QR for ${code}`}
            className="w-full"
            data-testid="pickup-alert-qr"
          />
        </div>
        <p className="mt-2 text-xs" style={{ color: on ? "#064E3B" : "#A89C94" }}>
          Show this QR at the counter
        </p>

        <Button
          size="lg"
          className="mt-6 h-14 w-full text-base font-bold"
          onClick={() => {
            stopAlarm();
            onDismiss();
          }}
          data-testid="pickup-alert-dismiss-button"
        >
          On my way — silence the alarm
        </Button>
      </div>
    </div>
  );
}
