import { AgentSkill } from '../types';
import { CreateLandingPageSkill } from './CreateLandingPageSkill';
import { CreateProductSkill } from './CreateProductSkill';
import { FetchUrlSkill } from './FetchUrlSkill';
import { MarketResearchSkill } from './MarketResearchSkill';

const skills: AgentSkill[] = [
  CreateLandingPageSkill,
  CreateProductSkill,
  FetchUrlSkill,
  MarketResearchSkill
];

export const SkillRegistry = {
  getSkill: (id: string): AgentSkill | undefined => {
    return skills.find(s => s.id === id);
  },
  
  getSkills: (ids: string[]): AgentSkill[] => {
    return skills.filter(s => ids.includes(s.id));
  },

  getAllSkills: (): AgentSkill[] => {
    return skills;
  },

  registerDynamicSkill: (skill: AgentSkill) => {
    if (!skills.find(s => s.id === skill.id)) {
      skills.push(skill);
    }
  }
};
