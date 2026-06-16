import { NextResponse } from 'next/server';

const TT_API = 'https://business-api.tiktok.com/open_api/v1.3';

export async function POST(req: Request) {
  try {
    const { action, accessToken, advertiserId, campaignId, adgroupId, adId, status, budget, name, objective, page, pageSize, adName, adCreative } = await req.json();

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

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('TikTok Ads API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
