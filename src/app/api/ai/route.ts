import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, type, productData, images, provider = 'gemini', apiKey: reqApiKey, model, messages: incomingMessages, systemPrompt } = await req.json();

    const apiKey = reqApiKey || (
      provider === 'gemini' ? process.env.GEMINI_API_KEY :
      provider === 'claude' ? process.env.CLAUDE_API_KEY :
      provider === 'openai' ? process.env.OPENAI_API_KEY :
      provider === 'openrouter' ? process.env.OPENROUTER_API_KEY :
      provider === 'nvidia' ? process.env.NVIDIA_API_KEY : null
    );
    if (!apiKey) {
      return NextResponse.json(
        { error: `API Key not configured for provider: ${provider}. Please set it in the Admin Settings.` },
        { status: 500 }
      );
    }

    let textOutput = '';

    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      // Build multi-turn contents array
      const contents: any[] = [];

      if (incomingMessages && incomingMessages.length > 0) {
        for (const msg of incomingMessages) {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          const parts: any[] = [{ text: msg.content }];
          if (role === 'user' && msg === incomingMessages[incomingMessages.length - 1] && images && images.length > 0) {
            images.forEach((imgObj: { data: string, mimeType: string }) => {
              parts.push({
                inlineData: {
                  data: imgObj.data.split(',')[1] || imgObj.data,
                  mimeType: imgObj.mimeType || 'image/jpeg'
                }
              });
            });
          }
          contents.push({ role, parts });
        }
      } else {
        const parts: any[] = [{ text: prompt }];
        if (images && images.length > 0) {
          images.forEach((imgObj: { data: string, mimeType: string }) => {
            parts.push({
              inlineData: {
                data: imgObj.data.split(',')[1] || imgObj.data,
                mimeType: imgObj.mimeType || 'image/jpeg'
              }
            });
          });
        }
        contents.push({ role: 'user', parts });
      }

      const requestBody: any = {
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536 }
      };

      if (systemPrompt) {
        requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API Error:", errText);
        let errMsg = 'Gemini generation failed';
        try { const parsed = JSON.parse(errText); errMsg = parsed.error?.message || errText; } catch(e) {}
        return NextResponse.json({ error: `Gemini API Error: ${errMsg}` }, { status: response.status });
      }
      const data = await response.json();
      textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } 
    else if (provider === 'claude') {
      const claudeMessages: any[] = [];

      if (incomingMessages && incomingMessages.length > 0) {
        for (const msg of incomingMessages) {
          const contentBlocks: any[] = [];
          if (msg.role === 'user' && msg === incomingMessages[incomingMessages.length - 1] && images && images.length > 0) {
            images.forEach((imgObj: { data: string, mimeType: string }) => {
              contentBlocks.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: imgObj.mimeType || 'image/jpeg',
                  data: imgObj.data.split(',')[1] || imgObj.data
                }
              });
            });
          }
          contentBlocks.push({ type: "text", text: msg.content });
          claudeMessages.push({ role: msg.role, content: contentBlocks });
        }
      } else {
        const contentBlocks: any[] = [];
        if (images && images.length > 0) {
          images.forEach((imgObj: { data: string, mimeType: string }) => {
            contentBlocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: imgObj.mimeType || 'image/jpeg',
                data: imgObj.data.split(',')[1] || imgObj.data
              }
            });
          });
        }
        contentBlocks.push({ type: "text", text: prompt });
        claudeMessages.push({ role: 'user', content: contentBlocks });
      }

      const claudeBody: any = {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 32768,
        messages: claudeMessages
      };

      if (systemPrompt) {
        claudeBody.system = systemPrompt;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15'
        },
        body: JSON.stringify(claudeBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Claude API Error:", errText);
        let errMsg = 'Claude generation failed';
        try { const parsed = JSON.parse(errText); errMsg = parsed.error?.message || errText; } catch(e) {}
        return NextResponse.json({ error: `Claude API Error: ${errMsg}` }, { status: response.status });
      }
      const data = await response.json();
      textOutput = data.content?.[0]?.text || '';
    }
    else if (provider === 'openai') {
      const openaiMessages: any[] = [];

      if (systemPrompt) {
        openaiMessages.push({ role: 'system', content: systemPrompt });
      }

      if (incomingMessages && incomingMessages.length > 0) {
        for (const msg of incomingMessages) {
          const contentBlocks: any[] = [{ type: "text", text: msg.content }];
          if (msg.role === 'user' && msg === incomingMessages[incomingMessages.length - 1] && images && images.length > 0) {
            images.forEach((imgObj: { data: string, mimeType: string }) => {
              const base64Data = imgObj.data.includes(',') ? imgObj.data : `data:${imgObj.mimeType || 'image/jpeg'};base64,${imgObj.data}`;
              contentBlocks.push({ type: "image_url", image_url: { url: base64Data } });
            });
          }
          openaiMessages.push({ role: msg.role, content: contentBlocks });
        }
      } else {
        const contentBlocks: any[] = [{ type: "text", text: prompt }];
        if (images && images.length > 0) {
          images.forEach((imgObj: { data: string, mimeType: string }) => {
            const base64Data = imgObj.data.includes(',') ? imgObj.data : `data:${imgObj.mimeType || 'image/jpeg'};base64,${imgObj.data}`;
            contentBlocks.push({ type: "image_url", image_url: { url: base64Data } });
          });
        }
        openaiMessages.push({ role: 'user', content: contentBlocks });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          max_tokens: 32768,
          messages: openaiMessages
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenAI API Error:", errText);
        let errMsg = 'OpenAI generation failed';
        try { const parsed = JSON.parse(errText); errMsg = parsed.error?.message || errText; } catch(e) {}
        return NextResponse.json({ error: `OpenAI API Error: ${errMsg}` }, { status: response.status });
      }
      const data = await response.json();
      textOutput = data.choices?.[0]?.message?.content || '';
    }
    else if (provider === 'openrouter') {
      const openRouterMessages: any[] = [];

      if (systemPrompt) {
        openRouterMessages.push({ role: 'system', content: systemPrompt });
      }

      if (incomingMessages && incomingMessages.length > 0) {
        for (const msg of incomingMessages) {
          openRouterMessages.push({ role: msg.role, content: msg.content });
        }
      } else {
        openRouterMessages.push({ role: 'user', content: prompt });
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'COD-Hub'
        },
        body: JSON.stringify({
          model: model || 'meta-llama/llama-3.3-70b-instruct:free',
          max_tokens: 32768,
          messages: openRouterMessages
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter API Error:", errText);
        let errMsg = 'OpenRouter generation failed';
        try { const parsed = JSON.parse(errText); errMsg = parsed.error?.message || errText; } catch(e) {}
        return NextResponse.json({ error: `OpenRouter API Error: ${errMsg}` }, { status: response.status });
      }
      const data = await response.json();
      if (data.error) {
        console.error("OpenRouter returned error in 200 OK:", data.error);
        return NextResponse.json({ error: `OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}` }, { status: 500 });
      }
      textOutput = data.choices?.[0]?.message?.content || '';
    }
    else if (provider === 'nvidia') {
      const nvidiaMessages: any[] = [];

      if (systemPrompt) {
        nvidiaMessages.push({ role: 'system', content: systemPrompt });
      }

      if (incomingMessages && incomingMessages.length > 0) {
        for (const msg of incomingMessages) {
          const contentBlocks: any[] = [{ type: "text", text: msg.content }];
          if (msg.role === 'user' && msg === incomingMessages[incomingMessages.length - 1] && images && images.length > 0) {
            images.forEach((imgObj: { data: string, mimeType: string }) => {
              const base64Data = imgObj.data.includes(',') ? imgObj.data : `data:${imgObj.mimeType || 'image/jpeg'};base64,${imgObj.data}`;
              contentBlocks.push({ type: "image_url", image_url: { url: base64Data } });
            });
          }
          nvidiaMessages.push({ role: msg.role, content: contentBlocks });
        }
      } else {
        const contentBlocks: any[] = [{ type: "text", text: prompt }];
        if (images && images.length > 0) {
          images.forEach((imgObj: { data: string, mimeType: string }) => {
            const base64Data = imgObj.data.includes(',') ? imgObj.data : `data:${imgObj.mimeType || 'image/jpeg'};base64,${imgObj.data}`;
            contentBlocks.push({ type: "image_url", image_url: { url: base64Data } });
          });
        }
        nvidiaMessages.push({ role: 'user', content: contentBlocks });
      }

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'meta/llama-3.1-405b-instruct',
          messages: nvidiaMessages,
          max_tokens: 32768,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("NVIDIA API Error:", errText);
        let errMsg = 'NVIDIA generation failed';
        try { const parsed = JSON.parse(errText); errMsg = parsed.error?.message || errText; } catch(e) {}
        return NextResponse.json({ error: `NVIDIA API Error: ${errMsg}` }, { status: response.status });
      }
      const data = await response.json();
      if (data.error) {
        console.error("NVIDIA returned error in 200 OK:", data.error);
        return NextResponse.json({ error: `NVIDIA Error: ${data.error.message || JSON.stringify(data.error)}` }, { status: 500 });
      }
      textOutput = data.choices?.[0]?.message?.content || '';
    }

    // If the expected output is JSON, try to parse it
    if (type === 'json') {
      try {
        let jsonString = textOutput.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
          jsonString = jsonString.slice(firstBrace, lastBrace + 1);
        }

        try {
          const parsed = JSON.parse(jsonString);
          return NextResponse.json({ result: parsed });
        } catch (initialError) {
          const fixedJson = jsonString.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
            return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
          });
          const noTrailingCommas = fixedJson.replace(/,(\s*[}\]])/g, '$1');
          const parsed = JSON.parse(noTrailingCommas);
          return NextResponse.json({ result: parsed });
        }
      } catch (e) {
        console.error("Failed to parse AI JSON output. Raw text:", textOutput, "Error:", e);
        
        let proposedAction = { type: 'NONE', previewData: {} };
        let message = textOutput;

        try {
          const actionMatch = textOutput.match(/"proposedAction"\s*:\s*({[\s\S]*?(?:}|"})\s*})/);
          if (actionMatch && actionMatch[1]) {
            let actionStr = actionMatch[1].replace(/,(\s*[}\]])/g, '$1');
            proposedAction = JSON.parse(actionStr);
          }
          
          const messageMatch = textOutput.match(/"message"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"proposedAction"|})/);
          if (messageMatch && messageMatch[1]) {
            message = messageMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          }
        } catch (regexError) {
          console.error("Regex fallback also failed", regexError);
        }

        return NextResponse.json({ 
          result: {
            proposedAction,
            message
          }
        });
      }
    }

    return NextResponse.json({ result: textOutput });
    
  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

