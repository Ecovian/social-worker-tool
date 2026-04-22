import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CalendarCheck2,
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
  { to: '/journal/new', label: '일지 작성', icon: PlusCircle },
  { to: '/journals', label: '일지 목록', icon: List },
  { to: '/attendance', label: '출결 빠른 입력', icon: CalendarCheck2 },
  { to: '/clients', label: '아동 관리', icon: Users },
  { to: '/statistics', label: '통계 리포트', icon: BarChart3 },
  { to: '/budget', label: '예산 관리', icon: Wallet },
  { to: '/export', label: '파일 내보내기', icon: Download },
  { to: '/data-management', label: '데이터 관리', icon: Database },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-6 border-b border-sage-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-500 to-primary-600 flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-sage-900 text-sm">지역아동센터 업무도구</p>
              <p className="text-xs text-sage-600 mt-1">다종 일지 · 출결 · 보호자 연락 · 예산</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
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

        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">로컬 저장 기반 PWA 업무도구</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sage-500 to-primary-600 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-sage-900 text-sm">지역아동센터 업무도구</span>
        </div>
        <button type="button" onClick={() => setOpen((prev) => !prev)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && <div className="lg:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setOpen(false)} />}

      <div className={`lg:hidden fixed top-14 left-0 bottom-0 z-40 w-72 bg-white shadow-sidebar sidebar-transition ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-200 shadow-sidebar shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
