import { AgentSkill } from '../types';

export const CreateProductSkill: AgentSkill = {
  id: 'CREATE_PRODUCT',
  name: 'Create Product',
  description: 'Write product copy, descriptions, titles, features, and SEO metadata, and create the product in the store.',
  requiresValidation: true,
  instructions: `
  CRITICAL: You MUST propose a "CREATE_PRODUCT" action whenever the user asks you to write product copy, create a product, or research products from URLs.

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
  `,
  previewDataInstructions: `
  CRITICAL: For "CREATE_PRODUCT" you MUST return "previewData" with this EXACT schema and YOU MUST FILL OUT EVERY SINGLE FIELD. Do NOT leave any field missing or blank:
  {
    "title": "Product display name",
    "price": 2999.00,
    "compareAtPrice": 3999.00,
    "costPrice": 1500.00,
    "category": "Electronics",
    "shortDesc": "A short punchy 2-sentence description highlighting the main benefit — PLAIN TEXT ONLY, no HTML tags",
    "mainDesc": "<h3>✦ Why Choose This Product</h3>\\n<p>...</p> (INCLUDE ALL SECTIONS)",
    "seoTitle": "SEO-optimized title under 60 chars",
    "seoDescription": "SEO meta description under 155 chars",
    "seoSlug": "seo-friendly-url-slug-separated-by-hyphens",
    "image": "https://example.com/product-image.jpg",
    "stock": 50
  }

  HTML QUALITY RULES — Strictly follow for ALL HTML output in mainDesc and message body:
  STRUCTURE & SEMANTICS:
  ✓ Use <h3> for section headings
  ✓ Wrap every paragraph in <p> tags
  ✓ Use <ul><li> for bullet lists
  ✓ Use <b> or <strong> for bold emphasis
  ✓ Keep HTML clean, valid, and properly indented
  FORBIDDEN:
  ✗ NEVER use markdown (**bold**, *italic*, - lists, ## headings, etc.)
  ✗ NEVER wrap HTML in backticks (\`\`\`) or code fences
  ✗ NEVER mix markdown and HTML
  `,
  execute: async (data, context) => {
    const { 
      activeStoreId, 
      sessionUser, 
      categories, 
      setCategories, 
      addProduct, 
      addActivityLog 
    } = context;

    const pd = data || {};
    const fallbackSlug = pd.title ? pd.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : ('product-' + Date.now());
    
    const newProduct = {
      id: '',
      storeId: activeStoreId,
      title: pd.title || 'AI Generated Product',
      price: typeof pd.price === 'number' ? pd.price : 0,
      compareAtPrice: pd.compareAtPrice,
      costPrice: pd.costPrice,
      category: pd.category || 'General',
      active: true,
      image: pd.image || '',
      shortDesc: pd.shortDesc || '',
      mainDesc: pd.mainDesc || '',
      stock: typeof pd.stock === 'number' ? pd.stock : 999,
      seoTitle: pd.seoTitle || '',
      seoDescription: pd.seoDescription || '',
      seoSlug: pd.seoSlug ? pd.seoSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : fallbackSlug,
      lowStockThreshold: 5,
      disableOutOfStockPurchases: false,
      disableCoupons: false,
    };

    if (newProduct.category && !categories.some((c: string) => c.toLowerCase() === newProduct.category.toLowerCase())) {
      setCategories((prev: string[]) => [...prev, newProduct.category]);
    }
    
    await addProduct(newProduct as any);
    
    addActivityLog({
      storeId: activeStoreId,
      user: sessionUser,
      action: 'Product Created',
      detail: `Created AI product: ${newProduct.title}`
    });

    return newProduct;
  }
};
