import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`fulfill_${ip}`, 10, 60 * 1000); // Max 10 per minute per IP
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const data = await request.json();
    const { order, store } = data;

    if (store.region === 'dz') {
      // YALIDINE INTEGRATION
      if (!store.yalidineApiKey || !store.yalidineApiToken) {
        return NextResponse.json({ success: false, error: 'Yalidine API Key/Token not configured in Settings.' }, { status: 400 });
      }

      // Format data for Yalidine
      // According to Yalidine API docs:
      const payload = {
        data: [
          {
            order_id: order.id,
            firstname: order.customer,
            familyname: "", // You could split customer if needed
            contact_phone: order.phone,
            address: order.address,
            to_wilaya_name: order.wilaya,
            to_commune_name: order.commune,
            product_list: order.product,
            price: order.total,
            freeshipping: false,
            is_stopdesk: false,
            has_exchange: false
          }
        ]
      };

      const response = await fetch('https://api.yalidine.app/v1/parcels/', {
        method: 'POST',
        headers: {
          'X-API-ID': store.yalidineApiKey,
          'X-API-TOKEN': store.yalidineApiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Yalidine API Error:', errorText);
        return NextResponse.json({ success: false, error: 'Yalidine API Error: ' + errorText }, { status: response.status });
      }

      const resData = await response.json();
      return NextResponse.json({ success: true, message: 'Order pushed to Yalidine successfully!', data: resData });

    } else {
      // GENERIC WEBHOOK / GOOGLE SHEETS
      if (!store.genericWebhookUrl) {
        return NextResponse.json({ success: false, error: 'Generic Webhook URL not configured in Settings.' }, { status: 400 });
      }

      const response = await fetch(store.genericWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order, storeName: store.name })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ success: false, error: 'Webhook Error: ' + errorText }, { status: response.status });
      }

      return NextResponse.json({ success: true, message: 'Order pushed to Webhook successfully!' });
    }

  } catch (error: any) {
    console.error('Fulfillment error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
