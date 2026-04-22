import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  MessageSquareMore,
  PlusCircle,
  Users,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  getClients,
  getDashboardSnapshot,
  getJournals,
  getMonthlyCareSummary,
  journalTypeLabel,
} from '../lib/storage';

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = getDashboardSnapshot(today);
  const clients = getClients();
  const journals = getJournals();

  const monthlyOverview = useMemo(() => {
    const month = today.slice(0, 7);
    const monthlyJournals = journals.filter((journal) => (journal.date || '').startsWith(month));
    const typeCounts = monthlyJournals.reduce((acc, journal) => {
      acc[journal.type] = (acc[journal.type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  }, [journals, today]);

  const latestHighlights = snapshot.latestJournals.slice(0, 6);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="오늘의 업무 대시보드"
        subtitle={`${today} 기준으로 출결, 후속조치, 보호자 연락 필요 건을 먼저 확인합니다.`}
        actions={(
          <div className="flex gap-2 flex-wrap">
            <Link to="/attendance" className="btn-secondary">
              <CalendarCheck2 size={14} />
              출결 빠른 입력
            </Link>
            <Link to="/journal/new" className="btn-primary">
              <PlusCircle size={14} />
              새 일지
            </Link>
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="오늘 출결 미입력" value={`${snapshot.missingAttendanceClients.length}명`} tone="primary" icon={<CalendarCheck2 size={18} />} />
        <StatCard label="귀가 미확인" value={`${snapshot.missingDeparture.length}건`} tone="amber" icon={<AlertTriangle size={18} />} />
        <StatCard label="후속조치 필요" value={`${snapshot.followUpNeeded.length}건`} tone="red" icon={<BookOpen size={18} />} />
        <StatCard label="보호자 연락 필요" value={`${snapshot.guardianPending.length}건`} tone="sage" icon={<MessageSquareMore size={18} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <ActionCard
          title="오늘 출결 미입력 아동"
          actionLabel="출결 입력"
          actionTo="/attendance"
          items={snapshot.missingAttendanceClients.map((client) => client.name)}
          emptyLabel="오늘 출결이 모두 입력되었습니다."
        />
        <ActionCard
          title="후속조치 필요한 기록"
          actionLabel="일지 목록"
          actionTo="/journals"
          items={snapshot.followUpNeeded.map((journal) => `${journal.childName} · ${journal.title}`)}
          emptyLabel="후속조치가 필요한 임시 기록이 없습니다."
        />
        <ActionCard
          title="보호자 연락 필요 건"
          actionLabel="연락 일지 작성"
          actionTo="/journal/new"
          items={snapshot.guardianPending.map((journal) => `${journal.childName} · ${journal.title}`)}
          emptyLabel="추가 연락이 필요한 기록이 없습니다."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">이번 달 일지 유형 현황</p>
              <p className="text-xs text-gray-400 mt-1">다종 일지 입력 비중을 바로 확인할 수 있습니다.</p>
            </div>
            <Link to="/statistics" className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              통계 보기
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {monthlyOverview.length === 0 ? (
              <p className="text-sm text-gray-400">이번 달 기록이 아직 없습니다.</p>
            ) : (
              monthlyOverview.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-700">{journalTypeLabel(type)}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}건</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">최근 입력된 기록</p>
              <p className="text-xs text-gray-400 mt-1">최근 6건을 빠르게 다시 열어 수정할 수 있습니다.</p>
            </div>
            <Link to="/journals" className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              전체 보기
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {latestHighlights.length === 0 ? (
              <p className="text-sm text-gray-400">아직 작성된 기록이 없습니다.</p>
            ) : (
              latestHighlights.map((journal) => (
                <Link key={journal.id} to={`/journal/${journal.id}`} className="block rounded-xl border border-gray-200 px-4 py-3 hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                  <p className="text-sm font-semibold text-gray-900">{journal.title || journalTypeLabel(journal.type)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {journal.childName || '대상 없음'} · {journal.date} · {journalTypeLabel(journal.type)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-5 mt-6">
        <p className="text-sm font-semibold text-gray-800 mb-4">아동별 이번 달 요약 바로가기</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {clients.slice(0, 6).map((client) => {
            const summary = getMonthlyCareSummary({
              clientId: client.id,
              month: today.slice(0, 7),
            });

            return (
              <Link key={client.id} to="/clients" className="rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                <p className="font-semibold text-gray-900">{client.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  일지 {summary.journals.length}건 · 연락 {summary.guardianContacts.length}건 · 위험 {summary.riskCount}건
                </p>
              </Link>
            );
          })}
          {clients.length === 0 && <p className="text-sm text-gray-400">등록된 아동이 아직 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon }) {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    sage: 'bg-sage-50 text-sage-700',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
          {icon}
        </div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ActionCard({ title, actionLabel, actionTo, items, emptyLabel }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <Link to={actionTo} className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
          {actionLabel}
          <ArrowRight size={14} />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <div key={item} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
