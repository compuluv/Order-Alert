import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Plus, Minus, Trash2, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/api";
import { unlockAudio } from "@/lib/alarm";
import { money, type MenuItem, type Order, type OrderLine } from "@/lib/dining";

interface CartLine extends OrderLine {
  key: string;
}

const lineKey = (id: string, option: string | null) => `${id}::${option ?? ""}`;

export default function TableMenu() {
  const { tableId } = useParams<{ tableId: string }>();
  const isTakeout = tableId === undefined;
  const table = isTakeout ? null : Number(tableId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [category, setCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customizing, setCustomizing] = useState<MenuItem | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const { data: menu, isLoading, isError } = useQuery({
    queryKey: ["menu"],
    queryFn: () => apiGet<MenuItem[]>("/menu"),
  });

  const categories = useMemo(() => {
    const seen: string[] = [];
    (menu ?? []).forEach((m) => {
      if (!seen.includes(m.category)) seen.push(m.category);
    });
    return ["All", ...seen];
  }, [menu]);

  const visible = (menu ?? []).filter((m) => category === "All" || m.category === category);
  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  function addLine(item: MenuItem, option: string | null) {
    const key = lineKey(item.id, option);
    setCart((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        { key, item_id: item.id, name: item.name, price: item.price, qty: 1, option },
      ];
    });
    toast.success(`${item.name} added`, { description: option ?? undefined });
  }

  function onAdd(item: MenuItem) {
    if (item.options.length > 0) setCustomizing(item);
    else addLine(item, null);
  }

  const changeQty = (key: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );

  const placeOrder = useMutation({
    mutationFn: () =>
      apiPost<Order>("/orders", {
        order_type: isTakeout ? "takeout" : "dine_in",
        table_number: table,
        customer_name: name.trim() || "Guest",
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        lines: cart.map(({ item_id, name: n, price, qty, option }) => ({
          item_id,
          name: n,
          price,
          qty,
          option,
        })),
      }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      setCart([]);
      setCartOpen(false);
      navigate(`/status/${order.id}`);
    },    onError: () =>
      toast.error(
        isTakeout && !phone.trim()
          ? "A phone number is required for takeout so we can ring you."
          : "Could not place the order. Please try again.",
      ),
  });

  const phoneMissing = isTakeout && !phone.trim();

  return (
    <div className="min-h-screen bg-[#0D0B0A] pb-28">
      <SiteHeader
        right={
          isTakeout ? (
            <Badge className="bg-[#059669] font-mono text-white" data-testid="takeout-badge">
              Takeout · Pickup
            </Badge>
          ) : (
            <Badge className="bg-[#F59E0B] font-mono text-[#1A1202]" data-testid="table-badge">
              Table {table}
            </Badge>
          )
        }
      />

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#EA580C]">
          {isTakeout ? "Takeout ordering" : "Dine-in ordering"}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
          The Menu
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A89C94]">
          {isTakeout ? (
            <>
              Ordering for <span className="font-mono text-[#10B981]">pickup</span>. Leave your
              phone number, then keep this tab open — we&apos;ll flash and sound a loud alarm when
              it&apos;s time to pay &amp; collect at the counter.
            </>
          ) : (
            <>
              Ordering for <span className="font-mono text-[#F59E0B]">Table {table}</span>. Order
              here, then we&apos;ll flash and sound a loud alarm on your phone when it&apos;s time
              to pay &amp; collect at the counter.
            </>
          )}
        </p>

        <div
          className="sticky top-[61px] z-30 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-[#0D0B0A]/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
          data-testid="category-pill-strip"
        >
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-testid={`category-pill-${c.toLowerCase().replace(/\s+/g, "-")}`}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${
                category === c
                  ? "border-[#EA580C] bg-[#EA580C] text-white"
                  : "border-[#3D322C] bg-[#1A1614] text-[#B5A9A1] hover:border-[#F59E0B] hover:text-[#F5EFEB]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isError && (
          <p className="mt-8 rounded-xl border border-[#3D322C] bg-[#1A1614] p-5 text-sm text-[#B5A9A1]" data-testid="menu-error-state">
            The menu is offline right now. Please ask your server for a printed menu.
          </p>
        )}
        {isLoading && (
          <p className="mt-8 flex items-center gap-2 text-sm text-[#A89C94]" data-testid="menu-loading">
            <Loader2 className="size-4 animate-spin" /> Loading the menu…
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {visible.map((item) => (
            <article
              key={item.id}
              data-testid={`menu-item-card-${item.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-[#2E2622] bg-[#1A1614] transition-transform duration-200 ease-out hover:-translate-y-1 hover:border-[#3D322C] hover:shadow-xl hover:shadow-amber-950/20"
            >
              {item.image_url && (
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {item.signature && (
                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[#D97706] px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#1A1005]">
                      <Flame className="size-3" /> Signature
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg font-semibold text-[#FAF6F3]">{item.name}</h3>
                  <span
                    className="shrink-0 font-mono text-base font-bold text-[#F59E0B]"
                    data-testid={`menu-item-price-${item.id}`}
                  >
                    {money(item.price)}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#A89C94]">
                  {item.description}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => onAdd(item)}
                  data-testid={`add-to-cart-button-${item.id}`}
                >
                  <Plus className="size-4" /> Add to order
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Customiser */}
      <Dialog open={customizing !== null} onOpenChange={(o) => !o && setCustomizing(null)}>
        <DialogContent data-testid="item-customizer-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif">{customizing?.name}</DialogTitle>
            <DialogDescription>Choose how you&apos;d like it prepared.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {(customizing?.options ?? []).map((opt) => (
              <Button
                key={opt}
                variant="outline"
                data-testid={`customizer-option-${opt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                onClick={() => {
                  if (customizing) addLine(customizing, opt);
                  setCustomizing(null);
                }}
              >
                {opt}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart bar */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2E2622] bg-[#1A1614]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#A89C94]">
                Your order
              </p>
              <p className="font-mono text-lg font-bold text-[#F59E0B]" data-testid="cart-total">
                {money(total)}
              </p>
            </div>
            <SheetTrigger
              render={
                <Button
                  className="ml-auto"
                  size="lg"
                  disabled={count === 0}
                  data-testid="open-cart-button"
                />
              }
            >
              <ShoppingBag className="size-4" />
              Review order
              <span
                className="ml-1 rounded-full bg-black/25 px-2 font-mono text-xs"
                data-testid="cart-count"
              >
                {count}
              </span>
            </SheetTrigger>
          </div>
        </div>

        <SheetContent className="flex w-full flex-col sm:max-w-md" data-testid="cart-sheet">
          <SheetHeader>
            <SheetTitle className="font-serif text-xl">
              {isTakeout ? "Takeout · Your order" : `Table ${table} · Your order`}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            {cart.length === 0 && (
              <p className="text-sm text-[#A89C94]" data-testid="cart-empty-state">
                Nothing added yet.
              </p>
            )}
            {cart.map((l) => (
              <div
                key={l.key}
                data-testid={`cart-line-${l.item_id}`}
                className="flex items-center gap-3 rounded-lg border border-[#2E2622] bg-[#241E1A] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-sm font-semibold text-[#FAF6F3]">
                    {l.name}
                  </p>
                  {l.option && (
                    <p className="text-xs text-[#F59E0B]">{l.option}</p>
                  )}
                  <p className="font-mono text-xs text-[#A89C94]">{money(l.price)} each</p>
                </div>
                <Button
                  size="icon-xs"
                  variant="outline"
                  onClick={() => changeQty(l.key, -1)}
                  data-testid={`cart-decrease-${l.item_id}`}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-5 text-center font-mono text-sm text-[#F5EFEB]">{l.qty}</span>
                <Button
                  size="icon-xs"
                  variant="outline"
                  onClick={() => changeQty(l.key, 1)}
                  data-testid={`cart-increase-${l.item_id}`}
                >
                  <Plus className="size-3" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setCart((p) => p.filter((x) => x.key !== l.key))}
                  data-testid={`cart-remove-${l.item_id}`}
                >
                  <Trash2 className="size-3 text-[#EF4444]" />
                </Button>
              </div>
            ))}

            <div className="space-y-3 border-t border-[#2E2622] pt-4">
              <div>
                <Label htmlFor="cust-name">Your name</Label>
                <Input
                  id="cust-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alexis"
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <Label htmlFor="cust-phone">
                  {isTakeout ? "Phone (required — we ring this)" : "Phone (for the ready ping)"}
                </Label>
                <Input
                  id="cust-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="416-555-0142"
                  data-testid="customer-phone-input"
                />
                {phoneMissing && (
                  <p className="mt-1 text-xs text-[#F59E0B]" data-testid="phone-required-hint">
                    Takeout orders need a phone number so we can ring you when it&apos;s ready.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="cust-notes">Kitchen notes</Label>
                <Textarea
                  id="cust-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Extra spicy, no okra…"
                  data-testid="customer-notes-input"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-[#2E2622] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-[#B5A9A1]">Total</span>
              <span className="font-mono text-xl font-bold text-[#F59E0B]" data-testid="cart-sheet-total">
                {money(total)}
              </span>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0 || placeOrder.isPending || phoneMissing}
              onClick={() => {
                // Must run inside the click so the browser lets the pickup alarm sound later.
                unlockAudio();
                placeOrder.mutate();
              }}
              data-testid="place-order-button"
            >
              {placeOrder.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending…
                </>
              ) : (
                "Send to kitchen"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
