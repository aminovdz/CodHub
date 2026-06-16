'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminStore } from '@/lib/store/useAdminStore';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const fetchInitialData = useAdminStore((state) => state.fetchInitialData);
  const fetchedAdmin = useRef(false);
  const fetchedPublic = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = !!(pathname?.startsWith('/admin') || pathname?.startsWith('/superadmin'));
    
    if (isAdmin && !fetchedAdmin.current) {
      fetchedAdmin.current = true;
      fetchedPublic.current = true;
      fetchInitialData(true);
    } else if (!isAdmin && !fetchedPublic.current) {
      fetchedPublic.current = true;
      fetchInitialData(false);
    }
  }, [fetchInitialData, pathname]);

  return <>{children}</>;
}
