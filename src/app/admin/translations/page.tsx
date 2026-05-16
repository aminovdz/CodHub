'use client';

import { useState, useEffect } from 'react';
import { Save, Globe } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { PREDEFINED_KEYS, DEFAULT_TRANSLATIONS } from '@/lib/translations';

export default function AdminTranslationsPage() {
  const { activeStore, updateStore } = useAdminStore();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { notify } = useNotificationStore();

  useEffect(() => {
    setTranslations(activeStore.translations || {});
  }, [activeStore.id, activeStore.translations]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateStore(activeStore.id, { translations });
    setIsSaving(false);
    notify('Translations saved successfully!', 'success');
  };

  const getTranslationGroups = () => {
    const groups = Array.from(new Set(PREDEFINED_KEYS.map(k => k.group)));
    return groups;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Globe className="text-indigo-600" size={32} /> Translations Editor
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Override the hardcoded text for <span className="font-bold text-indigo-600">{activeStore.name}</span>.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
        >
          <Save size={20} /> {isSaving ? 'Saving...' : 'Save Translations'}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Store Dictionary</h2>
            <p className="text-sm text-slate-500">
              Base language: <span className="uppercase font-bold">{activeStore.language || 'en'}</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={() => {
              if(confirm('Are you sure you want to reset to default translations? All custom changes will be lost.')) {
                const defaults = (DEFAULT_TRANSLATIONS as any)[activeStore.language || 'en'] || {};
                setTranslations(defaults);
                notify('Reset to defaults. Please save to apply changes.', 'success');
              }
            }}
            className="text-xs font-bold px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
        
        <div className="p-6">
          {getTranslationGroups().map((group) => (
            <div key={group} className="mb-10 last:mb-0">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm mb-4 pb-2 border-b-2 border-slate-100 text-indigo-600">
                {group}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PREDEFINED_KEYS.filter(k => k.group === group).map(({ key, default: def }) => {
                  const defaultLangValue = ((DEFAULT_TRANSLATIONS as any)[activeStore.language || 'en'] || {})[key] || def;
                  return (
                    <div key={key} className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                      <label className="block text-xs font-bold text-slate-500 mb-2">{key}</label>
                      <input 
                        type="text" 
                        value={translations[key] ?? defaultLangValue} 
                        onChange={(e) => setTranslations({ ...translations, [key]: e.target.value })}
                        placeholder={defaultLangValue}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-600 outline-none text-sm font-medium bg-white" 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
