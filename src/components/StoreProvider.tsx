'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminStore } from '@/lib/store/useAdminStore';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const fetchAdminData = useAdminStore((state) => state.fetchInitialData);
  const fetchedAdmin = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = !!(pathname?.startsWith('/admin') || pathname?.startsWith('/superadmin'));
    const pathParts = pathname?.split('/') || [];
    const storeSlug = pathParts.length > 1 && pathParts[1] ? pathParts[1] : undefined;
    
    if (isAdmin && !fetchedAdmin.current) {
      fetchedAdmin.current = true;
      fetchAdminData(true);
    }
  }, [fetchAdminData, pathname]);

  return <>{children}</>;
}
