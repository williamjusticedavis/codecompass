import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateGitHubProject, useCreateUploadProject } from '../hooks/useProjects';

type SourceTab = 'github' | 'upload';

export function NewProjectPage() {
  const [activeTab, setActiveTab] = useState<SourceTab>('github');
  const navigate = useNavigate();

  // GitHub form state
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');

  // Upload form state
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const createGitHub = useCreateGitHubProject();
  const createUpload = useCreateUploadProject();

  const handleGitHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createGitHub.mutateAsync({
        url: githubUrl,
        branch: githubBranch || undefined,
      });

      // Redirect to projects list where user can see analysis progress
      navigate('/projects');
    } catch (error: any) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    try {
      await createUpload.mutateAsync({
        name: projectName,
        file,
      });

      // Redirect to projects list where user can see analysis progress
      navigate('/projects');
    } catch (error: any) {
      console.error('Failed to create project:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill project name from filename if empty
      if (!projectName) {
        const nameWithoutExt = selectedFile.name.replace(/\.zip$/, '');
        setProjectName(nameWithoutExt);
      }
    }
  };

  const isGitHubLoading = createGitHub.isPending;
  const isUploadLoading = createUpload.isPending;
  const githubError = createGitHub.error;
  const uploadError = createUpload.error;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xl font-bold text-primary-900 hover:text-primary-700"
              >
                CodeCompass
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Project</h1>
          <p className="text-gray-600">
            Connect a GitHub repository or upload a zip file to get started
          </p>
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('github')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'github'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              GitHub Repository
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === 'upload'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload Zip File
            </button>
          </div>

          {/* GitHub Tab */}
          {activeTab === 'github' && (
            <div className="p-6">
              {githubError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {(githubError as any).response?.data?.message || 'Failed to create project'}
                </div>
              )}

              <form onSubmit={handleGitHubSubmit} className="space-y-4">
                <div>
                  <label htmlFor="github-url" className="block text-sm font-medium mb-2">
                    Repository URL
                  </label>
                  <input
                    id="github-url"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="input"
                    placeholder="https://github.com/username/repository"
                    required
                    disabled={isGitHubLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the full URL of a public GitHub repository
                  </p>
                </div>

                <div>
                  <label htmlFor="github-branch" className="block text-sm font-medium mb-2">
                    Branch (optional)
                  </label>
                  <input
                    id="github-branch"
                    type="text"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    className="input"
                    placeholder="main"
                    disabled={isGitHubLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to use the default branch
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isGitHubLoading || !githubUrl}
                  className="btn btn-primary w-full"
                >
                  {isGitHubLoading ? 'Creating Project...' : 'Clone Repository'}
                </button>
              </form>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="p-6">
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {(uploadError as any).response?.data?.message || 'Failed to create project'}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium mb-2">
                    Project Name
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="input"
                    placeholder="My Project"
                    required
                    disabled={isUploadLoading}
                  />
                </div>

                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
                    Zip File
                  </label>
                  <div className="mt-1">
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center px-4 py-6 bg-white border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-primary-400 transition-colors ${
                        isUploadLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        {file ? file.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">ZIP file up to 100MB</p>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".zip"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploadLoading}
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadLoading || !file || !projectName}
                  className="btn btn-primary w-full"
                >
                  {isUploadLoading ? 'Uploading...' : 'Upload Project'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
