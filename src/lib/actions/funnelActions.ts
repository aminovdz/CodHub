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
  total?: number,
  discountAmount?: number,
  deliveryRate?: number,
  couponCode?: string,
  customFields?: any
}) {
  try {
    const totalPrice = payload.cart.reduce((acc, curr) => acc + curr.price, 0);
    const upsellTotal = payload.cart.filter(i => i.isUpsell).reduce((acc, curr) => acc + curr.price, 0);
    const productNames = payload.cart.map(i => i.name).join(', ');

    const finalTotal = payload.total !== undefined ? payload.total : totalPrice;

    // Update the master order
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        address: payload.address?.landmark || payload.address?.address || (typeof payload.address === 'string' ? payload.address : ''),
        wilaya: payload.address?.wilaya,
        commune: payload.address?.commune,
        city: payload.address?.city,
        postal_code: payload.address?.postalCode,
        province: payload.address?.province,
        country: payload.address?.country,
        product: productNames,
        total: finalTotal,
        upsell_total: upsellTotal,
        discount_amount: payload.discountAmount || 0,
        delivery_rate: payload.deliveryRate || 0,
        status: 'PENDING_AGENT_CONFIRMATION',
        notes: payload.instructions ? [{ author: 'System', text: payload.instructions, createdAt: new Date().toISOString() }] : null,
        custom_fields: { step: 'Completed', coupon: payload.couponCode || '', ...(payload.customFields || {}) }
      })
      .eq('id', orderId);

    if (orderError) throw orderError;

    // Trigger AiSensy Automated Campaign confirmation if enabled
    try {
      await sendAiSensyConfirmation(orderId);
    } catch (e) {
      console.error('[submitOrder] Failed to dispatch AiSensy confirmation:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Submit Order Error:', err);
    return { error: err.message };
  }
}

/**
 * Marks an order status as SELF_CONFIRMED.
 */
export async function markOrderSelfConfirmed(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'SELF_CONFIRMED' })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[markOrderSelfConfirmed] DB Error:', error);
      throw error;
    }
    
    console.log(`[markOrderSelfConfirmed] Order ${orderId} marked as SELF_CONFIRMED`);
    return { success: true, order: data };
  } catch (err: any) {
    console.error('[markOrderSelfConfirmed] Catch Error:', err);
    return { error: err.message };
  }
}

/**
 * Sends an automated confirmation message via AiSensy campaign API
 */
export async function sendAiSensyConfirmation(orderId: string) {
  try {
    // 1. Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // 2. Fetch store configuration
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', order.store_id)
      .single();

    if (storeError || !store) {
      return { success: false, error: 'Store not found' };
    }

    const config = store.whatsapp_config || {};
    if (!config.aisensyEnabled) {
      return { success: false, error: 'AiSensy is not enabled for this store' };
    }

    // 3. Skip if self-confirmed
    if (config.aisensyIgnoreSelfConfirmed && order.status === 'SELF_CONFIRMED') {
      console.log(`[AiSensy] Order ${orderId} is self-confirmed. Skipping automated Campaign dispatch.`);
      return { success: true, skipped: true, reason: 'SELF_CONFIRMED' };
    }

    // 4. Resolve template parameters
    const paramsList = (config.aisensyTemplateParams || '[NAME],[PRODUCT],[ADDRESS],[ORDER_ID]').split(',');
    
    // Helper to get short order id
    const shortId = order.id ? order.id.split('-')[0] : '';
    const fullAddress = [order.address, order.commune, order.wilaya].filter(Boolean).join(', ') || 'No address';

    const mappedParams = paramsList.map((param: string) => {
      const p = param.trim().toUpperCase();
      if (p === '[NAME]') return order.name || '';
      if (p === '[PRODUCT]') return order.product || '';
      if (p === '[ADDRESS]') return fullAddress;
      if (p === '[ORDER_ID]') return shortId;
      return '';
    });

    const apiKey = config.aisensyApiKey;
    const campaignName = config.aisensyCampaignName;

    if (!apiKey || !campaignName) {
      return { success: false, error: 'AiSensy API Key or Campaign Name is not configured.' };
    }

    // 5. POST to AiSensy Campaign API
    const payload = {
      apiKey,
      campaignName,
      destination: order.phone,
      userName: order.name || 'Customer',
      templateParams: mappedParams
    };

    console.log(`[AiSensy] Dispatching Campaign to destination ${order.phone} with params:`, mappedParams);

    const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`[AiSensy] Response:`, data);

    // Save notes log to order
    const author = 'System (AiSensy)';
    const createdAt = new Date().toISOString();
    const newNote = response.ok && data.success
      ? { author, text: `WhatsApp automated message triggered successfully via campaign: "${campaignName}"`, createdAt }
      : { author, text: `AiSensy campaign trigger failed: ${data.message || 'Unknown error'}`, createdAt };

    const updatedNotes = order.notes ? [...order.notes, newNote] : [newNote];

    await supabase
      .from('orders')
      .update({ notes: updatedNotes })
      .eq('id', orderId);

    if (response.ok && data.success) {
      return { success: true, response: data };
    } else {
      return { success: false, error: data.message || 'Campaign API call failed' };
    }

  } catch (err: any) {
    console.error('AiSensy Server Action Error:', err);
    return { success: false, error: err.message };
  }
}


