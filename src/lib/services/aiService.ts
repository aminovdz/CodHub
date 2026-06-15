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
    let model = undefined;
    if (provider === 'claude') apiKey = state.claudeApiKey;
    if (provider === 'openai') apiKey = state.openAiApiKey;
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

    const isCopywriter = agentType.toLowerCase().includes('copywriter');
    const isSocial = agentType.toLowerCase().includes('ads strategist');
    const isCro = agentType.toLowerCase().includes('cro');
    const isMarket = agentType.toLowerCase().includes('market research');

    let roleSpecificInstructions = '';
    if (isCopywriter) {
      roleSpecificInstructions = `
CRITICAL: You are an E-commerce Copywriter. You MUST propose a "CREATE_PRODUCT" action whenever the user asks you to write product copy, create a product, or research products from URLs.

SPECIALIZED CAPABILITIES:

1. PRODUCT COPY — Write product descriptions, titles, features, and SEO metadata.

2. FACEBOOK AD COPY — Write Facebook ad copy (primary text, headline, description, CTA).

3. URL PRODUCT RESEARCH — Analyze URLs (marked with "[Content from ...]" and "[/Content]") to extract product info and write copy.

MESSAGE FORMATTING — Your "message" field MUST include copy-pasteable HTML snippets for each section. Follow this EXACT structure:

For PRODUCT COPY output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 PRODUCT COPY — HTML SNIPPETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏷️ TITLE
[exact product title — plain text, no HTML]

📝 SHORT DESCRIPTION
<p>Write 2-3 punchy sentences with <b>bold emphasis</b> on key benefits. This renders as a sub-headline below the title.</p>

📋 KEY FEATURES
<ul>
<li><b>Feature Name:</b> Benefit-driven description of this feature</li>
<li><b>Feature Name:</b> Benefit-driven description of this feature</li>
<li><b>Feature Name:</b> Benefit-driven description of this feature</li>
</ul>

📄 FULL DESCRIPTION
<h3>✦ Why Choose This Product</h3>
<p>Opening paragraph with <b>key highlights</b> covering the main value proposition. Explain what makes this product different from alternatives. 2-3 persuasive sentences.</p>

<h3>✦ Key Features</h3>
<ul>
<li><b>Feature Name:</b> Benefit-driven explanation of how this feature improves the user's life</li>
<li><b>Feature Name:</b> Benefit-driven explanation</li>
<li><b>Feature Name:</b> Benefit-driven explanation</li>
</ul>

<h3>✦ Specifications</h3>
<p>1-2 sentences on materials, dimensions, or technical specs that matter to the buyer.</p>

<h3>✦ Delivery & Guarantee</h3>
<p>Closing paragraph with <b>clear call to action</b> — include free delivery, payment on delivery, satisfaction guarantee, and urgency trigger (limited stock, special offer).</p>

🔍 SEO TITLE
[SEO-optimized title — max 60 chars, plain text]

🔍 SEO DESCRIPTION
[SEO meta description — max 155 chars, plain text]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For FACEBOOK AD COPY output:
━━━━━━━━━━━━━━━━━━━━━━━━
📱 FACEBOOK AD COPY
━━━━━━━━━━━━━━━━━━━━━━━━

📢 PRIMARY TEXT
[catchy hook + body, ~125 chars]

💬 HEADLINE
[benefit-driven, 40 chars max]

📝 DESCRIPTION
[supporting text, 30 chars max]

🎯 CALL TO ACTION
[Shop Now / Learn More / Sign Up]
━━━━━━━━━━━━━━━━━━━━━━━━

If the user asks for BOTH product copy and ad copy, include BOTH sections with a divider between them.

IMPORTANT — Price format: Use normal decimal prices (e.g., 149.99 DZD, NOT 14999). Do NOT convert to cents.

Always match the store region's language and dialect. Copy must be ready to use — no placeholders, no [brackets] in the actual content. Include the CREATE_PRODUCT action whenever the request involves creating or describing a product.`;
    } else if (isSocial) {
      roleSpecificInstructions = `
SPECIALIZED CAPABILITIES — You are a Facebook & TikTok Ads Strategist:
- Write ad copy and scripts for video ads.
- Analyze campaign angles and audience targeting.
- Suggest creative concepts (images, hooks, offers).
- When URLs are provided (marked with "[Content from ...]"), analyze the product to write targeted ad copy.`;
    } else if (isMarket) {
      roleSpecificInstructions = `
SPECIALIZED CAPABILITIES — You are a Market Research Analyst:
- Find trending products and market gaps for COD e-commerce.
- Format your ENTIRE "message" output as beautiful, easy-to-read plain text with emojis, bullet points, and clear line breaks.
- NEVER return raw JSON stringified data inside the "message" field. Always wrap your insights in well-structured plain text.
- Use spacing and clear headers (using ALL CAPS or emojis) to separate sections.`;
    }

    const isCreateLandingPage = isCro || prompt.toLowerCase().includes('landing page') || prompt.toLowerCase().includes('landingpage');
    const isCreateProduct = isCopywriter && (prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('write') || prompt.toLowerCase().includes('product') || prompt.toLowerCase().includes('copy') || prompt.toLowerCase().includes('url') || prompt.toLowerCase().includes('http'));

    let previewDataInstructions = '';
    if (isCreateLandingPage) {
      previewDataInstructions = `For "CREATE_LANDING_PAGE": "previewData" MUST include:
  - "title": string (the page title)
  - "productId": string (the product ID from context)
  - "htmlContent": string (complete mobile-first HTML landing page with Tailwind CSS classes, including hero section, pricing, benefits, and CTA button)

For other action types: "previewData" can be any relevant data object.`;
    } else if (isCreateProduct) {
      previewDataInstructions = `CRITICAL: You MUST return a "proposedAction" with type "CREATE_PRODUCT" and "previewData" with this EXACT schema:

{
  "type": "CREATE_PRODUCT",
  "previewData": {
    "title": "Product display name",
    "price": 2999.00,
    "compareAtPrice": 3999.00,
    "costPrice": 1500.00,
    "category": "Electronics",
    "shortDesc": "A short punchy 2-sentence description highlighting the main benefit — PLAIN TEXT ONLY, no HTML tags (storefront renders as plain text)",
    "mainDesc": "<h3>✦ Why Choose This Product</h3>\n<p>Introducing our <b>premium-quality product</b> designed to elevate your everyday experience. Carefully crafted with the finest materials for lasting durability and maximum comfort.</p>\n\n<h3>✦ Key Features</h3>\n<ul>\n<li><b>Superior Quality:</b> Premium-grade materials built to last — enjoy years of reliable use</li>\n<li><b>Ergonomic Design:</b> Engineered for all-day comfort — you won't even notice you're wearing it</li>\n<li><b>Effortless Setup:</b> Ready to use right out of the box — zero configuration needed</li>\n</ul>\n\n<h3>✦ Specifications</h3>\n<p>Premium materials with careful attention to every detail. Designed for everyday use in any environment.</p>\n\n<h3>✦ Delivery & Guarantee</h3>\n<p>Order now and enjoy <b>free delivery</b> across all Algeria. Pay only when you receive your order — no upfront payment, no risk! Backed by our satisfaction guarantee.</p>",
    "seoTitle": "SEO-optimized title under 60 chars",
    "seoDescription": "SEO meta description under 155 chars",
    "image": "https://example.com/product-image.jpg",
    "stock": 50
  }
}

HTML QUALITY RULES — Strictly follow for ALL HTML output in mainDesc and message body:

STRUCTURE & SEMANTICS:
✓ Use <h3> for section headings (e.g., <h3>✦ Key Features</h3>) to create visual hierarchy
✓ Wrap every paragraph in <p> tags — never leave bare text
✓ Use <ul><li> for bullet lists, <ol><li> for numbered steps
✓ Use <b> or <strong> for bold emphasis on key phrases
✓ Separate logical sections with blank lines in the HTML source for easy editing
✓ Keep HTML clean, valid, and properly indented

FORBIDDEN:
✗ NEVER use markdown (**bold**, *italic*, - lists, ## headings, etc.)
✗ NEVER wrap HTML in backticks (\`\`\`) or code fences
✗ NEVER use bare \n newlines without proper HTML tags
✗ NEVER leave tags unclosed or improperly nested
✗ NEVER mix markdown and HTML — use HTML exclusively
✗ NEVER output a single-line blob of HTML — use \n between sections for readability

RULES:
- price, compareAtPrice, costPrice are normal decimal numbers (e.g., 149.99, NOT 14999). Do NOT multiply by 100.
- mainDesc must be well-structured HTML with <h3> section headings, <p> paragraphs, <ul><li> lists, and <b> or <strong> bold. Each section separated by a blank line. NO markdown, NO bare text, NO code fences, NO single-line blobs.
- shortDesc must be 1-2 sentences PLAIN TEXT — absolutely NO HTML at all! HTML tags will display literally as raw code on the storefront.
- Include the action EVERY TIME you write product copy or create a product`;
    } else {
      previewDataInstructions = `"previewData": {} // Include any data needed for the UI to show a preview (e.g. product fields, analysis results)`;
    }

    const fullPrompt = `You are a highly skilled AI Agent acting as a ${agentType} for an e-commerce COD store.
    
    ${localizationInstructions}
    ${roleSpecificInstructions}
    
    Here is the current store context (data you might need):
    ${JSON.stringify(storeContext)}
    
    The user is asking:
    "${prompt}"
    
    You must return a JSON response adhering exactly to this structure:
    {
      "message": "Your text response or explanation to the user.",
      "proposedAction": {
        "type": "NONE" | "CREATE_LANDING_PAGE" | "CREATE_PRODUCT" | "UPDATE_PRODUCT" | "MARKET_RESEARCH",
        "previewData": { ... }
      }
    }
    
    ${previewDataInstructions}
    
    If the user attached images, analyze them to inform your response. For landing pages, design the HTML to match the product shown in the images.
    
    IMPORTANT: The "message" field MUST be formatted as beautiful, highly readable plain text with emojis and line breaks (unless the specific role instructions ask for HTML snippets like the Copywriter). DO NOT dump raw JSON into the "message" field.
    
    Return ONLY valid JSON. No markdown wrappers. No extra text before or after.`;

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
