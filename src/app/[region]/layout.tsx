import { ReactNode } from 'react';
import TrackingPixels from '@/components/TrackingPixels';
import RegionCookieSetter from '@/components/RegionCookieSetter';
import { Metadata } from 'next';

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

  return (
    <>
      <RegionCookieSetter region={region} />
      <TrackingPixels region={region} />
      {children}
    </>
  );
}
