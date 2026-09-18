# Al Halabi Rent — Car Rental Website & Management System

Complete car rental website + admin management system built for **Al Halabi Rent**
(WhatsApp: **+961 70 858 510** / `96170858510`).

---

## 1. Overview

- **Customer site**: browse the fleet, filter by category/brand/transmission/dates,
  view car details, and request a booking through a 3-step wizard. Requests are
  handed off to the team **via WhatsApp** for confirmation.
- **Admin dashboard** (protected): manage cars (+photo gallery with angles and per-colour photo sets), bookings
  (status workflow + final pricing), customers, pickup locations, and company
  settings shown on the public site.

Build references: [alhalabirent.md](alhalabirent.md) (original spec).

---

## 2. Tech Stack

| Layer    | Technology                                                          |
|----------|---------------------------------------------------------------------|
| Frontend | Next.js 16.3.5 (App Router, TypeScript, Tailwind CSS v4), React 19 |
| Form     | react-hook-form 7 + zod + @hookform/resolvers                       |
| UI icons | lucide-react                                                        |
| Backend  | Python FastAPI 0.115 + SQLAlchemy 2.0 + Pydantic v2                 |
| Database | SQLite (single file in `backend/alhalabi_rent.db`)                    |
| Auth     | JWT + bcrypt (`python-jose`, `passlib`)                             |
| Run      | Docker Compose (backend + frontend, named volumes for state)        |

Default admin credentials: **`admin@alhalabirent.com` / `Admin@2026`**

---

## 3. Directory Layout

```
alhalabirent/
├── alhalabirent.md        # original project spec
├── halabirentacar.md      # this change log / documentation
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, routers, static files
│   │   ├── config.py              # settings (incl. WhatsApp number)
│   │   ├── database.py            # SQLAlchemy engine/session
│   │   ├── constants.py           # booking/car status enums
│   │   ├── models/                # ORM models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── routers/               # cars, bookings, locations, admin
│   │   ├── services/              # auth, availability, pricing, booking_reference,
│   │   │                          # whatsapp, settings_store, seed
│   │   ├── utils/                 # dates, upload
│   │   └── static/images/cars/    # SVG placeholder car images (28)
│   └── venv/                      # Python virtual environment
└── frontend/
    ├── lib/                       # API client, formatting, admin auth, errors
    ├── services/                  # typed API service functions
    ├── components/
    │   ├── site/                  # Navbar, Footer, CarCard, CarGallery, SearchBar
    │   ├── booking/               # BookingWizard (3-step flow)
    │   ├── admin/                 # AdminShell, CarForm, shared UI
    │   └── ui/                    # Modal, Toaster, Badges
    └── app/
        ├── (site)/                # home, cars, car detail, about, contact, booking
        └── admin/                 # login + dashboard (cars, bookings, customers, locations, settings)
```

---

## 4. Backend

### 4.1 Run it

The stack runs under Docker (see section 8) — `docker compose up` starts the API
on :8000 and seeds the database on first run.

To run it directly instead (for backend debugging):

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# API docs: http://localhost:8000/docs
```

Stop the container first, or the two will fight over port 8000.

### 4.2 Seed data (re-)init

```powershell
cd backend
.\venv\Scripts\python.exe -m app.services.seed --reset
```

Seeds: 14 cars (Economy/Sedan/SUV/Luxury/Sports/Van), 4 locations
(Beirut Airport, Beirut, Jounieh, Tripoli), and the default admin account.
Each car gets a **real stock photo** as its main image (downloaded from
Wikimedia Commons, CC-licensed) `…/<category>_<n>_1.jpg` plus one SVG
gallery image `…_2.svg`.

### 4.3 Key endpoints

Public:

| Method | Path                        | Purpose                                  |
|--------|-----------------------------|------------------------------------------|
| GET    | `/api/health`               | liveness                                  |
| GET    | `/api/settings`             | public company settings                   |
| GET    | `/api/cars`                 | search/list (category, brand, transmission, passengers, min/max price, dates) |
| GET    | `/api/cars/meta`            | brands, categories, price range           |
| GET    | `/api/cars/{id}`            | detail                                    |
| GET    | `/api/cars/{id}/similar`    | related cars                             |
| GET    | `/api/locations`            | pickup/return locations                   |
| POST   | `/api/bookings/check-availability` | date/location availability check   |
| POST   | `/api/bookings`             | create booking request (returns WhatsApp URL) |
| GET    | `/api/bookings/{reference}` | fetch booking by reference                |
| GET    | `/static/...`               | uploaded / seeded images                  |

Admin (Bearer token from `/api/admin/login`): cars CRUD + image upload /
delete / set-main, bookings (list, detail, status update with final price and
admin notes), customers, locations CRUD, settings read/update, dashboard
stats (totals, recent bookings, revenue). See `backend/app/routers/admin.py`.

### 4.4 Booking status workflow

```
PENDING → CONFIRMED | RESERVED → ACTIVE → COMPLETED
        → CANCELLED | REJECTED
```

- Only `CONFIRMED`, `RESERVED`, `ACTIVE` bookings block availability.
- `ACTIVE` marks the car `RENTED`; `COMPLETED` / `CANCELLED` / `REJECTED`
  release it back to `AVAILABLE`.
- Price is estimated automatically from daily/weekly/monthly rates, and admin
  can set a final price on the booking.

### 4.5 WhatsApp handoff

The booking reference flow returns a link like:

```
https://wa.me/96170858510?text=Hello%20Al%20Halabi%20Rent...
```

The company number is defined in `backend/app/config.py`
(`COMPANY_WHATSAPP_NUMBER = "96170858510"`) and stored in the settings table
(default in `backend/app/services/settings_store.py`). It can be changed in
**Admin → Settings**.

---

## 5. Frontend

### 5.1 Run it

The stack runs under Docker (see section 8) — `docker compose up` serves the
site on :3000.

For frontend development:

```powershell
cd frontend
npm run dev -- --webpack   # dev server on :3000 (turbopack has no native binary here)
npm run build              # production build (uses webpack on this machine)
```

`npm run start` is **not** usable: `next.config.ts` sets `output: "standalone"`
for the Docker image, and `next start` refuses to serve that. Run the built site
with Docker, or with `node .next/standalone/server.js` after copying
`public/` and `.next/static/` next to it.

API/images are proxied by `next.config.ts` rewrites so the browser never talks
to the backend directly:

- `/api/:path*` → `http://localhost:8000/api/:path*`
- `/static/:path*` → `http://localhost:8000/static/:path*`

Server components call `http://localhost:8000` directly
(`lib/api.ts` switches base URL on the server vs client).

### 5.2 Public pages (`/`)

- **Home** — hero, search bar, category cards, featured cars, locations, CTA.
- **/cars** — filterable/searchable car list with pagination
  (respects category/brand/passengers/price/date query params).
- **/cars/[id]** — gallery, specs (passengers/doors/luggage/fuel/transmission),
  pricing (day/week/month), availability callout, "Request Booking" CTA.
- **/booking/[carId]** — 3-step wizard:
  1. Details (pickup/return locations + dates with availability re-check)
  2. Customer (name, phone, email — with validation)
  3. Summary → submit → success screen with **WhatsApp confirm link**
- **/about**, **/contact** — brand + contact info from settings.
- **/admin/login** — admin sign in.

### 5.3 Admin dashboard (`/admin`)

Protected by a token in `localStorage` — unauthenticated users are redirected
to `/admin/login`.

- **Dashboard** — stats, recent bookings, chart-ish summaries.
- **Cars** — list (search/paginate), **new**, **edit** (form + image gallery:
  upload, set main, delete). CarForm shared component (`components/admin/CarForm.tsx`).
- **Bookings** — list with status filter, detail page with status actions,
  final price, admin notes, and WhatsApp link to the customer.
- **Customers** — list with search, detail with booking history.
- **Locations** — add/edit/delete/activate pickup locations.
- **Settings** — company name, phone, email, WhatsApp number, address,
  working hours, currency, social URLs.

---

## 6. Important Platform Notes

- **Next.js 16**: this machine cannot load the native SWC binary
  (`@next/swc-win32-x64-msvc` reports "not a valid Win32 application"), so the
  `build` script uses `next build --webpack` (WASM fallback). Dev server still
  uses default turbopack mode.
  - `params` / `searchParams` are Promises — must be awaited in pages.
  - Client components cannot export `metadata` (removed from admin login).
- **Tailwind CSS v4**: important modifier is a **suffix** (`py-2!`, not `!py-2`);
  custom classes cannot be `@apply`-ed inside `@layer components`
  (buttons are defined via grouped selectors in `app/globals.css`).
- **Windows + npm**: package installs are extremely slow; avoid unnecessary
  `npm install` calls. A text-encoding mishap during one batch edit corrupted a
  few non-ASCII glyphs (emoji, `·`, `—`); all were repaired in the final pass.
- Backend must be running on **port 8000** for both dev and production
  frontend (home / cars / booking pages fetch live data).
- Stray 0-byte file `i` at the project root is a leftover and can be deleted.

---

## 7. Change Log (work delivered)

1. Backend scaffold: config, database, ORM models (Admin, Car, CarImage,
   Customer, Location, Booking), Pydantic schemas, JWT auth + bcrypt.
2. Services: availability (conflict detection), pricing (day/week/month),
   booking references (`CR-YYYY-XXXXXX`), WhatsApp message builder,
   settings store, seed script.
3. Routers: cars (search/meta/similar), bookings (availability + create +
   lookup), locations, admin (cars CRUD + images, bookings workflow, customers,
   locations, settings, dashboard).
4. Seed data: 14 cars + 4 locations + default admin; main images are real
   stock photos per model (Wikimedia Commons), gallery images are SVGs.
5. WhatsApp number set to `96170858510` for all booking handoffs.
6. Frontend scaffold (Next.js 16 + TS + Tailwind v4) with API-rewrite proxy,
   typed services/lib, reusable UI components, and toasts.
7. Public site pages (home, cars list/detail, booking wizard, about, contact,
   not-found) with SSR data from the API.
8. Admin dashboard (login, shell w/ sidebar guard, dashboard, cars CRUD +
   gallery, bookings list/detail workflow, customers, locations, settings).
9. Verified `npm run build` passes (webpack) for all 17 routes; live smoke tests:
   home/cars/car detail/booking/about/contact/admin pages, images, availability,
   booking creation, and admin login against the running backend.
10. Availability checker on the car detail page: client-side pickup/return
    date-time inputs call `POST /bookings/check-availability`; when available it
    shows the estimated total and a "Continue to Booking" link that pre-fills the
    wizard via query params; when **not available** it links to the similar-cars
    section (`#similar-cars`, auto-scroll) and to `/cars?pickup_date=...&return_date=...`
    filtered to cars that are free for those dates.
11. Real car photos in seed: downloaded one CC-licensed stock photo per model
    from Wikimedia Commons for all 14 cars (`#_1.jpg` in
    `backend/app/static/images/cars/`), updated `seed._image_url()` and patched
    the existing DB's main-image rows (`.svg` → `.jpg`).
12. **Car Configurator** on the car detail page (replaces the earlier 360° 3D
    viewer, which has been removed along with `three` and `public/models/car.glb`):
    - The owner uploads **one photo per angle** (Front, Front Angle, Side, Rear
      Angle, Rear, Top, Interior, Detail) in **Admin → Cars → Edit → Car Photos**,
      and can re-tag the angle of an existing photo at any time.
    - Customers pick a colour from the company palette **or type/pick any colour**,
      and every photo in the gallery is repainted in the browser
      (`frontend/lib/recolor.ts`).
    - A photo can also be tagged with the colour it was actually shot in. When
      the customer picks that colour, the configurator shows **those real photos**
      instead of a repaint (badge: "Actual photos").
    - The chosen colour travels to the booking wizard (`/booking/{id}?color=…`),
      which pre-fills the notes with "Preferred colour: …" so it reaches the team
      through the WhatsApp message.

    **How the repaint works.** No segmentation model runs in the browser, so the
    body is found the way a person would describe it: sample the dominant smooth
    colour in the middle of the frame, flood fill outwards while chromaticity,
    brightness, edges and local roughness all agree (roughness is what separates
    a white car from grey tarmac), bridge panel gaps, then keep the substantial
    regions. Each repainted pixel keeps its own brightness, so reflections and
    shadows survive; specular highlights stay white.

    **It refuses rather than guesses.** The result is rejected — and the original
    photo is shown with a note — when the car is black or near-black, when the
    mask escapes into the sky or road, when it is not one solid centred blob
    (racing stripes, a marquee behind the car), or when a large part of the
    body's own colour was missed (which would leave a half-repainted car). In
    practice a clean side/three-quarter shot of a light or colourful car
    repaints well; a dark car or a busy background falls back to the real photo.
    That is also exactly what the per-colour photo upload is for.

13. **Car photo metadata** (backend): `car_images` gained `angle`, `color_name`
    and `color_hex`. Existing databases are upgraded automatically on startup by
    `backend/app/services/migrations.py` (additive `ADD COLUMN` only, idempotent).
    - `POST /api/admin/cars/{id}/images?angle=&color_name=&color_hex=` — upload.
    - `PUT /api/admin/cars/{id}/images/{image_id}` — re-tag angle/colour/order.
    - `GET /api/cars/meta` now also returns `image_angles`.

14. **Docker** — `docker compose up --build` runs the whole stack:
    - `backend/Dockerfile` (python:3.12-slim, uvicorn on :8000). The SQLite file
      and `company_settings.json` live in the `database` volume at `/data`;
      uploaded photos live in the `uploads` volume. The container seeds the
      database on first start (seeding only inserts when the tables are empty).
    - `frontend/Dockerfile` (node:22-slim, Next.js `output: "standalone"` on
      :3000). It uses `npm install` rather than `npm ci` because the lockfile is
      generated on Windows and does not carry the Linux-only optional binaries.
    - `docker-compose.yml` wires them together; the frontend waits for the
      backend health check and reaches it at `http://backend:8000` via
      `BACKEND_URL` (used by both the Next rewrites and server-side fetching).
    - Override `JWT_SECRET` and `COMPANY_WHATSAPP_NUMBER` before going live.

15. **Black & gold identity with a light/dark switch.** Every colour utility
    resolves to a CSS variable, so `data-theme` on `<html>` re-skins the whole
    site: the default is black + gold, and the switch in the navbar turns it
    into white + black + gold. The choice is saved in `localStorage` and applied
    by a blocking snippet in `app/layout.tsx`, so there is no flash of the wrong
    theme. The real logo (`logorent/halabilogo.jpeg`) is trimmed, made
    transparent and shipped as `public/logo.png`, with a dark-text variant
    (`logo-light.png`) for the light skin and a square `favicon.ico` /
    `logo-mark.png`; `backend/scripts/prepare_assets.py` generates all of them.

16. **Availability is no longer shown to customers.** The status badge on car
    cards and the car page, and the "check availability" panel, are gone; the
    booking request is the only path, and the team confirms when they answer.
    Double-booking protection is unchanged server-side — when dates clash the
    customer now gets a "let us find you a similar car" panel with WhatsApp and
    similar-cars links instead of a rejection. A `FindMyCarCta` band sits at the
    bottom of the home page, the fleet list, the car page and the empty search
    result.

17. **Car cards** were rebuilt as premium automotive listings: full-bleed photo,
    gold category chip, name and price over a gradient, specs on one line, and
    "View Details" / "Reserve".

18. **Offices, map points and phone numbers** in the booking flow:
    - The three offices are seeded: **Dora Office**, **Aley Office** and
      **Beirut Airport Rafic Hariri** (approximate coordinates — adjust them in
      Admin → Locations, which now has a "Set on map" picker).
    - Customers can choose **"Other — pick on the map"**, which opens a slippy
      map built from OpenStreetMap tiles (no mapping library: the project cannot
      install new npm packages, and an embed cannot report back a click). Drag
      to pan, zoom with the buttons, optional "use my location"; the pin in the
      middle is the picked point.
    - A dropped pin is stored as an inactive `is_custom` location row, so the
      booking keeps a normal foreign key while the public dropdown and the admin
      location list stay clean. `locations` gained `latitude`, `longitude` and
      `is_custom` (additive migration).
    - The admin booking page shows **"Open on map"** for either end whenever
      coordinates exist, and the WhatsApp handoff includes the map link.
    - The phone field is now a country picker with **search over ~195 dialling
      codes** (`frontend/lib/countries.ts`) plus the national number; the form
      still receives one international string.

19. **Admin operations** added in this pass:
    - **New-booking alert.** `NewBookingAlert` polls pending bookings every 20s
      (and on window focus), plays a synthesised two-tone chime — no audio file
      to ship — and drops a banner with the customer names. The bell in the top
      bar mutes it; the last seen booking id lives in `localStorage`, so a
      refresh never replays old alerts and a brand-new browser adopts the
      current state silently instead of announcing the backlog.
    - **Returns due.** `GET /api/admin/bookings/due-returns?hours=` lists ACTIVE
      rentals whose return time falls inside the window, overdue first. The
      dashboard panel shows "due in 5h" / "3h overdue" and a one-click WhatsApp
      reminder to the customer.
    - **Share a booking.** The booking page can forward the customer's name,
      phone, both ends with map links, dates and price to any WhatsApp contact,
      or copy the same text to the clipboard.
    - **Fleet pricing.** `POST /api/admin/cars/bulk-price` re-prices every car,
      or one category, by a percentage (weekly/monthly rates follow) or to a
      flat daily rate, with an optional floor. The fleet table also edits a
      single daily price inline.
    - The **admin login** page now carries the logo, the black/gold treatment
      and the same theme switch as the public site.
    - The **booking reference is no longer shown to the customer** on the
      success screen; it stays on the admin side (and in the WhatsApp handoff
      the customer sends to the company, which is how the team finds the
      request).

---

## 8. Running with Docker

```bash
docker compose up --build        # first run: builds images and seeds the database
```

| Service  | URL                          |
|----------|------------------------------|
| Website  | http://localhost:3000        |
| API docs | http://localhost:8000/docs   |
| Admin    | http://localhost:3000/admin  |

Admin login: `admin@alhalabirent.com` / `Admin@2026`.

State lives in two named volumes — `database` (SQLite + company settings) and
`uploads` (car photos). `docker compose down` keeps them; `docker compose down -v`
deletes them and the next start re-seeds from scratch.
