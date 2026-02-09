export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export const skills: Skill[] = [
  // Real working tools
  {
    id: 'websearch',
    name: 'Web Search',
    description: 'Real-time internet search via Tavily',
    category: 'tools',
    icon: '🌐',
  },
];

// Coming soon — will be wired to real backends (MCP, skills, etc.)
export const comingSoonSkills: Array<{ name: string; icon: string; description: string }> = [
  { name: 'Code Interpreter', icon: '💻', description: 'Execute & analyze code' },
  { name: 'RAG', icon: '📚', description: 'Retrieval-augmented generation' },
  { name: 'File I/O', icon: '📁', description: 'Read and write files' },
  { name: 'API Access', icon: '🔌', description: 'Connect to external services' },
  { name: 'Database', icon: '🗄️', description: 'Query structured data' },
  { name: 'Vision', icon: '👁️', description: 'Image understanding' },
  { name: 'MCP Tools', icon: '🔧', description: 'Model Context Protocol integrations' },
];

export const skillCategories = {
  tools: {
    name: 'Tools',
    description: 'Agent capabilities',
  },
} as const;

export type SkillCategory = keyof typeof skillCategories;
