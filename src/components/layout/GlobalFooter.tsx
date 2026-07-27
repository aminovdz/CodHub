'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, Link as LinkIcon } from 'lucide-react';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import { useTranslation } from '@/lib/hooks/useTranslation';

const GlobalFooter = memo(function GlobalFooter({ region }: { region: string }) {
  const currentYear = new Date().getFullYear();
  const { homepages, availableStores } = useAdminStore();
  const store = resolveStore(availableStores, region);
  const homepageConfig = store ? homepages.find(h => h.storeId === store.id) : undefined;
  const footerConfig = homepageConfig?.footer;
  const { t } = useTranslation(region);

  const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
  const basePath = isCustomDomain ? '' : `/${region}`;

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 px-4 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="md:col-span-2">
            <div className="font-black text-2xl tracking-tighter text-white mb-4">
              {store?.name || 'COD'}<span className="text-indigo-400">HUB</span>
            </div>
            {footerConfig?.aboutText ? (
              <div 
                className="text-sm text-slate-400 max-w-sm mb-6 prose prose-invert prose-sm"
                dangerouslySetInnerHTML={{ __html: footerConfig.aboutText }}
              />
            ) : (
              <p className="text-sm text-slate-400 max-w-sm mb-6">
                {t('footer.aboutDefault', 'تجربة التسوق المميزة بالدفع عند الاستلام. منتجات عالية الجودة، توصيل سريع، وبدون حاجة لبطاقة ائتمان.')}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm font-bold">
              <span className="flex items-center gap-2"><Truck size={16} className="text-indigo-400"/> {t('product.payOnDelivery', 'الدفع عند الاستلام')}</span>
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400"/> {t('checkout.secureText', 'تسوق آمن 100%')}</span>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-6 md:border-t-0 md:pt-0">
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">{t('footer.storeLinks', 'روابط المتجر')}</h4>
            <ul className="space-y-2 text-sm font-medium">
              {(footerConfig?.storeLinks && footerConfig.storeLinks.length > 0) ? (
                footerConfig.storeLinks.map((link, i) => (
                  <li key={i}><Link href={link.url.startsWith('/') ? link.url : `${basePath}${link.url.startsWith('/') ? '' : '/'}${link.url}`} className="hover:text-white transition-colors">{link.label}</Link></li>
                ))
              ) : (
                <>
                  <li><Link href={basePath || '/'} className="hover:text-white transition-colors">{t('footer.allProducts', 'جميع المنتجات')}</Link></li>
                  <li><Link href={basePath || '/'} className="hover:text-white transition-colors">{t('footer.bestSellers', 'الأكثر مبيعاً')}</Link></li>
                  <li><Link href={basePath || '/'} className="hover:text-white transition-colors">{t('footer.trackOrder', 'تتبع الطلب')}</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">{t('footer.legalSupport', 'السياسات والدعم')}</h4>
            <ul className="space-y-2 text-sm font-medium">
              {(footerConfig?.legalLinks && footerConfig.legalLinks.length > 0) ? (
                footerConfig.legalLinks.map((link, i) => (
                  <li key={i}><Link href={link.url.startsWith('/') ? link.url : `${basePath}${link.url.startsWith('/') ? '' : '/'}${link.url}`} className="hover:text-white transition-colors">{link.label}</Link></li>
                ))
              ) : (
                <>
                  <li><Link href={`${basePath}/legal/privacy-policy`} className="hover:text-white transition-colors">{t('footer.privacyPolicy', 'سياسة الخصوصية')}</Link></li>
                  <li><Link href={`${basePath}/legal/terms-of-service`} className="hover:text-white transition-colors">{t('footer.termsOfService', 'شروط الخدمة')}</Link></li>
                  <li><Link href={`${basePath}/legal/refund-policy`} className="hover:text-white transition-colors">{t('footer.refundPolicy', 'سياسة الاسترجاع')}</Link></li>
                </>
              )}
              
              {(footerConfig?.contactEmail || footerConfig?.contactPhone) && (
                <li className="pt-2 text-indigo-400 font-bold flex flex-col gap-1">
                  {footerConfig.contactEmail && <span>{footerConfig.contactEmail}</span>}
                  {footerConfig.contactPhone && <span>WhatsApp: {footerConfig.contactPhone}</span>}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Trust Badges and Socials */}
        {(store?.theme?.trust?.badgesUrl || store?.theme?.trust?.socialLinks) && (
          <div className="border-t border-slate-800 pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-6">
            {store.theme.trust.badgesUrl && (
              <div className="w-full md:w-auto flex justify-center md:justify-start">
                <img src={store.theme.trust.badgesUrl} alt="Trust Badges" className="h-8 md:h-12 w-auto object-contain" />
              </div>
            )}
            
            {store.theme.trust.socialLinks && (
              <div className="flex items-center gap-4">
                {store.theme.trust.socialLinks.facebook && (
                  <a href={store.theme.trust.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors text-xs font-bold">
                    FB
                  </a>
                )}
                {store.theme.trust.socialLinks.instagram && (
                  <a href={store.theme.trust.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-pink-600 hover:text-white transition-colors text-xs font-bold">
                    IG
                  </a>
                )}
                {store.theme.trust.socialLinks.tiktok && (
                  <a href={store.theme.trust.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <LinkIcon size={18} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 font-medium">
          &copy; {currentYear} {store?.name || 'CODHUB'} E-commerce. {t('footer.allRightsReserved', 'جميع الحقوق محفوظة.')}
        </div>
      </div>
    </footer>
  );
});

export default GlobalFooter;
