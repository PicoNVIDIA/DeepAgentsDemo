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
  {
    id: 'fileio',
    name: 'File I/O',
    description: 'Read, write, edit files & search code',
    category: 'tools',
    icon: '📁',
  },
  {
    id: 'execute',
    name: 'Shell Execution',
    description: 'Run shell commands, Python scripts & system tools',
    category: 'tools',
    icon: '💻',
  },
  // Skills (loaded as methodology/instructions)
  {
    id: 'superpowers',
    name: 'Superpowers',
    description: 'TDD, planning & debugging methodology',
    category: 'skills',
    icon: '⚡',
  },
  {
    id: 'cudf',
    name: 'cuDF',
    description: 'GPU-accelerated DataFrames (NVIDIA RAPIDS)',
    category: 'skills',
    icon: '🟩',
  },
  {
    id: 'code_review',
    name: 'Code Review',
    description: 'Systematic code quality & correctness analysis',
    category: 'skills',
    icon: '🔍',
  },
];

// Coming soon — will be wired to real backends (MCP, skills, etc.)
export const comingSoonSkills: Array<{ name: string; icon: string; description: string }> = [
  { name: 'RAG', icon: '📚', description: 'Retrieval-augmented generation' },
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
