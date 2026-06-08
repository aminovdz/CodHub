import { NextResponse } from 'next/server';

const FB_GRAPH = 'https://graph.facebook.com/v22.0';

export async function POST(req: Request) {
  try {
    const { action, accessToken, accountId, campaignId, adsetId, adId, status, budget, name, objective, dailyBudget, adCreative } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Meta access token' }, { status: 400 });
    }

    const headers = { 'Content-Type': 'application/json' };

    switch (action) {
      case 'testConnection': {
        const res = await fetch(`${FB_GRAPH}/me?access_token=${accessToken}`, { headers });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Connection failed' }, { status: res.status });
        return NextResponse.json({ success: true, name: data.name, id: data.id });
      }

      case 'adAccounts': {
        const res = await fetch(`${FB_GRAPH}/me/adaccounts?fields=id,name,account_status,currency,amount_spent,balance&access_token=${accessToken}&limit=100`, { headers });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ accounts: data.data || [] });
      }

      case 'campaigns': {
        if (!accountId) return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
        const cleanId = accountId.replace('act_', '');
        const fields = 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,created_time,start_time,ads_count';
        const res = await fetch(`${FB_GRAPH}/act_${cleanId}/campaigns?fields=${fields}&access_token=${accessToken}&limit=100&effective_status=%5B%22ACTIVE%22,%22PAUSED%22%5D`, { headers });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ campaigns: data.data || [] });
      }

      case 'insights': {
        if (!accountId) return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
        const cleanId = accountId.replace('act_', '');
        const { datePreset } = await req.json();
        const preset = datePreset || 'last_30d';
        const fields = 'campaign_name,spend,impressions,clicks,cpc,ctr,cpm,reach,frequency,actions,cost_per_action_type,conversions';
        const res = await fetch(
          `${FB_GRAPH}/act_${cleanId}/insights?fields=${fields}&level=campaign&date_preset=${preset}&access_token=${accessToken}&limit=50`,
          { headers }
        );
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });

        const summary = (data.data || []).reduce((acc: any, row: any) => {
          acc.impressions += parseInt(row.impressions || '0');
          acc.clicks += parseInt(row.clicks || '0');
          acc.spend += parseFloat(row.spend || '0');
          acc.reach += parseInt(row.reach || '0');
          return acc;
        }, { impressions: 0, clicks: 0, spend: 0, reach: 0 });

        return NextResponse.json({
          insights: data.data || [],
          summary: {
            ...summary,
            ctr: summary.impressions > 0 ? ((summary.clicks / summary.impressions) * 100).toFixed(2) : '0',
            cpc: summary.clicks > 0 ? (summary.spend / summary.clicks).toFixed(2) : '0',
            cpm: summary.impressions > 0 ? ((summary.spend / summary.impressions) * 1000).toFixed(2) : '0',
          },
        });
      }

      case 'toggleStatus': {
        if (!campaignId) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
        if (!status) return NextResponse.json({ error: 'Missing status (ACTIVE/PAUSED)' }, { status: 400 });
        const res = await fetch(`${FB_GRAPH}/${campaignId}?fields=id,name,status&access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, campaign: data });
      }

      case 'updateBudget': {
        if (!campaignId) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
        const body: any = {};
        if (dailyBudget) body.daily_budget = dailyBudget;
        if (status) body.status = status;
        const res = await fetch(`${FB_GRAPH}/${campaignId}?access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, campaign: data });
      }

      case 'createCampaign': {
        if (!accountId) return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
        if (!name || !objective) return NextResponse.json({ error: 'Missing name or objective' }, { status: 400 });
        const cleanId = accountId.replace('act_', '');
        const body: any = { name, objective, status: 'PAUSED' };
        if (dailyBudget) body.daily_budget = dailyBudget;
        if (budget) body.daily_budget = budget;
        const res = await fetch(`${FB_GRAPH}/act_${cleanId}/campaigns?access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, campaign: data });
      }

      // --- Adset-level actions ---

      case 'adsets': {
        if (!campaignId) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
        const fields = 'id,name,status,daily_budget,lifetime_budget,budget_remaining,created_time,targeting,optimization_goal,bid_strategy,ads_count';
        const res = await fetch(`${FB_GRAPH}/${campaignId}/adsets?fields=${fields}&access_token=${accessToken}&limit=100&effective_status=%5B%22ACTIVE%22,%22PAUSED%22%5D`, { headers });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ adsets: data.data || [] });
      }

      case 'createAdset': {
        if (!accountId) return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
        if (!campaignId || !name) return NextResponse.json({ error: 'Missing campaignId or name' }, { status: 400 });
        const cleanId = accountId.replace('act_', '');
        const body: any = {
          name,
          campaign_id: campaignId,
          status: 'PAUSED',
          daily_budget: budget || 5000,
          optimization_goal: objective || 'REACH',
          billing_event: 'IMPRESSIONS',
          bid_amount: 100,
          targeting: { geo_locations: { countries: ['DZ'] } },
          start_time: new Date(Date.now() + 86400000).toISOString(),
        };
        if (dailyBudget) body.daily_budget = dailyBudget;
        const res = await fetch(`${FB_GRAPH}/act_${cleanId}/adsets?access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, adset: data });
      }

      case 'toggleAdsetStatus': {
        if (!adsetId) return NextResponse.json({ error: 'Missing adsetId' }, { status: 400 });
        if (!status) return NextResponse.json({ error: 'Missing status (ACTIVE/PAUSED)' }, { status: 400 });
        const res = await fetch(`${FB_GRAPH}/${adsetId}?fields=id,name,status&access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, adset: data });
      }

      case 'updateAdsetBudget': {
        if (!adsetId) return NextResponse.json({ error: 'Missing adsetId' }, { status: 400 });
        const body: any = {};
        if (dailyBudget) body.daily_budget = dailyBudget;
        if (status) body.status = status;
        const res = await fetch(`${FB_GRAPH}/${adsetId}?access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, adset: data });
      }

      // --- Ad-level actions ---

      case 'ads': {
        if (!adsetId) return NextResponse.json({ error: 'Missing adsetId' }, { status: 400 });
        const fields = 'id,name,status,creative,created_time,adset_id,campaign_id';
        const res = await fetch(`${FB_GRAPH}/${adsetId}/ads?fields=${fields}&access_token=${accessToken}&limit=100&effective_status=%5B%22ACTIVE%22,%22PAUSED%22%5D`, { headers });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ ads: data.data || [] });
      }

      case 'createAd': {
        if (!adsetId || !name) return NextResponse.json({ error: 'Missing adsetId or name' }, { status: 400 });
        const body: any = {
          name,
          adset_id: adsetId,
          status: 'PAUSED',
          creative: adCreative || { creative_id: '' },
        };
        const res = await fetch(`${FB_GRAPH}/act_${accountId.replace('act_', '')}/ads?access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, ad: data });
      }

      case 'toggleAdStatus': {
        if (!adId) return NextResponse.json({ error: 'Missing adId' }, { status: 400 });
        if (!status) return NextResponse.json({ error: 'Missing status (ACTIVE/PAUSED)' }, { status: 400 });
        const res = await fetch(`${FB_GRAPH}/${adId}?fields=id,name,status&access_token=${accessToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error?.message }, { status: res.status });
        return NextResponse.json({ success: true, ad: data });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Meta Ads API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
