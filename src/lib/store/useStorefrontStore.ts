import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../supabase';
import { Store, Product, ShippingZone, CheckoutConfig, Coupon, HomepageConfig, LegalPage, LandingPage, BlacklistedCustomer, rowToCheckoutConfig, rowToProduct, rowToShippingZone } from './useAdminStore';
import { slugify } from '../utils';

interface StorefrontState {
  availableStores: Store[];
  shippingZones: ShippingZone[];
  checkoutConfigs: CheckoutConfig[];
  products: Product[];
  coupons: Coupon[];
  customerBlacklist: BlacklistedCustomer[];
  homepages: HomepageConfig[];
  legalPages: LegalPage[];
  landingPages: LandingPage[];
  categories: any[];
  activeStore: Store | null;
  _hasHydrated: boolean;
  isLoading: boolean;
  
  setHasHydrated: (state: boolean) => void;
  fetchInitialData: (storeId?: string) => Promise<void>;
  setOrders: (updater: any) => void;
  setAbandonedCarts: (updater: any) => void;
  setProducts: (updater: any) => void;
  setCoupons: (updater: any) => void;
  addActivityLog: (log: any) => void;
}

export const useStorefrontStore = create<StorefrontState>()(
  persist(
    (set, get) => ({
      availableStores: [],
      shippingZones: [],
      checkoutConfigs: [],
      products: [],
      coupons: [],
      customerBlacklist: [],
      homepages: [],
      legalPages: [],
      landingPages: [],
      categories: [],
      activeStore: null,
      _hasHydrated: false,
      isLoading: true,
      
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      fetchInitialData: async (storeSlug?: string) => {
    // Fetch stores first to find the ID
    const { data: stores } = await supabase.from('stores').select('*');
    const store = storeSlug ? stores?.find((s: any) => s.region.toLowerCase() === storeSlug.toLowerCase() || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === storeSlug.toLowerCase()) : null;
    const storeId = store?.id;

    // Only fetch basic public tables
    let productsQuery = supabase.from('products').select('*').eq('active', true);
    let zonesQuery = supabase.from('shipping_zones').select('*');
    let configsQuery = supabase.from('checkout_configs').select('*');
    let landingPagesQuery = supabase.from('landing_pages').select('*');

    if (storeId) {
      productsQuery = productsQuery.eq('store_id', storeId);
      zonesQuery = zonesQuery.eq('store_id', storeId);
      configsQuery = configsQuery.eq('store_id', storeId);
      landingPagesQuery = landingPagesQuery.eq('store_id', storeId);
    }

    const [
      { data: products },
      { data: zones },
      { data: configs },
      { data: landingPages }
    ] = await Promise.all([
      productsQuery,
      zonesQuery,
      configsQuery,
      landingPagesQuery
    ]);

    // Format simple row to types here
    const mappedStores = stores?.map(s => ({
      id: s.id, region: s.region, name: s.name, currency: s.currency,
      language: s.language, customDomain: s.custom_domain,
      translations: s.translations, whatsappConfig: s.whatsapp_config,
      theme: s.translations?.theme, primaryColor: s.primary_color
    })) as Store[] || [];

    // Extract pages from translations
    const extractedHomepages: HomepageConfig[] = [];
    const extractedLegalPages: LegalPage[] = [];
    const extractedCoupons: Coupon[] = [];

    mappedStores.forEach(s => {
      if (s.translations && (s.translations as any).homepageConfig) {
        extractedHomepages.push((s.translations as any).homepageConfig as HomepageConfig);
      }
      if (s.translations && (s.translations as any).legalPages) {
        extractedLegalPages.push(...((s.translations as any).legalPages as LegalPage[]));
      }
      if (s.translations && (s.translations as any).coupons) {
        extractedCoupons.push(...((s.translations as any).coupons as Coupon[]));
      }
    });

    const mappedProducts = products ? products.map(rowToProduct) : [];
    const categories = Array.from(new Set(mappedProducts.map(p => p.category).filter(Boolean)));

    set({ 
      availableStores: mappedStores, 
      products: mappedProducts,
      shippingZones: zones ? zones.map(rowToShippingZone) : [],
      checkoutConfigs: configs ? configs.map(rowToCheckoutConfig) : [],
      landingPages: landingPages ? landingPages.map((row: any) => ({
        id: row.id,
        storeId: row.store_id,
        title: row.title,
        slug: row.slug,
        htmlContent: row.html_content,
        published: row.published
      })) as LandingPage[] : [],
      homepages: extractedHomepages,
      legalPages: extractedLegalPages,
      coupons: extractedCoupons,
      categories: categories,
      isLoading: false
    });
  },

  setOrders: () => {},
  setAbandonedCarts: () => {},
  setProducts: () => {},
  setCoupons: () => {},
  addActivityLog: () => {},
    }),
    {
      name: 'storefront-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
