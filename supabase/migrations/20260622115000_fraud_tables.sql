-- Create Blacklist table
create table if not exists public.blacklist (
    id uuid default gen_random_uuid() primary key,
    store_id text not null,
    phone text not null,
    name text,
    reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Historical RTOs table
create table if not exists public.historical_rtos (
    id uuid default gen_random_uuid() primary key,
    store_id text not null,
    phone text not null,
    order_id text,
    reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Rate Limits table
create table if not exists public.rate_limits (
    id uuid default gen_random_uuid() primary key,
    ip text not null,
    count integer not null default 1,
    reset_time bigint not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add B-Tree indexes for fast lookups
create index if not exists idx_blacklist_phone on public.blacklist using btree(phone);
create index if not exists idx_historical_rtos_phone on public.historical_rtos using btree(phone);
create index if not exists idx_rate_limits_ip on public.rate_limits using btree(ip);

-- Enable RLS
alter table public.blacklist enable row level security;
alter table public.historical_rtos enable row level security;
alter table public.rate_limits enable row level security;

-- Add basic policies
create policy "Allow read access to authenticated users" on public.blacklist for select to authenticated using (true);
create policy "Allow read access to authenticated users" on public.historical_rtos for select to authenticated using (true);
