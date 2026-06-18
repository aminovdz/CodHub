import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { action, variantId, storeId } = await req.json();

    if (!action || !variantId || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // action can be 'Landing Page View' or 'Landing Page Conversion'
    // We log it in activity_logs
    const { error } = await supabase.from('activity_logs').insert({
      id: crypto.randomUUID(),
      store_id: storeId,
      user: 'system_tracking',
      action: action,
      detail: variantId, // We store the variantId in the detail column
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('Failed to log tracking:', error);
      return NextResponse.json({ error: 'Failed to log tracking' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Tracking API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('storeId');
    const variantIdsParam = url.searchParams.get('variantIds');

    if (!storeId || !variantIdsParam) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const variantIds = variantIdsParam.split(',');

    // Fetch views and conversions for the given variants
    const { data, error } = await supabase
      .from('activity_logs')
      .select('action, detail')
      .eq('store_id', storeId)
      .in('detail', variantIds)
      .in('action', ['Landing Page View', 'Landing Page Conversion']);

    if (error) {
      console.error('Failed to fetch tracking stats:', error);
      return NextResponse.json({ error: 'Failed to fetch tracking stats' }, { status: 500 });
    }

    // Aggregate data
    const stats: Record<string, { views: number, conversions: number }> = {};
    variantIds.forEach(vid => {
      stats[vid] = { views: 0, conversions: 0 };
    });

    data?.forEach(log => {
      if (stats[log.detail]) {
        if (log.action === 'Landing Page View') {
          stats[log.detail].views++;
        } else if (log.action === 'Landing Page Conversion') {
          stats[log.detail].conversions++;
        }
      }
    });

    return NextResponse.json({ success: true, stats });
  } catch (err) {
    console.error('Tracking API GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
