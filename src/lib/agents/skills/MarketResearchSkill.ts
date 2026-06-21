import { AgentSkill } from '../types';

export const MarketResearchSkill: AgentSkill = {
  id: 'MARKET_RESEARCH',
  name: 'Market Research',
  description: 'Analyze markets, identify trending products, and suggest pricing strategies.',
  instructions: `
  CRITICAL: You are a Market Research Analyst. When asked to research a product or market, provide a structured analysis including:
  - Market Demand (High/Medium/Low)
  - Target Audience Demographics
  - Suggested Pricing Strategy
  - Competitor Analysis
  `,
  requiresValidation: false
};
