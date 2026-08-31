// Mirrors backend/models/dining.py — keep in sync by hand.
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  options: string[];
  signature: boolean;
}

export interface OrderLine {
  item_id: string;
  name: string;
  price: number;
  qty: number;
  option: string | null;
}

export type OrderType = "dine_in" | "takeout";

export interface Order {
  id: string;
  code: string;
  order_type: OrderType;
  table_number: number | null;
  customer_name: string;
  phone: string | null;
  notes: string | null;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = "received" | "preparing" | "ready" | "served";

export const STATUS_FLOW: OrderStatus[] = ["received", "preparing", "ready", "served"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Order Received",
  preparing: "In The Kitchen",
  ready: "Pay & Collect Now",
  served: "Collected",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  received: "bg-[#6366F1] text-white",
  preparing: "bg-[#F59E0B] text-[#1E1303]",
  ready: "bg-[#10B981] text-[#022C22]",
  served: "bg-[#3D322C] text-[#D6CBC3]",
};

export const money = (n: number) => `$${n.toFixed(2)}`;

export const qrSrc = (data: string) => `/api/qr?data=${encodeURIComponent(data)}`;

/**
 * Superseded by lib/alarm.ts for the pickup alarm; kept as a short confirmation
 * blip for lightweight cues (e.g. new-order alerts on the staff board).
 */
export function playChime(kind: "ready" | "new" = "ready") {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = kind === "ready" ? [880, 1174.7, 1568] : [660, 990];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    /* audio unavailable — silent */
  }
}

export function askNotificationPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

export const STAFF_PIN_KEY = "cbg_staff_unlocked";

export function elapsed(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export const TABLES = Array.from({ length: 16 }, (_, i) => i + 1);
