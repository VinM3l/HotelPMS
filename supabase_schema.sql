-- ═══════════════════════════════════════════════════════
--  Hotel PMS — Supabase Schema
--  Run this in the Supabase SQL editor to set up the DB
-- ═══════════════════════════════════════════════════════

-- Enable RLS (row-level security is enabled per table below)

-- ── Hotels ────────────────────────────────────────────
create table if not exists hotels (
  id         text primary key,           -- 'square' | 'pool'
  name       text not null,
  created_at timestamptz default now()
);

insert into hotels (id, name) values
  ('square', 'Square Hotel'),
  ('pool',   'Pool Hotel')
on conflict do nothing;

-- ── Rooms ─────────────────────────────────────────────
create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   text references hotels(id) on delete cascade,
  number     text not null,             -- '100', '201', 'E01' …
  type       text not null,             -- 'standard' | 'family2' | 'family3'
  label      text not null,
  status     text not null default 'vacant', -- 'vacant' | 'maintenance'
  created_at timestamptz default now(),
  unique (hotel_id, number)
);

-- ── Prices ────────────────────────────────────────────
create table if not exists prices (
  id          uuid primary key default gen_random_uuid(),
  room_type   text not null,            -- 'standard' | 'family2' | 'family3'
  source      text not null,            -- 'T' | 'W' | 'B' | 'AG' | 'EX'
  rate        numeric not null default 0,
  unique (room_type, source)
);

insert into prices (room_type, source, rate) values
  ('standard','T',1500),('standard','W',1800),('standard','B',1600),('standard','AG',1550),('standard','EX',1650),
  ('family2','T',2200),('family2','W',2600),('family2','B',2350),('family2','AG',2300),('family2','EX',2400),
  ('family3','T',2800),('family3','W',3200),('family3','B',2950),('family3','AG',2900),('family3','EX',3000)
on conflict do nothing;

-- ── Add-on rates ──────────────────────────────────────
create table if not exists addon_rates (
  id    text primary key,               -- 'extraHead' | 'extraBed' | 'breakfast'
  rate  numeric not null default 0
);

insert into addon_rates (id, rate) values
  ('extraHead', 350),
  ('extraBed',  500),
  ('breakfast', 150)
on conflict do nothing;

-- ── Bookings ──────────────────────────────────────────
create table if not exists bookings (
  id                text primary key default 'b'||extract(epoch from now())::bigint||floor(random()*10000)::text,
  hotel_id          text references hotels(id),
  room_number       text not null,
  guest             text not null,
  source            text not null default 'W',
  checkin           date not null,
  checkout          date not null,
  checkin_time_str  text not null default '14:00',
  checkout_time_str text not null default '12:00',
  extra_head        int  not null default 0,
  extra_bed         int  not null default 0,
  breakfast         int  not null default 0,
  discount_type     text not null default 'none',
  discount_value    numeric not null default 0,
  discount_note     text not null default '',
  notes             text not null default '',
  checked_out       boolean not null default false,
  checked_out_date  date,
  invalid_checkout  boolean not null default false,
  invalid_checkout_date date,
  checkin_time      timestamptz,
  checkout_time     timestamptz,
  extensions        jsonb not null default '[]',
  payments          jsonb not null default '[]',
  room_moves        jsonb not null default '[]',
  key_deposit       boolean not null default false,
  created_at        timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────
create index if not exists bookings_hotel_room on bookings(hotel_id, room_number);
create index if not exists bookings_dates      on bookings(checkin, checkout);

-- ── Seed Rooms — Square Hotel ─────────────────────────
do $$
declare r int;
begin
  -- Floor 1: 100–118 except 103
  for r in 100..118 loop
    if r <> 103 then
      insert into rooms (hotel_id, number, type, label)
      values ('square', r::text, 'standard', 'Standard Room')
      on conflict do nothing;
    end if;
  end loop;
  -- Floor 2: 201–222 except 213
  for r in 201..222 loop
    if r <> 213 then
      insert into rooms (hotel_id, number, type, label)
      values ('square', r::text, 'family2', 'Family Room (2 pax)')
      on conflict do nothing;
    end if;
  end loop;
  -- Floor 3: 301–309
  for r in 301..309 loop
    insert into rooms (hotel_id, number, type, label)
    values ('square', r::text, 'family3', 'Family Room (3 pax)')
    on conflict do nothing;
  end loop;
  -- Extended rooms
  for r in 1..3 loop
    insert into rooms (hotel_id, number, type, label)
    values ('square', 'E0'||r, 'standard', 'Standard Room')
    on conflict do nothing;
  end loop;
end $$;

-- Pool Hotel rooms
do $$
declare r int;
begin
  for r in 101..106 loop
    insert into rooms (hotel_id, number, type, label)
    values ('pool', r::text, 'standard', 'Standard Room')
    on conflict do nothing;
  end loop;
  for r in 201..206 loop
    insert into rooms (hotel_id, number, type, label)
    values ('pool', r::text, 'family2', 'Family Room (2 pax)')
    on conflict do nothing;
  end loop;
end $$;

-- ── Row-Level Security (optional but recommended) ─────
-- If using Supabase auth, enable RLS and add policies.
-- For internal tool with service_role key, RLS can stay off.
-- alter table bookings enable row level security;
-- alter table rooms    enable row level security;
