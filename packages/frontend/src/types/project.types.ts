export type ProjectStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type SourceType = 'github' | 'upload';

export interface Project {
  id: string;
  userId: string;
  name: string;
  sourceType: SourceType;
  githubUrl?: string;
  githubBranch?: string;
  storagePath?: string;
  status: ProjectStatus;
  primaryLanguage?: string;
  totalFiles?: number;
  totalSize?: number;
  languages?: Record<string, number>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobStatus {
  id: string;
  type: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ProjectStatusResponse {
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    errorMessage?: string;
  };
  job: JobStatus | null;
}

export interface CreateGitHubProjectInput {
  url: string;
  branch?: string;
}

export interface CreateUploadProjectInput {
  name: string;
  file: File;
}
