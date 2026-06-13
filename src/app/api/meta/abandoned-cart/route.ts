import { NextRequest, NextResponse } from 'next/server';
import { sendMetaAbandonedCart } from '@/lib/actions/funnelActions';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const result = await sendMetaAbandonedCart(orderId);

    if (result.success) {
      return NextResponse.json({ success: true, metaMessageId: (result as any).metaMessageId });
    } else {
      return NextResponse.json({ success: false, error: (result as any).error }, { status: 500 });
    }
  } catch (err: any) {
    console.error('[Meta Abandoned Cart API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
