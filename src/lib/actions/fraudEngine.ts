'use server';

import { createClient } from '@supabase/supabase-js';

// We need a Service Role client to bypass RLS and perform fraud checks securely on backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calculates Fraud Score S = (50 * BlacklistMatch) + (30 * HistoricalRTO) + (20 * RegionRisk)
 * Threshold: S > 70 -> HIGH_RISK_ADMIN_APPROVAL
 */
export async function calculateFraudScore(phone: string, regionId: string) {
  let score = 0;

  try {
    // 1. Check Blacklist (50 points)
    const { data: blacklistHit } = await supabase
      .from('blacklist')
      .select('phone')
      .eq('phone', phone)
      .single();
    
    if (blacklistHit) {
      score += 50;
    }

    // 2. Check Historical RTO (Return to Origin) -> (max 30 points)
    // Assume > 0 counts as matched
    const { data: rtoHit } = await supabase
      .from('historical_rtos')
      .select('rto_count')
      .eq('phone', phone)
      .single();

    if (rtoHit && rtoHit.rto_count > 0) {
      score += 30;
    }

    // 3. Region Risk Weight -> (max 20 points mapped by weight)
    const { data: regionData } = await supabase
      .from('regions')
      .select('risk_weight')
      .eq('id', regionId)
      .single();
    
    const riskWeight = regionData?.risk_weight || 0;
    score += Math.min(20, Math.floor(20 * riskWeight));

    const status = score > 70 ? 'HIGH_RISK_ADMIN_APPROVAL' : 'PENDING_AGENT_CONFIRMATION';

    return { success: true, score, status };
  } catch (error) {
    console.error('Fraud Engine Error:', error);
    // Fail safe to risk-averse default if DB lookups error out
    return { success: false, score: 100, status: 'HIGH_RISK_ADMIN_APPROVAL' };
  }
}
