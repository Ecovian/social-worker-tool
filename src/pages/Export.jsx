import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, FileText, Sheet } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  getBudgetItems,
  getBudgetMeta,
  getJournals,
  JOURNAL_TYPE_OPTIONS,
  journalTypeLabel,
} from '../lib/storage';

const FORMAT_ICONS = {
  pdf: <FileText size={16} className="text-red-500" />,
  xlsx: <Sheet size={16} className="text-green-600" />,
  docx: <FileDown size={16} className="text-blue-600" />,
};

export default function Export() {
  const [journals, setJournals] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [budgetMeta, setBudgetMeta] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [type, setType] = useState('');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => {
    const nextJournals = getJournals();
    setJournals(nextJournals);
    setSelectedIds(nextJournals.map((journal) => journal.id));
    setBudgetItems(getBudgetItems());
    setBudgetMeta(getBudgetMeta());
  }, []);

  const visibleJournals = useMemo(() => (
    journals.filter((journal) => (
      (!type || journal.type === type)
      && (!month || (journal.date || journal.writerDate || '').startsWith(month))
    ))
  ), [journals, month, type]);

  const filteredJournals = useMemo(() => (
    visibleJournals.filter((journal) => selectedIds.includes(journal.id))
  ), [selectedIds, visibleJournals]);

  function toggleJournal(id) {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    ));
  }

  function toggleAllVisible() {
    const visibleIds = visibleJournals.map((journal) => journal.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  }

  async function handleExport(key) {
    setLoading(key);

    try {
      const exports = await import('../lib/exportUtils');

      if (key === 'journal-pdf') await exports.exportJournalPDF(filteredJournals);
      if (key === 'journal-xlsx') await exports.exportJournalXLSX(filteredJournals);
      if (key === 'journal-docx') await exports.exportJournalDOCX(filteredJournals);
      if (key === 'budget-pdf') await exports.exportBudgetPDF(budgetItems, budgetMeta);
      if (key === 'budget-xlsx') await exports.exportBudgetXLSX(budgetItems, budgetMeta);
      if (key === 'budget-docx') await exports.exportBudgetDOCX(budgetItems, budgetMeta);
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageHeader
        title="내보내기"
        subtitle="공식 양식 기록과 예산 데이터를 PDF, 엑셀, DOCX 형식으로 내보냅니다."
      />

      <div className="space-y-5">
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">양식 기록 내보내기</p>
              <p className="mt-1 text-xs text-gray-400">놀이계획서, 초기상담기록지, 면담일지, 활동일지를 선택해서 출력할 수 있습니다.</p>
            </div>
            <button type="button" onClick={toggleAllVisible} className="btn-secondary">
              <Download size={14} />
              현재 목록 {visibleJournals.every((journal) => selectedIds.includes(journal.id)) ? '선택 해제' : '전체 선택'}
            </button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <select value={type} onChange={(event) => setType(event.target.value)} className="input-field">
              <option value="">전체 양식</option>
              {JOURNAL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field" />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {visibleJournals.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">조건에 맞는 양식이 없습니다.</div>
            ) : (
              visibleJournals.map((journal) => (
                <label key={journal.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(journal.id)}
                    onChange={() => toggleJournal(journal.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{journal.title || journalTypeLabel(journal.type)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {journal.date || journal.writerDate} · {journal.childName || '아동명 미입력'} · {journalTypeLabel(journal.type)}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ExportButton format="pdf" label="양식 PDF" loading={loading === 'journal-pdf'} disabled={filteredJournals.length === 0} onClick={() => handleExport('journal-pdf')} />
            <ExportButton format="xlsx" label="양식 엑셀" loading={loading === 'journal-xlsx'} disabled={filteredJournals.length === 0} onClick={() => handleExport('journal-xlsx')} />
            <ExportButton format="docx" label="양식 DOCX" loading={loading === 'journal-docx'} disabled={filteredJournals.length === 0} onClick={() => handleExport('journal-docx')} />
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-900">예산 내보내기</p>
            <p className="mt-1 text-xs text-gray-400">
              {budgetMeta.title || '예산'} · {budgetItems.length}개 지출 항목
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton format="pdf" label="예산 PDF" loading={loading === 'budget-pdf'} onClick={() => handleExport('budget-pdf')} />
            <ExportButton format="xlsx" label="예산 엑셀" loading={loading === 'budget-xlsx'} onClick={() => handleExport('budget-xlsx')} />
            <ExportButton format="docx" label="예산 DOCX" loading={loading === 'budget-docx'} onClick={() => handleExport('budget-docx')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportButton({ format, label, loading, disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {FORMAT_ICONS[format]}
      {loading ? '생성 중...' : label}
    </button>
  );
}
