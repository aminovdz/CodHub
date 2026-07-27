'use client';

import { useRef, useEffect } from 'react';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';
import { Store, Product, ShippingZone, CheckoutConfig, HomepageConfig } from '@/lib/store/useAdminStore';

interface StoreHydratorProps {
  store: Store;
  products: Product[];
  zones: ShippingZone[];
  configs: CheckoutConfig[];
  homepages: HomepageConfig[];
}

export default function StoreHydrator({ store, products, zones, configs, homepages }: StoreHydratorProps) {
  const initialized = useRef(false);
  
  if (!initialized.current) {
    useStorefrontStore.setState({
      activeStore: store,
      availableStores: [store], // We only need the current store
      products,
      shippingZones: zones,
      checkoutConfigs: configs,
      homepages,
      _hasHydrated: true,
      isLoading: false
    });
    initialized.current = true;
  }

  // Double check client-side that loading state is false just in case
  useEffect(() => {
    useStorefrontStore.setState({ isLoading: false, _hasHydrated: true });
  }, []);

  return null;
}
