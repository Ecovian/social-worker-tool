import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Download, Image, Upload } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { exportBackup, importBackup } from '../lib/storage';

export default function DataManagement() {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState('');
  const [toast, setToast] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleExport() {
    setLoading('export');

    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `양식도구_백업_${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('백업 파일을 다운로드했습니다.');
    } catch (error) {
      showToast(`백업 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
      setLoading('');
    }
  }

  function handleSelectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setRestoreTarget({
          fileName: file.name,
          exportedAt: parsed.__exportedAt,
          version: parsed.__version || 1,
          photoCount: Array.isArray(parsed.__photos) ? parsed.__photos.length : 0,
          payload: parsed,
        });
      } catch {
        showToast('올바른 JSON 백업 파일이 아닙니다.', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  async function confirmRestore() {
    if (!restoreTarget) return;
    setLoading('restore');

    try {
      await importBackup(restoreTarget.payload);
      showToast('백업 복원이 완료되었습니다. 화면을 새로고침합니다.');
      setRestoreTarget(null);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      showToast(`복원 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader
        title="백업/복원"
        subtitle="5개 공식 양식 기록, 아동 정보, 예산, 첨부 사진을 한 번에 백업하고 복원합니다."
      />

      <div className="space-y-5">
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <Download size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">백업 파일 만들기</p>
              <p className="mt-1 text-sm text-gray-500">
                현재 저장된 놀이계획서, 초기상담기록지, 면담일지, 활동일지와 아동 정보, 예산, 사진을 JSON 파일로 저장합니다.
              </p>
              <button type="button" onClick={handleExport} disabled={loading === 'export'} className="btn-primary mt-4">
                <Download size={14} />
                {loading === 'export' ? '백업 생성 중...' : 'JSON 백업 다운로드'}
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Upload size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">백업 복원</p>
              <p className="mt-1 text-sm text-gray-500">
                백업 파일을 복원하면 현재 기기의 로컬 데이터와 사진 저장소가 백업 파일 내용으로 교체됩니다.
              </p>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleSelectFile} />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary mt-4">
                <Upload size={14} />
                복원할 백업 파일 선택
              </button>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Database size={16} className="text-primary-600" />
            <p className="text-sm font-semibold text-gray-900">백업에 포함되는 항목</p>
          </div>
          <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">놀이계획서(개별), 놀이계획서(소그룹/집단), 초기상담기록지, 면담일지, 활동일지</div>
            <div className="rounded-xl bg-gray-50 p-4">아동 기본정보, 보호자 정보, 메모</div>
            <div className="rounded-xl bg-gray-50 p-4">예산 메타데이터와 지출 항목</div>
            <div className="rounded-xl bg-gray-50 p-4">임시저장 초안과 첨부 사진 저장소</div>
          </div>
        </div>
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">백업 파일을 복원할까요?</p>
                <p className="mt-1 text-sm text-gray-500">현재 기기에 저장된 데이터가 모두 교체됩니다.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              <p>파일명: {restoreTarget.fileName}</p>
              <p>백업 시각: {restoreTarget.exportedAt ? new Date(restoreTarget.exportedAt).toLocaleString('ko-KR') : '정보 없음'}</p>
              <p>버전: v{restoreTarget.version}</p>
              <p className="flex items-center gap-2">
                <Image size={14} />
                사진 수: {restoreTarget.photoCount}장
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setRestoreTarget(null)} className="btn-secondary">
                취소
              </button>
              <button type="button" onClick={confirmRestore} disabled={loading === 'restore'} className="btn-primary">
                {loading === 'restore' ? '복원 중...' : '복원 실행'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm shadow-lg ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          <div className="inline-flex items-center gap-2">
            {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} className="text-green-400" />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
