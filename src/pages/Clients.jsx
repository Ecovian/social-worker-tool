import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, PlusCircle, Search, Trash2, UserRound, Users, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  deleteClient,
  getClients,
  getJournals,
  getMonthlyCareSummary,
  JOURNAL_TYPES,
  journalTypeLabel,
  saveClient,
} from '../lib/storage';

const TABS = [
  { value: 'overview', label: '기본정보' },
  { value: 'initial', label: '초기상담기록지' },
  { value: 'play', label: '놀이계획서' },
  { value: 'interview', label: '면담일지' },
  { value: 'activity', label: '활동일지' },
  { value: 'summary', label: '월간요약' },
];

function emptyClient() {
  return {
    id: '',
    name: '',
    birthDate: '',
    gender: '',
    phone: '',
    guardian: '',
    guardianPhone: '',
    address: '',
    memo: '',
  };
}

function ClientModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || emptyClient());

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    saveClient(form);
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-semibold text-gray-900">{initial ? '아동 정보 수정' : '아동 등록'}</p>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="이름" required>
              <input type="text" value={form.name} onChange={(event) => setField('name', event.target.value)} className="input-field" required />
            </Field>
            <Field label="성별">
              <input type="text" value={form.gender} onChange={(event) => setField('gender', event.target.value)} className="input-field" />
            </Field>
            <Field label="생년월일">
              <input type="date" value={form.birthDate} onChange={(event) => setField('birthDate', event.target.value)} className="input-field" />
            </Field>
            <Field label="아동 연락처">
              <input type="text" value={form.phone} onChange={(event) => setField('phone', event.target.value)} className="input-field" />
            </Field>
            <Field label="보호자명">
              <input type="text" value={form.guardian} onChange={(event) => setField('guardian', event.target.value)} className="input-field" />
            </Field>
            <Field label="보호자 연락처">
              <input type="text" value={form.guardianPhone} onChange={(event) => setField('guardianPhone', event.target.value)} className="input-field" />
            </Field>
          </div>
          <Field label="주소">
            <input type="text" value={form.address} onChange={(event) => setField('address', event.target.value)} className="input-field" />
          </Field>
          <Field label="메모">
            <textarea value={form.memo} onChange={(event) => setField('memo', event.target.value)} rows={4} className="input-field resize-none" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">취소</button>
            <button type="submit" className="btn-primary">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function journalPreview(journal) {
  if (journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return journal.healthNotes || journal.serviceGoals || journal.summary || '초기상담 내용 미입력';
  }
  if ([JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL, JOURNAL_TYPES.PLAY_PLAN_GROUP].includes(journal.type)) {
    return journal.playGoal || journal.groupPlan || journal.matchingGoal || journal.summary || '계획 내용 미입력';
  }
  if (journal.type === JOURNAL_TYPES.INTERVIEW_LOG) {
    return journal.consultationContent || journal.futurePlan || journal.summary || '면담 내용 미입력';
  }
  return journal.detailedActivities || journal.content || journal.activityEvaluation || journal.summary || '활동 내용 미입력';
}

function JournalSection({ title, entries, createLinkLabel, createLinkTo }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <Link to={createLinkTo} className="btn-secondary">
          <PlusCircle size={14} />
          {createLinkLabel}
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          등록된 양식이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((journal) => (
            <Link
              key={journal.id}
              to={`/journal/${journal.id}`}
              className="block rounded-2xl border border-gray-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-gray-100 text-gray-700">{journalTypeLabel(journal.type)}</span>
                <span className={`badge ${journal.status === 'finalized' ? 'bg-sage-50 text-sage-700' : 'bg-amber-50 text-amber-700'}`}>
                  {journal.status === 'finalized' ? '확정본' : '임시저장'}
                </span>
              </div>
              <p className="mt-2 font-semibold text-gray-900">{journal.title || journalTypeLabel(journal.type)}</p>
              <p className="mt-1 text-sm text-gray-500">{journal.date || journal.writerDate} {journal.time || ''}</p>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{journalPreview(journal)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  function refresh() {
    const next = getClients();
    setClients(next);
    if (selectedClient) {
      setSelectedClient(next.find((client) => client.id === selectedClient.id) || null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => (
      [client.name, client.guardian, client.phone, client.guardianPhone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    ));
  }, [clients, search]);

  const clientJournals = useMemo(() => {
    if (!selectedClient) return [];
    return getJournals()
      .filter((journal) => journal.clientId === selectedClient.id || journal.childName === selectedClient.name)
      .sort((left, right) => (
        new Date(`${right.date || right.writerDate}T${right.time || '00:00'}`)
        - new Date(`${left.date || left.writerDate}T${left.time || '00:00'}`)
      ));
  }, [selectedClient]);

  const initialEntries = clientJournals.filter((journal) => journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION);
  const playEntries = clientJournals.filter((journal) => [JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL, JOURNAL_TYPES.PLAY_PLAN_GROUP].includes(journal.type));
  const interviewEntries = clientJournals.filter((journal) => journal.type === JOURNAL_TYPES.INTERVIEW_LOG);
  const activityEntries = clientJournals.filter((journal) => journal.type === JOURNAL_TYPES.ACTIVITY_LOG);

  const monthlySummary = useMemo(() => (
    selectedClient ? getMonthlyCareSummary({ clientId: selectedClient.id, month }) : null
  ), [month, selectedClient]);

  function handleDelete(client) {
    const ok = window.confirm(`${client.name} 아동 정보를 삭제할까요? 연결된 양식 기록은 유지되지만 아동 목록에서는 제거됩니다.`);
    if (!ok) return;
    deleteClient(client.id);
    refresh();
    if (selectedClient?.id === client.id) setSelectedClient(null);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="아동 관리"
        subtitle={`총 ${clients.length}명의 아동 정보를 관리합니다.`}
        actions={(
          <button type="button" onClick={() => setModal(emptyClient())} className="btn-primary">
            <PlusCircle size={14} />
            아동 등록
          </button>
        )}
      />

      <div className="grid gap-5 xl:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input-field pl-9"
                placeholder="아동명, 보호자명, 연락처 검색"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <div className="card p-8 text-center">
                <Users size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">검색 결과가 없습니다.</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClient(client)}
                  className={`card w-full p-4 text-left transition-shadow ${
                    selectedClient?.id === client.id ? 'ring-2 ring-primary-300' : 'hover:shadow-card-hover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{client.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {client.guardian ? `보호자 ${client.guardian}` : '보호자 정보 없음'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">{client.phone || client.guardianPhone || '연락처 없음'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setModal(client);
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(client);
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card min-h-[540px] p-5">
          {!selectedClient ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <Users size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">왼쪽에서 아동을 선택하면 양식별 기록과 월간 요약을 볼 수 있습니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-gray-900">{selectedClient.name}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedClient.guardian ? `보호자 ${selectedClient.guardian}` : '보호자 정보 없음'}
                    {selectedClient.guardianPhone ? ` · ${selectedClient.guardianPhone}` : ''}
                  </p>
                </div>
                <Link to={`/journal/new?clientId=${selectedClient.id}`} className="btn-secondary">
                  <PlusCircle size={14} />
                  양식 작성
                </Link>
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                {TABS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTab(item.value)}
                    className={`rounded-xl px-3 py-1.5 text-sm ${
                      tab === item.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoCard label="생년월일" value={selectedClient.birthDate || '미입력'} />
                    <InfoCard label="성별" value={selectedClient.gender || '미입력'} />
                    <InfoCard label="아동 연락처" value={selectedClient.phone || '미입력'} />
                    <InfoCard label="보호자 연락처" value={selectedClient.guardianPhone || '미입력'} />
                    <InfoCard label="주소" value={selectedClient.address || '미입력'} />
                    <InfoCard label="메모" value={selectedClient.memo || '메모 없음'} multiline />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <QuickLinkCard to={`/journal/new?type=${JOURNAL_TYPES.INITIAL_CONSULTATION}&clientId=${selectedClient.id}`} label="초기상담기록지 작성" />
                    <QuickLinkCard to={`/journal/new?type=${JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL}&clientId=${selectedClient.id}`} label="개별 놀이계획서 작성" />
                    <QuickLinkCard to={`/journal/new?type=${JOURNAL_TYPES.INTERVIEW_LOG}&clientId=${selectedClient.id}`} label="면담일지 작성" />
                    <QuickLinkCard to={`/journal/new?type=${JOURNAL_TYPES.ACTIVITY_LOG}&clientId=${selectedClient.id}`} label="활동일지 작성" />
                  </div>
                </div>
              )}

              {tab === 'initial' && (
                <JournalSection
                  title="초기상담기록지"
                  entries={initialEntries}
                  createLinkLabel="초기상담기록지 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.INITIAL_CONSULTATION}&clientId=${selectedClient.id}`}
                />
              )}

              {tab === 'play' && (
                <JournalSection
                  title="놀이계획서"
                  entries={playEntries}
                  createLinkLabel="놀이계획서 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL}&clientId=${selectedClient.id}`}
                />
              )}

              {tab === 'interview' && (
                <JournalSection
                  title="면담일지"
                  entries={interviewEntries}
                  createLinkLabel="면담일지 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.INTERVIEW_LOG}&clientId=${selectedClient.id}`}
                />
              )}

              {tab === 'activity' && (
                <JournalSection
                  title="활동일지"
                  entries={activityEntries}
                  createLinkLabel="활동일지 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.ACTIVITY_LOG}&clientId=${selectedClient.id}`}
                />
              )}

              {tab === 'summary' && monthlySummary && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">월간 요약</p>
                    <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field !w-auto" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <SummaryCard label="전체 양식" value={`${monthlySummary.journals.length}건`} />
                    <SummaryCard label="초기상담" value={`${monthlySummary.initialConsultations.length}건`} />
                    <SummaryCard label="놀이계획" value={`${monthlySummary.playPlans.length}건`} />
                    <SummaryCard label="면담일지" value={`${monthlySummary.interviewLogs.length}건`} />
                    <SummaryCard label="활동일지" value={`${monthlySummary.activityLogs.length}건`} />
                  </div>
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-gray-900">양식 유형 분포</p>
                    {Object.entries(monthlySummary.typeCounts).length === 0 ? (
                      <p className="text-sm text-gray-400">선택한 월에 작성된 양식이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(monthlySummary.typeCounts).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{journalTypeLabel(type)}</span>
                            <span className="font-semibold text-gray-900">{count}건</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modal && (
        <ClientModal
          initial={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Field({ label, required = false, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value, multiline = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      <p className={`text-sm text-gray-700 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function QuickLinkCard({ to, label }) {
  return (
    <Link to={to} className="rounded-2xl border border-gray-200 p-4 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50/30">
      {label}
    </Link>
  );
}
