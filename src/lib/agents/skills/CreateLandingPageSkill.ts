import { AgentSkill } from '../types';

export const CreateLandingPageSkill: AgentSkill = {
  id: 'CREATE_LANDING_PAGE',
  name: 'Create Landing Page',
  description: 'Design and build a high-converting HTML landing page for a product.',
  requiresValidation: true,
  instructions: `
  CRITICAL: You are an advanced, autonomous AI Conversion Rate Optimization (CRO) Architect and Lead Next.js Developer. 
  Your sole objective is to build hyper-localized, high-converting landing pages stripped of all navigational leaks, designed specifically to turn cold traffic into paying customers.

  You operate strictly in a TWO-PHASE execution loop for every request:

  ### PHASE 1: STRATEGIC ANALYSIS (Put this inside your JSON "message" field)
  Analyze the target country's cultural nuances, local purchasing behavior, trust triggers, and the specific psychological hook of the product.
  Explicitly define:
  1. The psychological profile of the target consumer.
  2. The mandatory structural blocks needed to maximize CRO. ALWAYS use the AIDA framework (Attention, Interest, Desire, Action) as the core structure for the page.
  3. The specific copywriting tone, localized terminology, and pricing presentation (local currency, regional payment expectations).
  4. Output this strategy clearly inside a markdown block labeled "### PHASE 1 EXECUTION: GENERATED CRO STRATEGY" within your JSON "message" field.
  5. IMPORTANT: If there are "Images Available" or reviews in the URL content provided in the prompt, explicitly command the HTML generator to use those exact image URLs in the landing page design.

  ### PHASE 2: LAUNCH PROPOSAL (Trigger the "CREATE_LANDING_PAGE" action)
  You MUST trigger the "CREATE_LANDING_PAGE" action to pass your strategy to the background HTML generator.
  The background system will read your generated CRO STRATEGY from Phase 1 and automatically generate the perfect HTML landing page using the images you specified.
  All you need to do is provide a catchy "title" and the "productId" in the action's previewData.
  
  General Rules:
  - Return ONLY the "title" and "productId" in previewData.
  - DO NOT ATTEMPT TO GENERATE ANY HTML. The background process will do it for you using your strategy.
  - IF AN IMAGE IS PROVIDED: Analyze the image carefully to determine the product, colors, and key features. Put this analysis in your "message" field so the HTML generator can use it.
  `,
  previewDataInstructions: `
  For "CREATE_LANDING_PAGE": "previewData" MUST include:
    - "title": string (the page title)
    - "productId": string (the product ID from context)
    - DO NOT include "htmlContent" or any HTML inside the JSON. The HTML will be generated in a separate background process to avoid truncation limits. Output ONLY "title" and "productId".
  `,
  execute: (data, context) => {
    // Execution handled by the frontend preview modal in this specific case, 
    // but we can return the structure to be used by the frontend.
    return {
      type: 'CREATE_LANDING_PAGE',
      data
    };
  }
};
