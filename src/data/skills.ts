export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  sampleQuestions?: string[];
}

export const skills: Skill[] = [
  // Real working tools
  {
    id: 'websearch',
    name: 'Web Search',
    description: 'Real-time internet search via Tavily',
    category: 'tools',
    icon: '🌐',
    sampleQuestions: ['What is in the news for today?', "What's new at GTC 2026?"],
  },
  {
    id: 'fileio',
    name: 'File I/O',
    description: 'Read, write, edit files & search code',
    category: 'tools',
    icon: '📁',
    sampleQuestions: ['List all Python files in the workspace', 'List all files in the current folder'],
  },
  {
    id: 'execute',
    name: 'Shell Execution',
    description: 'Run shell commands, Python scripts & system tools',
    category: 'tools',
    icon: '💻',
    sampleQuestions: ['Run nvidia-smi and show GPU status', 'Write and run a Python hello world script'],
  },
  // Skills (loaded as methodology/instructions)
  {
    id: 'superpowers',
    name: 'Superpowers',
    description: 'TDD, planning & debugging methodology',
    category: 'skills',
    icon: '⚡',
    sampleQuestions: ['Help me plan a REST API project with TDD', 'Debug this error using TDD methodology'],
  },
  {
    id: 'cudf',
    name: 'cuDF',
    description: 'GPU-accelerated DataFrames (NVIDIA RAPIDS)',
    category: 'skills',
    icon: '🟩',
    sampleQuestions: ['Show me how to load a CSV with cuDF', 'Use cuDF to generate a dataframe with randomized data'],
  },
  {
    id: 'code_review',
    name: 'Code Review',
    description: 'Systematic code quality & correctness analysis',
    category: 'skills',
    icon: '🔍',
    sampleQuestions: ['Review this code: def add(a,b): return a+b', 'Review this code def is_even(n): return n % 2'],
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
