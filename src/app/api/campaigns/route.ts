import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { storeId, emails, subject, body, apiKey } = await req.json();

    if (!emails || emails.length === 0 || !subject || !body || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Mock Resend API call
    console.log(`[EMAIL_CAMPAIGN_MOCK] Sending to ${emails.length} recipients`);
    console.log(`[EMAIL_CAMPAIGN_MOCK] Subject: ${subject}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ 
      success: true, 
      sentCount: emails.length,
      messageId: `campaign_${Date.now()}`
    });

  } catch (error) {
    console.error('Campaign API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
