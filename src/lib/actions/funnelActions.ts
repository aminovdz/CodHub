'use server';

import { createClient } from '@supabase/supabase-js';
import { slugify } from '../utils';
import { headers } from 'next/headers';

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
export async function saveDraftOrder(data: { id?: string | null, name: string, phone: string, region: string, storeId?: string, step?: string, source?: string, utmCampaign?: string, product?: string }) {
  try {
    let store;
    let storeError;

    if (data.storeId) {
      const result = await supabase.from('stores').select('id, generic_webhook_url').eq('id', data.storeId).single();
      store = result.data;
      storeError = result.error;
    } else {
      const { data: allStores, error: allStoresError } = await supabase.from('stores').select('id, name, region, generic_webhook_url');
      storeError = allStoresError;
      if (allStores) {
        store = allStores.find((s: any) => {
          const lowerRegion = data.region.toLowerCase();
          const slugifiedName = slugify(s.name);
          return s.region.toLowerCase() === lowerRegion || slugifiedName === lowerRegion;
        });
      }
    }
    
    if (storeError || !store) {
      console.error(`[saveDraftOrder] Store not found for region: "${data.region}"`, storeError);
      return { error: `Store not found for region: ${data.region}` };
    }

    const payload: any = {
      customer: data.name,
      phone: data.phone,
      store_id: store.id,
      product: data.product || null,
      status: 'DRAFT',
      custom_fields: { step: data.step || 'Checkout', utm_campaign: data.utmCampaign || '', source: data.source || '' }
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
      
      // Fire Webhook for new draft
      if (store.generic_webhook_url) {
        try {
          fetch(store.generic_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'order.draft',
              data: {
                id: inserted.id,
                ...payload
              }
            })
          }).catch(err => console.error('[Webhook Error]', err));
        } catch (e) {
          console.error('[Webhook Fire Error]', e);
        }
      }

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
  customerName: string,
  phone: string,
  address: any,
  instructions: string,
  cart: { id: string, name: string, price: number, isUpsell: boolean }[],
  total?: number,
  discountAmount?: number,
  deliveryRate?: number,
  couponCode?: string,
  customFields?: any,
  source?: string,
  utmCampaign?: string,
  storeId?: string
}) {
  try {
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() || reqHeaders.get('x-real-ip') || '127.0.0.1';

    const totalPrice = payload.cart.reduce((acc, curr) => acc + curr.price, 0);
    const upsellTotal = payload.cart.filter(i => i.isUpsell).reduce((acc, curr) => acc + curr.price, 0);
    const productNames = payload.cart.map(i => i.isUpsell ? `[Add-on] ${i.name}` : i.name).join(', ');

    const finalTotal = payload.total !== undefined ? payload.total : totalPrice;

    let store;
    if (payload.storeId) {
      const result = await supabase.from('stores').select('id, generic_webhook_url, resend_api_key, notify_email, dz_fulfillment, translations').eq('id', payload.storeId).single();
      store = result.data;
    } else {
      const { data: allStores } = await supabase.from('stores').select('id, name, region, generic_webhook_url, resend_api_key, notify_email, dz_fulfillment, translations');
      if (allStores) {
        store = allStores.find((s: any) => {
          const lowerRegion = regionCode.toLowerCase();
          const slugifiedName = slugify(s.name);
          return s.region.toLowerCase() === lowerRegion || slugifiedName === lowerRegion;
        });
      }
    }

    if (store) {
      const translations = store.translations as any || {};
      const limitMinutes = Number(translations.ipOrderLimitTimeframe) || 0;
      if (limitMinutes > 0 && ipAddress !== '127.0.0.1') {
        const cutoffTime = new Date(Date.now() - limitMinutes * 60 * 1000).toISOString();
        const { data: recentOrders, error: recentError } = await supabase
          .from('orders')
          .select('id')
          .eq('store_id', store.id)
          .eq('ip_address', ipAddress)
          .neq('status', 'DRAFT')
          .gt('date', cutoffTime);

        if (recentError) {
          console.error('[submitOrder] Failed to query recent orders for IP limit:', recentError);
        } else if (recentOrders && recentOrders.length > 0) {
          console.warn(`[submitOrder] Blocked duplicate order from IP ${ipAddress} for store ${store.id}. Configured limit: ${limitMinutes} min.`);
          
          // Increment preventedOrdersCount
          const newPreventedCount = (Number(translations.preventedOrdersCount) || 0) + 1;
          const updatedTranslations = { ...translations, preventedOrdersCount: newPreventedCount };
          await supabase.from('stores').update({ translations: updatedTranslations }).eq('id', store.id);

          return { error: 'You have already placed an order recently. Please wait before submitting again.' };
        }
      }
    }

    let webhookUrl = store?.generic_webhook_url;
    const dzFulfillment = store?.dz_fulfillment as any;

    const payloadObj: any = {
      store_id: store?.id,
      customer: payload.customerName,
      phone: payload.phone,
      ip_address: ipAddress,
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
      claimed_by: null as string | null,
      notes: payload.instructions ? [{ author: 'System', text: payload.instructions, createdAt: new Date().toISOString() }] : null,
      custom_fields: { step: 'Completed', coupon: payload.couponCode || '', utm_campaign: payload.utmCampaign || '', source: payload.source || '', ...(payload.customFields || {}) }
    };

    // Auto-Routing (Round-Robin) Dispatcher
    if (store && dzFulfillment?.autoRoutingEnabled === true) {
      try {
        const { data: allStaff } = await supabase
          .from('staff_accounts')
          .select('id, name, role, store_id, store_ids')
          .eq('role', 'confirmation');

        const staffAssignments = store.translations?.staffAssignments || {};
        const eligibleStaff = (allStaff || []).filter(staff => {
          if (staff.store_id === store.id) return true;
          if (Array.isArray(staff.store_ids) && staff.store_ids.includes(store.id)) return true;
          const assignedStoreIds = staffAssignments[staff.id];
          return Array.isArray(assignedStoreIds) && assignedStoreIds.includes(store.id);
        });

        const onlineStaffIds = store.translations?.onlineStaffIds || [];
        let activeStaff = eligibleStaff.filter(s => onlineStaffIds.includes(s.id));

        if (activeStaff.length === 0) {
          activeStaff = eligibleStaff;
        }

        if (activeStaff.length > 0) {
          const lastIndex = Number(store.translations?.last_assigned_index) || 0;
          const targetIndex = lastIndex % activeStaff.length;
          const assignedStaff = activeStaff[targetIndex];

          payloadObj.claimed_by = assignedStaff.name;

          const updatedTranslations = {
            ...(store.translations || {}),
            last_assigned_index: targetIndex + 1
          };

          await supabase
            .from('stores')
            .update({ translations: updatedTranslations })
            .eq('id', store.id);
        }
      } catch (routingErr) {
        console.error('[AutoRouting] Dispatcher failed:', routingErr);
      }
    }

    let actualOrderId = orderId;
    
    // If orderId is a UUID, we can update it directly
    if (orderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      const { error: updateError } = await supabase.from('orders').update(payloadObj).eq('id', orderId);
      if (updateError) throw updateError;
    } else {
      // It's a temporary ID like ABN-... or ORD-..., so we must insert it fresh
      const { data: inserted, error: insertError } = await supabase.from('orders').insert(payloadObj).select('id').single();
      if (insertError) throw insertError;
      actualOrderId = inserted.id;
    }

    // Trigger Meta Automated Campaign confirmation if enabled (delayed by 60s to allow self-confirmation)
    try {
      setTimeout(async () => {
        try {
          await sendMetaConfirmation(actualOrderId);
        } catch (e) {
          console.error('[submitOrder delayed] Failed to dispatch Meta confirmation:', e);
        }
      }, 60000);
    } catch (e) {
      console.error('[submitOrder] Failed to schedule Meta confirmation:', e);
    }

    // ── Email Notification to Confirmation Staff ──
    try {
      if (store?.resend_api_key) {
        // Fetch all confirmation staff
        const { data: allStaff } = await supabase
          .from('staff_accounts')
          .select('id, name, email, role, store_id, store_ids')
          .eq('role', 'confirmation');

        const staffAssignments = store.translations?.staffAssignments || {};
        
        // Filter staff eligible for this store
        const eligibleStaffForEmail = (allStaff || []).filter((staff: any) => {
          if (staff.store_id === store.id) return true;
          if (Array.isArray(staff.store_ids) && staff.store_ids.includes(store.id)) return true;
          const assignedStoreIds = staffAssignments[staff.id];
          return Array.isArray(assignedStoreIds) && assignedStoreIds.includes(store.id);
        });

        const staffEmails = eligibleStaffForEmail.map((s: any) => s.email).filter(Boolean);
        
        if (staffEmails.length > 0) {
          // Build concise product list
          const productList = payload.cart.map(i => 
            `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">${i.isUpsell ? '↳ ' : ''}${i.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;font-weight:600">${i.price}</td></tr>`
          ).join('');

          const addressStr = payloadObj.wilaya 
            ? `${payloadObj.wilaya}${payloadObj.commune ? ', ' + payloadObj.commune : ''}` 
            : (payloadObj.city ? `${payloadObj.city}${payloadObj.province ? ', ' + payloadObj.province : ''}` : payloadObj.address || '—');

          const emailHtml = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;color:#fff;font-size:18px">🛒 New Order</h2>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">#${actualOrderId.slice(0, 8)}</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:4px 0;font-size:13px;color:#94a3b8">Customer</td><td style="padding:4px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right">${payload.customerName}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#94a3b8">Phone</td><td style="padding:4px 0;font-size:14px;color:#1e293b;text-align:right">${payload.phone}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#94a3b8">Location</td><td style="padding:4px 0;font-size:14px;color:#1e293b;text-align:right">${addressStr}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:16px">
      <tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Product</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600">Price</th></tr>
      ${productList}
    </table>
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:8px;padding:12px 16px;text-align:center">
      <span style="color:rgba(255,255,255,.7);font-size:12px">Total</span>
      <p style="margin:2px 0 0;color:#fff;font-size:22px;font-weight:800">${finalTotal}</p>
    </div>
  </div>
</div>`;

          try {
            // Resend requires verified domain for 'from'. Use onboarding@resend.dev as fallback.
            const fromEmail = store.notify_email && !store.notify_email.includes('resend.dev') 
              ? store.notify_email 
              : 'CodHub Orders <onboarding@resend.dev>';

            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${store.resend_api_key}`
              },
              body: JSON.stringify({
                from: fromEmail,
                to: staffEmails,
                subject: `🛒 New Order #${actualOrderId.slice(0, 8)} — ${payload.cart.map(i => i.name).join(', ')}`,
                html: emailHtml
              })
            });
            const resData = await res.json();
            console.log(`[Email] Resend API sent to ${staffEmails.length} staff:`, resData);
          } catch (err) {
            console.error('[Email] Resend API failed:', err);
          }
        }
      }
    } catch (e) {
      console.error('[submitOrder] Failed to notify staff:', e);
    }

    // Fire Webhook for submitted order
    if (webhookUrl) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'order.new',
            data: {
              id: actualOrderId,
              region: regionCode,
              ...payload
            }
          })
        }).catch(err => console.error('[Webhook Error]', err));
      } catch (e) {
        console.error('[Webhook Fire Error]', e);
      }
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

// ─────────────────────────────────────────────────────────────────
// Helper: resolve template parameters from order + store
// ─────────────────────────────────────────────────────────────────
async function resolveTemplateParams(
  paramsList: string[],
  order: any,
  store: any
): Promise<string[]> {
  const shortId = order.id ? order.id.split('-')[0] : '';
  const fullAddress = [order.address, order.commune, order.wilaya].filter(Boolean).join(', ') || 'No address';
  const productUrl = await resolveProductUrl(store, order.product || '');

  return paramsList.map((param: string) => {
    const p = param.trim().toUpperCase();
    if (p === '[NAME]') return order.name || '';
    if (p === '[PRODUCT]') return order.product || '';
    if (p === '[PRODUCT_URL]') return productUrl;
    if (p === '[ADDRESS]') return fullAddress;
    if (p === '[ORDER_ID]') return shortId;
    if (p === '[STORE_NAME]') return store.name || '';
    if (p === '[ORDER_TOTAL]') return order.total?.toString() || '';
    return '';
  });
}

// ─────────────────────────────────────────────────────────────────
// Helper: send a WhatsApp template message via Meta Graph API
// ─────────────────────────────────────────────────────────────────
async function sendMetaWhatsAppTemplate({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  languageCode,
  bodyParams,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
}) {
  // Normalise phone: strip leading zeros, keep country code
  const normalised = to.replace(/\D/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    to: normalised,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: bodyParams.length > 0
        ? [{
            type: 'body',
            parameters: bodyParams.map(v => ({ type: 'text', text: v })),
          }]
        : [],
    },
  };

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ─────────────────────────────────────────────────────────────────
// Helper: log a message event to the message_logs table
// ─────────────────────────────────────────────────────────────────
async function logMetaMessage({
  storeId,
  orderId,
  phone,
  messageType,
  status,
  metaMessageId,
}: {
  storeId: string;
  orderId: string;
  phone: string;
  messageType: string;
  status: string;
  metaMessageId?: string;
}) {
  await supabase.from('message_logs').insert({
    store_id: storeId,
    order_id: orderId,
    phone_number: phone,
    message_type: messageType,
    status,
    meta_message_id: metaMessageId || null,
  });
}

/**
 * Sends an automated order confirmation message via Meta Graph API
 */
export async function sendMetaConfirmation(orderId: string) {
  try {
    // 1. Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // 2. Fetch store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', order.store_id)
      .single();

    if (storeError || !store) {
      return { success: false, error: 'Store not found' };
    }

    const config = store.whatsapp_config || {};
    if (!config.metaEnabled) {
      return { success: false, error: 'Meta WhatsApp API is not enabled for this store' };
    }

    // 3. Skip if self-confirmed
    if (config.metaIgnoreSelfConfirmed && order.status === 'SELF_CONFIRMED') {
      console.log(`[Meta] Order ${orderId} is self-confirmed. Skipping automated dispatch.`);
      return { success: true, skipped: true, reason: 'SELF_CONFIRMED' };
    }

    const { metaPhoneNumberId, metaAccessToken, metaTemplateName, metaLanguageCode, metaTemplateParams } = config;

    if (!metaPhoneNumberId || !metaAccessToken || !metaTemplateName) {
      return { success: false, error: 'Meta API credentials or template name not configured.' };
    }

    // 4. Resolve params
    const paramsList = (metaTemplateParams || '[NAME],[ORDER_ID],[PRODUCT],[ORDER_TOTAL]').split(',');
    const bodyParams = await resolveTemplateParams(paramsList, order, store);

    console.log(`[Meta] Sending confirmation to ${order.phone} — template: ${metaTemplateName}`, bodyParams);

    // 5. Send via Meta Graph API
    const { ok, data } = await sendMetaWhatsAppTemplate({
      phoneNumberId: metaPhoneNumberId,
      accessToken: metaAccessToken,
      to: order.phone,
      templateName: metaTemplateName,
      languageCode: metaLanguageCode || 'en_US',
      bodyParams,
    });

    const metaMessageId = data?.messages?.[0]?.id;

    // 6. Log to message_logs
    await logMetaMessage({
      storeId: store.id,
      orderId,
      phone: order.phone,
      messageType: 'CONFIRMATION',
      status: ok ? 'SENT' : 'FAILED',
      metaMessageId,
    });

    // 7. Append note to order
    const author = 'System (Meta WhatsApp)';
    const createdAt = new Date().toISOString();
    const newNote = ok
      ? { author, text: `WhatsApp confirmation sent via Meta template: "${metaTemplateName}" (msg: ${metaMessageId || 'n/a'})`, createdAt }
      : { author, text: `Meta WhatsApp confirmation failed: ${JSON.stringify(data?.error || data)}`, createdAt };

    const updatedNotes = order.notes ? [...order.notes, newNote] : [newNote];
    await supabase.from('orders').update({ notes: updatedNotes }).eq('id', orderId);

    return ok
      ? { success: true, metaMessageId }
      : { success: false, error: data?.error?.message || 'Meta API call failed' };

  } catch (err: any) {
    console.error('[Meta] Confirmation Error:', err);
    return { success: false, error: err.message };
  }
}

// Keep backward-compat alias used by old imports
export const sendAiSensyConfirmation = sendMetaConfirmation;

/**
 * Sends an abandoned cart recovery message via Meta Graph API
 */
export async function sendMetaAbandonedCart(orderId: string) {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status === 'ABANDONED_NOTIFIED') {
      return { success: false, error: 'Already notified for this cart' };
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', order.store_id)
      .single();

    if (storeError || !store) {
      return { success: false, error: 'Store not found' };
    }

    const config = store.whatsapp_config || {};
    if (!config.metaEnabled || !config.metaAbandonedCartTemplateName) {
      return { success: false, error: 'Meta API or abandoned cart template not configured' };
    }

    const { metaPhoneNumberId, metaAccessToken, metaAbandonedCartTemplateName, metaLanguageCode } = config;

    if (!metaPhoneNumberId || !metaAccessToken) {
      return { success: false, error: 'Meta API credentials not configured.' };
    }

    const productUrl = await resolveProductUrl(store, order.product || '');
    const bodyParams = [
      order.name || 'Customer',
      order.product || '',
      productUrl,
      order.total?.toString() || '',
    ];

    console.log(`[Meta] Sending abandoned cart to ${order.phone} — template: ${metaAbandonedCartTemplateName}`);

    const { ok, data } = await sendMetaWhatsAppTemplate({
      phoneNumberId: metaPhoneNumberId,
      accessToken: metaAccessToken,
      to: order.phone,
      templateName: metaAbandonedCartTemplateName,
      languageCode: metaLanguageCode || 'en_US',
      bodyParams,
    });

    const metaMessageId = data?.messages?.[0]?.id;

    await logMetaMessage({
      storeId: store.id,
      orderId,
      phone: order.phone,
      messageType: 'ABANDONED_CART',
      status: ok ? 'SENT' : 'FAILED',
      metaMessageId,
    });

    const author = 'System (Meta WhatsApp)';
    const createdAt = new Date().toISOString();
    const newNote = ok
      ? { author, text: `Abandoned cart WhatsApp sent via Meta template: "${metaAbandonedCartTemplateName}"`, createdAt }
      : { author, text: `Meta abandoned cart failed: ${JSON.stringify(data?.error || data)}`, createdAt };

    const updatedNotes = order.notes ? [...order.notes, newNote] : [newNote];
    await supabase.from('orders').update({ notes: updatedNotes, status: 'ABANDONED_NOTIFIED' }).eq('id', orderId);

    return ok
      ? { success: true, metaMessageId }
      : { success: false, error: data?.error?.message || 'Meta API call failed' };

  } catch (err: any) {
    console.error('[Meta] Abandoned Cart Error:', err);
    return { success: false, error: err.message };
  }
}

// Backward-compat alias
export const sendAiSensyAbandonedCart = sendMetaAbandonedCart;




/**
 * Resolves the first product URL from an order's product string
 */
async function resolveProductUrl(store: any, productName: string): Promise<string> {
  try {
    const { data: products } = await supabase
      .from('products')
      .select('seo_slug, title')
      .eq('store_id', store.id);

    if (!products || products.length === 0) return '';

    const firstProductName = productName.split(',')[0].trim();
    const match = products.find((p: any) =>
      p.title.toLowerCase().includes(firstProductName.toLowerCase()) ||
      firstProductName.toLowerCase().includes(p.title.toLowerCase())
    );
    if (match) {
      const slug = match.seo_slug || match.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const region = (store.region || 'dz').toLowerCase();
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${region}.codhub.com`;
      return `${baseUrl}/${region}/products/${slug}`;
    }
    return '';
  } catch {
    return '';
  }
}


