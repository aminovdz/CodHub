import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

import { saveDraftOrder, submitOrder } from './src/lib/actions/funnelActions';

async function run() {
  try {
    const draftId = await saveDraftOrder({
      id: null,
      name: 'Test Customer',
      phone: '0555555555',
      region: 'dz',
      step: 'Checkout'
    });
    console.log("Draft Result:", draftId);
    
    if (draftId.orderId) {
      await submitOrder(draftId.orderId, 'dz', {
        customerName: 'Test Customer',
        phone: '0555555555',
        address: { wilaya: 'Alger', commune: 'Alger Centre', address: 'Rue Didouche Mourad' },
        instructions: 'Call before delivery',
        cart: [{ id: 'test', name: 'Test Product', price: 5000, isUpsell: false }],
        total: 5000,
        discountAmount: 0,
        deliveryRate: 0,
        couponCode: '',
        customFields: {},
        source: 'direct',
        utmCampaign: 'test'
      });
      console.log("Order Submitted successfully");
    }
  } catch (e) {
    console.error("Failed:", e);
  }
}

run();
