import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Database,
  Download,
  Heart,
  LayoutDashboard,
  List,
  Menu,
  PlusCircle,
  Users,
  Wallet,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/journal/new', label: '양식 작성', icon: PlusCircle },
  { to: '/journals', label: '양식 목록', icon: List },
  { to: '/clients', label: '아동 관리', icon: Users },
  { to: '/statistics', label: '양식 통계', icon: BarChart3 },
  { to: '/budget', label: '예산 관리', icon: Wallet },
  { to: '/export', label: '내보내기', icon: Download },
  { to: '/data-management', label: '백업/복원', icon: Database },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  function SidebarContent() {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-sage-100 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-500 to-primary-600 shadow-md">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-sage-900">지역아동센터 양식도구</p>
              <p className="mt-1 text-xs text-sage-600">놀이계획서 · 초기상담 · 면담 · 활동일지</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-center text-xs text-gray-400">브라우저 로컬 저장 기반 실무 양식 도구</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sage-500 to-primary-600">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-sm font-bold text-sage-900">지역아동센터 양식도구</span>
        </div>
        <button type="button" onClick={() => setOpen((prev) => !prev)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className={`sidebar-transition fixed bottom-0 left-0 top-14 z-40 w-72 bg-white shadow-sidebar lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      <aside className="hidden w-72 shrink-0 flex-col border-r border-gray-200 bg-white shadow-sidebar lg:flex">
        <SidebarContent />
      </aside>
    </>
  );
}
