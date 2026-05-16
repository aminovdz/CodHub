'use client';

import { useEffect, useRef } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const fetchInitialData = useAdminStore((state) => state.fetchInitialData);
  const fetched = useRef(false);

  useEffect(() => {
    if (!fetched.current) {
      fetched.current = true;
      fetchInitialData();
    }
  }, [fetchInitialData]);

  return <>{children}</>;
}
