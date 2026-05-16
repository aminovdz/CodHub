import { useAdminStore } from '@/lib/store/useAdminStore';
import { useMemo } from 'react';
import { DEFAULT_TRANSLATIONS } from '../translations';

export function useTranslation(region: string) {
  const { availableStores } = useAdminStore();
  
  const { translations, language } = useMemo(() => {
    const store = availableStores.find(s => s.region.toLowerCase() === region.toLowerCase());
    return {
      translations: store?.translations || {},
      language: store?.language || 'en'
    };
  }, [availableStores, region]);

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
