import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary-900">CodeCompass</h1>
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome{user?.name ? `, ${user.name}` : ''}!
          </h2>
          <p className="text-gray-600">
            This is your dashboard. Phase 1 (Authentication) is complete!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Your Projects</h3>
            <p className="text-gray-600 text-sm mb-4">Analyze and understand your codebases</p>
            <button className="btn btn-primary" disabled>
              Coming in Phase 2
            </button>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Recent Analyses</h3>
            <p className="text-gray-600 text-sm mb-4">View your latest code analyses</p>
            <button className="btn btn-secondary" disabled>
              Coming Soon
            </button>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Search</h3>
            <p className="text-gray-600 text-sm mb-4">Semantic search across codebases</p>
            <button className="btn btn-secondary" disabled>
              Coming in Phase 5
            </button>
          </div>
        </div>

        <div className="mt-8 card p-6">
          <h3 className="text-lg font-semibold mb-4">Development Status</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm">Phase 1: Authentication - Complete!</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-600">
                Phase 2: Project Ingestion - Coming Next
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-600">Phase 3: Code Parsing</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-600">Phase 4: AI Analysis</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-600">Phase 5: Semantic Search</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
