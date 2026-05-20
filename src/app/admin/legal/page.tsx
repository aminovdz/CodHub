'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, LegalPage } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Save, FileText, Plus } from 'lucide-react';

export default function AdminLegalPage() {
  const { activeStore, legalPages, setLegalPages, addActivityLog } = useAdminStore();
  const storePagesRaw = legalPages.filter(p => p.storeId === activeStore.id);
  // Strictly deduplicate by slug to prevent React StrictMode duplicates
  const storePages = Array.from(new Map(storePagesRaw.map(p => [p.slug, p])).values());

  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';
  
  const [selectedSlug, setSelectedSlug] = useState('privacy-policy');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('<h1>Privacy Policy</h1>\n<p>Enter your HTML here...</p>');
  const { notify } = useNotificationStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Initialize default pages if empty
  useEffect(() => {
    setLegalPages(prev => {
      // Prevent double-creation by checking if this store already has any pages
      if (prev.some(p => p.storeId === activeStore.id)) return prev;
      
      return [
        ...prev,
        { id: `legal_${Date.now()}_1`, storeId: activeStore.id, slug: 'privacy-policy', htmlContent: '<h1>Privacy Policy</h1><p>Update this content.</p>' },
        { id: `legal_${Date.now()}_2`, storeId: activeStore.id, slug: 'terms-of-service', htmlContent: '<h1>Terms of Service</h1><p>Update this content.</p>' },
        { id: `legal_${Date.now()}_3`, storeId: activeStore.id, slug: 'refund-policy', htmlContent: '<h1>Refund Policy</h1><p>Update this content.</p>' },
      ];
    });
  }, [activeStore.id, setLegalPages]);

  useEffect(() => {
    const page = storePages.find(p => p.slug === selectedSlug);
    if (page) {
      setTitle(page.title || '');
      setContent(page.htmlContent);
    }
  }, [selectedSlug, storePages]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLegalPages(prev => {
      const filtered = prev.filter(p => !(p.storeId === activeStore.id && p.slug === selectedSlug));
      return [...filtered, { 
        id: 'legal_' + Date.now(), 
        storeId: activeStore.id, 
        title,
        slug: selectedSlug, 
        htmlContent: content 
      }];
    });
    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: 'Legal Page Saved',
      detail: `Saved policy page "${title || selectedSlug}" (slug: /legal/${selectedSlug})`
    });
    notify(`Saved ${selectedSlug} for ${activeStore.name}!`, "success");
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleCreateNewPage = () => {
    // We'll use a simple new page template instead of prompt
    const newTitle = 'New Legal Page';
    const formattedSlug = 'new-legal-page-' + Date.now().toString().slice(-4);
    const newContent = `<h1>${newTitle}</h1>\n<p>Start writing your custom policy here...</p>`;
    setSelectedSlug(formattedSlug);
    setTitle(newTitle);
    setContent(newContent);
    notify('Blank page created. Please edit the title and slug.', 'info');
  };

  return (
    <>
      <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Legal Pages Manager</h1>
          <p className="text-slate-500 font-medium">Edit policies for <span className="font-bold text-indigo-600">{activeStore.name}</span> using HTML/Markdown.</p>
        </div>
        <button onClick={handleCreateNewPage} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-md">
          <Plus size={18} /> Blank Page
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Selector */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Store Policies</div>
          <div className="space-y-1">
            {storePages.map(page => (
              <button 
                key={page.id}
                type="button"
                onClick={() => setSelectedSlug(page.slug)}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
                  selectedSlug === page.slug 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText size={16} className="shrink-0" />
                <span className="truncate">{page.title || page.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <form onSubmit={handleSave} className="flex-1 p-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">Editing: /{activeStore.region}/legal/{selectedSlug}</h2>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/${activeStore.region}/legal/${selectedSlug}`;
                  navigator.clipboard.writeText(url);
                  notify('Legal page URL copied!', 'success');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
              >
                Copy Link
              </button>
              <a 
                href={`/${activeStore.region}/legal/${selectedSlug}`} 
                target="_blank" 
                rel="noreferrer"
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors"
              >
                Preview Live
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Page Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900"
                placeholder="e.g. Privacy Policy"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">URL Slug</label>
              <input 
                type="text" 
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none font-mono text-sm text-slate-500"
                placeholder="e.g. privacy-policy"
              />
            </div>
          </div>

          <div className="flex-1 min-h-[500px]">
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder="<h1>Your Title</h1>\n<p>Your content here...</p>"
              spellCheck={false}
            />
          </div>

          <div className="mt-6 flex justify-between shrink-0">
            {selectedSlug ? (
              <button type="button" onClick={handleDelete} className="text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl font-bold transition-colors">
                Delete
              </button>
            ) : <div />}
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Save size={20} /> Save Page
            </button>
          </div>
        </form>

      </div>
    </div>

    <ConfirmModal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      onConfirm={() => {
        addActivityLog({
          storeId: activeStore.id,
          user: sessionUser,
          action: 'Legal Page Deleted',
          detail: `Deleted legal page "${title || selectedSlug}" (slug: /legal/${selectedSlug})`
        });
        setLegalPages(prev => prev.filter(p => !(p.storeId === activeStore.id && p.slug === selectedSlug)));
        setSelectedSlug('privacy-policy');
        notify('Legal page deleted successfully!', 'success');
      }}
      title="Delete Legal Page?"
      message={`Are you sure you want to delete "${title || selectedSlug}"? This action cannot be undone.`}
      confirmText="Delete Page"
      variant="danger"
    />
    </>
  );
}
