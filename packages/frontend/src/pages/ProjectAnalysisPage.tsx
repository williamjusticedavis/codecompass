import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProjects';
import { useProjectOverview, useArchitectureAnalysis, useOnboardingGuide, useCodebaseQuery } from '../hooks/useAnalysis';

type AnalysisTab = 'overview' | 'architecture' | 'onboarding' | 'ask';

interface QAEntry {
  question: string;
  answer: string;
  tokensUsed: number;
}

export function ProjectAnalysisPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);

  const { data: project, isLoading: projectLoading } = useProject(projectId!);
  const queryMutation = useCodebaseQuery(projectId!);

  // Only fetch the active tab to save API calls
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useProjectOverview(
    projectId!,
    activeTab === 'overview'
  );
  const { data: architecture, isLoading: architectureLoading, error: architectureError } = useArchitectureAnalysis(
    projectId!,
    activeTab === 'architecture'
  );
  const { data: onboarding, isLoading: onboardingLoading, error: onboardingError } = useOnboardingGuide(
    projectId!,
    activeTab === 'onboarding'
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Project not found</p>
          <button onClick={() => navigate('/projects')} className="mt-4 btn btn-primary">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const handleAsk = () => {
    if (!question.trim() || queryMutation.isPending) return;
    const q = question.trim();
    setQuestion('');
    queryMutation.mutate(q, {
      onSuccess: (data) => {
        setQaHistory((prev) => [...prev, { question: q, answer: data.answer, tokensUsed: data.tokensUsed }]);
      },
    });
  };

  const tabs: Array<{ id: AnalysisTab; label: string; description: string }> = [
    { id: 'overview', label: 'Overview', description: 'Project summary & stats' },
    { id: 'architecture', label: 'Architecture', description: 'Patterns & structure' },
    { id: 'onboarding', label: 'Onboarding', description: 'Getting started guide' },
    { id: 'ask', label: 'Ask', description: 'Ask anything about the code' },
  ];

  const statCards = [
    { label: 'Files', value: overview?.stats.totalFiles, color: 'bg-blue-500', lightBg: 'bg-blue-50', textColor: 'text-blue-700' },
    { label: 'Functions', value: overview?.stats.totalFunctions, color: 'bg-emerald-500', lightBg: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { label: 'Classes', value: overview?.stats.totalClasses, color: 'bg-purple-500', lightBg: 'bg-purple-50', textColor: 'text-purple-700' },
    { label: 'Interfaces', value: overview?.stats.totalInterfaces, color: 'bg-amber-500', lightBg: 'bg-amber-50', textColor: 'text-amber-700' },
  ];

  const langColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-lg font-bold text-primary-900 hover:text-primary-700"
              >
                CodeCompass
              </button>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button
                onClick={() => navigate('/projects')}
                className="text-gray-600 hover:text-gray-900"
              >
                Projects
              </button>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium">{project.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button onClick={handleLogout} className="btn btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">AI Analysis</h1>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              Powered by Claude
            </span>
          </div>
          <p className="text-gray-500">Deep insights into <span className="font-medium text-gray-700">{project.name}</span></p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl p-4 text-left transition-all border-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 bg-white shadow-md'
                  : 'border-transparent bg-white/60 hover:bg-white hover:shadow-sm'
              }`}
            >
              <div className={`text-sm font-semibold ${activeTab === tab.id ? 'text-primary-700' : 'text-gray-700'}`}>
                {tab.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{tab.description}</div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {overviewLoading && <LoadingState message="Generating project overview..." />}
              {overviewError && <ErrorState message="Failed to generate overview. Please try again." />}

              {overview && !overviewLoading && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statCards.map((stat) => (
                      <div key={stat.label} className={`${stat.lightBg} rounded-xl p-5 border border-white/50`}>
                        <p className={`text-xs font-medium ${stat.textColor} uppercase tracking-wider`}>{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value ?? 0}</p>
                      </div>
                    ))}
                  </div>

                  {/* Languages */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Language Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(overview.stats.languages).map(([lang, count], i) => (
                        <div key={lang} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${langColors[i % langColors.length]}`} />
                          <span className="text-sm font-medium text-gray-700 w-24">{lang}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                            <div
                              className={`${langColors[i % langColors.length]} h-2.5 rounded-full transition-all`}
                              style={{ width: `${Math.max((count / overview.stats.totalFiles) * 100, 3)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                            {count} {count === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Summary */}
                  <MarkdownCard title="AI Summary" tokensUsed={overview.tokensUsed} content={overview.summary} />
                </>
              )}
            </>
          )}

          {/* Architecture Tab */}
          {activeTab === 'architecture' && (
            <>
              {architectureLoading && <LoadingState message="Analyzing architecture..." />}
              {architectureError && <ErrorState message="Failed to analyze architecture. Please try again." />}

              {architecture && !architectureLoading && (
                <>
                  {/* Patterns */}
                  {architecture.patterns.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-3">Detected Patterns</h3>
                      <div className="flex flex-wrap gap-2">
                        {architecture.patterns.map((pattern) => (
                          <span
                            key={pattern}
                            className="px-3 py-1.5 bg-gradient-to-r from-primary-50 to-primary-100 text-primary-800 text-sm font-medium rounded-lg border border-primary-200"
                          >
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Architecture Analysis */}
                  <MarkdownCard title="Architecture Analysis" tokensUsed={architecture.tokensUsed} content={architecture.analysis} />
                </>
              )}
            </>
          )}

          {/* Onboarding Tab */}
          {activeTab === 'onboarding' && (
            <>
              {onboardingLoading && <LoadingState message="Generating onboarding guide..." />}
              {onboardingError && <ErrorState message="Failed to generate guide. Please try again." />}

              {onboarding && !onboardingLoading && (
                <>
                  {/* Key Files */}
                  {onboarding.keyFiles.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-3">Key Files to Explore</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {onboarding.keyFiles.map((file) => (
                          <div
                            key={file}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100"
                          >
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-mono text-gray-700 truncate">{file}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Onboarding Guide */}
                  <MarkdownCard title="Onboarding Guide" tokensUsed={onboarding.tokensUsed} content={onboarding.guide} />
                </>
              )}
            </>
          )}

          {/* Ask Tab */}
          {activeTab === 'ask' && (
            <>
              {/* Question Input */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Ask about this codebase</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder="e.g. How does authentication work? Where is the database configured?"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={queryMutation.isPending}
                  />
                  <button
                    onClick={handleAsk}
                    disabled={!question.trim() || queryMutation.isPending}
                    className="btn btn-primary px-6 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {queryMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Thinking...
                      </>
                    ) : (
                      'Ask'
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    'What does this project do?',
                    'How is the code structured?',
                    'What are the main entry points?',
                    'What external APIs does this use?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => { setQuestion(suggestion); }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                      disabled={queryMutation.isPending}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading */}
              {queryMutation.isPending && <LoadingState message="Analyzing your question..." />}

              {/* Error */}
              {queryMutation.isError && (
                <ErrorState message="Failed to get an answer. Please try again." />
              )}

              {/* Q&A History */}
              {qaHistory.map((entry, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 font-medium">
                      {entry.question}
                    </div>
                  </div>
                  <MarkdownCard title="Answer" tokensUsed={entry.tokensUsed} content={entry.answer} />
                </div>
              ))}

              {/* Empty state */}
              {qaHistory.length === 0 && !queryMutation.isPending && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Ask any question about the codebase and Claude will analyze the code to answer it.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent"></div>
        </div>
        <p className="text-gray-700 font-medium">{message}</p>
        <p className="mt-1 text-sm text-gray-500">This may take a moment while Claude analyzes your code</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-red-700">{message}</p>
    </div>
  );
}

function AnalysisMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-gray max-w-none
      prose-headings:text-gray-900
      prose-h1:text-xl prose-h1:font-bold prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2 prose-h1:mt-6 prose-h1:mb-3
      prose-h2:text-base prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3
      prose-h3:text-sm prose-h3:font-semibold prose-h3:uppercase prose-h3:tracking-wide prose-h3:mt-4 prose-h3:mb-2
      prose-p:text-gray-600 prose-p:leading-relaxed prose-p:my-2
      prose-li:text-gray-600 prose-li:leading-relaxed prose-li:my-0.5
      prose-ul:my-2 prose-ol:my-2
      prose-strong:text-gray-800 prose-strong:font-semibold
      prose-a:text-primary-600 hover:prose-a:text-primary-700 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
      prose-blockquote:border-l-primary-300 prose-blockquote:bg-primary-50/50 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:pr-4
      prose-hr:border-gray-200
      prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:uppercase prose-th:tracking-wider prose-th:text-gray-600
      prose-td:text-gray-600
      prose-table:text-sm
      prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:border prose-pre:border-gray-700 prose-pre:my-3
      prose-code:text-primary-700 prose-code:bg-primary-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-primary-100 prose-code:text-xs prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
              {children}
            </h2>
          ),
          pre: ({ children }) => (
            <pre>{children}</pre>
          ),
          code: ({ className, children }) => {
            const isBlock = /language-/.test(className || '');
            if (isBlock) {
              return (
                <code className={`text-sm !bg-transparent !border-0 !p-0 !text-gray-100 ${className || ''}`}>
                  {children}
                </code>
              );
            }
            return <code>{children}</code>;
          },
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-200">
              <table>{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownCard({
  title,
  tokensUsed,
  content,
}: {
  title: string;
  tokensUsed: number;
  content: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-400">{tokensUsed.toLocaleString()} tokens</span>
      </div>
      <div className="px-6 py-5">
        <AnalysisMarkdown content={content} />
      </div>
    </div>
  );
}