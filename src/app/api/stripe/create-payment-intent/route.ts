import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { amount, currency, secretKey } = await req.json();

    if (!amount || !currency) {
      return NextResponse.json({ error: 'Missing amount or currency' }, { status: 400 });
    }

    // In a real app, the secretKey should be fetched from the database securely
    // using a storeId or similar identifier passed in the request.
    // For this demonstration, we'll allow it to be passed or use a fallback environment variable.
    const stripeSecret = secretKey || process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecret) {
       return NextResponse.json({ error: 'Stripe is not configured correctly on the server.' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2025-01-27.acacia' as any,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    console.error('Stripe PaymentIntent Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
