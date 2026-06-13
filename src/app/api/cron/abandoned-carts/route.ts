import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMetaAbandonedCart } from '@/lib/actions/funnelActions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, region, name, whatsapp_config');

    if (storesError) throw storesError;

    let checked = 0;
    let sent = 0;
    let errors: string[] = [];

    for (const store of stores || []) {
      const config = store.whatsapp_config || {};
      if (!config.metaEnabled || !config.metaAbandonedCartTemplateName || !config.abandonedCartEnabled) continue;

      const delayMinutes = config.abandonedCartDelayMinutes || 15;

      const cutoff = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString();

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', store.id)
        .eq('status', 'DRAFT')
        .lt('created_at', cutoff);

      if (!orders || orders.length === 0) continue;

      checked += orders.length;

      for (const order of orders) {
        try {
          const result = await sendMetaAbandonedCart(order.id);
          if (result.success) {
            sent++;
          } else {
            errors.push(`Order ${order.id}: ${result.error}`);
          }
        } catch (e: any) {
          errors.push(`Order ${order.id}: ${e.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      sent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[Cron Abandoned Carts] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
