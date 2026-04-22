import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  deleteClient,
  getClients,
  getContactLogs,
  getJournals,
  getMonthlyCareSummary,
  journalTypeLabel,
  saveClient,
} from '../lib/storage';

const TABS = [
  { value: 'overview', label: '기본정보' },
  { value: 'journals', label: '일지' },
  { value: 'contacts', label: '보호자 연락' },
  { value: 'summary', label: '월간 요약' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="font-semibold text-gray-900">{initial ? '아동 정보 수정' : '아동 등록'}</p>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="이름" required>
              <input type="text" value={form.name} onChange={(event) => setField('name', event.target.value)} className="input-field" required />
            </Field>
            <Field label="성별">
              <input type="text" value={form.gender} onChange={(event) => setField('gender', event.target.value)} className="input-field" placeholder="예: 남, 여" />
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
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">취소</button>
            <button type="submit" className="btn-primary">저장</button>
          </div>
        </form>
      </div>
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
      .sort((left, right) => new Date(`${right.date}T${right.time || '00:00'}`) - new Date(`${left.date}T${left.time || '00:00'}`));
  }, [selectedClient]);

  const contactJournals = useMemo(() => {
    if (!selectedClient) return [];
    return getContactLogs(selectedClient.id);
  }, [selectedClient]);

  const monthlySummary = useMemo(() => (
    selectedClient
      ? getMonthlyCareSummary({ clientId: selectedClient.id, month })
      : null
  ), [month, selectedClient]);

  function handleDelete(client) {
    const ok = window.confirm(`${client.name} 아동 정보를 삭제할까요? 연결된 보호자 연락과 개별 정보가 함께 정리됩니다.`);
    if (!ok) return;
    deleteClient(client.id);
    refresh();
    if (selectedClient?.id === client.id) {
      setSelectedClient(null);
    }
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

      <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-5">
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
                <Users size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">검색 결과가 없습니다.</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClient(client)}
                  className={`card p-4 w-full text-left transition-shadow ${
                    selectedClient?.id === client.id ? 'ring-2 ring-primary-300' : 'hover:shadow-card-hover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {client.guardian ? `보호자 ${client.guardian}` : '보호자 정보 없음'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {client.phone || client.guardianPhone || '연락처 없음'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setModal(client);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(client);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
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

        <div className="card p-5 min-h-[540px]">
          {!selectedClient ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Users size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">왼쪽에서 아동을 선택하면 상세 정보와 월간 요약을 볼 수 있습니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xl font-bold text-gray-900">{selectedClient.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedClient.guardian ? `보호자 ${selectedClient.guardian}` : '보호자 정보 없음'}
                    {selectedClient.guardianPhone ? ` · ${selectedClient.guardianPhone}` : ''}
                  </p>
                </div>
                <Link to="/journal/new" className="btn-secondary">
                  <PlusCircle size={14} />
                  일지 작성
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {TABS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTab(item.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm ${
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
                  <InfoCard label="생년월일" value={selectedClient.birthDate || '미입력'} />
                  <InfoCard label="성별" value={selectedClient.gender || '미입력'} />
                  <InfoCard label="아동 연락처" value={selectedClient.phone || '미입력'} />
                  <InfoCard label="주소" value={selectedClient.address || '미입력'} />
                  <InfoCard label="메모" value={selectedClient.memo || '메모 없음'} multiline />
                </div>
              )}

              {tab === 'journals' && (
                <div className="space-y-3">
                  {clientJournals.length === 0 ? (
                    <p className="text-sm text-gray-400">연결된 일지가 없습니다.</p>
                  ) : (
                    clientJournals.map((journal) => (
                      <Link key={journal.id} to={`/journal/${journal.id}`} className="block rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="badge bg-gray-100 text-gray-700">{journalTypeLabel(journal.type)}</span>
                          <span className={`badge ${journal.status === 'finalized' ? 'bg-sage-50 text-sage-700' : 'bg-gray-100 text-gray-600'}`}>
                            {journal.status === 'finalized' ? '확정' : '임시 저장'}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">{journal.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{journal.date} {journal.time || ''}</p>
                        <p className="text-sm text-gray-600 mt-2">{journal.summary || journal.content || '본문 없음'}</p>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {tab === 'contacts' && (
                <div className="space-y-3">
                  {contactJournals.length === 0 ? (
                    <p className="text-sm text-gray-400">보호자 연락 일지가 없습니다.</p>
                  ) : (
                    contactJournals.map((journal) => (
                      <Link key={journal.id} to={`/journal/${journal.id}`} className="block rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                        <p className="font-semibold text-gray-900">{journal.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {journal.date} {journal.time || ''} · {journal.guardianName || '보호자'} · {journalTypeLabel(journal.type)}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">{journal.deliveryContent || journal.summary || '전달 내용 없음'}</p>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {tab === 'summary' && monthlySummary && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">월간 요약</p>
                    <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field !w-auto" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <SummaryCard label="월간 일지" value={`${monthlySummary.journals.length}건`} />
                    <SummaryCard label="보호자 연락" value={`${monthlySummary.guardianContacts.length}건`} />
                    <SummaryCard label="위험기록" value={`${monthlySummary.riskCount}건`} />
                    <SummaryCard label="후속조치" value={`${monthlySummary.followUps.length}건`} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-3">일지 유형 분포</p>
                      <div className="space-y-2">
                        {Object.entries(monthlySummary.typeCounts).length === 0 ? (
                          <p className="text-sm text-gray-400">이번 달 기록이 없습니다.</p>
                        ) : (
                          Object.entries(monthlySummary.typeCounts).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{journalTypeLabel(type)}</span>
                              <span className="font-semibold text-gray-900">{count}건</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-3">출결 분포</p>
                      <div className="space-y-2">
                        {Object.entries(monthlySummary.attendanceCounts).length === 0 ? (
                          <p className="text-sm text-gray-400">출결 기록이 없습니다.</p>
                        ) : (
                          Object.entries(monthlySummary.attendanceCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{status}</span>
                              <span className="font-semibold text-gray-900">{count}건</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">자주 기록된 활동</p>
                    {monthlySummary.topActivities.length === 0 ? (
                      <p className="text-sm text-gray-400">집계할 활동명이 없습니다.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {monthlySummary.topActivities.map(([name, count]) => (
                          <span key={name} className="badge bg-primary-50 text-primary-700">
                            {name} {count}건
                          </span>
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
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value, multiline = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm text-gray-700 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
