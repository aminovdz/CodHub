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
  
  const { data: stores } = await supabase.from('stores').select('name, region, translations');
  const store = stores?.find(s => slugify(s.name) === storeSlug.toLowerCase() || s.region.toLowerCase() === storeSlug.toLowerCase());
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

  const { data: stores } = await supabase.from('stores').select('id, region, whatsapp_config, name, translations, primary_color');
  const store = stores?.find(s => slugify(s.name) === storeSlug.toLowerCase() || s.region.toLowerCase() === storeSlug.toLowerCase());
  const region = store?.region || storeSlug;

  const isChatbotEnabled = store?.whatsapp_config?.chatbotEnabled;
  const chatbotName = store?.whatsapp_config?.chatbotName;
  const theme = store?.translations?.theme;

  return (
    <>
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
              
              --color-primary: ${theme.colors?.primary || store.primary_color || '#4F46E5'};
              --color-secondary: ${theme.colors?.secondary || '#F59E0B'};
              --color-background: ${theme.colors?.background || '#F8FAFC'};
              --color-text: ${theme.colors?.text || '#0F172A'};
            }
            
            body {
              background-color: var(--color-background);
              color: var(--color-text);
              font-family: var(--font-body);
            }
            
            h1, h2, h3, h4, h5, h6 {
              font-family: var(--font-heading);
            }

            ${theme.advanced?.customCss || ''}
          `}} />
        </>
      )}

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

