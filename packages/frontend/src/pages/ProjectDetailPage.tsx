import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useProjectStatus } from '../hooks/useProjects';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: statusData } = useProjectStatus(id!, !!(id && project));

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <button onClick={() => navigate('/projects')} className="btn btn-primary mt-4">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const isProcessing = project.status === 'pending' || project.status === 'processing';
  const job = statusData?.job;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/projects')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-primary-900">{project.name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Analysis Status</h2>

          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="text-gray-700">
                  {project.status === 'pending'
                    ? 'Waiting to start analysis...'
                    : 'Analyzing project...'}
                </span>
              </div>

              {job && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-600">
                This may take a few minutes depending on the project size...
              </p>
            </div>
          )}

          {project.status === 'completed' && (
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Analysis complete!</span>
            </div>
          )}

          {project.status === 'failed' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Analysis failed</span>
              </div>
              {project.errorMessage && (
                <p className="text-sm text-red-600">{project.errorMessage}</p>
              )}
            </div>
          )}
        </div>

        {/* Project Info */}
        {project.status === 'completed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Project Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Source</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {project.sourceType === 'github' ? 'GitHub' : 'Upload'}
                  </dd>
                </div>

                {project.githubUrl && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Repository URL</dt>
                    <dd className="mt-1">
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {project.githubUrl}
                      </a>
                    </dd>
                  </div>
                )}

                {project.primaryLanguage && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Primary Language</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.primaryLanguage}</dd>
                  </div>
                )}

                {project.totalFiles && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Files</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {project.totalFiles.toLocaleString()}
                    </dd>
                  </div>
                )}

                {project.totalSize && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Size</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {(project.totalSize / (1024 * 1024)).toFixed(2)} MB
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Language Breakdown</h3>
              {project.languages && Object.keys(project.languages).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(project.languages)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([lang, count]) => (
                      <div key={lang} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 capitalize">{lang}</span>
                        <span className="text-sm font-medium text-gray-900">{count} files</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No language data available</p>
              )}
            </div>
          </div>
        )}

        {/* Coming Soon Section */}
        {project.status === 'completed' && (
          <div className="card p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Coming in Future Phases</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Code Analysis</h4>
                <p className="text-sm text-gray-600">
                  AI-powered architecture insights and design patterns
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Dependency Graph</h4>
                <p className="text-sm text-gray-600">
                  Interactive visualization of code dependencies
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Semantic Search</h4>
                <p className="text-sm text-gray-600">
                  Natural language search across your codebase
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
