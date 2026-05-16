'use client';

import Link from 'next/link';
import { ShieldCheck, Truck } from 'lucide-react';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import { useTranslation } from '@/lib/hooks/useTranslation';

export default function GlobalFooter({ region }: { region: string }) {
  const currentYear = new Date().getFullYear();
  const { homepages, availableStores } = useAdminStore();
  const store = resolveStore(availableStores, region);
  const homepageConfig = store ? homepages.find(h => h.storeId === store.id) : undefined;
  const footerConfig = homepageConfig?.footer;
  const { t } = useTranslation(region);

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
                {t('footer.aboutDefault', 'The premium cash on delivery shopping experience. Quality products, fast delivery, and no credit card required.')}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm font-bold">
              <span className="flex items-center gap-2"><Truck size={16} className="text-indigo-400"/> {t('product.payOnDelivery', 'Pay on Delivery')}</span>
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400"/> {t('checkout.secureText', '100% Secure Checkout')}</span>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-6 md:border-t-0 md:pt-0">
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">{t('footer.storeLinks', 'Store Links')}</h4>
            <ul className="space-y-2 text-sm font-medium">
              {(footerConfig?.storeLinks && footerConfig.storeLinks.length > 0) ? (
                footerConfig.storeLinks.map((link, i) => (
                  <li key={i}><Link href={link.url.startsWith('/') ? link.url : `/${region}${link.url.startsWith('/') ? '' : '/'}${link.url}`} className="hover:text-white transition-colors">{link.label}</Link></li>
                ))
              ) : (
                <>
                  <li><Link href={`/${region}`} className="hover:text-white transition-colors">{t('footer.allProducts', 'All Products')}</Link></li>
                  <li><Link href={`/${region}`} className="hover:text-white transition-colors">{t('footer.bestSellers', 'Best Sellers')}</Link></li>
                  <li><Link href={`/${region}`} className="hover:text-white transition-colors">{t('footer.trackOrder', 'Track Order')}</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">{t('footer.legalSupport', 'Legal & Support')}</h4>
            <ul className="space-y-2 text-sm font-medium">
              {(footerConfig?.legalLinks && footerConfig.legalLinks.length > 0) ? (
                footerConfig.legalLinks.map((link, i) => (
                  <li key={i}><Link href={link.url.startsWith('/') ? link.url : `/${region}${link.url.startsWith('/') ? '' : '/'}${link.url}`} className="hover:text-white transition-colors">{link.label}</Link></li>
                ))
              ) : (
                <>
                  <li><Link href={`/${region}/legal/privacy-policy`} className="hover:text-white transition-colors">{t('footer.privacyPolicy', 'Privacy Policy')}</Link></li>
                  <li><Link href={`/${region}/legal/terms-of-service`} className="hover:text-white transition-colors">{t('footer.termsOfService', 'Terms of Service')}</Link></li>
                  <li><Link href={`/${region}/legal/refund-policy`} className="hover:text-white transition-colors">{t('footer.refundPolicy', 'Refund Policy')}</Link></li>
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

        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 font-medium">
          &copy; {currentYear} {store?.name || 'CODHUB'} E-commerce. {t('footer.allRightsReserved', 'All rights reserved.')}
        </div>
      </div>
    </footer>
  );
}
