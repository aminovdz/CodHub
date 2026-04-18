-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enum for Order Status
create type order_status as enum (
  'DRAFT', 
  'PENDING_AGENT_CONFIRMATION', 
  'HIGH_RISK_ADMIN_APPROVAL', 
  'DELIVERED', 
  'CONTINUITY_SUBSCRIBED',
  'CANCELED',
  'RTO'
);

-- Regions Table
create table public.regions (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique, -- 'dz', 'ro', 'co'
  name text not null,
  currency_code text not null,
  risk_weight numeric default 1.0, -- Managed in Admin Panel
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Agents Table
create table public.agents (
  id uuid references auth.users on delete cascade primary key,
  region_id uuid references public.regions(id) on delete cascade not null,
  name text not null,
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Blacklist Table
create table public.blacklist (
  phone text primary key,
  reason text,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Historical RTOs Table
create table public.historical_rtos (
  phone text primary key,
  rto_count integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Orders Table
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  region_id uuid references public.regions(id) not null,
  customer_name text,
  phone text,
  shipping_address text,
  base_price numeric default 0,
  bump_revenue numeric default 0,
  upsell_revenue numeric default 0,
  total_price numeric default 0,
  status order_status default 'DRAFT',
  fraud_score integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies Setup --
alter table public.regions enable row level security;
alter table public.agents enable row level security;
alter table public.blacklist enable row level security;
alter table public.historical_rtos enable row level security;
alter table public.orders enable row level security;

-- Regions: readable by everyone
create policy "Regions are readable by everyone" on public.regions for select using (true);

-- Agents: Agents can read their own profile
create policy "Agents can view own profile" on public.agents for select using (auth.uid() = id);

-- Orders: 
-- 1. Public can insert DRAFT orders (Anonymous webhook/checkout)
create policy "Public can insert DRAFT orders" on public.orders for insert with check (status = 'DRAFT'::order_status);

-- 2. Public can update their DRAFT orders anonymously (if needed, but usually we don't expose this without a token, so we can restrict to server-side only for updates)
-- Assuming updates are done via Server Action (which bypasses RLS using service_role key), we don't need a public update policy.

-- 3. Agents can read current orders for their region
create policy "Agents can view regional orders" on public.orders for select using (
  exists (
    select 1 from public.agents a 
    where a.id = auth.uid() and a.region_id = orders.region_id
  )
);

-- 4. Agents can update orders in their region
create policy "Agents can update regional orders" on public.orders for update using (
  exists (
    select 1 from public.agents a 
    where a.id = auth.uid() and a.region_id = orders.region_id
  )
);
