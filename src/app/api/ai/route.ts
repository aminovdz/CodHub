import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, type, productData, images, provider = 'gemini', apiKey: reqApiKey, model } = await req.json();

    const apiKey = reqApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: `API Key not configured for provider: ${provider}. Please set it in the Admin Settings.` },
        { status: 500 }
      );
    }

    let textOutput = '';

    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      const parts: any[] = [{ text: prompt }];
      if (images && images.length > 0) {
        images.forEach((imgObj: { data: string, mimeType: string }) => {
          parts.push({
            inlineData: {
              data: imgObj.data.split(',')[1] || imgObj.data, // remove data:image/jpeg;base64, prefix if present
              mimeType: imgObj.mimeType || 'image/jpeg'
            }
          });
        });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.3 }
        })
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

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 8192,
          messages: [{ role: 'user', content: contentBlocks }]
        })
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
      const contentBlocks: any[] = [{ type: "text", text: prompt }];

      if (images && images.length > 0) {
        images.forEach((imgObj: { data: string, mimeType: string }) => {
          const base64Data = imgObj.data.includes(',') ? imgObj.data : `data:${imgObj.mimeType || 'image/jpeg'};base64,${imgObj.data}`;
          contentBlocks.push({
            type: "image_url",
            image_url: { url: base64Data }
          });
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: contentBlocks }]
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
      // OpenRouter free models don't support image input — send text only
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
          messages: [{ role: 'user', content: prompt }]
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
      const contentBlocks: any[] = [{ type: "text", text: prompt }];

      if (images && images.length > 0) {
        images.forEach((imgObj: { data: string, mimeType: string }) => {
          const base64Data = imgObj.data.includes(',') ? imgObj.data : `data:${imgObj.mimeType || 'image/jpeg'};base64,${imgObj.data}`;
          contentBlocks.push({
            type: "image_url",
            image_url: { url: base64Data }
          });
        });
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
          messages: [{ role: 'user', content: contentBlocks }],
          max_tokens: 8192,
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
        let jsonString = textOutput;

        // Find the first '{' and last '}' to extract just the JSON object
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonString = jsonString.slice(firstBrace, lastBrace + 1);
        }

        // Try to fix common JSON issues: trailing commas before closing brace
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

        // Fix unescaped newlines inside strings
        let inString = false;
        let escapedJson = "";
        for (let i = 0; i < jsonString.length; i++) {
          const char = jsonString[i];
          if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
            inString = !inString;
          }
          if (inString) {
            if (char === '\n') escapedJson += '\\n';
            else if (char === '\r') escapedJson += '\\r';
            else if (char === '\t') escapedJson += '\\t';
            else escapedJson += char;
          } else {
            escapedJson += char;
          }
        }
        jsonString = escapedJson;

        const parsed = JSON.parse(jsonString);
        return NextResponse.json({ result: parsed });
      } catch (e) {
        console.error("Failed to parse AI JSON output. Raw text:", textOutput, "Error:", e);
        // Fallback: Use regex to extract ```json blocks
        const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonMatch && jsonMatch[1]) {
           try {
             let fallbackStr = jsonMatch[1].replace(/,(\s*[}\]])/g, '$1');
             
             let inFallbackString = false;
             let escapedFallback = "";
             for (let i = 0; i < fallbackStr.length; i++) {
               const char = fallbackStr[i];
               if (char === '"' && (i === 0 || fallbackStr[i - 1] !== '\\')) {
                 inFallbackString = !inFallbackString;
               }
               if (inFallbackString) {
                 if (char === '\n') escapedFallback += '\\n';
                 else if (char === '\r') escapedFallback += '\\r';
                 else if (char === '\t') escapedFallback += '\\t';
                 else escapedFallback += char;
               } else {
                 escapedFallback += char;
               }
             }
             fallbackStr = escapedFallback;

             const fallbackParse = JSON.parse(fallbackStr);
             return NextResponse.json({ result: fallbackParse });
           } catch (fallbackErr) {
             console.error("Fallback JSON parse also failed:", fallbackErr);
           }
        }
        return NextResponse.json({ error: `AI returned invalid JSON format. Try a more specific prompt.\n\nRaw Output:\n${textOutput}` }, { status: 500 });
      }
    }

    return NextResponse.json({ result: textOutput });
    
  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
