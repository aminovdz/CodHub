import { ReactNode } from 'react';
import TrackingPixels from '@/components/TrackingPixels';
import RegionCookieSetter from '@/components/RegionCookieSetter';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import ChatbotWidget from '@/components/ChatbotWidget';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const region = resolvedParams.region;
  
  const storeNames: Record<string, string> = {
    dz: 'COD Hub Algeria',
    ro: 'COD Hub Romania',
    co: 'COD Hub Colombia'
  };

  return {
    title: {
      template: `%s | ${storeNames[region] || 'COD Hub'}`,
      default: `${storeNames[region] || 'COD Hub'} - Premium Products, Pay on Delivery`
    },
    description: 'Shop premium products with zero risk. Pay only when you receive your order.',
    openGraph: {
      title: `${storeNames[region] || 'COD Hub'} - Premium Products`,
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
  params: Promise<{ region: string }>
}) {
  const resolvedParams = await params;
  const region = resolvedParams.region;

  // Query store configurations from Supabase to check chatbot toggle
  const { data: store } = await supabase
    .from('stores')
    .select('id, region, whatsapp_config')
    .ilike('region', region)
    .maybeSingle();

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

