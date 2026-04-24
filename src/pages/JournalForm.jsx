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
  return { id: genId(), month, sessionCount: '', playArea: '', activityContent: '', planNo: '', placeMaterials: '' };
}

function createPeerLevelRow() {
  return { id: genId(), childName: '', playLevel: '', notes: '' };
}

function createFamilyRow() {
  return { id: genId(), relation: '', name: '', age: '', disability: '', notes: '' };
}

async function migrateLegacyPhotos(photos = []) {
  return Promise.all(
    photos.map(async (photo) => {
      if (typeof photo === 'string') return savePhotoDataUrl(photo, { id: genId(), name: 'legacy-photo' });
      return photo;
    }),
  );
}

async function deleteRemovedPhotos(previousPhotos = [], nextPhotos = []) {
  const nextIds = new Set(getPhotoIds(nextPhotos));
  const removed = previousPhotos.filter((photo) => photo && typeof photo === 'object' && photo.id && !nextIds.has(photo.id));
  await deletePhotoRefs(removed);
}

// ── 공통 UI 컴포넌트 ──────────────────────────────────────────────────────────

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
      {[{ value: 'draft', label: '임시저장' }, { value: 'finalized', label: '확정본' }].map((item) => (
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

// ── 양식 테이블 기본 컴포넌트 ─────────────────────────────────────────────────

function Tbl({ children }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>{children}</tbody>
    </table>
  );
}

function Th({ children, colSpan, rowSpan, width, style = {}, className = '' }) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{ width, verticalAlign: 'middle', whiteSpace: 'pre-line', ...style }}
      className={`border border-gray-400 bg-gray-100 px-2 py-1.5 text-center text-xs font-medium text-gray-700 leading-tight ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, colSpan, rowSpan, className = '' }) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-gray-400 p-0 align-top ${className}`}
    >
      {children}
    </td>
  );
}

function TInput({ value, onChange, type = 'text', placeholder = '', className = '' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-2 py-1.5 text-sm focus:outline-none focus:bg-blue-50/40 bg-transparent ${className}`}
    />
  );
}

function TArea({ value, onChange, rows = 4, placeholder = '' }) {
  return (
    <textarea
      value={value || ''}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 text-sm focus:outline-none focus:bg-blue-50/40 bg-transparent resize-none"
    />
  );
}

function TSelect({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={onChange}
      className="w-full px-2 py-1.5 text-sm focus:outline-none bg-transparent"
    >
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function TRadio({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 py-1.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input
            type="radio"
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="accent-blue-600"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ── TypeSelector ──────────────────────────────────────────────────────────────

function TypeSelector({ favorites, recents, onChoose, onToggleFavorite }) {
  const favoriteSet = new Set(favorites);
  return (
    <div className="space-y-6">
      {(favorites.length > 0 || recents.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">즐겨찾는 양식</p>
            <div className="flex flex-wrap gap-2">
              {favorites.length === 0 && <p className="text-sm text-gray-400">즐겨찾기한 양식이 아직 없습니다.</p>}
              {favorites.map((type) => (
                <button key={type} type="button" onClick={() => onChoose(type)}
                  className="rounded-xl bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100">
                  {journalTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">최근 사용 양식</p>
            <div className="flex flex-wrap gap-2">
              {recents.length === 0 && <p className="text-sm text-gray-400">최근 사용 기록이 아직 없습니다.</p>}
              {recents.map((type) => (
                <button key={type} type="button" onClick={() => onChoose(type)}
                  className="rounded-xl bg-sage-50 px-3 py-2 text-sm font-medium text-sage-700 hover:bg-sage-100">
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
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoose(option.value); } }}
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
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(option.value); }}
                className={`rounded-lg p-2 ${favoriteSet.has(option.value) ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400 hover:text-amber-600'}`}
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
                  {section.lines.map((line) => <li key={line}>- {line}</li>)}
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

function buildPhotoHint(type) {
  if (type === JOURNAL_TYPES.INITIAL_CONSULTATION) return '아동 사진, 놀이공간, 놀잇감, 놀이 상황 사진을 필요에 따라 함께 첨부하세요.';
  if (type === JOURNAL_TYPES.ACTIVITY_LOG) return '활동 장면 1~2장을 첨부해 활동일지와 함께 보관하세요.';
  return '양식 보완에 필요한 사진을 첨부할 수 있습니다.';
}

function isValidType(value) {
  return JOURNAL_TYPE_OPTIONS.some((option) => option.value === value);
}

// ── 양식별 테이블 폼 ──────────────────────────────────────────────────────────

/** 활동일지 */
function ActivityLogForm({ form, setField }) {
  const sf = (k) => (e) => setField(k, e.target.value);
  return (
    <SectionCard title="[서식9] 놀세이버 활동일지" description="활동일지(개별활동 / 소그룹활동) — 양식 순서대로 입력하세요.">
      <div className="flex items-center gap-3 text-sm text-gray-600 pb-1">
        <span>회차</span>
        <input type="text" value={form.sessionNumber || ''} onChange={sf('sessionNumber')}
          className="w-14 border-b border-gray-400 text-center focus:outline-none focus:border-blue-500 px-1" placeholder="0" />
        <span>회 / 누적 시간</span>
        <input type="text" value={form.cumulativeHours || ''} onChange={sf('cumulativeHours')}
          className="w-14 border-b border-gray-400 text-center focus:outline-none focus:border-blue-500 px-1" placeholder="0" />
        <span>시간</span>
      </div>

      <Tbl>
        <colgroup>
          <col style={{ width: '15%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '13%' }} />
          <col />
        </colgroup>
        <tr>
          <Th>{'놀세이버명\n(소그룹 구성원)'}</Th>
          <Td colSpan={2}><TInput value={form.saverName} onChange={sf('saverName')} placeholder="놀세이버명" /></Td>
          <Th>활동 일시</Th>
          <Td>
            <div className="flex items-center gap-1 px-2 py-1">
              <input type="date" value={form.date || ''} onChange={sf('date')} className="text-sm focus:outline-none flex-1 min-w-0" />
              <input type="time" value={form.time || ''} onChange={sf('time')} className="text-sm focus:outline-none w-24" />
            </div>
          </Td>
        </tr>
        <tr>
          <Th>{'아동명\n(소그룹 구성원)'}</Th>
          <Td colSpan={2}><TInput value={form.childName} onChange={sf('childName')} placeholder="아동명" /></Td>
          <Th>아동연령</Th>
          <Td><TInput value={form.childAge} onChange={sf('childAge')} placeholder="예: 9세" /></Td>
        </tr>
        <tr>
          <Th>활동계획안 NO.</Th>
          <Td colSpan={2}><TInput value={form.activityPlanNo} onChange={sf('activityPlanNo')} /></Td>
          <Th>활동구분</Th>
          <Td><TRadio options={ACTIVITY_KIND_OPTIONS} value={form.activityKind} onChange={(v) => setField('activityKind', v)} /></Td>
        </tr>
        <tr>
          <Th>활동장소</Th>
          <Td colSpan={2}><TInput value={form.activityPlace} onChange={sf('activityPlace')} /></Td>
          <Th>만족도</Th>
          <Td><TSelect value={form.satisfaction} onChange={sf('satisfaction')} options={SATISFACTION_OPTIONS} /></Td>
        </tr>
        <tr>
          <Th>활동 주제</Th>
          <Td colSpan={4}><TInput value={form.activitySubject} onChange={sf('activitySubject')} /></Td>
        </tr>
        <tr>
          <Th>놀잇감/사용 교구</Th>
          <Td colSpan={4}><TInput value={form.playMaterials} onChange={sf('playMaterials')} /></Td>
        </tr>
        <tr>
          <Th rowSpan={1}>{'세부\n활동\n내용'}</Th>
          <Th style={{ fontSize: '10px', textAlign: 'left' }}>{'놀이과정\n*관찰내용\n*놀세이버와\n또래아동이\n나눈 내용 등'}</Th>
          <Td colSpan={3}>
            <TArea value={form.detailedActivities} onChange={sf('detailedActivities')} rows={7}
              placeholder="놀이 과정, 관찰 내용, 대화 내용 등을 상세히 기록하세요" />
          </Td>
        </tr>
      </Tbl>

      <Tbl>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col />
        </colgroup>
        <tr>
          <Th>{'놀세이버 의견\n(아동의 변화,\n보호자 면담 내용 등)'}</Th>
          <Td>
            <TArea value={form.saverOpinion} onChange={sf('saverOpinion')} rows={5}
              placeholder="※ 활동 평가 및 의견. 부모와 상담 또는 부모 의견 등 작성" />
          </Td>
        </tr>
        <tr>
          <Th>활동 사진</Th>
          <Td className="px-3 py-2 text-xs text-gray-400">
            ※ 1~2 장면 — 아래 [사진 첨부] 섹션에서 추가하세요. (원본 별도 보관 필요)
          </Td>
        </tr>
      </Tbl>
    </SectionCard>
  );
}

/** 면담일지 */
function InterviewLogForm({ form, setField }) {
  const sf = (k) => (e) => setField(k, e.target.value);
  return (
    <SectionCard title="면담/상담 일지" description="상담 내용과 향후 계획을 양식 순서대로 입력하세요.">
      <Tbl>
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '16%' }} />
          <col />
        </colgroup>
        <tr>
          <Th>놀세이버명</Th>
          <Td><TInput value={form.saverName} onChange={sf('saverName')} /></Td>
          <Th>상담일자</Th>
          <Td><TInput type="date" value={form.consultationDate} onChange={sf('consultationDate')} /></Td>
        </tr>
        <tr>
          <Th>아동명</Th>
          <Td><TInput value={form.childName} onChange={sf('childName')} /></Td>
          <Th>{'면담자\n(보호자명)'}</Th>
          <Td><TInput value={form.intervieweeName} onChange={sf('intervieweeName')} /></Td>
        </tr>
        <tr>
          <Th>{'상담 수행\n방법 구분'}</Th>
          <Td>
            <TRadio options={CONSULTATION_METHOD_OPTIONS} value={form.consultationMethod}
              onChange={(v) => setField('consultationMethod', v)} />
            {form.consultationMethod === '기타' && (
              <div className="px-2 pb-1">
                <TInput value={form.infoProviderDetail} onChange={sf('infoProviderDetail')} placeholder="기타 내용 입력" />
              </div>
            )}
          </Td>
          <Th>{'상담정보\n제공자'}</Th>
          <Td>
            <TRadio options={INFO_PROVIDER_OPTIONS} value={form.infoProvider}
              onChange={(v) => setField('infoProvider', v)} />
          </Td>
        </tr>
        <tr>
          <Th>{'상담(면담)\n내용'}</Th>
          <Td colSpan={3}>
            <TArea value={form.consultationContent} onChange={sf('consultationContent')} rows={8}
              placeholder={'1) 아동의 놀이활동 내용 및 놀이관련 정보 제공\n2) 아동의 변화 및 놀이 특성\n3) 특이사항 등 공유\n4) 향후 계획 공유\n5) 아동 및 보호자의 욕구 파악'} />
          </Td>
        </tr>
        <tr>
          <Th>{'향후 개입 계획\n및 보호자\n상담 결과'}</Th>
          <Td colSpan={3}><TArea value={form.futurePlan} onChange={sf('futurePlan')} rows={5} /></Td>
        </tr>
      </Tbl>
    </SectionCard>
  );
}

/** 초기상담기록지 */
function InitialConsultationForm({ form, setField, updateRow, addRow, removeRow }) {
  const sf = (k) => (e) => setField(k, e.target.value);
  return (
    <>
      <SectionCard title="[서식7] 초기상담 기록지 — 기본정보" description="아동 기본 인적사항과 가족관계를 입력하세요.">
        <Tbl>
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '11%' }} />
            <col />
          </colgroup>
          <tr>
            <Th>아동명</Th>
            <Td colSpan={2}><TInput value={form.childName} onChange={sf('childName')} /></Td>
            <Th>{'생년월일\n(연령)'}</Th>
            <Td><TInput type="date" value={form.birthDate} onChange={sf('birthDate')} /></Td>
            <Th>성별</Th>
            <Td><TInput value={form.gender} onChange={sf('gender')} placeholder="남/여" /></Td>
          </tr>
          <tr>
            <Th>{'장애 유형\n장애 정도'}</Th>
            <Td><TInput value={form.disabilityType} onChange={sf('disabilityType')} placeholder="장애 유형" /></Td>
            <Td><TInput value={form.disabilityLevel} onChange={sf('disabilityLevel')} placeholder="장애 정도" /></Td>
            <Th>비상연락처</Th>
            <Td colSpan={3}><TInput value={form.emergencyContact} onChange={sf('emergencyContact')} /></Td>
          </tr>
          <tr>
            <Th>{'아동 질병/질환\n(건강상\n특이사항)'}</Th>
            <Td colSpan={6}><TArea value={form.healthNotes} onChange={sf('healthNotes')} rows={3} /></Td>
          </tr>
        </Tbl>

        {/* 가족관계 */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">가족관계</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['관계', '이름', '연령', '장애유무', '특이사항 (질병, 동거 여부 등)', ''].map((h) => (
                  <th key={h} className="border border-gray-400 bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.familyRows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-gray-400 p-0 w-16"><TInput value={row.relation} onChange={(e) => updateRow('familyRows', row.id, 'relation', e.target.value)} /></td>
                  <td className="border border-gray-400 p-0 w-20"><TInput value={row.name} onChange={(e) => updateRow('familyRows', row.id, 'name', e.target.value)} /></td>
                  <td className="border border-gray-400 p-0 w-14"><TInput value={row.age} onChange={(e) => updateRow('familyRows', row.id, 'age', e.target.value)} /></td>
                  <td className="border border-gray-400 p-0 w-16"><TInput value={row.disability} onChange={(e) => updateRow('familyRows', row.id, 'disability', e.target.value)} /></td>
                  <td className="border border-gray-400 p-0"><TInput value={row.notes} onChange={(e) => updateRow('familyRows', row.id, 'notes', e.target.value)} /></td>
                  <td className="border border-gray-400 p-1 w-8 text-center">
                    <button type="button" onClick={() => removeRow('familyRows', row.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => addRow('familyRows', createFamilyRow)} className="btn-secondary mt-2">
            <PlusCircle size={13} /> 가족 추가
          </button>
        </div>
      </SectionCard>

      <SectionCard title="초기상담 기록지 — 여가시간" description="아동의 여가 활동과 놀이 환경을 파악하세요.">
        <Tbl>
          <colgroup><col style={{ width: '22%' }} /><col /></colgroup>
          <tr>
            <Th>{'가정이나\n지역사회에서\n즐겨하는 활동은?'}</Th>
            <Td><TArea value={form.leisureActivity} onChange={sf('leisureActivity')} rows={3} /></Td>
          </tr>
          <tr>
            <Th>{'자주 가는 곳\n(공간)은?'}</Th>
            <Td><TArea value={form.frequentPlace} onChange={sf('frequentPlace')} rows={2} /></Td>
          </tr>
          <tr>
            <Th>{'혼자 노는\n시간은?'}</Th>
            <Td><TSelect value={form.soloPlayTimeRange} onChange={sf('soloPlayTimeRange')} options={SOLO_PLAY_TIME_OPTIONS} /></Td>
          </tr>
          <tr>
            <Th>{'장난감\n종류(다양성)'}</Th>
            <Td><TSelect value={form.toyTypeLevel} onChange={sf('toyTypeLevel')} options={LEVEL_OPTIONS} /></Td>
          </tr>
          <tr>
            <Th>{'장난감\n양(갯수)'}</Th>
            <Td><TSelect value={form.toyQuantityLevel} onChange={sf('toyQuantityLevel')} options={LEVEL_OPTIONS} /></Td>
          </tr>
        </Tbl>
      </SectionCard>

      <SectionCard title="초기상담 기록지 — 또래관계 · 진로 · 욕구" description="아동의 관계, 목표, 욕구, 주의사항을 기록하세요.">
        <Tbl>
          <colgroup><col style={{ width: '22%' }} /><col /></colgroup>
          <tr>
            <Th>또래관계</Th>
            <Td>
              <TArea value={form.peerActivities} onChange={sf('peerActivities')} rows={3}
                placeholder={'1) 친구와 주로 하는 활동은?'} />
              <div className="border-t border-gray-200">
                <TArea value={form.peerNotes} onChange={sf('peerNotes')} rows={2}
                  placeholder="2) 또래 관계에 대해 알고 있어야 할 부분은?" />
              </div>
            </Td>
          </tr>
          <tr>
            <Th>진로</Th>
            <Td>
              <TArea value={form.dream} onChange={sf('dream')} rows={2} placeholder="1) 아동의 꿈은?" />
              <div className="border-t border-gray-200">
                <TArea value={form.strengths} onChange={sf('strengths')} rows={2} placeholder="2) 아동의 특기는?" />
              </div>
            </Td>
          </tr>
          <tr>
            <Th>욕구</Th>
            <Td>
              <TArea value={form.favoriteThings} onChange={sf('favoriteThings')} rows={2}
                placeholder="1) 아동이 가장 즐겨 하는 것은 무엇입니까? (좋아하는 놀이, 친구, 장소 등)" />
              <div className="border-t border-gray-200">
                <TArea value={form.serviceGoals} onChange={sf('serviceGoals')} rows={2}
                  placeholder="2) 보호자와 아동이 이 서비스를 통해 얻고 싶은 점은?" />
              </div>
            </Td>
          </tr>
          <tr>
            <Th>{'아동에 대해\n주의해야\n하는 점'}</Th>
            <Td>
              <TArea value={form.cautionBehavior} onChange={sf('cautionBehavior')} rows={2}
                placeholder="1) 문제행동이나 자극이 되는 부분" />
              <div className="border-t border-gray-200">
                <TArea value={form.cautionHealth} onChange={sf('cautionHealth')} rows={2}
                  placeholder="2) 질병과 알레르기" />
              </div>
              <div className="border-t border-gray-200">
                <TArea value={form.cautionTips} onChange={sf('cautionTips')} rows={2}
                  placeholder="3) 돌발행동 상황에서 놀이교사가 대처할 수 있는 Tip" />
              </div>
            </Td>
          </tr>
          <tr>
            <Th>{'외부 놀이에\n대한 욕구'}</Th>
            <Td>
              <TArea value={form.outdoorPlayWish} onChange={sf('outdoorPlayWish')} rows={2}
                placeholder="1) 외부(가정 밖) 놀이를 희망하시나요?" />
              <div className="border-t border-gray-200">
                <TArea value={form.outdoorPlayNotes} onChange={sf('outdoorPlayNotes')} rows={2}
                  placeholder="2) 외부 놀이 시, 놀이교사가 주의 해야 할 점은?" />
              </div>
            </Td>
          </tr>
        </Tbl>
      </SectionCard>
    </>
  );
}

/** 놀이계획서-소그룹 */
function GroupPlayPlanForm({ form, setField, updateRow, addRow, removeRow }) {
  const sf = (k) => (e) => setField(k, e.target.value);
  return (
    <>
      <SectionCard title="[서식8] 놀이계획서 — 소그룹" description="소그룹/집단 놀이계획서를 양식 순서대로 입력하세요.">
        <Tbl>
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col />
          </colgroup>
          <tr>
            <Th>활동일시</Th>
            <Td><TInput type="date" value={form.date} onChange={sf('date')} /></Td>
            <Th>{'월    일    요일\n활동 시간 :'}</Th>
            <Td><TInput type="time" value={form.time} onChange={sf('time')} /></Td>
            <Th>장소</Th>
            <Td><TInput value={form.location} onChange={sf('location')} /></Td>
          </tr>
          <tr>
            <Th>{'참여 놀세이버\n이름'}</Th>
            <Td colSpan={5}><TInput value={form.participantSaverNames} onChange={sf('participantSaverNames')} placeholder="쉼표로 구분" /></Td>
          </tr>
          <tr>
            <Th>{'참여\n아동이름(연령)'}</Th>
            <Td colSpan={5}><TInput value={form.participantChildrenSummary} onChange={sf('participantChildrenSummary')} placeholder="예: 김민수(9세), 이수아(10세)" /></Td>
          </tr>
        </Tbl>
      </SectionCard>

      <SectionCard title="아동별 또래와의 놀이활동 수준" description="참여 아동별 놀이 수준과 특성을 입력하세요.">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['아동명', '또래와의 놀이활동 수준 및 특성', ''].map((h) => (
                <th key={h} className="border border-gray-400 bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.peerLevelRows.map((row) => (
              <tr key={row.id}>
                <td className="border border-gray-400 p-0 w-28"><TInput value={row.childName} onChange={(e) => updateRow('peerLevelRows', row.id, 'childName', e.target.value)} /></td>
                <td className="border border-gray-400 p-0">
                  <TArea value={`${row.playLevel}${row.notes ? '\n' + row.notes : ''}`}
                    onChange={(e) => {
                      const [first, ...rest] = e.target.value.split('\n');
                      updateRow('peerLevelRows', row.id, 'playLevel', first);
                      updateRow('peerLevelRows', row.id, 'notes', rest.join('\n'));
                    }} rows={2} />
                </td>
                <td className="border border-gray-400 p-1 w-8 text-center">
                  <button type="button" onClick={() => removeRow('peerLevelRows', row.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => addRow('peerLevelRows', createPeerLevelRow)} className="btn-secondary mt-2">
          <PlusCircle size={13} /> 아동 추가
        </button>
      </SectionCard>

      <SectionCard title="매칭 특성 · 활동 목표 · 준비물" description="소그룹 매칭 목표와 활동 계획을 입력하세요.">
        <Tbl>
          <colgroup><col style={{ width: '22%' }} /><col /></colgroup>
          <tr>
            <Th>{'소그룹 매칭\n특성 및\n활동 목표'}</Th>
            <Td>
              <TArea value={form.matchingGoal} onChange={(e) => setField('matchingGoal', e.target.value)} rows={5}
                placeholder="※ 소그룹 놀이 관련 목표 계획에 따른 활동 작성, 상세하게 작성" />
            </Td>
          </tr>
          <tr>
            <Th>{'놀이 활동 계획\n활동 계획'}</Th>
            <Td><TArea value={form.groupPlan} onChange={(e) => setField('groupPlan', e.target.value)} rows={5} /></Td>
          </tr>
          <tr>
            <Th>{'구매 필요한 물품\n(협력기관에\n협조 요청 사항)'}</Th>
            <Td><TArea value={form.neededMaterials} onChange={(e) => setField('neededMaterials', e.target.value)} rows={3} /></Td>
          </tr>
          <tr>
            <Th>비고</Th>
            <Td><TInput value={form.note} onChange={(e) => setField('note', e.target.value)} /></Td>
          </tr>
        </Tbl>
      </SectionCard>
    </>
  );
}

/** 놀이계획서-개별 */
function IndividualPlayPlanForm({ form, setField, updateRow, addRow, removeRow, fillPlanRowsByPeriod }) {
  const sf = (k) => (e) => setField(k, e.target.value);
  return (
    <>
      <SectionCard title="[서식8] 놀이계획서 — 개별" description="개별 놀이계획서 기본 정보를 입력하세요.">
        <Tbl>
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '14%' }} />
            <col />
          </colgroup>
          <tr>
            <Th>놀세이버명</Th>
            <Td><TInput value={form.saverName} onChange={sf('saverName')} /></Td>
            <Th>(인)</Th>
            <Th>{'계획\n일시'}</Th>
            <Td><TInput type="date" value={form.date} onChange={sf('date')} /></Td>
          </tr>
          <tr>
            <Th>아동명</Th>
            <Td colSpan={2}><TInput value={form.childName} onChange={sf('childName')} /></Td>
            <Th>아동연령</Th>
            <Td>
              <div className="flex gap-1 px-2 py-1">
                <input type="text" value={form.childAge || ''} onChange={sf('childAge')} placeholder="세" className="w-14 text-sm focus:outline-none border-b border-gray-300" />
                <span className="text-sm">세 (</span>
                <input type="text" value={form.childGrade || ''} onChange={sf('childGrade')} placeholder="학년" className="w-14 text-sm focus:outline-none border-b border-gray-300" />
                <span className="text-sm">학년)</span>
              </div>
            </Td>
          </tr>
          <tr>
            <Th>상·하반기</Th>
            <Td colSpan={2}>
              <TRadio options={PLAN_PERIOD_OPTIONS} value={form.planPeriod} onChange={(v) => setField('planPeriod', v)} />
            </Td>
            <Th>{'활동\n시간'}</Th>
            <Td><TInput value={form.activityTimeText} onChange={sf('activityTimeText')} placeholder="예: 매주 월요일 14시~15시" /></Td>
          </tr>
          <tr>
            <Th>활동 기간</Th>
            <Td>
              <div className="flex items-center gap-1 px-2 py-1 text-sm">
                <input type="date" value={form.activityStartDate || ''} onChange={sf('activityStartDate')} className="text-sm focus:outline-none flex-1 min-w-0" />
                <span>~</span>
                <input type="date" value={form.activityEndDate || ''} onChange={sf('activityEndDate')} className="text-sm focus:outline-none flex-1 min-w-0" />
              </div>
            </Td>
            <Td colSpan={2} className="px-2 py-1 text-xs text-gray-400">
              <TInput value={form.weeklyCountText} onChange={sf('weeklyCountText')} placeholder="주간 / 회 (예: 8주간 / 8회)" />
            </Td>
          </tr>
          <tr>
            <Th>현행 수준</Th>
            <Td colSpan={4}><TArea value={form.currentLevel} onChange={sf('currentLevel')} rows={3} /></Td>
          </tr>
          <tr>
            <Th>놀이 목표</Th>
            <Td colSpan={4}>
              <TArea value={form.playGoal} onChange={sf('playGoal')} rows={3}
                placeholder="※ 아동별 학습/놀이관련 목표 계획에 따른 활동 작성, 상세하게 작성" />
            </Td>
          </tr>
        </Tbl>
      </SectionCard>

      <SectionCard
        title="월별 놀이 활동 계획"
        description={`${form.planPeriod} 월별 계획을 입력하세요.`}
        actions={
          <button type="button" onClick={fillPlanRowsByPeriod} className="btn-secondary">
            <RefreshCcw size={13} /> {form.planPeriod} 행 자동 생성
          </button>
        }
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['회차(월)', '회기수', '놀이 영역', '활동 내용', '활동계획안 NO.', '활동 장소 및 구매 필요한 물품', ''].map((h) => (
                <th key={h} className="border border-gray-400 bg-gray-200 px-1 py-1.5 text-xs font-medium text-gray-700 text-center whitespace-pre-line leading-tight">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.planRows.map((row) => (
              <tr key={row.id}>
                <td className="border border-gray-400 p-0 w-16"><TInput value={row.month} onChange={(e) => updateRow('planRows', row.id, 'month', e.target.value)} /></td>
                <td className="border border-gray-400 p-0 w-14"><TInput value={row.sessionCount} onChange={(e) => updateRow('planRows', row.id, 'sessionCount', e.target.value)} /></td>
                <td className="border border-gray-400 p-0 w-20"><TInput value={row.playArea} onChange={(e) => updateRow('planRows', row.id, 'playArea', e.target.value)} /></td>
                <td className="border border-gray-400 p-0"><TArea value={row.activityContent} onChange={(e) => updateRow('planRows', row.id, 'activityContent', e.target.value)} rows={2} /></td>
                <td className="border border-gray-400 p-0 w-16"><TInput value={row.planNo} onChange={(e) => updateRow('planRows', row.id, 'planNo', e.target.value)} /></td>
                <td className="border border-gray-400 p-0"><TArea value={row.placeMaterials} onChange={(e) => updateRow('planRows', row.id, 'placeMaterials', e.target.value)} rows={2} /></td>
                <td className="border border-gray-400 p-1 w-8 text-center">
                  <button type="button" onClick={() => removeRow('planRows', row.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </td>
              </tr>
            ))}
            {form.planRows.length === 0 && (
              <tr>
                <td colSpan={7} className="border border-gray-400 px-3 py-4 text-center text-sm text-gray-400">
                  위의 「{form.planPeriod} 행 자동 생성」 버튼을 눌러 월별 행을 만드세요.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-gray-400 bg-gray-100 px-2 py-1.5 text-xs font-medium text-center">합계</td>
              <td colSpan={6} className="border border-gray-400 px-2 py-1 text-xs text-gray-400">총 회기수/놀이시간 작성</td>
            </tr>
          </tfoot>
        </table>
        <button type="button" onClick={() => addRow('planRows', createPlanRow)} className="btn-secondary mt-2">
          <PlusCircle size={13} /> 행 추가
        </button>
      </SectionCard>
    </>
  );
}

/** 양식별 라우터 */
function TypeSpecificFields({ form, setField, updateRow, addRow, removeRow, fillPlanRowsByPeriod }) {
  if (form.type === JOURNAL_TYPES.ACTIVITY_LOG) {
    return <ActivityLogForm form={form} setField={setField} />;
  }
  if (form.type === JOURNAL_TYPES.INTERVIEW_LOG) {
    return <InterviewLogForm form={form} setField={setField} />;
  }
  if (form.type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return <InitialConsultationForm form={form} setField={setField} updateRow={updateRow} addRow={addRow} removeRow={removeRow} />;
  }
  if (form.type === JOURNAL_TYPES.PLAY_PLAN_GROUP) {
    return <GroupPlayPlanForm form={form} setField={setField} updateRow={updateRow} addRow={addRow} removeRow={removeRow} />;
  }
  if (form.type === JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL) {
    return <IndividualPlayPlanForm form={form} setField={setField} updateRow={updateRow} addRow={addRow} removeRow={removeRow} fillPlanRowsByPeriod={fillPlanRowsByPeriod} />;
  }
  return null;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

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
  const [pdfError, setPdfError] = useState('');

  async function handlePdfDownload() {
    setPdfLoading(true);
    setPdfError('');
    try {
      const { exportSingleJournalPDF } = await import('../lib/exportUtils');
      await exportSingleJournalPDF(form);
    } catch (err) {
      setPdfError(`PDF 생성 실패: ${err.message}`);
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
      if (!ignore) setPhotoPreviews(previews.filter((p) => p.src));
    }
    loadPreviews();
    return () => { ignore = true; };
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
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
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

  function applySuggestion() {
    const suggestion = buildJournalSuggestion({
      type: currentType, commonFields: form, typeFields: form, recentEntries: recentSameType.slice(0, 3),
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
      id: prev.id, type: prev.type, status: prev.status, clientId: prev.clientId,
      childName: prev.childName, date: prev.date, time: prev.time, photos: prev.photos,
      createdAt: prev.createdAt, updatedAt: prev.updatedAt,
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
    updateForm((prev) => ({ ...prev, [listKey]: [...prev[listKey], factory()] }));
  }

  function removeRow(listKey, rowId) {
    updateForm((prev) => ({ ...prev, [listKey]: prev[listKey].filter((row) => row.id !== rowId) }));
  }

  async function handlePhotos(event) {
    const files = Array.from(event.target.files || []);
    try {
      const nextPhotos = await Promise.all(files.map((file) => savePhotoFile(file)));
      updateForm((prev) => ({ ...prev, photos: [...prev.photos, ...nextPhotos] }));
    } catch (error) {
      setSaveError(error?.message || '사진 저장 중 오류가 발생했습니다.');
    }
    event.target.value = '';
  }

  async function removePhoto(index) {
    const target = form.photos[index];
    updateForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    if (target && typeof target === 'object' && target.id) {
      const baseIds = new Set(getPhotoIds(baseJournal?.photos || []));
      if (!baseIds.has(target.id)) await deletePhotoRefs([target]);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!currentType) return;
    try {
      const normalizedPhotos = await migrateLegacyPhotos(form.photos);
      const suggestion = buildJournalSuggestion({
        type: currentType, commonFields: form, typeFields: form, recentEntries: recentSameType.slice(0, 3),
      });
      const savedJournal = saveJournal({
        ...form, type: currentType,
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
      if (isNew) navigate(`/journal/${savedJournal.id}`, { replace: true });
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
    if (isNew) setForm(buildNewJournal(currentType));
    else if (baseJournal) setForm(baseJournal);
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
          subtitle="작성할 양식을 선택하세요."
        />
        <TypeSelector
          favorites={favoriteTypes}
          recents={recentTypes}
          onChoose={(type) => setSelectedType(type)}
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
              <ArrowLeft size={14} /> 목록으로
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
              <button type="button" onClick={() => { setSelectedType(''); setSuggestionPreview(null); }} className="btn-secondary">
                양식 다시 선택
              </button>
            )}
          </div>
        )}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 문서 메타 정보 */}
        <SectionCard title="문서 기본 정보">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LabeledField label="아동 선택">
              <select value={form.clientId} onChange={(e) => handleClientChange(e.target.value)} className="input-field">
                <option value="">직접 입력 (아동명은 양식에 입력)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="저장 상태">
              <StatusPills value={form.status} onChange={(v) => setField('status', v)} />
            </LabeledField>
            <LabeledField label="제목" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className="input-field"
                placeholder={template.defaultTitle}
                required
              />
            </LabeledField>
            <LabeledField label="요약 메모">
              <input
                type="text"
                value={form.summary}
                onChange={(e) => setField('summary', e.target.value)}
                className="input-field"
                placeholder="핵심 내용을 짧게 정리"
              />
            </LabeledField>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={applySuggestion} className="btn-secondary">
              <Sparkles size={14} /> 제목·요약 초안 만들기
            </button>
            <button type="button" onClick={applyRecentEntry} disabled={recentSameType.length === 0} className="btn-secondary disabled:opacity-50">
              <Copy size={14} /> 최근 같은 양식 복사
            </button>
            {hasDraft && (
              <button type="button" onClick={resetDraft} className="btn-secondary">
                <RefreshCcw size={14} /> 임시저장 비우기
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={() => setDeleteConfirm(true)} className="btn-danger">
                <Trash2 size={14} /> 삭제
              </button>
            )}
          </div>

          {pdfError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{pdfError}</div>
          )}
          {saveError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
          )}
          {(draftStatus || saved) && (
            <div className="rounded-2xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-sage-700">
              {saved ? '저장되었습니다.' : draftStatus}
            </div>
          )}
        </SectionCard>

        {/* 양식 테이블 */}
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
              <button type="button" onClick={handleDelete} className="btn-danger flex-1 justify-center">삭제</button>
              <button type="button" onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1 justify-center">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
