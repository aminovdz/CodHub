import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(req: Request) {
  try {
    const { messages, storeId, region } = await req.json();

    if (!storeId && !region) {
      return NextResponse.json({ error: 'Missing storeId or region' }, { status: 400 });
    }

    // 1. Fetch store configuration
    let query = supabase.from('stores').select('*');
    if (storeId) {
      query = query.eq('id', storeId);
    } else if (region) {
      query = query.ilike('region', region);
    }
    
    const { data: store, error: storeError } = await query.single();
    if (storeError || !store) {
      console.error('Chatbot API - Store query error:', storeError);
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const config = store.whatsapp_config || {};
    // Check if chatbot is enabled
    if (!config.chatbotEnabled) {
      return NextResponse.json({ error: 'Chatbot is disabled for this store' }, { status: 403 });
    }

    // 2. Fetch products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .eq('active', true);

    // 3. Fetch shipping zones
    const { data: shippingZones } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('store_id', store.id)
      .eq('active', true);

    // 4. Compile dynamic store knowledge
    const botName = config.chatbotName || 'Assistant';
    const currency = store.currency || 'DZD';
    const customInstructions = config.chatbotInstructions || '';

    const productsList = (products || [])
      .map(p => `- ${p.title}: Price: ${p.price} ${currency}. Description: ${p.short_description || p.description || 'No description available.'}`)
      .join('\n');

    const shippingList = (shippingZones || [])
      .map(sz => `- ${sz.wilaya}${sz.commune ? ` (${sz.commune})` : ''}: Home Delivery: ${sz.home_delivery_rate} ${currency}, Desk Delivery: ${sz.desk_delivery_rate || 'N/A'} ${currency} (Est: ${sz.estimated_days || '2-5'} days)`)
      .join('\n');

    const systemPrompt = `You are a helpful, friendly customer support assistant named "${botName}" for the e-commerce store "${store.name}".
Your absolute priority is to answer customer questions about our PRODUCTS and DELIVERY/SHIPPING ONLY.

CRITICAL INSTRUCTIONS:
1. ONLY answer questions directly related to our products, pricing, shipping times, delivery rates, or return policies.
2. If a customer asks about anything else (e.g. general knowledge, coding, math, personal questions, history, etc.), politely decline and state that you can only help with product inquiries and shipping info.
3. Be polite, concise, and helpful. 
4. Reply in the exact same language/dialect the customer is using (Arabic, Algerian Derja, French, English, Romanian, Spanish, etc.).
5. Do not invent details. If you do not know the answer, politely ask the customer to contact support.

Here is the live store information to base your answers on (Auto-learned knowledge):

=== ACTIVE PRODUCTS ===
${productsList || 'No products are currently available in the catalog.'}

=== SHIPPING & DELIVERY RATES ===
${shippingList || 'Delivery is available nationwide. Contact support for exact rates.'}

=== ADDITIONAL STORE POLICIES / CUSTOM INSTRUCTIONS ===
${customInstructions}
`;

    // Send to LLM
    const provider = config.chatbotProvider || 'gemini';
    const apiKey = config.chatbotApiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : '');

    if (!apiKey) {
      return NextResponse.json({ error: `API Key for provider ${provider} not configured in chatbot settings.` }, { status: 500 });
    }

    let botResponse = '';

    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      // Structure messages for Gemini API
      // Format history properly: { role: 'user' | 'model', parts: [{ text: string }] }
      const contents = [
        {
          role: 'user',
          parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}` }]
        },
        {
          role: 'model',
          parts: [{ text: `Understood. I will act as "${botName}", answer only product and delivery questions, and follow all instructions.` }]
        }
      ];

      (messages || []).forEach((m: any) => {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.4 } })
      });

      if (!response.ok) {
        console.error("Gemini Chatbot API Error:", await response.text());
        return NextResponse.json({ error: 'Gemini generation failed' }, { status: response.status });
      }
      const data = await response.json();
      botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } 
    else {
      // Fallback/Mock or OpenAI/Claude/OpenRouter implementation
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map((m: any) => ({ role: m.role, content: m.content }))
      ];

      let endpoint = '';
      if (provider === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
      } else if (provider === 'claude') {
        endpoint = 'https://api.anthropic.com/v1/messages';
      } else {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body = {};

      if (provider === 'openai') {
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: 'gpt-4o-mini',
          messages: formattedMessages,
          temperature: 0.4
        };
      } else if (provider === 'claude') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        body = {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: systemPrompt,
          messages: (messages || []).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          temperature: 0.4
        };
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: formattedMessages,
          temperature: 0.4
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error(`${provider} Chatbot API Error:`, await response.text());
        return NextResponse.json({ error: `${provider} generation failed` }, { status: response.status });
      }

      const data = await response.json();
      if (provider === 'claude') {
        botResponse = data.content?.[0]?.text || '';
      } else {
        botResponse = data.choices?.[0]?.message?.content || '';
      }
    }

    return NextResponse.json({ response: botResponse });
  } catch (error: any) {
    console.error('Chatbot API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
