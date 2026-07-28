import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rateLimit';

// Knowledge cache per store ID — avoids DB round trips on every message
const knowledgeCache = new Map<string, { systemPrompt: string; storeName: string; currency: string; botName: string; timestamp: number }>();
const KNOWLEDGE_CACHE_TTL = 120_000; // 2 minutes

function getCacheKey(storeId: string, region: string | undefined) {
  return storeId || `region:${region}`;
}

async function getStoreKnowledge(storeId: string, region: string | undefined) {
  const cacheKey = getCacheKey(storeId, region);
  const cached = knowledgeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < KNOWLEDGE_CACHE_TTL) {
    return cached;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  // 1. Fetch store config (only needed fields)
  let query = supabase.from('stores').select('id, name, currency, language, whatsapp_config');
  if (storeId) {
    query = query.eq('id', storeId);
  } else if (region) {
    query = query.ilike('region', region);
  }

  const { data: store, error: storeError } = await query.single();
  if (storeError || !store) {
    return null;
  }

  const config = store.whatsapp_config || {};
  if (!config.chatbotEnabled) {
    return { disabled: true } as any;
  }

  // 2. Fetch products + zones in parallel
  const [productsRes, zonesRes] = await Promise.all([
    supabase.from('products').select('title, price, short_desc, description').eq('store_id', store.id).eq('active', true),
    supabase.from('shipping_zones').select('wilaya, commune, home_delivery_rate, desk_delivery_rate, estimated_days').eq('store_id', store.id).eq('active', true),
  ]);

  // 3. Compile knowledge into a compact system prompt
  const botName = config.chatbotName || 'Assistant';
  const currency = store.currency || 'DZD';
  const customInstructions = config.chatbotInstructions || '';

  const productsList = (productsRes.data || [])
    .map((p: any) => `- ${p.title}: ${p.price} ${currency}. ${(p.short_desc || p.description || '').slice(0, 80)}`)
    .join('\n');

  const shippingList = (zonesRes.data || [])
    .map((sz: any) => `- ${sz.wilaya}${sz.commune ? ` (${sz.commune})` : ''}: ${sz.home_delivery_rate} ${currency}`)
    .join('\n');

  const storeLanguage = store.language || 'en';
  const lang = `Default language: ${storeLanguage.toUpperCase()}. Match customer's language if different.`;

  const systemPrompt = `You are "${botName}" for ${store.name}. Answer ONLY about products & delivery.

${lang}

Products:
${productsList || 'None available.'}

Shipping:
${shippingList || 'Nationwide — contact support for rates.'}

${customInstructions}`;

  const knowledge = {
    systemPrompt,
    storeName: store.name,
    currency,
    botName,
    config,
    timestamp: Date.now(),
  };
  knowledgeCache.set(cacheKey, knowledge);
  return knowledge;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`chat_${ip}`, 10, 60 * 1000); // 10 messages per minute
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { messages, storeId, region } = await req.json();

    if (!storeId && !region) {
      return NextResponse.json({ error: 'Missing storeId or region' }, { status: 400 });
    }

    const knowledge = await getStoreKnowledge(storeId, region);
    if (!knowledge) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    if ((knowledge as any).disabled) {
      return NextResponse.json({ error: 'Chatbot is disabled for this store' }, { status: 403 });
    }

    const { systemPrompt, storeName, currency, botName } = knowledge as NonNullable<typeof knowledge>;

    // Send to LLM
    const provider_ = knowledge.config.chatbotProvider || 'gemini';
    const keyMap: Record<string, string | undefined> = {
      gemini: process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      claude: process.env.CLAUDE_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
      nvidia: process.env.NVIDIA_API_KEY,
    };
    const apiKey = (knowledge.config.chatbotApiKey || keyMap[provider_] || '').trim();

    if (!apiKey) {
      return NextResponse.json({ error: `API Key for provider ${provider_} not configured in chatbot settings or environment variables.` }, { status: 500 });
    }

    // Build a streaming response
    const encoder = new TextEncoder();

    if (provider_ === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

      const contents = [
        {
          role: 'user',
          parts: [{ text: `System: ${systemPrompt}` }]
        },
        {
          role: 'model',
          parts: [{ text: `Understood.` }]
        }
      ];

      (messages || []).forEach((m: any) => {
        const parts: any[] = [{ text: m.content }];
        
        if (m.imageUrl && m.imageUrl.startsWith('data:image/')) {
          try {
            const [metadata, base64Data] = m.imageUrl.split(',');
            const mimeTypeMatch = metadata.match(/:(.*?);/);
            if (mimeTypeMatch && mimeTypeMatch[1] && base64Data) {
              parts.push({
                inlineData: {
                  mimeType: mimeTypeMatch[1],
                  data: base64Data
                }
              });
            }
          } catch (e) {
            console.error("Failed to parse image for Gemini", e);
          }
        }

        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: parts
        });
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.4 } })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini Chatbot API Error:", errText);
        let errMsg = 'Gemini generation failed';
        try { const parsed = JSON.parse(errText); errMsg = parsed.error?.message || errText; } catch(e) {}
        return NextResponse.json({ error: `Gemini API Error: ${errMsg}` }, { status: response.status });
      }

      // Stream the SSE response from Gemini
      const reader = response.body?.getReader();
      if (!reader) {
        return NextResponse.json({ error: 'Failed to read response stream' }, { status: 500 });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr || jsonStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                      controller.enqueue(encoder.encode(JSON.stringify({ text }) + '\n'));
                    }
                  } catch { /* skip malformed chunks */ }
                }
              }
            }
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'x-chatbot-name': botName,
        },
      });
    } 
    else {
      // Non-Gemini providers — wrap in a simple stream
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map((m: any) => ({ role: m.role, content: m.content }))
      ];

      let endpoint = '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: any = {};

      if (provider_ === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = { model: 'gpt-4o-mini', messages: formattedMessages, temperature: 0.4, stream: true };
      } else if (provider_ === 'claude') {
        endpoint = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: systemPrompt,
          messages: (messages || []).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          temperature: 0.4,
          stream: true,
        };
      } else if (provider_ === 'nvidia') {
        endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: knowledge.config.chatbotModel || 'meta/llama-3.1-405b-instruct',
          messages: formattedMessages,
          temperature: 0.4,
          stream: true,
        };
      } else {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: knowledge.config.chatbotModel || 'google/gemini-2.0-flash-exp:free',
          messages: formattedMessages,
          temperature: 0.4,
          stream: true,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `${provider_} generation failed`;
        try { const parsed = JSON.parse(errText); errMsg = parsed.error?.message || errText; } catch(e) {}
        return NextResponse.json({ error: `${provider_} API Error: ${errMsg}` }, { status: response.status });
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return NextResponse.json({ error: 'Failed to read response stream' }, { status: 500 });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr || jsonStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(jsonStr);
                    let text = '';
                    if (provider_ === 'claude') {
                      if (parsed.type === 'content_block_delta') text = parsed.delta?.text || '';
                    } else {
                      text = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
                    }
                    if (text) {
                      controller.enqueue(encoder.encode(JSON.stringify({ text }) + '\n'));
                    }
                  } catch { /* skip */ }
                }
              }
            }
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'x-chatbot-name': botName,
        },
      });
    }
  } catch (error: any) {
    console.error('Chatbot API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
