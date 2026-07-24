-- Enable Row Level Security (RLS) on remaining tables
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: LANDING PAGES
-- ============================================================================
-- Public can view landing pages
CREATE POLICY "Public view landing pages" ON public.landing_pages
    FOR SELECT
    USING (true);

-- Store owners and staff can manage their own landing pages
CREATE POLICY "Manage own store landing pages" ON public.landing_pages
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- ============================================================================
-- TABLE: SHIPPING ZONES
-- ============================================================================
-- Public can view shipping zones for checkout calculations
CREATE POLICY "Public view shipping zones" ON public.shipping_zones
    FOR SELECT
    USING (true);

-- Store owners and staff can manage their own shipping zones
CREATE POLICY "Manage own store shipping zones" ON public.shipping_zones
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- ============================================================================
-- TABLE: CHECKOUT CONFIGS
-- ============================================================================
-- Public can view checkout configs to load the checkout page
CREATE POLICY "Public view checkout configs" ON public.checkout_configs
    FOR SELECT
    USING (true);

-- Store owners and staff can manage their own checkout configs
CREATE POLICY "Manage own store checkout configs" ON public.checkout_configs
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- ============================================================================
-- TABLE: COUPONS
-- ============================================================================
-- Store owners and staff can manage their own coupons
CREATE POLICY "Manage own store coupons" ON public.coupons
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- ============================================================================
-- TABLE: ACTIVITY LOGS
-- ============================================================================
-- Activity logs are strictly for internal auditing.
-- Staff can only view and manage logs for their own store.
CREATE POLICY "Manage own store activity logs" ON public.activity_logs
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));
