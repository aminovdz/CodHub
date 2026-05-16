'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, HomepageConfig, HomepageBlock } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { Save, PlusSquare, Trash2, AlignLeft, LayoutTemplate, Package, GripVertical, Star, Globe, Layout, Code, FileText } from 'lucide-react';
import { PREDEFINED_KEYS } from '@/lib/translations';

export default function AdminHomepageEditor() {
  const { activeStore, products, homepages, setHomepages, categories, updateStore } = useAdminStore();
  const storeProducts = products.filter(p => p.storeId === activeStore.id);
  
  const [activeTab, setActiveTab] = useState<'blocks' | 'footer' | 'translations' | 'pixels'>('blocks');
  const [isSaving, setIsSaving] = useState(false);
  const { notify } = useNotificationStore();

  // Blocks State
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  
  // Footer State
  const [footer, setFooter] = useState({
    aboutText: '',
    contactEmail: '',
    contactPhone: '',
    socialLinks: [] as {platform: string, url: string}[],
    storeLinks: [] as {label: string, url: string}[],
    legalLinks: [] as {label: string, url: string}[]
  });

  // Translations State
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // Analytics State
  const [analytics, setAnalytics] = useState({
    google: '',
    facebook: '',
    tiktok: '',
    snapchat: '',
    pinterest: ''
  });

  useEffect(() => {
    // Load Homepage config
    const config = homepages.find(h => h.storeId === activeStore.id);
    if (config) {
      setBlocks(config.blocks || []);
      if (config.footer) {
        setFooter({
          ...config.footer,
          storeLinks: config.footer.storeLinks || [],
          legalLinks: config.footer.legalLinks || [],
          socialLinks: config.footer.socialLinks || []
        });
      }
    } else {
      setBlocks([
        { id: 'b_hero', type: 'hero', content: '{"title":"Welcome to our Premium Store", "subtitle":"Discover the best products handpicked for you."}' },
        { id: 'b_grid', type: 'product_grid', content: '', productIds: [] }
      ]);
    }

    // Load Analytics from Store
    setAnalytics({
      google: activeStore.analytics?.google || '',
      facebook: activeStore.analytics?.facebook || '',
      tiktok: activeStore.analytics?.tiktok || '',
      snapchat: activeStore.analytics?.snapchat || '',
      pinterest: activeStore.analytics?.pinterest || ''
    });
  }, [activeStore.id, homepages, activeStore.analytics]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Save Homepage Config
    setHomepages(prev => {
      const exists = prev.find(h => h.storeId === activeStore.id);
      const newConfig = { storeId: activeStore.id, blocks, footer };
      if (exists) {
        return prev.map(h => h.storeId === activeStore.id ? newConfig : h);
      }
      return [...prev, newConfig];
    });

    // Save Analytics to Store
    await updateStore(activeStore.id, { 
      analytics 
    });

    setIsSaving(false);
    notify('Storefront Configuration Saved successfully!', 'success');
  };

  // --- Block Handlers ---
  const addBlock = (type: 'hero' | 'text' | 'html' | 'product_grid' | 'category_grid' | 'features') => {
    const newBlock: HomepageBlock = {
      id: 'block_' + Date.now(),
      type,
      content: type === 'hero' ? '{"title":"New Hero Title", "subtitle":"Subheadline here"}' : '',
      productIds: type === 'product_grid' ? [] : undefined,
      categoryIds: type === 'category_grid' ? [] : undefined,
      features: type === 'features' ? [
        { title: 'Free Shipping', description: 'On all orders today', icon: 'Truck' },
        { title: 'Quality Guarantee', description: '100% satisfaction', icon: 'Shield' }
      ] : undefined
    };
    setBlocks([...blocks, newBlock]);
  };
  const removeBlock = (id: string) => setBlocks(blocks.filter(b => b.id !== id));
  const updateBlockContent = (id: string, content: string) => setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  const toggleProductInGrid = (blockId: string, productId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId || b.type !== 'product_grid') return b;
      const ids = b.productIds || [];
      return { ...b, productIds: ids.includes(productId) ? ids.filter(i => i !== productId) : [...ids, productId] };
    }));
  };
  const toggleCategoryInGrid = (blockId: string, category: string) => {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId || b.type !== 'category_grid') return b;
      const ids = b.categoryIds || [];
      return { ...b, categoryIds: ids.includes(category) ? ids.filter(c => c !== category) : [...ids, category] };
    }));
  };
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[swapIndex];
    newBlocks[swapIndex] = temp;
    setBlocks(newBlocks);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Storefront Editor</h1>
          <p className="text-slate-500 font-medium mt-1">Configure layout, translations, and tracking for <span className="font-bold text-indigo-600">{activeStore.name}</span>.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50">
          <Save size={20} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab('blocks')} className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'blocks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <LayoutTemplate size={18} /> Homepage Builder
        </button>
        <button onClick={() => setActiveTab('footer')} className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'footer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Layout size={18} /> Footer
        </button>
        <button onClick={() => setActiveTab('pixels')} className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'pixels' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Globe size={18} /> Tracking Pixels
        </button>
      </div>

      <div className="mt-8">
        {/* ================= BLOCKS TAB ================= */}
        {activeTab === 'blocks' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mr-2">Add Block:</span>
              <button onClick={() => addBlock('hero')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"><LayoutTemplate size={14} className="text-indigo-500" /> Hero</button>
              <button onClick={() => addBlock('product_grid')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"><Package size={14} className="text-emerald-500" /> Products</button>
              <button onClick={() => addBlock('category_grid')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"><AlignLeft size={14} className="text-blue-500" /> Categories</button>
              <button onClick={() => addBlock('features')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"><Star size={14} className="text-amber-500" /> Features</button>
              <button onClick={() => addBlock('text')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"><FileText size={14} className="text-slate-500" /> Text</button>
              <button onClick={() => addBlock('html')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-bold text-white hover:bg-slate-800"><Code size={14} className="text-emerald-400" /> HTML</button>
            </div>

            {blocks.map((block, index) => {
              let heroData = { title: '', subtitle: '' };
              if (block.type === 'hero') { try { heroData = JSON.parse(block.content); } catch (e) {} }

              return (
                <div key={block.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative flex gap-4">
                  {/* Order Controls */}
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <button type="button" onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><GripVertical size={16} className="rotate-90" /></button>
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black">{index + 1}</div>
                    <button type="button" onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><GripVertical size={16} className="rotate-90" /></button>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between mb-4">
                      <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
                        {block.type === 'hero' && <><LayoutTemplate size={16} className="text-indigo-500"/> Hero Banner Block</>}
                        {block.type === 'product_grid' && <><Package size={16} className="text-emerald-500"/> Products Grid</>}
                        {block.type === 'category_grid' && <><AlignLeft size={16} className="text-blue-500"/> Category Grid</>}
                        {block.type === 'features' && <><Star size={16} className="text-amber-500"/> Features Block</>}
                        {block.type === 'text' && <><FileText size={16} className="text-slate-500"/> Text Content Block</>}
                        {block.type === 'html' && <><Code size={16} className="text-emerald-500"/> Custom HTML Block</>}
                      </h3>
                      <button type="button" onClick={() => removeBlock(block.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={18} /></button>
                    </div>

                    {/* Editor Implementations */}
                    {block.type === 'hero' && (
                      <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Headline</label><input type="text" value={heroData.title} onChange={e => updateBlockContent(block.id, JSON.stringify({ ...heroData, title: e.target.value }))} className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Subheadline</label><textarea value={heroData.subtitle} onChange={e => updateBlockContent(block.id, JSON.stringify({ ...heroData, subtitle: e.target.value }))} rows={2} className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" /></div>
                      </div>
                    )}

                    {block.type === 'product_grid' && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-3 border-b border-slate-200 text-xs font-bold text-slate-500">Select Products</div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                          {storeProducts.map(p => (
                            <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${block.productIds?.includes(p.id) ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={block.productIds?.includes(p.id)} onChange={() => toggleProductInGrid(block.id, p.id)} className="w-4 h-4 text-indigo-600" />
                              <div className="flex-1 font-bold text-sm text-slate-900 truncate">{p.title}</div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {block.type === 'category_grid' && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-3 border-b border-slate-200 text-xs font-bold text-slate-500">Select Categories</div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                          {categories.map(c => (
                            <label key={c} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${block.categoryIds?.includes(c) ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={block.categoryIds?.includes(c)} onChange={() => toggleCategoryInGrid(block.id, c)} className="w-4 h-4 text-indigo-600" />
                              <div className="flex-1 font-bold text-sm text-slate-900 truncate">{c}</div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {block.type === 'features' && (
                      <div className="space-y-4">
                        {(block.features || []).map((f, i) => (
                          <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex-1 space-y-3">
                              <input type="text" value={f.title} onChange={e => { const newF = [...(block.features || [])]; newF[i].title = e.target.value; setBlocks(blocks.map(b => b.id === block.id ? { ...b, features: newF } : b)); }} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold" placeholder="Feature Title" />
                              <input type="text" value={f.description} onChange={e => { const newF = [...(block.features || [])]; newF[i].description = e.target.value; setBlocks(blocks.map(b => b.id === block.id ? { ...b, features: newF } : b)); }} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Short description" />
                            </div>
                            <button type="button" onClick={() => { const newF = (block.features || []).filter((_, idx) => idx !== i); setBlocks(blocks.map(b => b.id === block.id ? { ...b, features: newF } : b)); }} className="text-rose-500 p-2"><Trash2 size={16} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => { const newF = [...(block.features || []), { title: 'New Feature', description: 'Description', icon: 'Star' }]; setBlocks(blocks.map(b => b.id === block.id ? { ...b, features: newF } : b)); }} className="text-sm font-bold text-indigo-600 flex items-center gap-1"><PlusSquare size={16} /> Add Feature</button>
                      </div>
                    )}

                    {block.type === 'text' && <textarea value={block.content} onChange={e => updateBlockContent(block.id, e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 resize-y" />}
                    {block.type === 'html' && <textarea value={block.content} onChange={e => updateBlockContent(block.id, e.target.value)} rows={6} className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-indigo-600 resize-y" spellCheck={false} />}
                  </div>
                </div>
              );
            })}
            {blocks.length === 0 && <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-300 text-slate-500 font-medium">Empty homepage. Add a block above.</div>}
          </div>
        )}

        {/* ================= FOOTER TAB ================= */}
        {activeTab === 'footer' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Footer Settings</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">About Text</label><textarea value={footer.aboutText} onChange={e => setFooter({...footer, aboutText: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Contact Email</label><input type="email" value={footer.contactEmail} onChange={e => setFooter({...footer, contactEmail: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Contact Phone</label><input type="text" value={footer.contactPhone} onChange={e => setFooter({...footer, contactPhone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" /></div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">Store Links</label>
                    <button type="button" onClick={() => setFooter({...footer, storeLinks: [...(footer.storeLinks || []), {label: '', url: ''}]})} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"><PlusSquare size={12}/> Add</button>
                  </div>
                  <div className="space-y-2">
                    {(footer.storeLinks || []).map((l, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="text" placeholder="Label" value={l.label} onChange={e => {const n=[...footer.storeLinks]; n[i].label=e.target.value; setFooter({...footer, storeLinks:n})}} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"/>
                        <input type="text" placeholder="URL" value={l.url} onChange={e => {const n=[...footer.storeLinks]; n[i].url=e.target.value; setFooter({...footer, storeLinks:n})}} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"/>
                        <button type="button" onClick={() => setFooter({...footer, storeLinks: footer.storeLinks.filter((_, idx) => idx !== i)})} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {(footer.storeLinks || []).length === 0 && <p className="text-xs text-slate-400 font-medium">No store links added yet.</p>}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">Legal Links</label>
                    <button type="button" onClick={() => setFooter({...footer, legalLinks: [...(footer.legalLinks || []), {label: '', url: ''}]})} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"><PlusSquare size={12}/> Add</button>
                  </div>
                  <div className="space-y-2">
                    {(footer.legalLinks || []).map((l, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="text" placeholder="Label" value={l.label} onChange={e => {const n=[...footer.legalLinks]; n[i].label=e.target.value; setFooter({...footer, legalLinks:n})}} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"/>
                        <input type="text" placeholder="URL" value={l.url} onChange={e => {const n=[...footer.legalLinks]; n[i].url=e.target.value; setFooter({...footer, legalLinks:n})}} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"/>
                        <button type="button" onClick={() => setFooter({...footer, legalLinks: footer.legalLinks.filter((_, idx) => idx !== i)})} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {(footer.legalLinks || []).length === 0 && <p className="text-xs text-slate-400 font-medium">No legal links added yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* ================= PIXELS TAB ================= */}
        {activeTab === 'pixels' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Tracking Pixels</h2>
              <p className="text-sm text-slate-500">Add your pixel IDs here. We will automatically inject the required scripts into your storefront.</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Google Analytics ID</label>
                <input type="text" placeholder="G-XXXXXXXXXX" value={analytics.google} onChange={e => setAnalytics({...analytics, google: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Facebook Pixel ID</label>
                <input type="text" placeholder="123456789012345" value={analytics.facebook} onChange={e => setAnalytics({...analytics, facebook: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">TikTok Pixel ID</label>
                <input type="text" placeholder="CXXXXXXX..." value={analytics.tiktok} onChange={e => setAnalytics({...analytics, tiktok: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Snapchat Pixel ID</label>
                <input type="text" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" value={analytics.snapchat} onChange={e => setAnalytics({...analytics, snapchat: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Pinterest Tag ID</label>
                <input type="text" placeholder="261..." value={analytics.pinterest} onChange={e => setAnalytics({...analytics, pinterest: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
