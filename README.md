# 🏨 Hotel PMS — React + Supabase + Vercel

A full hotel property management system converted from the original vanilla JS app to a modern React stack.

---

## Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Frontend  | React 18 + Vite               |
| Styling   | Tailwind CSS                  |
| Database  | Supabase (Postgres)           |
| Deployment| Vercel                        |
| Auth      | Session-based (no Supabase Auth needed) |

---

## Setup in 4 steps

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. In the **SQL Editor**, paste the entire contents of `supabase_schema.sql` and run it
3. Copy your **Project URL** and **anon/public key** from Settings → API

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

### 4. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the repo on [vercel.com](https://vercel.com) and add the two env vars under **Settings → Environment Variables**.

---

## Login credentials

| Username | Password   | Role          | Access                          |
|----------|------------|---------------|---------------------------------|
| admin    | admin123   | Administrator | Everything                      |
| staff    | staff123   | Front Desk    | Dashboard, Bookings, Month View |

**To change passwords:** edit `src/hooks/useAuth.jsx` → `ACCOUNTS` object.

---

## Features

- **Dashboard** — room grid with colour-coded status (occupied, vacant, checkout, extended, maintenance, paid today)
- **Room modal** — guest info, payment ledger, key deposit, check-in/out timestamps, extend stay, move room
- **Month View** — scrollable calendar grid, one row per room, all 31 days
- **All Bookings** — searchable list with payment status
- **Room Management** (admin) — add/remove rooms, toggle maintenance
- **Room Rates** (admin) — edit prices per type and channel, plus add-on rates
- **Analytics** (admin) — income by day/week/month/year with bar chart and channel breakdown
- **Role-based access** — staff can't see prices, analytics, or room management

---

## Project structure

```
src/
  App.jsx                 — main shell, routing, topbar
  hooks/
    useAuth.jsx           — login, session, role checks
    useData.jsx           — Supabase data context (rooms, bookings, prices)
  lib/
    supabase.js           — Supabase client
    db.js                 — all database read/write functions
    utils.js              — date helpers, calculations, status logic
  components/
    Modal.jsx             — reusable modal wrapper
    Sidebar.jsx           — navigation sidebar
    Toast.jsx             — toast notifications
  pages/
    LoginPage.jsx
    Dashboard.jsx         — room grid
    RoomModal.jsx         — room detail modal (guest, calendar, details tabs)
    BookingModal.jsx      — add/edit booking form
    BookingsPage.jsx      — all bookings list
    RoomsPage.jsx         — room management (admin)
    PricesPage.jsx        — rates editor (admin)
    AnalyticsPage.jsx     — income analytics (admin)
    MonthView.jsx         — scrollable month calendar
supabase_schema.sql       — run once in Supabase SQL editor
```

---

## Supabase RLS note

The schema has RLS disabled (commented out) — fine for an internal tool accessed with the anon key behind a login screen. If you expose this publicly, enable RLS and add policies.
