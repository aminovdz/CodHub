import { ReactNode } from 'react';
import TrackingPixels from '@/components/TrackingPixels';
import RegionCookieSetter from '@/components/RegionCookieSetter';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/utils';
import ChatbotWidget from '@/components/ChatbotWidget';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.store;
  
  const { data: stores } = await supabase.from('stores').select('name, region');
  const store = stores?.find(s => slugify(s.name) === storeSlug.toLowerCase() || s.region.toLowerCase() === storeSlug.toLowerCase());
  const storeName = store?.name || 'COD Hub';

  return {
    title: {
      template: `%s | ${storeName}`,
      default: `${storeName} - Premium Products, Pay on Delivery`
    },
    description: 'Shop premium products with zero risk. Pay only when you receive your order.',
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

  const { data: stores } = await supabase.from('stores').select('id, region, whatsapp_config, name');
  const store = stores?.find(s => slugify(s.name) === storeSlug.toLowerCase() || s.region.toLowerCase() === storeSlug.toLowerCase());
  const region = store?.region || storeSlug;

  const isChatbotEnabled = store?.whatsapp_config?.chatbotEnabled;
  const chatbotName = store?.whatsapp_config?.chatbotName;

  return (
    <>
      <RegionCookieSetter region={region} />
      <TrackingPixels region={region} />
      {children}
      {isChatbotEnabled && (
        <ChatbotWidget 
          storeId={store.id} 
          region={region} 
          botName={chatbotName} 
        />
      )}
    </>
  );
}

