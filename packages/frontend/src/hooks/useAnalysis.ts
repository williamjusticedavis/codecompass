import { useQuery, useMutation } from '@tanstack/react-query';
import { analysisApi } from '../services/analysis.api';

export function useProjectOverview(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ['analysis', 'overview', projectId],
    queryFn: () => analysisApi.getProjectOverview(projectId),
    enabled,
    staleTime: 5 * 60 * 1000, // Analysis results stay fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

export function useArchitectureAnalysis(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ['analysis', 'architecture', projectId],
    queryFn: () => analysisApi.getArchitectureAnalysis(projectId),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useOnboardingGuide(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ['analysis', 'onboarding', projectId],
    queryFn: () => analysisApi.getOnboardingGuide(projectId),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCodebaseQuery(projectId: string) {
  return useMutation({
    mutationFn: (question: string) => analysisApi.queryCodebase(projectId, question),
  });
}
