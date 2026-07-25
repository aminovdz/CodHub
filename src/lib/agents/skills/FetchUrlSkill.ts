import { AgentSkill } from '../types';

export const FetchUrlSkill: AgentSkill = {
  id: 'FETCH_URL',
  name: 'Fetch URL Content',
  description: 'Automatically intercepts URLs in the user prompt and fetches their content so you can read them.',
  instructions: `
  You have the ability to read URLs. If the user provides a URL in their prompt, the system will automatically fetch it and append the content to the prompt inside [Content from URL] blocks. 
  You should analyze the content of these blocks to answer the user's request.
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
          // This assumes the frontend API exists
          const res = await fetch('/api/ai/fetch-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          
          if (res.ok) {
            const data = await res.json();
            const imageList = data.images && data.images.length > 0 ? `\nImages Available:\n${data.images.map((url: string) => `- ${url}`).join('\n')}` : '';
            const snippet = `[Content from ${url}]\nTitle: ${data.title || 'N/A'}\nDescription: ${data.description || 'N/A'}${imageList}\nText: ${(data.text || '').slice(0, 3000)}\n[/Content]`;
            fetchedTexts.push(snippet);
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
