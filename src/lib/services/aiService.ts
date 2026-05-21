import { useAdminStore } from '@/lib/store/useAdminStore';

export interface AIProductDetails {
  shortDesc: string;
  mainDesc: string;
  seoTitle: string;
  seoDescription: string;
}

export const aiService = {
  getProviderAndKey() {
    const state = useAdminStore.getState();
    const provider = state.aiProvider || 'gemini';
    let apiKey = state.globalApiKey;
    if (provider === 'claude') apiKey = state.claudeApiKey;
    if (provider === 'openai') apiKey = state.openAiApiKey;
    if (provider === 'openrouter') apiKey = state.openRouterApiKey;
    return { provider, apiKey, model: state.openRouterModel };
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
      "seoDescription": "SEO optimized description (max 150 chars)"
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
   * Generates a mobile-first HTML landing page template in Arabic.
   */
  async generateLandingPage(title: string, region: string): Promise<string | null> {
    const prompt = `You are a Conversion Rate Optimization (CRO) expert designing COD (Cash On Delivery) landing pages for ${region === 'dz' ? 'Algeria' : region}.
    Write the content entirely in ARABIC, but for Algeria specifically, use Algerian Dialect (Derja) for the main hooks, headlines, and call-to-actions to maximize conversion.

    Create a high-converting, mobile-first HTML landing page for the product: "${title}".
    Use Tailwind CSS classes for styling.
    
    Structure the HTML exactly like this:
    1. A sticky top banner (e.g. "التوصيل مجاني لجميع الولايات")
    2. A hero section with a large <h1> headline highlighting the main benefit.
    3. A pricing section with a clear "السعر السابق" (strikethrough) and "السعر الحالي".
    4. A PAS (Problem-Agitate-Solution) section with 3 bullet points.
    5. A strong call to action button: "اطلب الآن والدفع عند الاستلام"
    
    Do NOT include <html>, <head>, or <body> tags. Just return the pure HTML content divs. Do NOT wrap in markdown \`\`\`html blocks.
    Make it look extremely premium, using modern padding, rounded corners (rounded-2xl), and shadow (shadow-lg).`;

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
      // Strip markdown wrapping if AI mistakenly added it
      html = html.replace(/\`\`\`html/g, '').replace(/\`\`\`/g, '');
      return html;
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
   * Universal chat method for AI Agents Hub.
   */
  async chatWithAgent(agentType: string, prompt: string, storeContext: any, images?: {data: string, mimeType: string}[]): Promise<any | null> {
    const region = (storeContext?.storeRegion || 'dz').toLowerCase();
    
    let localizationInstructions = "";
    if (region === 'dz') {
      localizationInstructions = `
CRITICAL LOCALIZATION REQUIREMENT:
- The target market is Algeria (DZ).
- Currency: DZD (Algerian Dinar).
- Language/Dialect: Use Algerian Arabic (Derja) for client-facing slogans, copywriting, and landing page headlines to build trust and feel authentic, combined with standard Arabic or French where appropriate.
- Optimize all strategies for Cash On Delivery (COD) in Algeria, accounting for high return-to-origin (RTO) rates and logistics specific to wilayas and communes.
`;
    } else if (region === 'ro') {
      localizationInstructions = `
CRITICAL LOCALIZATION REQUIREMENT:
- The target market is Romania (RO).
- Currency: RON (Romanian Leu).
- Language: Use native Romanian for client-facing copy.
- Optimize for European COD markets, courier delivery confirmations, and local consumer behavior.
`;
    } else if (region === 'co') {
      localizationInstructions = `
CRITICAL LOCALIZATION REQUIREMENT:
- The target market is Colombia (CO).
- Currency: COP (Colombian Peso).
- Language: Use local Colombian Spanish for copywriting and support.
- Optimize for Latin American Cash on Delivery logistics, local delivery confirmation methods, and consumer trust.
`;
    } else {
      localizationInstructions = `
CRITICAL LOCALIZATION REQUIREMENT:
- Target country/region: ${region.toUpperCase()}.
- Currency: ${storeContext?.storeCurrency || 'USD'}.
- Language: ${storeContext?.storeLanguage || 'en'}.
- Always optimize all sales copy, landing pages, and suggestions specifically for this local region, its language, dialect, and cultural preferences.
`;
    }

    const fullPrompt = `You are a highly skilled AI Agent acting as a ${agentType} for an e-commerce COD store.
    
    ${localizationInstructions}
    
    Here is the current store context (data you might need):
    ${JSON.stringify(storeContext)}
    
    The user is asking:
    "${prompt}"
    
    You must return a JSON response adhering exactly to this structure:
    {
      "message": "Your text response or explanation to the user.",
      "proposedAction": {
        "type": "NONE" | "CREATE_LANDING_PAGE" | "UPDATE_PRODUCT" | "MARKET_RESEARCH",
        "previewData": {} // Include any data needed for the UI to show a preview (e.g. html string, product fields, analysis results)
      }
    }
    
    Return ONLY valid JSON. No markdown wrappers.`;

    try {
      const { provider, apiKey, model } = this.getProviderAndKey();
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, images, type: 'json', provider, apiKey, model })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI API Error');
      }
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Failed to chat with agent:', error);
      return null;
    }
  }
};
