'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const fetchAdminData = useAdminStore((state) => state.fetchInitialData);
  const fetchPublicData = useStorefrontStore((state) => state.fetchInitialData);
  const fetchedAdmin = useRef(false);
  const fetchedPublic = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = !!(pathname?.startsWith('/admin') || pathname?.startsWith('/superadmin'));
    
    if (isAdmin && !fetchedAdmin.current) {
      fetchedAdmin.current = true;
      fetchAdminData(true);
    } else if (!isAdmin && !fetchedPublic.current) {
      fetchedPublic.current = true;
      fetchPublicData();
    }
  }, [fetchAdminData, fetchPublicData, pathname]);

  return <>{children}</>;
}
