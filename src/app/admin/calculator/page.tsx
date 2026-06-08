'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Activity, ShoppingCart, Percent, Globe, AlertTriangle, PackageOpen } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';

export default function ProfitCalculatorPage() {
  const { activeStore } = useAdminStore();
  const currency = '€'; // We standardize on Euros for cross-border

  // Global Assumptions
  const [sellingPrice, setSellingPrice] = useState<number>(49.99);
  const [productCost, setProductCost] = useState<number>(8.50);
  const [supplierShip, setSupplierShip] = useState<number>(2.50);
  const [fixedCosts, setFixedCosts] = useState<number>(15.00);
  
  // Marketing
  const [adSpendDay, setAdSpendDay] = useState<number>(200);
  const [cpl, setCpl] = useState<number>(4.00);
  
  // Logistics & Operations (Manual Rates)
  const [shippingDelCost, setShippingDelCost] = useState<number>(5.26);
  const [shippingRtoCost, setShippingRtoCost] = useState<number>(6.26);
  const [codFeePercent, setCodFeePercent] = useState<number>(5.0);
  const [ccConfFee, setCcConfFee] = useState<number>(1.00);
  const [ccDelFee, setCcDelFee] = useState<number>(1.50);
  
  // Funnel
  const [confRate, setConfRate] = useState<number>(65);
  const [deliveryRate, setDeliveryRate] = useState<number>(75);
  
  // Upsell
  const [upsellPrice, setUpsellPrice] = useState<number>(19.99);
  const [upsellTakeRate, setUpsellTakeRate] = useState<number>(15);

  const calculateScenario = (conf: number, del: number) => {
    const totalLeads = cpl > 0 ? adSpendDay / cpl : 0;
    
    // Funnel
    const confirmedOrders = totalLeads * conf;
    const deliveredOrders = confirmedOrders * del;
    const rtoOrders = confirmedOrders - deliveredOrders;
    
    // Revenue
    const baseRevenue = deliveredOrders * sellingPrice;
    const upsellOrders = deliveredOrders * (upsellTakeRate / 100);
    const upsellRevenue = upsellOrders * upsellPrice;
    const grossRevenue = baseRevenue + upsellRevenue;
    
    // Costs
    const cogs = deliveredOrders * (productCost + supplierShip);
    const ccFees = (confirmedOrders * ccConfFee) + (deliveredOrders * ccDelFee);
    const shippingOut = deliveredOrders * shippingDelCost;
    const shippingRet = rtoOrders * shippingRtoCost;
    const codFees = grossRevenue * (codFeePercent / 100);
    
    const totalCosts = cogs + ccFees + shippingOut + shippingRet + codFees + fixedCosts + adSpendDay;
    const netProfit = grossRevenue - totalCosts;
    const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const roas = adSpendDay > 0 ? grossRevenue / adSpendDay : 0;
    
    // Unit Economics Breakdown (Dead Weight Allocation)
    const unitLanded = cogs / (deliveredOrders || 1);
    const unitMarketing = adSpendDay / (deliveredOrders || 1);
    const unitLogistics = (shippingOut + shippingRet) / (deliveredOrders || 1);
    const unitOverhead = (ccFees + codFees + fixedCosts) / (deliveredOrders || 1);
    const totalUnitCost = unitLanded + unitMarketing + unitLogistics + unitOverhead;

    return {
      totalLeads, confirmedOrders, deliveredOrders, rtoOrders,
      grossRevenue, totalCosts, netProfit, netMargin, roas,
      cogs, ccFees, shippingOut, shippingRet, codFees, fixedCosts, adSpendDay,
      unitLanded, unitMarketing, unitLogistics, unitOverhead, totalUnitCost
    };
  };

  const metrics = useMemo(() => {
    return calculateScenario(confRate / 100, deliveryRate / 100);
  }, [
    sellingPrice, productCost, supplierShip, fixedCosts, 
    adSpendDay, cpl, 
    shippingDelCost, shippingRtoCost, codFeePercent, ccConfFee, ccDelFee, 
    confRate, deliveryRate, 
    upsellPrice, upsellTakeRate
  ]);

  const scenarios = useMemo(() => {
    const baseConf = confRate / 100;
    const baseDel = deliveryRate / 100;
    return {
      pessimistic: calculateScenario(Math.max(0, baseConf - 0.15), Math.max(0, baseDel - 0.15)),
      base: metrics,
      optimistic: calculateScenario(Math.min(1, baseConf + 0.10), Math.min(1, baseDel + 0.10))
    };
  }, [metrics]);

  // Status determination
  let statusBanner = { label: '🔴 Losing', color: 'bg-rose-500 text-white', ring: 'ring-rose-500' };
  if (metrics.netMargin >= 30) {
    statusBanner = { label: '🚀 Scale', color: 'bg-indigo-600 text-white', ring: 'ring-indigo-600' };
  } else if (metrics.netMargin >= 15) {
    statusBanner = { label: '🟢 Profitable', color: 'bg-emerald-500 text-white', ring: 'ring-emerald-500' };
  } else if (metrics.netMargin >= 5) {
    statusBanner = { label: '🟡 Break Even', color: 'bg-amber-500 text-white', ring: 'ring-amber-500' };
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Calculator className="text-indigo-600" size={32} />
          Advanced Profit Simulator
        </h1>
        <p className="text-slate-500 font-medium">Multi-scenario unit economics, monthly projections, and cross-border KPI analysis.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - INPUTS */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">Global Assumptions</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Selling Price</label>
                  <input type="number" step="0.01" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Product COGS</label>
                  <input type="number" step="0.01" value={productCost} onChange={e => setProductCost(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Supplier Ship</label>
                  <input type="number" step="0.01" value={supplierShip} onChange={e => setSupplierShip(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Daily Fixed Costs</label>
                  <input type="number" step="0.01" value={fixedCosts} onChange={e => setFixedCosts(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Daily Ad Spend</label>
                  <input type="number" value={adSpendDay} onChange={e => setAdSpendDay(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ad CPL</label>
                  <input type="number" step="0.1" value={cpl} onChange={e => setCpl(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>
            
            <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-sm font-bold text-slate-600">
              <span>Implied Raw Leads/Day:</span>
              <span className="text-indigo-600 text-lg">{(cpl > 0 ? adSpendDay/cpl : 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">Logistics & Call Center Rates</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Delivery Cost</label>
                  <input type="number" step="0.01" value={shippingDelCost} onChange={e => setShippingDelCost(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">RTO Cost</label>
                  <input type="number" step="0.01" value={shippingRtoCost} onChange={e => setShippingRtoCost(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CC Confirm Fee</label>
                  <input type="number" step="0.01" value={ccConfFee} onChange={e => setCcConfFee(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CC Delivery Fee</label>
                  <input type="number" step="0.01" value={ccDelFee} onChange={e => setCcDelFee(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">COD Fee (%)</label>
                <div className="relative">
                  <input type="number" step="0.1" value={codFeePercent} onChange={e => setCodFeePercent(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none pl-10" />
                  <Percent size={14} className="absolute left-3.5 top-[13px] text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">Current Funnel Rates</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Rate</label>
                  <span className="font-black text-indigo-600">{confRate}%</span>
                </div>
                <input type="range" min="0" max="100" value={confRate} onChange={e => setConfRate(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Rate</label>
                  <span className="font-black text-indigo-600">{deliveryRate}%</span>
                </div>
                <input type="range" min="0" max="100" value={deliveryRate} onChange={e => setDeliveryRate(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">Upsell Strategy</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Upsell Price</label>
                <input type="number" step="0.01" value={upsellPrice} onChange={e => setUpsellPrice(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Take Rate</label>
                  <span className="font-black text-indigo-600 text-xs">{upsellTakeRate}%</span>
                </div>
                <input type="range" min="0" max="100" value={upsellTakeRate} onChange={e => setUpsellTakeRate(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - OUTPUTS */}
        <div className="xl:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1">Daily Net Profit</div>
              <div className={`text-4xl font-black ${metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{currency}{metrics.netProfit.toFixed(2)}</div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1">Profit Per Delivered</div>
              <div className={`text-4xl font-black ${metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{currency}{(metrics.deliveredOrders > 0 ? metrics.netProfit / metrics.deliveredOrders : 0).toFixed(2)}</div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1">ROI / ROAS</div>
              <div className="text-4xl font-black text-amber-500">{metrics.roas.toFixed(2)}x</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-end mb-6">
               <h2 className="text-lg font-black text-slate-900 leading-tight">Real Cost Allocation<br/><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">per delivered order</span></h2>
               <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Loaded Unit Cost</div>
                  <div className="text-2xl font-black text-slate-800">{currency}{metrics.totalUnitCost.toFixed(2)}</div>
               </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-bold mb-1.5">
                  <span className="text-slate-600">Product Landed Cost <span className="font-medium text-slate-400 ml-1 text-xs">(COGS + Sup Shipping)</span></span>
                  <span className="text-blue-600">{currency}{metrics.unitLanded.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${metrics.totalUnitCost > 0 ? (metrics.unitLanded / metrics.totalUnitCost) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-bold mb-1.5">
                  <span className="text-slate-600">Marketing Acquisition Share <span className="font-medium text-slate-400 ml-1 text-xs">(Blended CPA)</span></span>
                  <span className="text-amber-500">{currency}{metrics.unitMarketing.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${metrics.totalUnitCost > 0 ? (metrics.unitMarketing / metrics.totalUnitCost) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-bold mb-1.5">
                  <span className="text-slate-600">Logistics Burden <span className="font-medium text-slate-400 ml-1 text-xs">(Outbound + Returns Dead Weight)</span></span>
                  <span className="text-rose-500">{currency}{metrics.unitLogistics.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-rose-400 h-full rounded-full" style={{ width: `${metrics.totalUnitCost > 0 ? (metrics.unitLogistics / metrics.totalUnitCost) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-bold mb-1.5">
                  <span className="text-slate-600">Operations & Overhead <span className="font-medium text-slate-400 ml-1 text-xs">(Call Center + COD Fees + Fixed)</span></span>
                  <span className="text-indigo-500">{currency}{metrics.unitOverhead.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${metrics.totalUnitCost > 0 ? (metrics.unitOverhead / metrics.totalUnitCost) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900">3-Scenario Risk Matrix & Outlook</h2>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Pessimistic (-15% Rates) vs Base vs Optimistic (+10% Rates)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="p-4">Scenario Context</th>
                    <th className="p-4 text-center">Rates (Conf / Del)</th>
                    <th className="p-4 text-right">Daily Del.</th>
                    <th className="p-4 text-right">Daily Profit</th>
                    <th className="p-4 text-right">30-Day Rev.</th>
                    <th className="p-4 text-right">30-Day Profit</th>
                    <th className="p-4 text-right">Blended ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-bold">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-rose-500 flex items-center gap-2"><TrendingDown size={14}/> Pessimistic</td>
                    <td className="p-4 text-center text-slate-400">{Math.round(Math.max(0, confRate - 15))}% / {Math.round(Math.max(0, deliveryRate - 15))}%</td>
                    <td className="p-4 text-right">{scenarios.pessimistic.deliveredOrders.toFixed(1)}</td>
                    <td className={`p-4 text-right ${scenarios.pessimistic.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{scenarios.pessimistic.netProfit.toFixed(0)}</td>
                    <td className="p-4 text-right">{currency}{(scenarios.pessimistic.grossRevenue * 30).toFixed(0)}</td>
                    <td className={`p-4 text-right ${scenarios.pessimistic.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{(scenarios.pessimistic.netProfit * 30).toFixed(0)}</td>
                    <td className="p-4 text-right text-slate-500">{scenarios.pessimistic.roas.toFixed(2)}x</td>
                  </tr>
                  <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                    <td className="p-4 text-indigo-600 flex items-center gap-2"><Activity size={14}/> Current Base</td>
                    <td className="p-4 text-center text-slate-500">{confRate}% / {deliveryRate}%</td>
                    <td className="p-4 text-right">{scenarios.base.deliveredOrders.toFixed(1)}</td>
                    <td className={`p-4 text-right ${scenarios.base.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{scenarios.base.netProfit.toFixed(0)}</td>
                    <td className="p-4 text-right">{currency}{(scenarios.base.grossRevenue * 30).toFixed(0)}</td>
                    <td className={`p-4 text-right font-black ${scenarios.base.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{(scenarios.base.netProfit * 30).toFixed(0)}</td>
                    <td className="p-4 text-right text-slate-500">{scenarios.base.roas.toFixed(2)}x</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-emerald-500 flex items-center gap-2"><TrendingUp size={14}/> Optimistic</td>
                    <td className="p-4 text-center text-slate-400">{Math.round(Math.min(100, confRate + 10))}% / {Math.round(Math.min(100, deliveryRate + 10))}%</td>
                    <td className="p-4 text-right">{scenarios.optimistic.deliveredOrders.toFixed(1)}</td>
                    <td className={`p-4 text-right ${scenarios.optimistic.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{scenarios.optimistic.netProfit.toFixed(0)}</td>
                    <td className="p-4 text-right">{currency}{(scenarios.optimistic.grossRevenue * 30).toFixed(0)}</td>
                    <td className={`p-4 text-right ${scenarios.optimistic.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{(scenarios.optimistic.netProfit * 30).toFixed(0)}</td>
                    <td className="p-4 text-right text-slate-500">{scenarios.optimistic.roas.toFixed(2)}x</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
