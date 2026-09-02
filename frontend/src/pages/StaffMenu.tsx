import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search, Ban, Check } from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPatch } from "@/lib/api";
import { money, type MenuItem } from "@/lib/dining";

/** Kitchen availability board — flip a dish sold out the moment it runs out. */
export default function StaffMenu() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: menu, isLoading, isError } = useQuery({
    queryKey: ["menu"],
    queryFn: () => apiGet<MenuItem[]>("/menu"),
    refetchInterval: 15000,
  });

  const toggle = useMutation({
    mutationFn: ({ id, sold_out }: { id: string; sold_out: boolean }) =>
      apiPatch<MenuItem>(`/menu/${id}/sold-out`, { sold_out }),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["menu"] });
      toast[item.sold_out ? "warning" : "success"](
        item.sold_out ? `${item.name} marked SOLD OUT` : `${item.name} is back on`,
      );
    },
    onError: () => toast.error("Could not update that dish."),
  });

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (menu ?? []).filter((m) => !term || m.name.toLowerCase().includes(term));
    const out: Record<string, MenuItem[]> = {};
    list.forEach((m) => {
      out[m.category] ??= [];
      out[m.category].push(m);
    });
    return out;
  }, [menu, q]);

  const soldOutCount = (menu ?? []).filter((m) => m.sold_out).length;

  return (
    <div className="min-h-screen bg-[#0D0B0A]">
      <SiteHeader
        backTo="/staff"
        right={
          <Badge
            className={soldOutCount ? "bg-[#EF4444] text-white" : "bg-[#10B981] text-[#022C22]"}
            data-testid="sold-out-count-badge"
          >
            {soldOutCount} sold out
          </Badge>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/staff"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          data-testid="menu-admin-back-link"
        >
          <ArrowLeft className="size-4" /> Back to board
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#EA580C]">
              Kitchen
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#FAF6F3] sm:text-4xl">
              What&apos;s available
            </h1>
            <p className="mt-1 text-sm text-[#A89C94]">
              Tap a dish to flip it sold out — it greys out on the guest menu straight away.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A89C94]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a dish"
              className="pl-9"
              data-testid="menu-admin-search-input"
            />
          </div>
        </div>

        {isLoading && (
          <p className="mt-8 flex items-center gap-2 text-sm text-[#A89C94]" data-testid="menu-admin-loading">
            <Loader2 className="size-4 animate-spin" /> Loading the menu…
          </p>
        )}
        {isError && (
          <p
            className="mt-8 rounded-xl border border-[#3D322C] bg-[#1A1614] p-5 text-sm text-[#B5A9A1]"
            data-testid="menu-admin-error-state"
          >
            Couldn&apos;t load the menu. Try again shortly.
          </p>
        )}

        <div className="mt-8 space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category} data-testid={`menu-admin-group-${category.toLowerCase()}`}>
              <h2 className="font-serif text-xl font-semibold text-[#F59E0B]">{category}</h2>
              <ul className="mt-3 divide-y divide-[#241E1A] overflow-hidden rounded-xl border border-[#2E2622] bg-[#1A1614]">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-3 sm:p-4"
                    data-testid={`menu-admin-row-${item.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate font-serif text-base font-semibold ${
                          item.sold_out ? "text-[#8B8078] line-through" : "text-[#F5EFEB]"
                        }`}
                      >
                        {item.name}
                      </p>
                      <p className="font-mono text-xs text-[#A89C94]">{money(item.price)}</p>
                    </div>
                    {item.sold_out && (
                      <Badge className="bg-[#EF4444] text-white" data-testid={`sold-out-badge-${item.id}`}>
                        Sold out
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={item.sold_out ? "default" : "outline"}
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: item.id, sold_out: !item.sold_out })}
                      data-testid={`toggle-sold-out-${item.id}`}
                    >
                      {item.sold_out ? (
                        <>
                          <Check className="size-4" /> Back on
                        </>
                      ) : (
                        <>
                          <Ban className="size-4" /> Sold out
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
