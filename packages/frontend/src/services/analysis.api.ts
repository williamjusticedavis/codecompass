import { api } from './api';
import type {
  ProjectOverviewResponse,
  ArchitectureAnalysisResponse,
  OnboardingGuideResponse,
  CodebaseQueryResponse,
} from '../types/analysis.types';

export const analysisApi = {
  // Get project overview with AI analysis
  getProjectOverview: async (projectId: string): Promise<ProjectOverviewResponse> => {
    const response = await api.get<ProjectOverviewResponse>(
      `/projects/${projectId}/analysis/overview`
    );
    return response.data;
  },

  // Get architecture analysis
  getArchitectureAnalysis: async (projectId: string): Promise<ArchitectureAnalysisResponse> => {
    const response = await api.get<ArchitectureAnalysisResponse>(
      `/projects/${projectId}/analysis/architecture`
    );
    return response.data;
  },

  // Get onboarding guide
  getOnboardingGuide: async (projectId: string): Promise<OnboardingGuideResponse> => {
    const response = await api.get<OnboardingGuideResponse>(
      `/projects/${projectId}/analysis/onboarding`
    );
    return response.data;
  },

  // Ask a question about the codebase
  queryCodebase: async (projectId: string, question: string): Promise<CodebaseQueryResponse> => {
    const response = await api.post<CodebaseQueryResponse>(
      `/projects/${projectId}/analysis/query`,
      { question }
    );
    return response.data;
  },
};
