export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'cuda' | 'ai' | 'tools';
  icon: string;
  color?: string;
}

export const skills: Skill[] = [
  // CUDA Libraries
  {
    id: 'cublas',
    name: 'cuBLAS',
    description: 'GPU-accelerated linear algebra',
    category: 'cuda',
    icon: '⚡',
  },
  {
    id: 'cuopt',
    name: 'cuOpt',
    description: 'Optimization & routing solver',
    category: 'cuda',
    icon: '🎯',
  },
  {
    id: 'cuml',
    name: 'cuML',
    description: 'Machine learning algorithms',
    category: 'cuda',
    icon: '🧠',
  },
  {
    id: 'cudnn',
    name: 'cuDNN',
    description: 'Deep neural network primitives',
    category: 'cuda',
    icon: '🔮',
  },
  {
    id: 'tensorrt',
    name: 'TensorRT',
    description: 'High-performance inference',
    category: 'cuda',
    icon: '🚀',
  },
  {
    id: 'cugraph',
    name: 'cuGraph',
    description: 'Graph analytics library',
    category: 'cuda',
    icon: '🕸️',
  },

  // AI Capabilities
  {
    id: 'websearch',
    name: 'Web Search',
    description: 'Real-time internet access',
    category: 'ai',
    icon: '🌐',
  },
  {
    id: 'codeinterpreter',
    name: 'Code Interpreter',
    description: 'Execute & analyze code',
    category: 'ai',
    icon: '💻',
  },
  {
    id: 'rag',
    name: 'RAG',
    description: 'Retrieval-augmented generation',
    category: 'ai',
    icon: '📚',
  },
  {
    id: 'vision',
    name: 'Vision',
    description: 'Image understanding',
    category: 'ai',
    icon: '👁️',
  },
  {
    id: 'speech',
    name: 'Speech',
    description: 'Voice recognition & synthesis',
    category: 'ai',
    icon: '🎙️',
  },

  // Tools
  {
    id: 'fileio',
    name: 'File I/O',
    description: 'Read and write files',
    category: 'tools',
    icon: '📁',
  },
  {
    id: 'api',
    name: 'API Access',
    description: 'Connect to external services',
    category: 'tools',
    icon: '🔌',
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Query structured data',
    category: 'tools',
    icon: '🗄️',
  },
];

export const skillCategories = {
  cuda: {
    name: 'CUDA Libraries',
    description: 'GPU-accelerated computing',
  },
  ai: {
    name: 'AI Capabilities',
    description: 'Intelligent features',
  },
  tools: {
    name: 'Tools',
    description: 'System integrations',
  },
} as const;

export type SkillCategory = keyof typeof skillCategories;
