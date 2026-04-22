import React, { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const JournalForm = lazy(() => import('./pages/JournalForm'));
const JournalList = lazy(() => import('./pages/JournalList'));
const AttendanceBoard = lazy(() => import('./pages/AttendanceBoard'));
const Clients = lazy(() => import('./pages/Clients'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Budget = lazy(() => import('./pages/Budget'));
const Export = lazy(() => import('./pages/Export'));
const DataManagement = lazy(() => import('./pages/DataManagement'));

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/journal/new" element={<JournalForm />} />
                <Route path="/journal/:id" element={<JournalForm />} />
                <Route path="/journals" element={<JournalList />} />
                <Route path="/attendance" element={<AttendanceBoard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/export" element={<Export />} />
                <Route path="/data-management" element={<DataManagement />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </HashRouter>
  );
}

function PageFallback() {
  return (
    <div className="card p-10 text-center">
      <p className="text-sm text-gray-500">화면을 불러오는 중입니다...</p>
    </div>
  );
}
