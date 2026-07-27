import { create } from 'zustand';
import { slugify } from '../utils';

import { DEFAULT_TRANSLATIONS } from '../translations';

import { useNotificationStore } from './useNotificationStore';
import { adminDbSelect, adminDbInsert, adminDbUpdate, adminDbDelete, adminDbUpsert } from '../actions/adminDb';

export const ALGERIA_WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arreridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
];

export const SPAIN_PROVINCES = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Baleares", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba", "Cuenca", "Gerona", "Granada", "Guadalajara", "Guipúzcoa", "Huelva", "Huesca", "Jaén", "La Coruña", "La Rioja", "Las Palmas", "León", "Lérida", "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Orense", "Palencia", "Pontevedra", "Salamanca", "Segovia", "Sevilla", "Soria", "Tarragona", "Tenerife", "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza", "Ceuta", "Melilla"
];

export const ROMANIA_COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila", "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea", "Vrancea", "București"
];

export const COUNTRY_DATA: Record<string, { name: string, states: string[] }> = {
  "DZ": { name: "Algeria", states: ALGERIA_WILAYAS },
  "ES": { name: "Spain", states: SPAIN_PROVINCES },
  "RO": { name: "Romania", states: ROMANIA_COUNTIES }
};

export function resolveStore(availableStores: Store[], storeSlugOrRegion: string): Store | undefined {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.replace('www.', '').split(':')[0];
    const found = availableStores.find(s => s.customDomain && s.customDomain.replace('www.', '').toLowerCase() === host.toLowerCase());
    if (found) return found;
  }
  
  if (!storeSlugOrRegion) return undefined;
  const lowerQuery = storeSlugOrRegion.toLowerCase();
  return availableStores.find(s => 
    slugify(s.name) === lowerQuery || 
    s.region.toLowerCase() === lowerQuery ||
    (s.customDomain && s.customDomain.replace('www.', '').toLowerCase() === lowerQuery)
  );
}

// --- Mappers: camelCase Store ↔ snake_case Supabase row ---
function storeToRow(store: Partial<Store> & { id?: string }) {
  return {
    ...(store.id && !store.id.startsWith('store_') ? { id: store.id } : {}), // only pass UUID ids
    region: store.region,
    name: store.name,
    currency: store.currency,
    language: store.language,
    phone_prefix: store.phonePrefix,
    primary_color: store.primaryColor,
    analytics: store.analytics,
    resend_api_key: store.resendApiKey,
    notify_email: store.notifyEmail,
    yalidine_api_key: store.yalidineApiKey,
    yalidine_api_token: store.yalidineApiToken,
    generic_webhook_url: store.genericWebhookUrl,
    whatsapp_config: store.whatsappConfig,
    dz_fulfillment: store.dzFulfillment,
    fraud_config: store.fraudConfig,
    sticky_buy_button: store.stickyBuyButton,
    custom_domain: store.customDomain,
    translations: {
      ...store.translations,
      brand: {
        ...(store.translations?.brand || {}),
        ...(store.logoUrl !== undefined ? { logoUrl: store.logoUrl } : {}),
        ...(store.faviconUrl !== undefined ? { faviconUrl: store.faviconUrl } : {}),
      },
      theme: store.theme !== undefined ? store.theme : store.translations?.theme,
    }
  };
}

import { AgentSkill } from '../agents/types';

function rowToStore(row: any): Store {
  return {
    id: row.id,
    region: row.region,
    name: row.name,
    currency: row.currency,
    language: row.language,
    phonePrefix: row.phone_prefix,
    primaryColor: row.primary_color,
    translations: row.translations,
    analytics: row.analytics,
    resendApiKey: row.resend_api_key,
    notifyEmail: row.notify_email,
    yalidineApiKey: row.yalidine_api_key,
    yalidineApiToken: row.yalidine_api_token,
    genericWebhookUrl: row.generic_webhook_url,
    whatsappConfig: row.whatsapp_config,
    dzFulfillment: row.dz_fulfillment,
    fraudConfig: row.fraud_config,
    stickyBuyButton: row.sticky_buy_button || { enabled: false, text: 'Order Now', customCss: '' },
    customDomain: row.custom_domain,
    logoUrl: row.translations?.brand?.logoUrl,
    faviconUrl: row.translations?.brand?.faviconUrl,
    theme: row.translations?.theme,
  };
}

// --- Product mappers ---
function productToRow(p: Partial<Product> & { id?: string }) {
  return {
    store_id: (p as any).storeId,
    title: p.title,
    category: p.category,
    price: p.price,
    compare_at_price: p.compareAtPrice,
    active: p.active,
    image: p.image,
    images: p.images,
    short_desc: p.shortDesc,
    main_desc: p.mainDesc,
    stock: p.stock,
    low_stock_threshold: p.lowStockThreshold,
    variants: p.variants,
    enable_variants: p.enableVariants,

    maximizer_upsells: (p.maximizerUpsells !== undefined || p.orderBumps !== undefined || p.quantityOffers !== undefined) ? [
      ...(p.maximizerUpsells || []).map(u => ({ ...u, _type: 'maximizer' })),
      ...(p.orderBumps || []).map(b => ({ ...b, _type: 'bump' })),
      ...(p.quantityOffers || []).map(q => ({ ...q, _type: 'quantity' }))
    ] : undefined,
    blocks: p.blocks,
    seo_title: p.seoTitle,
    seo_description: p.seoDescription,
    seo_slug: p.seoSlug || (p.title ? p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : null),
    stars_rate: p.starsRate,
    reviews_count: p.reviewsCount,
    oto_product_id: p.otoProductId || null,
    disable_out_of_stock_purchases: p.disableOutOfStockPurchases,
    disable_coupons: p.disableCoupons,
    oto_price: p.otoPrice || null,
    related_products: p.relatedProductIds ? JSON.stringify(p.relatedProductIds) : null,

    cost_price: p.costPrice,
    weight: p.weight,
    shipping_cost: p.shippingCost,
    is_bundle: p.isBundle,
    bundle_items: p.bundleItems,
  };
}

export function rowToProduct(row: any): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    category: row.category,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    active: row.active,
    image: row.image || '',
    images: row.images || undefined,
    shortDesc: row.short_desc || '',
    mainDesc: row.main_desc || '',
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    variants: row.variants,
    enableVariants: row.enable_variants,
    relatedProducts: row.related_products,
    maximizerUpsells: (row.maximizer_upsells || []).filter((u: any) => !u._type || u._type === 'maximizer'),
    blocks: row.blocks,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoSlug: row.seo_slug,
    starsRate: row.stars_rate,
    reviewsCount: row.reviews_count,
    otoProductId: row.oto_product_id,
    disableOutOfStockPurchases: row.disable_out_of_stock_purchases,
    disableCoupons: !!row.disable_coupons,
    otoPrice: row.oto_price,
    relatedProductIds: (() => {
      if (!row.related_products) return undefined;
      try { return JSON.parse(row.related_products); } catch (e) { return undefined; }
    })(),
    deliveryAgency: row.delivery_agency || undefined,
    costPrice: row.cost_price || undefined,
    weight: row.weight,
    shippingCost: row.shipping_cost,
    isBundle: !!row.is_bundle,
    bundleItems: row.bundle_items || [],
    quantityOffers: (row.maximizer_upsells || []).filter((u: any) => u._type === 'quantity'),
    orderBumps: (row.maximizer_upsells || []).filter((u: any) => u._type === 'bump'),
  };
}

// --- Staff mappers ---
function staffToRow(s: Partial<StaffAccount> & { id?: string }) {
  const row: any = {};
  if (s.name !== undefined) row.name = s.name;
  // email is intentionally omitted because it does not exist in the staff_accounts DB schema
  if (s.role !== undefined) row.role = s.role;
  if (s.pin !== undefined) row.pin = s.pin;
  if (s.storeId !== undefined) row.store_id = s.storeId || null;
  return row;
}

function rowToStaff(row: any): StaffAccount {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    pin: row.pin,
    storeId: row.store_id || undefined,
  };
}

// --- ShippingZone mappers ---
export function rowToShippingZone(row: any): ShippingZone {
  return {
    id: row.id,
    storeId: row.store_id,
    wilaya: row.wilaya,
    commune: row.commune,
    deliveryRate: row.home_delivery_rate ?? row.delivery_rate ?? 0,
    deskRate: row.desk_delivery_rate,
  };
}

function shippingZoneToRow(z: ShippingZone) {
  return {
    store_id: z.storeId,
    wilaya: z.wilaya,
    commune: z.commune,
    home_delivery_rate: z.deliveryRate,
    desk_delivery_rate: z.deskRate,
  };
}

function checkoutConfigToRow(c: CheckoutConfig) {
  return {
    store_id: c.storeId,
    address_autocomplete: c.addressAutocomplete,
    autocomplete_api_key: c.autocompleteApiKey,
    fields: {
      ...c.fields,
      productCheckoutType: c.productCheckoutType,
      layout: c.layout,
      enableTrustBanner: c.enableTrustBanner
    },
    custom_fields: c.customFields,
    enable_step2_upsell: c.enableStep2Upsell,
    countdown_minutes: c.countdownMinutes,
    enable_post_purchase_oto: c.enablePostPurchaseOTO,
    enable_digital_receipt: c.enableDigitalReceipt,
    thank_you_message: c.thankYouMessage,
    show_address_fields: c.showAddressFields
  };
}

export function rowToCheckoutConfig(row: any): CheckoutConfig {
  let fields = row.fields || { showEmail: false, requireEmail: false, showLastName: false };
  if (typeof fields === 'string') {
    try {
      fields = JSON.parse(fields);
    } catch (e) {}
  }

  let customFields = row.custom_fields || [];
  if (typeof customFields === 'string') {
    try {
      customFields = JSON.parse(customFields);
    } catch (e) {}
  }

  return {
    storeId: row.store_id,
    addressAutocomplete: row.address_autocomplete ?? false,
    autocompleteApiKey: row.autocomplete_api_key || '',
    showAddressFields: row.show_address_fields ?? true,
    fields: {
      showEmail: fields.showEmail ?? false,
      requireEmail: fields.requireEmail ?? false,
      showLastName: fields.showLastName ?? false,
      showCity: fields.showCity ?? true,
      showPostalCode: fields.showPostalCode ?? false,
      showProvince: fields.showProvince ?? true,
      showCountry: fields.showCountry ?? false,
      scarcityConfig: fields.scarcityConfig,
    },
    productCheckoutType: fields.productCheckoutType || 'redirect',
    layout: fields.layout || '1-step',
    enableTrustBanner: fields.enableTrustBanner ?? true,
    customFields,
    enableStep2Upsell: row.enable_step2_upsell ?? true,
    countdownMinutes: row.countdown_minutes,
    enablePostPurchaseOTO: row.enable_post_purchase_oto ?? false,
    enableDigitalReceipt: row.enable_digital_receipt ?? true,
    thankYouMessage: row.thank_you_message || ''
  };
}

function rowToOrder(row: any): Order {
  let cleanAddress = row.address;
  let cleanCity = row.city;
  let cleanPostalCode = row.postal_code;
  let cleanProvince = row.province;
  let cleanCountry = row.country;
  let cleanWilaya = row.wilaya;
  let cleanCommune = row.commune;

  // Fix: Handle JSON stringified address if it exists
  if (typeof row.address === 'string' && row.address.startsWith('{')) {
    try {
      const parsed = JSON.parse(row.address);
      cleanAddress = parsed.landmark || parsed.address || cleanAddress;
      cleanCity = parsed.city || cleanCity;
      cleanPostalCode = parsed.postalCode || cleanPostalCode;
      cleanProvince = parsed.province || cleanProvince;
      cleanCountry = parsed.country || cleanCountry;
      cleanWilaya = parsed.wilaya || cleanWilaya;
      cleanCommune = parsed.commune || cleanCommune;
    } catch (e) {}
  }

  return {
    id: row.id,
    storeId: row.store_id,
    customer: row.customer,
    phone: row.phone,
    address: cleanAddress,
    wilaya: cleanWilaya,
    commune: cleanCommune,
    product: row.product,
    total: row.total,
    deliveryRate: row.delivery_rate,
    status: row.status,
    date: row.date,
    discountAmount: row.discount_amount,
    upsellTotal: row.upsell_total,
    trackingNumber: row.tracking_number,
    notes: row.notes,
    paymentMethod: row.payment_method,
    fraudScore: row.fraud_score,
    fraudFlags: row.fraud_flags,
    ipAddress: row.ip_address,
    fulfillmentProvider: row.fulfillment_provider,
    fulfillmentStatus: row.fulfillment_status,
    customFields: row.custom_fields,
    city: cleanCity,
    postalCode: cleanPostalCode,
    province: cleanProvince,
    country: cleanCountry,
    step: row.step || row.custom_fields?.step || 'Checkout',
    quantity: row.quantity,
    costPrice: row.cost_price,
    source: row.source,
    claimedBy: row.claimed_by,
    confirmedBy: row.confirmed_by,
    variantLabel: row.variant_label,
  };
}

function rowToAbandonedCart(row: any): AbandonedCart {
  return {
    id: row.id,
    storeId: row.store_id,
    customer: row.customer,
    phone: row.phone,
    product: row.product,
    total: row.total,
    step: row.step || row.custom_fields?.step || 'Checkout',
    date: row.date,
  };
}


export interface ThemeConfig {
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  typography?: {
    headingFont?: string;
    bodyFont?: string;
  };
  shapes?: {
    buttonStyle?: 'sharp' | 'rounded' | 'pill';
    cardStyle?: 'flat' | 'bordered' | 'floating';
  };
  trust?: {
    badgesUrl?: string;
    socialLinks?: {
      instagram?: string;
      facebook?: string;
      tiktok?: string;
    }
  };
  hero?: {
    bannerUrl?: string;
    bannerUrlMobile?: string;
    announcementBgColor?: string;
    announcementTextColor?: string;
    announcementMarquee?: boolean;
  };
  advanced?: {
    customCss?: string;
  };
}

export interface Store {
  id: string;
  region: string;
  name: string;
  currency: string;
  customDomain?: string;
  language?: string;
  phonePrefix?: string;
  primaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  theme?: ThemeConfig;
  translations?: Record<string, any>;
  analytics?: {
    google?: string;
    facebook?: string;
    tiktok?: string;
    snapchat?: string;
    pinterest?: string;
  };
  resendApiKey?: string;
  notifyEmail?: string;
  yalidineApiKey?: string;
  yalidineApiToken?: string;
  genericWebhookUrl?: string;
  smsConfig?: {
    enabled?: boolean;
    provider?: 'twilio' | 'vonage' | 'smsdz';
    apiKey?: string;
    apiSecret?: string;
    senderId?: string;
    confirmationTemplate?: string;
  };
  whatsappConfig?: {
    abandonedCartEnabled?: boolean;
    abandonedCartDelayMinutes?: number;
    abandonedCartScript: string;
    thankYouEnabled: boolean;
    thankYouNumber: string;
    thankYouMessage: string;
    metaEnabled?: boolean;
    metaPhoneNumberId?: string;
    metaAccessToken?: string;
    metaTemplateName?: string;
    metaLanguageCode?: string;
    metaTemplateParams?: string; // Comma separated, e.g. '[NAME],[ORDER_ID]'
    metaIgnoreSelfConfirmed?: boolean;
    metaAbandonedCartTemplateName?: string;
    chatbotEnabled?: boolean;
    chatbotName?: string;
    chatbotInstructions?: string;
    chatbotProvider?: 'gemini' | 'claude' | 'openai' | 'openrouter' | 'nvidia';
    chatbotModel?: string;
    chatbotApiKey?: string;
    customTemplates?: { id: string; name: string; text: string; }[];
  };
  dzFulfillment?: {
    defaultProvider: 'yalidine' | 'zrexpress' | 'mayestro' | 'dhd';
    yalidine?: { apiKey: string; apiToken: string };
    zrexpress?: { apiKey: string; apiToken: string; branchId: string };
    mayestro?: { apiKey: string };
    dhd?: { apiKey: string; apiToken: string };
    autoRoutingEnabled?: boolean;
    trackConfirmationTime?: boolean;
  };
  fraudConfig?: {
    blockDuplicateIps: boolean;
    duplicateIpTimeframeHours: number;
    requireApprovalForHighValue: boolean;
    highValueThreshold: number;
  };
  stickyBuyButton?: {
    enabled: boolean;
    text: string;
    customCss?: string;
  };
}

export interface StaffAccount {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'fulfillment' | 'confirmation';
  pin: string;
  storeId?: string;
  storeIds?: string[];
  permissions?: {
    canExport: boolean;
    canEditTotals: boolean;
    canDeleteNotes: boolean;
    canAssignOrders: boolean;
  };
  isOnline?: boolean;
  lastActive?: string;
}

export interface MaximizerUpsell {
  id: string; // Unique ID for this upsell config
  targetProductId: string; // The product being upsold
  customPrice: number; // Discounted price just for the upsell
  customImage?: string; // Optional image override
  titleOverride?: string; // e.g. "Add 1 More for 50% Off!"
}

export interface ProductVariant {
  id: string;
  label: string;          // e.g. "Large", "Red"
  sku?: string;
  stock: number;
  priceModifier: number;  // +/- from base price
}

export interface BundleItem {
  productId: string;
  qty: number;
}

// Quantity-break offer shown on checkout (e.g. "Buy 2 get 15% off")
export interface QuantityOffer {
  id: string;
  qty: number;          // e.g. 1, 2, 3
  label: string;        // e.g. "2 Items — Best Value"
  price: number;        // total price for this bundle
  badge?: string;       // optional ribbon text e.g. "Most Popular"
  isDefault?: boolean;  // pre-selected when page loads
}

// Order Bump offered as a checkbox on the checkout form
export interface OrderBump {
  id: string;
  title: string;        // e.g. "Yes, add expedited shipping"
  description?: string; // e.g. "Get it 2 days faster!"
  price: number;
  image?: string;
  targetProductId?: string; // If this bump corresponds to a real product in the catalog
}

export interface Product {
  id: string;
  storeId: string;
  title: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  active: boolean;
  image: string;
  images?: string[];
  shortDesc: string;
  mainDesc: string;
  stock?: number;                  // total stock (used when no variants)
  lowStockThreshold?: number;      // alert threshold, default 5
  variants?: ProductVariant[];     // optional size/color/model variants
  enableVariants?: boolean;
  relatedProducts?: string;
  maximizerUpsells?: MaximizerUpsell[];
  blocks?: HomepageBlock[];
  seoTitle?: string;
  seoDescription?: string;
  seoSlug?: string;
  starsRate?: number;
  reviewsCount?: number;
  otoProductId?: string;
  otoPrice?: number;
  relatedProductIds?: string[];
  disableOutOfStockPurchases?: boolean;
  disableCoupons?: boolean;
  deliveryAgency?: string;         // specific fulfillment agency assignment
  // New fields
  costPrice?: number;              // purchase/production cost for margin calc
  weight?: number;                 // weight in grams (for fulfillment APIs)
  shippingCost?: number;           // product-specific delivery fee override
  isBundle?: boolean;              // is this a bundle/combo product?
  bundleItems?: BundleItem[];      // products included in bundle
  quantityOffers?: QuantityOffer[];// optional checkout quantity-break offers
  orderBumps?: OrderBump[];
}

export interface LandingPage {
  id: string;
  storeId: string;
  title?: string;
  slug: string;
  htmlContent: string;
  published: boolean;
}

export interface LegalPage {
  id: string;
  storeId: string;
  title?: string;
  slug: string;
  htmlContent: string;
}

export interface OrderNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Order {
  id: string;
  storeId: string;
  customer: string;
  phone: string;
  address: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  wilaya?: string;
  commune?: string;
  product: string;
  productId?: string;
  total: number;
  deliveryRate?: number;
  discountAmount?: number;
  upsellTotal?: number;
  costPrice?: number;         // purchase cost for margin calc
  status: string;
  step?: string;
  date: string;
  trackingNumber?: string;
  paymentMethod?: string;
  fraudScore?: number;
  fraudFlags?: string[];
  ipAddress?: string;
  fulfillmentProvider?: string;
  fulfillmentStatus?: string;
  customFields?: any;
  confirmedBy?: string;       // agent name who confirmed
  variantLabel?: string;      // selected variant label
  notes?: OrderNote[];        // internal agent comments
  callAttempts?: number;      // number of call attempts
  claimedBy?: string;         // agent who claimed this order
  source?: 'facebook' | 'tiktok' | 'snapchat' | 'direct' | 'other';
  shippedDate?: string;
  deliveredDate?: string;
  quantity?: number;          // number of units ordered
}

export interface AbandonedCart {
  id: string;
  storeId: string;
  customer: string;
  phone: string;
  product: string;
  total: number;
  step: string;
  date: string;
}

export interface CallLog {
  id: string;
  orderId: string;
  storeId: string;
  agentName: string;
  result: 'answered' | 'no_answer' | 'confirmed' | 'canceled' | 'rescheduled';
  note: string;
  calledAt: string;
}

export interface ActivityLog {
  id: string;
  storeId: string;
  user: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface Coupon {
  id: string;
  storeId: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  expiresAt?: string;
}

export interface BlacklistedCustomer {
  id: string;
  storeId: string;
  phone: string;
  name?: string;
  reason: string;
  addedAt: string;
  addedBy: string;
}

export interface StaffGoal {
  id: string;
  storeId: string;
  agentName: string;
  targetOrders: number;
  targetRevenue: number;
  month: string;             // YYYY-MM format
  createdAt: string;
}

export interface CommissionEntry {
  id: string;
  storeId: string;
  agentName: string;
  amount: number;
  reason: string;
  type: 'COMMISSION' | 'BONUS' | 'PENALTY';
  date: string;
}

export interface ShippingZone {
  id: string;
  storeId: string;
  wilaya: string;
  commune: string;
  deliveryRate: number;
  deskRate?: number;
}

// Keep legacy for existing, but new features use Store.fraudConfig
export interface FraudRules {
  storeId: string;
  requirePhone: boolean;
  blockDuplicateIps: boolean;
  duplicateIpAttempts: number;
  duplicateIpTimeframeHours: number;
  allowedCountries: string; // comma separated country codes
  autoApproveLowRisk: boolean;
  requireAgentHighValue: boolean;
  highValueThreshold: number;
}

export interface HomepageBlock {
  id: string;
  type: 'hero' | 'text' | 'html' | 'product_grid' | 'category_grid' | 'features';
  content: string; // For text/html/hero
  productIds?: string[]; // For product_grid
  categoryIds?: string[]; // For category_grid
  features?: { title: string, description: string, icon: string }[]; // For features block
}

export interface FooterConfig {
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: { platform: string; url: string }[];
  storeLinks?: { label: string; url: string }[];
  legalLinks?: { label: string; url: string }[];
}

export interface HomepageConfig {
  storeId: string;
  blocks: HomepageBlock[];
  footer: FooterConfig;
}

export interface CustomCheckoutField {
  id: string;
  label: string;
  required: boolean;
}

export interface ScarcityConfig {
  enabled: boolean;
  stockText: string;
  viewersText: string;
  ordersTodayText: string;
  verifiedText: string;
  fastDeliveryText: string;
}

export interface CheckoutConfig {
  storeId: string;
  productCheckoutType?: 'redirect' | 'popup' | 'inline';
  addressAutocomplete: boolean;
  autocompleteApiKey?: string;
  showAddressFields?: boolean;
  fields: {
    showEmail: boolean;
    requireEmail: boolean;
    showLastName: boolean;
    showCity?: boolean;
    showPostalCode?: boolean;
    showProvince?: boolean;
    showCountry?: boolean;
    scarcityConfig?: ScarcityConfig;
  };
  customFields: CustomCheckoutField[];
  enableStep2Upsell: boolean;
  countdownMinutes?: number;
  enableTrustBanner?: boolean;
  enablePostPurchaseOTO: boolean;
  enableDigitalReceipt?: boolean;
  thankYouMessage?: string;
  layout?: '1-step' | '2-step';
}

interface AdminStore {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  activeStore: Store;
  availableStores: Store[];
  setActiveStore: (storeId: string) => void;
  addStore: (store: Store) => Promise<void>;
  updateStore: (storeId: string, data: Partial<Store>) => Promise<void>;
  removeStore: (storeId: string) => Promise<void>;

  categories: string[];
  setCategories: (updater: (prev: string[]) => string[]) => void;

  orderStatuses: string[];
  addOrderStatus: (status: string) => void;
  removeOrderStatus: (status: string) => void;

  products: Product[];
  setProducts: (updater: (prev: Product[]) => Product[]) => void;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (productId: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;

  landingPages: LandingPage[];
  setLandingPages: (updater: (prev: LandingPage[]) => LandingPage[]) => void;

  legalPages: LegalPage[];
  setLegalPages: (updater: (prev: LegalPage[]) => LegalPage[]) => void;

  orders: Order[];
  setOrders: (updater: (prev: Order[]) => Order[]) => void;

  abandonedCarts: AbandonedCart[];
  setAbandonedCarts: (updater: (prev: AbandonedCart[]) => AbandonedCart[]) => void;

  shippingZones: ShippingZone[];
  setShippingZones: (updater: (prev: ShippingZone[]) => ShippingZone[]) => void;

  fraudRules: FraudRules[];
  setFraudRules: (updater: (prev: FraudRules[]) => FraudRules[]) => void;

  homepages: HomepageConfig[];
  setHomepages: (updater: (prev: HomepageConfig[]) => HomepageConfig[]) => void;

  checkoutConfigs: CheckoutConfig[];
  setCheckoutConfigs: (updater: (prev: CheckoutConfig[]) => CheckoutConfig[]) => void;

  staffAccounts: StaffAccount[];
  setStaffAccounts: (updater: (prev: StaffAccount[]) => StaffAccount[]) => void;
  addStaffAccount: (account: Omit<StaffAccount, 'id'>) => Promise<void>;
  updateStaffAccount: (id: string, data: Partial<Omit<StaffAccount, 'id'>>) => Promise<void>;
  deleteStaffAccount: (id: string) => Promise<void>;

  // New: Call Logs
  callLogs: CallLog[];
  setCallLogs: (updater: (prev: CallLog[]) => CallLog[]) => void;

  // New: Activity Logs
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;

  // New: Coupons
  coupons: Coupon[];
  setCoupons: (updater: (prev: Coupon[]) => Coupon[]) => void;

  // Persistent Save Methods
  saveCheckoutConfig: (config: CheckoutConfig) => Promise<void>;
  saveShippingZones: (storeId: string, zones: ShippingZone[]) => Promise<void>;

  // AI Chat History
  agentChats: Record<string, any[]>;
  setAgentChat: (storeId: string, agentId: string, messages: any[]) => void;

  globalApiKey?: string; // This will act as Gemini Key for backward compatibility
  setGlobalApiKey: (key: string) => void;

  claudeApiKey?: string;
  setClaudeApiKey: (key: string) => void;

  openAiApiKey?: string;
  setOpenAiApiKey: (key: string) => void;

  openRouterApiKey?: string;
  setOpenRouterApiKey: (key: string) => void;
  openRouterModel: string;
  setOpenRouterModel: (model: string) => void;

  nvidiaApiKey?: string;
  setNvidiaApiKey: (key: string) => void;
  nvidiaModel: string;
  setNvidiaModel: (model: string) => void;

  geminiModel: string;
  setGeminiModel: (model: string) => void;

  claudeModel: string;
  setClaudeModel: (model: string) => void;

  openAiModel: string;
  setOpenAiModel: (model: string) => void;

  aiProvider: 'gemini' | 'claude' | 'openai' | 'openrouter' | 'nvidia';
  setAiProvider: (provider: 'gemini' | 'claude' | 'openai' | 'openrouter' | 'nvidia') => void;

  // Customer Intelligence
  customerBlacklist: BlacklistedCustomer[];
  setCustomerBlacklist: (updater: (prev: BlacklistedCustomer[]) => BlacklistedCustomer[]) => void;

  // Staff Goals & Commissions
  staffGoals: StaffGoal[];
  setStaffGoals: (updater: (prev: StaffGoal[]) => StaffGoal[]) => void;

  commissionEntries: CommissionEntry[];
  setCommissionEntries: (updater: (prev: CommissionEntry[]) => CommissionEntry[]) => void;

  fetchInitialData: (isAdmin?: boolean, currentStoreId?: string) => Promise<void>;

  // AI Agents - Dynamic Skills
  dynamicSkills: AgentSkill[];
  addDynamicSkill: (skill: AgentSkill) => void;
}

const MOCK_STORES: Store[] = [];
const MOCK_PRODUCTS: Product[] = [];
const MOCK_ORDERS: Order[] = [];

const DEFAULT_STATUSES = [
  'DRAFT', 'PENDING_AGENT_CONFIRMATION', 'HIGH_RISK_ADMIN_APPROVAL', 'ESCALATED_TO_ADMIN',
  'SELF_CONFIRMED', 'CONFIRMED', 'DELIVERED', 'CONTINUITY_SUBSCRIBED', 'CANCELED', 'RTO'
];


export const useAdminStore = create<AdminStore>()((set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      activeStore: {} as Store,
      availableStores: [],
      setActiveStore: (storeId) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('codadmin-active-store-id', storeId);
        }
        set((state) => ({
          activeStore: state.availableStores.find(s => s.id === storeId) || state.availableStores[0]
        }));
      },
      addStore: async (store) => {
        const proposedSlug = slugify(store.name);
        const exists = get().availableStores.some(s => slugify(s.name) === proposedSlug);
        if (exists) {
           useNotificationStore.getState().notify("A store with a similar name already exists.", "error");
           return;
        }
        const lang = store.language || 'en';
        const defaultTrans = DEFAULT_TRANSLATIONS[lang] || DEFAULT_TRANSLATIONS['en'];
        const storeWithTrans = {
          ...store,
          translations: store.translations || defaultTrans
        };
        // Log the exact payload for debugging
        const row = storeToRow(storeWithTrans);
        console.log("Inserting store row:", row);

        const { data, error } = await adminDbInsert('stores', row);
        
        if (error) {
          console.error("Supabase Add Store Error:", error);
          useNotificationStore.getState().notify(`Failed to add store: ${error || 'Check console'}`, 'error');
          return;
        }

        if (!data || data.length === 0) {
          console.error("Supabase returned no data after insert");
          useNotificationStore.getState().notify("Failed to add store: No data returned", 'error');
          return;
        }

        // Use the real UUID from Supabase as the store id
        const finalStore = { ...storeWithTrans, id: data[0].id };

        // --- NEW: Auto-populate Shipping Zones based on Region ---
        const regionCode = finalStore.region.toUpperCase();
        const countryInfo = COUNTRY_DATA[regionCode] || COUNTRY_DATA["DZ"];
        
        const defaultZones: ShippingZone[] = countryInfo.states.map(stateName => ({
          id: `zone_${Math.random().toString(36).substr(2, 9)}`,
          storeId: finalStore.id,
          wilaya: stateName,
          commune: '',
          deliveryRate: 0
        }));

        const { error: zonesError } = await adminDbInsert('shipping_zones', defaultZones.map(shippingZoneToRow));

        if (zonesError) {
          console.error("Failed to auto-populate shipping zones:", zonesError);
        }

        set((state) => ({
          availableStores: [...state.availableStores, finalStore],
          activeStore: finalStore,
          shippingZones: [...state.shippingZones, ...defaultZones]
        }));
      },
      updateStore: async (storeId, data) => {
        if (data.name) {
          const proposedSlug = slugify(data.name);
          const currentStore = get().availableStores.find(s => String(s.id) === String(storeId));
          
          if (!currentStore || slugify(currentStore.name) !== proposedSlug) {
            const exists = get().availableStores.some(s => String(s.id) !== String(storeId) && slugify(s.name) === proposedSlug);
            if (exists) {
               useNotificationStore.getState().notify("A store with a similar name already exists.", "error");
               return;
            }
          }
        }
        set((state) => {
          const oldStore = state.availableStores.find(s => s.id === storeId);
          const nextTranslations = data.translations && oldStore
            ? { ...oldStore.translations, ...data.translations }
            : data.translations;

          const updatedData = {
            ...data,
            ...(nextTranslations ? { translations: nextTranslations } : {})
          };

          const updatedStores = state.availableStores.map(s => s.id === storeId ? { ...s, ...updatedData } : s);
          return {
            availableStores: updatedStores,
            activeStore: state.activeStore.id === storeId ? { ...state.activeStore, ...updatedData } : state.activeStore
          };
        });

        // Get the latest merged state to send to Supabase
        const latestStore = get().availableStores.find(s => s.id === storeId);
        const row = storeToRow({
          ...data,
          ...(latestStore?.translations ? { translations: latestStore.translations } : {})
        } as Partial<Store>);
        const cleanRow = Object.fromEntries(Object.entries(row).filter(([_, v]) => v !== undefined));
        const { error } = await adminDbUpdate('stores', { id: storeId }, cleanRow);
        if (error) console.error("Failed to update store in Supabase", error);
      },
      removeStore: async (storeId) => {
        set((state) => {
          const updated = state.availableStores.filter(s => s.id !== storeId);
          return {
            availableStores: updated,
            activeStore: state.activeStore.id === storeId ? updated[0] : state.activeStore
          };
        });
        const { error } = await adminDbDelete('stores', { id: storeId });
        if (error) {
          console.error("Failed to delete store from Supabase:", error);
        }
      },
      
      categories: ['Health & Wellness', 'Smart Home', 'Fitness', 'Electronics'],
      setCategories: (updater) => set((state) => ({
        categories: updater(state.categories)
      })),

      orderStatuses: DEFAULT_STATUSES,
      addOrderStatus: (status) => set((state) => ({
        orderStatuses: [...state.orderStatuses, status.toUpperCase().replace(/\s+/g, '_')]
      })),
      removeOrderStatus: (status) => set((state) => ({
        orderStatuses: state.orderStatuses.filter(s => s !== status || DEFAULT_STATUSES.includes(status))
      })),

      products: MOCK_PRODUCTS,
      setProducts: (updater) => set((state) => ({
        products: updater(state.products)
      })),
      addProduct: async (product) => {
        // Insert to Supabase first (let DB generate UUID)
        const row = productToRow(product);
        const cleanRow = Object.fromEntries(Object.entries(row).filter(([_, v]) => v !== undefined && v !== null));
        const { data, error } = await adminDbInsert('products', cleanRow);
        if (error) {
          console.error("Failed to add product to Supabase", error);
          return;
        }
        // Add to local state with real UUID from DB
        const finalProduct = { ...product, id: data?.[0]?.id };
        set((state) => ({ products: [...state.products, finalProduct] }));
      },
      updateProduct: async (productId, data) => {
        // Optimistic local update
        set((state) => ({
          products: state.products.map(p => p.id === productId ? { ...p, ...data } : p)
        }));
        // Map to snake_case and strip undefined
        const row = productToRow(data as Partial<Product>);
        const cleanRow = Object.fromEntries(Object.entries(row).filter(([_, v]) => v !== undefined));
        const { error } = await adminDbUpdate('products', { id: productId }, cleanRow);
        if (error) console.error("Failed to update product in Supabase", error);
      },
      deleteProduct: async (productId) => {
        set((state) => ({
          products: state.products.filter(p => p.id !== productId)
        }));
        const { error } = await adminDbDelete('products', { id: productId });
        if (error) console.error("Failed to delete product from Supabase", error);
      },

      landingPages: [],
      setLandingPages: (updater) => set((state) => {
        const prev = state.landingPages;
        
        // Helper to generate RFC 4122 v4 UUID
        const generateUUID = () => {
          if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
          }
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        // Rewrite non-UUIDs to valid UUIDs in next array
        const next = updater(prev).map(p => {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
          if (!isUuid) {
            return { ...p, id: generateUUID() };
          }
          return p;
        });
        
        // Determine deleted pages
        const deleted = prev.filter(p => !next.some(n => n.id === p.id));
        // Determine added or updated pages
        const addedOrUpdated = next.filter(n => {
          const old = prev.find(p => p.id === n.id);
          return !old || JSON.stringify(old) !== JSON.stringify(n);
        });

        // Run background DB operations
        deleted.forEach(async (p) => {
          const { error } = await adminDbDelete('landing_pages', { id: p.id });
          if (error) console.error("Failed to delete landing page from Supabase:", error);
        });

        addedOrUpdated.forEach(async (p) => {
          const row = {
            id: p.id,
            store_id: p.storeId,
            title: p.title,
            slug: p.slug,
            html_content: p.htmlContent,
            published: p.published
          };
          const { error } = await adminDbUpsert('landing_pages', row);
          if (error) console.error("Failed to save landing page to Supabase:", error);
        });

        return { landingPages: next };
      }),

      legalPages: [],
      setLegalPages: (updater) => set((state) => {
        const next = updater(state.legalPages);
        const storePages = next.filter(p => p.storeId === state.activeStore.id);
        const nextTranslations = {
          ...state.activeStore.translations,
          legalPages: storePages
        };
        // Update database with the new legalPages stored inside the store's translations jsonb field
        state.updateStore(state.activeStore.id, { translations: nextTranslations });
        return { legalPages: next };
      }),

      orders: MOCK_ORDERS,
      setOrders: (updater) => set((state) => ({
        orders: updater(state.orders)
      })),

      abandonedCarts: [],
      setAbandonedCarts: (updater) => set((state) => ({
        abandonedCarts: updater(state.abandonedCarts)
      })),

      shippingZones: [],
      setShippingZones: (updater) => set((state) => ({
        shippingZones: updater(state.shippingZones)
      })),

      fraudRules: [],
      setFraudRules: (updater) => set((state) => ({
        fraudRules: updater(state.fraudRules)
      })),

      homepages: [],
      setHomepages: (updater) => set((state) => {
        const next = updater(state.homepages);
        const activeConfig = next.find(h => h.storeId === state.activeStore.id);
        if (activeConfig) {
          const nextTranslations = {
            ...state.activeStore.translations,
            homepageConfig: activeConfig
          };
          // Update database with the new homepageConfig stored inside the store's translations jsonb field
          state.updateStore(state.activeStore.id, { translations: nextTranslations });
        }
        return { homepages: next };
      }),

      checkoutConfigs: [],
      setCheckoutConfigs: (updater) => set((state) => ({
        checkoutConfigs: updater(state.checkoutConfigs)
      })),

      staffAccounts: [],
      setStaffAccounts: (updater) => set((state) => ({
        staffAccounts: updater(state.staffAccounts)
      })),
      addStaffAccount: async (account) => {
        let finalPin = account.pin;
        if (finalPin && !finalPin.startsWith('$2a$') && !finalPin.startsWith('$2b$')) {
          try {
            const res = await fetch('/api/admin/staff/hash', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: finalPin })
            });
            if (res.ok) {
              const data = await res.json();
              finalPin = data.hash;
            }
          } catch (e) {
            console.error("Failed to hash pin", e);
          }
        }

        const row = staffToRow({ ...account, pin: finalPin });
        console.log("Inserting staff row:", row);

        const { data, error } = await adminDbInsert('staff_accounts', row);

        if (error) {
          console.error("Supabase Add Staff Error:", error);
          useNotificationStore.getState().notify(`Failed to add staff: ${error || 'Check console'}`, 'error');
          return;
        }

        if (!data || data.length === 0) {
          console.error("Supabase returned no data after staff insert");
          return;
        }

        const newId = data[0].id;
        const finalAccount = { ...account, id: newId, storeIds: account.storeIds || (account.storeId ? [account.storeId] : []) };
        set((state) => ({ staffAccounts: [...state.staffAccounts, finalAccount] }));

        // Persist multi-store assignments, permissions, and email to activeStore.translations
        const state = get();
        if (finalAccount.storeIds && finalAccount.storeIds.length > 0 || finalAccount.permissions || finalAccount.email) {
          const activeStore = state.activeStore || state.availableStores[0];
          if (activeStore) {
            const currentAssignments = (activeStore.translations as any)?.staffAssignments || {};
            const currentPermissions = (activeStore.translations as any)?.staffPermissions || {};
            const currentEmails = (activeStore.translations as any)?.staffEmails || {};
            const updatedTranslations = {
              ...(activeStore.translations as any || {}),
              staffAssignments: { ...currentAssignments, [newId]: finalAccount.storeIds || [] },
              staffPermissions: { ...currentPermissions, [newId]: finalAccount.permissions || { canExport: true, canEditTotals: true, canDeleteNotes: true, canAssignOrders: true } },
              staffEmails: { ...currentEmails, [newId]: finalAccount.email || '' }
            };
            adminDbUpdate('stores', { id: activeStore.id }, { translations: updatedTranslations }).then();
            set(st => ({
              availableStores: st.availableStores.map(s => s.id === activeStore.id ? { ...s, translations: updatedTranslations } : s),
              activeStore: st.activeStore?.id === activeStore.id ? { ...st.activeStore, translations: updatedTranslations } : st.activeStore
            }));
          }
        }
      },
      updateStaffAccount: async (id, data) => {
        set((state) => ({
          staffAccounts: state.staffAccounts.map(a => a.id === id ? { ...a, ...data } : a)
        }));
        
        let finalPin = data.pin;
        if (finalPin && !finalPin.startsWith('$2a$') && !finalPin.startsWith('$2b$')) {
          try {
            const res = await fetch('/api/admin/staff/hash', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: finalPin })
            });
            if (res.ok) {
              const hashData = await res.json();
              finalPin = hashData.hash;
            }
          } catch (e) {
            console.error("Failed to hash pin during update", e);
          }
        }

        const row = staffToRow({ ...data, pin: finalPin } as Partial<StaffAccount>);
        const cleanRow = Object.fromEntries(Object.entries(row).filter(([_, v]) => v !== undefined));
        if (Object.keys(cleanRow).length > 0) {
          const { error } = await adminDbUpdate('staff_accounts', { id }, cleanRow);
          if (error) {
            console.error("Failed to update staff account", error);
            useNotificationStore.getState().notify(`Failed to update staff: ${error || 'Check console'}`, 'error');
          }
        }

        if (data.storeIds !== undefined || data.permissions !== undefined || data.isOnline !== undefined || data.email !== undefined) {
          const state = get();
          const activeStore = state.activeStore || state.availableStores[0];
          if (activeStore) {
            const currentAssignments = (activeStore.translations as any)?.staffAssignments || {};
            const currentPermissions = (activeStore.translations as any)?.staffPermissions || {};
            const currentStatuses = (activeStore.translations as any)?.staffStatus || {};
            const currentEmails = (activeStore.translations as any)?.staffEmails || {};
            
            const updatedTranslations: any = { ...(activeStore.translations as any || {}) };
            
            if (data.storeIds !== undefined) {
              updatedTranslations.staffAssignments = { ...currentAssignments, [id]: data.storeIds };
            }
            if (data.permissions !== undefined) {
              updatedTranslations.staffPermissions = { ...currentPermissions, [id]: data.permissions };
            }
            if (data.email !== undefined) {
              updatedTranslations.staffEmails = { ...currentEmails, [id]: data.email };
            }
            if (data.isOnline !== undefined || data.lastActive !== undefined) {
              updatedTranslations.staffStatus = { 
                ...currentStatuses, 
                [id]: { 
                  isOnline: data.isOnline !== undefined ? data.isOnline : currentStatuses[id]?.isOnline,
                  lastActive: data.lastActive !== undefined ? data.lastActive : currentStatuses[id]?.lastActive
                }
              };
            }

            adminDbUpdate('stores', { id: activeStore.id }, { translations: updatedTranslations }).then();
            set(st => ({
              availableStores: st.availableStores.map(s => s.id === activeStore.id ? { ...s, translations: updatedTranslations } : s),
              activeStore: st.activeStore?.id === activeStore.id ? { ...st.activeStore, translations: updatedTranslations } : st.activeStore
            }));
          }
        }
      },
      deleteStaffAccount: async (id) => {
        set((state) => ({
          staffAccounts: state.staffAccounts.filter(a => a.id !== id)
        }));
        const { error } = await adminDbDelete('staff_accounts', { id });
        if (error) console.error("Failed to delete staff account", error);
      },

      callLogs: typeof window !== 'undefined'
        ? (() => {
            try {
              return JSON.parse(localStorage.getItem('codadmin-call-logs') || '[]');
            } catch {
              return [];
            }
          })()
        : [],
      setCallLogs: (updater) => set((state) => {
        const next = updater(state.callLogs);
        if (typeof window !== 'undefined') {
          localStorage.setItem('codadmin-call-logs', JSON.stringify(next));
        }
        return { callLogs: next };
      }),

      activityLogs: typeof window !== 'undefined'
        ? (() => {
            try {
              return JSON.parse(localStorage.getItem('codadmin-activity-logs') || '[]');
            } catch {
              return [];
            }
          })()
        : [],
      addActivityLog: (log) => {
        const newLog = {
          ...log,
          id: `act_${Date.now()}`,
          timestamp: new Date().toISOString()
        };
        set((state) => {
          const next = [newLog, ...state.activityLogs].slice(0, 500);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('codadmin-activity-logs', JSON.stringify(next));
            } catch (e) {
              console.error("Failed to save activity logs to localStorage", e);
            }
          }
          return { activityLogs: next };
        });

        // Try persisting to Supabase activity_logs table (handles errors gracefully if table does not exist yet)
        (async () => {
          try {
            const { error } = await adminDbInsert('activity_logs', {
                store_id: log.storeId,
                user: log.user,
                action: log.action,
                detail: log.detail,
                timestamp: newLog.timestamp
              });
            if (error) {
              console.warn("Failed to save activity log to Supabase:", error);
            }
          } catch (err) {
            console.warn("Error inserting activity log:", err);
          }
        })();
      },
      
      dynamicSkills: [],
      addDynamicSkill: (skill) => set((state) => {
        const updated = [...state.dynamicSkills, skill];
        if (typeof window !== 'undefined') {
          localStorage.setItem('codadmin-dynamic-skills', JSON.stringify(updated.map(s => ({...s, execute: undefined, preProcess: undefined})))); // execute cannot be serialized
        }
        return { dynamicSkills: updated };
      }),

      saveCheckoutConfig: async (config) => {
        const row = checkoutConfigToRow(config);
        const { error } = await adminDbUpsert('checkout_configs', row, { onConflict: 'store_id' });
        
        if (error) {
          console.error("Error saving checkout config:", error);
          useNotificationStore.getState().notify("Failed to save checkout settings", "error");
          throw error;
        }

        set(state => ({
          checkoutConfigs: state.checkoutConfigs.map(c => c.storeId === config.storeId ? config : c).concat(
            state.checkoutConfigs.find(c => c.storeId === config.storeId) ? [] : [config]
          )
        }));
      },

      saveShippingZones: async (storeId, zones) => {
        // 1. Delete existing zones for this store
        const { error: deleteError } = await adminDbDelete('shipping_zones', { store_id: storeId });
        
        if (deleteError) {
          console.error("Error clearing shipping zones:", deleteError);
          throw deleteError;
        }

        // 2. Insert new zones (if any)
        if (zones.length > 0) {
          const { error: insertError } = await adminDbInsert('shipping_zones', zones.map(shippingZoneToRow));

          if (insertError) {
            console.error("Error inserting shipping zones:", insertError);
            useNotificationStore.getState().notify(`Failed to save shipping zones: ${insertError}`, "error");
            throw insertError;
          }
        }

        // 3. Update local state
        set(state => ({
          shippingZones: [
            ...state.shippingZones.filter(z => z.storeId !== storeId),
            ...zones
          ]
        }));
      },

      coupons: [],
      setCoupons: (updater) => set((state) => {
        const nextCoupons = updater(state.coupons);
        const byStore: Record<string, Coupon[]> = {};
        nextCoupons.forEach(c => {
          if (!byStore[c.storeId]) byStore[c.storeId] = [];
          byStore[c.storeId].push(c);
        });

        state.availableStores.forEach(store => {
          const storeCoupons = byStore[store.id] || [];
          const updatedTranslations = {
            ...(store.translations as any || {}),
            coupons: storeCoupons
          };
          adminDbUpdate('stores', { id: store.id }, { translations: updatedTranslations }).then();
        });

        const nextStores = state.availableStores.map(store => ({
          ...store,
          translations: {
            ...(store.translations as any || {}),
            coupons: byStore[store.id] || []
          }
        }));

        return { coupons: nextCoupons, availableStores: nextStores, activeStore: state.activeStore ? nextStores.find(s => s.id === state.activeStore?.id) || state.activeStore : state.activeStore };
      }),

      agentChats: {},
      setAgentChat: (storeId, agentId, messages) => set((state) => ({
        agentChats: {
          ...state.agentChats,
          [`${storeId}_${agentId}`]: messages
        }
      })),

      globalApiKey: typeof window !== 'undefined' ? localStorage.getItem('codadmin-global-api-key') || '' : '',
      setGlobalApiKey: (key) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-global-api-key', key);
        set({ globalApiKey: key });
      },

      claudeApiKey: typeof window !== 'undefined' ? localStorage.getItem('codadmin-claude-api-key') || '' : '',
      setClaudeApiKey: (key) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-claude-api-key', key);
        set({ claudeApiKey: key });
      },

      openAiApiKey: typeof window !== 'undefined' ? localStorage.getItem('codadmin-openai-api-key') || '' : '',
      setOpenAiApiKey: (key) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-openai-api-key', key);
        set({ openAiApiKey: key });
      },

      openRouterApiKey: typeof window !== 'undefined' ? localStorage.getItem('codadmin-openrouter-api-key') || '' : '',
      setOpenRouterApiKey: (key) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-openrouter-api-key', key);
        set({ openRouterApiKey: key });
      },

      openRouterModel: typeof window !== 'undefined' ? localStorage.getItem('codadmin-openrouter-model') || 'anthropic/claude-3-haiku' : 'anthropic/claude-3-haiku',
      setOpenRouterModel: (model) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-openrouter-model', model);
        set({ openRouterModel: model });
      },

      nvidiaApiKey: typeof window !== 'undefined' ? localStorage.getItem('codadmin-nvidia-api-key') || '' : '',
      setNvidiaApiKey: (key) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-nvidia-api-key', key);
        set({ nvidiaApiKey: key });
      },
      nvidiaModel: typeof window !== 'undefined' ? localStorage.getItem('codadmin-nvidia-model') || 'meta/llama-3.1-405b-instruct' : 'meta/llama-3.1-405b-instruct',
      setNvidiaModel: (model) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-nvidia-model', model);
        set({ nvidiaModel: model });
      },

      geminiModel: typeof window !== 'undefined' ? localStorage.getItem('codadmin-gemini-model') || 'gemini-2.0-flash' : 'gemini-2.0-flash',
      setGeminiModel: (model) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-gemini-model', model);
        set({ geminiModel: model });
      },

      claudeModel: typeof window !== 'undefined' ? localStorage.getItem('codadmin-claude-model') || 'claude-3-5-sonnet-20241022' : 'claude-3-5-sonnet-20241022',
      setClaudeModel: (model) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-claude-model', model);
        set({ claudeModel: model });
      },

      openAiModel: typeof window !== 'undefined' ? localStorage.getItem('codadmin-openai-model') || 'gpt-4o-mini' : 'gpt-4o-mini',
      setOpenAiModel: (model) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-openai-model', model);
        set({ openAiModel: model });
      },

      aiProvider: typeof window !== 'undefined' ? (localStorage.getItem('codadmin-ai-provider') as any) || 'gemini' : 'gemini',
      setAiProvider: (provider) => {
        if (typeof window !== 'undefined') localStorage.setItem('codadmin-ai-provider', provider);
        set({ aiProvider: provider });
      },

      customerBlacklist: [],
      setCustomerBlacklist: (updater) => set((state) => ({
        customerBlacklist: updater(state.customerBlacklist)
      })),

      staffGoals: [],
      setStaffGoals: (updater) => set((state) => ({
        staffGoals: updater(state.staffGoals)
      })),

      commissionEntries: [],
      setCommissionEntries: (updater) => set((state) => ({
        commissionEntries: updater(state.commissionEntries)
      })),

      fetchInitialData: async (isAdmin = false, currentStoreId?: string) => {
        console.log(`Fetching initial data from Supabase... (isAdmin: ${isAdmin}, currentStoreId: ${currentStoreId})`);
        try {
          let resolvedStoreId = currentStoreId;
          
          if (!isAdmin && !resolvedStoreId && typeof window !== 'undefined') {
            const { data: stores } = await adminDbSelect('stores');
            if (stores) {
              const host = window.location.hostname.replace('www.', '').split(':')[0].toLowerCase();
              let foundStore = stores.find(s => s.custom_domain && s.custom_domain.replace('www.', '').toLowerCase() === host);
              
              if (!foundStore) {
                  const pathParts = window.location.pathname.split('/').filter(Boolean);
                  if (pathParts.length > 0) {
                     const slugOrRegion = pathParts[0].toLowerCase();
                     foundStore = stores.find(s => slugify(s.name) === slugOrRegion || s.region.toLowerCase() === slugOrRegion);
                  }
              }
              if (foundStore) {
                 resolvedStoreId = foundStore.id;
              }
            }
          }

          const basePromises = [
            adminDbSelect('stores'),
            adminDbSelect('products', resolvedStoreId ? { store_id: resolvedStoreId } : undefined),
            adminDbSelect('shipping_zones', resolvedStoreId ? { store_id: resolvedStoreId } : undefined),
            adminDbSelect('checkout_configs', resolvedStoreId ? { store_id: resolvedStoreId } : undefined),
            adminDbSelect('landing_pages', resolvedStoreId ? { store_id: resolvedStoreId } : undefined)
          ];

          // Heavy data only needed for admin
          const adminPromises = isAdmin ? [
            adminDbSelect('orders', undefined, { orderColumn: 'date', ascending: false }),
            adminDbSelect('staff_accounts'),
            adminDbSelect('call_logs', undefined, { orderColumn: 'called_at', ascending: false })
          ] : [
            Promise.resolve({ data: [] }), // dummy orders
            Promise.resolve({ data: [] }), // dummy staff
            Promise.resolve({ data: [] })  // dummy logs
          ];

          const [
            { data: stores },
            { data: products },
            { data: zones },
            { data: configs },
            { data: landingPages },
            { data: orders },
            { data: staff },
            { data: callLogs }
          ] = await Promise.all([...basePromises, ...adminPromises]);
          
          if (stores && stores.length > 0) {
            const mapped = stores.map(rowToStore);
            const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem('codadmin-active-store-id') : null;
            const savedStore = savedStoreId ? mapped.find(s => s.id === savedStoreId) : null;
            set({ availableStores: mapped, activeStore: savedStore || mapped[0] });

            // Extract homepages, legalPages, coupons, and staffAssignments from store translations!
            const extractedHomepages: HomepageConfig[] = [];
            const extractedLegalPages: LegalPage[] = [];
            const extractedCoupons: Coupon[] = [];
            const staffAssignments: Record<string, string[]> = {};

            mapped.forEach(s => {
              if (s.translations && (s.translations as any).homepageConfig) {
                extractedHomepages.push((s.translations as any).homepageConfig as HomepageConfig);
              }
              if (s.translations && (s.translations as any).legalPages) {
                extractedLegalPages.push(...((s.translations as any).legalPages as LegalPage[]));
              }
              if (s.translations && (s.translations as any).coupons) {
                extractedCoupons.push(...((s.translations as any).coupons as Coupon[]));
              }
              if (s.translations && (s.translations as any).staffAssignments) {
                const sAssign = (s.translations as any).staffAssignments;
                Object.keys(sAssign).forEach(staffId => {
                  const existing = staffAssignments[staffId] || [];
                  const incoming = sAssign[staffId] || [];
                  staffAssignments[staffId] = Array.from(new Set([...existing, ...incoming]));
                });
              }
            });
            set({ homepages: extractedHomepages, legalPages: extractedLegalPages, coupons: extractedCoupons });

            if (staff) {
              const mappedStaff = staff.map(row => {
                const baseStaff = rowToStaff(row);
                const assigned = staffAssignments[baseStaff.id] || (baseStaff.storeId ? [baseStaff.storeId] : []);
                
                let perms = { canExport: true, canEditTotals: true, canDeleteNotes: true, canAssignOrders: true };
                let isOnline = false;
                let lastActive;
                let email = undefined;
                
                if (stores) {
                  for (const store of stores) {
                    const storePerms = (store.translations as any)?.staffPermissions || {};
                    if (storePerms[baseStaff.id]) perms = storePerms[baseStaff.id];
                    
                    const storeStatus = (store.translations as any)?.staffStatus || {};
                    if (storeStatus[baseStaff.id]) {
                      isOnline = storeStatus[baseStaff.id].isOnline;
                      lastActive = storeStatus[baseStaff.id].lastActive;
                    }

                    const storeEmails = (store.translations as any)?.staffEmails || {};
                    if (storeEmails[baseStaff.id]) {
                      email = storeEmails[baseStaff.id];
                    }
                  }
                }

                return {
                  ...baseStaff,
                  email,
                  storeIds: assigned,
                  permissions: perms,
                  isOnline,
                  lastActive
                };
              });
              set({ staffAccounts: mappedStaff });
            }
          }
          if (products) set({ products: products.map(rowToProduct) });
          if (orders) {
            const allOrders = orders.map(rowToOrder);
            const mainOrders = allOrders.filter(o => o.status !== 'DRAFT');
            const drafts = orders.filter(o => o.status === 'DRAFT').map(rowToAbandonedCart);
            set({ orders: mainOrders, abandonedCarts: drafts });
          }
          if (zones) set({ shippingZones: zones.map(rowToShippingZone) });
          if (configs) set({ checkoutConfigs: configs.map(rowToCheckoutConfig) });
          if (landingPages) set({
            landingPages: landingPages.map((row: any) => ({
              id: row.id,
              storeId: row.store_id,
              title: row.title,
              slug: row.slug,
              htmlContent: row.html_content,
              published: row.published
            } as LandingPage))
          });

          // Async load activity logs from Supabase if available (last 90 days)
          try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            const { data: logsData, error: logsError } = await adminDbSelect('activity_logs', 
              { store_id: resolvedStoreId }, 
              { orderColumn: 'timestamp', ascending: false, limit: 50 }
            );
            if (!logsError && logsData) {
              const fetchedLogs = logsData.map(row => ({
                id: row.id,
                storeId: row.store_id,
                user: row.user,
                action: row.action,
                detail: row.detail,
                timestamp: row.timestamp
              }));
              set({ activityLogs: fetchedLogs });
              if (typeof window !== 'undefined') {
                localStorage.setItem('codadmin-activity-logs', JSON.stringify(fetchedLogs));
              }
            }
          } catch (e) {
            console.warn("Failed to fetch initial activity logs:", e);
          }
          
          // Hydrate dynamic skills from local storage
          if (typeof window !== 'undefined') {
            try {
              const savedSkills = localStorage.getItem('codadmin-dynamic-skills');
              if (savedSkills) {
                const parsedSkills = JSON.parse(savedSkills);
                set({ dynamicSkills: parsedSkills });
              }
            } catch (e) {
              console.warn("Failed to hydrate dynamic skills", e);
            }
          }

          // Force merge new default statuses into existing persisted store statuses
          set((state) => {
            const missingStatuses = DEFAULT_STATUSES.filter(s => !state.orderStatuses.includes(s));
            if (missingStatuses.length > 0) {
              return { orderStatuses: [...state.orderStatuses, ...missingStatuses] };
            }
            return {};
          });

          if (callLogs) {
            const mappedLogs = callLogs.map(row => ({
              id: row.id,
              orderId: row.order_id,
              storeId: row.store_id,
              agentName: row.agent_name,
              result: row.result as any,
              note: row.note,
              calledAt: row.called_at
            }));
            set({ callLogs: mappedLogs });
          }
          
          set({ _hasHydrated: true });
        } catch (error) {
          console.error("Failed to fetch initial data from Supabase:", error);
          set({ _hasHydrated: true });
        }
      }
}));
