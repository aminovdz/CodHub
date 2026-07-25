export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  previewDataInstructions?: string;
  requiresValidation?: boolean;
  execute?: (data: any, context: any) => Promise<any> | any;
  preProcess?: (content: string, context: any) => Promise<string> | string;
}

export interface AgentConfig {
  id: string;
  name: string;
  iconName?: string;
  description: string;
  promptRole: string;
  systemPrompt?: string;
  skills: string[];
}
