import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Download,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  deleteClient,
  genId,
  getClients,
  getJournals,
  getMonthlyCareSummary,
  JOURNAL_TYPES,
  journalTypeLabel,
  saveClient,
} from '../lib/storage';
import { deletePhotoRefs, getPhotoDataUrl, savePhotoFile } from '../lib/photoStore';

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
    photoId: '',
  };
}

// ── 아동 데이터 내보내기 / 불러오기 ──────────────────────────────────────────

function exportClientsJSON() {
  const clients = getClients();
  const blob = new Blob([JSON.stringify(clients, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `아동목록_${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importClientsJSON(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('파일 형식이 올바르지 않습니다. JSON 파일을 선택해 주세요.');
  }
  if (!Array.isArray(data)) throw new Error('아동 목록 데이터가 아닙니다.');
  const existing = getClients();
  const existingIds = new Set(existing.map((c) => c.id));
  let added = 0;
  let updated = 0;
  data.forEach((raw) => {
    if (!raw || !raw.name) return;
    const client = { ...emptyClient(), ...raw, id: raw.id || genId() };
    if (existingIds.has(client.id)) updated += 1;
    else added += 1;
    saveClient(client);
  });
  return { added, updated, total: data.length };
}

// ── 프로필 사진 훅 ───────────────────────────────────────────────────────────

function useClientPhoto(photoId) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (!photoId) { setSrc(''); return; }
    getPhotoDataUrl({ id: photoId }).then((url) => {
      if (!cancelled) setSrc(url || '');
    });
    return () => { cancelled = true; };
  }, [photoId]);
  return src;
}

// ── 아동 등록/수정 모달 ──────────────────────────────────────────────────────

function ClientModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || emptyClient());
  const [photoSrc, setPhotoSrc] = useState('');
  const [photoError, setPhotoError] = useState('');
  const fileRef = useRef(null);

  // 기존 사진 로드
  useEffect(() => {
    if (!form.photoId) return;
    getPhotoDataUrl({ id: form.photoId }).then((url) => setPhotoSrc(url || ''));
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // 이전 사진 삭제
      if (form.photoId) await deletePhotoRefs([{ id: form.photoId }]);
      const ref = await savePhotoFile(file);
      const url = await getPhotoDataUrl(ref);
      setPhotoSrc(url || '');
      setField('photoId', ref.id);
    } catch (err) {
      setPhotoError('사진 저장에 실패했습니다.');
    }
    e.target.value = '';
  }

  async function removePhoto() {
    if (form.photoId) await deletePhotoRefs([{ id: form.photoId }]);
    setPhotoSrc('');
    setField('photoId', '');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    saveClient(form);
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-semibold text-gray-900">{initial?.id ? '아동 정보 수정' : '아동 등록'}</p>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 프로필 사진 */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoSrc ? (
                <div className="group relative h-20 w-20">
                  <img src={photoSrc} alt="프로필" className="h-20 w-20 rounded-2xl object-cover border border-gray-200" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                >
                  <Camera size={20} />
                  <span className="mt-1 text-xs">사진 추가</span>
                </button>
              )}
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">
                <Camera size={13} />
                {photoSrc ? '사진 변경' : '사진 등록'}
              </button>
              {photoError && <p className="mt-1 text-xs text-red-500">{photoError}</p>}
              <p className="mt-1 text-xs text-gray-400">JPG, PNG 권장 · 브라우저에만 저장됩니다</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="이름" required>
              <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className="input-field" required />
            </Field>
            <Field label="성별">
              <select value={form.gender} onChange={(e) => setField('gender', e.target.value)} className="input-field">
                <option value="">선택 안 함</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </Field>
            <Field label="생년월일">
              <input type="date" value={form.birthDate} onChange={(e) => setField('birthDate', e.target.value)} className="input-field" />
            </Field>
            <Field label="아동 연락처">
              <input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className="input-field" />
            </Field>
            <Field label="보호자명">
              <input type="text" value={form.guardian} onChange={(e) => setField('guardian', e.target.value)} className="input-field" />
            </Field>
            <Field label="보호자 연락처">
              <input type="tel" value={form.guardianPhone} onChange={(e) => setField('guardianPhone', e.target.value)} className="input-field" />
            </Field>
          </div>
          <Field label="주소">
            <input type="text" value={form.address} onChange={(e) => setField('address', e.target.value)} className="input-field" />
          </Field>
          <Field label="메모">
            <textarea value={form.memo} onChange={(e) => setField('memo', e.target.value)} rows={3} className="input-field resize-none" />
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

// ── 가져오기 결과 알림 ────────────────────────────────────────────────────────

function ImportResult({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div>
          <p className="text-sm font-semibold text-sage-800">아동 데이터 불러오기 완료</p>
          <p className="mt-1 text-xs text-sage-700">
            신규 {result.added}명 추가 · 기존 {result.updated}명 업데이트 (총 {result.total}건)
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sage-500 hover:text-sage-700">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ── 아동 카드 (목록) ─────────────────────────────────────────────────────────

function ClientCard({ client, selected, onClick, onEdit, onDelete }) {
  const photoSrc = useClientPhoto(client.photoId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card w-full p-4 text-left transition-shadow ${
        selected ? 'ring-2 ring-primary-300' : 'hover:shadow-card-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {photoSrc ? (
            <img src={photoSrc} alt={client.name} className="h-10 w-10 rounded-xl object-cover border border-gray-200 shrink-0" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 shrink-0">
              <UserRound size={18} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{client.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              {client.guardian ? `보호자 ${client.guardian}` : '보호자 정보 없음'}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{client.phone || client.guardianPhone || '연락처 없음'}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </button>
  );
}

// ── 양식 섹션 ─────────────────────────────────────────────────────────────────

function journalPreview(journal) {
  if (journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION) return journal.healthNotes || journal.serviceGoals || journal.summary || '초기상담 내용 미입력';
  if ([JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL, JOURNAL_TYPES.PLAY_PLAN_GROUP].includes(journal.type)) return journal.playGoal || journal.groupPlan || journal.matchingGoal || journal.summary || '계획 내용 미입력';
  if (journal.type === JOURNAL_TYPES.INTERVIEW_LOG) return journal.consultationContent || journal.futurePlan || journal.summary || '면담 내용 미입력';
  return journal.detailedActivities || journal.content || journal.activityEvaluation || journal.summary || '활동 내용 미입력';
}

function JournalSection({ title, entries, createLinkLabel, createLinkTo }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <Link to={createLinkTo} className="btn-secondary">
          <PlusCircle size={14} /> {createLinkLabel}
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

// ── 메인 ─────────────────────────────────────────────────────────────────────

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const importRef = useRef(null);

  const selectedPhotoSrc = useClientPhoto(selectedClient?.photoId);

  function refresh() {
    const next = getClients();
    setClients(next);
    if (selectedClient) {
      setSelectedClient(next.find((c) => c.id === selectedClient.id) || null);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.guardian, c.phone, c.guardianPhone]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  const clientJournals = useMemo(() => {
    if (!selectedClient) return [];
    return getJournals()
      .filter((j) => j.clientId === selectedClient.id || j.childName === selectedClient.name)
      .sort((a, b) =>
        new Date(`${b.date || b.writerDate}T${b.time || '00:00'}`) -
        new Date(`${a.date || a.writerDate}T${a.time || '00:00'}`),
      );
  }, [selectedClient]);

  const initialEntries = clientJournals.filter((j) => j.type === JOURNAL_TYPES.INITIAL_CONSULTATION);
  const playEntries = clientJournals.filter((j) => [JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL, JOURNAL_TYPES.PLAY_PLAN_GROUP].includes(j.type));
  const interviewEntries = clientJournals.filter((j) => j.type === JOURNAL_TYPES.INTERVIEW_LOG);
  const activityEntries = clientJournals.filter((j) => j.type === JOURNAL_TYPES.ACTIVITY_LOG);

  const monthlySummary = useMemo(() => (
    selectedClient ? getMonthlyCareSummary({ clientId: selectedClient.id, month }) : null
  ), [month, selectedClient]);

  function handleDelete(client) {
    const ok = window.confirm(`${client.name} 아동 정보를 삭제할까요?`);
    if (!ok) return;
    if (client.photoId) deletePhotoRefs([{ id: client.photoId }]);
    deleteClient(client.id);
    refresh();
    if (selectedClient?.id === client.id) setSelectedClient(null);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const result = await importClientsJSON(file);
      setImportResult(result);
      refresh();
    } catch (err) {
      setImportError(err.message);
    }
    e.target.value = '';
  }

  // 오늘 기준 만 나이 계산
  function calcAge(birthDate) {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="아동 관리"
        subtitle={`총 ${clients.length}명`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => importRef.current?.click()} className="btn-secondary">
              <Upload size={14} /> 불러오기
            </button>
            <button type="button" onClick={exportClientsJSON} className="btn-secondary">
              <Download size={14} /> 내보내기
            </button>
            <button type="button" onClick={() => setModal(emptyClient())} className="btn-primary">
              <PlusCircle size={14} /> 아동 등록
            </button>
          </div>
        )}
      />

      {/* 가져오기 파일 input (숨김) */}
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {importError && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {importError}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[360px,1fr]">
        {/* 왼쪽: 아동 목록 */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
                placeholder="이름, 보호자명, 연락처 검색"
              />
            </div>
          </div>

          {/* 내보내기 안내 */}
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <span className="font-medium">💾 아동 데이터 저장</span>
            <br />
            「내보내기」로 JSON 파일 저장 → 다른 기기에서 「불러오기」로 복원
          </div>

          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <div className="card p-8 text-center">
                <Users size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">
                  {search ? '검색 결과가 없습니다.' : '등록된 아동이 없습니다.'}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  selected={selectedClient?.id === client.id}
                  onClick={() => { setSelectedClient(client); setTab('overview'); }}
                  onEdit={() => setModal(client)}
                  onDelete={() => handleDelete(client)}
                />
              ))
            )}
          </div>
        </div>

        {/* 오른쪽: 아동 상세 */}
        <div className="card min-h-[540px] p-5">
          {!selectedClient ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <Users size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">왼쪽에서 아동을 선택하세요.</p>
              </div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  {selectedPhotoSrc ? (
                    <img src={selectedPhotoSrc} alt={selectedClient.name} className="h-16 w-16 rounded-2xl object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 shrink-0">
                      <UserRound size={28} />
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-bold text-gray-900">{selectedClient.name}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {selectedClient.gender && <span>{selectedClient.gender} · </span>}
                      {selectedClient.birthDate && (
                        <span>
                          {selectedClient.birthDate}
                          {calcAge(selectedClient.birthDate) !== null && ` (만 ${calcAge(selectedClient.birthDate)}세)`}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedClient.guardian ? `보호자 ${selectedClient.guardian}` : ''}
                      {selectedClient.guardianPhone ? ` · ${selectedClient.guardianPhone}` : ''}
                    </p>
                  </div>
                </div>
                <Link to={`/journal/new?clientId=${selectedClient.id}`} className="btn-secondary shrink-0">
                  <PlusCircle size={14} /> 양식 작성
                </Link>
              </div>

              {/* 탭 */}
              <div className="mb-5 flex flex-wrap gap-2">
                {TABS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTab(item.value)}
                    className={`rounded-xl px-3 py-1.5 text-sm ${
                      tab === item.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* 기본정보 탭 */}
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoCard label="생년월일" value={selectedClient.birthDate ? `${selectedClient.birthDate}${calcAge(selectedClient.birthDate) !== null ? ` (만 ${calcAge(selectedClient.birthDate)}세)` : ''}` : '미입력'} />
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
                <JournalSection title="초기상담기록지" entries={initialEntries}
                  createLinkLabel="초기상담기록지 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.INITIAL_CONSULTATION}&clientId=${selectedClient.id}`} />
              )}
              {tab === 'play' && (
                <JournalSection title="놀이계획서" entries={playEntries}
                  createLinkLabel="놀이계획서 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL}&clientId=${selectedClient.id}`} />
              )}
              {tab === 'interview' && (
                <JournalSection title="면담일지" entries={interviewEntries}
                  createLinkLabel="면담일지 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.INTERVIEW_LOG}&clientId=${selectedClient.id}`} />
              )}
              {tab === 'activity' && (
                <JournalSection title="활동일지" entries={activityEntries}
                  createLinkLabel="활동일지 작성"
                  createLinkTo={`/journal/new?type=${JOURNAL_TYPES.ACTIVITY_LOG}&clientId=${selectedClient.id}`} />
              )}

              {tab === 'summary' && monthlySummary && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">월간 요약</p>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field !w-auto" />
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
          onSave={() => { setModal(null); refresh(); }}
        />
      )}

      <ImportResult result={importResult} onClose={() => setImportResult(null)} />
    </div>
  );
}

// ── 하위 컴포넌트 ─────────────────────────────────────────────────────────────

function Field({ label, required = false, children }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
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
    <Link to={to} className="rounded-2xl border border-gray-200 p-4 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50/30 block">
      {label}
    </Link>
  );
}
