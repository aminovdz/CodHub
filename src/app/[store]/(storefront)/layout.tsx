import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { ReactNode } from 'react';

export default async function StorefrontLayout({ 
  children,
  params
}: { 
  children: ReactNode,
  params: Promise<{ store: string }>
}) {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.store;

  return (
    <>
      <GlobalHeader region={storeSlug} />
      {children}
      <GlobalFooter region={storeSlug} />
    </>
  );
}
