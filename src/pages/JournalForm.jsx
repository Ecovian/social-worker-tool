import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Copy,
  RefreshCcw,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  ATTENDANCE_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  EMOTION_OPTIONS,
  JOURNAL_TYPES,
  PARTICIPATION_OPTIONS,
  RISK_FLAG_OPTIONS,
  attendanceLabel,
  buildJournalSuggestion,
  clearJournalDraft,
  createEmptyJournal,
  deleteJournal,
  genId,
  getClient,
  getClients,
  getFavoriteJournalTypes,
  getJournal,
  getJournalDraft,
  getJournals,
  getJournalTemplate,
  getLinkedJournalChildren,
  getRecentJournalTypes,
  journalTypeLabel,
  resyncGroupDrafts,
  riskFlagLabel,
  saveJournal,
  saveJournalDraft,
  toggleFavoriteJournalType,
  journalTypeLabel as getJournalTypeLabel,
} from '../lib/storage';
import { deletePhotoRefs, getPhotoDataUrl, savePhotoDataUrl, savePhotoFile } from '../lib/photoStore';

const ESCORT_OPTIONS = ['보호자 동행', '학부모 픽업', '도보 귀가', '차량 귀가', '기타'];
const INCIDENT_LEVEL_OPTIONS = ['관찰', '주의', '긴급'];
const APPETITE_OPTIONS = ['양호', '보통', '부진', '거부'];
const MEAL_OPTIONS = ['아침', '점심', '간식', '저녁'];

function getDraftKey(isNew, selectedType, id) {
  return isNew ? `new:${selectedType || 'select'}` : id;
}

function getPhotoIds(photos = []) {
  return photos
    .filter((photo) => photo && typeof photo === 'object' && photo.id)
    .map((photo) => photo.id);
}

async function migrateLegacyPhotos(photos = []) {
  return Promise.all(photos.map(async (photo) => {
    if (typeof photo === 'string') {
      return savePhotoDataUrl(photo, { id: genId(), name: 'legacy-photo' });
    }
    return photo;
  }));
}

async function deleteRemovedPhotos(previousPhotos, nextPhotos) {
  const nextIds = new Set(getPhotoIds(nextPhotos));
  const removed = (previousPhotos || []).filter((photo) => (
    photo && typeof photo === 'object' && photo.id && !nextIds.has(photo.id)
  ));
  await deletePhotoRefs(removed);
}

function mergeFromRecent(current, recent) {
  if (!recent) return current;
  const preserved = {
    id: current.id,
    type: current.type,
    status: current.status,
    clientId: current.clientId,
    childName: current.childName,
    date: current.date,
    time: current.time,
    createdAt: current.createdAt,
    updatedAt: current.updatedAt,
    photos: current.photos,
  };

  return {
    ...recent,
    ...preserved,
    title: recent.title || current.title,
    summary: recent.summary || current.summary,
    content: recent.content || current.content,
    linkedGuardianContactId: current.linkedGuardianContactId,
    sourceGroupJournalId: current.sourceGroupJournalId,
    generatedFromGroup: current.generatedFromGroup,
    participantClientIds: current.participantClientIds,
  };
}

function buildPreviewKey(photo, index) {
  return typeof photo === 'string' ? `legacy-${index}` : photo.id || `photo-${index}`;
}

function LabeledField({ label, required = false, children, hint }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ChoicePills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            value === option.value
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MultiChoicePills({ options, values, onToggle, color = 'primary' }) {
  const activeClasses = color === 'red'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-primary-50 text-primary-700 border-primary-200';

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? activeClasses
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function TypeSelector({ favorites, recents, onChoose, onToggleFavorite }) {
  const favoriteSet = new Set(favorites);

  return (
    <div className="space-y-6">
      {(favorites.length > 0 || recents.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">즐겨찾는 일지</p>
            <div className="flex flex-wrap gap-2">
              {favorites.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChoose(type)}
                  className="px-3 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100"
                >
                  {journalTypeLabel(type)}
                </button>
              ))}
              {favorites.length === 0 && <p className="text-sm text-gray-400">아직 등록한 즐겨찾기 일지가 없습니다.</p>}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">최근 사용 유형</p>
            <div className="flex flex-wrap gap-2">
              {recents.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChoose(type)}
                  className="px-3 py-2 rounded-xl bg-sage-50 text-sage-700 text-sm font-medium hover:bg-sage-100"
                >
                  {journalTypeLabel(type)}
                </button>
              ))}
              {recents.length === 0 && <p className="text-sm text-gray-400">최근 사용 이력이 아직 없습니다.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {getJournalTypeCards().map((item) => (
          <div
            key={item.value}
            onClick={() => onChoose(item.value)}
            className="card p-5 text-left hover:shadow-card-hover transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onChoose(item.value);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`badge border ${item.color}`}>{item.shortLabel}</span>
                <p className="font-semibold text-gray-900 mt-3">{item.label}</p>
                <p className="text-sm text-gray-500 mt-2">{item.description}</p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(item.value);
                }}
                className={`p-2 rounded-lg ${
                  favoriteSet.has(item.value)
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-gray-100 text-gray-400 hover:text-amber-600'
                }`}
                aria-label={`${item.label} 즐겨찾기`}
              >
                <Star size={16} className={favoriteSet.has(item.value) ? 'fill-current' : ''} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getJournalTypeCards() {
  return [
    {
      value: JOURNAL_TYPES.OBSERVATION,
      label: '아동관찰일지',
      shortLabel: '관찰',
      description: '일상 반응과 정서 변화, 개입 과정을 기록합니다.',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      value: JOURNAL_TYPES.PLAY_INDIVIDUAL,
      label: '놀이활동일지(개별)',
      shortLabel: '놀이',
      description: '놀이 참여 수준과 또래 상호작용을 남깁니다.',
      color: 'bg-violet-50 text-violet-700 border-violet-200',
    },
    {
      value: JOURNAL_TYPES.PROGRAM_GROUP,
      label: '프로그램활동일지(집단)',
      shortLabel: '집단',
      description: '집단 활동 운영 후 개별 초안을 자동 생성합니다.',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      value: JOURNAL_TYPES.COUNSELING,
      label: '상담일지',
      shortLabel: '상담',
      description: '상담 주제, 주요 이슈, 개입과 후속 계획을 정리합니다.',
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    {
      value: JOURNAL_TYPES.GUARDIAN_CONTACT,
      label: '보호자연락일지',
      shortLabel: '연락',
      description: '전화, 문자, 알림장, 대면 소통 내용을 관리합니다.',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      value: JOURNAL_TYPES.ATTENDANCE_DAILY,
      label: '출결·귀가일지',
      shortLabel: '출결',
      description: '등원·귀가와 인계 메모를 빠르게 기록합니다.',
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    },
    {
      value: JOURNAL_TYPES.LIFE_GUIDANCE,
      label: '생활지도일지',
      shortLabel: '생활',
      description: '생활 규칙, 위생, 습관 형성 지도를 기록합니다.',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      value: JOURNAL_TYPES.INCIDENT_RISK,
      label: '사고·위험기록지',
      shortLabel: '위험',
      description: '안전사고, 위험징후, 즉시 조치와 보호자 안내를 기록합니다.',
      color: 'bg-red-50 text-red-700 border-red-200',
    },
    {
      value: JOURNAL_TYPES.HOMEWORK_GUIDANCE,
      label: '숙제·학습지도일지',
      shortLabel: '학습',
      description: '과제 수행 상태와 개별 학습 지원 내용을 남깁니다.',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      value: JOURNAL_TYPES.MEAL_HEALTH,
      label: '급간식·건강관리일지',
      shortLabel: '건강',
      description: '급식, 간식, 컨디션, 복약 상태를 기록합니다.',
      color: 'bg-green-50 text-green-700 border-green-200',
    },
  ];
}

export default function JournalForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [selectedType, setSelectedType] = useState('');
  const [form, setForm] = useState(createEmptyJournal());
  const [baseJournal, setBaseJournal] = useState(null);
  const [clients, setClients] = useState([]);
  const [allJournals, setAllJournals] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState('');
  const [suggestionPreview, setSuggestionPreview] = useState(null);
  const [favoriteTypes, setFavoriteTypes] = useState(getFavoriteJournalTypes());
  const [recentTypes, setRecentTypes] = useState(getRecentJournalTypes());

  const draftKey = getDraftKey(isNew, selectedType || form.type, id);
  const template = getJournalTemplate(selectedType || form.type);

  useEffect(() => {
    setClients(getClients());
    const nextJournals = getJournals();
    setAllJournals(nextJournals);
    setRecentTypes(getRecentJournalTypes());
    setFavoriteTypes(getFavoriteJournalTypes());

    if (!isNew) {
      const existing = getJournal(id);
      if (!existing) return;

      const draft = getJournalDraft(id);
      const initial = draft
        ? { ...existing, ...draft }
        : existing;

      setSelectedType(initial.type);
      setForm(initial);
      setBaseJournal(existing);
      setHasDraft(Boolean(draft));
      setRestoredDraftAt(draft?.draftSavedAt || '');
      setHasUnsavedChanges(false);
      return;
    }

    if (!selectedType) {
      setForm(createEmptyJournal());
      setBaseJournal(null);
      setHasDraft(false);
      setHasUnsavedChanges(false);
      setDraftStatus('');
      return;
    }

    const draft = getJournalDraft(draftKey);
    if (draft) {
      setForm({ ...createEmptyJournal(selectedType), ...draft });
      setHasDraft(true);
      setHasUnsavedChanges(true);
      setDraftStatus('임시저장된 초안을 복원했습니다.');
      setRestoredDraftAt(draft.draftSavedAt || '');
    } else {
      setForm(createEmptyJournal(selectedType));
      setHasDraft(false);
      setHasUnsavedChanges(false);
      setDraftStatus('');
      setRestoredDraftAt('');
    }
  }, [draftKey, id, isNew, selectedType]);

  useEffect(() => {
    let ignore = false;

    async function loadPreviews() {
      const previews = await Promise.all((form.photos || []).map(async (photo, index) => ({
        key: buildPreviewKey(photo, index),
        src: await getPhotoDataUrl(photo),
      })));

      if (!ignore) {
        setPhotoPreviews(previews.filter((preview) => preview.src));
      }
    }

    loadPreviews();
    return () => {
      ignore = true;
    };
  }, [form.photos]);

  useEffect(() => {
    if (!hasUnsavedChanges || !selectedType && isNew) return undefined;

    const timer = window.setTimeout(() => {
      const ok = saveJournalDraft(draftKey, form);
      if (ok) {
        setHasDraft(true);
        setDraftStatus('작성 중인 내용을 자동 저장했습니다.');
      } else {
        setDraftStatus('임시저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.');
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [draftKey, form, hasUnsavedChanges, isNew, selectedType]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const filteredClients = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(query));
  }, [clientQuery, clients]);

  const recentSameType = useMemo(() => (
    allJournals.filter((journal) => (
      journal.type === (selectedType || form.type)
      && journal.id !== form.id
      && (!form.clientId || journal.clientId === form.clientId)
    ))
  ), [allJournals, form.clientId, form.id, form.type, selectedType]);

  const linkedChildren = useMemo(
    () => (form.id ? getLinkedJournalChildren(form.id) : []),
    [form.id, saved],
  );

  function updateForm(next) {
    setHasUnsavedChanges(true);
    setSaveError('');
    setForm((prev) => (typeof next === 'function' ? next(prev) : next));
  }

  function setField(key, value) {
    updateForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayField(key, value) {
    updateForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  }

  function chooseType(type) {
    setSelectedType(type);
    setSuggestionPreview(null);
  }

  function applySuggestion() {
    const suggestion = buildJournalSuggestion({
      type: selectedType || form.type,
      commonFields: form,
      typeFields: form,
      recentEntries: recentSameType.slice(0, 3),
    });

    setSuggestionPreview(suggestion);
    updateForm((prev) => ({
      ...prev,
      title: prev.title || suggestion.title,
      summary: suggestion.summary || prev.summary,
      content: suggestion.content,
    }));
  }

  function applyQuickPhrase(text) {
    updateForm((prev) => ({
      ...prev,
      content: prev.content.trim()
        ? `${prev.content.trimEnd()}\n\n${text}`
        : text,
    }));
  }

  function applyRecentEntry() {
    if (!recentSameType[0]) return;
    updateForm((prev) => mergeFromRecent(prev, recentSameType[0]));
  }

  async function handlePhotos(event) {
    const files = Array.from(event.target.files || []);

    try {
      const nextPhotos = await Promise.all(files.map((file) => savePhotoFile(file)));
      updateForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...nextPhotos],
      }));
    } catch (error) {
      setSaveError(error?.message || '사진 저장 중 오류가 발생했습니다.');
    }

    event.target.value = '';
  }

  async function removePhoto(index) {
    const target = form.photos[index];
    updateForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, currentIndex) => currentIndex !== index),
    }));

    if (target && typeof target === 'object' && target.id) {
      const baseIds = new Set(getPhotoIds(baseJournal?.photos || []));
      if (!baseIds.has(target.id)) {
        await deletePhotoRefs([target]);
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const normalizedPhotos = await migrateLegacyPhotos(form.photos);
      const suggestion = buildJournalSuggestion({
        type: selectedType || form.type,
        commonFields: form,
        typeFields: form,
        recentEntries: recentSameType.slice(0, 3),
      });

      const savedJournal = saveJournal({
        ...form,
        type: selectedType || form.type,
        photos: normalizedPhotos,
        summary: form.summary || suggestion.summary,
      });

      clearJournalDraft(draftKey);
      await deleteRemovedPhotos(baseJournal?.photos || [], normalizedPhotos);
      setBaseJournal(savedJournal);
      setForm(savedJournal);
      setHasDraft(false);
      setHasUnsavedChanges(false);
      setDraftStatus('');
      setSaved(true);
      setAllJournals(getJournals());
      setRecentTypes(getRecentJournalTypes());
      setTimeout(() => setSaved(false), 1800);

      if (isNew) {
        navigate(`/journal/${savedJournal.id}`, { replace: true });
      }
    } catch (error) {
      setSaveError(error?.message || '저장 중 오류가 발생했습니다.');
    }
  }

  async function handleDelete() {
    clearJournalDraft(draftKey);
    await deletePhotoRefs(form.photos.filter((photo) => typeof photo === 'object'));
    deleteJournal(form.id);
    navigate('/journals');
  }

  async function resetDraft() {
    clearJournalDraft(draftKey);
    await deleteRemovedPhotos(form.photos || [], baseJournal?.photos || []);
    if (baseJournal) {
      setForm(baseJournal);
    } else if (selectedType) {
      setForm(createEmptyJournal(selectedType));
    }
    setHasDraft(false);
    setHasUnsavedChanges(false);
    setDraftStatus('임시저장 초안을 비웠습니다.');
    setRestoredDraftAt('');
  }

  function createGuardianTitle(clientIdValue) {
    const client = getClient(clientIdValue);
    return client ? `${client.name} 보호자` : '';
  }

  function selectClient(client) {
    updateForm((prev) => ({
      ...prev,
      clientId: client.id,
      childName: client.name,
      guardianName: prev.type === JOURNAL_TYPES.GUARDIAN_CONTACT && !prev.guardianName
        ? client.guardian || createGuardianTitle(client.id)
        : prev.guardianName,
    }));
    setClientQuery(client.name);
    setShowClientSelect(false);
  }

  async function syncGroupDrafts() {
    const count = resyncGroupDrafts(form.id);
    setAllJournals(getJournals());
    setDraftStatus(`집단 활동에서 생성된 개별 초안 ${count}건에 공통 정보를 다시 반영했습니다.`);
  }

  if (isNew && !selectedType) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="새 일지 작성"
          subtitle="먼저 작성할 일지 유형을 선택하세요. 즐겨찾기와 최근 유형을 상단에 고정해 빠르게 시작할 수 있습니다."
        />
        <TypeSelector
          favorites={favoriteTypes}
          recents={recentTypes}
          onChoose={chooseType}
          onToggleFavorite={(type) => setFavoriteTypes(toggleFavoriteJournalType(type))}
        />
      </div>
    );
  }

  const showAttendanceBlock = [
    JOURNAL_TYPES.OBSERVATION,
    JOURNAL_TYPES.PLAY_INDIVIDUAL,
    JOURNAL_TYPES.ATTENDANCE_DAILY,
    JOURNAL_TYPES.INCIDENT_RISK,
  ].includes(form.type);
  const showMedicationBlock = [
    JOURNAL_TYPES.OBSERVATION,
    JOURNAL_TYPES.PLAY_INDIVIDUAL,
    JOURNAL_TYPES.MEAL_HEALTH,
  ].includes(form.type);
  const showRiskBlock = [
    JOURNAL_TYPES.OBSERVATION,
    JOURNAL_TYPES.PLAY_INDIVIDUAL,
    JOURNAL_TYPES.INCIDENT_RISK,
  ].includes(form.type);
  const guardianLinkable = [
    JOURNAL_TYPES.OBSERVATION,
    JOURNAL_TYPES.PLAY_INDIVIDUAL,
    JOURNAL_TYPES.INCIDENT_RISK,
  ].includes(form.type);

  return (
    <div className="animate-fade-in max-w-5xl">
      <PageHeader
        title={isNew ? `${template.label} 작성` : `${template.label} 수정`}
        subtitle={template.description}
        actions={(
          <div className="flex gap-2 flex-wrap">
            {isNew && (
              <button type="button" onClick={() => setSelectedType('')} className="btn-secondary">
                <ArrowLeft size={14} />
                유형 다시 선택
              </button>
            )}
            {!isNew && form.type === JOURNAL_TYPES.PROGRAM_GROUP && linkedChildren.length > 0 && (
              <button type="button" onClick={syncGroupDrafts} className="btn-secondary">
                <RefreshCcw size={14} />
                개별 초안 재반영
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={() => setDeleteConfirm(true)} className="btn-danger">
                <Trash2 size={14} />
                삭제
              </button>
            )}
          </div>
        )}
      />

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Link to="/journals" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
          <ArrowLeft size={14} />
          목록으로 돌아가기
        </Link>
        <span className="badge border bg-white text-gray-700">
          {getJournalTypeLabel(form.type)}
        </span>
      </div>

      <div className="card p-4 mb-5 bg-sage-50/50 border-sage-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-800">작성 보조</p>
            <p className="text-xs text-gray-500 mt-1">
              자동 저장, 최근 기록 복사, 템플릿 문구, 자동 문장 초안을 함께 지원합니다.
              {restoredDraftAt && ` 마지막 복원: ${new Date(restoredDraftAt).toLocaleString('ko-KR')}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {recentSameType[0] && (
              <button type="button" onClick={applyRecentEntry} className="btn-secondary">
                <Copy size={14} />
                최근 동일 유형 불러오기
              </button>
            )}
            <button type="button" onClick={applySuggestion} className="btn-secondary">
              <Sparkles size={14} />
              자동 문장 초안
            </button>
            {hasDraft && (
              <button type="button" onClick={resetDraft} className="btn-secondary">
                <RefreshCcw size={14} />
                임시저장 비우기
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {template.quickPhrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => applyQuickPhrase(phrase)}
              className="px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100"
            >
              {phrase.split(':')[0]}
            </button>
          ))}
        </div>
        {draftStatus && <p className="text-xs text-sage-700 mt-3">{draftStatus}</p>}
        {suggestionPreview && (
          <p className="text-xs text-gray-500 mt-2">
            추천 제목: {suggestionPreview.titleCandidates.join(' / ') || suggestionPreview.title}
          </p>
        )}
        {saveError && <p className="text-xs text-red-600 mt-2">{saveError}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <LabeledField label="날짜" required>
              <input type="date" value={form.date} onChange={(event) => setField('date', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="시간">
              <input type="time" value={form.time} onChange={(event) => setField('time', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="상태">
              <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="input-field">
                <option value="draft">임시 저장</option>
                <option value="finalized">확정</option>
              </select>
            </LabeledField>
            <LabeledField label="태그" hint="쉼표로 구분해 입력하세요.">
              <input
                type="text"
                value={form.tags.join(', ')}
                onChange={(event) => setField('tags', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                className="input-field"
                placeholder="예: 정서지원, 놀이, 보호자공유"
              />
            </LabeledField>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <LabeledField label="대상 아동" required>
              <div className="relative">
                <input
                  type="text"
                  value={form.childName}
                  onChange={(event) => {
                    setField('childName', event.target.value);
                    setField('clientId', '');
                    setClientQuery(event.target.value);
                    setShowClientSelect(true);
                  }}
                  onFocus={() => {
                    setClientQuery(form.childName || '');
                    setShowClientSelect(true);
                  }}
                  onBlur={() => window.setTimeout(() => setShowClientSelect(false), 150)}
                  className="input-field"
                  placeholder="이름 검색 또는 직접 입력"
                  required
                />
                {showClientSelect && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={() => selectClient(client)}
                        className="w-full text-left px-3 py-2 hover:bg-primary-50 text-sm text-gray-700"
                      >
                        <div className="font-medium">{client.name}</div>
                        <div className="text-xs text-gray-400">
                          {client.guardian ? `보호자 ${client.guardian}` : '보호자 정보 없음'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </LabeledField>

            <LabeledField label="제목" required>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setField('title', event.target.value)}
                className="input-field"
                placeholder={template.defaultTitle}
                required
              />
            </LabeledField>
          </div>

          <div className="mt-4">
            <LabeledField label="요약">
              <textarea
                value={form.summary}
                onChange={(event) => setField('summary', event.target.value)}
                className="input-field resize-none"
                rows={2}
                placeholder="기관 보고용 짧은 요약을 남겨 두면 목록과 출력에서 활용됩니다."
              />
            </LabeledField>
          </div>
        </div>

        {showAttendanceBlock && (
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">출결·귀가 정보</p>
            <ChoicePills
              options={ATTENDANCE_OPTIONS}
              value={form.attendanceStatus}
              onChange={(value) => setField('attendanceStatus', value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <LabeledField label="등원 시간">
                <input type="time" value={form.arrivalTime} onChange={(event) => setField('arrivalTime', event.target.value)} className="input-field" />
              </LabeledField>
              <LabeledField label="귀가 시간">
                <input type="time" value={form.departureTime} onChange={(event) => setField('departureTime', event.target.value)} className="input-field" />
              </LabeledField>
              <LabeledField label="귀가 방식 / 인계자">
                <select value={form.escortType} onChange={(event) => setField('escortType', event.target.value)} className="input-field">
                  <option value="">선택</option>
                  {ESCORT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </LabeledField>
            </div>
            <div className="mt-4">
              <LabeledField label="당일 특이사항 / 인계 메모">
                <textarea
                  value={form.handoffNote}
                  onChange={(event) => setField('handoffNote', event.target.value)}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="당일 컨디션, 귀가 시 전달 사항을 적어 주세요."
                />
              </LabeledField>
            </div>
          </div>
        )}

        {showMedicationBlock && (
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm font-semibold text-gray-800">복약 기록</p>
              <label className="text-sm text-gray-600 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.medicationGiven}
                  onChange={(event) => setField('medicationGiven', event.target.checked)}
                />
                복약 있음
              </label>
            </div>
            {form.medicationGiven ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LabeledField label="약품명">
                  <input type="text" value={form.medicationName} onChange={(event) => setField('medicationName', event.target.value)} className="input-field" />
                </LabeledField>
                <LabeledField label="용량/횟수">
                  <input type="text" value={form.medicationDose} onChange={(event) => setField('medicationDose', event.target.value)} className="input-field" />
                </LabeledField>
                <LabeledField label="메모">
                  <input type="text" value={form.medicationNote} onChange={(event) => setField('medicationNote', event.target.value)} className="input-field" />
                </LabeledField>
              </div>
            ) : (
              <p className="text-sm text-gray-400">복약이 없으면 체크하지 않아도 됩니다.</p>
            )}
          </div>
        )}

        {showRiskBlock && (
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">위험징후 및 후속조치</p>
              <label className="text-sm text-gray-600 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.followUpNeeded}
                  onChange={(event) => setField('followUpNeeded', event.target.checked)}
                />
                후속조치 필요
              </label>
            </div>
            <MultiChoicePills
              options={RISK_FLAG_OPTIONS}
              values={form.riskFlags}
              onToggle={(value) => toggleArrayField('riskFlags', value)}
              color="red"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <LabeledField label="위험 메모">
                <textarea
                  value={form.riskNote}
                  onChange={(event) => setField('riskNote', event.target.value)}
                  className="input-field resize-none"
                  rows={4}
                  placeholder="상황, 반응, 현장 조치를 구체적으로 적어 주세요."
                />
              </LabeledField>
              <LabeledField label="후속조치 계획">
                <textarea
                  value={form.followUpText}
                  onChange={(event) => setField('followUpText', event.target.value)}
                  className="input-field resize-none"
                  rows={4}
                  placeholder="추가 관찰, 보호자 소통, 기관 내 공유 계획을 정리합니다."
                />
              </LabeledField>
            </div>
          </div>
        )}

        {guardianLinkable && (
          <div className="card p-5">
            <label className="text-sm text-gray-700 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.guardianContactNeeded}
                onChange={(event) => setField('guardianContactNeeded', event.target.checked)}
              />
              보호자 연락 일지 초안을 함께 생성합니다.
            </label>
            {form.linkedGuardianContactId && (
              <p className="text-xs text-sage-700 mt-2">
                연결된 보호자 연락 일지: {form.linkedGuardianContactId}
              </p>
            )}
          </div>
        )}

        <TypeSpecificFields form={form} setField={setField} toggleArrayField={toggleArrayField} clients={clients} />

        <div className="card p-5">
          <LabeledField label="본문">
            <textarea
              value={form.content}
              onChange={(event) => setField('content', event.target.value)}
              rows={10}
              className="input-field resize-none"
              placeholder="관찰 내용, 개입 과정, 보호자 소통, 후속 계획을 자유롭게 적어 주세요."
            />
          </LabeledField>
        </div>

        <div className="card p-5">
          <LabeledField label="사진 첨부" hint="사진은 브라우저 로컬 저장소에 보관되며 백업 파일에도 함께 포함됩니다.">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl px-5 py-8 text-center hover:border-primary-300 hover:bg-primary-50/50 transition-colors cursor-pointer"
            >
              <Camera size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">클릭해서 사진을 추가하세요.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
          </LabeledField>

          {photoPreviews.length > 0 && (
            <div className="photo-grid mt-4">
              {photoPreviews.map((preview, index) => (
                <div key={preview.key} className="relative group aspect-square">
                  <img src={preview.src} alt={`첨부 사진 ${index + 1}`} className="w-full h-full object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {form.type === JOURNAL_TYPES.PROGRAM_GROUP && linkedChildren.length > 0 && (
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">연결된 개별 초안</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedChildren.map((entry) => (
                <Link
                  key={entry.id}
                  to={`/journal/${entry.id}`}
                  className="rounded-xl border border-gray-200 p-3 hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{entry.childName || '이름 없음'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {entry.status === 'finalized' ? '확정 완료' : '초안'} / {entry.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pb-8">
          <button type="submit" className="btn-primary">
            <Save size={14} />
            {isNew ? '저장하기' : '수정 완료'}
          </button>
          {saved && <span className="text-sm text-sage-700">저장되었습니다.</span>}
        </div>
      </form>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">일지를 삭제할까요?</p>
                <p className="text-sm text-gray-500 mt-1">삭제하면 연결된 초안도 함께 정리되며 복구할 수 없습니다.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={handleDelete} className="btn-danger flex-1 justify-center">
                삭제
              </button>
              <button type="button" onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1 justify-center">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeSpecificFields({ form, setField, toggleArrayField, clients }) {
  if (form.type === JOURNAL_TYPES.OBSERVATION) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">관찰 핵심 항목</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LabeledField label="활동명">
            <input type="text" value={form.activityName} onChange={(event) => setField('activityName', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="정서 상태">
            <select value={form.emotionState} onChange={(event) => setField('emotionState', event.target.value)} className="input-field">
              <option value="">선택</option>
              {EMOTION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="다음 계획">
            <input type="text" value={form.nextPlan} onChange={(event) => setField('nextPlan', event.target.value)} className="input-field" />
          </LabeledField>
        </div>
        <div className="mt-4">
          <LabeledField label="개입 내용">
            <textarea value={form.interventionNote} onChange={(event) => setField('interventionNote', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.PLAY_INDIVIDUAL) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">놀이활동 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <LabeledField label="활동명">
            <input type="text" value={form.activityName} onChange={(event) => setField('activityName', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="참여 수준">
            <select value={form.participationLevel} onChange={(event) => setField('participationLevel', event.target.value)} className="input-field">
              <option value="">선택</option>
              {PARTICIPATION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="또래 상호작용">
            <input type="text" value={form.peerInteraction} onChange={(event) => setField('peerInteraction', event.target.value)} className="input-field" placeholder="예: 순서 조율, 협력적, 갈등 발생" />
          </LabeledField>
          <LabeledField label="정서 상태">
            <select value={form.emotionState} onChange={(event) => setField('emotionState', event.target.value)} className="input-field">
              <option value="">선택</option>
              {EMOTION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </LabeledField>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <LabeledField label="개입 내용">
            <textarea value={form.interventionNote} onChange={(event) => setField('interventionNote', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
          <LabeledField label="다음 계획">
            <textarea value={form.nextPlan} onChange={(event) => setField('nextPlan', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.PROGRAM_GROUP) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">집단 프로그램 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <LabeledField label="활동명">
            <input type="text" value={form.activityName} onChange={(event) => setField('activityName', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="활동 목표">
            <input type="text" value={form.activityGoal} onChange={(event) => setField('activityGoal', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="진행 시간">
            <input type="text" value={form.programDuration} onChange={(event) => setField('programDuration', event.target.value)} className="input-field" placeholder="예: 15:30-16:20" />
          </LabeledField>
          <LabeledField label="집단 분위기">
            <input type="text" value={form.programMood} onChange={(event) => setField('programMood', event.target.value)} className="input-field" placeholder="예: 집중도 높음, 초반 산만" />
          </LabeledField>
        </div>
        <div className="mt-4">
          <LabeledField label="참여 아동">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {clients.map((client) => (
                <label key={client.id} className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.participantClientIds.includes(client.id)}
                    onChange={() => toggleArrayField('participantClientIds', client.id)}
                  />
                  <span>{client.name}</span>
                </label>
              ))}
            </div>
          </LabeledField>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <LabeledField label="운영 평가">
            <textarea value={form.programEvaluation} onChange={(event) => setField('programEvaluation', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
          <LabeledField label="안전 사항">
            <textarea value={form.safetyNote} onChange={(event) => setField('safetyNote', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.COUNSELING) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">상담 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledField label="상담 주제">
            <input type="text" value={form.counselingTopic} onChange={(event) => setField('counselingTopic', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="주요 이슈">
            <input type="text" value={form.mainIssue} onChange={(event) => setField('mainIssue', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="개입 내용">
            <textarea value={form.intervention} onChange={(event) => setField('intervention', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
          <LabeledField label="다음 상담 계획">
            <textarea value={form.nextAction} onChange={(event) => setField('nextAction', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.GUARDIAN_CONTACT) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">보호자 연락 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LabeledField label="보호자명">
            <input type="text" value={form.guardianName} onChange={(event) => setField('guardianName', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="연락 방식">
            <select value={form.contactMethod} onChange={(event) => setField('contactMethod', event.target.value)} className="input-field">
              {CONTACT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="연결 일지 ID">
            <input type="text" value={form.linkedJournalId} onChange={(event) => setField('linkedJournalId', event.target.value)} className="input-field" />
          </LabeledField>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <LabeledField label="전달 내용">
            <textarea value={form.deliveryContent} onChange={(event) => setField('deliveryContent', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
          <LabeledField label="보호자 반응">
            <textarea value={form.guardianResponse} onChange={(event) => setField('guardianResponse', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
          <LabeledField label="후속 계획">
            <textarea value={form.guardianFollowUp} onChange={(event) => setField('guardianFollowUp', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.ATTENDANCE_DAILY) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">출결 상세 메모</p>
        <LabeledField label="당일 요약">
          <textarea value={form.content} onChange={(event) => setField('content', event.target.value)} rows={4} className="input-field resize-none" placeholder={`${attendanceLabel(form.attendanceStatus)} / 귀가 확인 여부 / 컨디션 메모`} />
        </LabeledField>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.LIFE_GUIDANCE) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">생활지도 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LabeledField label="지도 영역">
            <input type="text" value={form.lifeArea} onChange={(event) => setField('lifeArea', event.target.value)} className="input-field" placeholder="예: 위생, 정리정돈, 규칙준수" />
          </LabeledField>
          <LabeledField label="지도 내용">
            <input type="text" value={form.guidanceAction} onChange={(event) => setField('guidanceAction', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="아동 반응">
            <input type="text" value={form.guidanceResponse} onChange={(event) => setField('guidanceResponse', event.target.value)} className="input-field" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.INCIDENT_RISK) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">사고·위험 상황 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LabeledField label="위험 수준">
            <select value={form.incidentLevel} onChange={(event) => setField('incidentLevel', event.target.value)} className="input-field">
              {INCIDENT_LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="보호자 안내 여부">
            <input type="text" value={form.guardianNotified} onChange={(event) => setField('guardianNotified', event.target.value)} className="input-field" placeholder="예: 전화 안내 완료, 미안내" />
          </LabeledField>
          <LabeledField label="즉시 조치">
            <input type="text" value={form.actionTaken} onChange={(event) => setField('actionTaken', event.target.value)} className="input-field" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.HOMEWORK_GUIDANCE) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">학습지도 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <LabeledField label="과목/과제">
            <input type="text" value={form.homeworkSubject} onChange={(event) => setField('homeworkSubject', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="현재 수준">
            <input type="text" value={form.learningLevel} onChange={(event) => setField('learningLevel', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="지원 방법">
            <input type="text" value={form.supportMethod} onChange={(event) => setField('supportMethod', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="학습 반응">
            <input type="text" value={form.learningOutcome} onChange={(event) => setField('learningOutcome', event.target.value)} className="input-field" />
          </LabeledField>
        </div>
      </div>
    );
  }

  if (form.type === JOURNAL_TYPES.MEAL_HEALTH) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">급간식·건강 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <LabeledField label="급식 구분">
            <select value={form.mealType} onChange={(event) => setField('mealType', event.target.value)} className="input-field">
              <option value="">선택</option>
              {MEAL_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="식사 상태">
            <select value={form.appetiteLevel} onChange={(event) => setField('appetiteLevel', event.target.value)} className="input-field">
              <option value="">선택</option>
              {APPETITE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="건강 체크">
            <input type="text" value={form.healthCheck} onChange={(event) => setField('healthCheck', event.target.value)} className="input-field" />
          </LabeledField>
          <LabeledField label="증상 메모">
            <input type="text" value={form.symptomNote} onChange={(event) => setField('symptomNote', event.target.value)} className="input-field" />
          </LabeledField>
        </div>
      </div>
    );
  }

  return null;
}
