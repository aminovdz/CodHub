'use client';

import { useEffect } from 'react';

export default function RegionCookieSetter({ region }: { region: string }) {
  useEffect(() => {
    document.cookie = `codhub_region=${region}; path=/; max-age=31536000`; // 1 year
  }, [region]);
  return null;
}
