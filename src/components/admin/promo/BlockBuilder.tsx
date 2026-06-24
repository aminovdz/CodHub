'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, GripVertical, Settings } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';

export type BlockType = 'hero' | 'features' | 'image' | 'checkout' | 'raw' | 'social_proof' | 'button' | 'faq';

export interface Block {
  id: string;
  type: BlockType;
  content: any;
  settings?: {
    padding?: string;
    margin?: string;
    gap?: string;
  };
}

interface BlockBuilderProps {
  initialHtml: string;
  onChange: (html: string) => void;
}

const DEFAULT_BLOCKS: Record<BlockType, any> = {
  hero: {
    headline: 'Your Main Headline',
    subheadline: 'Supporting subheadline goes here.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    ctaText: 'Order Now',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-900'
  },
  features: {
    items: [
      { title: 'Feature 1', description: 'Why this matters.' },
      { title: 'Feature 2', description: 'Why this matters.' },
      { title: 'Feature 3', description: 'Why this matters.' }
    ],
    bgColor: 'bg-white',
    textColor: 'text-slate-900'
  },
  image: {
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    alt: 'Promo image'
  },
  checkout: {
    productId: ''
  },
  raw: {
    html: '<div>Custom HTML</div>'
  },
  social_proof: {
    reviews: [
      { name: 'Sarah M.', rating: 5, text: 'This product changed my life! Highly recommend.' },
      { name: 'Ahmed K.', rating: 5, text: 'Fast delivery and excellent quality.' }
    ],
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-900'
  },
  button: {
    text: 'Buy Now',
    color: 'bg-indigo-600',
    textColor: 'text-white',
    link: '#checkout'
  },
  faq: {
    items: [
      { question: 'Common Question 1?', answer: 'Answer goes here.' },
      { question: 'Common Question 2?', answer: 'Answer goes here.' }
    ],
    bgColor: 'bg-white',
    textColor: 'text-slate-900'
  }
};

function generateHtmlFromBlocks(blocks: Block[]): string {
  let html = '';
  
  blocks.forEach(block => {
    const spacingClasses = `${block.settings?.padding || ''} ${block.settings?.margin || ''}`.trim();
    
    switch (block.type) {
      case 'hero':
        html += `\n<!-- Block: Hero -->\n<div class="${spacingClasses || 'py-16'} text-center ${block.content.bgColor || 'bg-slate-50'}">\n  <h1 class="text-5xl font-black ${block.content.textColor || 'text-slate-900'} mb-4">${block.content.headline}</h1>\n  <p class="text-xl ${block.content.textColor ? block.content.textColor.replace('900', '600') : 'text-slate-600'} mb-8">${block.content.subheadline}</p>\n  ${block.content.imageUrl ? `<img src="${block.content.imageUrl}" alt="Hero" class="mx-auto rounded-3xl shadow-xl w-full max-w-2xl object-cover aspect-video">` : ''}\n</div>\n`;
        break;
      case 'features':
        html += `\n<!-- Block: Features -->\n<div class="${block.content.bgColor || 'bg-white'} ${block.content.textColor || 'text-slate-900'} grid grid-cols-1 md:grid-cols-3 ${block.settings?.gap || 'gap-6'} ${spacingClasses || 'py-12 px-4'}">\n${block.content.items.map((item: any) => `  <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100 text-center">\n    <h3 class="font-black text-lg mb-2">${item.title}</h3>\n    <p class="opacity-80 text-sm">${item.description}</p>\n  </div>`).join('\n')}\n</div>\n`;
        break;
      case 'image':
        html += `\n<!-- Block: Image -->\n<div class="max-w-4xl mx-auto ${spacingClasses || 'py-6 px-4'} text-center">\n  <img src="${block.content.url}" alt="${block.content.alt}" class="mx-auto rounded-3xl shadow-xl w-full max-w-2xl object-cover">\n</div>\n`;
        break;
      case 'checkout':
        html += `\n<!-- Block: Checkout -->\n<div id="checkout" class="${spacingClasses}"></div>\n<!-- Inline Checkout Form renders a live order form here -->\n[CHECKOUT_FORM:${block.content.productId || '[PRODUCT_ID]'}]\n`;
        break;
      case 'social_proof':
        html += `\n<!-- Block: Social Proof -->\n<div class="${spacingClasses || 'py-12 px-4'} ${block.content.bgColor || 'bg-slate-50'}">\n  <h2 class="text-3xl font-black text-center mb-8 ${block.content.textColor || 'text-slate-900'}">What Our Customers Say</h2>\n  <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 ${block.settings?.gap || 'gap-6'}">\n${block.content.reviews.map((r: any) => `    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">\n      <div class="text-amber-400 mb-2">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>\n      <p class="text-slate-700 italic mb-4">"${r.text}"</p>\n      <p class="font-bold text-slate-900">- ${r.name}</p>\n    </div>`).join('\n')}\n  </div>\n</div>\n`;
        break;
      case 'button':
        html += `\n<!-- Block: Button -->\n<div class="${spacingClasses || 'py-8'} text-center">\n  <a href="${block.content.link || '#checkout'}" class="inline-block px-8 py-4 ${block.content.color || 'bg-indigo-600'} ${block.content.textColor || 'text-white'} font-black text-lg rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">${block.content.text}</a>\n</div>\n`;
        break;
      case 'faq':
        html += `\n<!-- Block: FAQ -->\n<div class="${spacingClasses || 'py-12 px-4'} ${block.content.bgColor || 'bg-white'}">\n  <h2 class="text-3xl font-black text-center mb-8 ${block.content.textColor || 'text-slate-900'}">Frequently Asked Questions</h2>\n  <div class="max-w-3xl mx-auto space-y-4">\n${block.content.items.map((item: any) => `    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">\n      <h3 class="font-bold text-lg mb-2 text-slate-900">${item.question}</h3>\n      <p class="text-slate-600">${item.answer}</p>\n    </div>`).join('\n')}\n  </div>\n</div>\n`;
        break;
      case 'raw':
        html += `\n<!-- Block: Raw HTML -->\n<div class="${spacingClasses}">\n${block.content.html}\n</div>\n`;
        break;
    }
  });

  // Inject blocks data for future editing
  const encodedBlocks = btoa(encodeURIComponent(JSON.stringify(blocks)));
  html += `\n<!-- BLOCKS_DATA_V1:${encodedBlocks} -->\n`;

  return html;
}

function parseHtmlToBlocks(html: string): Block[] {
  const match = html.match(/<!-- BLOCKS_DATA_V1:(.*?) -->/);
  if (match && match[1]) {
    try {
      return JSON.parse(decodeURIComponent(atob(match[1])));
    } catch (e) {
      console.error("Failed to parse blocks data", e);
    }
  }
  
  // If no blocks data found but there is HTML, wrap it in a raw block
  if (html && html.trim() && !match) {
    return [{
      id: 'raw_' + Date.now(),
      type: 'raw',
      content: { html }
    }];
  }

  return [];
}

export function BlockBuilder({ initialHtml, onChange }: BlockBuilderProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const { products, activeStore } = useAdminStore();
  const storeProducts = products.filter(p => p.storeId === activeStore.id);

  // Initialize blocks on mount
  useEffect(() => {
    setBlocks(parseHtmlToBlocks(initialHtml));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]); // added initialHtml to deps so it updates on page change

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: type + '_' + Date.now(),
      type,
      content: JSON.parse(JSON.stringify(DEFAULT_BLOCKS[type]))
    };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    onChange(generateHtmlFromBlocks(newBlocks));
  };

  const updateBlock = (id: string, newContent: any, newSettings?: any) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, content: newContent, ...(newSettings ? { settings: newSettings } : {}) } : b);
    setBlocks(newBlocks);
    onChange(generateHtmlFromBlocks(newBlocks));
  };

  const removeBlock = (id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    setBlocks(newBlocks);
    onChange(generateHtmlFromBlocks(newBlocks));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    
    setBlocks(newBlocks);
    onChange(generateHtmlFromBlocks(newBlocks));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 p-4 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
        <div className="text-sm font-bold text-slate-500 py-2 mr-2">Add Block:</div>
        <button type="button" onClick={() => addBlock('hero')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Hero</button>
        <button type="button" onClick={() => addBlock('features')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Features</button>
        <button type="button" onClick={() => addBlock('image')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Image</button>
        <button type="button" onClick={() => addBlock('social_proof')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Social Proof</button>
        <button type="button" onClick={() => addBlock('button')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Button</button>
        <button type="button" onClick={() => addBlock('faq')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> FAQ</button>
        <button type="button" onClick={() => addBlock('checkout')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Checkout Form</button>
        <button type="button" onClick={() => addBlock('raw')} className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-sm hover:bg-indigo-50 text-indigo-700 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Raw HTML</button>
      </div>

      <div className="space-y-4">
        {blocks.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold">
            No blocks yet. Click above to add your first block.
          </div>
        )}
        {blocks.map((block, i) => (
          <div key={block.id} className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col group">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-slate-700 uppercase tracking-wider text-xs">
                <GripVertical size={16} className="text-slate-400" />
                {block.type} Block
              </div>
              <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => moveBlock(i, 'up')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30" disabled={i === 0}>
                  <ArrowUp size={16} />
                </button>
                <button type="button" onClick={() => moveBlock(i, 'down')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30" disabled={i === blocks.length - 1}>
                  <ArrowDown size={16} />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button type="button" onClick={() => removeBlock(block.id)} className="p-1.5 hover:bg-rose-100 text-rose-600 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="p-5">
              {block.type === 'hero' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Headline</label>
                    <input type="text" value={block.content.headline} onChange={e => updateBlock(block.id, { ...block.content, headline: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Subheadline</label>
                    <input type="text" value={block.content.subheadline} onChange={e => updateBlock(block.id, { ...block.content, subheadline: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Image URL</label>
                    <input type="text" value={block.content.imageUrl} onChange={e => updateBlock(block.id, { ...block.content, imageUrl: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Background Color</label>
                      <input type="text" value={block.content.bgColor || ''} placeholder="e.g. bg-slate-50" onChange={e => updateBlock(block.id, { ...block.content, bgColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Text Color</label>
                      <input type="text" value={block.content.textColor || ''} placeholder="e.g. text-slate-900" onChange={e => updateBlock(block.id, { ...block.content, textColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {block.type === 'features' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Background Color</label>
                      <input type="text" value={block.content.bgColor || ''} placeholder="e.g. bg-white" onChange={e => updateBlock(block.id, { ...block.content, bgColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Text Color</label>
                      <input type="text" value={block.content.textColor || ''} placeholder="e.g. text-slate-900" onChange={e => updateBlock(block.id, { ...block.content, textColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  {block.content.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                      <div className="flex-1 space-y-2">
                        <input type="text" value={item.title} placeholder="Title" onChange={e => {
                          const newItems = [...block.content.items];
                          newItems[idx].title = e.target.value;
                          updateBlock(block.id, { ...block.content, items: newItems });
                        }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                        <input type="text" value={item.description} placeholder="Description" onChange={e => {
                          const newItems = [...block.content.items];
                          newItems[idx].description = e.target.value;
                          updateBlock(block.id, { ...block.content, items: newItems });
                        }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <button type="button" onClick={() => {
                        const newItems = block.content.items.filter((_: any, i: number) => i !== idx);
                        updateBlock(block.id, { ...block.content, items: newItems });
                      }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    updateBlock(block.id, { ...block.content, items: [...block.content.items, { title: 'New Feature', description: 'Details' }] });
                  }} className="text-sm font-bold text-indigo-600 hover:text-indigo-800"><Plus size={16} className="inline mr-1"/> Add Feature</button>
                </div>
              )}

              {block.type === 'image' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Image URL</label>
                    <input type="text" value={block.content.url} onChange={e => updateBlock(block.id, { ...block.content, url: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Alt Text</label>
                    <input type="text" value={block.content.alt} onChange={e => updateBlock(block.id, { ...block.content, alt: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              )}

              {block.type === 'checkout' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Select Product</label>
                    <select 
                      value={block.content.productId} 
                      onChange={e => updateBlock(block.id, { ...block.content, productId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Choose Product --</option>
                      {storeProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {block.type === 'social_proof' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Background Color</label>
                      <input type="text" value={block.content.bgColor || ''} placeholder="e.g. bg-slate-50" onChange={e => updateBlock(block.id, { ...block.content, bgColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Text Color</label>
                      <input type="text" value={block.content.textColor || ''} placeholder="e.g. text-slate-900" onChange={e => updateBlock(block.id, { ...block.content, textColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  {block.content.reviews.map((review: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input type="text" value={review.name} placeholder="Customer Name" onChange={e => {
                            const newReviews = [...block.content.reviews];
                            newReviews[idx].name = e.target.value;
                            updateBlock(block.id, { ...block.content, reviews: newReviews });
                          }} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                          <input type="number" min="1" max="5" value={review.rating} placeholder="Rating (1-5)" onChange={e => {
                            const newReviews = [...block.content.reviews];
                            newReviews[idx].rating = parseInt(e.target.value) || 5;
                            updateBlock(block.id, { ...block.content, reviews: newReviews });
                          }} className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <input type="text" value={review.text} placeholder="Review text" onChange={e => {
                          const newReviews = [...block.content.reviews];
                          newReviews[idx].text = e.target.value;
                          updateBlock(block.id, { ...block.content, reviews: newReviews });
                        }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <button type="button" onClick={() => {
                        const newReviews = block.content.reviews.filter((_: any, i: number) => i !== idx);
                        updateBlock(block.id, { ...block.content, reviews: newReviews });
                      }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    updateBlock(block.id, { ...block.content, reviews: [...block.content.reviews, { name: 'New Customer', rating: 5, text: 'Great product!' }] });
                  }} className="text-sm font-bold text-indigo-600 hover:text-indigo-800"><Plus size={16} className="inline mr-1"/> Add Review</button>
                </div>
              )}

              {block.type === 'button' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Button Text</label>
                    <input type="text" value={block.content.text} onChange={e => updateBlock(block.id, { ...block.content, text: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Button Link</label>
                    <input type="text" value={block.content.link} placeholder="e.g. #checkout" onChange={e => updateBlock(block.id, { ...block.content, link: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Button Color</label>
                      <input type="text" value={block.content.color || ''} placeholder="e.g. bg-indigo-600" onChange={e => updateBlock(block.id, { ...block.content, color: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Text Color</label>
                      <input type="text" value={block.content.textColor || ''} placeholder="e.g. text-white" onChange={e => updateBlock(block.id, { ...block.content, textColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {block.type === 'faq' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Background Color</label>
                      <input type="text" value={block.content.bgColor || ''} placeholder="e.g. bg-white" onChange={e => updateBlock(block.id, { ...block.content, bgColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Text Color</label>
                      <input type="text" value={block.content.textColor || ''} placeholder="e.g. text-slate-900" onChange={e => updateBlock(block.id, { ...block.content, textColor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  {block.content.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                      <div className="flex-1 space-y-2">
                        <input type="text" value={item.question} placeholder="Question" onChange={e => {
                          const newItems = [...block.content.items];
                          newItems[idx].question = e.target.value;
                          updateBlock(block.id, { ...block.content, items: newItems });
                        }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                        <textarea value={item.answer} placeholder="Answer" onChange={e => {
                          const newItems = [...block.content.items];
                          newItems[idx].answer = e.target.value;
                          updateBlock(block.id, { ...block.content, items: newItems });
                        }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={2} />
                      </div>
                      <button type="button" onClick={() => {
                        const newItems = block.content.items.filter((_: any, i: number) => i !== idx);
                        updateBlock(block.id, { ...block.content, items: newItems });
                      }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    updateBlock(block.id, { ...block.content, items: [...block.content.items, { question: 'New Question', answer: 'Answer here' }] });
                  }} className="text-sm font-bold text-indigo-600 hover:text-indigo-800"><Plus size={16} className="inline mr-1"/> Add FAQ Item</button>
                </div>
              )}

              {block.type === 'raw' && (
                <div>
                  <textarea 
                    value={block.content.html} 
                    onChange={e => updateBlock(block.id, { ...block.content, html: e.target.value })} 
                    className="w-full h-40 bg-slate-900 text-emerald-400 font-mono text-sm p-4 rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Spacing & Layout Settings */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Settings size={14} className="text-slate-400" />
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Spacing & Layout</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Padding (e.g. py-16 px-4)</label>
                    <input type="text" value={block.settings?.padding || ''} placeholder="Default padding" 
                      onChange={e => updateBlock(block.id, block.content, { ...block.settings, padding: e.target.value })} 
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Margin (e.g. my-8 mx-auto)</label>
                    <input type="text" value={block.settings?.margin || ''} placeholder="Default margin" 
                      onChange={e => updateBlock(block.id, block.content, { ...block.settings, margin: e.target.value })} 
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Gap (if grid, e.g. gap-6)</label>
                    <input type="text" value={block.settings?.gap || ''} placeholder="Default gap" 
                      onChange={e => updateBlock(block.id, block.content, { ...block.settings, gap: e.target.value })} 
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
