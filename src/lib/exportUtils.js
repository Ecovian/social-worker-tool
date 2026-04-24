import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { format } from 'date-fns';
import { getPhotoDataUrl } from './photoStore';
import { JOURNAL_TYPES, journalTypeLabel } from './storage';

// ── 폰트 로딩 ─────────────────────────────────────────────────────────────────
let fontBase64 = null;
let currentFont = 'Helvetica'; // 폰트 로드 실패시 기본값

async function loadKoreanFont() {
  if (fontBase64) return fontBase64;
  const base = import.meta.env.BASE_URL || '/';
  const url = `${base.replace(/\/$/, '')}/fonts/NanumGothic.ttf`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`폰트 로드 실패: ${response.status} (${url})`);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  fontBase64 = btoa(binary);
  return fontBase64;
}

async function createPdf() {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  currentFont = 'Helvetica';
  try {
    const font = await loadKoreanFont();
    doc.addFileToVFS('NanumGothic.ttf', font);
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
    doc.setFont('NanumGothic', 'normal');
    currentFont = 'NanumGothic';
  } catch (e) {
    console.warn('[PDF] 한글 폰트 로드 실패, 기본 폰트 사용:', e.message);
    doc.setFont('Helvetica', 'normal');
  }
  return doc;
}

function f() { return currentFont; } // 현재 폰트 반환 헬퍼

// ── 공통 헬퍼 ─────────────────────────────────────────────────────────────────

const S = {
  lbl: { fillColor: [220, 220, 220], halign: 'center', valign: 'middle', fontSize: 8, cellPadding: 2 },
  ctn: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9, cellPadding: 2 },
  hdr: { fillColor: [50, 50, 50], textColor: [255, 255, 255], halign: 'center', valign: 'middle', fontSize: 8, cellPadding: 2 },
};

function L(text, extra = {}) { return { content: String(text ?? ''), styles: { ...S.lbl, font: f(), ...extra } }; }
function C(text = '', extra = {}) { return { content: String(text ?? ''), styles: { ...S.ctn, font: f(), ...extra } }; }
function CW(text = '', span = 1, extra = {}) { return { content: String(text ?? ''), colSpan: span, styles: { ...S.ctn, font: f(), ...extra } }; }
function LW(text, span = 1, extra = {}) { return { content: String(text ?? ''), colSpan: span, styles: { ...S.lbl, font: f(), ...extra } }; }
function H(text, span = 1, extra = {}) { return { content: String(text ?? ''), colSpan: span, styles: { ...S.hdr, font: f(), ...extra } }; }

function chk(options, selected) {
  return options.map(o => `${selected === o ? '■' : '□'} ${o}`).join('   ');
}

function drawTable(doc, startY, body, head, foot, colStyles) {
  const fn = f();
  autoTable(doc, {
    startY,
    head: head || undefined,
    body,
    foot: foot || undefined,
    styles: {
      font: fn,
      fontSize: 9,
      lineColor: [100, 100, 100],
      lineWidth: 0.3,
      overflow: 'linebreak',
      minCellHeight: 8,
    },
    headStyles: { font: fn },
    footStyles: { font: fn, fillColor: [220, 220, 220] },
    theme: 'grid',
    margin: { left: 10, right: 10 },
    columnStyles: colStyles || {},
  });
  return doc.lastAutoTable.finalY;
}

function drawTitle(doc, t1, t2) {
  let y = 14;
  doc.setFont(f(), 'normal');
  doc.setFontSize(14);
  doc.text(t1, 105, y, { align: 'center' });
  if (t2) { y += 7; doc.setFontSize(10); doc.text(t2, 105, y, { align: 'center' }); }
  return y + 5;
}

function drawFooter(doc, text, y) {
  if (y > 283) { doc.addPage(); y = 15; }
  doc.setFont(f(), 'normal');
  doc.setFontSize(9);
  doc.text(text, 10, y);
}

function v(val) { return String(val ?? ''); }

// ── 1. 활동일지 ───────────────────────────────────────────────────────────────

function renderActivityLog(doc, j) {
  let y = drawTitle(doc, '[서식9] 놀세이버 활동일지', '놀세이버 활동일지(개별활동 / 소그룹활동)');

  doc.setFont(f(), 'normal');
  doc.setFontSize(8);
  doc.text(
    `회차 / 누적 시간        ${v(j.sessionNumber)} 회 /  ${v(j.cumulativeHours)} 시간`,
    10, y,
  );
  y += 4;

  const COL5 = { 0: { cellWidth: 25 }, 1: { cellWidth: 38 }, 2: { cellWidth: 31 }, 3: { cellWidth: 23 }, 4: { cellWidth: 73 } };

  const kindText = chk(['개별활동', '소그룹활동'], v(j.activityKind));

  y = drawTable(doc, y, [
    [L('놀세이버명\n(소그룹 구성원)'), CW(j.saverName, 2), L('활동 일시'), C(`${v(j.date)}  ${v(j.time)}`)],
    [L('아동명\n(소그룹 구성원)'), CW(j.childName, 2), L('아동연령'), C(j.childAge)],
    [L('활동계획안 NO.'), CW(j.activityPlanNo, 2), L('활동구분'), C(kindText)],
    [L('활동장소'), CW(j.activityPlace, 2), L('만족도'), C(j.satisfaction)],
    [L('활동 주제'), CW(j.activitySubject, 4)],
    [L('놀잇감/사용 교구'), CW(j.playMaterials, 4)],
  ], null, null, COL5);

  const detail = [
    v(j.detailedActivities),
    j.playProcess ? `\n\n[놀이과정]\n${v(j.playProcess)}` : '',
    j.content ? `\n\n[관찰내용]\n${v(j.content)}` : '',
    j.conversationNotes ? `\n\n[이야기 나눈 내용]\n${v(j.conversationNotes)}` : '',
  ].join('');

  y = drawTable(doc, y, [
    [
      L('세부\n활동\n내용'),
      L('놀이과정\n*관찰내용\n*놀세이버와\n또래아동이\n야기 나눈\n내용 등', { halign: 'left', fontSize: 7 }),
      C(detail, { minCellHeight: 75 }),
    ],
  ], null, null, { 0: { cellWidth: 25 }, 1: { cellWidth: 45 }, 2: { cellWidth: 120 } });

  if (y > 220) { doc.addPage(); y = 15; }

  y = drawTable(doc, y, [
    [
      L('놀세이버 의견\n(아동의 변화,\n보호자 면담 내용\n등)'),
      C(`※ 활동 평가 및 의견. 부모와 상담 또는 부모 의견 등 작성\n\n${v(j.saverOpinion) || v(j.activityEvaluation)}`, { minCellHeight: 50 }),
    ],
    [
      L('활동 사진'),
      C(`※ 1~2 장면 (사진 원본 별도 보관 필요)\n\n첨부 사진: ${j.photos?.length || 0}장`, { minCellHeight: 40 }),
    ],
  ], null, null, { 0: { cellWidth: 45 }, 1: { cellWidth: 145 } });

  drawFooter(doc, `협력기관 담당자 확인:                     (명)`, y + 5);
}

// ── 2. 면담일지 ───────────────────────────────────────────────────────────────

function renderInterviewLog(doc, j) {
  const y0 = drawTitle(doc, '면담/상담 일지');

  const methodMap = { '전화': '➀', '내소(센터)': '➁', '가정방문': '➂', '기타': '➃' };
  const sel = v(j.consultationMethod);
  const methodText = `➀전화 ➁ 내소(센터) ➂가정방문\n➃ 기타(${sel === '기타' ? v(j.infoProviderDetail) : ''})\n▶ 선택: ${methodMap[sel] || ''}${sel}`;

  const provMap = { '가족': '①', '기관종사자': '➁', '기타': '➂' };
  const prov = v(j.infoProvider);
  const provText = `①가족 ( )  ➁기관종사자\n➂기타(${prov === '기타' ? v(j.infoProviderDetail) : ''})\n▶ 선택: ${provMap[prov] || ''}${prov}`;

  const contentText = [
    '1) 아동의 놀이활동 내용 및 놀이관련 정보 제공',
    '2) 아동의 변화 및 아동의 놀이 특성',
    '3) 아동에 대한 특성, 특이 사항 등 공유',
    '4) 자문위원의 슈퍼비젼과 향후 계획 공유',
    '5) 아동 및 보호자의 욕구 파악-이후 놀이 활동 계획 등',
    '',
    v(j.consultationContent),
  ].join('\n');

  const COL4 = { 0: { cellWidth: 40 }, 1: { cellWidth: 55 }, 2: { cellWidth: 38 }, 3: { cellWidth: 57 } };

  const finalY = drawTable(doc, y0, [
    [L('놀세이버명'), C(j.saverName), L('상담일자'), C(j.consultationDate || j.date)],
    [L('아동명'), C(j.childName), L('면담자\n(보호자명)'), C(j.intervieweeName)],
    [L('상담 수행\n방법 구분'), C(methodText), L('상담정보\n제공자'), C(provText)],
    [L('상담(면담)\n내용'), CW(contentText, 3, { minCellHeight: 70 })],
    [L('향후 개입 계획\n및 보호자\n상담 결과'), CW(j.futurePlan, 3, { minCellHeight: 35 })],
  ], null, null, COL4);

  drawFooter(doc, `협력기관 담당자 확인:                     (명)`, finalY + 5);
}

// ── 3. 초기상담기록지 ─────────────────────────────────────────────────────────

function renderInitialConsultation(doc, j) {
  let y = drawTitle(doc, '[서식7] 초기상담 기록지', '초기상담 기록지');

  const COL6 = { 0: { cellWidth: 32 }, 1: { cellWidth: 28 }, 2: { cellWidth: 30 }, 3: { cellWidth: 28 }, 4: { cellWidth: 22 }, 5: { cellWidth: 50 } };
  y = drawTable(doc, y, [
    [L('아동명'), CW(j.childName, 2), L('생년월일\n(연령)'), CW(j.birthDate, 1), L('성별'), C(j.gender)],
    [L('장애 유형\n장애 정도'), CW(`${v(j.disabilityType)} / ${v(j.disabilityLevel)}`, 2), L('비상연락처'), CW(j.emergencyContact, 3)],
    [L('아동 질병/질환\n(건강상\n특이사항)'), CW(j.healthNotes, 5, { minCellHeight: 14 })],
  ], null, null, COL6);

  const famData = (j.familyRows || []).length > 0
    ? j.familyRows.map(r => [v(r.relation), v(r.name), v(r.age), v(r.disability), v(r.notes)])
    : [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']];

  y = drawTable(doc, y, famData,
    [[H('가족관계', 5)], ['관계', '이름', '연령', '장애유무', '특이사항 (질병, 동거 여부 등)']],
    null,
    { 0: { cellWidth: 25 }, 1: { cellWidth: 28 }, 2: { cellWidth: 18 }, 3: { cellWidth: 28 }, 4: { cellWidth: 91 } });

  const SOLO_OPTS = ['1시간 미만', '1시간 이상~2시간 미만', '2시간 이상~3시간 미만', '3시간 이상~4시간 미만', '4시간 이상'];
  const LV_OPTS = ['매우 많다', '조금 많다', '보통이다', '부족하다', '매우 부족하다'];

  const soloText = SOLO_OPTS.map(o => `${j.soloPlayTimeRange === o ? '■' : '□'} ${o}`).join('  ');
  const toyTypeText = LV_OPTS.map(o => `${j.toyTypeLevel === o ? '■' : '□'} ${o}`).join('  ');
  const toyQtyText = LV_OPTS.map(o => `${j.toyQuantityLevel === o ? '■' : '□'} ${o}`).join('  ');

  const leisureContent = [
    `1) 가정이나 지역사회에서 즐겨하는 활동은?\n${v(j.leisureActivity)}`,
    `\n2) 자주가는 곳(공간)은?\n${v(j.frequentPlace)}`,
    `\n3) 아동이 혼자 노는 시간은 얼마나 되나요?\n${soloText}`,
    `\n4) 아동이 갖고 노는 장난감의 종류와 양은?\n  종류(다양성): ${toyTypeText}\n  양(갯수): ${toyQtyText}`,
  ].join('');

  y = drawTable(doc, y, [
    [L('여가 시간'), C(leisureContent, { minCellHeight: 55 })],
  ], null, null, { 0: { cellWidth: 25 }, 1: { cellWidth: 165 } });

  doc.addPage();
  y = 12;

  y = drawTable(doc, y, [
    [L('또래관계'), C(`1) 친구와 주로 하는 활동은?\n${v(j.peerActivities)}\n\n2) 또래 관계에 대해 알고 있어야 할 부분은?\n${v(j.peerNotes)}`, { minCellHeight: 28 })],
    [L('진로'), C(`1) 아동의 꿈은?\n${v(j.dream)}\n\n2) 아동의 특기는?\n${v(j.strengths)}`, { minCellHeight: 22 })],
    [L('욕구'), C(`1) 아동이 가장 즐겨 하는 것은 무엇입니까?\n${v(j.favoriteThings)}\n\n2) 이 서비스를 통해 얻고 싶은 것은?\n${v(j.serviceGoals)}`, { minCellHeight: 28 })],
    [L('아동에 대해\n주의 해야\n하는 점'), C(`1) 문제행동이나 자극이 되는 부분\n${v(j.cautionBehavior)}\n\n2) 질병과 알레르기\n${v(j.cautionHealth)}\n\n3) 돌발행동 대처 Tip\n${v(j.cautionTips)}`, { minCellHeight: 35 })],
    [L('외부 놀이에\n대한 욕구'), C(`1) 외부 놀이를 희망하시나요?\n${v(j.outdoorPlayWish)}\n\n2) 외부 놀이 시 주의해야 할 점은?\n${v(j.outdoorPlayNotes)}`, { minCellHeight: 25 })],
  ], null, null, { 0: { cellWidth: 32 }, 1: { cellWidth: 158 } });

  doc.addPage();
  drawTable(doc, 15, [
    [L('아동 사진 (각 구분별로 최소 2장 이상 첨부)', { halign: 'left' }), C('')],
    [L('아동 사진\n(전신 포함)'), C('', { minCellHeight: 55 })],
    [L('가정 내\n아동 놀이공간'), C('', { minCellHeight: 55 })],
    [L('아동 놀잇감'), C('', { minCellHeight: 55 })],
    [L('아동의\n놀이 상황'), C('', { minCellHeight: 55 })],
  ], null, null, { 0: { cellWidth: 50 }, 1: { cellWidth: 140 } });
}

// ── 4. 놀이계획서(소그룹) ──────────────────────────────────────────────────────

function renderGroupPlayPlan(doc, j) {
  let y = drawTitle(doc, '[서식8] 놀이계획서', '놀이계획서-소그룹');

  doc.setFont(f(), 'normal');
  doc.setFontSize(9);
  doc.text(
    `작성일 : ${v(j.writerDate) || v(j.date) || '      년       월       일'}        작성자 : ${v(j.writerName) || v(j.saverName)}`,
    10, y,
  );
  y += 5;

  const COL6 = { 0: { cellWidth: 35 }, 1: { cellWidth: 30 }, 2: { cellWidth: 38 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28 }, 5: { cellWidth: 31 } };

  y = drawTable(doc, y, [
    [L('활동일시'), CW(v(j.date), 1), L('월    일    요일\n활동 시간 :'), C(v(j.time)), L('장소'), C(v(j.location) || v(j.activityPlace))],
    [L('참여 놀세이버\n이름'), CW(v(j.participantSaverNames) || v(j.saverName), 5)],
    [L('참여\n아동이름(연령)'), CW(v(j.participantChildrenSummary), 5)],
  ], null, null, COL6);

  const peerRows = (j.peerLevelRows || []).length > 0
    ? j.peerLevelRows.map(r => [v(r.childName), `${v(r.playLevel)}\n${v(r.notes)}`])
    : [['', ''], ['', ''], ['', '']];

  y = drawTable(doc, y, peerRows,
    [[H('아동별 또래와의 놀이활동 수준', 2)], ['아동명', '또래와의 놀이활동 수준 및 특성']],
    null,
    { 0: { cellWidth: 50 }, 1: { cellWidth: 140 } });

  y = drawTable(doc, y, [
    [L('소그룹 매칭\n특성 및\n활동 목표'), C(`※ 소그룹 놀이 관련 목표 계획에 따른 활동 작성, 상세하게 작성\n\n${v(j.matchingGoal)}`, { minCellHeight: 32 })],
    [L('놀이 활동 계획\n활동 계획'), C(v(j.groupPlan), { minCellHeight: 30 })],
    [L('구매 필요한 물품\n(협력기관에 협조\n요청 사항)'), C(v(j.neededMaterials), { minCellHeight: 20 })],
    [L('비고'), C(v(j.note), { minCellHeight: 12 })],
  ], null, null, { 0: { cellWidth: 42 }, 1: { cellWidth: 148 } });

  drawFooter(doc, `협력기관 담당자 확인:                     (명)`, y + 5);
}

// ── 5. 놀이계획서(개별) ────────────────────────────────────────────────────────

function renderIndividualPlayPlan(doc, j) {
  const isFirst = j.planPeriod !== '하반기';
  const periodLabel = isFirst ? '상반기' : '하반기';
  const months = isFirst
    ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월']
    : ['9월', '10월', '11월', '12월'];

  let y = drawTitle(doc, '[서식8] 놀이계획서', `놀이계획서-개별 (${periodLabel})`);

  const HCOL = { 0: { cellWidth: 30 }, 1: { cellWidth: 44 }, 2: { cellWidth: 16 }, 3: { cellWidth: 25 }, 4: { cellWidth: 75 } };

  const periodDateText = v(j.activityStartDate) && v(j.activityEndDate)
    ? `${j.activityStartDate} ~ ${j.activityEndDate}\n( ${v(j.weeklyCountText) || '     주간/      회'} )`
    : '       월      일  ~       월      일\n(         주간/          회)';

  const timeText = v(j.activityTimeText) || '매주       요일\n      시      분  ~       시      분';

  y = drawTable(doc, y, [
    [L('놀세이버명'), C(v(j.saverName) || v(j.writerName)), L('(인)'), L('계획\n일시'), C(v(j.date) || v(j.writerDate) || '      월      일      요일')],
    [L('아동명'), CW(j.childName, 2), L('아동연령'), C(`${v(j.childAge)} 세 (${v(j.childGrade)} 학년)`)],
    [L('활동 기간'), CW(periodDateText, 2), L('활동\n시간'), C(timeText)],
    [L('현행 수준'), CW(j.currentLevel, 4, { minCellHeight: 22 })],
    [L('놀이 목표'), CW(`※ 아동별 학습/놀이관련 목표 계획에 따른 활동 작성\n${v(j.playGoal)}`, 4, { minCellHeight: 22 })],
  ], null, null, HCOL);

  const MCOL = {
    0: { cellWidth: 12 }, 1: { cellWidth: 13 }, 2: { cellWidth: 25 },
    3: { cellWidth: 57 }, 4: { cellWidth: 27 }, 5: { cellWidth: 56 },
  };

  const planMap = {};
  (j.planRows || []).forEach(r => {
    if (!planMap[r.month]) planMap[r.month] = [];
    planMap[r.month].push(r);
  });

  const monthRows = [];
  months.forEach(month => {
    const rows = planMap[month]?.length > 0 ? planMap[month] : [{}];
    rows.forEach((r, idx) => {
      monthRows.push([
        idx === 0 ? month : '',
        v(r.sessionCount),
        v(r.playArea),
        v(r.activityContent),
        v(r.planNo),
        v(r.placeMaterials),
      ]);
    });
  });

  drawTable(doc, y, monthRows,
    [
      [H('월별 놀이 활동 계획', 6)],
      ['회차', '회기수', '놀이\n영역', '활동 내용', '활동계획안\nNO.', '활동 장소 및\n구매 필요한 물품'],
    ],
    [['합계', { content: '총 회기수/놀이시간 작성', colSpan: 5 }]],
    MCOL);

  drawFooter(doc, `협력기관 담당자 확인:                     (명)`, doc.lastAutoTable.finalY + 5);
}

// ── 폼 디스패처 ───────────────────────────────────────────────────────────────

function renderForm(doc, journal) {
  switch (journal.type) {
    case JOURNAL_TYPES.ACTIVITY_LOG:         return renderActivityLog(doc, journal);
    case JOURNAL_TYPES.INTERVIEW_LOG:        return renderInterviewLog(doc, journal);
    case JOURNAL_TYPES.INITIAL_CONSULTATION: return renderInitialConsultation(doc, journal);
    case JOURNAL_TYPES.PLAY_PLAN_GROUP:      return renderGroupPlayPlan(doc, journal);
    case JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL: return renderIndividualPlayPlan(doc, journal);
    default:                                 return renderActivityLog(doc, journal);
  }
}

// ── 공개 내보내기 함수 ────────────────────────────────────────────────────────

export async function exportSingleJournalPDF(journal) {
  const doc = await createPdf();
  renderForm(doc, journal);
  const safe = (s) => s.replace(/[/\\?%*:|"<>]/g, '_');
  const name = safe(
    `${journalTypeLabel(journal.type)}_${v(journal.childName) || '아동'}_${v(journal.date) || format(new Date(), 'yyyy-MM-dd')}.pdf`,
  );
  doc.save(name);
}

export async function exportJournalFormPDF(journals) {
  if (!journals || journals.length === 0) throw new Error('선택된 양식이 없습니다.');
  const doc = await createPdf();
  journals.forEach((journal, i) => {
    if (i > 0) doc.addPage();
    renderForm(doc, journal);
  });
  doc.save('양식기록_출력.pdf');
}

// ── XLSX / DOCX ───────────────────────────────────────────────────────────────

function buildJournalBody(journal) {
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL) {
    return [
      journal.currentLevel ? `현행 수준: ${journal.currentLevel}` : '',
      journal.playGoal ? `놀이 목표: ${journal.playGoal}` : '',
    ].filter(Boolean).join('\n');
  }
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_GROUP) {
    return [
      journal.matchingGoal ? `매칭 목표: ${journal.matchingGoal}` : '',
      journal.groupPlan ? `놀이 계획: ${journal.groupPlan}` : '',
    ].filter(Boolean).join('\n');
  }
  if (journal.type === JOURNAL_TYPES.INTERVIEW_LOG) {
    return [
      journal.consultationContent ? `상담 내용: ${journal.consultationContent}` : '',
      journal.futurePlan ? `향후 계획: ${journal.futurePlan}` : '',
    ].filter(Boolean).join('\n');
  }
  if (journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return [
      journal.healthNotes ? `건강 특이사항: ${journal.healthNotes}` : '',
      journal.serviceGoals ? `서비스 기대: ${journal.serviceGoals}` : '',
    ].filter(Boolean).join('\n');
  }
  return [
    journal.activitySubject ? `활동 주제: ${journal.activitySubject}` : '',
    journal.detailedActivities ? `세부 활동: ${journal.detailedActivities}` : '',
  ].filter(Boolean).join('\n');
}

function journalRows(journals) {
  return journals.map((j) => ({
    날짜: j.date || j.writerDate || '',
    시간: j.time || '',
    아동명: j.childName || '',
    양식종류: journalTypeLabel(j.type),
    저장상태: j.status === 'finalized' ? '확정본' : '임시저장',
    제목: j.title || '',
    요약: j.summary || '',
    본문: buildJournalBody(j),
    사진수: j.photos?.length || 0,
  }));
}

function budgetRows(items) {
  return items.map((item) => ({
    날짜: item.date || '',
    카테고리: item.category || '',
    항목명: item.name || '',
    금액: Number(item.amount) || 0,
    비고: item.note || '',
  }));
}

export async function exportJournalXLSX(journals) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(journalRows(journals));
  sheet['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 12 },
    { wch: 28 }, { wch: 28 }, { wch: 60 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, '양식기록');
  XLSX.writeFile(workbook, '공식양식기록.xlsx');
}

export async function exportJournalDOCX(journals) {
  const children = [
    new Paragraph({ text: '공식 양식 기록 출력', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
  ];
  journals.forEach((journal) => {
    children.push(
      new Paragraph({ text: `${journalTypeLabel(journal.type)} · ${journal.title || '제목 없음'}`, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: `아동: ${journal.childName || '-'} / 날짜: ${journal.date || journal.writerDate || '-'}` }),
      new Paragraph({ text: buildJournalBody(journal) || '내용 없음', spacing: { after: 200 } }),
    );
  });
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, '공식양식기록.docx');
}

export async function exportBudgetPDF(items, meta) {
  const doc = await createPdf();
  const fn = f();
  const totalBudget = Number(meta.totalBudget) || 0;
  const totalSpent = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  doc.setFont(fn, 'normal');
  doc.setFontSize(16);
  doc.text(meta.title || '예산', 14, 18);
  doc.setFontSize(9);
  doc.text(`${meta.year}년 ${meta.month}월`, 14, 25);
  doc.text(`총예산 ${totalBudget.toLocaleString()}원 / 지출 ${totalSpent.toLocaleString()}원`, 14, 31);

  autoTable(doc, {
    startY: 37,
    head: [['날짜', '카테고리', '항목명', '금액', '비고']],
    body: items.map((item) => [
      item.date || '',
      item.category || '',
      item.name || '',
      `${(Number(item.amount) || 0).toLocaleString()}원`,
      item.note || '',
    ]),
    foot: [['', '', '합계', `${totalSpent.toLocaleString()}원`, '']],
    styles: { font: fn, fontSize: 9 },
    headStyles: { fillColor: [82, 141, 90], font: fn },
    footStyles: { font: fn, fillColor: [240, 249, 244], textColor: [0, 0, 0] },
  });
  doc.save('예산.pdf');
}

export async function exportBudgetXLSX(items, meta) {
  const workbook = XLSX.utils.book_new();
  const rows = budgetRows(items);
  rows.unshift({ 날짜: '', 카테고리: '', 항목명: `${meta.year}년 ${meta.month}월 ${meta.title || '예산'}`, 금액: Number(meta.totalBudget) || 0, 비고: '총 예산' });
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, '예산');
  XLSX.writeFile(workbook, '예산.xlsx');
}

export async function exportBudgetDOCX(items, meta) {
  const totalSpent = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const rows = [
    new TableRow({
      children: ['날짜', '카테고리', '항목명', '금액', '비고'].map((text) =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] }),
      ),
    }),
    ...items.map((item) =>
      new TableRow({
        children: [item.date || '', item.category || '', item.name || '', `${(Number(item.amount) || 0).toLocaleString()}원`, item.note || ''].map(
          (text) => new TableCell({ children: [new Paragraph(String(text))] }),
        ),
      }),
    ),
  ];
  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: meta.title || '예산', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: `${meta.year}년 ${meta.month}월 / 총지출 ${totalSpent.toLocaleString()}원`, spacing: { after: 200 } }),
        new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      ],
    }],
  });
  const blob = await Packer.toBlob(document);
  saveAs(blob, '예산.docx');
}
