'use client';

import { memo, useEffect } from 'react';

const RegionCookieSetter = memo(function RegionCookieSetter({ region }: { region: string }) {
  useEffect(() => {
    document.cookie = `codhub_region=${region}; path=/; max-age=31536000`; // 1 year
  }, [region]);
  return null;
});

export default RegionCookieSetter;
