import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, message, provider, senderId } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing to or message' }, { status: 400 });
    }

    // Mock API call to Twilio / Vonage / SMSDZ
    console.log(`[SMS_MOCK] Sending via ${provider || 'twilio'}`);
    console.log(`[SMS_MOCK] From: ${senderId || 'CODHUB'}`);
    console.log(`[SMS_MOCK] To: ${to}`);
    console.log(`[SMS_MOCK] Message: ${message}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ 
      success: true, 
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'queued'
    });

  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
