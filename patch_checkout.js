const fs = require('fs');
const file = 'src/app/[region]/(funnel)/checkout/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Phone input LTR
content = content.replace(
  /<input type="tel" value={phone} onChange={\(e\) => setPhone\(e.target.value\)}/g,
  '<input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)}'
);

// Fix 2: useEffect for quantityOffers
content = content.replace(
  /const defaultOffer = product\.quantityOffers\.find\(o => \(o as any\)\.isDefault\) \?\? product\.quantityOffers\[0\];\s*setSelectedQuantity\(defaultOffer\.qty\);/g,
  `const currentQty = mainItem.qty || 1;\n    const existingOffer = product.quantityOffers.find(o => o.qty === currentQty);\n    if (existingOffer) {\n      setSelectedQuantity(existingOffer.qty);\n    } else {\n      const defaultOffer = product.quantityOffers.find(o => (o as any).isDefault) ?? product.quantityOffers[0];\n      setSelectedQuantity(defaultOffer.qty);\n    }`
);

// Fix 3: Address fields logic
// Replace from `{checkoutConfig?.addressAutocomplete ? (` to `) : (` for region === 'dz'
// Actually, it's easier to just use regex
const addressBlockOld = `{checkoutConfig?.addressAutocomplete ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.preciseAddress', 'Precise Address')} *</label>
                            <input ref={addressInputRef} type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                              placeholder="Search street, flat number..."
                            />
                          </div>
                          {/* Show wilaya/commune as read-only feedback after autocomplete fills them */}
                          {(wilaya || commune) && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
                                <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wider">Wilaya</span>
                                {wilaya || '—'}
                              </div>
                              <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
                                <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wider">Commune</span>
                                {commune || '—'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : region === 'dz' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.wilaya', 'Wilaya')} *</label>
                              <select value={wilaya} onChange={(e) => { setWilaya(e.target.value); setCommune(''); }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white"
                              >
                                <option value="" disabled>Select</option>
                                {uniqueWilayas.map(w => <option key={w} value={w}>{w}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.commune', 'Commune')} *</label>
                              <input type="text" value={commune} onChange={(e) => setCommune(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                placeholder="e.g. Bab El Oued"
                              />
                            </div>
                          </div>
                          {/* Only show detailed address for Home Delivery */}
                          {deliveryType === 'home' && (
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.address', 'Detailed Address')} *</label>
                              <input type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                placeholder={t('checkout.addressPlaceholder', 'e.g. Near the main post office')}
                              />
                            </div>
                          )}
                        </>
                      ) : (`;

const addressBlockNew = `<div className="space-y-3">
                        {/* 1. Precise/Detailed Address Input (Autocomplete goes here if enabled) */}
                        {deliveryType === 'home' && (
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                              {checkoutConfig?.addressAutocomplete ? t('checkout.preciseAddress', 'Precise Address') : t('checkout.address', 'Detailed Address')} *
                            </label>
                            <input ref={checkoutConfig?.addressAutocomplete ? addressInputRef : null} type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                              placeholder={checkoutConfig?.addressAutocomplete ? "Search street, flat number..." : t('checkout.addressPlaceholder', 'e.g. Near the main post office')}
                            />
                          </div>
                        )}

                        {/* 2. Wilaya / Commune / State / City */}
                        {region === 'dz' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.wilaya', 'Wilaya')} *</label>
                              <select value={wilaya} onChange={(e) => { setWilaya(e.target.value); setCommune(''); }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white"
                              >
                                <option value="" disabled>Select</option>
                                {uniqueWilayas.map(w => <option key={w} value={w}>{w}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.commune', 'Commune')} *</label>
                              <input type="text" value={commune} onChange={(e) => setCommune(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                placeholder="e.g. Bab El Oued"
                              />
                            </div>
                          </div>
                        ) : (`;
                        
content = content.replace(addressBlockOld, addressBlockNew);

fs.writeFileSync(file, content);
