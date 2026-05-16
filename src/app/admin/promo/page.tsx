'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Save, LayoutTemplate, Eye, PlusSquare, Image as ImageIcon, ShoppingCart, AlignLeft, Copy, X, Plus, Trash2, Sparkles } from 'lucide-react';

export default function AdminPromoPage() {
  const { activeStore, landingPages, setLandingPages, products } = useAdminStore();
  const storeProducts = products.filter(p => p.storeId === activeStore.id);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('flash-sale');
  const [htmlContent, setHtmlContent] = useState(`<div class="bg-rose-600 text-white text-center py-2 font-bold">
  ⚡ FLASH SALE: 50% OFF
</div>
<div class="max-w-4xl mx-auto p-8 text-center">
  <h1 class="text-4xl font-black">Eliminate Back Pain</h1>
  <!-- Custom content goes here -->
</div>`);

  const [previewMode, setPreviewMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { notify } = useNotificationStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleAIGenerate = async () => {
    if (!selectedProduct) {
      notify("Please select a product from the dropdown first to generate a landing page for it.", "warning");
      return;
    }
    const prod = storeProducts.find(p => p.id === selectedProduct);
    if (!prod) return;
    
    setIsGenerating(true);
    try {
      const { aiService } = await import('@/lib/services/aiService');
      const html = await aiService.generateLandingPage(prod.title, activeStore.region);
      if (html) {
        setHtmlContent(html);
        setTitle(`Promo: ${prod.title}`);
      } else {
        notify("Failed to generate AI landing page.", "error");
      }
    } catch (e) {
      console.error(e);
      notify("Error calling AI.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const existingPage = landingPages.find(p => p.storeId === activeStore.id && p.slug === slug);

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
        return prev.map(p => p.id === pageId ? updatedPage : p);
      } else {
        return [...prev, updatedPage];
      }
    });
    notify(`Landing Page saved to store! Slug: /${activeStore.region}/promo/${slug}`, "success");
  };

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/${activeStore.region}/promo/${slug}`;
    navigator.clipboard.writeText(url);
    notify('Live URL Copied!', 'success');
  };

  const handleDeletePage = () => {
    setIsDeleteModalOpen(true);
  };

  const loadExisting = (existingSlug: string) => {
    const page = landingPages.find(p => p.storeId === activeStore.id && p.slug === existingSlug);
    if (page) {
      setTitle(page.title || '');
      setSlug(page.slug);
      setHtmlContent(page.htmlContent);
    }
  };

  const handleCreateNew = () => {
    const newSlug = `new-promo-${Date.now().toString().slice(-4)}`;
    const newContent = `<!-- Start fresh -->\n<div class="max-w-4xl mx-auto p-8 text-center">\n  <h1 class="text-4xl font-black">Your New Campaign</h1>\n</div>`;
    setTitle('New Campaign');
    setSlug(newSlug);
    setHtmlContent(newContent);
    // Removed auto-save so delete doesn't instantly recreate a page
  };

  const injectSection = (type: 'hero' | 'features' | 'form' | 'checkout') => {
    let block = '';
    if (type === 'hero') {
      block = `\n<!-- Hero Section -->\n<div class="py-16 text-center bg-slate-50">\n  <h1 class="text-5xl font-black text-slate-900 mb-4">Your Main Headline</h1>\n  <p class="text-xl text-slate-600 mb-8">Supporting subheadline goes here to drive interest.</p>\n  <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800" alt="Hero" class="mx-auto rounded-3xl shadow-xl w-full max-w-2xl object-cover aspect-video">\n</div>\n`;
    } else if (type === 'features') {
      block = `\n<!-- Features Grid -->\n<div class="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 px-4">\n  <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">\n    <h3 class="font-black text-lg mb-2">Benefit 1</h3>\n    <p class="text-slate-500 text-sm">Explain why this feature matters to the customer.</p>\n  </div>\n  <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">\n    <h3 class="font-black text-lg mb-2">Benefit 2</h3>\n    <p class="text-slate-500 text-sm">Explain why this feature matters to the customer.</p>\n  </div>\n  <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">\n    <h3 class="font-black text-lg mb-2">Benefit 3</h3>\n    <p class="text-slate-500 text-sm">Explain why this feature matters to the customer.</p>\n  </div>\n</div>\n`;
    } else if (type === 'form') {
      // Inline checkout form shortcode — rendered as a real React component on the live page
      const productIdParam = selectedProduct || '[PRODUCT_ID]';
      const prod = selectedProduct ? storeProducts.find(p => p.id === selectedProduct) : null;
      block = `\n<!-- Inline Checkout Form: [CHECKOUT_FORM:${productIdParam}] renders a live order form here -->\n[CHECKOUT_FORM:${productIdParam}]\n<!-- Product: ${prod ? prod.title : 'Select a product from the dropdown first'} -->\n`;
    } else if (type === 'checkout') {
      const prod = selectedProduct ? storeProducts.find(p => p.id === selectedProduct) : null;
      const productIdParam = selectedProduct ? selectedProduct : '[PRODUCT_ID]';
      const productLabel = prod ? prod.title : 'Selected Product';
      // Generate a real HTML button linking directly to checkout with the product ID
      block = `\n<!-- Order Button: links directly to checkout (bypasses product page) -->\n<div class="max-w-xl mx-auto py-10 px-4 text-center">\n  <a href="/${activeStore.region}/checkout?product=${productIdParam}" class="inline-flex items-center justify-center gap-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-2xl py-6 px-12 rounded-2xl shadow-[0_8px_30px_rgb(79,70,229,0.3)] transition-all" style="text-decoration:none;display:block;border-radius:16px;background:#4f46e5;color:#fff;font-weight:900;font-size:1.5rem;padding:24px 48px;text-align:center;">\n    🛒 Order Now — Pay on Delivery\n  </a>\n  <p style="margin-top:12px;font-size:13px;font-weight:700;color:#94a3b8;letter-spacing:0.08em;">${prod ? `Product: ${productLabel}` : 'Select a product from the dropdown first'}</p>\n</div>\n`;
    }
    setHtmlContent(prev => prev + block);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 pb-12 items-start">
      
      {/* Sidebar for saved pages */}
      <div className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm md:sticky md:top-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Saved Pages</h3>
        <div className="space-y-2">
          {landingPages.filter(p => p.storeId === activeStore.id).map(page => (
            <button 
              key={page.id} 
              onClick={() => loadExisting(page.slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${slug === page.slug ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="truncate">{page.title || `/${page.slug}`}</div>
              {page.title && <div className="text-xs text-slate-400 font-normal truncate">/{page.slug}</div>}
            </button>
          ))}
          {landingPages.filter(p => p.storeId === activeStore.id).length === 0 && (
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
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900"
                  placeholder="e.g. summer-sale"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-slate-700">Raw HTML Content</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleAIGenerate} disabled={isGenerating} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50">
                  <Sparkles size={14} className={isGenerating ? "animate-pulse" : ""} /> {isGenerating ? 'AI is building page...' : '✨ Auto-Generate Page'}
                </button>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg flex items-center gap-1">
                  <LayoutTemplate size={14} /> Tailwind CSS Supported
                </span>
              </div>
            </div>

            {/* Section Injector Toolbar */}
            <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider w-full mb-1">Inject Sections</div>
              <button type="button" onClick={() => injectSection('hero')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm">
                <ImageIcon size={16} className="text-indigo-500" /> Hero Section
              </button>
              <button type="button" onClick={() => injectSection('features')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm">
                <AlignLeft size={16} className="text-emerald-500" /> Features Grid
              </button>
              <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedProduct} 
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="px-2 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Default Product</option>
                  {storeProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <button type="button" onClick={() => injectSection('checkout')} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-black hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                  <PlusSquare size={16} /> Inject Order Button
                </button>
                <button type="button" onClick={() => injectSection('form')} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-black hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200">
                  <PlusSquare size={16} /> Inject Full Form
                </button>
              </div>
            </div>
            
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
              <span className="text-amber-500 mt-0.5">💡</span>
              <div className="text-sm font-medium text-amber-800 space-y-1">
                <strong className="block font-bold text-amber-900">Two ways to add a purchase option:</strong>
                <p>🔵 <strong>Inject Order Button</strong> — generates a styled link/button that redirects customer to the full checkout page.</p>
                <p>🟢 <strong>Inject Full Form</strong> — embeds a complete Name/Phone/Wilaya order form directly on this page. Customer orders without leaving.</p>
                <p className="text-amber-600 text-xs">Both require selecting a product from the dropdown first.</p>
              </div>
            </div>
            
            <textarea 
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full h-[600px] p-4 bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-y leading-relaxed"
              spellCheck={false}
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
              <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded font-bold">TAILWIND INJECTED</span>
            </div>
            <button onClick={() => setPreviewMode(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"><X size={24} /></button>
          </div>
          
          <div className="flex-1 bg-white overflow-y-auto">
            <div 
              className="min-h-full"
              dangerouslySetInnerHTML={{ 
                // We replace [CHECKOUT_FORM] with a visual placeholder for the preview
                __html: htmlContent.replace(/\[CHECKOUT_FORM\]/g, '<div class="max-w-2xl mx-auto my-12 p-12 bg-slate-100 border-2 border-dashed border-indigo-300 rounded-3xl text-center"><h3 class="text-2xl font-black text-indigo-900 mb-2">React Checkout Component Rendered Here</h3><p class="text-indigo-600 font-medium">When customers visit this page, the live multi-step checkout form will appear inside this box.</p></div>') 
              }} 
            />
          </div>
        </div>
      )}
    </div>

    <ConfirmModal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      onConfirm={() => {
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
