import { NextResponse } from 'next/server';

const TT_API = 'https://business-api.tiktok.com/open_api/v1.3';

export async function POST(req: Request) {
  try {
    const { action, accessToken, advertiserId, campaignId, adgroupId, adId, status, budget, dailyBudget, name, objective, page, pageSize, adCreative } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing TikTok access token' }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    };

    switch (action) {
      case 'testConnection': {
        const res = await fetch(`${TT_API}/advertiser/info/?advertiser_ids=%5B%22${advertiserId}%22%5D`, { headers });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message || 'Connection failed' }, { status: 400 });
        const info = data.data?.list?.[0];
        return NextResponse.json({ success: true, name: info?.display_name || info?.name, id: advertiserId });
      }

      case 'adAccounts': {
        const res = await fetch(`${TT_API}/advertiser/info/?advertiser_ids=%5B%22${advertiserId}%22%5D`, { headers });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ accounts: data.data?.list || [] });
      }

      case 'campaigns': {
        if (!advertiserId) return NextResponse.json({ error: 'Missing advertiserId' }, { status: 400 });
        const p = page || 1;
        const ps = pageSize || 50;
        const body = {
          advertiser_id: advertiserId,
          page: p,
          page_size: ps,
          filtering: { objective_type: 'ALL' },
          fields: ['campaign_id', 'campaign_name', 'objective_type', 'budget_mode', 'budget', 'status', 'create_time', 'advertiser_id'],
        };
        const res = await fetch(`${TT_API}/campaign/get/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ campaigns: data.data?.list || [] });
      }

      case 'insights': {
        if (!advertiserId) return NextResponse.json({ error: 'Missing advertiserId' }, { status: 400 });
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - 30 * 86400;
        const body = {
          advertiser_id: advertiserId,
          report_type: 'BASIC',
          data_level: 'CAMPAIGN',
          dimensions: ['campaign_id', 'campaign_name'],
          metrics: ['spend', 'impressions', 'clicks', 'cpc', 'ctr', 'cpm', 'reach', 'conversion', 'cost_per_conversion'],
          start_date: thirtyDaysAgo,
          end_date: now,
          page_size: 50,
        };
        const res = await fetch(`${TT_API}/report/integrated/get/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });

        const list = data.data?.list || [];
        const summary = list.reduce((acc: any, row: any) => {
          acc.impressions += parseInt(row.metrics?.impressions || '0');
          acc.clicks += parseInt(row.metrics?.clicks || '0');
          acc.spend += parseFloat(row.metrics?.spend || '0');
          acc.reach += parseInt(row.metrics?.reach || '0');
          acc.conversions += parseInt(row.metrics?.conversion || '0');
          return acc;
        }, { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0 });

        return NextResponse.json({
          insights: list,
          summary: {
            ...summary,
            ctr: summary.impressions > 0 ? ((summary.clicks / summary.impressions) * 100).toFixed(2) : '0',
            cpc: summary.clicks > 0 ? (summary.spend / summary.clicks).toFixed(2) : '0',
            cpm: summary.impressions > 0 ? ((summary.spend / summary.impressions) * 1000).toFixed(2) : '0',
          },
        });
      }

      case 'toggleStatus': {
        if (!advertiserId || !campaignId) return NextResponse.json({ error: 'Missing advertiserId or campaignId' }, { status: 400 });
        if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });
        const body = {
          advertiser_id: advertiserId,
          campaign_ids: [campaignId],
          status: status.toUpperCase(),
        };
        const res = await fetch(`${TT_API}/campaign/update/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case 'updateBudget': {
        if (!advertiserId || !campaignId) return NextResponse.json({ error: 'Missing advertiserId or campaignId' }, { status: 400 });
        const body: any = {
          advertiser_id: advertiserId,
          campaign_ids: [campaignId],
        };
        if (budget) {
          body.budget = budget;
          body.budget_mode = 'BUDGET_MODE_DAY';
        }
        if (status) body.status = status.toUpperCase();
        const res = await fetch(`${TT_API}/campaign/update/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case 'createCampaign': {
        if (!advertiserId || !name || !objective) {
          return NextResponse.json({ error: 'Missing advertiserId, name, or objective' }, { status: 400 });
        }
        const body: any = {
          advertiser_id: advertiserId,
          campaign_name: name,
          objective_type: objective,
          budget_mode: 'BUDGET_MODE_DAY',
          status: 'PAUSED',
        };
        if (budget) body.budget = budget;
        const res = await fetch(`${TT_API}/campaign/create/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true, campaign: data.data });
      }

      // --- Adgroup (Adset) level ---

      case 'adsets': {
        if (!advertiserId || !campaignId) return NextResponse.json({ error: 'Missing advertiserId or campaignId' }, { status: 400 });
        const body = {
          advertiser_id: advertiserId,
          campaign_ids: [campaignId],
          page: page || 1,
          page_size: pageSize || 50,
          fields: ['adgroup_id', 'adgroup_name', 'campaign_id', 'status', 'budget', 'budget_mode', 'optimization_goal', 'bid_type', 'schedule_type', 'schedule_start_date', 'create_time'],
        };
        const res = await fetch(`${TT_API}/adgroup/get/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ adsets: data.data?.list || [] });
      }

      case 'createAdset': {
        if (!advertiserId || !campaignId || !name) return NextResponse.json({ error: 'Missing advertiserId, campaignId, or name' }, { status: 400 });
        const body: any = {
          advertiser_id: advertiserId,
          campaign_id: campaignId,
          adgroup_name: name,
          status: 'PAUSED',
          budget_mode: 'BUDGET_MODE_DAY',
          budget: budget || 5000,
          optimization_goal: objective || 'REACH',
          billing_event: 'IMPRESSIONS',
          bid_type: 'BID_TYPE_FIXED',
          schedule_type: 'SCHEDULE_START_FROM_NOW',
          schedule_start_date: Math.floor(Date.now() / 1000) + 3600,
        };
        if (dailyBudget) body.budget = dailyBudget;
        const res = await fetch(`${TT_API}/adgroup/create/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true, adset: data.data });
      }

      case 'toggleAdsetStatus': {
        if (!advertiserId || !adgroupId) return NextResponse.json({ error: 'Missing advertiserId or adgroupId' }, { status: 400 });
        if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });
        const body = {
          advertiser_id: advertiserId,
          adgroup_ids: [adgroupId],
          status: status.toUpperCase(),
        };
        const res = await fetch(`${TT_API}/adgroup/update/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case 'updateAdsetBudget': {
        if (!advertiserId || !adgroupId) return NextResponse.json({ error: 'Missing advertiserId or adgroupId' }, { status: 400 });
        const body: any = {
          advertiser_id: advertiserId,
          adgroup_ids: [adgroupId],
        };
        if (budget) {
          body.budget = budget;
          body.budget_mode = 'BUDGET_MODE_DAY';
        }
        if (status) body.status = status.toUpperCase();
        const res = await fetch(`${TT_API}/adgroup/update/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      // --- Ad level ---

      case 'ads': {
        if (!advertiserId || !adgroupId) return NextResponse.json({ error: 'Missing advertiserId or adgroupId' }, { status: 400 });
        const body = {
          advertiser_id: advertiserId,
          adgroup_ids: [adgroupId],
          page: page || 1,
          page_size: pageSize || 50,
          fields: ['ad_id', 'ad_name', 'adgroup_id', 'campaign_id', 'status', 'ad_format', 'create_time'],
        };
        const res = await fetch(`${TT_API}/ad/get/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ ads: data.data?.list || [] });
      }

      case 'createAd': {
        if (!advertiserId || !adgroupId || !name) return NextResponse.json({ error: 'Missing advertiserId, adgroupId, or name' }, { status: 400 });
        const body: any = {
          advertiser_id: advertiserId,
          adgroup_id: adgroupId,
          ad_name: name,
          status: 'PAUSED',
          ad_format: 'SINGLE_VIDEO',
          creative_type: 'VIDEO',
          creative: adCreative || {},
        };
        const res = await fetch(`${TT_API}/ad/create/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true, ad: data.data });
      }

      case 'toggleAdStatus': {
        if (!advertiserId || !adId) return NextResponse.json({ error: 'Missing advertiserId or adId' }, { status: 400 });
        if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });
        const body = {
          advertiser_id: advertiserId,
          ad_ids: [adId],
          status: status.toUpperCase(),
        };
        const res = await fetch(`${TT_API}/ad/update/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('TikTok Ads API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
