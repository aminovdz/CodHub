import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { provider, credentials } = data;

    if (provider === 'yalidine') {
      const { apiKey, apiToken } = credentials;
      
      if (!apiKey || !apiToken) {
        return NextResponse.json({ success: false, error: 'API Key and Token are required' }, { status: 400 });
      }

      // Test Yalidine connection by fetching a lightweight endpoint (e.g. wilayas)
      const response = await fetch('https://api.yalidine.app/v1/wilayas/?page_size=1', {
        method: 'GET',
        headers: {
          'X-API-ID': apiKey,
          'X-API-TOKEN': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ success: false, error: 'Invalid Yalidine credentials. ' + errorText }, { status: response.status });
      }

      return NextResponse.json({ success: true, message: 'Yalidine Connection Successful!' });
    }

    if (provider === 'zrexpress') {
      const { apiKey, apiToken, branchId } = credentials;
      
      if (!apiKey || !apiToken) {
        return NextResponse.json({ success: false, error: 'API Key and Token are required' }, { status: 400 });
      }

      // Placeholder for ZR Express test until endpoint is confirmed
      return NextResponse.json({ success: false, error: 'ZR Express testing is not fully implemented yet.' }, { status: 501 });
    }

    return NextResponse.json({ success: false, error: 'Unknown provider' }, { status: 400 });
  } catch (err: any) {
    console.error('Fulfillment test error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
