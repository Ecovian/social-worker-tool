import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarRange, ClipboardList, Users, Wallet } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  getBudgetItems,
  getBudgetMeta,
  getClients,
  getJournals,
  JOURNAL_TYPE_OPTIONS,
  JOURNAL_TYPES,
  journalTypeLabel,
} from '../lib/storage';

function countBy(list, keyGetter) {
  return list.reduce((accumulator, item) => {
    const key = keyGetter(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function topEntries(counts, limit = 8) {
  return Object.entries(counts).sort((left, right) => right[1] - left[1]).slice(0, limit);
}

export default function Statistics() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const journals = getJournals().filter((journal) => (journal.date || journal.writerDate || '').startsWith(month));
  const budgetItems = getBudgetItems().filter((item) => (item.date || '').startsWith(month));
  const budgetMeta = getBudgetMeta();
  const clients = getClients();

  const typeCounts = useMemo(() => countBy(journals, (journal) => journal.type), [journals]);
  const statusCounts = useMemo(() => countBy(journals, (journal) => journal.status || 'draft'), [journals]);
  const childCounts = useMemo(() => (
    countBy(journals.filter((journal) => journal.childName), (journal) => journal.childName)
  ), [journals]);
  const photoCount = journals.reduce((sum, journal) => sum + (journal.photos?.length || 0), 0);
  const totalSpent = budgetItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const playPlanCount = (typeCounts[JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL] || 0) + (typeCounts[JOURNAL_TYPES.PLAY_PLAN_GROUP] || 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="양식 통계"
        subtitle="월별로 5개 공식 양식 작성 현황과 예산 사용 흐름을 확인합니다."
        actions={(
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-gray-400" />
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field !w-auto" />
          </div>
        )}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="월간 양식 수" value={`${journals.length}건`} icon={<ClipboardList size={16} />} tone="primary" />
        <SummaryCard label="놀이계획서" value={`${playPlanCount}건`} icon={<BarChart3 size={16} />} tone="violet" />
        <SummaryCard label="면담일지" value={`${typeCounts[JOURNAL_TYPES.INTERVIEW_LOG] || 0}건`} icon={<Users size={16} />} tone="amber" />
        <SummaryCard label="활동 사진" value={`${photoCount}장`} icon={<BarChart3 size={16} />} tone="sage" />
        <SummaryCard label="월간 지출" value={`${totalSpent.toLocaleString()}원`} icon={<Wallet size={16} />} tone="rose" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="양식 유형 분포">
          {JOURNAL_TYPE_OPTIONS.every((option) => !typeCounts[option.value]) ? (
            <p className="text-sm text-gray-400">선택한 월에 작성된 양식이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {JOURNAL_TYPE_OPTIONS.map((option) => (
                <ProgressRow
                  key={option.value}
                  label={option.label}
                  value={typeCounts[option.value] || 0}
                  total={Math.max(journals.length, 1)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="저장 상태 분포">
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-gray-400">저장된 양식이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <ProgressRow
                  key={status}
                  label={status === 'finalized' ? '확정본' : '임시저장'}
                  value={count}
                  total={Math.max(journals.length, 1)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="아동별 기록 건수">
          {Object.keys(childCounts).length === 0 ? (
            <p className="text-sm text-gray-400">아동별 집계가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {topEntries(childCounts).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="text-gray-700">{name}</span>
                  <span className="font-semibold text-gray-900">{count}건</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="예산 요약">
          <div className="space-y-3">
            <ProgressRow
              label="이달 지출"
              value={totalSpent}
              total={Math.max(Number(budgetMeta.totalBudget) || 0, totalSpent || 1)}
              unit="원"
            />
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              총 예산: {(Number(budgetMeta.totalBudget) || 0).toLocaleString()}원
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              잔액: {((Number(budgetMeta.totalBudget) || 0) - totalSpent).toLocaleString()}원
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              등록 아동: {clients.length}명
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              예산 지출 항목: {budgetItems.length}건
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    sage: 'bg-sage-50 text-sage-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="card p-5">
      <p className="mb-4 text-sm font-semibold text-gray-900">{title}</p>
      {children}
    </div>
  );
}

function ProgressRow({ label, value, total, unit = '건' }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">
          {Number(value).toLocaleString()}
          {unit}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
