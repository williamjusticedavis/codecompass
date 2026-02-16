import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../services/projects.api';
import type { CreateGitHubProjectInput, CreateUploadProjectInput } from '../types/project.types';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getProject(id),
    enabled: !!id,
  });
}

export function useProjectStatus(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['projects', id, 'status'],
    queryFn: () => projectsApi.getProjectStatus(id),
    enabled: !!id && enabled,
    refetchInterval: (data) => {
      // Poll every 2 seconds if job is pending or processing
      if (data?.job?.status === 'pending' || data?.job?.status === 'processing') {
        return 2000;
      }
      return false;
    },
  });
}

export function useCreateGitHubProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGitHubProjectInput) => projectsApi.createGitHubProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateUploadProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUploadProjectInput) => projectsApi.createUploadProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
