import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarRange, MessageSquareMore } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  attendanceLabel,
  getBudgetItems,
  getBudgetMeta,
  getContactLogs,
  getJournals,
  journalTypeLabel,
} from '../lib/storage';

function countBy(list, keyGetter) {
  return list.reduce((acc, item) => {
    const key = keyGetter(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default function Statistics() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const journals = getJournals().filter((journal) => (journal.date || '').startsWith(month));
  const contacts = getContactLogs().filter((journal) => (journal.date || '').startsWith(month));
  const budgetItems = getBudgetItems().filter((item) => (item.date || '').startsWith(month));
  const budgetMeta = getBudgetMeta();

  const typeCounts = useMemo(() => countBy(journals, (journal) => journal.type), [journals]);
  const attendanceCounts = useMemo(() => countBy(journals, (journal) => journal.attendanceStatus || '미기록'), [journals]);
  const followUpCount = journals.filter((journal) => journal.followUpNeeded).length;
  const riskCount = journals.filter((journal) => (journal.riskFlags || []).length > 0 || journal.type === 'incident_risk').length;
  const medicationCount = journals.filter((journal) => journal.medicationGiven).length;
  const totalSpent = budgetItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const monthlyTopChildren = useMemo(() => {
    const counts = countBy(
      journals.filter((journal) => journal.childName),
      (journal) => journal.childName,
    );

    return Object.entries(counts).sort((left, right) => right[1] - left[1]).slice(0, 8);
  }, [journals]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="통계 및 월간 리포트"
        subtitle="월 단위로 일지 유형, 출결, 위험징후, 보호자 연락 현황을 확인합니다."
        actions={(
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-gray-400" />
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field !w-auto" />
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <SummaryCard label="월간 일지" value={`${journals.length}건`} icon={<BarChart3 size={16} />} tone="primary" />
        <SummaryCard label="보호자 연락" value={`${contacts.length}건`} icon={<MessageSquareMore size={16} />} tone="sage" />
        <SummaryCard label="위험기록" value={`${riskCount}건`} icon={<AlertTriangle size={16} />} tone="red" />
        <SummaryCard label="복약기록" value={`${medicationCount}건`} icon={<BarChart3 size={16} />} tone="amber" />
        <SummaryCard label="후속조치" value={`${followUpCount}건`} icon={<CalendarRange size={16} />} tone="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="일지 유형 분포">
          {Object.keys(typeCounts).length === 0 ? (
            <p className="text-sm text-gray-400">이번 달 기록이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(typeCounts)
                .sort((left, right) => right[1] - left[1])
                .map(([type, count]) => (
                  <ProgressRow key={type} label={journalTypeLabel(type)} value={count} total={journals.length} />
                ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="출결 분포">
          {Object.keys(attendanceCounts).length === 0 ? (
            <p className="text-sm text-gray-400">출결 정보가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(attendanceCounts)
                .sort((left, right) => right[1] - left[1])
                .map(([status, count]) => (
                  <ProgressRow key={status} label={attendanceLabel(status)} value={count} total={journals.length} />
                ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="이번 달 많이 기록된 아동">
          {monthlyTopChildren.length === 0 ? (
            <p className="text-sm text-gray-400">아동별 집계가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {monthlyTopChildren.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="text-gray-700">{name}</span>
                  <span className="font-semibold text-gray-900">{count}건</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="예산 집행 요약">
          <div className="space-y-3">
            <ProgressRow label="이번 달 지출" value={totalSpent} total={Math.max(Number(budgetMeta.totalBudget) || 0, totalSpent || 1)} unit="원" />
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              총 예산: {(Number(budgetMeta.totalBudget) || 0).toLocaleString()}원
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              잔액: {((Number(budgetMeta.totalBudget) || 0) - totalSpent).toLocaleString()}원
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              지출 항목 수: {budgetItems.length}건
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
    sage: 'bg-sage-50 text-sage-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="card p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]} mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-gray-800 mb-4">{title}</p>
      {children}
    </div>
  );
}

function ProgressRow({ label, value, total, unit = '건' }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">
          {Number(value).toLocaleString()}
          {unit}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
