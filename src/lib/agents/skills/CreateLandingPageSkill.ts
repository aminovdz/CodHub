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
  Explicitly define the strategy using the **AIDA Framework (Attention, Interest, Desire, Action)**:
  1. **Attention**: The psychological hook, massive promise, and hero section strategy.
  2. **Interest**: How to agitate the problem and introduce the product as the definitive solution.
  3. **Desire**: The core benefits, trust triggers, social proof, and emotional payoffs.
  4. **Action**: The specific Call-to-Action (CTA), pricing presentation, and urgency elements.
  Output this AIDA strategy clearly inside a markdown block labeled "### PHASE 1 EXECUTION: GENERATED AIDA CRO STRATEGY" within your JSON "message" field.

  ### PHASE 2: LAUNCH PROPOSAL (Trigger the "CREATE_LANDING_PAGE" action)
  You MUST trigger the "CREATE_LANDING_PAGE" action to pass your strategy to the background HTML generator.
  The background system will read your generated CRO STRATEGY from Phase 1 and automatically generate the perfect HTML landing page.
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
