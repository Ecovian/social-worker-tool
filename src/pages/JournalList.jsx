import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Filter, PlusCircle, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  attendanceLabel,
  getClients,
  getJournals,
  JOURNAL_TYPE_OPTIONS,
  journalTypeLabel,
} from '../lib/storage';

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'draft', label: '임시 저장' },
  { value: 'finalized', label: '확정' },
];

const FLAG_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'followup', label: '후속조치 필요' },
  { value: 'risk', label: '위험징후 있음' },
  { value: 'medication', label: '복약 있음' },
  { value: 'guardian', label: '보호자 연락 필요' },
];

function typeBadgeClass(type) {
  return (
    JOURNAL_TYPE_OPTIONS.find((option) => option.value === type)?.color
    || 'bg-gray-50 text-gray-700 border-gray-200'
  );
}

export default function JournalList() {
  const [journals, setJournals] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [flag, setFlag] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    setJournals(getJournals());
    setClients(getClients());
  }, []);

  const filtered = useMemo(() => (
    journals.filter((journal) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [journal.title, journal.childName, journal.summary, journal.content]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      const matchesType = !type || journal.type === type;
      const matchesStatus = !status || journal.status === status;
      const matchesClient = !clientId || journal.clientId === clientId;
      const matchesMonth = !month || (journal.date || '').startsWith(month);

      const matchesFlag = !flag || (
        (flag === 'followup' && journal.followUpNeeded)
        || (flag === 'risk' && ((journal.riskFlags || []).length > 0 || journal.type === 'incident_risk'))
        || (flag === 'medication' && journal.medicationGiven)
        || (flag === 'guardian' && journal.guardianContactNeeded)
      );

      return matchesSearch && matchesType && matchesStatus && matchesClient && matchesMonth && matchesFlag;
    }).sort((left, right) => (
      new Date(`${right.date}T${right.time || '00:00'}`) - new Date(`${left.date}T${left.time || '00:00'}`)
    ))
  ), [clientId, flag, journals, month, search, status, type]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="일지 목록"
        subtitle={`총 ${journals.length}건의 다종 일지를 관리합니다.`}
        actions={(
          <Link to="/journal/new" className="btn-primary">
            <PlusCircle size={14} />
            새 일지
          </Link>
        )}
      />

      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
          <Filter size={16} className="text-primary-600" />
          필터
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-9"
              placeholder="제목, 아동명, 본문 검색"
            />
          </div>
          <select value={type} onChange={(event) => setType(event.target.value)} className="input-field">
            <option value="">전체 유형</option>
            {JOURNAL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="input-field">
            <option value="">전체 아동</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select value={flag} onChange={(event) => setFlag(event.target.value)} className="input-field">
            {FLAG_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-20 text-center">
          <p className="text-sm text-gray-400">조건에 맞는 일지가 없습니다.</p>
          <Link to="/journal/new" className="btn-primary mt-4 mx-auto">
            <PlusCircle size={14} />
            일지 작성하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((journal) => (
            <Link
              key={journal.id}
              to={`/journal/${journal.id}`}
              className="card p-4 block hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`badge border ${typeBadgeClass(journal.type)}`}>{journalTypeLabel(journal.type)}</span>
                    <span className={`badge ${journal.status === 'finalized' ? 'bg-sage-50 text-sage-700' : 'bg-gray-100 text-gray-600'}`}>
                      {journal.status === 'finalized' ? '확정' : '임시 저장'}
                    </span>
                    {journal.attendanceStatus && (
                      <span className="badge bg-slate-100 text-slate-700">{attendanceLabel(journal.attendanceStatus)}</span>
                    )}
                    {journal.followUpNeeded && (
                      <span className="badge bg-red-50 text-red-600">후속조치 필요</span>
                    )}
                    {journal.guardianContactNeeded && (
                      <span className="badge bg-amber-50 text-amber-700">보호자 연락 필요</span>
                    )}
                    {journal.type === 'incident_risk' && (
                      <span className="badge bg-red-50 text-red-700 inline-flex items-center gap-1">
                        <AlertTriangle size={12} />
                        사고·위험
                      </span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-gray-900 truncate">{journal.title || getJournalTypeLabel(journal.type)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {journal.childName || '대상 없음'} · {journal.date} {journal.time || ''}
                  </p>
                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap line-clamp-2">
                    {journal.summary || journal.content || '본문 없음'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {journal.photos?.length > 0 && (
                    <p className="text-xs text-gray-400">사진 {journal.photos.length}장</p>
                  )}
                  {journal.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end mt-2 max-w-[180px]">
                      {journal.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge bg-gray-100 text-gray-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
