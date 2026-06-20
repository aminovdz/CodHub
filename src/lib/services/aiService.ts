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
      model = state.geminiModel || 'gemini-2.5-flash';
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
  async generateLandingPage(title: string, region: string): Promise<{ componentCode: string; metadata: any } | null> {
    const isArabic = region === 'dz' || region === 'sa' || region === 'ae' || region === 'ma' || region === 'eg';
    const languageStr = isArabic ? 'Arabic' : (region === 'ro' ? 'Romanian' : (region === 'es' ? 'Spanish' : (region === 'co' ? 'Spanish' : (region === 'fr' ? 'French' : (region === 'it' ? 'Italian' : 'English')))));
    
    const prompt = `You are a world-class E-commerce CRO (Conversion Rate Optimization) Architect and Senior UI/UX Designer. Your core directive is to generate ultra-premium, high-converting product landing pages that turn cold traffic into buyers.

You will receive raw product text/data and a list of direct, external Image URLs. Output ONLY pure, valid HTML wrapped in a single root <div>. Do not wrap it in a React component function, do not add imports, and do not include "export default". Do not use JSX syntax (no className — use standard HTML "class" attribute). Do not explain the code; output only the final HTML structure starting with a <div> wrapper.

### 1. Copywriting Requirements
- Language: Write ALL copy in **${languageStr}**.
- Framework: Use the AIDA framework (Attention, Interest, Desire, Action) layered over the PAS (Problem-Agitate-Solution) formula.
- COD Optimization: The store uses Cash on Delivery. Emphasize "Pay Only When You Receive It," "Free Delivery," and "100% Satisfaction Guarantee."
- Feature-to-Benefit Translation: Never list a technical feature without its real-world payoff.
- Formatting: Use short, punchy sentences, active voice, and rich formatting (bold text, bullet points with emojis).

### 2. Premium UI/UX Design Aesthetics (CRITICAL)
- **Visual Excellence**: The design MUST NOT be basic. Use rich, modern tailwind styling. Incorporate vibrant but professional color palettes, sleek dark modes (if appropriate), or clean, highly polished light modes.
- **Micro-aesthetics**: Use soft drop shadows (\`shadow-xl\`, \`shadow-2xl\`), rounded corners (\`rounded-2xl\`, \`rounded-3xl\`), and subtle background gradients (\`bg-gradient-to-br from-gray-50 to-gray-100\`) to create depth.
- **Typography**: Use distinct font weights, tracking, and leading to establish a clear visual hierarchy. Use tight tracking for large headlines (\`tracking-tight\`) and relaxed leading for body text (\`leading-relaxed\`).
- **Layout Patterns**: Use modern grid layouts (\`grid-cols-1 md:grid-cols-2\`) for desktop, and stacked layouts for mobile. Alternate section backgrounds (e.g., white -> very light gray -> brand color) to create visual rhythm.

### 3. Page Structure Requirements
1. **The Hero Section (The Hook)**
   - Striking, full-width or split layout with a prominent product image.
   - Primary Headline: Focus on the ultimate desired result (< 8 words).
   - Sub-headline: Explain how the product achieves the promise.
   - Trust Badges: A row of icons/text beneath the CTA (e.g., "🚚 Free Shipping | 💰 Pay on Delivery | ⭐ 4.9/5 Rating").
   - Action: Include a compelling CTA button that anchors to the checkout form.
2. **The Problem & Solution (PAS) Block**
   - Identify the user's frustration and introduce the product as the definitive solution. Use contrasting colors (e.g., a dark section) to make this stand out.
3. **Feature & Benefit Grid**
   - Extract 3-4 top features and display them in a visually appealing grid (e.g., using cards with icons or emojis).
4. **Social Proof & Validation**
   - Synthesize 3 realistic customer reviews formatted as beautiful testimonial cards with star ratings (⭐⭐⭐⭐⭐).
5. **Interactive Checkout Placement (MANDATORY)**
   - You MUST include the exact string \`[CHECKOUT_FORM]\` where the order form should be rendered. Place it prominently, ideally near the bottom or in a dedicated sticky/floating container on desktop.
6. **FAQ Section**
   - Add a beautifully styled FAQ accordion or list addressing the top 3 objections.

### 4. Technical Execution
${isArabic ? '- **RTL Support**: The language is Arabic. You MUST rely entirely on `text-right` and logical flex reversals (or `rtl:` tailwind prefixes) manually to ensure the page flows correctly from right to left.' : ''}
- IMPORTANT: Use standard HTML attribute \`class\` (NOT \`className\`).
- No Next.js components: Use standard HTML \`<img>\` tags with \`loading="lazy"\` and Tailwind CSS.
- Mobile-First: All buttons must have a minimum touch target of \`h-14\` (56px) and use pulsing or scaling animations on hover (\`hover:scale-105 transition-transform\`).

### 5. Output Structure
Begin your response with a brief JSON block wrapped in standard markdown comments \`/* ... */\` at the very top of the file containing:
{
  "core_value_proposition": "A single sentence explaining the main benefit",
  "top_objection_answered": "How you addressed the main buyer hesitation",
  "scarcity_element": "What scarcity/urgency was used",
  "seoTitle": "Optimized meta title",
  "seoDescription": "Optimized meta description"
}
Immediately following this commented block, provide the complete raw HTML code starting with a \`<div>\`.

Create this for the product: "${title}" in the region: "${region}".`;

    try {
      const { provider, apiKey, model } = this.getProviderAndKey();
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'text', provider, apiKey, model })
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

  async chatWithAgent(agentType: string, prompt: string, storeContext: any, images?: any[], chatHistory: any[] = []): Promise<{ message: string, proposedAction: any } | null> {
    try {
      const state = useAdminStore.getState();
      const region = state.activeStore?.region || 'dz';
      
      let localizationInstructions = '';
      if (region === 'dz') {
        localizationInstructions = `
  CRITICAL LOCALIZATION REQUIREMENT:
  - The target market is Algeria (DZ).
  - Currency: DZD (Algerian Dinar).
  - Language: Use local Algerian Arabic (Derja) phrases interspersed with formal Arabic to build trust.
  - Optimize for Cash on Delivery (COD) workflows specific to Algeria (e.g., Yalidine, Nordine, Mayestro delivery).
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

      const isCopywriter = (agentType || '').toLowerCase().includes('copywriter');
      const isCro = (agentType || '').toLowerCase().includes('cro');
      const isMarket = (agentType || '').toLowerCase().includes('market research');

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
  [e.g., Shop Now, Learn More]
  ━━━━━━━━━━━━━━━━━━━━━━━━
  `;
      } else if (isCro) {
        roleSpecificInstructions = `
  CRITICAL: You are an advanced, autonomous AI Conversion Rate Optimization (CRO) Architect and Lead Next.js Developer. 
  Your sole objective is to build hyper-localized, high-converting landing pages stripped of all navigational leaks, designed specifically to turn cold traffic into paying customers.

  You operate strictly in a TWO-PHASE execution loop for every request:

  ### PHASE 1: STRATEGIC ANALYSIS (Put this inside your JSON "message" field)
  Analyze the target country's cultural nuances, local purchasing behavior, trust triggers, and the specific psychological hook of the product.
  Explicitly define:
  1. The psychological profile of the target consumer.
  2. The mandatory structural blocks needed to maximize CRO.
  3. The specific copywriting tone, localized terminology, and pricing presentation (local currency, regional payment expectations).
  4. Output this strategy clearly inside a markdown block labeled "### PHASE 1 EXECUTION: GENERATED CRO STRATEGY" within your JSON "message" field.

  ### PHASE 2: PRODUCTION-READY HTML (Put this inside your JSON "previewData.htmlContent" field)
  Generate a complete, fully coded, direct-response landing page using pure HTML and Tailwind CSS classes.
  Mandatory Page Requirements:
  1. No Global Navigation or Footer Leaks: Remove standard headers/footers. The user has only two choices: convert or leave.
  2. Perfect Message Match: The Hero headline must mirror the exact hook from the marketing angle.
  3. Localized Social Proof: Testimonials, review names, and cities must reflect realistic profiles from the target region.
  4. Hyper-Visual Value Proposition: Include a pain vs. solution feature grid, clear pricing cards showing the local currency, a device compatibility section, and a conversion-focused FAQ.
  5. Absolute Friction Reduction: CTAs must be sticky, high-contrast, and action-driven. Use "[CHECKOUT_FORM]" as the placeholder for the order form.
  
  General Rules:
  - Return ONLY pure HTML div structures for the htmlContent. NO <html>, <head>, or <body> tags. NO markdown wrappers inside htmlContent.
  - IF AN IMAGE IS PROVIDED: Analyze the image carefully to determine the product, colors, and key features. Use this visual context to generate a highly tailored, visually consistent landing page.
  `;
      } else if (isMarket) {
        roleSpecificInstructions = `
  CRITICAL: You are a Market Research Analyst. When asked to research a product or market, provide a structured analysis including:
  - Market Demand (High/Medium/Low)
  - Target Audience Demographics
  - Suggested Pricing Strategy
  - Competitor Analysis
  `;
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
      "mainDesc": "<h3>✦ Why Choose This Product</h3>\\n<p>Introducing our <b>premium-quality product</b> designed to elevate your everyday experience. Carefully crafted with the finest materials for lasting durability and maximum comfort.</p>\\n\\n<h3>✦ Key Features</h3>\\n<ul>\\n<li><b>Superior Quality:</b> Premium-grade materials built to last — enjoy years of reliable use</li>\\n<li><b>Ergonomic Design:</b> Engineered for all-day comfort — you won't even notice you're wearing it</li>\\n<li><b>Effortless Setup:</b> Ready to use right out of the box — zero configuration needed</li>\\n</ul>\\n\\n<h3>✦ Specifications</h3>\\n<p>Premium materials with careful attention to every detail. Designed for everyday use in any environment.</p>\\n\\n<h3>✦ Delivery & Guarantee</h3>\\n<p>Order now and enjoy <b>free delivery</b> across all Algeria. Pay only when you receive your order — no upfront payment, no risk! Backed by our satisfaction guarantee.</p>",
      "seoTitle": "SEO-optimized title under 60 chars",
      "seoDescription": "SEO meta description under 155 chars",
      "seoSlug": "seo-friendly-url-slug-separated-by-hyphens",
      "image": "https://example.com/product-image.jpg",
      "stock": 50,
      "blocks": [
        {
          "id": "block-1",
          "type": "html",
          "content": "<div class=\\"bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center\\">\\n  <h4 class=\\"text-xl font-black text-slate-900 mb-2\\">Premium Quality Guarantee</h4>\\n  <p class=\\"text-slate-600\\">We stand behind our products 100%.</p>\\n</div>"
        }
      ]
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
  ✗ NEVER use bare \\n newlines without proper HTML tags
  ✗ NEVER leave tags unclosed or improperly nested
  ✗ NEVER mix markdown and HTML — use HTML exclusively
  ✗ NEVER output a single-line blob of HTML — use \\n between sections for readability

  RULES:
  - price, compareAtPrice, costPrice are normal decimal numbers (e.g., 149.99, NOT 14999). Do NOT multiply by 100.
  - mainDesc must be well-structured HTML with <h3> section headings, <p> paragraphs, <ul><li> lists, and <b> or <strong> bold. Each section separated by a blank line. NO markdown, NO bare text, NO code fences, NO single-line blobs.
  - shortDesc must be 1-2 sentences PLAIN TEXT — absolutely NO HTML at all! HTML tags will display literally as raw code on the storefront.
  - Include the action EVERY TIME you write product copy or create a product`;
      } else {
        previewDataInstructions = `"previewData": {} // Include any data needed for the UI to show a preview (e.g. product fields, analysis results)`;
      }

      let stringifiedContext = '{}';
      try {
        stringifiedContext = JSON.stringify(storeContext);
      } catch {
        console.warn("Could not stringify store context");
      }

      let chatHistoryText = '';
      if (chatHistory && chatHistory.length > 0) {
        try {
          const recentHistory = chatHistory.slice(-10);
          chatHistoryText = "Recent conversation history:\n" + recentHistory.map(msg => 
            `[${msg.role === 'user' ? 'User' : 'Agent'}]: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`
          ).join('\n');
        } catch {
          console.warn("Could not format chat history");
        }
      }

      const fullPrompt = `You are a highly skilled AI Agent acting as a ${agentType} for an e-commerce COD store.
      
      ${localizationInstructions}
      ${roleSpecificInstructions}
      
      Here is the current store context (data you might need):
      ${stringifiedContext}
      
      ${chatHistoryText}
      
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
      
      MISSING INFORMATION RULE:
      If the user asks you to perform a task (e.g. create a landing page, write product copy, run an analysis) but does not provide enough details (like the product name, features, or context), DO NOT hallucinate or guess. Instead, set the proposedAction to "NONE" and ask the user clarifying questions in the "message" field. Only proceed with the action once you have the required information.
      
      IMPORTANT: The "message" field MUST be formatted as beautiful, highly readable plain text with emojis and line breaks (unless the specific role instructions ask for HTML snippets like the Copywriter). DO NOT dump raw JSON into the "message" field.
      CRITICAL: You MUST use proper JSON escaping for line breaks in the "message" field (use \\n instead of actual physical line breaks). If you output unescaped physical line breaks inside the JSON string, the parsing will fail.

      Return ONLY valid JSON. No markdown wrappers. No extra text before or after.`;

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
      const result = data.result;
      if (result?.proposedAction?.type === 'CREATE_LANDING_PAGE' && result.proposedAction.previewData?.htmlContent) {
        let content = result.proposedAction.previewData.htmlContent;
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
          const divMatch = content.match(/(<div[\s\S]*<\/div>)/);
          if (divMatch && divMatch[1]) {
            content = divMatch[1];
          }
        }
        result.proposedAction.previewData.htmlContent = content;
      }
      return result;
    } catch (error) {
      console.error('Failed to chat with agent:', error);
      return null;
    }
  }
};
