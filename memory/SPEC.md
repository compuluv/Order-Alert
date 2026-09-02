# Central Bar & Grill — QR Dine-In Ordering

Restaurant QR ordering app themed on centralbarandgrill.ca (Toronto Jamaican bar & grill, est. 2006).

## Live wait estimate — `GET /api/wait-estimate`
Computed from the current kitchen queue (`received` + `preparing` counts):
`BASE_MINUTES(9) + 3 * ceil(queue / 2)`, capped at 45 and rounded to the nearest 5 so it reads like
a human estimate. Returns `{minutes, queue_size, busy_level, message}` where `busy_level` is
`quiet | steady | busy | slammed` (0 / ≤3 / ≤8 / more tickets).
Rendered by `components/WaitBanner.tsx` (polls every 20s) on the landing page, above the menu
(before they order) and on the tracker while the order isn't ready yet.

## Daily sales report — `GET /api/reports/daily?date=YYYY-MM-DD`
Staff-gated page at `/staff/report` ("Sales" button on the board), polls every 30s, with a date
picker and Print button. The day is a **local calendar day** anchored server-side via
`lib/dates.py::today_iso()` + `APP_TZ` (set to `America/Toronto` in backend/.env) — never browser
date math. Returns order_count, revenue, items_sold, average_order, collected vs outstanding,
`top_items` (best sellers, top 8), `by_category`, and `by_hour` buckets.

## Sold-out toggle
`MenuItem.sold_out` (bool, default false) + `PATCH /api/menu/{item_id}/sold-out {sold_out}`.
Kitchen page `/staff/menu` ("Menu" button on the board) lists every dish grouped by category with a
search box, a sold-out count badge and a per-dish toggle. On the guest menu a sold-out dish is
greyscaled at 0.6 opacity with a "SOLD OUT" ribbon, struck-through name and a disabled
"Sold out" button. Guest menu polls, so it greys out within seconds.

## Unpaid order timer / re-ping
Staff board tickets in the `pay_now` column show minutes since `updated_at`. Past
`UNPAID_WARN_MINUTES = 4` the ticket turns red, pulses (`animate-chime`) and shows
"Pinged Xm ago — still not paid". Every `pay_now` ticket has a **Ping again** button that re-PATCHes
status to `pay_now`, which re-sends the SMS and moves `updated_at`. The guest's tracker watches
`updated_at`, so a re-ping re-fires the loud flashing alarm even though the status didn't change.

## Auto-cancel unpaid orders (platform cron)
`.emergent/crons.yml` → `auto-cancel-unpaid`, every 15 minutes, POSTs
`{{BASE_URL}}/api/cron/auto-cancel-unpaid`. The endpoint (routers/cron.py) requires
`Authorization: Bearer $WEBHOOK_CRON_SECRET` (401 otherwise), de-dupes on `X-Webhook-Id`/`run_id`,
acks 2xx immediately and backgrounds the work. It flips `pay_now` orders whose `updated_at` is older
than `AUTO_CANCEL_MINUTES` (default 15, in backend/.env) to status `cancelled`.
`cancelled` is excluded from the wait-estimate queue and from the daily sales report, disappears
from the staff board columns, and the guest tracker shows a "this order was cancelled" banner.

## Drinks first (bar runs ahead of the kitchen)
`OrderLine.category` is captured at order time, so the backend knows which lines are drinks.
`Order.drinks_done` (bool) + `PATCH /api/orders/{id}/drinks-done`. The staff board shows a blue
**"Bar — pour these now"** panel above the columns listing every paid order (`preparing`/`ready`)
that still has undelivered drink lines, with a "Drinks poured" button — so drinks go out while the
food is still cooking.

## Counter TV size modes
`/counter` has a size toggle (`normal | large | xl`, default `large`) persisted in
`localStorage["cbg_tv_size"]`. It scales the serving name (48 / 72 / 128px measured) and drops the
grid to fewer columns as it grows, so `xl` is readable from across a loud room.

## Counter TV display — `/counter` (ungated, meant to be left running on a TV)
Polls every 4s. Big **NOW SERVING** grid — the guest's **name in large type** with the order code
underneath in small mono (staff call names out, so the name is the primary element) — plus a red
**Come pay now** list and a smaller **Still cooking** column with elapsed time. Ready cards stay up
until staff mark the order collected/served. Newly-ready codes flash via the `flashcard` keyframe
for ~12s, then settle to solid green. Linked from the staff board ("Counter TV", new tab).

## SMS order-ready texts (`backend/lib/sms.py`)
When staff advance a ticket to `ready`, a FastAPI `BackgroundTasks` job texts the guest:
"Central Bar & Grill: {name}, your order {code} is READY! Come to the counter to pay & collect
(${total} due)." Phone numbers are normalised to E.164 (bare 10-digit numbers get `+1`).
- Credentials: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in backend/.env.
- **Empty by default = DEMO MODE**: the message is logged (`/var/log/supervisor/backend.err.log`)
  instead of sent, and nothing breaks. Paste real keys + restart backend to go live.
- `send_sms()` never raises — a failed text must not fail the staff's ping action.
- `GET /api/sms/status` → `{configured: bool}`, surfaced on the staff board as a live/demo badge.
- Twilio trial accounts can only text numbers verified in the Twilio console.

## Menu categories
`Appetizers, Entrees, Seafood, Sides, Drinks` — all cocktails/punches/blends live under a single
**Drinks** heading (the old "Signatures" and "Island Blends" groups were merged).

## Ordering flow — PAY FIRST, then we make it
1. Landing "Start your order" → `/order` = **OrderChoice** page: two big cards, **Food** or **Drinks**.
2. `/order/food` (Appetizers, Entrees, Seafood, Sides) or `/order/drinks` (Drinks). Both render
   `OrderMenu.tsx`, which picks its mode from the pathname. An "Add drinks/food too" link switches
   menus and the cart survives via `sessionStorage["cbg_cart"]`.
3. Guest sends the order → status `received`.
4. Staff board columns (4): **New — needs payment** → `PING guest to pay` → **Pinged — waiting on
   payment** → `Paid — start cooking` → **In the kitchen** → `PING guest to collect` → **Ready —
   waiting at counter** → `Collected`.
5. Statuses: `received | pay_now | preparing | ready | served`.
   The loud flashing alarm fires TWICE — on `pay_now` (red, "PLEASE COME PAY NOW") and on `ready`
   (green, "YOUR ORDER IS READY"). `PickupAlert` takes a `variant: "pay" | "collect"`.
   SMS is sent on both transitions (`pay_message` / `ready_message` in `lib/sms.py`).
6. Counter TV `/counter` has three zones: NOW READY (big), **Come pay now** (red list), Still cooking.

## Flows
1. Guest scans the "Scan to order" poster (or taps "Start your order") → `/order` — one menu, no
   table numbers.
2. Browse by category, add items (items with `options` open a customiser dialog), review cart in a
   sheet, enter name (required) + optional phone/notes, "Send to kitchen".
3. Redirects to `/status/:orderId` — live tracker polling every 4s: Received → Preparing →
   Pay & Collect. Shows an **order claim QR** (encodes `/status/<CODE>`) to show at the counter.
4. Staff board `/staff` (PIN gated) — 3-column kanban, polls every 4s, chime + toast on new orders,
   one-click status advance, search by code/name, elapsed timer.
5. `/staff/qr` — one printable "Scan to order" poster for the whole room.

## Data model (backend/models/dining.py ↔ frontend/src/lib/dining.ts)
- `MenuItem`: id, name, description, price, category, image_url, options[], signature
- `Order`: id, code (`CB-1234`), customer_name, phone, notes, lines[], total, status,
  created_at, updated_at. `OrderLine`: item_id, name, price, qty, option.
- Statuses: `received | preparing | ready | served`.

## API (all on api_router, prefix /api)
- `GET /api/menu`, `GET /api/menu/categories`
- `POST /api/orders`, `GET /api/orders`, `GET /api/orders/{id_or_code}`,
  `PATCH /api/orders/{id}/status`
- `GET /api/qr?data=<text>` → SVG QR (python `qrcode` package)
- `POST /api/staff/verify-pin`

## Seed
`cd /app/backend && python seed.py` — idempotent, 32 real Central Bar & Grill menu items across
Appetizers, Entrees, Seafood, Sides, Signatures, Island Blends.

## Auth
Staff pages (`/staff`, `/staff/tables`) are gated by a shared PIN (`STAFF_PIN` in backend/.env,
default `2006`) verified at `POST /api/staff/verify-pin`. On success the frontend stores
`localStorage["cbg_staff_unlocked"]="1"` so the device is remembered; a "Lock" button clears it.
A small "Staff" button remains on the landing page but leads to the PIN gate.

## Service model — one menu, counter pickup, NO table numbers
There are no tables, no table QRs and no dine-in/takeout split. Everyone (seated or waiting
anywhere in the room) orders from a single menu at `/order`, then **pays & collects at the counter**.
Staff print one "Scan to order" poster from `/staff/qr` (a single QR pointing at `/order`).
Legacy `/table/:id`, `/takeout` and `/staff/tables` URLs redirect to the new routes so
already-printed QRs keep working.

Orders are identified by their **code** (`CB-1234`) and the guest's **name**, which staff call out.
`customer_name` is required; `phone` is optional.

When staff advance a ticket to `ready` ("PING guest to collect"), the guest's open tracker:
- shows `components/PickupAlert.tsx` — a **full-screen strobing takeover** (green ⇄ obsidian, 420ms)
  with the order code, amount due, and claim QR;
- sounds a **loud repeating square-wave two-tone siren** (`lib/alarm.ts`, ~0.5 gain, bursts every
  1.4s) that keeps going until the guest taps "On my way — silence the alarm";
- vibrates in a repeating pattern and fires a browser notification.

Browsers block audio without a gesture, so `unlockAudio()` is called from the "Send to kitchen"
click, from the header "Alarm on" toggle, and from the "Turn on alarm" prompt shown on trackers
opened cold via a receipt QR (`data-testid="arm-alarm-prompt"`). If the guest dismisses the alert
they can reopen it from `ready-reminder-banner`.

## Order types
Removed — there is a single order type (counter pickup). See the service model above.

