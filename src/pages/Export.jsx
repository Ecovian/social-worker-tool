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

  const filteredJournals = useMemo(() => (
    journals.filter((journal) => (
      selectedIds.includes(journal.id)
      && (!type || journal.type === type)
      && (!month || (journal.date || '').startsWith(month))
    ))
  ), [journals, month, selectedIds, type]);

  function toggleJournal(id) {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    ));
  }

  function toggleAll() {
    setSelectedIds((prev) => (
      prev.length === journals.length ? [] : journals.map((journal) => journal.id)
    ));
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
        title="파일 내보내기"
        subtitle="다종 일지와 예산 데이터를 PDF, 엑셀, DOCX 형식으로 출력합니다."
      />

      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">일지 내보내기</p>
              <p className="text-xs text-gray-400 mt-1">월간 관찰, 놀이, 프로그램, 위험기록을 유형별로 골라서 출력할 수 있습니다.</p>
            </div>
            <button type="button" onClick={toggleAll} className="btn-secondary">
              <Download size={14} />
              {selectedIds.length === journals.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select value={type} onChange={(event) => setType(event.target.value)} className="input-field">
              <option value="">전체 유형</option>
              {JOURNAL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-field" />
          </div>

          <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100">
            {journals.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">아직 작성된 일지가 없습니다.</div>
            ) : (
              journals.map((journal) => (
                <label key={journal.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(journal.id)}
                    onChange={() => toggleJournal(journal.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{journal.title || journalTypeLabel(journal.type)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {journal.date} · {journal.childName || '대상 없음'} · {journalTypeLabel(journal.type)}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <ExportButton format="pdf" label="일지 PDF" loading={loading === 'journal-pdf'} disabled={filteredJournals.length === 0} onClick={() => handleExport('journal-pdf')} />
            <ExportButton format="xlsx" label="일지 엑셀" loading={loading === 'journal-xlsx'} disabled={filteredJournals.length === 0} onClick={() => handleExport('journal-xlsx')} />
            <ExportButton format="docx" label="일지 DOCX" loading={loading === 'journal-docx'} disabled={filteredJournals.length === 0} onClick={() => handleExport('journal-docx')} />
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-800">예산 내보내기</p>
            <p className="text-xs text-gray-400 mt-1">
              {budgetMeta.title || '예산표'} · {budgetItems.length}개 지출 항목
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
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {FORMAT_ICONS[format]}
      {loading ? '생성 중...' : label}
    </button>
  );
}
