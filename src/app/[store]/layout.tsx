import { ReactNode } from 'react';
import TrackingPixels from '@/components/TrackingPixels';
import RegionCookieSetter from '@/components/RegionCookieSetter';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/utils';
import ChatbotWidget from '@/components/ChatbotWidget';
import StoreHydrator from '@/components/StoreHydrator';
import { rowToProduct, rowToShippingZone, rowToCheckoutConfig, Store, HomepageConfig, Product, ShippingZone, CheckoutConfig } from '@/lib/store/useAdminStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.store;
  
  const { data: stores } = await supabase.from('stores').select('name, region, translations, custom_domain');
  const store = stores?.find(s => 
    slugify(s.name) === storeSlug.toLowerCase() || 
    s.region.toLowerCase() === storeSlug.toLowerCase() ||
    s.custom_domain?.toLowerCase() === storeSlug.toLowerCase()
  );
  const storeName = store?.name || 'COD Hub';
  const faviconUrl = store?.translations?.brand?.faviconUrl || '/icon.svg';

  return {
    title: {
      template: `%s | ${storeName}`,
      default: `${storeName} - Premium Products, Pay on Delivery`
    },
    description: 'Shop premium products with zero risk. Pay only when you receive your order.',
    icons: {
      icon: faviconUrl
    },
    openGraph: {
      title: `${storeName} - Premium Products`,
      description: 'Shop premium products with zero risk. Pay only when you receive your order.',
      type: 'website',
    }
  };
}

export default async function RegionLayout({ 
  children,
  params
}: { 
  children: ReactNode,
  params: Promise<{ store: string }>
}) {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.store;

  const { data: storesData } = await supabase.from('stores').select('*');
  const storeData = storesData?.find(s => 
    slugify(s.name) === storeSlug.toLowerCase() || 
    s.region.toLowerCase() === storeSlug.toLowerCase() ||
    s.custom_domain?.toLowerCase() === storeSlug.toLowerCase()
  );
  const region = storeData?.region || storeSlug;

  const isChatbotEnabled = storeData?.whatsapp_config?.chatbotEnabled;
  const chatbotName = storeData?.whatsapp_config?.chatbotName;
  const theme = storeData?.translations?.theme;

  let store: Store | null = null;
  let products: Product[] = [];
  let zones: ShippingZone[] = [];
  let configs: CheckoutConfig[] = [];
  let homepages: HomepageConfig[] = [];
  let landingPages: any[] = [];

  if (storeData) {
    store = {
      id: storeData.id,
      region: storeData.region,
      name: storeData.name,
      currency: storeData.currency,
      language: storeData.language,
      customDomain: storeData.custom_domain,
      translations: storeData.translations,
      whatsappConfig: storeData.whatsapp_config,
      theme: storeData.translations?.theme,
      primaryColor: storeData.primary_color,
      logoUrl: storeData.translations?.brand?.logoUrl,
      faviconUrl: storeData.translations?.brand?.faviconUrl,
      navigation: storeData.translations?.navigation || []
    } as Store;

    if (storeData.translations && (storeData.translations as any).homepageConfig) {
      homepages.push((storeData.translations as any).homepageConfig as HomepageConfig);
    }

    const [
      { data: productsData },
      { data: zonesData },
      { data: configsData },
      { data: landingPagesData }
    ] = await Promise.all([
      supabase.from('products').select('*').eq('active', true).eq('store_id', storeData.id),
      supabase.from('shipping_zones').select('*').eq('store_id', storeData.id),
      supabase.from('checkout_configs').select('*').eq('store_id', storeData.id),
      supabase.from('landing_pages').select('*').eq('store_id', storeData.id).eq('published', true)
    ]);

    products = productsData ? productsData.map(rowToProduct) : [];
    zones = zonesData ? zonesData.map(rowToShippingZone) : [];
    configs = configsData ? configsData.map(rowToCheckoutConfig) : [];
    landingPages = landingPagesData ? landingPagesData.map(row => ({
      id: row.id,
      storeId: row.store_id,
      title: row.title,
      slug: row.slug,
      htmlContent: row.html_content,
      published: row.published
    })) : [];
  }

  return (
    <>
      {store && <StoreHydrator store={store} products={products} zones={zones} configs={configs} homepages={homepages} landingPages={landingPages} />}
      <RegionCookieSetter region={region} />
      <TrackingPixels region={region} />
      
      {theme && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href={`https://fonts.googleapis.com/css2?family=${(theme.typography?.headingFont || 'Inter').replace(/ /g, '+')}:wght@400;700;900&family=${(theme.typography?.bodyFont || 'Inter').replace(/ /g, '+')}:wght@400;500;700&display=swap`} rel="stylesheet" />
          
          <style dangerouslySetInnerHTML={{__html: `
            :root {
              --font-heading: '${theme.typography?.headingFont || 'Inter'}', sans-serif;
              --font-body: '${theme.typography?.bodyFont || 'Inter'}', sans-serif;
              
              --color-primary: ${theme.colors?.primary || store?.primaryColor || storeData?.primary_color || '#4F46E5'};
              --color-secondary: ${theme.colors?.secondary || '#F59E0B'};
              --color-background: ${theme.colors?.background || '#F8FAFC'};
              --color-text: ${theme.colors?.text || '#0F172A'};
              --section-opacity: ${theme.layout?.sectionOpacity !== undefined ? theme.layout.sectionOpacity / 100 : 1};
            }
            
            body {
              background-color: var(--color-background);
              color: var(--color-text);
              font-family: var(--font-body);
            }
            
            h1, h2, h3, h4, h5, h6 {
              font-family: var(--font-heading);
            }

            .store-card {
              background-color: rgba(255, 255, 255, var(--section-opacity));
            }
            .store-subcard {
              background-color: rgba(248, 250, 252, var(--section-opacity));
            }
            .store-header {
              background-color: rgba(255, 255, 255, calc(var(--section-opacity) * 0.95));
            }

            ${theme.advanced?.customCss || ''}
          `}} />
        </>
      )}

      {children}
      {isChatbotEnabled && store && (
        <ChatbotWidget 
          storeId={store.id} 
          region={region} 
          botName={chatbotName} 
        />
      )}
    </>
  );
}

