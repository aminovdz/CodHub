import { NextResponse } from 'next/server';
import { sendAiSensyAbandonedCart } from '@/lib/actions/funnelActions';

export async function POST(req: Request) {
  try {
    const { storeId, orderId } = await req.json();

    if (!storeId || !orderId) {
      return NextResponse.json({ success: false, error: 'storeId and orderId required' }, { status: 400 });
    }

    const result = await sendAiSensyAbandonedCart(orderId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AiSensy Abandoned Cart API] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
