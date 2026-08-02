import { useAdminStore } from '@/lib/store/useAdminStore';

export interface AIProductDetails {
  shortDesc: string;
  mainDesc: string;
  seoTitle: string;
  seoDescription: string;
  seoSlug: string;
}

export const aiService = {
  getProviderAndKey() {
    const state = useAdminStore.getState();
    const provider = state.aiProvider || 'gemini';
    let apiKey = state.globalApiKey;
    let model = undefined;
    if (provider === 'gemini') {
      model = state.geminiModel || 'gemini-2.0-flash';
    }
    if (provider === 'claude') {
      apiKey = state.claudeApiKey;
      model = state.claudeModel || 'claude-3-5-sonnet-20241022';
    }
    if (provider === 'openai') {
      apiKey = state.openAiApiKey;
      model = state.openAiModel || 'gpt-4o-mini';
    }
    if (provider === 'openrouter') {
      apiKey = state.openRouterApiKey;
      model = state.openRouterModel;
    }
    if (provider === 'nvidia') {
      apiKey = state.nvidiaApiKey;
      model = state.nvidiaModel;
    }
    return { provider, apiKey, model };
  },

  /**
   * Generates product details (descriptions and SEO metadata) in Arabic.
   */
  async generateProductDetails(title: string, category: string, region: string): Promise<AIProductDetails | null> {
    const prompt = `You are a high-level E-commerce Copywriter for the MENA region.
    The target market is primarily ${region === 'dz' ? 'Algeria' : region}.
    Write high-converting, persuasive sales copy IN ARABIC for a product.
    
    Product Title: "${title}"
    Category: "${category}"
    
    Return ONLY a raw JSON object with no markdown formatting or code blocks.
    Structure:
    {
      "shortDesc": "A 2-sentence punchy hook highlighting the main benefit.",
      "mainDesc": "A detailed 3-paragraph HTML description with <b> tags and <ul> bullet points for features.",
      "seoTitle": "SEO optimized title (max 60 chars)",
      "seoDescription": "SEO optimized description (max 150 chars)",
      "seoSlug": "seo-optimized-url-slug-in-english"
    }`;

    try {
      const { provider, apiKey, model } = this.getProviderAndKey();
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'json', provider, apiKey, model })
      });
      
      if (!response.ok) throw new Error('AI API Error');
      
      const data = await response.json();
      return data.result as AIProductDetails;
    } catch (error) {
      console.error('Failed to generate product details:', error);
      return null;
    }
  },

  /**
   * Generates a high-converting Next.js React component for a landing page.
   */
  async generateLandingPage(title: string, region: string, contentStr?: string, languageOverride?: string): Promise<{ componentCode: string; metadata: any } | null> {
    const isArabic = region === 'dz' || region === 'sa' || region === 'ae' || region === 'ma' || region === 'eg';
    const defaultLanguageStr = isArabic ? 'Arabic' : (region === 'ro' ? 'Romanian' : (region === 'es' ? 'Spanish' : (region === 'co' ? 'Spanish' : (region === 'fr' ? 'French' : (region === 'it' ? 'Italian' : 'English')))));
    const languageStr = languageOverride || defaultLanguageStr;
    
    const systemPrompt = `You are a world-class E-commerce CRO (Conversion Rate Optimization) Architect and Senior UI/UX Designer. Your core directive is to generate ultra-premium, high-converting product landing pages that turn cold traffic into buyers.

You will receive a CRO strategy containing product data and direct image URLs. Output ONLY pure, valid HTML wrapped in a single root <div>. Do not wrap it in a React component function, do not add imports, and do not include "export default". Do not use JSX syntax (no className — use standard HTML "class" attribute). Do not explain the code; output only the final HTML structure starting with a <div> wrapper.

### 1. Copywriting Requirements
- Language: Write ALL copy in **${languageStr}**. Even if the provided strategy is in English, you MUST translate and adapt all user-facing text to ${languageStr}.
- Framework: Use the AIDA framework (Attention, Interest, Desire, Action) layered over the PAS formula.
- COD Optimization: Emphasize "Pay Only When You Receive It," "Free Delivery," and "100% Satisfaction Guarantee."
- Feature-to-Benefit Translation: Never list a technical feature without its real-world payoff.
- Formatting: Use short, punchy sentences, active voice, and rich formatting (bold text, bullet points with emojis).

### 2. Premium UI/UX Design Aesthetics (CRITICAL)
- **Visual Excellence**: The design MUST NOT be basic. Use rich, modern tailwind styling. Incorporate vibrant but professional color palettes.
- **Micro-aesthetics**: Use soft drop shadows (\`shadow-xl\`), rounded corners (\`rounded-2xl\`), and subtle background gradients to create depth.
- **Typography**: Use distinct font weights, tracking, and leading to establish a clear visual hierarchy. 

### 3. Localization Requirements
- The target market region is: ${region.toUpperCase()}.
- The language is: ${languageStr}. All copy MUST be highly localized and culturally persuasive.
${(isArabic || languageStr.toLowerCase().includes('arabic')) ? '- Because the language is Arabic, the layout MUST logically accommodate RTL reading patterns. Use Tailwind flex orders or text-right where appropriate. Make sure the font is legible.' : ''}

### 4. Comprehensive CRO Page Structure (MANDATORY)
Follow this strict top-to-bottom structure exactly:
1. **The Above-the-Fold Hook**: Headline, main product image, trust badges, and anchor CTA.
2. **The Agitation & Solution**: Problem, solution, and benefit bullets.
3. **Visual Proof & Authority**: Demonstration images or before/afters.
4. **Aggressive Social Proof**: Photo reviews and testimonials.
5. **Risk Reversal & Scarcity**: Stock indicator or countdown timer, plus guarantee.
6. The Embedded COD Form: Include the exact string \`[CHECKOUT_FORM]\` exactly once. If the provided reference HTML already includes it, DO NOT add a second one. Otherwise, place it at the bottom.

### 5. Technical Execution & Mobile-First (CRITICAL)
- **Mobile First Focus**: 95% of traffic is on mobile devices. Design primarily for mobile viewports using \`flex-col\` and full-width layouts (\`w-full\`). Ensure text is readable on small screens.
- **Touch Targets**: All buttons must have a minimum touch target of \`h-14\`.
- IMPORTANT: Use standard HTML attribute \`class\` (NOT \`className\`).
- No Next.js components: Use standard HTML \`<img>\` tags with \`loading="lazy"\` and Tailwind CSS.

### 6. Output Structure
Begin your response with a brief JSON block wrapped in standard markdown comments \`/* ... */\` at the very top of the file containing:
{
  "core_value_proposition": "A single sentence explaining the main benefit",
  "top_objection_answered": "How you addressed the main buyer hesitation",
  "scarcity_element": "What scarcity/urgency was used",
  "seoTitle": "Optimized meta title",
  "seoDescription": "Optimized meta description"
}
Immediately following this commented block, provide the complete raw HTML code starting with a \`<div>\`.`;

    const userPrompt = `Create this landing page for the product: "${title}" in the region: "${region}".

Here is the strategy/content proposed by the CRO specialist (including image URLs to embed):
${contentStr || 'No specific strategy provided. Create a best-in-class generic template for this product type.'}`;

    try {
      const { provider, apiKey, model } = this.getProviderAndKey();
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: userPrompt }], 
          systemPrompt,
          type: 'text', 
          provider, 
          apiKey, 
          model 
        })
      });
      
      if (!response.ok) throw new Error('AI API Error');
      
      const data = await response.json();
      const rawResult = data.result as string;

      // Extract JSON metadata from the comment block /* ... */
      let metadata = {};
      const commentMatch = rawResult.match(/\/\*([\s\S]*?)\*\//);
      if (commentMatch && commentMatch[1]) {
        try {
          metadata = JSON.parse(commentMatch[1].trim());
        } catch (e) {
          console.error("Failed to parse AI metadata", e);
        }
      }

      // Remove the comment block
      let componentCode = rawResult.replace(/\/\*[\s\S]*?\*\//, '').trim();
      
      // Strip markdown wrapping if AI mistakenly added it (multiple backticks)
      componentCode = componentCode.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();

      // Attempt to extract from return statement
      const returnParenthesesMatch = componentCode.match(/return\s*\(\s*(<[\s\S]+?)\s*\)\s*;/);
      if (returnParenthesesMatch && returnParenthesesMatch[1]) {
        componentCode = returnParenthesesMatch[1];
      } else {
        const returnNoParenthesesMatch = componentCode.match(/return\s*(<[\s\S]+?)\s*;/);
        if (returnNoParenthesesMatch && returnNoParenthesesMatch[1]) {
          componentCode = returnNoParenthesesMatch[1];
        }
      }

      // Fallback: If it's a full file with imports/exports, just grab the first HTML-like tag to the last closing tag.
      // This is a naive but effective heuristic if the AI wraps it in a component.
      if (componentCode.includes('import ') || componentCode.includes('export default') || componentCode.includes('const ')) {
        const firstTagIndex = componentCode.indexOf('<');
        const lastTagIndex = componentCode.lastIndexOf('>');
        if (firstTagIndex !== -1 && lastTagIndex !== -1 && lastTagIndex > firstTagIndex) {
          componentCode = componentCode.substring(firstTagIndex, lastTagIndex + 1);
        }
      }
      // Convert JSX className to standard HTML class (AI may still output className despite instructions)
      componentCode = componentCode.replace(/className=/g, 'class=');

      return { componentCode, metadata };
    } catch (error) {
      console.error('Failed to generate landing page:', error);
      return null;
    }
  },

  /**
   * Analyzes live store data and provides a daily operations brief.
   */
  async generateChiefOfStaffBrief(storeData: any): Promise<string | null> {
    const prompt = `You are the Chief of Staff for a COD E-commerce operation.
    Analyze the following recent data and provide a concise, 3-bullet daily brief.
    Focus on:
    1. 🔴 Critical Actions (High RTO, abandoned carts)
    2. 🟡 In Progress (Orders waiting confirmation)
    3. 🚀 Priorities (What product is doing well)
    
    Format the output in HTML using Tailwind classes (e.g. <div class="p-4 bg-red-50 text-red-700 rounded-lg mb-2">...</div>)
    
    Data:
    ${JSON.stringify(storeData)}
    
    Return ONLY pure HTML. Do not wrap in markdown.`;

    try {
      const { provider, apiKey, model } = this.getProviderAndKey();
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'text', provider, apiKey, model })
      });
      
      if (!response.ok) throw new Error('AI API Error');
      
      const data = await response.json();
      let html = data.result;
      html = html.replace(/\`\`\`html/g, '').replace(/\`\`\`/g, '');
      return html;
    } catch (error) {
      console.error('Failed to generate Chief of Staff brief:', error);
      return null;
    }
  },

  /**
   * Generates budget shifting recommendations based on cross-platform Ad Spend.
   */
  async generateMarketingRecommendations(fbData: any, ttData: any, orderData: any): Promise<string | null> {
    const prompt = `You are a Senior Media Buyer / CMO for an E-commerce store.
    Analyze the recent ad spend and performance data across Facebook and TikTok, alongside the store's order data.
    
    Facebook Data: ${JSON.stringify(fbData)}
    TikTok Data: ${JSON.stringify(ttData)}
    Order Data Summary: ${JSON.stringify(orderData)}
    
    Provide actionable budget recommendations. Focus on comparing Cost Per Acquisition (CPA) and Return on Ad Spend (ROAS) between the two platforms.
    Give 2-3 specific, data-backed recommendations on where to shift budget or what to pause.
    
    Format the output entirely in HTML using Tailwind CSS classes for styling (e.g., use <div class="space-y-3">, <div class="p-4 bg-blue-50 text-blue-800 rounded-xl">, <p class="font-medium">, etc.).
    Do not use markdown. Return ONLY pure HTML.`;

    try {
      const { provider, apiKey, model } = this.getProviderAndKey();
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'text', provider, apiKey, model })
      });
      
      if (!response.ok) throw new Error('AI API Error');
      
      const data = await response.json();
      let html = data.result;
      html = html.replace(/\`\`\`html/g, '').replace(/\`\`\`/g, '');
      return html;
    } catch (error) {
      console.error('Failed to generate marketing recommendations:', error);
      return null;
    }
  },

  async chatWithAgent(agentRole: string, prompt: string, storeContext: any, images?: any[], chatHistory: any[] = []): Promise<{ message: string, proposedAction: any } | null> {
    try {
      const { AGENTS } = require('../agents/agentConfig');
      const { SkillRegistry } = require('../agents/skills/registry');
      const agentConfig = AGENTS.find((a: any) => a.promptRole === agentRole || a.id === agentRole);
      const agentType = agentConfig ? agentConfig.promptRole : agentRole;
      let skills = agentConfig ? SkillRegistry.getSkills(agentConfig.skills) : [];

      const state = useAdminStore.getState();
      const dynamicSkills = state.dynamicSkills || [];
      skills = [...skills, ...dynamicSkills];

      const region = state.activeStore?.region || 'dz';
      const rawLang = storeContext?.storeLanguage || state.activeStore?.language;
      const langMap: Record<string, string> = {
        'ar': 'Arabic',
        'fr': 'French',
        'en': 'English',
        'es': 'Spanish',
        'ro': 'Romanian'
      };
      const explicitLanguage = rawLang ? (langMap[rawLang.toLowerCase()] || rawLang) : null;
      
      let localizationInstructions = '';
      if (region === 'dz') {
        localizationInstructions = `
  CRITICAL LOCALIZATION REQUIREMENT:
  - The target market is Algeria (DZ).
  - Currency: DZD (Algerian Dinar).
  - Language: If the user asks for a specific language (e.g., Arabic, Derja, French), you MUST use it. Otherwise, default to ${explicitLanguage || 'local Algerian Arabic (Derja)'}.
  - Optimize for Cash on Delivery (COD) workflows specific to Algeria (e.g., Yalidine, Nordine, Mayestro delivery).
  `;
      } else if (region === 'ro') {
        localizationInstructions = `
  CRITICAL LOCALIZATION REQUIREMENT:
  - The target market is Romania (RO).
  - Currency: RON (Romanian Leu).
  - Language: If the user asks for a specific language, use it. Otherwise, default to ${explicitLanguage || 'native Romanian'}.
  - Optimize for European COD markets, courier delivery confirmations, and local consumer behavior.
  `;
      } else if (region === 'co') {
        localizationInstructions = `
  CRITICAL LOCALIZATION REQUIREMENT:
  - The target market is Colombia (CO).
  - Currency: COP (Colombian Peso).
  - Language: If the user asks for a specific language, use it. Otherwise, default to ${explicitLanguage || 'local Colombian Spanish'}.
  - Optimize for Latin American Cash on Delivery logistics, local delivery confirmation methods, and consumer trust.
  `;
      } else {
        localizationInstructions = `
  CRITICAL LOCALIZATION REQUIREMENT:
  - Target country/region: ${region.toUpperCase()}.
  - Currency: ${storeContext?.storeCurrency || 'USD'}.
  - Language: If the user asks for a specific language, use it. Otherwise, default to ${explicitLanguage || 'English'}.
  - Always optimize all sales copy, landing pages, and suggestions specifically for this local region, its language, dialect, and cultural preferences.
  `;
      }

      if (explicitLanguage) {
        localizationInstructions += `\n  *** STRICT LANGUAGE DIRECTIVE: The user's prompt overrides default settings! IF the user specifies a language (like Arabic, French, Deridja, etc.), you MUST use their requested language. IF NOT specified, you MUST default to ${explicitLanguage.toUpperCase()}. ***\n`;
      }

      let roleSpecificInstructions = '';
      let previewDataInstructions = '';
      const allowedActionTypes = ['NONE'];

      if (skills.length > 0) {
        roleSpecificInstructions += '\n\nSPECIALIZED CAPABILITIES AND INSTRUCTIONS:\n';
        for (const skill of skills) {
          roleSpecificInstructions += `\n--- SKILL: ${skill.name} ---\n${skill.instructions}\n`;
          allowedActionTypes.push(skill.id);
          
          if (skill.previewDataInstructions) {
            previewDataInstructions += `\n${skill.previewDataInstructions}\n`;
          }
        }
      } else {
        previewDataInstructions = `"previewData": {} // Include any data needed for the UI to show a preview (e.g. product fields, analysis results)`;
      }

      let stringifiedContext = '{}';
      try {
        stringifiedContext = JSON.stringify(storeContext);
      } catch {
        console.warn("Could not stringify store context");
      }

      // Use deep system prompt from agentConfig if available, otherwise build default
      const agentSystemPrompt = agentConfig?.systemPrompt || '';

      // Build the SYSTEM PROMPT (separated from user messages)
      const systemPromptText = `You are a highly skilled AI Agent acting as a ${agentType} for an e-commerce COD store.
      
${agentSystemPrompt}
      
${localizationInstructions}
${roleSpecificInstructions}
      
Here is the current store context (data you might need):
${stringifiedContext}
      
You must return a JSON response adhering exactly to this structure:
{
  "proposedAction": {
    "type": ${allowedActionTypes.map(t => `"${t}"`).join(' | ')},
    "previewData": { ... }
  },
  "message": "Your text response or explanation to the user."
}
      
${previewDataInstructions}
      
If the user attached images, analyze them to inform your response. For landing pages, design the HTML to match the product shown in the images.
      
MISSING INFORMATION RULE:
If the user asks you to perform a task (e.g. create a landing page, write product copy, run an analysis) but does not provide enough details (like the product name, features, or context), DO NOT hallucinate or guess. Instead, set the proposedAction to "NONE" and ask the user clarifying questions in the "message" field. Only proceed with the action once you have the required information.

RESPONSE FORMAT RULES:
1. The "message" field MUST be formatted as beautiful, highly readable text with emojis and line breaks (unless the specific role instructions ask for HTML snippets).
2. DO NOT dump raw JSON into the "message" field.
3. CRITICAL: You MUST use proper JSON escaping for line breaks in the "message" field (use \\n instead of actual physical line breaks).
4. Return ONLY valid JSON. No markdown wrappers. No extra text before or after.`;

      // Build proper multi-turn messages array
      const apiMessages: { role: string; content: string }[] = [];

      if (chatHistory && chatHistory.length > 0) {
        const recentHistory = chatHistory.slice(-10);
        for (const msg of recentHistory) {
          apiMessages.push({
            role: msg.role === 'agent' ? 'assistant' : 'user',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          });
        }
      }

      // Add the current user message
      apiMessages.push({ role: 'user', content: prompt });

      const { provider, apiKey, model } = this.getProviderAndKey();
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: apiMessages,
          systemPrompt: systemPromptText,
          images, 
          type: 'json', 
          provider, 
          apiKey, 
          model 
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI API Error');
      }
      
      const data = await response.json();
      const result = data.result;
      const htmlRaw = result?.proposedAction?.previewData?.htmlContent || result?.proposedAction?.previewData?.htmlBody || result?.proposedAction?.previewData?.html;
      if (result?.proposedAction?.type?.includes('LANDING_PAGE') && htmlRaw) {
        let content = htmlRaw;
        content = content.replace(/^```[a-z]*\n/i, '').replace(/```$/i, '').trim();
        if (content.includes('return')) {
          const returnMatch = content.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?/);
          if (returnMatch && returnMatch[1]) {
            content = returnMatch[1];
          } else {
            const returnMatch2 = content.match(/return\s+([\s\S]*?)\s*;?/);
            if (returnMatch2 && returnMatch2[1]) {
              content = returnMatch2[1];
            }
          }
        }
        if (content.includes('export default') || content.includes('function') || content.includes('import')) {
          const divMatch = content.match(/<div[\s\S]*<\/div>/);
          if (divMatch && divMatch[0]) {
            content = divMatch[0];
          }
        }
        result.proposedAction.previewData.htmlContent = content;
      }
      return result;
    } catch (error: any) {
      console.error('Failed to chat with agent:', error);
      return {
        message: `⚠️ **System Error:**\n${error.message || 'Unknown error occurred during AI processing.'}`,
        proposedAction: { type: 'NONE', previewData: {} }
      };
    }
  }
};

