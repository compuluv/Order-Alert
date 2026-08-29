# Central Bar & Grill — QR Dine-In Ordering

Restaurant QR ordering app themed on centralbarandgrill.ca (Toronto Jamaican bar & grill, est. 2006).

## Flows
1. Guest scans the table QR tent → `/table/:tableId` (tables 1–16) → menu locked to that table.
2. Browse by category, add items (items with `options` open a customiser dialog), review cart in a
   sheet, enter name/phone/notes, "Send to kitchen".
3. Redirects to `/status/:orderId` — live tracker polling every 4s: Received → Preparing → Ready.
   Web Audio chime + sonner toast fire when status flips to `ready`. Shows an **order claim QR**
   (encodes `/status/<CODE>`) so the receipt QR reopens the tracker.
4. Staff board `/staff` (no auth) — 3-column kanban, polls every 4s, chime + toast on new orders,
   one-click status advance, search by code/name/table, elapsed timer.
5. `/staff/tables` — printable QR tents for tables 1–16, each encoding `/table/<n>`.

## Data model (backend/models/dining.py ↔ frontend/src/lib/dining.ts)
- `MenuItem`: id, name, description, price, category, image_url, options[], signature
- `Order`: id, code (`CB-1234`), table_number, customer_name, phone, notes, lines[], total, status,
  created_at, updated_at. `OrderLine`: item_id, name, price, qty, option.
- Statuses: `received | preparing | ready | served`.

## API (all on api_router, prefix /api)
- `GET /api/menu`, `GET /api/menu/categories`
- `POST /api/orders`, `GET /api/orders?table=`, `GET /api/orders/{id_or_code}`,
  `PATCH /api/orders/{id}/status`
- `GET /api/qr?data=<text>` → SVG QR (python `qrcode` package)

## Seed
`cd /app/backend && python seed.py` — idempotent, 32 real Central Bar & Grill menu items across
Appetizers, Entrees, Seafood, Sides, Signatures, Island Blends.

## Auth
None — staff board is an open link per the user's choice.
