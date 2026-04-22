import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Clock3, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  ATTENDANCE_OPTIONS,
  attendanceLabel,
  getClients,
  getDashboardSnapshot,
  getJournals,
  JOURNAL_TYPES,
  saveAttendanceBulk,
} from '../lib/storage';

const ESCORT_OPTIONS = ['보호자 동행', '학부모 픽업', '도보 귀가', '차량 귀가', '기타'];

function createEntry(client, existing) {
  return {
    clientId: client.id,
    childName: client.name,
    attendanceStatus: existing?.attendanceStatus || '',
    arrivalTime: existing?.arrivalTime || '',
    departureTime: existing?.departureTime || '',
    escortType: existing?.escortType || '',
    handoffNote: existing?.handoffNote || '',
    status: existing?.status || 'draft',
  };
}

export default function AttendanceBoard() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clients, setClients] = useState([]);
  const [entries, setEntries] = useState([]);
  const [toast, setToast] = useState('');
  const [snapshot, setSnapshot] = useState(getDashboardSnapshot());

  useEffect(() => {
    const nextClients = getClients();
    const attendanceMap = new Map(
      getJournals()
        .filter((journal) => journal.type === JOURNAL_TYPES.ATTENDANCE_DAILY && journal.date === date)
        .map((journal) => [journal.clientId, journal]),
    );

    setClients(nextClients);
    setEntries(nextClients.map((client) => createEntry(client, attendanceMap.get(client.id))));
    setSnapshot(getDashboardSnapshot(date));
  }, [date]);

  const missingInputCount = useMemo(
    () => entries.filter((entry) => !entry.attendanceStatus).length,
    [entries],
  );

  function updateEntry(clientId, key, value) {
    setEntries((prev) => prev.map((entry) => (
      entry.clientId === clientId ? { ...entry, [key]: value } : entry
    )));
  }

  function fillAll(status) {
    setEntries((prev) => prev.map((entry) => ({ ...entry, attendanceStatus: status })));
  }

  function saveAll() {
    const filledEntries = entries.filter((entry) => entry.attendanceStatus);
    saveAttendanceBulk({
      date,
      entries: filledEntries,
    });
    setToast(`${filledEntries.length}명의 출결/귀가 기록을 저장했습니다.`);
    setSnapshot(getDashboardSnapshot(date));
    window.setTimeout(() => setToast(''), 1800);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="출결·귀가 빠른 입력"
        subtitle="여러 아동의 출결, 귀가, 인계사항을 한 번에 저장합니다."
        actions={(
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => fillAll('present')} className="btn-secondary">
              <CheckSquare size={14} />
              전체 출석
            </button>
            <button type="button" onClick={saveAll} className="btn-primary">
              <Save size={14} />
              일괄 저장
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">입력 날짜</p>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="input-field" />
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">오늘 출결 미입력</p>
          <p className="text-2xl font-bold text-primary-700">{snapshot.missingAttendanceClients.length}명</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">귀가 미확인</p>
          <p className="text-2xl font-bold text-amber-700">{snapshot.missingDeparture.length}건</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">현재 화면 미입력</p>
          <p className="text-2xl font-bold text-red-600">{missingInputCount}명</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1.2fr,1fr,1fr,1fr,1fr,1.5fr] gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
          <span>아동</span>
          <span>출결</span>
          <span>등원</span>
          <span>귀가</span>
          <span>귀가 방식</span>
          <span>특이사항</span>
        </div>
        <div className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <div key={entry.clientId} className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr,1fr,1fr,1fr,1.5fr] gap-3 px-4 py-4">
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{entry.childName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {entry.attendanceStatus ? attendanceLabel(entry.attendanceStatus) : '아직 미입력'}
                  </p>
                </div>
              </div>
              <select value={entry.attendanceStatus} onChange={(event) => updateEntry(entry.clientId, 'attendanceStatus', event.target.value)} className="input-field">
                <option value="">선택</option>
                {ATTENDANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input type="time" value={entry.arrivalTime} onChange={(event) => updateEntry(entry.clientId, 'arrivalTime', event.target.value)} className="input-field" />
              <input type="time" value={entry.departureTime} onChange={(event) => updateEntry(entry.clientId, 'departureTime', event.target.value)} className="input-field" />
              <select value={entry.escortType} onChange={(event) => updateEntry(entry.clientId, 'escortType', event.target.value)} className="input-field">
                <option value="">선택</option>
                {ESCORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <textarea value={entry.handoffNote} onChange={(event) => updateEntry(entry.clientId, 'handoffNote', event.target.value)} rows={2} className="input-field resize-none" />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mt-5">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Clock3 size={15} className="text-primary-600" />
          빠른 입력 팁
        </p>
        <ul className="text-sm text-gray-500 mt-3 space-y-2">
          <li>출석은 먼저 전체 입력 후 결석/지각 아동만 수정하면 빠릅니다.</li>
          <li>귀가 시간이 비어 있으면 대시보드에서 귀가 미확인으로 잡힙니다.</li>
          <li>특이사항은 보호자 전달이 필요한 경우 짧게 적어 두면 이후 일지 작성이 편합니다.</li>
        </ul>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
