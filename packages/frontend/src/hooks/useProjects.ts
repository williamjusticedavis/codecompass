import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../services/projects.api';
import type { CreateGitHubProjectInput, CreateUploadProjectInput } from '../types/project.types';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
    refetchInterval: (query) => {
      // Poll every 3 seconds if any project is pending or processing
      const projects = query.state.data;
      const hasActiveProjects = projects?.some(
        (p) => p.status === 'pending' || p.status === 'processing'
      );
      return hasActiveProjects ? 3000 : false;
    },
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
    refetchInterval: (query) => {
      // Poll every 2 seconds if job is pending or processing
      const data = query.state.data;
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
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        refetchType: 'active',
      });
    },
  });
}

export function useCreateUploadProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUploadProjectInput) => projectsApi.createUploadProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        refetchType: 'active',
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      // Force immediate refetch even if data is fresh
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        refetchType: 'active',
      });
    },
  });
}
