import React, { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import Sidebar from './components/Sidebar';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const JournalForm = lazy(() => import('./pages/JournalForm'));
const JournalList = lazy(() => import('./pages/JournalList'));
const Clients = lazy(() => import('./pages/Clients'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Budget = lazy(() => import('./pages/Budget'));
const Export = lazy(() => import('./pages/Export'));
const DataManagement = lazy(() => import('./pages/DataManagement'));

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}

function AppLayout() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <RouteErrorBoundary key={routeKey}>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/journal/new" element={<JournalForm />} />
                <Route path="/journal/:id" element={<JournalForm />} />
                <Route path="/journals" element={<JournalList />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/export" element={<Export />} />
                <Route path="/data-management" element={<DataManagement />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </div>
      </main>
    </div>
  );
}

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // Keep a visible UI for lazy-load or module errors instead of an endless suspense fallback.
    console.error('Route render failed:', error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return <PageError error={this.state.error} />;
  }
}

function PageFallback() {
  return (
    <div className="card p-10 text-center">
      <p className="text-sm text-gray-500">화면을 불러오는 중입니다...</p>
    </div>
  );
}

function PageError({ error }) {
  return (
    <div className="card max-w-2xl p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">화면을 불러오지 못했습니다.</p>
          <p className="mt-1 text-sm text-gray-500">
            최신 코드와 브라우저 캐시가 맞지 않거나, 모듈 로딩 중 오류가 발생했습니다.
          </p>
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {error?.message || '알 수 없는 오류'}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-secondary mt-4"
          >
            <RefreshCcw size={14} />
            새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
