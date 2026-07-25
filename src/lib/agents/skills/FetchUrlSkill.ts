import { AgentSkill } from '../types';

export const FetchUrlSkill: AgentSkill = {
  id: 'FETCH_URL',
  name: 'Fetch URL Content',
  description: 'Automatically intercepts URLs in the user prompt and fetches their content with structured product data extraction.',
  instructions: `
  You have the ability to read URLs. If the user provides a URL in their prompt, the system will automatically fetch it and append the content to the prompt inside [Content from URL] blocks.
  
  IMPORTANT: The fetched content includes structured sections:
  - PRODUCT IMAGES: Direct URLs to product images — use these in landing pages and product listings
  - PRODUCT DATA: Title, description, price, rating, and specifications
  - RAW TEXT: Full page text for deeper analysis
  
  You MUST analyze ALL sections of the fetched content to give the most comprehensive response.
  When creating landing pages or product listings, ALWAYS use the actual product images from the URL.
  `,
  requiresValidation: false,
  preProcess: async (content: string, context: any) => {
    let enrichedContent = content;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = enrichedContent.match(urlRegex);
    
    if (urls && urls.length > 0) {
      const fetchedTexts: string[] = [];
      for (const url of urls.slice(0, 3)) {
        try {
          const res = await fetch('/api/ai/fetch-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          
          if (res.ok) {
            const data = await res.json();
            
            // Build structured output sections
            let structured = `[Content from ${url}]\n`;
            structured += `\n📦 PRODUCT DATA:\n`;
            structured += `Title: ${data.title || 'N/A'}\n`;
            structured += `Description: ${data.description || 'N/A'}\n`;
            
            if (data.price) structured += `Price: ${data.price}\n`;
            if (data.rating) structured += `Rating: ${data.rating}\n`;
            if (data.reviewCount) structured += `Reviews: ${data.reviewCount}\n`;
            if (data.seller) structured += `Seller: ${data.seller}\n`;
            if (data.shipping) structured += `Shipping: ${data.shipping}\n`;
            
            if (data.images && data.images.length > 0) {
              structured += `\n🖼️ PRODUCT IMAGES (${data.images.length} found):\n`;
              data.images.forEach((imgUrl: string, i: number) => {
                structured += `Image ${i + 1}: ${imgUrl}\n`;
              });
            }
            
            if (data.specifications && data.specifications.length > 0) {
              structured += `\n📋 SPECIFICATIONS:\n`;
              data.specifications.forEach((spec: string) => {
                structured += `- ${spec}\n`;
              });
            }
            
            structured += `\n📄 RAW TEXT:\n${(data.text || '').slice(0, 8000)}\n`;
            structured += `[/Content]`;
            
            fetchedTexts.push(structured);
          }
        } catch (error) {
          console.error(`Failed to fetch URL ${url}`, error);
        }
      }
      if (fetchedTexts.length > 0) {
        enrichedContent += '\n\n--- WEB CONTENT FETCHED FROM URLS ---\n' + fetchedTexts.join('\n\n');
      }
    }
    
    return enrichedContent;
  }
};
