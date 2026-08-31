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

## Counter TV display — `/counter` (ungated, meant to be left running on a TV)
Polls every 4s. Big **NOW READY** grid of order codes + guest names (stays up until staff mark the
order collected/served), with a smaller **Still cooking** column showing received/preparing tickets
and elapsed time. Newly-ready codes flash via the `flashcard` keyframe for ~12s, then settle to
solid green. Linked from the staff board ("Counter TV", opens in a new tab).

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

