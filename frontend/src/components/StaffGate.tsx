import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { STAFF_PIN_KEY } from "@/lib/dining";

interface PinResult {
  ok: boolean;
}

/** Gates the staff pages behind a shared PIN, remembered per device. */
export default function StaffGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(STAFF_PIN_KEY) === "1",
  );
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);

  const verify = useMutation({
    mutationFn: () => apiPost<PinResult>("/staff/verify-pin", { pin }),
    onSuccess: (res) => {
      if (res.ok) {
        localStorage.setItem(STAFF_PIN_KEY, "1");
        setUnlocked(true);
      } else {
        setBad(true);
        setPin("");
      }
    },
    onError: () => setBad(true),
  });

  if (unlocked) return <>{children}</>;

  return (
    <div className="grid min-h-screen place-items-center bg-[#0D0B0A] px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-[#3D322C] bg-[#1A1614] p-6 shadow-2xl shadow-black/60"
        data-testid="staff-pin-gate"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#EA580C] to-[#F59E0B]">
          <Lock className="size-5 text-[#1A1005]" />
        </span>
        <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-[#FAF6F3]">
          Staff only
        </h1>
        <p className="mt-1.5 text-sm text-[#A89C94]">
          Enter the staff PIN to open the kitchen board.
        </p>
        <form
          className="mt-5 space-y-3"
          data-testid="staff-pin-form"
          onSubmit={(e) => {
            e.preventDefault();
            setBad(false);
            if (pin.trim()) verify.mutate();
          }}
        >
          <div>
            <Label htmlFor="staff-pin">Staff PIN</Label>
            <Input
              id="staff-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="font-mono tracking-[0.4em]"
              data-testid="staff-pin-input"
            />
          </div>
          {bad && (
            <p className="text-sm text-[#EF4444]" data-testid="staff-pin-error">
              That PIN doesn&apos;t match. Try again.
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={verify.isPending || !pin.trim()}
            data-testid="staff-pin-submit-button"
          >
            {verify.isPending ? <Loader2 className="size-4 animate-spin" /> : "Unlock board"}
          </Button>
        </form>
        <Link
          to="/"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} mt-3 w-full`}
          data-testid="staff-pin-back-link"
        >
          <ArrowLeft className="size-4" /> Back to the menu
        </Link>
      </div>
    </div>
  );
}
