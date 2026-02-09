export interface ModelDef {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  icon: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  subtleColor: string;
  backendModel: string;
}

export const models: ModelDef[] = [
  {
    id: 'nemotron',
    name: 'Nemotron',
    provider: 'NVIDIA',
    tagline: 'NVIDIA\'s flagship reasoning model',
    icon: '🟢',
    primaryColor: '#76B900',
    accentColor: '#8dc63f',
    glowColor: 'rgba(118, 185, 0, 0.4)',
    subtleColor: 'rgba(118, 185, 0, 0.1)',
    backendModel: 'nvidia/llama-3.1-nemotron-70b-instruct',
  },
  {
    id: 'llama',
    name: 'Llama',
    provider: 'Meta',
    tagline: 'Meta\'s open-weight powerhouse',
    icon: '🦙',
    primaryColor: '#0668E1',
    accentColor: '#1877F2',
    glowColor: 'rgba(6, 104, 225, 0.4)',
    subtleColor: 'rgba(6, 104, 225, 0.1)',
    backendModel: 'meta/llama-3.3-70b-instruct',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    tagline: 'Deep reasoning & code specialist',
    icon: '🔮',
    primaryColor: '#4D6BFE',
    accentColor: '#7B8FFE',
    glowColor: 'rgba(77, 107, 254, 0.4)',
    subtleColor: 'rgba(77, 107, 254, 0.1)',
    backendModel: 'deepseek-ai/deepseek-r1-distill-llama-70b',
  },
  {
    id: 'claude',
    name: 'Claude',
    provider: 'Anthropic',
    tagline: 'Thoughtful & articulate assistant',
    icon: '🧡',
    primaryColor: '#D97757',
    accentColor: '#E8956A',
    glowColor: 'rgba(217, 119, 87, 0.4)',
    subtleColor: 'rgba(217, 119, 87, 0.1)',
    backendModel: 'meta/llama-3.3-70b-instruct', // Fallback until Anthropic key added
  },
];
