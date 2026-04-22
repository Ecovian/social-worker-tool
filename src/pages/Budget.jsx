import React, { useEffect, useState } from 'react';
import { Check, PlusCircle, Settings, Trash2, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  deleteBudgetItem,
  genId,
  getBudgetItems,
  getBudgetMeta,
  saveBudgetItem,
  saveBudgetMeta,
} from '../lib/storage';

const CATEGORIES = [
  { value: 'personnel', label: '인건비' },
  { value: 'supplies', label: '물품구입비' },
  { value: 'travel', label: '교통비' },
  { value: 'program', label: '프로그램비' },
  { value: 'admin', label: '관리운영비' },
  { value: 'other', label: '기타' },
];

function emptyItem() {
  return {
    id: genId(),
    category: 'program',
    date: new Date().toISOString().slice(0, 10),
    name: '',
    amount: '',
    note: '',
  };
}

export default function Budget() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(getBudgetMeta());
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyItem());
  const [showMeta, setShowMeta] = useState(false);
  const [metaForm, setMetaForm] = useState(getBudgetMeta());

  function refresh() {
    setItems(getBudgetItems());
    setMeta(getBudgetMeta());
  }

  useEffect(() => {
    refresh();
  }, []);

  const totalSpent = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const balance = (Number(meta.totalBudget) || 0) - totalSpent;
  const usage = meta.totalBudget > 0 ? Math.min(100, Math.round((totalSpent / meta.totalBudget) * 100)) : 0;

  function handleAdd() {
    if (!addForm.name.trim()) return;
    saveBudgetItem({ ...addForm, amount: Number(addForm.amount) || 0 });
    setAddForm(emptyItem());
    setShowAdd(false);
    refresh();
  }

  function handleDelete(id) {
    deleteBudgetItem(id);
    refresh();
  }

  function handleSaveMeta() {
    saveBudgetMeta(metaForm);
    setShowMeta(false);
    refresh();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="예산 관리"
        subtitle={`${meta.year}년 ${meta.month}월 · ${meta.title}`}
        actions={(
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowMeta(true)} className="btn-secondary">
              <Settings size={14} />
              기본 설정
            </button>
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              <PlusCircle size={14} />
              지출 추가
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="총 예산" value={`${(Number(meta.totalBudget) || 0).toLocaleString()}원`} />
        <SummaryCard label="누적 지출" value={`${totalSpent.toLocaleString()}원`} />
        <SummaryCard label="잔액" value={`${balance.toLocaleString()}원`} tone={balance >= 0 ? 'text-sage-700' : 'text-red-600'} />
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">예산 집행률</span>
          <span className="font-semibold text-gray-900">{usage}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${usage >= 90 ? 'bg-red-500' : usage >= 70 ? 'bg-amber-500' : 'bg-sage-500'}`} style={{ width: `${usage}%` }} />
        </div>
      </div>

      {showAdd && (
        <div className="card p-5 mb-6">
          <p className="text-sm font-semibold text-gray-800 mb-4">지출 항목 추가</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="집행일">
              <input type="date" value={addForm.date} onChange={(event) => setAddForm((prev) => ({ ...prev, date: event.target.value }))} className="input-field" />
            </Field>
            <Field label="카테고리">
              <select value={addForm.category} onChange={(event) => setAddForm((prev) => ({ ...prev, category: event.target.value }))} className="input-field">
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </Field>
            <Field label="항목명">
              <input type="text" value={addForm.name} onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))} className="input-field" placeholder="예: 교재 구입, 간식비" />
            </Field>
            <Field label="금액">
              <input type="number" value={addForm.amount} onChange={(event) => setAddForm((prev) => ({ ...prev, amount: event.target.value }))} className="input-field" />
            </Field>
            <div className="md:col-span-2">
              <Field label="비고">
                <input type="text" value={addForm.note} onChange={(event) => setAddForm((prev) => ({ ...prev, note: event.target.value }))} className="input-field" />
              </Field>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={handleAdd} className="btn-primary">
              <Check size={14} />
              저장
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">
              <X size={14} />
              취소
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">지출 항목이 없습니다.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {item.date} · {CATEGORIES.find((category) => category.value === item.category)?.label || '기타'}
                </p>
                {item.note && <p className="text-sm text-gray-600 mt-2">{item.note}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-900">{(Number(item.amount) || 0).toLocaleString()}원</p>
                <button type="button" onClick={() => handleDelete(item.id)} className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600 mt-3">
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <p className="font-semibold text-gray-900 mb-4">예산 기본 설정</p>
            <div className="space-y-4">
              <Field label="예산명">
                <input type="text" value={metaForm.title} onChange={(event) => setMetaForm((prev) => ({ ...prev, title: event.target.value }))} className="input-field" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="연도">
                  <input type="number" value={metaForm.year} onChange={(event) => setMetaForm((prev) => ({ ...prev, year: Number(event.target.value) }))} className="input-field" />
                </Field>
                <Field label="월">
                  <input type="number" min={1} max={12} value={metaForm.month} onChange={(event) => setMetaForm((prev) => ({ ...prev, month: Number(event.target.value) }))} className="input-field" />
                </Field>
              </div>
              <Field label="총 예산">
                <input type="number" value={metaForm.totalBudget} onChange={(event) => setMetaForm((prev) => ({ ...prev, totalBudget: Number(event.target.value) }))} className="input-field" />
              </Field>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setShowMeta(false)} className="btn-secondary">취소</button>
              <button type="button" onClick={handleSaveMeta} className="btn-primary">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, tone = 'text-gray-900' }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
