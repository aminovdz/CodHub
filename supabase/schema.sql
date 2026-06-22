-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean up existing tables (Optional: Only if you want to start fresh)
drop table if exists public.checkout_configs cascade;
drop table if exists public.coupons cascade;
drop table if exists public.shipping_zones cascade;
drop table if exists public.landing_pages cascade;
drop table if exists public.orders cascade;
drop table if exists public.products cascade;
drop table if exists public.staff_accounts cascade;
drop table if exists public.stores cascade;

-- 1. Stores Table
create table public.stores (
    id uuid primary key default uuid_generate_v4(),
    region text not null,
    name text not null,
    currency text not null,
    language text,
    phone_prefix text,
    primary_color text,
    translations jsonb,
    analytics jsonb,
    resend_api_key text,
    notify_email text,
    yalidine_api_key text,
    yalidine_api_token text,
    generic_webhook_url text,
    whatsapp_config jsonb,
    dz_fulfillment jsonb,
    fraud_config jsonb,
    sticky_buy_button jsonb,
    custom_domain text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Staff Accounts Table
create table public.staff_accounts (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    role text not null,
    pin text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Products Table
create table public.products (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid references public.stores(id) on delete cascade,
    title text not null,
    category text,
    price numeric not null,
    compare_at_price numeric,
    active boolean default true,
    image text,
    short_desc text,
    main_desc text,
    stock integer default 0,
    low_stock_threshold integer default 5,
    variants jsonb,
    enable_variants boolean default false,
    related_products text,
    maximizer_upsells jsonb,
    blocks jsonb,
    seo_title text,
    seo_description text,
    seo_slug text unique,
    stars_rate numeric,
    reviews_count integer,
    oto_product_id uuid,
    disable_out_of_stock_purchases boolean default false,
    disable_coupons boolean default false,
    cost_price numeric,
    weight numeric,
    shipping_cost numeric,
    is_bundle boolean default false,
    bundle_items jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Orders Table
create table public.orders (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid references public.stores(id) on delete cascade,
    customer text not null,
    phone text not null,
    address text not null,
    city text,
    postal_code text,
    province text,
    country text,
    wilaya text,
    commune text,
    product text not null,
    product_id uuid references public.products(id) on delete set null,
    total numeric not null,
    delivery_rate numeric,
    status text default 'PENDING',
    date timestamp with time zone default timezone('utc'::text, now()) not null,
    discount_amount numeric default 0,
    upsell_total numeric default 0,
    tracking_number text,
    notes jsonb,
    payment_method text,
    fraud_score integer,
    fraud_flags jsonb,
    ip_address text,
    fulfillment_provider text,
    fulfillment_status text,
    custom_fields jsonb
);

-- 5. Landing Pages
create table public.landing_pages (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid references public.stores(id) on delete cascade,
    title text,
    slug text not null,
    html_content text,
    published boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Shipping Zones
create table public.shipping_zones (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid references public.stores(id) on delete cascade,
    wilaya text not null,
    commune text,
    home_delivery_rate numeric not null,
    desk_delivery_rate numeric,
    estimated_days integer,
    active boolean default true
);

-- 7. Coupons
create table public.coupons (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid references public.stores(id) on delete cascade,
    code text not null,
    type text not null,
    value numeric not null,
    active boolean default true,
    usage_limit integer,
    used_count integer default 0
);

-- 8. Checkout Configs
create table public.checkout_configs (
    store_id uuid primary key references public.stores(id) on delete cascade,
    address_autocomplete boolean default false,
    autocomplete_api_key text,
    show_address_fields boolean default true,
    fields jsonb,
    custom_fields jsonb,
    enable_step2_upsell boolean default false,
    countdown_minutes integer default 5,
    enable_post_purchase_oto boolean default false,
    enable_digital_receipt boolean default false,
    thank_you_message text
);

-- Row Level Security (RLS) policies are managed in migrations

-- 9. Activity Logs Table
create table public.activity_logs (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid references public.stores(id) on delete cascade,
    "user" text not null,
    action text not null,
    detail text not null,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

