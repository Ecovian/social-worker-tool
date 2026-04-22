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

// ── Font loading ──────────────────────────────────────────────────────────────

let fontBase64 = null;

async function loadKoreanFont() {
  if (fontBase64) return fontBase64;

  // BASE_URL is '/' in dev mode and '/social-worker-tool/' on GitHub Pages
  const base = import.meta.env.BASE_URL;
  const url = `${base}fonts/NanumGothic.ttf`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font fetch failed: ${response.status}`);

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  fontBase64 = btoa(binary);
  return fontBase64;
}

async function createPdf(orientation = 'p') {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  try {
    const font = await loadKoreanFont();
    doc.addFileToVFS('NanumGothic.ttf', font);
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
    doc.setFont('NanumGothic', 'normal');
  } catch {
    // fall back to built-in font; Korean may not render
  }
  return doc;
}

// ── Shared cell / table helpers ───────────────────────────────────────────────

const BASE_STYLES = {
  font: 'NanumGothic',
  fontSize: 9,
  cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
  lineColor: [80, 80, 80],
  lineWidth: 0.3,
  overflow: 'linebreak',
  minCellHeight: 7,
};

// Label cell (gray background)
function lbl(text, extra = {}) {
  return {
    content: text,
    styles: { fillColor: [215, 215, 215], halign: 'center', valign: 'middle', fontSize: 8, ...extra },
  };
}

// Content cell (white background)
function ctn(text, extra = {}) {
  return {
    content: String(text ?? ''),
    styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9, ...extra },
  };
}

// Table header cell (dark background)
function hdr(text, extra = {}) {
  return {
    content: text,
    styles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], halign: 'center', valign: 'middle', fontSize: 8, ...extra },
  };
}

function tbl(doc, startY, body, head, foot, columnStyles) {
  autoTable(doc, {
    startY,
    head,
    body,
    foot,
    styles: BASE_STYLES,
    headStyles: { font: 'NanumGothic', fillColor: [60, 60, 60], textColor: [255, 255, 255], halign: 'center' },
    footStyles: { font: 'NanumGothic', fillColor: [215, 215, 215] },
    theme: 'grid',
    margin: { left: 10, right: 10 },
    columnStyles: columnStyles || {},
  });
  return doc.lastAutoTable.finalY;
}

function drawTitle(doc, line1, line2) {
  let y = 13;
  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(13);
  doc.text(line1, 105, y, { align: 'center' });
  if (line2) {
    y += 6;
    doc.setFontSize(10);
    doc.text(line2, 105, y, { align: 'center' });
  }
  return y + 5;
}

function confirmLine(doc, text, y) {
  if (y > 282) { doc.addPage(); y = 15; }
  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(9);
  doc.text(text, 10, y);
}

// ── 활동일지 ──────────────────────────────────────────────────────────────────

function renderActivityLog(doc, j) {
  let y = drawTitle(doc, '[서식9] 놀세이버 활동일지', '놀세이버 활동일지(개별활동 / 소그룹활동)');

  // A4 content width 190mm split into 6 cols: 30+30+28+30+24+48
  const COL6 = { 0: { cellWidth: 30 }, 1: { cellWidth: 30 }, 2: { cellWidth: 28 }, 3: { cellWidth: 30 }, 4: { cellWidth: 24 }, 5: { cellWidth: 48 } };

  y = tbl(doc, y, [
    [lbl('회차 / 누적 시간'), ctn(`${j.sessionNumber || '  '}회 / ${j.cumulativeHours || '  '}시간`), lbl('놀세이버명'), ctn(j.saverName), lbl('활동 일시'), ctn(`${j.date || ''}  ${j.time || ''}`)],
    [lbl('아동명\n(소그룹 구성원)'), ctn(j.childName), lbl('아동연령'), ctn(j.childAge), lbl('소그룹 구성원'), ctn(j.childParticipants)],
    [lbl('활동계획안 NO.'), ctn(j.activityPlanNo), lbl('활동구분'), ctn(j.activityKind), lbl('활동장소'), ctn(j.activityPlace)],
    [lbl('만족도'), ctn(j.satisfaction), { content: '', colSpan: 4, styles: { fillColor: [255, 255, 255] } }],
    [lbl('활동 주제'), { content: j.activitySubject || '', colSpan: 5, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9 } }],
    [lbl('놀잇감/사용 교구'), { content: j.playMaterials || '', colSpan: 5, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9 } }],
  ], null, null, COL6);

  const detail = [
    j.detailedActivities ? `▶ 놀이과정 · 관찰내용\n${j.detailedActivities}` : '',
    j.playProcess ? `▶ 세부 놀이과정\n${j.playProcess}` : '',
    j.conversationNotes ? `▶ 놀세이버와 또래아동이 나눈 내용\n${j.conversationNotes}` : '',
  ].filter(Boolean).join('\n\n');

  y = tbl(doc, y, [
    [lbl('세부\n활동\n내용'), lbl('놀이과정\n*관찰내용\n*또래아동과 나눈 내용 등', { halign: 'left', fontSize: 8 }), ctn(detail, { minCellHeight: 70 })],
  ], null, null, { 0: { cellWidth: 18 }, 1: { cellWidth: 50 }, 2: { cellWidth: 122 } });

  if (y > 220) { doc.addPage(); y = 15; }

  y = tbl(doc, y, [
    [lbl('놀세이버 의견\n(아동의 변화,\n보호자 면담 내용 등)'), ctn(`※ 활동 평가 및 의견. 부모와 상담 또는 부모 의견 등 작성\n\n${j.saverOpinion || j.activityEvaluation || ''}`, { minCellHeight: 40 })],
    [lbl('활동 사진'), ctn(`※ 1~2 장면 (사진 원본 별도 보관 필요)\n사진: ${j.photos?.length || 0}장 첨부됨`, { minCellHeight: 30 })],
  ], null, null, { 0: { cellWidth: 42 }, 1: { cellWidth: 148 } });

  confirmLine(doc, `협력기관 담당자 확인: ${j.collaboratorConfirmed || '                    '}(명)`, y + 5);
}

// ── 면담일지 ──────────────────────────────────────────────────────────────────

function renderInterviewLog(doc, j) {
  const y0 = drawTitle(doc, '면담/상담 일지');

  const finalY = tbl(doc, y0, [
    [lbl('놀세이버명'), ctn(j.saverName), lbl('상담일자'), ctn(j.consultationDate || j.date)],
    [lbl('아동명'), ctn(j.childName), lbl('면담자\n(보호자명)'), ctn(j.intervieweeName)],
    [lbl('상담 수행\n방법 구분'), ctn(j.consultationMethod), lbl('상담정보\n제공자'), ctn(`${j.infoProvider || ''}${j.infoProviderDetail ? ` (${j.infoProviderDetail})` : ''}`)],
    [
      lbl('상담(면담)\n내용'),
      {
        content: `1) 아동의 놀이활동 내용 및 놀이관련 정보 제공\n2) 아동의 변화 및 아동의 놀이 특성\n3) 아동에 대한 특성, 특이 사항 등 공유\n4) 자문위원의 슈퍼비전과 향후 계획 공유\n5) 아동 및 보호자의 욕구 파악-이후 놀이 활동 계획 등\n\n${j.consultationContent || ''}`,
        colSpan: 3,
        styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9, minCellHeight: 65 },
      },
    ],
    [lbl('향후 개입 계획\n및 보호자\n상담 결과'), { content: j.futurePlan || '', colSpan: 3, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9, minCellHeight: 35 } }],
  ], null, null, { 0: { cellWidth: 38 }, 1: { cellWidth: 55 }, 2: { cellWidth: 38 }, 3: { cellWidth: 59 } });

  confirmLine(doc, `협력기관 담당자 확인: ${j.collaboratorConfirmed || '                    '}(명)`, finalY + 5);
}

// ── 초기상담기록지 ─────────────────────────────────────────────────────────────

function renderInitialConsultation(doc, j) {
  let y = drawTitle(doc, '[서식7] 초기상담 기록지', '초기상담 기록지');

  y = tbl(doc, y, [
    [lbl('아동명'), ctn(j.childName), lbl('생년월일\n(연령)'), ctn(j.birthDate), lbl('성별'), ctn(j.gender)],
    [lbl('장애 유형\n장애 정도'), ctn(`${j.disabilityType || ''} / ${j.disabilityLevel || ''}`), lbl('비상연락처'), { content: j.emergencyContact || '', colSpan: 3, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9 } }],
    [lbl('아동 질병/질환\n(건강상 특이사항)'), { content: j.healthNotes || '', colSpan: 5, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9, minCellHeight: 14 } }],
  ], null, null, { 0: { cellWidth: 32 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 4: { cellWidth: 20 }, 5: { cellWidth: 48 } });

  const familyData = (j.familyRows || []).length > 0
    ? j.familyRows.map(r => [r.relation || '', r.name || '', r.age || '', r.disability || '', r.notes || ''])
    : [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']];

  y = tbl(doc, y, familyData,
    [[{ content: '가족관계', colSpan: 5, styles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], halign: 'center', font: 'NanumGothic', fontSize: 9 } }],
     ['관계', '이름', '연령', '장애유무', '특이사항 (질병, 동거 여부 등)']],
    null,
    { 0: { cellWidth: 25 }, 1: { cellWidth: 30 }, 2: { cellWidth: 20 }, 3: { cellWidth: 25 }, 4: { cellWidth: 90 } });

  const SOLO_OPTS = ['1시간 미만', '1시간 이상~2시간 미만', '2시간 이상~3시간 미만', '3시간 이상~4시간 미만', '4시간 이상'];
  const LEVEL_OPTS = ['매우 많다', '조금 많다', '보통이다', '부족하다', '매우 부족하다'];
  const chk = (opts, val) => opts.map(o => `${val === o ? '☑' : '☐'} ${o}`).join('  ');

  const leisureContent = [
    `1) 가정이나 지역사회에서 즐겨하는 활동은?\n${j.leisureActivity || ''}`,
    `\n2) 자주가는 곳(공간)은?\n${j.frequentPlace || ''}`,
    `\n3) 아동이 혼자 노는 시간은 얼마나 되나요?\n${chk(SOLO_OPTS, j.soloPlayTimeRange)}`,
    `\n4) 아동이 갖고 노는 장난감의 종류와 양은?\n  종류(다양성): ${chk(LEVEL_OPTS, j.toyTypeLevel)}\n  양(갯수): ${chk(LEVEL_OPTS, j.toyQuantityLevel)}`,
  ].join('');

  y = tbl(doc, y, [
    [lbl('여가 시간'), ctn(leisureContent, { minCellHeight: 55 })],
  ], null, null, { 0: { cellWidth: 25 }, 1: { cellWidth: 165 } });

  if (y > 200) { doc.addPage(); y = 15; }

  y = tbl(doc, y, [
    [lbl('또래관계'), ctn(`1) 친구와 주로 하는 활동은?\n${j.peerActivities || ''}\n\n2) 또래 관계에 대해 놀이교사가 알고 있어야 할 부분은?\n${j.peerNotes || ''}`, { minCellHeight: 25 })],
    [lbl('진로'), ctn(`1) 아동의 꿈은?\n${j.dream || ''}\n\n2) 아동의 특기는?\n${j.strengths || ''}`, { minCellHeight: 20 })],
    [lbl('욕구'), ctn(`1) 아동이 가장 즐겨 하는 것은 무엇입니까?\n${j.favoriteThings || ''}\n\n2) 보호자와 아동은 이 서비스를 통해 어떠한 것을 얻고 싶으십니까?\n${j.serviceGoals || ''}`, { minCellHeight: 25 })],
    [lbl('아동에 대해\n주의 해야\n하는 점'), ctn(`1) 아동의 문제행동이나 자극이 되는 부분 등\n${j.cautionBehavior || ''}\n\n2) 아동의 질병과 알레르기 등\n${j.cautionHealth || ''}\n\n3) 아동의 돌발행동 상황에서 놀이교사가 대처할 수 있는 Tip\n${j.cautionTips || ''}`, { minCellHeight: 30 })],
    [lbl('외부 놀이에\n대한 욕구'), ctn(`1) 외부(가정 밖) 놀이를 희망하시나요?\n${j.outdoorPlayWish || ''}\n\n2) 외부 놀이 시, 놀이교사가 주의 해야 할 점은?\n${j.outdoorPlayNotes || ''}`, { minCellHeight: 22 })],
  ], null, null, { 0: { cellWidth: 32 }, 1: { cellWidth: 158 } });

  doc.addPage();
  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(10);
  doc.text('아동 사진 (각 구분별로 최소 2장 이상 첨부)', 10, 15);

  tbl(doc, 20, [
    [lbl('아동 사진\n(전신 포함)', { minCellHeight: 55 })],
    [lbl('가정 내\n아동 놀이공간', { minCellHeight: 55 })],
    [lbl('아동 놀잇감', { minCellHeight: 55 })],
    [lbl('아동의\n놀이 상황', { minCellHeight: 55 })],
  ], null, null, { 0: { cellWidth: 190 } });
}

// ── 놀이계획서(소그룹) ────────────────────────────────────────────────────────

function renderGroupPlayPlan(doc, j) {
  let y = drawTitle(doc, '[서식8] 놀이계획서', '놀이계획서-소그룹');

  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(9);
  doc.text(`작성일: ${j.writerDate || j.date || ''}   작성자: ${j.writerName || j.saverName || ''}`, 10, y);
  y += 5;

  y = tbl(doc, y, [
    [lbl('활동일시'), ctn(`${j.date || ''}  ${j.time ? `(${j.time})` : ''}`), lbl('장소'), { content: j.location || j.activityPlace || '', colSpan: 3, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9 } }],
    [lbl('참여 놀세이버 이름'), { content: j.participantSaverNames || j.saverName || '', colSpan: 5, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9 } }],
    [lbl('참여\n아동이름(연령)'), { content: j.participantChildrenSummary || '', colSpan: 5, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9 } }],
  ], null, null, { 0: { cellWidth: 38 }, 1: { cellWidth: 32 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 4: { cellWidth: 30 }, 5: { cellWidth: 30 } });

  const peerRows = (j.peerLevelRows || []).length > 0
    ? j.peerLevelRows.map(r => [r.childName || '', `${r.playLevel || ''}\n${r.notes || ''}`])
    : [['', ''], ['', ''], ['', '']];

  y = tbl(doc, y, peerRows,
    [[{ content: '아동별 또래와의 놀이활동 수준', colSpan: 2, styles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], halign: 'center', font: 'NanumGothic', fontSize: 9 } }],
     ['아동명', '또래와의 놀이활동 수준 및 특성']],
    null,
    { 0: { cellWidth: 50 }, 1: { cellWidth: 140 } });

  y = tbl(doc, y, [
    [lbl('소그룹 매칭\n특성 및\n활동 목표'), ctn(`※ 소그룹 놀이 관련 목표 계획에 따른 활동 작성, 상세하게 작성\n\n${j.matchingGoal || ''}`, { minCellHeight: 30 })],
    [lbl('놀이 활동 계획\n활동 계획'), ctn(j.groupPlan || '', { minCellHeight: 30 })],
    [lbl('구매 필요한 물품\n(협력기관에\n협조 요청 사항)'), ctn(j.neededMaterials || '', { minCellHeight: 20 })],
    [lbl('비고'), ctn(j.note || '', { minCellHeight: 12 })],
  ], null, null, { 0: { cellWidth: 42 }, 1: { cellWidth: 148 } });

  confirmLine(doc, `협력기관 담당자 확인: ${j.collaboratorConfirmed || '                    '}(명)`, y + 5);
}

// ── 놀이계획서(개별) ──────────────────────────────────────────────────────────

function renderIndividualPlayPlanPage(doc, j, isFirst) {
  const period = isFirst ? '상반기' : '하반기';
  const months = isFirst
    ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월']
    : ['9월', '10월', '11월', '12월'];

  let y = drawTitle(doc, '[서식8] 놀이계획서', `놀이계획서-${period}`);

  y = tbl(doc, y, [
    [lbl('놀세이버명'), { content: j.saverName || j.writerName || '', colSpan: 2, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'middle', fontSize: 9 } }, lbl('(인)'), lbl('계획 일시'), { content: j.date || j.writerDate || '', colSpan: 2, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'middle', fontSize: 9 } }],
    [lbl('아동명'), { content: j.childName || '', colSpan: 2, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'middle', fontSize: 9 } }, lbl(''), lbl('아동연령'), { content: `${j.childAge || ''}세 (${j.childGrade || ''})`, colSpan: 2, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'middle', fontSize: 9 } }],
    [lbl('활동 기간'), { content: `${j.activityStartDate || ''} ~ ${j.activityEndDate || ''}`, colSpan: 2, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'middle', fontSize: 9 } }, lbl(''), lbl('활동 시간'), { content: j.activityTimeText || '', colSpan: 2, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'middle', fontSize: 9 } }],
    [lbl('현행 수준'), { content: j.currentLevel || '', colSpan: 6, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9, minCellHeight: 20 } }],
    [lbl('놀이 목표'), { content: `※ 아동별 학습/놀이관련 목표 계획에 따른 활동 작성, 상세하게 작성\n${j.playGoal || ''}`, colSpan: 6, styles: { fillColor: [255, 255, 255], halign: 'left', valign: 'top', fontSize: 9, minCellHeight: 22 } }],
  ], null, null, { 0: { cellWidth: 28 }, 1: { cellWidth: 26 }, 2: { cellWidth: 14 }, 3: { cellWidth: 12 }, 4: { cellWidth: 28 }, 5: { cellWidth: 30 }, 6: { cellWidth: 52 } });

  const planMap = {};
  (j.planRows || []).forEach(r => {
    if (!planMap[r.month]) planMap[r.month] = [];
    planMap[r.month].push(r);
  });

  const monthRows = [];
  months.forEach(month => {
    const rows = planMap[month]?.length > 0 ? planMap[month] : [{}];
    rows.forEach((r, i) => {
      monthRows.push([i === 0 ? month : '', r.sessionCount || '', r.playArea || '', r.activityContent || '', r.planNo || '', r.placeMaterials || '']);
    });
  });

  y = tbl(doc, y, monthRows,
    [[{ content: '월별 놀이 활동 계획', colSpan: 6, styles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], halign: 'center', font: 'NanumGothic', fontSize: 9 } }],
     ['월', '회기수', '놀이\n영역', '활동 내용', '활동계획안\nNO.', '활동 장소 및\n구매 필요한 물품']],
    [['합계', { content: '총 회기수/놀이시간 작성', colSpan: 5 }]],
    { 0: { cellWidth: 14 }, 1: { cellWidth: 16 }, 2: { cellWidth: 28 }, 3: { cellWidth: 60 }, 4: { cellWidth: 24 }, 5: { cellWidth: 48 } });

  confirmLine(doc, `협력기관 담당자 확인: ${j.collaboratorConfirmed || '                    '}(명)`, y + 5);
}

function renderIndividualPlayPlan(doc, j) {
  const isFirst = j.planPeriod !== '하반기';
  renderIndividualPlayPlanPage(doc, j, isFirst);
  // Render the other half on the next page if it makes sense
  if (isFirst) {
    doc.addPage();
    renderIndividualPlayPlanPage(doc, j, false);
  } else {
    doc.addPage();
    renderIndividualPlayPlanPage(doc, j, true);
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function renderFormToDoc(doc, journal) {
  switch (journal.type) {
    case JOURNAL_TYPES.ACTIVITY_LOG: return renderActivityLog(doc, journal);
    case JOURNAL_TYPES.INTERVIEW_LOG: return renderInterviewLog(doc, journal);
    case JOURNAL_TYPES.INITIAL_CONSULTATION: return renderInitialConsultation(doc, journal);
    case JOURNAL_TYPES.PLAY_PLAN_GROUP: return renderGroupPlayPlan(doc, journal);
    case JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL: return renderIndividualPlayPlan(doc, journal);
    default: return renderActivityLog(doc, journal);
  }
}

// ── Public: form-formatted PDF (양식 그대로) ──────────────────────────────────

export async function exportSingleJournalPDF(journal) {
  const doc = await createPdf('p');
  renderFormToDoc(doc, journal);
  const name = `${journalTypeLabel(journal.type)}_${journal.childName || '아동'}_${journal.date || format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(name);
}

export async function exportJournalFormPDF(journals) {
  const doc = await createPdf('p');
  journals.forEach((journal, i) => {
    if (i > 0) doc.addPage();
    renderFormToDoc(doc, journal);
  });
  doc.save('양식기록_출력.pdf');
}

// ── Public: legacy summary PDF ────────────────────────────────────────────────

function buildJournalBody(journal) {
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL) {
    return [
      journal.currentLevel ? `현행 수준: ${journal.currentLevel}` : '',
      journal.playGoal ? `놀이 목표: ${journal.playGoal}` : '',
      journal.planRows?.length ? `계획 행 수: ${journal.planRows.length}개` : '',
      journal.summary ? `메모: ${journal.summary}` : '',
    ].filter(Boolean).join('\n');
  }
  if (journal.type === JOURNAL_TYPES.PLAY_PLAN_GROUP) {
    return [
      journal.participantChildrenSummary ? `참여 아동: ${journal.participantChildrenSummary}` : '',
      journal.matchingGoal ? `매칭 특성 및 목표: ${journal.matchingGoal}` : '',
      journal.groupPlan ? `놀이 활동 계획: ${journal.groupPlan}` : '',
      journal.neededMaterials ? `준비물: ${journal.neededMaterials}` : '',
    ].filter(Boolean).join('\n');
  }
  if (journal.type === JOURNAL_TYPES.INTERVIEW_LOG) {
    return [
      journal.intervieweeName ? `면담자: ${journal.intervieweeName}` : '',
      journal.consultationMethod ? `면담 방식: ${journal.consultationMethod}` : '',
      journal.consultationContent ? `상담 내용: ${journal.consultationContent}` : '',
      journal.futurePlan ? `향후 계획: ${journal.futurePlan}` : '',
    ].filter(Boolean).join('\n');
  }
  if (journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    return [
      journal.healthNotes ? `건강상 특이사항: ${journal.healthNotes}` : '',
      journal.favoriteThings ? `즐겨 하는 것: ${journal.favoriteThings}` : '',
      journal.serviceGoals ? `서비스 기대: ${journal.serviceGoals}` : '',
      journal.cautionBehavior ? `주의 사항: ${journal.cautionBehavior}` : '',
    ].filter(Boolean).join('\n');
  }
  return [
    journal.activitySubject ? `활동 주제: ${journal.activitySubject}` : '',
    journal.detailedActivities ? `세부 활동내용: ${journal.detailedActivities}` : '',
    journal.content ? `관찰내용: ${journal.content}` : '',
    journal.activityEvaluation ? `활동 평가: ${journal.activityEvaluation}` : '',
  ].filter(Boolean).join('\n');
}

function journalRows(journals) {
  return journals.map((journal) => ({
    날짜: journal.date || journal.writerDate || '',
    시간: journal.time || '',
    아동명: journal.childName || '',
    양식종류: journalTypeLabel(journal.type),
    저장상태: journal.status === 'finalized' ? '확정본' : '임시저장',
    제목: journal.title || '',
    요약: journal.summary || '',
    본문: buildJournalBody(journal),
    사진수: journal.photos?.length || 0,
  }));
}

async function resolvePhotoCount(journal) {
  const photos = await Promise.all((journal.photos || []).map((photo) => getPhotoDataUrl(photo)));
  return photos.filter(Boolean).length;
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

export async function exportJournalPDF(journals) {
  const doc = await createPdf('p');

  doc.setFontSize(18);
  doc.text('공식 양식 기록 출력', 14, 18);
  doc.setFontSize(10);
  doc.text(`생성일시 ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 25);

  autoTable(doc, {
    startY: 32,
    head: [['날짜', '아동명', '양식종류', '제목', '상태']],
    body: journals.map((journal) => [
      journal.date || journal.writerDate || '',
      journal.childName || '',
      journalTypeLabel(journal.type),
      journal.title || '',
      journal.status === 'finalized' ? '확정본' : '임시저장',
    ]),
    styles: { font: 'NanumGothic', fontSize: 9 },
    headStyles: { fillColor: [2, 100, 202], font: 'NanumGothic' },
  });

  let y = doc.lastAutoTable.finalY + 8;

  for (const journal of journals) {
    const photoCount = await resolvePhotoCount(journal);
    if (y > 245) {
      doc.addPage();
      y = 18;
    }

    doc.setFontSize(12);
    doc.text(`${journalTypeLabel(journal.type)} · ${journal.title || '제목 없음'}`, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(`아동 ${journal.childName || '-'} / 날짜 ${journal.date || journal.writerDate || '-'} ${journal.time || ''}`, 14, y);
    y += 5;
    doc.text(`상태 ${journal.status === 'finalized' ? '확정본' : '임시저장'} / 사진 ${photoCount}장`, 14, y);
    y += 5;
    const bodyLines = doc.splitTextToSize(buildJournalBody(journal) || journal.summary || '내용 없음', 180);
    doc.text(bodyLines, 14, y);
    y += bodyLines.length * 4.2 + 5;
  }

  doc.save('공식양식기록.pdf');
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
    new Paragraph({
      text: '공식 양식 기록 출력',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  ];

  journals.forEach((journal) => {
    children.push(
      new Paragraph({ text: `${journalTypeLabel(journal.type)} · ${journal.title || '제목 없음'}`, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: `아동 ${journal.childName || '-'} / 날짜 ${journal.date || journal.writerDate || '-'} ${journal.time || ''} / 상태 ${journal.status === 'finalized' ? '확정본' : '임시저장'}` }),
      new Paragraph({ text: buildJournalBody(journal) || journal.summary || '내용 없음', spacing: { after: 180 } }),
    );
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, '공식양식기록.docx');
}

export async function exportBudgetPDF(items, meta) {
  const doc = await createPdf('p');
  const totalBudget = Number(meta.totalBudget) || 0;
  const totalSpent = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  doc.setFontSize(18);
  doc.text(meta.title || '예산', 14, 18);
  doc.setFontSize(10);
  doc.text(`${meta.year}년 ${meta.month}월`, 14, 25);
  doc.text(`총예산 ${totalBudget.toLocaleString()}원 / 지출 ${totalSpent.toLocaleString()}원`, 14, 31);

  autoTable(doc, {
    startY: 38,
    head: [['날짜', '카테고리', '항목명', '금액', '비고']],
    body: items.map((item) => [
      item.date || '',
      item.category || '',
      item.name || '',
      `${(Number(item.amount) || 0).toLocaleString()}원`,
      item.note || '',
    ]),
    foot: [['', '', '합계', `${totalSpent.toLocaleString()}원`, '']],
    styles: { font: 'NanumGothic', fontSize: 9 },
    headStyles: { fillColor: [82, 141, 90], font: 'NanumGothic' },
    footStyles: { font: 'NanumGothic', fillColor: [240, 249, 244], textColor: [0, 0, 0] },
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
  const totalSpent = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const rows = [
    new TableRow({
      children: ['날짜', '카테고리', '항목명', '금액', '비고'].map((text) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
      })),
    }),
    ...items.map((item) => new TableRow({
      children: [
        item.date || '', item.category || '', item.name || '',
        `${(Number(item.amount) || 0).toLocaleString()}원`, item.note || '',
      ].map((text) => new TableCell({ children: [new Paragraph(String(text))] })),
    })),
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
