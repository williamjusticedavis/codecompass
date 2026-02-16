import { api } from './api';
import type {
  Project,
  CreateGitHubProjectInput,
  CreateUploadProjectInput,
  ProjectStatusResponse,
} from '../types/project.types';

export const projectsApi = {
  // Get all user projects
  getProjects: async (): Promise<Project[]> => {
    const response = await api.get<{ success: boolean; projects: Project[] }>('/projects');
    return response.data.projects;
  },

  // Get single project
  getProject: async (id: string): Promise<Project> => {
    const response = await api.get<{ success: boolean; project: Project }>(`/projects/${id}`);
    return response.data.project;
  },

  // Create project from GitHub URL
  createGitHubProject: async (
    input: CreateGitHubProjectInput
  ): Promise<{ project: Project; jobId: string }> => {
    const response = await api.post<{
      success: boolean;
      project: Project;
      jobId: string;
    }>('/projects/github', input);
    return { project: response.data.project, jobId: response.data.jobId };
  },

  // Create project from uploaded file
  createUploadProject: async (
    input: CreateUploadProjectInput
  ): Promise<{ project: Project; jobId: string }> => {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('file', input.file);

    const response = await api.post<{
      success: boolean;
      project: Project;
      jobId: string;
    }>('/projects/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { project: response.data.project, jobId: response.data.jobId };
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  // Get project status
  getProjectStatus: async (id: string): Promise<ProjectStatusResponse> => {
    const response = await api.get<{ success: boolean } & ProjectStatusResponse>(
      `/projects/${id}/status`
    );
    return {
      project: response.data.project,
      job: response.data.job,
    };
  },
};
