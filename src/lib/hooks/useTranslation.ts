import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';
import { useMemo } from 'react';
import { DEFAULT_TRANSLATIONS } from '../translations';

export function useTranslation(region: string) {
  const { availableStores: adminStores } = useAdminStore();
  const { availableStores: storefrontStores } = useStorefrontStore();
  
  const { translations, language } = useMemo(() => {
    // Check storefront stores first, then fallback to admin stores
    const allStores = [...storefrontStores, ...adminStores];
    const store = resolveStore(allStores, region);
    
    // If region is an Arabic country, strongly hint at Arabic if no store language is set
    const isArabicRegion = ['dz', 'sa', 'ae', 'ma', 'eg', 'ar'].includes((store?.region || region).toLowerCase());
    
    return {
      translations: store?.translations || {},
      language: store?.language || (isArabicRegion ? 'ar' : 'en')
    };
  }, [adminStores, storefrontStores, region]);

  const t = (key: string, fallback: string) => {
    // 1. Check custom store translations
    if (translations[key]) return translations[key];
    
    // 2. Check default translations for the store's language
    const langDefaults = DEFAULT_TRANSLATIONS[language];
    if (langDefaults && langDefaults[key]) return langDefaults[key];
    
    // 3. Fallback to the hardcoded English string
    return fallback;
  };

  return { t };
}
