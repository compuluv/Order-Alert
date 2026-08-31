import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { apiGet } from "@/lib/api";
import { BUSY_STYLE, type WaitEstimate } from "@/lib/dining";

/** Live "ready in about X minutes" banner, driven by the kitchen's current queue. */
export default function WaitBanner({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ["wait-estimate"],
    queryFn: () => apiGet<WaitEstimate>("/wait-estimate"),
    refetchInterval: 20000,
  });

  if (!data) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-[#1A1614] ${
        BUSY_STYLE[data.busy_level]
      } ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      data-testid="wait-estimate-banner"
    >
      <Clock className={compact ? "size-4" : "size-5"} />
      <p
        className={`font-serif font-bold ${compact ? "text-sm" : "text-base sm:text-lg"}`}
        data-testid="wait-estimate-minutes"
      >
        Ready in about {data.minutes} minutes
      </p>
      <span className="text-sm text-[#A89C94]" data-testid="wait-estimate-message">
        {data.message}
      </span>
      <span
        className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[#A89C94]"
        data-testid="wait-estimate-queue"
      >
        {data.queue_size} in queue
      </span>
    </div>
  );
}
