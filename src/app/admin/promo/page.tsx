'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Save, Eye, Copy, X, Plus, Trash2 } from 'lucide-react';
import { BlockBuilder } from '@/components/admin/promo/BlockBuilder';

export default function AdminPromoPage() {
  const { activeStore, landingPages, setLandingPages, products, addActivityLog } = useAdminStore();
  
  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';

  const storeProducts = products.filter(p => p.storeId === activeStore.id);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('flash-sale');
  const [originalSlug, setOriginalSlug] = useState('flash-sale');
  const [htmlContent, setHtmlContent] = useState(`<div class="bg-rose-600 text-white text-center py-2 font-bold">
  ⚡ FLASH SALE: 50% OFF
</div>
<div class="max-w-4xl mx-auto p-8 text-center">
  <h1 class="text-4xl font-black">Eliminate Back Pain</h1>
  <!-- Custom content goes here -->
</div>`);

  const [previewMode, setPreviewMode] = useState(false);
  const { notify } = useNotificationStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter out A/B Test virtual pages
  const storePages = landingPages.filter(p => p.storeId === activeStore.id && !p.htmlContent?.includes('"isAbTest":true'));
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const existingPage = selectedPageId 
    ? storePages.find(p => p.id === selectedPageId) 
    : storePages.find(p => p.slug === originalSlug);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLandingPages(prev => {
      const pageId = existingPage ? existingPage.id : 'promo_' + Date.now().toString();
      const updatedPage = {
        id: pageId,
        storeId: activeStore.id,
        title,
        slug,
        htmlContent,
        published: true
      };
      if (existingPage) {
        return prev.map(p => p.id === existingPage.id ? updatedPage : p);
      } else {
        return [...prev, updatedPage];
      }
    });
    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: existingPage ? 'Landing Page Updated' : 'Landing Page Created',
      detail: `${existingPage ? 'Updated' : 'Created'} landing page "${title}" (slug: /promo/${slug})`
    });
    setOriginalSlug(slug);
    setSelectedPageId(existingPage?.id || null);
    notify(`Landing Page saved! Slug: /${activeStore.region}/promo/${slug}`, "success");
  };

  const handleCopyUrl = () => {
    const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
    const baseUrl = isCustomDomain ? window.location.origin : (activeStore.customDomain ? `https://${activeStore.customDomain}` : `${window.location.origin}/${activeStore.region}`);
    const url = `${baseUrl}/promo/${slug}`;
    navigator.clipboard.writeText(url);
    notify('Live URL Copied!', 'success');
  };

  const handleDeletePage = () => {
    setIsDeleteModalOpen(true);
  };

  const loadExisting = (pageId: string) => {
    const page = storePages.find(p => p.id === pageId);
    if (page) {
      setTitle(page.title || '');
      setSlug(page.slug);
      setOriginalSlug(page.slug); 
      setHtmlContent(page.htmlContent);
      setSelectedPageId(page.id);
    }
  };

  const handleCreateNew = () => {
    const newSlug = `new-promo-${Date.now().toString().slice(-4)}`;
    const newContent = `<!-- Start fresh -->\n<div class="max-w-4xl mx-auto p-8 text-center">\n  <h1 class="text-4xl font-black">Your New Campaign</h1>\n</div>`;
    setTitle('New Campaign');
    setSlug(newSlug);
    setOriginalSlug(newSlug);
    setHtmlContent(newContent);
    setSelectedPageId(null);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 pb-12 items-start">
      
      {/* Sidebar for saved pages */}
      <div className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm md:sticky md:top-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Saved Pages</h3>
        <div className="space-y-2">
          {storePages.map(page => {
            return (
              <button 
                key={page.id} 
                onClick={() => loadExisting(page.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${selectedPageId === page.id || (slug === page.slug && !selectedPageId) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="truncate">{page.title || `/${page.slug}`}</div>
                <div className="text-xs text-slate-400 font-normal truncate flex justify-between">
                  <span>/{page.slug}</span>
                </div>
              </button>
            );
          })}
          {storePages.length === 0 && (
            <div className="text-xs text-slate-400 font-medium px-2">No pages saved yet.</div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Landing Page Builder</h1>
            <p className="text-slate-500 font-medium">Build standalone promo pages with HTML control and shortcodes for <span className="font-bold text-indigo-600">{activeStore.name}</span>.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-md">
              <Plus size={18} /> New Page
            </button>
            <button onClick={handleCopyUrl} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
              <Copy size={18} /> Copy URL
            </button>
            <button onClick={() => setPreviewMode(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl font-bold transition-colors">
              <Eye size={18} /> Preview
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Page Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900"
                placeholder="e.g. Summer Sale 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">URL Slug</label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-slate-300 border-r-0 px-4 py-3 rounded-l-xl text-slate-500 font-mono text-sm">
                  /{activeStore.region}/promo/
                </span>
                <input 
                  type="text" 
                  value={slug}
                  onChange={(e) => {
                    const formatted = e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, '');
                    setSlug(formatted);
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900"
                  placeholder="e.g. summer-sale"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-slate-700">Page Content (Block Builder)</label>
            </div>

            <BlockBuilder 
              initialHtml={htmlContent} 
              onChange={setHtmlContent} 
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            {existingPage ? (
              <button type="button" onClick={handleDeletePage} className="text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                <Trash2 size={20} /> Delete Page
              </button>
            ) : <div />}
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Save size={20} /> {existingPage ? 'Update Landing Page' : 'Publish Landing Page'}
            </button>
          </div>

        </form>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex flex-col">
          <div className="flex items-center justify-between p-4 bg-white/10 text-white shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="font-bold">Live Preview: /{activeStore.region}/promo/{slug}</h2>
              <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded font-bold">TAILWIND INJECTED (ISOLATED)</span>
            </div>
            <button onClick={() => setPreviewMode(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"><X size={24} /></button>
          </div>
          
          <div className="flex-1 bg-white overflow-hidden">
            <iframe 
              className="w-full h-full border-0"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <script src="https://cdn.tailwindcss.com"></script>
                  </head>
                  <body>
                    ${htmlContent.replace(/(?:\\[|&#91;|%5B)CHECKOUT_FORM(?:\\s*:\\s*[a-zA-Z0-9-]+)?(?:\\]|&#93;|%5D)/g, '<div class="max-w-2xl mx-auto my-12 p-12 bg-slate-100 border-2 border-dashed border-indigo-300 rounded-3xl text-center"><h3 class="text-2xl font-black text-indigo-900 mb-2">React Checkout Component Rendered Here</h3><p class="text-indigo-600 font-medium">When customers visit this page, the live multi-step checkout form will appear inside this box.</p></div>')}
                  </body>
                </html>
              `}
            />
          </div>
        </div>
      )}

    </div>

    <ConfirmModal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      onConfirm={() => {
        if (existingPage) {
          addActivityLog({
            storeId: activeStore.id,
            user: sessionUser,
            action: 'Landing Page Deleted',
            detail: `Deleted landing page "${existingPage.title}" (slug: /promo/${existingPage.slug})`
          });
        }
        setLandingPages(prev => prev.filter(p => p.id !== existingPage?.id));
        handleCreateNew();
        notify('Landing page deleted!', 'success');
      }}
      title="Delete Landing Page?"
      message={`Are you sure you want to delete "${title}"? This will permanently remove it from your store.`}
      confirmText="Delete Page"
      variant="danger"
    />
    </>
  );
}
