import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'codhub_meta_webhook_token';

/**
 * GET: Meta webhook verification challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verification successful.');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Meta Webhook] Verification failed — token mismatch.');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST: Receive delivery status updates from Meta
 * Updates the message_logs table with delivered/read/failed status.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Process each entry in the webhook payload
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // Handle message status updates
        const statuses = value.statuses || [];
        for (const statusObj of statuses) {
          const metaMessageId = statusObj.id;
          const rawStatus = (statusObj.status || '').toUpperCase(); // sent, delivered, read, failed
          const status = ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(rawStatus)
            ? rawStatus
            : 'SENT';

          if (!metaMessageId) continue;

          console.log(`[Meta Webhook] Status update: ${metaMessageId} → ${status}`);

          // Update matching message_log row
          const { error } = await supabase
            .from('message_logs')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('meta_message_id', metaMessageId);

          if (error) {
            console.error(`[Meta Webhook] Failed to update message_logs for ${metaMessageId}:`, error);
          }
        }

        // Optionally handle inbound messages (e.g., customer replies)
        const messages = value.messages || [];
        for (const msg of messages) {
          console.log(`[Meta Webhook] Inbound message from ${msg.from}: ${msg.text?.body || '[non-text]'}`);
          // Future: route to chatbot or agent
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[Meta Webhook] Error processing webhook:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
