import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { ReactNode } from 'react';

export default async function StorefrontLayout({ 
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
      <GlobalHeader region={region} />
      {children}
      <GlobalFooter region={region} />
    </>
  );
}
