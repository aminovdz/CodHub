import { NextResponse } from 'next/server';
import { getShortOrderId } from '@/lib/idHelper';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { storeName, orderId, total, currency, customer, phone, region, resendApiKey, notifyEmail, type } = data;

    if (!resendApiKey || !notifyEmail) {
      console.warn('RESEND_API_KEY or NOTIFY_EMAIL not provided in payload. Skipping email notification.');
      return NextResponse.json({ success: true, message: 'Email skipped (missing keys in store settings)' });
    }

    const isStockout = type === 'stockout';

    const htmlContent = isStockout ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h2 style="color: #e11d48; margin-top: 0;">🚨 Stockout Alert! 🚨</h2>
        <p style="color: #475569; font-size: 16px;">A product has run out of stock on <strong>${storeName}</strong>.</p>
        <div style="padding: 16px; background: #fff1f2; border-radius: 8px; margin-top: 16px;">
          <p style="margin: 0; color: #be123c; font-weight: bold; font-size: 18px;">Product: ${customer}</p>
        </div>
      </div>
    ` : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h2 style="color: #4f46e5; margin-top: 0;">New Order Received! 🛒</h2>
        <p style="color: #475569; font-size: 16px;">You just received a new Cash on Delivery order on <strong>${storeName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 24px; background: #f8fafc; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Order ID</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${getShortOrderId(orderId)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Customer</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${customer}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Phone</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Total</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold; font-size: 18px;">${total} ${currency}</td>
          </tr>
        </table>

        <div style="margin-top: 24px; text-align: center;">
          <a href="https://yourdomain.com/admin/orders" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View in Dashboard</a>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `COD Hub <onboarding@resend.dev>`,
        to: [notifyEmail],
        subject: isStockout ? `🚨 OUT OF STOCK: ${customer} (${storeName})` : `🚨 New Order: ${total} ${currency} (${storeName})`,
        html: htmlContent
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RESEND API FAILED TO DISPATCH EMAIL:');
      console.error('Status:', response.status);
      console.error('Error Details:', errorText);
      console.error('Check if your Resend API Key is valid and if the notify email is verified on your Resend account (if using onboarding@resend.dev, you can only send to your own registered email).');
      return NextResponse.json({ success: false, error: 'Failed to dispatch email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
