export interface ProjectStats {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  totalInterfaces: number;
  languages: Record<string, number>;
  topFiles: Array<{ path: string; functionCount: number }>;
}

export interface ProjectOverviewResponse {
  success: boolean;
  summary: string;
  stats: ProjectStats;
  tokensUsed: number;
}

export interface ArchitectureAnalysisResponse {
  success: boolean;
  analysis: string;
  patterns: string[];
  tokensUsed: number;
}

export interface OnboardingGuideResponse {
  success: boolean;
  guide: string;
  keyFiles: string[];
  tokensUsed: number;
}

export interface CodebaseQueryResponse {
  success: boolean;
  answer: string;
  tokensUsed: number;
}

export type AnalysisType = 'overview' | 'architecture' | 'onboarding';
