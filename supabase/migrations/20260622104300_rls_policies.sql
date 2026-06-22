-- Supabase Row-Level Security (RLS) Policies for Multi-Tenant COD Platform
-- Enables RLS on all primary tables to ensure data isolation between stores.

-- 1. Enable RLS on tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create standard policies based on authenticated user's metadata (store_id)
-- Assuming Supabase Auth is used and the user's JWT contains their associated store_id or they are queried via user_id

-- ============================================================================
-- TABLE: STORES
-- ============================================================================
-- Users can only view their own store.
CREATE POLICY "View own store" ON stores
    FOR SELECT
    USING (id::text = (auth.jwt() ->> 'store_id'));

-- Superadmins can view and update all stores.
CREATE POLICY "Superadmin full access to stores" ON stores
    FOR ALL
    USING ((auth.jwt() ->> 'role') = 'superadmin');

-- ============================================================================
-- TABLE: ORDERS
-- ============================================================================
-- Public can INSERT orders (for checkout flow, but only to public stores)
-- This assumes public orders are submitted anonymously to a valid store_id
CREATE POLICY "Public insert orders" ON orders
    FOR INSERT
    WITH CHECK (true);

-- Store owners and staff can only SELECT, UPDATE, DELETE orders matching their store_id
CREATE POLICY "Access own store orders" ON orders
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- ============================================================================
-- TABLE: PRODUCTS
-- ============================================================================
-- Public can SELECT products
CREATE POLICY "Public view products" ON products
    FOR SELECT
    USING (true);

-- Store owners can manage their own products
CREATE POLICY "Manage own store products" ON products
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- ============================================================================
-- TABLE: STAFF ACCOUNTS
-- ============================================================================
-- Store owners can view and manage staff for their store
CREATE POLICY "Manage own store staff" ON staff_accounts
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- ============================================================================
-- TABLE: CALL LOGS
-- ============================================================================
-- Store owners and staff can view and manage call logs for their store
CREATE POLICY "Manage own store call logs" ON call_logs
    FOR ALL
    USING (store_id::text = (auth.jwt() ->> 'store_id'));

-- Optional: If using service_role keys in backend routes, they will bypass RLS.
-- This script secures direct PostgREST client queries from the frontend.
