import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Copy,
  FileDown,
  PlusCircle,
  RefreshCcw,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  ACTIVITY_KIND_OPTIONS,
  CONSULTATION_METHOD_OPTIONS,
  INFO_PROVIDER_OPTIONS,
  JOURNAL_TYPE_OPTIONS,
  JOURNAL_TYPES,
  LEVEL_OPTIONS,
  PLAN_PERIOD_OPTIONS,
  SATISFACTION_OPTIONS,
  SOLO_PLAY_TIME_OPTIONS,
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
  getRecentJournalTypes,
  journalTypeLabel,
  saveJournal,
  saveJournalDraft,
  toggleFavoriteJournalType,
} from '../lib/storage';
import { deletePhotoRefs, getPhotoDataUrl, savePhotoDataUrl, savePhotoFile } from '../lib/photoStore';

const PERIOD_MONTHS = {
  상반기: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'],
  하반기: ['9월', '10월', '11월', '12월'],
};

function getDraftKey(isNew, selectedType, id) {
  return isNew ? `new:${selectedType || 'select'}` : id;
}

function buildPreviewKey(photo, index) {
  return typeof photo === 'string' ? `legacy-${index}` : photo.id || `photo-${index}`;
}

function getPhotoIds(photos = []) {
  return photos
    .filter((photo) => photo && typeof photo === 'object' && photo.id)
    .map((photo) => photo.id);
}

function createPlanRow(month = '') {
  return {
    id: genId(),
    month,
    sessionCount: '',
    playArea: '',
    activityContent: '',
    planNo: '',
    placeMaterials: '',
  };
}

function createPeerLevelRow() {
  return {
    id: genId(),
    childName: '',
    playLevel: '',
    notes: '',
  };
}

function createFamilyRow() {
  return {
    id: genId(),
    relation: '',
    name: '',
    age: '',
    disability: '',
    notes: '',
  };
}

async function migrateLegacyPhotos(photos = []) {
  return Promise.all(
    photos.map(async (photo) => {
      if (typeof photo === 'string') {
        return savePhotoDataUrl(photo, { id: genId(), name: 'legacy-photo' });
      }
      return photo;
    }),
  );
}

async function deleteRemovedPhotos(previousPhotos = [], nextPhotos = []) {
  const nextIds = new Set(getPhotoIds(nextPhotos));
  const removed = previousPhotos.filter((photo) => (
    photo && typeof photo === 'object' && photo.id && !nextIds.has(photo.id)
  ));
  await deletePhotoRefs(removed);
}

function LabeledField({ label, required = false, hint, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, description, actions, children }) {
  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function StatusPills({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        { value: 'draft', label: '임시저장' },
        { value: 'finalized', label: '확정본' },
      ].map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            value === item.value
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TypeSelector({ favorites, recents, onChoose, onToggleFavorite }) {
  const favoriteSet = new Set(favorites);

  return (
    <div className="space-y-6">
      {(favorites.length > 0 || recents.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">즐겨찾는 양식</p>
            <div className="flex flex-wrap gap-2">
              {favorites.length === 0 && (
                <p className="text-sm text-gray-400">즐겨찾기한 양식이 아직 없습니다.</p>
              )}
              {favorites.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChoose(type)}
                  className="rounded-xl bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                >
                  {journalTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">최근 사용 양식</p>
            <div className="flex flex-wrap gap-2">
              {recents.length === 0 && (
                <p className="text-sm text-gray-400">최근 사용 기록이 아직 없습니다.</p>
              )}
              {recents.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChoose(type)}
                  className="rounded-xl bg-sage-50 px-3 py-2 text-sm font-medium text-sage-700 hover:bg-sage-100"
                >
                  {journalTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {JOURNAL_TYPE_OPTIONS.map((option) => (
          <div
            key={option.value}
            role="button"
            tabIndex={0}
            onClick={() => onChoose(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onChoose(option.value);
              }
            }}
            className="card cursor-pointer p-5 text-left transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`badge border ${option.color}`}>{option.shortLabel}</span>
                <p className="mt-3 font-semibold text-gray-900">{option.label}</p>
                <p className="mt-2 text-sm text-gray-500">{option.description}</p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(option.value);
                }}
                className={`rounded-lg p-2 ${
                  favoriteSet.has(option.value)
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-gray-100 text-gray-400 hover:text-amber-600'
                }`}
                aria-label={`${option.label} 즐겨찾기`}
              >
                <Star size={16} className={favoriteSet.has(option.value) ? 'fill-current' : ''} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryPreview({ suggestion }) {
  if (!suggestion) return null;

  return (
    <SectionCard title="자동 문장 초안" description="제목과 요약을 빠르게 정리할 때 참고하세요.">
      <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
        <p className="text-sm font-semibold text-gray-900">{suggestion.title}</p>
        {suggestion.summary && <p className="mt-2 text-sm text-gray-600">{suggestion.summary}</p>}
        {suggestion.contentSections.length > 0 && (
          <div className="mt-4 space-y-3">
            {suggestion.contentSections.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-semibold text-primary-700">{section.title}</p>
                <ul className="mt-1 space-y-1 text-sm text-gray-600">
                  {section.lines.map((line) => (
                    <li key={line}>- {line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function PhotoUploadSection({ fileRef, onChange, previews, onRemove, hint }) {
  return (
    <SectionCard title="사진 첨부" description={hint}>
      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 px-5 py-8 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/50"
      >
        <Camera size={24} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-500">클릭해서 사진을 추가하세요.</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onChange} />

      {previews.length > 0 && (
        <div className="photo-grid">
          {previews.map((preview, index) => (
            <div key={preview.key} className="group relative aspect-square">
              <img src={preview.src} alt={`첨부 사진 ${index + 1}`} className="h-full w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function getActivityPreview(journal) {
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL) {
    return journal.playGoal || journal.currentLevel || journal.summary || '';
  }
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_GROUP) {
    return journal.groupPlan || journal.matchingGoal || journal.summary || '';
  }
  if (journal.type === JOURNAL_TYPES.INTERVIEW_LOG) {
    return journal.consultationContent || journal.futurePlan || journal.summary || '';
  }
  if (journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return journal.healthNotes || journal.serviceGoals || journal.summary || '';
  }
  return journal.detailedActivities || journal.content || journal.activityEvaluation || journal.summary || '';
}

function buildPhotoHint(type) {
  if (type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return '아동 사진, 놀이공간, 놀잇감, 놀이 상황 사진을 필요에 따라 함께 첨부하세요.';
  }
  if (type === JOURNAL_TYPES.ACTIVITY_LOG) {
    return '활동 장면 1~2장을 첨부해 활동일지와 함께 보관하세요.';
  }
  return '양식 보완에 필요한 사진을 첨부할 수 있습니다.';
}

function isValidType(value) {
  return JOURNAL_TYPE_OPTIONS.some((option) => option.value === value);
}

export default function JournalForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef = useRef(null);

  const requestedType = searchParams.get('type');
  const requestedClientId = searchParams.get('clientId');
  const initialType = isValidType(requestedType) ? requestedType : '';

  const [selectedType, setSelectedType] = useState(initialType);
  const [form, setForm] = useState(createEmptyJournal(initialType || JOURNAL_TYPES.ACTIVITY_LOG));
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
  const [suggestionPreview, setSuggestionPreview] = useState(null);
  const [favoriteTypes, setFavoriteTypes] = useState(getFavoriteJournalTypes());
  const [recentTypes, setRecentTypes] = useState(getRecentJournalTypes());
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handlePdfDownload() {
    setPdfLoading(true);
    try {
      const { exportSingleJournalPDF } = await import('../lib/exportUtils');
      await exportSingleJournalPDF(form);
    } finally {
      setPdfLoading(false);
    }
  }

  const draftKey = getDraftKey(isNew, selectedType || form.type, id);
  const currentType = selectedType || form.type;
  const template = getJournalTemplate(currentType);

  const recentSameType = useMemo(() => (
    allJournals.filter((journal) => (
      journal.type === currentType
      && journal.id !== form.id
      && (!form.clientId || journal.clientId === form.clientId)
    ))
  ), [allJournals, currentType, form.clientId, form.id]);

  function buildNewJournal(type) {
    const base = createEmptyJournal(type);
    const requestedClient = requestedClientId ? getClient(requestedClientId) : null;

    if (!requestedClient) return base;

    return {
      ...base,
      clientId: requestedClient.id,
      childName: requestedClient.name,
      birthDate: base.birthDate || requestedClient.birthDate || '',
      gender: base.gender || requestedClient.gender || '',
    };
  }

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
      const initial = draft ? { ...existing, ...draft } : existing;

      setSelectedType(initial.type);
      setForm(initial);
      setBaseJournal(existing);
      setHasDraft(Boolean(draft));
      setHasUnsavedChanges(false);
      setDraftStatus(draft ? '임시저장된 내용을 복원했습니다.' : '');
      return;
    }

    if (!selectedType) {
      setForm(createEmptyJournal(JOURNAL_TYPES.ACTIVITY_LOG));
      setBaseJournal(null);
      setHasDraft(false);
      setHasUnsavedChanges(false);
      setDraftStatus('');
      setSuggestionPreview(null);
      return;
    }

    const draft = getJournalDraft(draftKey);
    if (draft) {
      setForm({ ...buildNewJournal(selectedType), ...draft });
      setHasDraft(true);
      setHasUnsavedChanges(true);
      setDraftStatus('임시저장된 초안을 불러왔습니다.');
    } else {
      setForm(buildNewJournal(selectedType));
      setHasDraft(false);
      setHasUnsavedChanges(false);
      setDraftStatus('');
    }
    setBaseJournal(null);
    setSuggestionPreview(null);
  }, [draftKey, id, isNew, requestedClientId, selectedType]);

  useEffect(() => {
    let ignore = false;

    async function loadPreviews() {
      const previews = await Promise.all(
        (form.photos || []).map(async (photo, index) => ({
          key: buildPreviewKey(photo, index),
          src: await getPhotoDataUrl(photo),
        })),
      );

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
    if (!hasUnsavedChanges || (isNew && !selectedType)) return undefined;

    const timer = window.setTimeout(() => {
      const ok = saveJournalDraft(draftKey, form);
      setHasDraft(ok);
      setDraftStatus(ok ? '작성 중인 내용이 자동 저장되었습니다.' : '임시저장에 실패했습니다. 브라우저 저장공간을 확인해 주세요.');
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

  function updateForm(next) {
    setHasUnsavedChanges(true);
    setSaveError('');
    setForm((prev) => (typeof next === 'function' ? next(prev) : next));
  }

  function setField(key, value) {
    updateForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClientChange(clientId) {
    const client = clients.find((item) => item.id === clientId);
    updateForm((prev) => ({
      ...prev,
      clientId,
      childName: client?.name || prev.childName,
      birthDate: prev.type === JOURNAL_TYPES.INITIAL_CONSULTATION ? (prev.birthDate || client?.birthDate || '') : prev.birthDate,
      gender: prev.type === JOURNAL_TYPES.INITIAL_CONSULTATION ? (prev.gender || client?.gender || '') : prev.gender,
    }));
  }

  function chooseType(type) {
    setSelectedType(type);
  }

  function applySuggestion() {
    const suggestion = buildJournalSuggestion({
      type: currentType,
      commonFields: form,
      typeFields: form,
      recentEntries: recentSameType.slice(0, 3),
    });

    setSuggestionPreview(suggestion);
    updateForm((prev) => ({
      ...prev,
      title: prev.title || suggestion.title,
      summary: prev.summary || suggestion.summary,
    }));
  }

  function applyRecentEntry() {
    if (!recentSameType[0]) return;
    const recent = recentSameType[0];
    updateForm((prev) => ({
      ...recent,
      id: prev.id,
      type: prev.type,
      status: prev.status,
      clientId: prev.clientId,
      childName: prev.childName,
      date: prev.date,
      time: prev.time,
      photos: prev.photos,
      createdAt: prev.createdAt,
      updatedAt: prev.updatedAt,
    }));
  }

  function fillPlanRowsByPeriod() {
    const months = PERIOD_MONTHS[form.planPeriod] || [];
    updateForm((prev) => ({
      ...prev,
      planRows: months.map((month, index) => ({
        id: prev.planRows[index]?.id || genId(),
        month,
        sessionCount: prev.planRows[index]?.sessionCount || '',
        playArea: prev.planRows[index]?.playArea || '',
        activityContent: prev.planRows[index]?.activityContent || '',
        planNo: prev.planRows[index]?.planNo || '',
        placeMaterials: prev.planRows[index]?.placeMaterials || '',
      })),
    }));
  }

  function updateRow(listKey, rowId, field, value) {
    updateForm((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  }

  function addRow(listKey, factory) {
    updateForm((prev) => ({
      ...prev,
      [listKey]: [...prev[listKey], factory()],
    }));
  }

  function removeRow(listKey, rowId) {
    updateForm((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((row) => row.id !== rowId),
    }));
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
    if (!currentType) return;

    try {
      const normalizedPhotos = await migrateLegacyPhotos(form.photos);
      const suggestion = buildJournalSuggestion({
        type: currentType,
        commonFields: form,
        typeFields: form,
        recentEntries: recentSameType.slice(0, 3),
      });

      const savedJournal = saveJournal({
        ...form,
        type: currentType,
        title: form.title || template.defaultTitle,
        summary: form.summary || suggestion.summary,
        photos: normalizedPhotos,
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
      window.setTimeout(() => setSaved(false), 1800);

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

    if (isNew) {
      setForm(buildNewJournal(currentType));
    } else if (baseJournal) {
      setForm(baseJournal);
    }

    setHasDraft(false);
    setHasUnsavedChanges(false);
    setDraftStatus('임시저장 내용을 비웠습니다.');
    setSuggestionPreview(null);
  }

  if (isNew && !selectedType) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="양식 작성"
          subtitle="제공하신 5개 공식 양식만 보이도록 정리했습니다. 먼저 작성할 양식을 선택해 주세요."
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={isNew ? template.label : `${template.label} 수정`}
        subtitle={template.description}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to="/journals" className="btn-secondary">
              <ArrowLeft size={14} />
              목록으로
            </Link>
            {!isNew && (
              <button
                type="button"
                onClick={handlePdfDownload}
                disabled={pdfLoading}
                className="btn-secondary disabled:opacity-50"
              >
                <FileDown size={14} />
                {pdfLoading ? 'PDF 생성 중...' : 'PDF 저장'}
              </button>
            )}
            {isNew && (
              <button
                type="button"
                onClick={() => {
                  setSelectedType('');
                  setSuggestionPreview(null);
                }}
                className="btn-secondary"
              >
                양식 다시 선택
              </button>
            )}
          </div>
        )}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard title="양식 정보" description="선택한 양식과 저장 상태를 확인하세요.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="양식 종류">
              <div className={`inline-flex rounded-full border px-3 py-2 text-sm font-medium ${template.color}`}>
                {template.label}
              </div>
            </LabeledField>
            <LabeledField label="저장 상태">
              <StatusPills value={form.status} onChange={(value) => setField('status', value)} />
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
            <LabeledField label="요약 메모">
              <input
                type="text"
                value={form.summary}
                onChange={(event) => setField('summary', event.target.value)}
                className="input-field"
                placeholder="핵심 내용을 짧게 정리해 두세요."
              />
            </LabeledField>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={applySuggestion} className="btn-secondary">
              <Sparkles size={14} />
              제목·요약 초안 만들기
            </button>
            <button
              type="button"
              onClick={applyRecentEntry}
              disabled={recentSameType.length === 0}
              className="btn-secondary disabled:opacity-50"
            >
              <Copy size={14} />
              최근 같은 양식 복사
            </button>
            {hasDraft && (
              <button type="button" onClick={resetDraft} className="btn-secondary">
                <RefreshCcw size={14} />
                임시저장 비우기
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={() => setDeleteConfirm(true)} className="btn-danger">
                <Trash2 size={14} />
                삭제
              </button>
            )}
          </div>

          {saveError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {(draftStatus || saved) && (
            <div className="rounded-2xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-sage-700">
              {saved ? '저장되었습니다.' : draftStatus}
            </div>
          )}
          {template.quickPhrases.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">작성 힌트</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {template.quickPhrases.map((phrase) => (
                  <span key={phrase} className="badge bg-white text-gray-600 border border-gray-200">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="아동 및 작성 기본정보" description="양식 상단에 들어가는 기본 정보를 입력하세요.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="아동 선택">
              <select
                value={form.clientId}
                onChange={(event) => handleClientChange(event.target.value)}
                className="input-field"
              >
                <option value="">직접 입력</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="아동명" required>
              <input
                type="text"
                value={form.childName}
                onChange={(event) => setField('childName', event.target.value)}
                className="input-field"
                required
              />
            </LabeledField>
            <LabeledField label={currentType === JOURNAL_TYPES.INTERVIEW_LOG ? '상담일자' : currentType === JOURNAL_TYPES.PLAY_PLAN_GROUP ? '활동일시(날짜)' : '작성일자'}>
              <input
                type="date"
                value={currentType === JOURNAL_TYPES.INTERVIEW_LOG ? form.consultationDate : form.date}
                onChange={(event) => {
                  if (currentType === JOURNAL_TYPES.INTERVIEW_LOG) setField('consultationDate', event.target.value);
                  else setField('date', event.target.value);
                }}
                className="input-field"
              />
            </LabeledField>
            <LabeledField label={currentType === JOURNAL_TYPES.PLAY_PLAN_GROUP ? '활동 시간' : '기록 시간'}>
              <input
                type="time"
                value={form.time}
                onChange={(event) => setField('time', event.target.value)}
                className="input-field"
              />
            </LabeledField>
            <LabeledField label="놀세이버명">
              <input
                type="text"
                value={form.saverName}
                onChange={(event) => setField('saverName', event.target.value)}
                className="input-field"
              />
            </LabeledField>
            <LabeledField label="작성자">
              <input
                type="text"
                value={form.writerName}
                onChange={(event) => setField('writerName', event.target.value)}
                className="input-field"
              />
            </LabeledField>
            <LabeledField label="작성일">
              <input
                type="date"
                value={form.writerDate}
                onChange={(event) => setField('writerDate', event.target.value)}
                className="input-field"
              />
            </LabeledField>
            <LabeledField label="협력기관 담당자 확인">
              <input
                type="text"
                value={form.collaboratorConfirmed}
                onChange={(event) => setField('collaboratorConfirmed', event.target.value)}
                className="input-field"
                placeholder="확인자명 또는 확인 여부"
              />
            </LabeledField>
          </div>
        </SectionCard>

        <TypeSpecificFields
          form={form}
          setField={setField}
          updateRow={updateRow}
          addRow={addRow}
          removeRow={removeRow}
          fillPlanRowsByPeriod={fillPlanRowsByPeriod}
        />

        <SummaryPreview suggestion={suggestionPreview} />

        <PhotoUploadSection
          fileRef={fileRef}
          onChange={handlePhotos}
          previews={photoPreviews}
          onRemove={removePhoto}
          hint={buildPhotoHint(currentType)}
        />

        <div className="pb-8">
          <button type="submit" className="btn-primary">
            <Save size={14} />
            {isNew ? '저장하기' : '수정 저장'}
          </button>
        </div>
      </form>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <AlertCircle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">이 양식을 삭제할까요?</p>
                <p className="mt-1 text-sm text-gray-500">삭제하면 첨부 사진과 저장된 기록도 함께 정리됩니다.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
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

function TypeSpecificFields({ form, setField, updateRow, addRow, removeRow, fillPlanRowsByPeriod }) {
  if (form.type === JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL) {
    return (
      <>
        <SectionCard title="개별 놀이계획 기본항목" description="개별 놀이계획서 상단 항목을 입력하세요.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="상·하반기">
              <select value={form.planPeriod} onChange={(event) => setField('planPeriod', event.target.value)} className="input-field">
                {PLAN_PERIOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="아동연령">
              <input type="text" value={form.childAge} onChange={(event) => setField('childAge', event.target.value)} className="input-field" placeholder="예: 9세" />
            </LabeledField>
            <LabeledField label="학년">
              <input type="text" value={form.childGrade} onChange={(event) => setField('childGrade', event.target.value)} className="input-field" placeholder="예: 3학년" />
            </LabeledField>
            <LabeledField label="활동 시간">
              <input type="text" value={form.activityTimeText} onChange={(event) => setField('activityTimeText', event.target.value)} className="input-field" placeholder="예: 주 1회, 회기당 50분" />
            </LabeledField>
            <LabeledField label="활동 기간">
              <input type="date" value={form.activityStartDate} onChange={(event) => setField('activityStartDate', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="활동 기간 종료">
              <input type="date" value={form.activityEndDate} onChange={(event) => setField('activityEndDate', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="총 회기수">
              <input type="text" value={form.weeklyCountText} onChange={(event) => setField('weeklyCountText', event.target.value)} className="input-field" placeholder="예: 총 12회기" />
            </LabeledField>
            <LabeledField label="현행 수준">
              <input type="text" value={form.currentLevel} onChange={(event) => setField('currentLevel', event.target.value)} className="input-field" />
            </LabeledField>
          </div>
          <LabeledField label="놀이 목표">
            <textarea value={form.playGoal} onChange={(event) => setField('playGoal', event.target.value)} rows={4} className="input-field resize-none" />
          </LabeledField>
        </SectionCard>

        <SectionCard
          title="월별 놀이 활동 계획"
          description="PDF 양식의 회차·놀이영역·활동계획안 번호·장소 및 준비물을 월별로 정리합니다."
          actions={(
            <button type="button" onClick={fillPlanRowsByPeriod} className="btn-secondary">
              <RefreshCcw size={14} />
              {form.planPeriod} 기본 행 채우기
            </button>
          )}
        >
          <div className="space-y-4">
            {form.planRows.map((row, index) => (
              <div key={row.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">계획 행 {index + 1}</p>
                  <button type="button" onClick={() => removeRow('planRows', row.id)} className="text-sm text-red-500">
                    삭제
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <LabeledField label="월">
                    <input type="text" value={row.month} onChange={(event) => updateRow('planRows', row.id, 'month', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="회기수">
                    <input type="text" value={row.sessionCount} onChange={(event) => updateRow('planRows', row.id, 'sessionCount', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="놀이 영역">
                    <input type="text" value={row.playArea} onChange={(event) => updateRow('planRows', row.id, 'playArea', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="활동 내용">
                    <textarea value={row.activityContent} onChange={(event) => updateRow('planRows', row.id, 'activityContent', event.target.value)} rows={3} className="input-field resize-none" />
                  </LabeledField>
                  <LabeledField label="활동계획안 번호">
                    <input type="text" value={row.planNo} onChange={(event) => updateRow('planRows', row.id, 'planNo', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="활동 장소 및 구매 필요한 물품">
                    <textarea value={row.placeMaterials} onChange={(event) => updateRow('planRows', row.id, 'placeMaterials', event.target.value)} rows={3} className="input-field resize-none" />
                  </LabeledField>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => addRow('planRows', createPlanRow)} className="btn-secondary">
            <PlusCircle size={14} />
            계획 행 추가
          </button>
        </SectionCard>
      </>
    );
  }

  if (form.type === JOURNAL_TYPES.PLAY_PLAN_GROUP) {
    return (
      <>
        <SectionCard title="소그룹·집단 놀이계획 기본항목" description="소그룹/집단 놀이계획서 상단 정보를 입력하세요.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="장소">
              <input type="text" value={form.location} onChange={(event) => setField('location', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="참여 놀세이버 이름">
              <input type="text" value={form.participantSaverNames} onChange={(event) => setField('participantSaverNames', event.target.value)} className="input-field" placeholder="쉼표로 구분" />
            </LabeledField>
            <LabeledField label="참여 아동 이름(연령)">
              <input type="text" value={form.participantChildrenSummary} onChange={(event) => setField('participantChildrenSummary', event.target.value)} className="input-field" placeholder="예: 김민수(9세), 이수아(10세)" />
            </LabeledField>
            <LabeledField label="비고">
              <input type="text" value={form.note} onChange={(event) => setField('note', event.target.value)} className="input-field" />
            </LabeledField>
          </div>
        </SectionCard>

        <SectionCard title="아동별 또래와의 놀이활동 수준" description="양식에 맞춰 아동별 놀이 수준과 특성을 기록하세요.">
          <div className="space-y-4">
            {form.peerLevelRows.map((row, index) => (
              <div key={row.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">참여 아동 {index + 1}</p>
                  <button type="button" onClick={() => removeRow('peerLevelRows', row.id)} className="text-sm text-red-500">
                    삭제
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <LabeledField label="아동명">
                    <input type="text" value={row.childName} onChange={(event) => updateRow('peerLevelRows', row.id, 'childName', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="또래와의 놀이활동 수준">
                    <input type="text" value={row.playLevel} onChange={(event) => updateRow('peerLevelRows', row.id, 'playLevel', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="특성 및 메모">
                    <textarea value={row.notes} onChange={(event) => updateRow('peerLevelRows', row.id, 'notes', event.target.value)} rows={3} className="input-field resize-none" />
                  </LabeledField>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => addRow('peerLevelRows', createPeerLevelRow)} className="btn-secondary">
            <PlusCircle size={14} />
            참여 아동 추가
          </button>
        </SectionCard>

        <SectionCard title="매칭 특성 및 활동 목표" description="PDF의 설명 문항 순서대로 작성하세요.">
          <div className="grid gap-4 lg:grid-cols-2">
            <LabeledField label="소그룹 매칭 특성 및 활동 목표">
              <textarea value={form.matchingGoal} onChange={(event) => setField('matchingGoal', event.target.value)} rows={5} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="놀이 활동 계획">
              <textarea value={form.groupPlan} onChange={(event) => setField('groupPlan', event.target.value)} rows={5} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="구매 필요한 물품(협조 요청 사항)">
              <textarea value={form.neededMaterials} onChange={(event) => setField('neededMaterials', event.target.value)} rows={4} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="활동 계획 메모">
              <textarea value={form.summary} onChange={(event) => setField('summary', event.target.value)} rows={4} className="input-field resize-none" />
            </LabeledField>
          </div>
        </SectionCard>
      </>
    );
  }

  if (form.type === JOURNAL_TYPES.INTERVIEW_LOG) {
    return (
      <>
        <SectionCard title="면담 기본항목" description="면담/상담 일지의 상단 정보와 수행 방식을 기록하세요.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="면담자(보호자명)">
              <input type="text" value={form.intervieweeName} onChange={(event) => setField('intervieweeName', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="상담 수행 방법 구분">
              <select value={form.consultationMethod} onChange={(event) => setField('consultationMethod', event.target.value)} className="input-field">
                {CONSULTATION_METHOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="상담정보제공자">
              <select value={form.infoProvider} onChange={(event) => setField('infoProvider', event.target.value)} className="input-field">
                {INFO_PROVIDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="기타 정보제공자">
              <input type="text" value={form.infoProviderDetail} onChange={(event) => setField('infoProviderDetail', event.target.value)} className="input-field" />
            </LabeledField>
          </div>
        </SectionCard>

        <SectionCard title="상담(면담) 내용" description="놀이활동 내용, 변화, 특이사항, 향후 계획 공유 내용을 한 번에 기록하세요.">
          <div className="grid gap-4 lg:grid-cols-2">
            <LabeledField label="상담(면담)내용">
              <textarea value={form.consultationContent} onChange={(event) => setField('consultationContent', event.target.value)} rows={8} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="향후 개입 계획 및 보호자 상담 결과">
              <textarea value={form.futurePlan} onChange={(event) => setField('futurePlan', event.target.value)} rows={8} className="input-field resize-none" />
            </LabeledField>
          </div>
        </SectionCard>
      </>
    );
  }

  if (form.type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return (
      <>
        <SectionCard title="초기상담 기본정보" description="기본 인적사항과 건강 관련 특이사항을 먼저 작성하세요.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="생년월일">
              <input type="date" value={form.birthDate} onChange={(event) => setField('birthDate', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="성별">
              <input type="text" value={form.gender} onChange={(event) => setField('gender', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="장애 유형">
              <input type="text" value={form.disabilityType} onChange={(event) => setField('disabilityType', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="장애 정도">
              <input type="text" value={form.disabilityLevel} onChange={(event) => setField('disabilityLevel', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="비상연락처">
              <input type="text" value={form.emergencyContact} onChange={(event) => setField('emergencyContact', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="아동 질병/질환(건강상 특이사항)">
              <textarea value={form.healthNotes} onChange={(event) => setField('healthNotes', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
          </div>
        </SectionCard>

        <SectionCard title="가족관계" description="가족 구성원을 표 형식으로 입력하세요.">
          <div className="space-y-4">
            {form.familyRows.map((row, index) => (
              <div key={row.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">가족 구성원 {index + 1}</p>
                  <button type="button" onClick={() => removeRow('familyRows', row.id)} className="text-sm text-red-500">
                    삭제
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <LabeledField label="관계">
                    <input type="text" value={row.relation} onChange={(event) => updateRow('familyRows', row.id, 'relation', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="이름">
                    <input type="text" value={row.name} onChange={(event) => updateRow('familyRows', row.id, 'name', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="연령">
                    <input type="text" value={row.age} onChange={(event) => updateRow('familyRows', row.id, 'age', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="장애유무">
                    <input type="text" value={row.disability} onChange={(event) => updateRow('familyRows', row.id, 'disability', event.target.value)} className="input-field" />
                  </LabeledField>
                  <LabeledField label="특이사항">
                    <textarea value={row.notes} onChange={(event) => updateRow('familyRows', row.id, 'notes', event.target.value)} rows={3} className="input-field resize-none" />
                  </LabeledField>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => addRow('familyRows', createFamilyRow)} className="btn-secondary">
            <PlusCircle size={14} />
            가족 구성원 추가
          </button>
        </SectionCard>

        <SectionCard title="여가 시간 및 또래관계" description="초기상담기록지 문항 순서대로 적을 수 있게 나눴습니다.">
          <div className="grid gap-4 lg:grid-cols-2">
            <LabeledField label="가정이나 지역사회에서 즐겨하는 활동은?">
              <textarea value={form.leisureActivity} onChange={(event) => setField('leisureActivity', event.target.value)} rows={4} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="자주 가는 곳(공간)은?">
              <textarea value={form.frequentPlace} onChange={(event) => setField('frequentPlace', event.target.value)} rows={4} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="혼자 노는 시간은 얼마나 되나요?">
              <select value={form.soloPlayTimeRange} onChange={(event) => setField('soloPlayTimeRange', event.target.value)} className="input-field">
                {SOLO_PLAY_TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="장난감 종류(다양성)">
              <select value={form.toyTypeLevel} onChange={(event) => setField('toyTypeLevel', event.target.value)} className="input-field">
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="장난감 양(갯수)">
              <select value={form.toyQuantityLevel} onChange={(event) => setField('toyQuantityLevel', event.target.value)} className="input-field">
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="장난감 관련 추가 메모">
              <textarea value={form.toyTypeDescription} onChange={(event) => setField('toyTypeDescription', event.target.value)} rows={4} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="친구와 주로 하는 활동은?">
              <textarea value={form.peerActivities} onChange={(event) => setField('peerActivities', event.target.value)} rows={4} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="또래 관계에 대해 알고 있어야 할 부분은?">
              <textarea value={form.peerNotes} onChange={(event) => setField('peerNotes', event.target.value)} rows={4} className="input-field resize-none" />
            </LabeledField>
          </div>
        </SectionCard>

        <SectionCard title="진로·욕구·주의사항" description="아동의 욕구와 주의해야 할 점을 실무용으로 정리하세요.">
          <div className="grid gap-4 lg:grid-cols-2">
            <LabeledField label="아동의 꿈은?">
              <textarea value={form.dream} onChange={(event) => setField('dream', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="아동의 특기는?">
              <textarea value={form.strengths} onChange={(event) => setField('strengths', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="아동이 가장 즐겨 하는 것은 무엇입니까?">
              <textarea value={form.favoriteThings} onChange={(event) => setField('favoriteThings', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="보호자와 아동이 이 서비스를 통해 얻고 싶은 점">
              <textarea value={form.serviceGoals} onChange={(event) => setField('serviceGoals', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="문제행동이나 자극이 되는 부분">
              <textarea value={form.cautionBehavior} onChange={(event) => setField('cautionBehavior', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="질병과 알레르기">
              <textarea value={form.cautionHealth} onChange={(event) => setField('cautionHealth', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="돌발행동 상황에서 놀이교사가 대처할 수 있는 Tip">
              <textarea value={form.cautionTips} onChange={(event) => setField('cautionTips', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="외부 놀이를 희망하시나요?">
              <textarea value={form.outdoorPlayWish} onChange={(event) => setField('outdoorPlayWish', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="외부 놀이 시 주의해야 할 점은?">
              <textarea value={form.outdoorPlayNotes} onChange={(event) => setField('outdoorPlayNotes', event.target.value)} rows={3} className="input-field resize-none" />
            </LabeledField>
          </div>
        </SectionCard>
      </>
    );
  }

  if (form.type === JOURNAL_TYPES.ACTIVITY_LOG) {
    return (
      <>
        <SectionCard title="활동일지 기본항목" description="활동일지 1쪽 상단 항목과 활동 기본정보를 입력하세요.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="회차">
              <input type="text" value={form.sessionNumber} onChange={(event) => setField('sessionNumber', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="누적 시간">
              <input type="text" value={form.cumulativeHours} onChange={(event) => setField('cumulativeHours', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="놀세이버명(소그룹 구성원)">
              <input type="text" value={form.saverMembers} onChange={(event) => setField('saverMembers', event.target.value)} className="input-field" placeholder="쉼표로 구분" />
            </LabeledField>
            <LabeledField label="아동명(소그룹 구성원)">
              <input type="text" value={form.childParticipants} onChange={(event) => setField('childParticipants', event.target.value)} className="input-field" placeholder="쉼표로 구분" />
            </LabeledField>
            <LabeledField label="활동계획안 NO.">
              <input type="text" value={form.activityPlanNo} onChange={(event) => setField('activityPlanNo', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="활동구분">
              <select value={form.activityKind} onChange={(event) => setField('activityKind', event.target.value)} className="input-field">
                {ACTIVITY_KIND_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="활동장소">
              <input type="text" value={form.activityPlace} onChange={(event) => setField('activityPlace', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="만족도">
              <select value={form.satisfaction} onChange={(event) => setField('satisfaction', event.target.value)} className="input-field">
                {SATISFACTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="활동 주제">
              <input type="text" value={form.activitySubject} onChange={(event) => setField('activitySubject', event.target.value)} className="input-field" />
            </LabeledField>
            <LabeledField label="놀잇감/사용 교구">
              <input type="text" value={form.playMaterials} onChange={(event) => setField('playMaterials', event.target.value)} className="input-field" />
            </LabeledField>
          </div>
        </SectionCard>

        <SectionCard title="활동 내용 기록" description="활동일지 본문 문항 순서에 맞춰 기록합니다.">
          <div className="grid gap-4 lg:grid-cols-2">
            <LabeledField label="세부 활동내용">
              <textarea value={form.detailedActivities} onChange={(event) => setField('detailedActivities', event.target.value)} rows={6} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="놀이과정">
              <textarea value={form.playProcess} onChange={(event) => setField('playProcess', event.target.value)} rows={6} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="관찰내용">
              <textarea value={form.content} onChange={(event) => setField('content', event.target.value)} rows={6} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="놀세이버와 또래아동 이야기 나눈 내용 등">
              <textarea value={form.conversationNotes} onChange={(event) => setField('conversationNotes', event.target.value)} rows={6} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="놀세이버 의견(아동의 변화, 보호자 면담 내용 등)">
              <textarea value={form.saverOpinion} onChange={(event) => setField('saverOpinion', event.target.value)} rows={5} className="input-field resize-none" />
            </LabeledField>
            <LabeledField label="활동 평가 및 의견">
              <textarea value={form.activityEvaluation} onChange={(event) => setField('activityEvaluation', event.target.value)} rows={5} className="input-field resize-none" />
            </LabeledField>
          </div>
        </SectionCard>
      </>
    );
  }

  return null;
}
