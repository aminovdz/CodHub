import { create } from 'zustand';
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
  
  fetchInitialData: () => Promise<void>;
  setOrders: (updater: any) => void;
  setAbandonedCarts: (updater: any) => void;
  setProducts: (updater: any) => void;
  setCoupons: (updater: any) => void;
  addActivityLog: (log: any) => void;
}

export const useStorefrontStore = create<StorefrontState>((set, get) => ({
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
  _hasHydrated: true,
  isLoading: true,

  fetchInitialData: async () => {
    // Only fetch basic public tables
    const [
      { data: stores },
      { data: products },
      { data: zones },
      { data: configs },
      { data: landingPages }
    ] = await Promise.all([
      supabase.from('stores').select('*'),
      supabase.from('products').select('*').eq('active', true),
      supabase.from('shipping_zones').select('*'),
      supabase.from('checkout_configs').select('*'),
      supabase.from('landing_pages').select('*')
    ]);

    // Format simple row to types here
    const mappedStores = stores?.map(s => ({
      id: s.id, region: s.region, name: s.name, currency: s.currency,
      language: s.language, customDomain: s.custom_domain,
      translations: s.translations, whatsappConfig: s.whatsapp_config
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
}));
