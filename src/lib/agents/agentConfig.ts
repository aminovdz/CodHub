import { AgentConfig } from './types';

export const AGENTS: AgentConfig[] = [
  { 
    id: 'cro', 
    name: 'CRO Specialist', 
    iconName: 'Presentation', 
    description: 'Builds high-converting landing pages', 
    promptRole: 'Conversion Rate Optimization (CRO) Expert',
    skills: ['CREATE_LANDING_PAGE']
  },
  { 
    id: 'copywriter', 
    name: 'Copywriter', 
    iconName: 'FileText', 
    description: 'Product copy, Facebook ad copy & URL product research', 
    promptRole: 'E-commerce Copywriter & Facebook Ads Copy Specialist',
    skills: ['CREATE_PRODUCT', 'FETCH_URL']
  },
  { 
    id: 'product', 
    name: 'Product Analyst', 
    iconName: 'ShoppingBag', 
    description: 'Analyzes products and suggests pricing strategies', 
    promptRole: 'E-commerce Product Strategy Analyst',
    skills: ['MARKET_RESEARCH'] // Let's assign it MARKET_RESEARCH for now or NONE
  },
  { 
    id: 'market', 
    name: 'Market Researcher', 
    iconName: 'Search', 
    description: 'Finds trending products and market gaps', 
    promptRole: 'E-commerce Market Research Analyst',
    skills: ['MARKET_RESEARCH']
  },
  { 
    id: 'social', 
    name: 'FB/TikTok Analyst', 
    iconName: 'Megaphone', 
    description: 'Writes ad scripts and analyzes campaign angles', 
    promptRole: 'Facebook & TikTok Ads Strategist',
    skills: []
  }
];
