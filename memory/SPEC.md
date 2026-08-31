# Central Bar & Grill — QR Dine-In Ordering

Restaurant QR ordering app themed on centralbarandgrill.ca (Toronto Jamaican bar & grill, est. 2006).

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

