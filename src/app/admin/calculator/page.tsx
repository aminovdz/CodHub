'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Activity, ShoppingCart, Percent } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';

export default function ProfitCalculatorPage() {
  const { activeStore } = useAdminStore();
  const currency = activeStore?.currency || 'DZD';

  // Inputs
  const [sellingPrice, setSellingPrice] = useState<number>(4500);
  const [productCost, setProductCost] = useState<number>(1500);
  const [adSpendDay, setAdSpendDay] = useState<number>(5000);
  const [cpa, setCpa] = useState<number>(500);
  const [confRate, setConfRate] = useState<number>(65);
  const [deliveryRate, setDeliveryRate] = useState<number>(75);
  const [fulfillmentCost, setFulfillmentCost] = useState<number>(600);
  const [codFeePct, setCodFeePct] = useState<number>(0);
  const [returnCost, setReturnCost] = useState<number>(300);
  const [upsellPrice, setUpsellPrice] = useState<number>(2000);
  const [upsellTakeRate, setUpsellTakeRate] = useState<number>(15);

  // Calculations
  const metrics = useMemo(() => {
    // Volume Metrics
    const totalLeads = cpa > 0 ? adSpendDay / cpa : 0;
    const confirmedOrders = totalLeads * (confRate / 100);
    const deliveredOrders = confirmedOrders * (deliveryRate / 100);
    const rtoOrders = confirmedOrders - deliveredOrders;
    
    // Revenue Metrics
    const baseRevenue = deliveredOrders * sellingPrice;
    const upsellOrders = deliveredOrders * (upsellTakeRate / 100);
    const upsellRevenue = upsellOrders * upsellPrice;
    const grossRevenue = baseRevenue + upsellRevenue;

    // Cost Metrics
    const cogs = deliveredOrders * productCost; // Only count cost of goods actually sold
    const shippingCosts = confirmedOrders * fulfillmentCost; // Paid for all dispatched
    const rtoCosts = rtoOrders * returnCost; // Return penalty/fee
    const codFees = grossRevenue * (codFeePct / 100); // Usually a % of collected revenue
    
    const totalCosts = cogs + shippingCosts + rtoCosts + codFees + adSpendDay;
    
    // Profitability
    const netProfit = grossRevenue - totalCosts;
    const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    
    // Advanced CPA
    const realCpa = deliveredOrders > 0 ? adSpendDay / deliveredOrders : 0;
    const profitPerLead = totalLeads > 0 ? netProfit / totalLeads : 0;
    const breakevenCpa = totalLeads > 0 ? (cpa + profitPerLead) : 0;

    // 30 Day Extrapolation
    const monthlyRevenue = grossRevenue * 30;
    const monthlyProfit = netProfit * 30;

    return {
      totalLeads, confirmedOrders, deliveredOrders, rtoOrders,
      grossRevenue, cogs, shippingCosts, rtoCosts, codFees, totalCosts,
      netProfit, netMargin, realCpa, breakevenCpa,
      monthlyRevenue, monthlyProfit
    };
  }, [sellingPrice, productCost, adSpendDay, cpa, confRate, deliveryRate, fulfillmentCost, codFeePct, returnCost, upsellPrice, upsellTakeRate]);

  // Status determination
  let statusBanner = { label: '🔴 Losing', color: 'bg-rose-500 text-white', ring: 'ring-rose-500' };
  if (metrics.netMargin >= 30) {
    statusBanner = { label: '🚀 Scale', color: 'bg-indigo-600 text-white', ring: 'ring-indigo-600' };
  } else if (metrics.netMargin >= 15) {
    statusBanner = { label: '🟢 Profitable', color: 'bg-emerald-500 text-white', ring: 'ring-emerald-500' };
  } else if (metrics.netMargin >= 5) {
    statusBanner = { label: '🟡 Break Even', color: 'bg-amber-500 text-white', ring: 'ring-amber-500' };
  }

  // Chart max value for scaling
  const maxChartValue = Math.max(metrics.grossRevenue, metrics.totalCosts, Math.abs(metrics.netProfit), 1);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Calculator className="text-indigo-600" size={32} />
          COD Profit Calculator
        </h1>
        <p className="text-slate-500 font-medium">Model your unit economics and project monthly profitability.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - INPUTS */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">Economics & Pricing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selling Price</label>
                  <div className="relative">
                    <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-10" />
                    <DollarSign size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Product Cost</label>
                  <div className="relative">
                    <input type="number" value={productCost} onChange={e => setProductCost(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-10" />
                    <DollarSign size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Daily Ad Spend</label>
                  <div className="relative">
                    <input type="number" value={adSpendDay} onChange={e => setAdSpendDay(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-10" />
                    <DollarSign size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target CPA</label>
                  <div className="relative">
                    <input type="number" value={cpa} onChange={e => setCpa(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-10" />
                    <DollarSign size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">Fulfillment & Operations</h2>
            <div className="space-y-6">
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmation Rate</label>
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

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Shipping Cost</label>
                  <input type="number" value={fulfillmentCost} onChange={e => setFulfillmentCost(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Return Cost</label>
                  <input type="number" value={returnCost} onChange={e => setReturnCost(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">COD Fee %</label>
                  <input type="number" value={codFeePct} onChange={e => setCodFeePct(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">Upsell Strategy</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upsell Price</label>
                  <div className="relative">
                    <input type="number" value={upsellPrice} onChange={e => setUpsellPrice(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-10" />
                    <DollarSign size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Take Rate</label>
                    <span className="font-black text-indigo-600">{upsellTakeRate}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={upsellTakeRate} onChange={e => setUpsellTakeRate(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - OUTPUTS */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Status Banner */}
          <div className={`p-4 rounded-3xl flex justify-between items-center shadow-lg ring-1 ${statusBanner.color} ${statusBanner.ring}`}>
            <div>
              <div className="text-white/80 font-bold text-sm tracking-wide uppercase">Business Health Status</div>
              <div className="text-3xl font-black">{statusBanner.label}</div>
            </div>
            <div className="text-right">
              <div className="text-white/80 font-bold text-sm tracking-wide uppercase">Net Margin</div>
              <div className="text-3xl font-black">{metrics.netMargin.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Leads / Day</div>
              <div className="text-2xl font-black text-slate-900">{metrics.totalLeads.toFixed(0)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirmed</div>
              <div className="text-2xl font-black text-slate-900">{metrics.confirmedOrders.toFixed(0)}</div>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm text-center">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Delivered</div>
              <div className="text-2xl font-black text-emerald-700">{metrics.deliveredOrders.toFixed(0)}</div>
            </div>
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm text-center">
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">RTO</div>
              <div className="text-2xl font-black text-rose-700">{metrics.rtoOrders.toFixed(0)}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 mb-6 text-lg">Daily Financials</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <TrendingUp size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                </div>
                <div className="text-2xl font-black text-indigo-600">{metrics.grossRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm text-indigo-400">{currency}</span></div>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <TrendingDown size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Total Costs</span>
                </div>
                <div className="text-2xl font-black text-rose-600">{metrics.totalCosts.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm text-rose-400">{currency}</span></div>
              </div>
              <div className={`${metrics.netProfit > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} p-5 rounded-2xl border`}>
                <div className={`flex items-center gap-2 mb-2 ${metrics.netProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <DollarSign size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
                </div>
                <div className={`text-2xl font-black ${metrics.netProfit > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {metrics.netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm opacity-70">{currency}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Cost Breakdown</h4>
              <div className="flex h-6 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200 shadow-inner">
                {metrics.cogs > 0 && <div title="COGS" style={{ width: `${(metrics.cogs / metrics.totalCosts) * 100}%` }} className="bg-blue-500 h-full border-r border-white/20" />}
                {metrics.adSpendDay > 0 && <div title="Ads" style={{ width: `${(metrics.adSpendDay / metrics.totalCosts) * 100}%` }} className="bg-purple-500 h-full border-r border-white/20" />}
                {metrics.shippingCosts > 0 && <div title="Shipping" style={{ width: `${(metrics.shippingCosts / metrics.totalCosts) * 100}%` }} className="bg-teal-500 h-full border-r border-white/20" />}
                {metrics.rtoCosts > 0 && <div title="Returns" style={{ width: `${(metrics.rtoCosts / metrics.totalCosts) * 100}%` }} className="bg-rose-500 h-full border-r border-white/20" />}
                {metrics.codFees > 0 && <div title="Fees" style={{ width: `${(metrics.codFees / metrics.totalCosts) * 100}%` }} className="bg-amber-500 h-full" />}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> COGS: {((metrics.cogs/metrics.totalCosts)*100||0).toFixed(0)}%</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500" /> Ads: {((metrics.adSpendDay/metrics.totalCosts)*100||0).toFixed(0)}%</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-500" /> Shipping: {((metrics.shippingCosts/metrics.totalCosts)*100||0).toFixed(0)}%</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> RTO Penalty: {((metrics.rtoCosts/metrics.totalCosts)*100||0).toFixed(0)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                <span className="font-bold text-slate-600">Real CPA <span className="text-[10px] text-slate-400 block font-normal">(per delivered order)</span></span>
                <span className={`font-black text-xl ${metrics.realCpa > metrics.breakevenCpa ? 'text-rose-500' : 'text-slate-900'}`}>
                  {metrics.realCpa.toFixed(0)} {currency}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                <span className="font-bold text-slate-600">Breakeven CPA <span className="text-[10px] text-slate-400 block font-normal">(max ad spend per lead)</span></span>
                <span className="font-black text-xl text-slate-900">{metrics.breakevenCpa.toFixed(0)} {currency}</span>
              </div>
            </div>

          </div>

          <div className="bg-indigo-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="font-black text-indigo-200 mb-6 text-lg uppercase tracking-wider">30-Day Projection</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-indigo-300 text-sm font-bold mb-1">Projected Monthly Revenue</div>
                  <div className="text-4xl font-black">{metrics.monthlyRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-xl text-indigo-400">{currency}</span></div>
                </div>
                <div>
                  <div className="text-indigo-300 text-sm font-bold mb-1">Projected Monthly Profit</div>
                  <div className={`text-4xl font-black ${metrics.monthlyProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {metrics.monthlyProfit.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-xl opacity-70">{currency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
