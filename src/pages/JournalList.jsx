import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, PlusCircle, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  getClients,
  getJournals,
  JOURNAL_TYPE_OPTIONS,
  JOURNAL_TYPES,
  journalTypeLabel,
} from '../lib/storage';

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'draft', label: '임시저장' },
  { value: 'finalized', label: '확정본' },
];

function typeBadgeClass(type) {
  return (
    JOURNAL_TYPE_OPTIONS.find((option) => option.value === type)?.color
    || 'bg-gray-50 text-gray-700 border-gray-200'
  );
}

function buildPreview(journal) {
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL) {
    return journal.playGoal || journal.currentLevel || journal.summary || '놀이 목표 미입력';
  }
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_GROUP) {
    return journal.groupPlan || journal.matchingGoal || journal.summary || '계획 내용 미입력';
  }
  if (journal.type === JOURNAL_TYPES.INTERVIEW_LOG) {
    return journal.consultationContent || journal.futurePlan || journal.summary || '면담 내용 미입력';
  }
  if (journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return journal.healthNotes || journal.serviceGoals || journal.summary || '초기상담 내용 미입력';
  }
  return journal.detailedActivities || journal.content || journal.activityEvaluation || journal.summary || '활동 내용 미입력';
}

export default function JournalList() {
  const [journals, setJournals] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    setJournals(getJournals());
    setClients(getClients());
  }, []);

  const filtered = useMemo(() => (
    journals.filter((journal) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [
        journal.title,
        journal.childName,
        journal.summary,
        journal.consultationContent,
        journal.detailedActivities,
        journal.playGoal,
        journal.groupPlan,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      const matchesType = !type || journal.type === type;
      const matchesStatus = !status || journal.status === status;
      const matchesClient = !clientId || journal.clientId === clientId;
      const matchesMonth = !month || (journal.date || journal.writerDate || '').startsWith(month);

      return matchesSearch && matchesType && matchesStatus && matchesClient && matchesMonth;
    }).sort((left, right) => (
      new Date(`${right.date || right.writerDate}T${right.time || '00:00'}`)
      - new Date(`${left.date || left.writerDate}T${left.time || '00:00'}`)
    ))
  ), [clientId, journals, month, search, status, type]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="양식 목록"
        subtitle={`총 ${journals.length}건의 저장 양식을 관리합니다.`}
        actions={(
          <Link to="/journal/new" className="btn-primary">
            <PlusCircle size={14} />
            새 양식
          </Link>
        )}
      />

      <div className="card mb-5 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Filter size={16} className="text-primary-600" />
          필터
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-9"
              placeholder="제목, 아동명, 핵심 내용 검색"
            />
          </div>
          <select value={type} onChange={(event) => setType(event.target.value)} className="input-field">
            <option value="">전체 양식</option>
            {JOURNAL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="input-field">
            <option value="">전체 아동</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-20 text-center">
          <p className="text-sm text-gray-400">조건에 맞는 양식이 없습니다.</p>
          <Link to="/journal/new" className="btn-primary mx-auto mt-4">
            <PlusCircle size={14} />
            양식 작성하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((journal) => (
            <Link
              key={journal.id}
              to={`/journal/${journal.id}`}
              className="card block p-4 transition-shadow hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`badge border ${typeBadgeClass(journal.type)}`}>{journalTypeLabel(journal.type)}</span>
                    <span className={`badge ${journal.status === 'finalized' ? 'bg-sage-50 text-sage-700' : 'bg-amber-50 text-amber-700'}`}>
                      {journal.status === 'finalized' ? '확정본' : '임시저장'}
                    </span>
                    {journal.photos?.length > 0 && (
                      <span className="badge bg-gray-100 text-gray-600">사진 {journal.photos.length}장</span>
                    )}
                  </div>
                  <p className="truncate text-base font-semibold text-gray-900">{journal.title || journalTypeLabel(journal.type)}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {journal.childName || '아동명 미입력'} · {journal.date || journal.writerDate} {journal.time || ''}
                  </p>
                  <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm text-gray-600">{buildPreview(journal)}</p>
                </div>
                <div className="shrink-0 text-right">
                  {journal.clientId && <p className="text-xs text-gray-400">연결 아동 있음</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
