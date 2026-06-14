'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serverSupabase = createClient(supabaseUrl, supabaseKey);

export async function syncDeliveryStatuses(storeId: string) {
  try {
    const { data: store, error: storeErr } = await serverSupabase
      .from('stores')
      .select('dz_fulfillment')
      .eq('id', storeId)
      .single();

    if (storeErr || !store) throw new Error("Store not found or error fetching config.");

    const dzFulfillment = store.dz_fulfillment || {};
    
    const { data: orders, error: ordersErr } = await serverSupabase
      .from('orders')
      .select('id, tracking_number, fulfillment_provider')
      .eq('store_id', storeId)
      .in('status', ['SHIPPED', 'CONFIRMED'])
      .not('tracking_number', 'is', null);

    if (ordersErr || !orders || orders.length === 0) {
      return { success: true, updatedCount: 0, message: "No shipped orders with tracking numbers found." };
    }

    let updatedCount = 0;

    const yalidineOrders = orders.filter(o => o.fulfillment_provider === 'yalidine');
    const dhdOrders = orders.filter(o => o.fulfillment_provider === 'dhd');

    if (yalidineOrders.length > 0 && dzFulfillment.yalidine?.apiKey && dzFulfillment.yalidine?.apiToken) {
      const trackingNumbers = yalidineOrders.map(o => o.tracking_number).join(',');
      const parcelsRes = await fetch(`https://api.yalidine.app/v1/parcels/?tracking=${trackingNumbers}`, {
          headers: {
            'X-API-ID': dzFulfillment.yalidine.apiKey,
            'X-API-TOKEN': dzFulfillment.yalidine.apiToken,
          }
      });
      if (parcelsRes.ok) {
          const parcelsData = await parcelsRes.json();
          const parcels = parcelsData.data || [];
          
          for (const parcel of parcels) {
              const order = yalidineOrders.find(o => o.tracking_number === parcel.tracking);
              if (!order) continue;
              
              const yStatus = parcel.last_status;
              let newStatus = undefined;
              
              if (yStatus === 'Livré') newStatus = 'DELIVERED';
              else if (yStatus === 'Retourné' || yStatus === 'Echoué') newStatus = 'RTO';
              else if (yStatus === 'Expédié' || yStatus === 'En préparation') newStatus = 'SHIPPED';
              
              if (newStatus || yStatus) {
                  await serverSupabase.from('orders').update({
                      ...(newStatus ? { status: newStatus } : {}),
                      fulfillment_status: yStatus
                  }).eq('id', order.id);
                  updatedCount++;
              }
          }
      }
    }

    if (dhdOrders.length > 0 && dzFulfillment.dhd?.apiKey && dzFulfillment.dhd?.apiToken) {
      const trackingNumbers = dhdOrders.map(o => o.tracking_number).join(',');
      const res = await fetch(`https://dhd.ecotrack.dz/api/v1/parcels?tracking=${trackingNumbers}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${dzFulfillment.dhd.apiToken}`,
          'X-API-KEY': dzFulfillment.dhd.apiKey,
          'X-API-TOKEN': dzFulfillment.dhd.apiToken,
        }
      });

      if (res.ok) {
        const resData = await res.json();
        const parcels = resData.data || resData.parcels || (Array.isArray(resData) ? resData : []);

        for (const parcel of parcels) {
          const order = dhdOrders.find(o => 
            o.tracking_number === parcel.tracking || 
            o.tracking_number === parcel.tracking_number || 
            o.tracking_number === parcel.code ||
            o.tracking_number === parcel.reference
          );
          if (!order) continue;

          const dStatus = parcel.status || parcel.last_status || parcel.current_status || parcel.status_name;
          let newStatus = undefined;

          if (dStatus === 'Livré') newStatus = 'DELIVERED';
          else if (dStatus === 'Retourné' || dStatus === 'Echoué') newStatus = 'RTO';
          else if (dStatus === 'Expédié' || dStatus === 'En préparation') newStatus = 'SHIPPED';

          if (newStatus || dStatus) {
            await serverSupabase.from('orders').update({
              ...(newStatus ? { status: newStatus } : {}),
              fulfillment_status: dStatus
            }).eq('id', order.id);
            updatedCount++;
          }
        }
      }
    }

    return { success: true, updatedCount, message: `Successfully synced ${updatedCount} orders.` };

  } catch (err: any) {
    console.error("Sync error:", err);
    return { success: false, error: err.message };
  }
}
