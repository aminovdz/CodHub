'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in server environment!");
}

/**
 * Saves or updates a DRAFT order with Name and Phone from Step 1.
 */
export async function saveDraftOrder(data: { id?: string | null, name: string, phone: string, region: string, step?: string }) {
  try {
    // Find the store for this region
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .ilike('region', data.region)
      .single();
    
    if (storeError || !store) {
      console.error(`[saveDraftOrder] Store not found for region: "${data.region}"`, storeError);
      return { error: `Store not found for region: ${data.region}` };
    }

    const payload = {
      customer: data.name,
      phone: data.phone,
      store_id: store.id,
      status: 'DRAFT',
      custom_fields: { step: data.step || 'Checkout' }
    };

    console.log(`[saveDraftOrder] Payload:`, payload);

    if (data.id && !data.id.startsWith('ABN-')) {
      console.log(`[saveDraftOrder] Updating existing draft: ${data.id}`);
      const { data: updated, error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) {
        console.error(`[saveDraftOrder] Update Error:`, error);
        throw error;
      }
      return { success: true, orderId: updated.id };
    } else {
      console.log(`[saveDraftOrder] Creating new draft...`);
      const { data: inserted, error } = await supabase
        .from('orders')
        .insert(payload)
        .select()
        .single();
      
      if (error) {
        console.error(`[saveDraftOrder] Insert Error:`, error);
        throw error;
      }
      console.log(`[saveDraftOrder] Success! New ID: ${inserted.id}`);
      return { success: true, orderId: inserted.id };
    }
  } catch (err: any) {
    console.error('[saveDraftOrder] Final Catch:', err);
    return { error: err.message };
  }
}

/**
 * Submits the final order.
 */
export async function submitOrder(orderId: string, regionCode: string, payload: {
  address: any,
  instructions: string,
  cart: { id: string, name: string, price: number, isUpsell: boolean }[],
}) {
  try {
    const totalPrice = payload.cart.reduce((acc, curr) => acc + curr.price, 0);
    const upsellTotal = payload.cart.filter(i => i.isUpsell).reduce((acc, curr) => acc + curr.price, 0);
    const productNames = payload.cart.map(i => i.name).join(', ');

    // Update the master order
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        address: payload.address.landmark || payload.address.address || (typeof payload.address === 'string' ? payload.address : ''),
        wilaya: payload.address.wilaya,
        commune: payload.address.commune,
        city: payload.address.city,
        postal_code: payload.address.postalCode,
        province: payload.address.province,
        country: payload.address.country,
        product: productNames,
        total: totalPrice,
        upsell_total: upsellTotal,
        status: 'PENDING_AGENT_CONFIRMATION',
        notes: payload.instructions ? [{ author: 'System', text: payload.instructions, createdAt: new Date().toISOString() }] : null
      })
      .eq('id', orderId);

    if (orderError) throw orderError;

    return { success: true };
  } catch (err: any) {
    console.error('Submit Order Error:', err);
    return { error: err.message };
  }
}
