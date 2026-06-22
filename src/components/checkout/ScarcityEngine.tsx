'use client';

import { useState, useEffect } from 'react';
import { Flame, Eye, Clock, ShieldCheck, Zap } from 'lucide-react';
import { ScarcityConfig } from '@/lib/store/useAdminStore';

interface ScarcityEngineProps {
  productId?: string;
  config?: ScarcityConfig;
}

export function ScarcityEngine({ productId, config }: ScarcityEngineProps) {
  const [viewers, setViewers] = useState(14);
  const [stock, setStock] = useState(8);
  const [soldToday, setSoldToday] = useState(45);

  useEffect(() => {
    // Generate deterministic but realistic numbers based on productId (or random if missing)
    const baseNum = productId 
      ? productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) 
      : Math.floor(Math.random() * 1000);
      
    // Set initial values
    setViewers(12 + (baseNum % 15));
    setStock(3 + (baseNum % 9));
    setSoldToday(30 + (baseNum % 40));

    // Simulate active viewers going up and down slightly
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        const next = prev + change;
        return next < 8 ? 8 : (next > 45 ? 45 : next);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [productId]);

  if (config && !config.enabled) return null;

  const viewersText = config?.viewersText ?? '{viewers} people viewing this';
  const stockText = config?.stockText ?? 'Only {stock} items left in stock!';
  const ordersText = config?.ordersTodayText ?? '{orders} orders today';
  const verifiedText = config?.verifiedText ?? 'Verified Product';
  const fastDeliveryText = config?.fastDeliveryText ?? 'Fast Delivery';

  const hasTopBanner = viewersText.trim() !== '' || stockText.trim() !== '';
  const hasBottomTags = ordersText.trim() !== '' || verifiedText.trim() !== '' || fastDeliveryText.trim() !== '';

  if (!hasTopBanner && !hasBottomTags) return null;

  return (
    <div className="flex flex-col gap-3 my-5">
      {/* Viewers & Scarcity */}
      {hasTopBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50/80 border border-red-100 rounded-2xl p-4 shadow-sm">
          {viewersText.trim() !== '' && (
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="animate-pulse">{viewersText.replace('{viewers}', viewers.toString())}</span>
            </div>
          )}
          
          {stockText.trim() !== '' && (
            <div className="flex items-center gap-2 text-rose-700 font-black text-sm bg-white px-3 py-1.5 rounded-full shadow-sm border border-red-50">
              <Flame size={16} className="text-orange-500" />
              {stockText.replace('{stock}', stock.toString())}
            </div>
          )}
        </div>
      )}

      {/* Social Proof Tags */}
      {hasBottomTags && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
          {ordersText.trim() !== '' && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Zap size={14} className="text-amber-500" />
              {ordersText.replace('{orders}', soldToday.toString())}
            </div>
          )}
          {verifiedText.trim() !== '' && (
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-emerald-700">
              <ShieldCheck size={14} />
              {verifiedText}
            </div>
          )}
          {fastDeliveryText.trim() !== '' && (
            <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 text-indigo-700">
              <Clock size={14} />
              {fastDeliveryText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
