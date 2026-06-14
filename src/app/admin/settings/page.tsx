'use client';

import { useState } from 'react';
import { Save, Globe, Type, Store as StoreIcon, Plus, Trash2, Code, Key, Copy, ListTree, MessageCircle, ShieldAlert, Users, ShoppingCart, Edit2, X } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { DEFAULT_TRANSLATIONS } from '@/lib/translations';
import { useEffect } from 'react';

export default function AdminSettingsPage() {
  const { 
    activeStore, availableStores, addStore, updateStore, removeStore, 
    orderStatuses, addOrderStatus, removeOrderStatus, 
    categories, setCategories, checkoutConfigs, saveCheckoutConfig, 
    globalApiKey, setGlobalApiKey, claudeApiKey, setClaudeApiKey, 
    openAiApiKey, setOpenAiApiKey, openRouterApiKey, setOpenRouterApiKey, 
    openRouterModel, setOpenRouterModel, nvidiaApiKey, setNvidiaApiKey,
    nvidiaModel, setNvidiaModel, aiProvider, setAiProvider,
    addActivityLog
  } = useAdminStore();

  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';
  
  // Layout & SEO Settings
  const [isRtl, setIsRtl] = useState(true);
  const [announcementText, setAnnouncementText] = useState('⚡ Flash Sale: 50% OFF All Items');
  const [localStoreName, setLocalStoreName] = useState(activeStore.name || 'CODHUB');
  const [seoTitle, setSeoTitle] = useState('CODHUB | The Premium Shopping Experience');
  const [seoDesc, setSeoDesc] = useState('Shop premium products with fast cash on delivery.');
  const [localApiKey, setLocalApiKey] = useState(globalApiKey || '');
  const [localClaudeKey, setLocalClaudeKey] = useState(claudeApiKey || '');
  const [localOpenAiKey, setLocalOpenAiKey] = useState(openAiApiKey || '');
  const [localOpenRouterKey, setLocalOpenRouterKey] = useState(openRouterApiKey || '');
  const [localOpenRouterModel, setLocalOpenRouterModel] = useState(openRouterModel || 'meta-llama/llama-3.3-70b-instruct:free');
  const [localNvidiaKey, setLocalNvidiaKey] = useState(nvidiaApiKey || '');
  const [localNvidiaModel, setLocalNvidiaModel] = useState(nvidiaModel || 'meta/llama-3.1-405b-instruct');
  const [localProvider, setLocalProvider] = useState<'gemini'|'claude'|'openai'|'openrouter'|'nvidia'>(aiProvider || 'gemini');
  const [localPrimaryColor, setLocalPrimaryColor] = useState(activeStore.primaryColor || '#4F46E5');
  const [customDomain, setCustomDomain] = useState(activeStore.customDomain || '');
  const [stickyBuyEnabled, setStickyBuyEnabled] = useState(activeStore.stickyBuyButton?.enabled ?? false);
  const [stickyBuyText, setStickyBuyText] = useState(activeStore.stickyBuyButton?.text || 'Order Now');
  const [stickyBuyCss, setStickyBuyCss] = useState(activeStore.stickyBuyButton?.customCss || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [isWebhookGuideOpen, setIsWebhookGuideOpen] = useState(false);
  const [isWhatsappGuideOpen, setIsWhatsappGuideOpen] = useState(false);

  // New Store State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreRegion, setNewStoreRegion] = useState('');
  const [newStorePrefix, setNewStorePrefix] = useState('');
  const [newStoreCurrency, setNewStoreCurrency] = useState('');
  const [newStoreLanguage, setNewStoreLanguage] = useState('en');
  const [newStoreCustomDomain, setNewStoreCustomDomain] = useState('');

  // Status State
  const [newStatus, setNewStatus] = useState('');

  // Translations State
  const [translations, setTranslations] = useState<Record<string, string>>(activeStore.translations || {});

  // Integrations State
  const [resendApiKey, setResendApiKey] = useState(activeStore.resendApiKey || '');
  const [notifyEmail, setNotifyEmail] = useState(activeStore.notifyEmail || '');
  const [analytics, setAnalytics] = useState({
    google: activeStore.analytics?.google || '',
    facebook: activeStore.analytics?.facebook || '',
    tiktok: activeStore.analytics?.tiktok || '',
    snapchat: activeStore.analytics?.snapchat || '',
    pinterest: activeStore.analytics?.pinterest || ''
  });

  // Fulfillment State
  const [yalidineApiKey, setYalidineApiKey] = useState(activeStore.yalidineApiKey || '');
  const [yalidineApiToken, setYalidineApiToken] = useState(activeStore.yalidineApiToken || '');
  const [genericWebhookUrl, setGenericWebhookUrl] = useState(activeStore.genericWebhookUrl || '');

  // DZ Fulfillment Providers State
  const [dzFulfillment, setDzFulfillment] = useState(activeStore.dzFulfillment || {
    defaultProvider: 'yalidine' as const,
    yalidine: { apiKey: '', apiToken: '' },
    zrexpress: { apiKey: '', apiToken: '', branchId: '' },
    mayestro: { apiKey: '' },
    dhd: { apiKey: '', apiToken: '' },
    autoRoutingEnabled: false,
    trackConfirmationTime: false
  });

  // Checkout & Upsell State
  const [checkoutConfig, setCheckoutConfig] = useState({
    enableStep2Upsell: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableStep2Upsell ?? true,
    countdownMinutes: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.countdownMinutes ?? 5,
    enablePostPurchaseOTO: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enablePostPurchaseOTO ?? false,
    enableDigitalReceipt: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableDigitalReceipt ?? true,
    thankYouMessage: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.thankYouMessage ?? '',
    showAddressFields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.showAddressFields ?? true,
    fields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.fields || { showEmail: false, requireEmail: false, showLastName: false, showCity: true, showPostalCode: true, showProvince: true, showCountry: true },
  });

  // WhatsApp State
  const [whatsappConfig, setWhatsappConfig] = useState({
    abandonedCartEnabled: activeStore.whatsappConfig?.abandonedCartEnabled ?? false,
    abandonedCartDelayMinutes: activeStore.whatsappConfig?.abandonedCartDelayMinutes ?? 30,
    abandonedCartScript: activeStore.whatsappConfig?.abandonedCartScript || "Hello *[NAME]*, this is *[STORE_NAME]*. We noticed you were interested in *[PRODUCT]* but didn't complete your order. We still have it reserved for you! Would you like us to confirm this Cash on Delivery order and ship it to you? Order: #[ORDER_ID]",
    thankYouEnabled: activeStore.whatsappConfig?.thankYouEnabled ?? false,
    thankYouNumber: activeStore.whatsappConfig?.thankYouNumber || '',
    thankYouMessage: activeStore.whatsappConfig?.thankYouMessage || 'Hello, I want to confirm my order: [ORDER_ID]',
    metaEnabled: activeStore.whatsappConfig?.metaEnabled ?? false,
    metaPhoneNumberId: activeStore.whatsappConfig?.metaPhoneNumberId || '',
    metaAccessToken: activeStore.whatsappConfig?.metaAccessToken || '',
    metaTemplateName: activeStore.whatsappConfig?.metaTemplateName || '',
    metaLanguageCode: activeStore.whatsappConfig?.metaLanguageCode || 'en_US',
    metaTemplateParams: activeStore.whatsappConfig?.metaTemplateParams || '[NAME],[PRODUCT],[PRODUCT_URL],[ADDRESS],[ORDER_ID],[STORE_NAME]',
    metaIgnoreSelfConfirmed: activeStore.whatsappConfig?.metaIgnoreSelfConfirmed ?? true,
    metaAbandonedCartTemplateName: activeStore.whatsappConfig?.metaAbandonedCartTemplateName || '',
    chatbotEnabled: activeStore.whatsappConfig?.chatbotEnabled ?? false,
    chatbotName: activeStore.whatsappConfig?.chatbotName || 'Fatima',
    chatbotInstructions: activeStore.whatsappConfig?.chatbotInstructions || 'We offer free delivery for orders above 10,000 DZD. Return policy: 7 days free returns on defective items.',
    chatbotProvider: activeStore.whatsappConfig?.chatbotProvider || 'gemini',
    chatbotModel: activeStore.whatsappConfig?.chatbotModel || '',
    chatbotApiKey: activeStore.whatsappConfig?.chatbotApiKey || '',
  });

  // Fraud Rules State
  const [fraudConfig, setFraudConfig] = useState(activeStore.fraudConfig || {
    blockDuplicateIps: false,
    duplicateIpTimeframeHours: 24,
    requireApprovalForHighValue: false,
    highValueThreshold: 15000
  });



  // Category State
  const { notify } = useNotificationStore();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; storeId: string; name: string }>({ isOpen: false, storeId: '', name: '' });
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    setTranslations(activeStore.translations || {});
    setResendApiKey(activeStore.resendApiKey || '');
    setNotifyEmail(activeStore.notifyEmail || '');
    setAnalytics({
      google: activeStore.analytics?.google || '',
      facebook: activeStore.analytics?.facebook || '',
      tiktok: activeStore.analytics?.tiktok || '',
      snapchat: activeStore.analytics?.snapchat || '',
      pinterest: activeStore.analytics?.pinterest || ''
    });
    setYalidineApiKey(activeStore.yalidineApiKey || '');
    setYalidineApiToken(activeStore.yalidineApiToken || '');
    setGenericWebhookUrl(activeStore.genericWebhookUrl || '');

    setDzFulfillment(activeStore.dzFulfillment || {
      defaultProvider: 'yalidine',
      yalidine: { apiKey: '', apiToken: '' },
      zrexpress: { apiKey: '', apiToken: '', branchId: '' },
      mayestro: { apiKey: '' },
      dhd: { apiKey: '', apiToken: '' },
      autoRoutingEnabled: false,
      trackConfirmationTime: false
    });

    setCheckoutConfig({
      enableStep2Upsell: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableStep2Upsell ?? true,
      countdownMinutes: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.countdownMinutes ?? 5,
      enablePostPurchaseOTO: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enablePostPurchaseOTO ?? false,
      enableDigitalReceipt: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableDigitalReceipt ?? true,
      thankYouMessage: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.thankYouMessage ?? '',
      showAddressFields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.showAddressFields ?? true,
      fields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.fields || { showEmail: false, requireEmail: false, showLastName: false, showCity: true, showPostalCode: true, showProvince: true, showCountry: true },
    });

    setWhatsappConfig({
      abandonedCartEnabled: activeStore.whatsappConfig?.abandonedCartEnabled ?? false,
      abandonedCartDelayMinutes: activeStore.whatsappConfig?.abandonedCartDelayMinutes ?? 30,
      abandonedCartScript: activeStore.whatsappConfig?.abandonedCartScript || "Hello *[NAME]*, this is *[STORE_NAME]*. We noticed you were interested in *[PRODUCT]* but didn't complete your order. We still have it reserved for you! Would you like us to confirm this Cash on Delivery order and ship it to you? Order: #[ORDER_ID]",
      thankYouEnabled: activeStore.whatsappConfig?.thankYouEnabled ?? false,
      thankYouNumber: activeStore.whatsappConfig?.thankYouNumber || '',
      thankYouMessage: activeStore.whatsappConfig?.thankYouMessage || 'Hello, I want to confirm my order: [ORDER_ID]',
      metaEnabled: activeStore.whatsappConfig?.metaEnabled ?? false,
      metaPhoneNumberId: activeStore.whatsappConfig?.metaPhoneNumberId || '',
      metaAccessToken: activeStore.whatsappConfig?.metaAccessToken || '',
      metaTemplateName: activeStore.whatsappConfig?.metaTemplateName || '',
      metaLanguageCode: activeStore.whatsappConfig?.metaLanguageCode || 'en_US',
      metaTemplateParams: activeStore.whatsappConfig?.metaTemplateParams || '[NAME],[PRODUCT],[PRODUCT_URL],[ADDRESS],[ORDER_ID],[STORE_NAME]',
      metaIgnoreSelfConfirmed: activeStore.whatsappConfig?.metaIgnoreSelfConfirmed ?? true,
      metaAbandonedCartTemplateName: activeStore.whatsappConfig?.metaAbandonedCartTemplateName || '',
      chatbotEnabled: activeStore.whatsappConfig?.chatbotEnabled ?? false,
      chatbotName: activeStore.whatsappConfig?.chatbotName || 'Fatima',
      chatbotInstructions: activeStore.whatsappConfig?.chatbotInstructions || 'We offer free delivery for orders above 10,000 DZD. Return policy: 7 days free returns on defective items.',
      chatbotProvider: activeStore.whatsappConfig?.chatbotProvider || 'gemini',
      chatbotModel: activeStore.whatsappConfig?.chatbotModel || '',
      chatbotApiKey: activeStore.whatsappConfig?.chatbotApiKey || '',
    });

    setFraudConfig(activeStore.fraudConfig || {
      blockDuplicateIps: false,
      duplicateIpTimeframeHours: 24,
      requireApprovalForHighValue: false,
      highValueThreshold: 15000
    });
    setLocalPrimaryColor(activeStore.primaryColor || '#4F46E5');
    setCustomDomain(activeStore.customDomain || '');
  }, [activeStore.id, activeStore.translations, activeStore.resendApiKey, activeStore.notifyEmail, activeStore.analytics, activeStore.yalidineApiKey, activeStore.yalidineApiToken, activeStore.genericWebhookUrl, activeStore.dzFulfillment, activeStore.whatsappConfig, globalApiKey, claudeApiKey, openAiApiKey, openRouterApiKey, openRouterModel, aiProvider, activeStore.primaryColor, activeStore.customDomain, activeStore.name]);

  const handleSaveSEO = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStore(activeStore.id, { 
      name: localStoreName,
      translations, resendApiKey, notifyEmail, analytics, 
      yalidineApiKey, yalidineApiToken, genericWebhookUrl,
      whatsappConfig, dzFulfillment, primaryColor: localPrimaryColor,
      customDomain: customDomain.replace(/^(https?:\/\/)?(www\.)?/, '').trim() || undefined,
      stickyBuyButton: { enabled: stickyBuyEnabled, text: stickyBuyText, customCss: stickyBuyCss }
    });

    setGlobalApiKey(localApiKey);
    setClaudeApiKey(localClaudeKey);
    setOpenAiApiKey(localOpenAiKey);
    setOpenRouterApiKey(localOpenRouterKey);
    setOpenRouterModel(localOpenRouterModel);
    setNvidiaApiKey(localNvidiaKey);
    setNvidiaModel(localNvidiaModel);
    setAiProvider(localProvider);

    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Settings Updated', detail: 'General and integration settings updated' });
    setIsSaving(false);
    notify('Settings saved successfully!', 'success');
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreRegion || !newStoreCurrency) return;
    setIsCreatingStore(true);
    await addStore({
      id: 'store_' + Date.now().toString(),
      name: newStoreName,
      region: newStoreRegion.toUpperCase(),
      phonePrefix: newStorePrefix,
      currency: newStoreCurrency.toUpperCase(),
      language: newStoreLanguage.toLowerCase(),
      customDomain: newStoreCustomDomain.replace(/^(https?:\/\/)?(www\.)?/, '').trim() || undefined,
      translations: (DEFAULT_TRANSLATIONS as any)[newStoreLanguage.toLowerCase()] || {}
    });
    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Store Created', detail: `Created store ${newStoreName} (${newStoreRegion})` });
    setNewStoreName('');
    setNewStoreRegion('');
    setNewStorePrefix('');
    setNewStoreCurrency('');
    setNewStoreLanguage('en');
    setNewStoreCustomDomain('');
    setIsCreatingStore(false);
    notify('New store created successfully!', 'success');
  };

  const handleDeleteStore = (storeId: string, storeName: string) => {
    setDeleteModal({ isOpen: true, storeId, name: storeName });
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus) {
      addOrderStatus(newStatus);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Status Added', detail: `Added status ${newStatus}` });
      setNewStatus('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Store Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Configure global behavior, statuses, and multi-tenant stores.</p>
      </div>

      {/* MULTI-STORE MANAGER */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <StoreIcon className="text-indigo-600" /> Multi-Store Manager
        </h2>
        
        {/* Existing Stores List */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Active Stores</h3>
          <div className="space-y-3">
            {availableStores.map(store => (
              <div key={store.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="font-bold text-slate-900">{store.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">Region: {store.region.toUpperCase()} | Currency: {store.currency}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500">Language:</label>
                    <select 
                      value={store.language || 'en'} 
                      onChange={(e) => {
                        const newLang = e.target.value;
                        updateStore(store.id, { 
                          language: newLang, 
                          translations: (DEFAULT_TRANSLATIONS as any)[newLang] || {} 
                        });
                        notify(`${store.name} language updated to ${newLang.toUpperCase()}`, 'success');
                      }}
                      className="text-xs font-bold bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value="en">EN</option>
                      <option value="fr">FR</option>
                      <option value="ar">AR</option>
                      <option value="es">ES</option>
                      <option value="ro">RO</option>
                      <option value="pt">PT</option>
                      <option value="it">IT</option>
                      <option value="hu">HU</option>
                      <option value="pl">PL</option>
                      <option value="cs">CS</option>
                      <option value="sk">SK</option>
                      <option value="bg">BG</option>
                      <option value="sr">SR</option>
                      <option value="el">EL</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${store.region}`); notify('Store URL Copied!', 'success'); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Copy Store Link">
                    <Copy size={18} />
                  </button>
                  {availableStores.length > 1 && (
                    <button onClick={() => handleDeleteStore(store.id, store.name)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Store Form */}
        <form onSubmit={handleCreateStore} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Create New Store</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Store Name</label>
              <input type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. Morocco Main" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Region Code</label>
              <input type="text" value={newStoreRegion} onChange={e => setNewStoreRegion(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. MA, FR, UK" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone Prefix</label>
              <input type="text" value={newStorePrefix} onChange={e => setNewStorePrefix(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. +212" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Currency</label>
              <input type="text" value={newStoreCurrency} onChange={e => setNewStoreCurrency(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. MAD, EUR" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Base Language</label>
              <select value={newStoreLanguage} onChange={e => setNewStoreLanguage(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white">
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="es">Spanish</option>
                <option value="ro">Romanian</option>
                <option value="pt">Portuguese</option>
                <option value="it">Italian</option>
                <option value="hu">Hungarian</option>
                <option value="pl">Polish</option>
                <option value="cs">Czech</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Custom Domain</label>
              <input type="text" value={newStoreCustomDomain} onChange={e => setNewStoreCustomDomain(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. fitnessdz.com" />
            </div>
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm transition-colors">
            <Plus size={16} /> Add Store
          </button>
        </form>
      </div>

      {/* AI SETTINGS MANAGER */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Code className="text-indigo-600" /> AI Co-Pilot Settings
        </h2>
        
        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-indigo-500 mt-0.5">✨</span>
          <div className="text-sm font-medium text-indigo-800 space-y-1">
            <strong className="block font-bold text-indigo-900">AI Integration Config</strong>
            <p>Select your default AI provider and enter the corresponding API key to enable AI Agents and Co-Pilot features.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Default AI Provider</label>
            <select 
              value={localProvider} 
              onChange={(e) => setLocalProvider(e.target.value as any)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium"
            >
              <option value="gemini">Google Gemini (Recommended, Fast & Free Tier)</option>
              <option value="claude">Anthropic Claude (Best Quality, Paid)</option>
              <option value="openai">OpenAI ChatGPT (Industry Standard)</option>
              <option value="openrouter">OpenRouter (Free / Open Source Models)</option>
              <option value="nvidia">Nvidia NIM (Nvidia NIM API)</option>
            </select>
          </div>

          <div className={localProvider !== 'gemini' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={localApiKey} 
              onChange={(e) => setLocalApiKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="AIzaSy..." 
            />
          </div>

          <div className={localProvider !== 'claude' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">Claude API Key (Anthropic)</label>
            <input 
              type="password" 
              value={localClaudeKey} 
              onChange={(e) => setLocalClaudeKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="sk-ant-api03-..." 
            />
          </div>

          <div className={localProvider !== 'openai' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">OpenAI API Key</label>
            <input 
              type="password" 
              value={localOpenAiKey} 
              onChange={(e) => setLocalOpenAiKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="sk-proj-..." 
            />
          </div>

          <div className={localProvider !== 'openrouter' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">OpenRouter API Key</label>
            <input 
              type="password" 
              value={localOpenRouterKey} 
              onChange={(e) => setLocalOpenRouterKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium mb-4" 
              placeholder="sk-or-v1-..." 
            />
            
            <label className="block text-sm font-bold text-slate-700 mb-2">OpenRouter Model</label>
            <input 
              type="text" 
              value={localOpenRouterModel} 
              onChange={(e) => setLocalOpenRouterModel(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free" 
            />
          </div>

          <div className={localProvider !== 'nvidia' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nvidia API Key</label>
            <input 
              type="password" 
              value={localNvidiaKey} 
              onChange={(e) => setLocalNvidiaKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium mb-4" 
              placeholder="nvapi-..." 
            />
            
            <label className="block text-sm font-bold text-slate-700 mb-2">Nvidia Model</label>
            <input 
              type="text" 
              value={localNvidiaModel} 
              onChange={(e) => setLocalNvidiaModel(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="e.g. meta/llama-3.1-405b-instruct" 
            />
          </div>
        </div>
      </div>

      {/* CUSTOM ORDER STATUSES */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Type className="text-indigo-600" /> Custom Order Statuses
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {orderStatuses.map(status => (
            <span key={status} className="bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              {status}
              <button 
                type="button" 
                onClick={() => {
                  removeOrderStatus(status);
                  addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Status Deleted', detail: `Removed status ${status}` });
                }}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="Remove Custom Status (Default statuses cannot be removed)"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddStatus} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">New Status Name</label>
            <input type="text" value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. PARTIAL_REFUND" />
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm h-[42px]">
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      {/* CATEGORY MANAGER */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <ListTree className="text-indigo-600" /> Category Manager
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <span key={cat} className="bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              {cat}
              <button 
                type="button" 
                onClick={() => {
                  setCategories(prev => prev.filter(c => c !== cat));
                  addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Category Deleted', detail: `Removed category ${cat}` });
                }}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="Remove Category"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          setCategoryError('');
          if (newCategory) {
            if (categories.some(c => c.toLowerCase().trim() === newCategory.toLowerCase().trim())) {
              setCategoryError(`Category "${newCategory}" already exists`);
              return;
            }
            setCategories(prev => [...prev, newCategory.trim()]);
            addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Category Added', detail: `Added category ${newCategory}` });
            setNewCategory('');
          }
        }} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">New Category Name</label>
            <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} onFocus={() => setCategoryError('')} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. Beauty & Care" />
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm h-[42px]">
            <Plus size={16} /> Add
          </button>
        </form>
        {categoryError && <p className="text-rose-600 text-xs font-bold mt-2">{categoryError}</p>}
      </div>



      {/* SEO & LAYOUT */}
      <form onSubmit={handleSaveSEO} className="space-y-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Globe className="text-indigo-600" /> Localization & Layout
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-slate-900">Right-to-Left (RTL) Layout</div>
              <div className="text-sm text-slate-500 mt-1">Enable RTL support globally for Arabic/Hebrew regions.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isRtl} onChange={(e) => setIsRtl(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="mt-6 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <h3 className="font-bold text-slate-900 mb-1">Custom Domain Binding</h3>
            <p className="text-xs text-slate-500 mb-3">
              Point a unique custom domain (e.g. <code>algerian-beauty.com</code> or <code>fitnessdz.com</code>) to this specific sub-store.
            </p>
            <div className="flex gap-2 max-w-md">
              <input 
                type="text" 
                value={customDomain} 
                onChange={(e) => setCustomDomain(e.target.value)} 
                placeholder="e.g. algerian-beauty.com" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold text-sm" 
              />
            </div>
          </div>
          
          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Top Announcement Banner</label>
              <input type="text" value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-slate-700" />
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">Default SEO Metadata</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2">Meta Title</label>
                  <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-slate-700" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Store Display Name</label>
                  <p className="text-xs text-slate-500 mb-2">This is the name shown in the storefront header.</p>
                  <input type="text" value={localStoreName} onChange={(e) => setLocalStoreName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2">Meta Description</label>
                  <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-slate-700 resize-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INTEGRATIONS & PIXELS */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
            <Code className="text-indigo-600" /> Tracking & Integrations
          </h2>
          <p className="text-sm text-slate-500 mb-6">Configure pixels and external APIs for {activeStore.name}.</p>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Key size={12}/> Resend API Key</label>
                <input type="password" value={resendApiKey} onChange={e => setResendApiKey(e.target.value)} placeholder="re_..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Order Notification Email</label>
                <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="orders@yourstore.com" className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" />
              </div>
            </div>

            {/* Fulfillment Setup */}
            <div className="pb-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Fulfillment Provider</h3>
              {activeStore?.region?.toLowerCase() === 'dz' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">Default Provider</label>
                    <select 
                      value={dzFulfillment.defaultProvider} 
                      onChange={(e) => setDzFulfillment({...dzFulfillment, defaultProvider: e.target.value as any})}
                      className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold"
                    >
                      <option value="yalidine">Yalidine</option>
                      <option value="zrexpress">ZR Express</option>
                      <option value="mayestro">Mayestro Delivery</option>
                      <option value="dhd">DHD</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl mt-4">
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">Auto-Routing (Round-Robin)</h4>
                      <p className="text-[10px] text-amber-800/80">Automatically assign new incoming PENDING orders to online confirmation staff</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={!!dzFulfillment.autoRoutingEnabled} 
                        onChange={(e) => setDzFulfillment({...dzFulfillment, autoRoutingEnabled: e.target.checked})}
                        className="sr-only peer" 
                        id="setting-auto-routing"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl mt-4">
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">Track Confirmation Time</h4>
                      <p className="text-[10px] text-amber-800/80">Track and store elapsed time between order creation and agent confirmation</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={!!dzFulfillment.trackConfirmationTime} 
                        onChange={(e) => setDzFulfillment({...dzFulfillment, trackConfirmationTime: e.target.checked})}
                        className="sr-only peer" 
                        id="setting-track-confirmation-time"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {dzFulfillment.defaultProvider === 'yalidine' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Yalidine API Key</label>
                        <input type="password" value={dzFulfillment.yalidine?.apiKey || ''} onChange={e => setDzFulfillment({...dzFulfillment, yalidine: { apiKey: e.target.value, apiToken: dzFulfillment.yalidine?.apiToken || '' }})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Yalidine API Token</label>
                        <input type="password" value={dzFulfillment.yalidine?.apiToken || ''} onChange={e => setDzFulfillment({...dzFulfillment, yalidine: { apiKey: dzFulfillment.yalidine?.apiKey || '', apiToken: e.target.value }})} placeholder="API Token" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}

                  {dzFulfillment.defaultProvider === 'zrexpress' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">ZR API Key</label>
                        <input type="password" value={dzFulfillment.zrexpress?.apiKey} onChange={e => setDzFulfillment({...dzFulfillment, zrexpress: { ...dzFulfillment.zrexpress, apiKey: e.target.value } as any})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">ZR API Token</label>
                        <input type="password" value={dzFulfillment.zrexpress?.apiToken} onChange={e => setDzFulfillment({...dzFulfillment, zrexpress: { ...dzFulfillment.zrexpress, apiToken: e.target.value } as any})} placeholder="API Token" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Branch ID</label>
                        <input type="text" value={dzFulfillment.zrexpress?.branchId} onChange={e => setDzFulfillment({...dzFulfillment, zrexpress: { ...dzFulfillment.zrexpress, branchId: e.target.value } as any})} placeholder="Branch ID" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}

                  {dzFulfillment.defaultProvider === 'mayestro' && (
                    <div className="grid grid-cols-1 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Mayestro API Key</label>
                        <input type="password" value={dzFulfillment.mayestro?.apiKey} onChange={e => setDzFulfillment({...dzFulfillment, mayestro: { apiKey: e.target.value }})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}

                  {dzFulfillment.defaultProvider === 'dhd' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">DHD API Key</label>
                        <input type="password" value={dzFulfillment.dhd?.apiKey} onChange={e => setDzFulfillment({...dzFulfillment, dhd: { ...dzFulfillment.dhd, apiKey: e.target.value } as any})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">DHD API Token</label>
                        <input type="password" value={dzFulfillment.dhd?.apiToken} onChange={e => setDzFulfillment({...dzFulfillment, dhd: { ...dzFulfillment.dhd, apiToken: e.target.value } as any})} placeholder="API Token" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-1">n8n / 3PL Webhook URL</h4>
                    <p className="text-xs text-slate-500 mb-3">Send new confirmed orders automatically to n8n, Make, or any 3PL service.</p>
                    <input type="text" value={genericWebhookUrl} onChange={e => setGenericWebhookUrl(e.target.value)} placeholder="https://hook.n8n.cloud/webhook/..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 font-bold" />
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-slate-500">When you click "Send to Webhook" on an order, we will POST the order data to this URL.</p>
                    <button
                      type="button"
                      onClick={() => setIsWebhookGuideOpen(true)}
                      className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors underline self-start sm:self-auto flex items-center gap-1 shrink-0"
                    >
                      View Setup Guide
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Google Analytics / GTM Code</label>
                <textarea rows={4} value={analytics.google} onChange={e => setAnalytics({...analytics, google: e.target.value})} placeholder="Paste full Google Analytics/Tag Manager script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Facebook Meta Pixel Code</label>
                <textarea rows={4} value={analytics.facebook} onChange={e => setAnalytics({...analytics, facebook: e.target.value})} placeholder="Paste full Meta Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TikTok Pixel Code</label>
                <textarea rows={4} value={analytics.tiktok} onChange={e => setAnalytics({...analytics, tiktok: e.target.value})} placeholder="Paste full TikTok Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Snapchat Pixel Code</label>
                <textarea rows={4} value={analytics.snapchat} onChange={e => setAnalytics({...analytics, snapchat: e.target.value})} placeholder="Paste full Snapchat Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Pinterest Tag Code</label>
                <textarea rows={4} value={analytics.pinterest} onChange={e => setAnalytics({...analytics, pinterest: e.target.value})} placeholder="Paste full Pinterest Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
            </div>
          </div>
        </div>


        {/* WHATSAPP AUTOMATION */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <MessageCircle className="text-green-500" /> WhatsApp Automations
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Abandoned Cart Auto-Recovery</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatically prompt users to complete their checkout via WhatsApp if they drop off.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={whatsappConfig.abandonedCartEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, abandonedCartEnabled: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            {whatsappConfig.abandonedCartEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Delay (Minutes)</label>
                  <input type="number" min={1} value={whatsappConfig.abandonedCartDelayMinutes} onChange={(e) => setWhatsappConfig({...whatsappConfig, abandonedCartDelayMinutes: parseInt(e.target.value) || 30})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                  <p className="text-xs text-slate-500 mt-1">Time to wait before prompt.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Abandoned Cart Message Script</label>
                  <textarea value={whatsappConfig.abandonedCartScript} onChange={(e) => setWhatsappConfig({...whatsappConfig, abandonedCartScript: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white resize-none" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Available variables: <strong>[NAME]</strong>, <strong>[PRODUCT]</strong>, <strong>[PRODUCT_URL]</strong>, <strong>[CART_TOTAL]</strong>, <strong>[ORDER_ID]</strong>.</p>
                </div>
              </div>
            )}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 mb-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Thank You Page WhatsApp CTA</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Show &ldquo;Confirm on WhatsApp&rdquo; button after order placed.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={whatsappConfig.thankYouEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, thankYouEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {whatsappConfig.thankYouEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp Business Number</label>
                      <input type="text" value={whatsappConfig.thankYouNumber} onChange={(e) => setWhatsappConfig({...whatsappConfig, thankYouNumber: e.target.value})} placeholder="+213555..." className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp Thank You Message Template</label>
                    <textarea 
                      value={whatsappConfig.thankYouMessage} 
                      onChange={(e) => setWhatsappConfig({...whatsappConfig, thankYouMessage: e.target.value})} 
                      rows={3} 
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white resize-none" 
                      placeholder="Hello, I want to confirm my order: [ORDER_ID]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Available placeholders: <strong>[ORDER_ID]</strong>, <strong>[NAME]</strong>, <strong>[PRODUCT]</strong>, <strong>[ADDRESS]</strong></p>
                  </div>
                </div>
              )}
            </div>


            {/* Meta WhatsApp API Settings */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 mb-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-green-600">📱</span> Meta WhatsApp Business API
                    <button type="button" onClick={() => setIsWhatsappGuideOpen(true)} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-200 ml-2">Setup Guide</button>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Send automated WhatsApp messages directly via the official Meta Graph API — no third-party BSP required.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={whatsappConfig.metaEnabled ?? false} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {whatsappConfig.metaEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number ID</label>
                      <input type="text" value={whatsappConfig.metaPhoneNumberId || ''} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaPhoneNumberId: e.target.value})} placeholder="e.g. 123456789012345" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                      <p className="text-[11px] text-slate-400 mt-1">Found in Meta Business Dashboard → WhatsApp → Phone Numbers</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Permanent Access Token</label>
                      <input type="password" value={whatsappConfig.metaAccessToken || ''} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaAccessToken: e.target.value})} placeholder="EAAxxxx..." className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                      <p className="text-[11px] text-slate-400 mt-1">Generate a System User token in Meta Business Manager for production use</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Order Confirmation Template Name</label>
                      <input type="text" value={whatsappConfig.metaTemplateName || ''} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaTemplateName: e.target.value})} placeholder="e.g. order_confirmation" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Abandoned Cart Template Name</label>
                      <input type="text" value={whatsappConfig.metaAbandonedCartTemplateName || ''} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaAbandonedCartTemplateName: e.target.value})} placeholder="e.g. abandoned_cart_recovery" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Template Language Code</label>
                      <input type="text" value={whatsappConfig.metaLanguageCode || 'en_US'} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaLanguageCode: e.target.value})} placeholder="e.g. ar, en_US, fr" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Template Body Parameters (comma-separated, in order)</label>
                    <input type="text" value={whatsappConfig.metaTemplateParams || ''} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaTemplateParams: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    <p className="text-[11px] text-slate-400 mt-1">Available placeholders: <strong>[NAME]</strong>, <strong>[PRODUCT]</strong>, <strong>[PRODUCT_URL]</strong>, <strong>[ADDRESS]</strong>, <strong>[ORDER_ID]</strong>, <strong>[STORE_NAME]</strong>, <strong>[ORDER_TOTAL]</strong></p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <div>
                      <label className="font-bold text-xs text-indigo-950 dark:text-indigo-200">Skip automation for self-confirmed orders</label>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-400">Ignore orders where clients click WhatsApp thank-you link manually.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={whatsappConfig.metaIgnoreSelfConfirmed ?? true} onChange={(e) => setWhatsappConfig({...whatsappConfig, metaIgnoreSelfConfirmed: e.target.checked})} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">📡 Webhook for Delivery Status Tracking</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                      Configure this URL in your <strong>Meta App Dashboard → WhatsApp → Configuration → Webhook</strong> to receive delivery status updates (delivered, read, failed):
                    </p>
                    <code className="bg-slate-200 dark:bg-slate-950 px-2 py-1 rounded text-xs text-slate-800 dark:text-slate-200 break-all block">{typeof window !== 'undefined' ? window.location.origin : ''}/api/meta/webhook</code>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      Webhook Verify Token: <code className="bg-slate-200 dark:bg-slate-950 px-2 py-0.5 rounded text-xs">Set <strong>META_WEBHOOK_VERIFY_TOKEN</strong> in your .env file</code>
                    </p>
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mt-4 mb-2">⏱ Abandoned Cart Cron Setup</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Set up a cron job at <strong>cron-job.org</strong> to hit this URL every 5 minutes:<br />
                      <code className="bg-slate-200 dark:bg-slate-950 px-2 py-0.5 rounded text-xs text-slate-800 dark:text-slate-200 break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/cron/abandoned-carts</code>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Storefront Chatbot Settings */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 mb-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">AI Storefront Chatbot Assistant</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enable a floating AI chatbot on the storefront for products and delivery queries.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={whatsappConfig.chatbotEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {whatsappConfig.chatbotEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Chatbot Name</label>
                      <input type="text" value={whatsappConfig.chatbotName} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">AI Provider</label>
                      <select value={whatsappConfig.chatbotProvider} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotProvider: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white">
                        <option value="gemini">Gemini</option>
                        <option value="claude">Claude</option>
                        <option value="openai">OpenAI</option>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Provider API Key</label>
                      <input type="password" value={whatsappConfig.chatbotApiKey} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotApiKey: e.target.value})} placeholder="Key (falls back to global key if empty)" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  {whatsappConfig.chatbotProvider === 'openrouter' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">OpenRouter Model</label>
                      <input type="text" value={whatsappConfig.chatbotModel ?? ''} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotModel: e.target.value})} placeholder="e.g. google/gemini-2.0-flash-exp:free" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Store Policies & Additional Chatbot Instructions (Dynamic Knowledge)</label>
                    <textarea value={whatsappConfig.chatbotInstructions} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotInstructions: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white resize-none animate-in fade-in" placeholder="Provide extra store information like shipping details, rules, or faq answers to guide the chatbot." />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Branding Panel */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <Globe className="w-6 h-6 text-indigo-600" /> Branding
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Primary Button Color</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="color" 
                  value={localPrimaryColor} 
                  onChange={e => setLocalPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                />
                <input 
                  type="text" 
                  value={localPrimaryColor}
                  onChange={e => setLocalPrimaryColor(e.target.value)}
                  className="w-48 p-2 rounded-lg border border-slate-300 dark:border-slate-600 font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">This color will be used for main call-to-action buttons.</p>
            </div>
          </div>
        </div>

        {/* Sticky Buy Button Panel */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <ShoppingCart className="w-6 h-6 text-indigo-600" /> Sticky Buy Button
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <div>
                <label className="font-bold text-sm text-slate-700 dark:text-slate-300">Enable Sticky Buy Button</label>
                <p className="text-xs text-slate-500 mt-1">Shows a fixed bottom bar with buy button when users scroll past the main CTA.</p>
              </div>
              <button
                type="button"
                onClick={() => setStickyBuyEnabled(!stickyBuyEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${stickyBuyEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${stickyBuyEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Button Text</label>
              <input
                type="text"
                value={stickyBuyText}
                onChange={e => setStickyBuyText(e.target.value)}
                placeholder="Order Now"
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              />
              <p className="text-xs text-slate-500 mt-2">Text displayed on the sticky buy button.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Custom CSS</label>
              <textarea
                value={stickyBuyCss}
                onChange={e => setStickyBuyCss(e.target.value)}
                placeholder=".sh-sticky-bar { background: #000; }&#10;.sh-sticky-bar-price { color: #fff; }&#10;.sh-sticky-bar-button { background: #ff6600; }"
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
                spellCheck={false}
              />
              <p className="text-xs text-slate-500 mt-2">
                Available classes: <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar</code> (outer bar), 
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-inner</code> (inner row),
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-price</code> (price text),
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-compare</code> (compare price),
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-button</code> (buy button).
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50">
            <Save size={20} /> {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={() => {
          removeStore(deleteModal.storeId);
          addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Store Deleted', detail: `Store ${deleteModal.name} deleted` });
          notify('Store deleted successfully!', 'success');
        }}
        title="Delete Store?"
        message={`Are you sure you want to delete "${deleteModal.name}"? This will permanently remove all products and orders associated with this store.`}
        confirmText="Delete Store"
        variant="danger"
      />

      {isWebhookGuideOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800 dark:text-white">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="text-indigo-600" size={20} /> Webhook & Google Sheets Integration
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Connect your funnels to Google Sheets or custom integrations</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsWebhookGuideOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300">
              {/* Google Sheets Steps */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Google Sheets Setup Steps
                </h4>
                <ol className="list-decimal pl-5 space-y-2 text-xs font-semibold leading-relaxed">
                  <li>Create a new spreadsheet on <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google Sheets</a>.</li>
                  <li>Click <strong>Extensions</strong> &rarr; <strong>Apps Script</strong> from the top menu.</li>
                  <li>Delete any auto-generated code and paste the Apps Script template shown below.</li>
                  <li>Click the blue <strong>Deploy</strong> button &rarr; <strong>New deployment</strong>.</li>
                  <li>Click the cog icon and select <strong>Web app</strong>. Configure:
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-400">
                      <li><strong>Execute as:</strong> <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">Me</code></li>
                      <li><strong>Who has access:</strong> <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 text-indigo-500 rounded font-bold">Anyone</code> (required for incoming orders)</li>
                    </ul>
                  </li>
                  <li>Click <strong>Deploy</strong>, authorize permissions, and copy the generated <strong>Web app URL</strong>.</li>
                  <li>Paste the URL in the Google Sheets / Generic Webhook URL input field.</li>
                </ol>
              </div>

              {/* Apps Script Template */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Google Apps Script Code
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`// Google Sheets Webhook Script for COD-Hub
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var order = payload.order;
    var storeName = payload.storeName;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Order ID", 
        "Date", 
        "Store", 
        "Customer Name", 
        "Phone", 
        "Product", 
        "Total Price", 
        "Address", 
        "Wilaya/Commune", 
        "Status"
      ]);
    }
    
    // Append order info
    sheet.appendRow([
      order.id || "",
      order.createdAt || new Date().toISOString(),
      storeName || "",
      order.customer || "",
      order.phone || "",
      order.product || "",
      order.total || order.price || 0,
      order.address || "",
      (order.wilaya || "") + " " + (order.commune || ""),
      order.status || "PENDING"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "success": true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "success": false, "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`);
                      notify("Apps Script code copied to clipboard!", "success");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-black rounded-lg text-[10px] transition-all"
                  >
                    <Copy size={12} /> Copy Code
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-800">
{`// Google Sheets Webhook Script for COD-Hub
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var order = payload.order;
    var storeName = payload.storeName;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Order ID", 
        "Date", 
        "Store", 
        "Customer Name", 
        "Phone", 
        "Product", 
        "Total Price", 
        "Address", 
        "Wilaya/Commune", 
        "Status"
      ]);
    }
    
    // Append order info
    sheet.appendRow([
      order.id || "",
      order.createdAt || new Date().toISOString(),
      storeName || "",
      order.customer || "",
      order.phone || "",
      order.product || "",
      order.total || order.price || 0,
      order.address || "",
      (order.wilaya || "") + " " + (order.commune || ""),
      order.status || "PENDING"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "success": true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "success": false, "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                </pre>
              </div>

              {/* Generic Webhook Details */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Generic Webhooks (Make/Zapier)
                </h4>
                <p className="text-xs leading-relaxed text-slate-500 font-medium">
                  We will send a POST request with header <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-mono">Content-Type: application/json</code> containing this payload structure:
                </p>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto border border-slate-800">
{`{
  "order": {
    "id": "A4B7",
    "customer": "John Doe",
    "phone": "+1234567890",
    "address": "123 Street name",
    "wilaya": "Algiers",
    "commune": "Hydra",
    "product": "Premium Watch",
    "total": 5900,
    "status": "SELF_CONFIRMED"
  },
  "storeName": "Algeria Store"
}`}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsWebhookGuideOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black rounded-xl text-xs transition-all"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Guide Modal */}
      {isWhatsappGuideOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageCircle className="text-green-500" /> Meta WhatsApp Business API Setup
              </h3>
              <button onClick={() => setIsWhatsappGuideOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-8 text-slate-700">
              <section>
                <h4 className="font-bold text-slate-900 mb-2">1. Create a Meta Developer App</h4>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">Meta for Developers</a> and create an account.</li>
                  <li>Click <strong>Create App</strong> and select <strong>Other</strong> &rarr; <strong>Next</strong> &rarr; <strong>Business</strong>.</li>
                  <li>Enter an App name (e.g. "CODHUB WhatsApp") and select your Business Manager account, then click <strong>Create app</strong>.</li>
                </ol>
              </section>

              <section>
                <h4 className="font-bold text-slate-900 mb-2">2. Add the WhatsApp Product</h4>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>On your app dashboard, scroll down to <strong>WhatsApp</strong> and click <strong>Set up</strong>.</li>
                  <li>Follow the onboarding steps to link or create a new WhatsApp Business Account.</li>
                  <li>Go to <strong>WhatsApp &gt; API Setup</strong> in the left menu.</li>
                  <li>Here you will find your <strong>Phone Number ID</strong> and a <strong>Temporary Access Token</strong>. Paste them into the fields in the CODHUB settings.</li>
                </ol>
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm">
                  <strong>Note:</strong> To get a <strong>Permanent Access Token</strong> (so it doesn't expire in 24h), go to <strong>Business settings &gt; System Users</strong> in Meta Business Manager, create a System User, give it admin access to the WhatsApp app, and generate a token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
                </div>
              </section>

              <section>
                <h4 className="font-bold text-slate-900 mb-2">3. Setup Webhook (Optional but Recommended)</h4>
                <p className="text-sm mb-2">Webhooks allow CODHUB to know if your message was Delivered or Read.</p>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>Go to <strong>WhatsApp &gt; Configuration</strong> in the left menu.</li>
                  <li>Under Webhooks, click <strong>Edit</strong>.</li>
                  <li>Paste your Callback URL: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">https://your-domain.com/api/webhooks/whatsapp</code></li>
                  <li>Paste the Verify Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">codhub_meta_webhook_token</code></li>
                  <li>Click Verify and Save.</li>
                  <li>Click <strong>Manage</strong> below Webhook fields and subscribe to the <code>messages</code> field.</li>
                </ol>
              </section>

              <section>
                <h4 className="font-bold text-slate-900 mb-2">4. Add Templates</h4>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>In Meta WhatsApp Manager, go to <strong>Message Templates</strong>.</li>
                  <li>Create a new template for "Order Confirmation" and "Abandoned Cart".</li>
                  <li>Approve the templates and put their exact names in the CODHUB settings fields.</li>
                </ol>
              </section>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setIsWhatsappGuideOpen(false)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
