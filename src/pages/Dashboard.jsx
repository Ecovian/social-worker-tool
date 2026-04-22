import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, PlusCircle, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  getDashboardSnapshot,
  getJournals,
  JOURNAL_TYPE_OPTIONS,
  journalTypeLabel,
} from '../lib/storage';

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = getDashboardSnapshot(today);
  const journals = getJournals();
  const latestEntries = snapshot.latestJournals.slice(0, 6);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="양식 대시보드"
        subtitle={`${today} 기준으로 5개 공식 양식 작성 현황을 한눈에 확인할 수 있습니다.`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to="/journal/new" className="btn-primary">
              <PlusCircle size={14} />
              새 양식 작성
            </Link>
            <Link to="/journals" className="btn-secondary">
              <ClipboardList size={14} />
              양식 목록
            </Link>
          </div>
        )}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="등록 아동" value={`${snapshot.clientCount}명`} tone="primary" />
        <StatCard label="이번 달 작성 양식" value={`${snapshot.monthlyCount}건`} tone="sage" />
        <StatCard label="임시저장 양식" value={`${snapshot.draftCount}건`} tone="amber" />
        <StatCard label="전체 저장 양식" value={`${journals.length}건`} tone="rose" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">이번 달 양식 분포</p>
                <p className="mt-1 text-xs text-gray-400">현재는 제공하신 5개 공식 양식만 작성할 수 있습니다.</p>
              </div>
              <Link to="/statistics" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                통계 보기
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {JOURNAL_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`badge border ${option.color}`}>{option.shortLabel}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {snapshot.monthlyTypeCounts[option.value] || 0}건
                    </span>
                  </div>
                  <p className="mt-3 font-medium text-gray-900">{option.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">최근 입력 양식</p>
                <p className="mt-1 text-xs text-gray-400">최근 저장한 양식을 바로 이어서 수정할 수 있습니다.</p>
              </div>
              <Link to="/journals" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                전체 보기
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {latestEntries.length === 0 ? (
                <p className="text-sm text-gray-400">아직 작성된 양식이 없습니다.</p>
              ) : (
                latestEntries.map((journal) => (
                  <Link
                    key={journal.id}
                    to={`/journal/${journal.id}`}
                    className="block rounded-2xl border border-gray-200 px-4 py-3 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge bg-gray-100 text-gray-700">{journalTypeLabel(journal.type)}</span>
                      <span className={`badge ${journal.status === 'finalized' ? 'bg-sage-50 text-sage-700' : 'bg-amber-50 text-amber-700'}`}>
                        {journal.status === 'finalized' ? '확정본' : '임시저장'}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-gray-900">{journal.title || journalTypeLabel(journal.type)}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {journal.childName || '아동명 미입력'} · {journal.date}
                    </p>
                    {(journal.summary || journal.activitySubject || journal.playGoal) && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {journal.summary || journal.activitySubject || journal.playGoal}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-900">빠른 시작</p>
            <div className="mt-4 space-y-3">
              {JOURNAL_TYPE_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  to={`/journal/new?type=${option.value}`}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
                >
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.shortLabel}</p>
                  </div>
                  <ArrowRight size={16} className="text-primary-600" />
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <Users size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">아동별 양식 확인</p>
                <p className="text-xs text-gray-400">초기상담, 놀이계획, 면담, 활동일지를 아동별로 모아서 볼 수 있습니다.</p>
              </div>
            </div>
            <Link to="/clients" className="btn-secondary mt-4">
              아동 관리로 이동
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-700',
    sage: 'bg-sage-50 text-sage-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="card p-5">
      <div className={`mb-3 inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold ${toneMap[tone]}`}>{label}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
