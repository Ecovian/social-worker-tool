import jsPDF from 'jspdf';
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
import { JOURNAL_TYPES, journalTypeLabel } from './storage';

// ── HTML → PDF 변환 (html2canvas 사용 → 한글 완벽 지원) ──────────────────────

function esc(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function chk(opts, sel) {
  return opts.map((o) => `${sel === o ? '■' : '□'}&nbsp;${esc(o)}`).join('&emsp;');
}

// 인라인 스타일 상수
const LS = 'background:#d8d8d8;border:1px solid #666;padding:6px 5px;text-align:center;vertical-align:middle;font-weight:600;white-space:pre-line;line-height:1.5;font-size:10px;';
const CS = 'background:#fff;border:1px solid #666;padding:6px;text-align:left;vertical-align:top;font-size:10.5px;line-height:1.6;';
const HS = 'background:#2a2a2a;color:#fff;border:1px solid #666;padding:6px;text-align:center;font-weight:600;font-size:10px;';

// 페이지 래퍼 (760px = A4 콘텐츠 영역)
function PAGE(body) {
  return `<div style="font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',sans-serif;font-size:10.5px;color:#000;background:#fff;padding:22px 24px;width:760px;box-sizing:border-box;">${body}</div>`;
}

function TITLE(t1, t2 = '') {
  return `<div style="text-align:center;margin-bottom:8px;"><div style="font-size:15px;font-weight:700;">${t1}</div>${t2 ? `<div style="font-size:11px;color:#333;margin-top:2px;">${t2}</div>` : ''}</div>`;
}

function TABLE(rows, mb = '6px') {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:${mb};">${rows}</table>`;
}

function L(text, w = '') { return `<td style="${LS}${w ? `width:${w};` : ''}">${text}</td>`; }
function C(text, cs = 1, minH = '') { return `<td colspan="${cs}" style="${CS}${minH ? `min-height:${minH};` : ''}">${esc(text)}</td>`; }
function CH(html, cs = 1, minH = '') { return `<td colspan="${cs}" style="${CS}${minH ? `min-height:${minH};` : ''}">${html}</td>`; }
function H(text, cs = 1) { return `<td colspan="${cs}" style="${HS}">${text}</td>`; }
function R(...cells) { return `<tr>${cells.join('')}</tr>`; }

// ── 1. 활동일지 ───────────────────────────────────────────────────────────────
function htmlActivityLog(j) {
  const kindHtml = chk(['개별활동', '소그룹활동'], j.activityKind);
  const detailText = [
    j.detailedActivities,
    j.playProcess ? `\n[놀이과정]\n${j.playProcess}` : '',
    j.content ? `\n[관찰내용]\n${j.content}` : '',
    j.conversationNotes ? `\n[이야기 나눈 내용]\n${j.conversationNotes}` : '',
  ].filter(Boolean).join('');

  return PAGE(`
    ${TITLE('[서식9] 놀세이버 활동일지', '놀세이버 활동일지(개별활동 / 소그룹활동)')}
    <div style="font-size:10px;margin-bottom:5px;">회차 / 누적 시간 &nbsp;&nbsp;&nbsp;&nbsp; <b>${esc(j.sessionNumber)}</b> 회 / <b>${esc(j.cumulativeHours)}</b> 시간</div>
    ${TABLE(`
      ${R(L('놀세이버명<br>(소그룹 구성원)', '15%'), C(j.saverName, 2, ''), L('활동 일시', '13%'), C(`${j.date || ''} ${j.time || ''}`))}
      ${R(L('아동명<br>(소그룹 구성원)'), C(j.childName, 2), L('아동연령'), C(j.childAge))}
      ${R(L('활동계획안 NO.'), C(j.activityPlanNo, 2), L('활동구분'), CH(kindHtml))}
      ${R(L('활동장소'), C(j.activityPlace, 2), L('만족도'), C(j.satisfaction))}
      ${R(L('활동 주제'), C(j.activitySubject, 4))}
      ${R(L('놀잇감/사용 교구'), C(j.playMaterials, 4))}
      <tr>
        ${L('세부<br>활동<br>내용')}
        <td style="${LS}width:13%;font-size:9px;text-align:left;">놀이과정<br>*관찰내용<br>*놀세이버와<br>또래아동이<br>나눈 내용 등</td>
        <td colspan="3" style="${CS}min-height:120px;">${esc(detailText)}</td>
      </tr>
    `)}
    ${TABLE(`
      ${R(L('놀세이버 의견<br>(아동의 변화,<br>보호자 면담<br>내용 등)', '20%'), C(`${j.saverOpinion || j.activityEvaluation || ''}`, 1, '80px'))}
      ${R(L('활동 사진'), `<td style="${CS}min-height:60px;color:#999;font-size:9px;">※ 1~2 장면 (사진 원본 별도 보관 필요) — 첨부 사진: ${j.photos?.length || 0}장</td>`)}
    `)}
    <div style="margin-top:6px;font-size:10px;">협력기관 담당자 확인:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(명)</div>
  `);
}

// ── 2. 면담일지 ───────────────────────────────────────────────────────────────
function htmlInterviewLog(j) {
  const methods = ['전화', '내소(센터)', '가정방문', '기타'];
  const providers = ['가족', '기관종사자', '기타'];
  const methodHtml = chk(methods, j.consultationMethod);
  const provHtml = chk(providers, j.infoProvider);

  const contentLines = [
    '1) 아동의 놀이활동 내용 및 놀이관련 정보 제공',
    '2) 아동의 변화 및 아동의 놀이 특성',
    '3) 아동에 대한 특성, 특이 사항 등 공유',
    '4) 자문위원의 슈퍼비젼과 향후 계획 공유',
    '5) 아동 및 보호자의 욕구 파악 - 이후 놀이 활동 계획 등',
    '',
    j.consultationContent || '',
  ].join('\n');

  return PAGE(`
    ${TITLE('면담/상담 일지')}
    ${TABLE(`
      ${R(L('놀세이버명', '18%'), C(j.saverName, 1, ''), L('상담일자', '15%'), C(j.consultationDate || j.date))}
      ${R(L('아동명'), C(j.childName), L('면담자<br>(보호자명)'), C(j.intervieweeName))}
      ${R(L('상담 수행<br>방법 구분'), CH(methodHtml, 1, ''), L('상담정보<br>제공자'), CH(provHtml))}
      ${R(L('상담(면담)<br>내용'), C(contentLines, 3, '110px'))}
      ${R(L('향후 개입 계획<br>및 보호자<br>상담 결과'), C(j.futurePlan, 3, '60px'))}
    `)}
    <div style="margin-top:6px;font-size:10px;">협력기관 담당자 확인:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(명)</div>
  `);
}

// ── 3. 초기상담기록지 ─────────────────────────────────────────────────────────
function htmlInitialConsultation(j) {
  const soloOpts = ['1시간 미만', '1시간 이상~2시간 미만', '2시간 이상~3시간 미만', '3시간 이상~4시간 미만', '4시간 이상'];
  const lvOpts = ['매우 많다', '조금 많다', '보통이다', '부족하다', '매우 부족하다'];

  const soloHtml = chk(soloOpts, j.soloPlayTimeRange);
  const toyTypeHtml = chk(lvOpts, j.toyTypeLevel);
  const toyQtyHtml = chk(lvOpts, j.toyQuantityLevel);

  const leisureText = [
    `1) 가정이나 지역사회에서 즐겨하는 활동은?\n${j.leisureActivity || ''}`,
    `\n2) 자주가는 곳(공간)은?\n${j.frequentPlace || ''}`,
  ].join('');
  const leisureHtml2 = `<br>3) 아동이 혼자 노는 시간은? &nbsp;${soloHtml}<br>4) 장난감 종류(다양성): &nbsp;${toyTypeHtml}<br>&nbsp;&nbsp;&nbsp;장난감 양(갯수): &nbsp;${toyQtyHtml}`;

  const famRows = (j.familyRows || []).length > 0
    ? j.familyRows.map((r) => `<tr>${['relation','name','age','disability','notes'].map((k) => `<td style="${CS}padding:4px;">${esc(r[k] || '')}</td>`).join('')}</tr>`).join('')
    : `<tr>${Array(5).fill(`<td style="${CS}height:24px;"></td>`).join('')}</tr>`.repeat(3);

  const page1 = PAGE(`
    ${TITLE('[서식7] 초기상담 기록지', '초기상담 기록지')}
    ${TABLE(`
      ${R(L('아동명', '15%'), C(j.childName, 2, ''), L('생년월일<br>(연령)', '13%'), C(j.birthDate), L('성별', '8%'), C(j.gender))}
      ${R(L('장애 유형<br>장애 정도'), C(`${j.disabilityType || ''}`, 1), C(`${j.disabilityLevel || ''}`, 1), L('비상연락처'), C(j.emergencyContact, 3))}
      ${R(L('아동 질병/질환<br>(건강상 특이사항)'), C(j.healthNotes, 5, '40px'))}
    `)}
    ${TABLE(`
      <tr>${H('가족관계', 5)}</tr>
      <tr>${['관계','이름','연령','장애유무','특이사항 (질병, 동거 여부 등)'].map((h) => `<th style="${LS}">${h}</th>`).join('')}</tr>
      ${famRows}
    `)}
    ${TABLE(`
      <tr>
        ${L('여가 시간', '18%')}
        <td style="${CS}">
          ${esc(leisureText)}
          ${leisureHtml2}
        </td>
      </tr>
    `)}
  `);

  const page2 = PAGE(`
    ${TITLE('[서식7] 초기상담 기록지 (계속)')}
    ${TABLE(`
      ${R(L('또래관계', '18%'), C(`1) 친구와 주로 하는 활동은?\n${j.peerActivities || ''}\n\n2) 또래 관계에 대해 알고 있어야 할 부분은?\n${j.peerNotes || ''}`, 1, '70px'))}
      ${R(L('진로'), C(`1) 아동의 꿈은?\n${j.dream || ''}\n\n2) 아동의 특기는?\n${j.strengths || ''}`, 1, '55px'))}
      ${R(L('욕구'), C(`1) 아동이 가장 즐겨 하는 것은 무엇입니까?\n${j.favoriteThings || ''}\n\n2) 이 서비스를 통해 얻고 싶은 것은?\n${j.serviceGoals || ''}`, 1, '65px'))}
      ${R(L('아동에 대해<br>주의해야<br>하는 점'), C(`1) 문제행동이나 자극이 되는 부분\n${j.cautionBehavior || ''}\n\n2) 질병과 알레르기\n${j.cautionHealth || ''}\n\n3) 돌발행동 대처 Tip\n${j.cautionTips || ''}`, 1, '80px'))}
      ${R(L('외부 놀이에<br>대한 욕구'), C(`1) 외부(가정 밖) 놀이를 희망하시나요?\n${j.outdoorPlayWish || ''}\n\n2) 외부 놀이 시 주의해야 할 점은?\n${j.outdoorPlayNotes || ''}`, 1, '60px'))}
    `)}
  `);

  const page3 = PAGE(`
    ${TITLE('[서식7] 초기상담 기록지 — 아동 사진')}
    <div style="font-size:10px;margin-bottom:6px;">아동 사진 (각 구분별로 최소 2장 이상 첨부)</div>
    ${TABLE(`
      ${R(L('아동 사진<br>(전신 포함)', '22%'), `<td style="${CS}min-height:120px;color:#999;font-size:9px;">사진 첨부 공간</td>`)}
      ${R(L('가정 내<br>아동 놀이공간'), `<td style="${CS}min-height:100px;color:#999;font-size:9px;">사진 첨부 공간</td>`)}
      ${R(L('아동 놀잇감'), `<td style="${CS}min-height:100px;color:#999;font-size:9px;">사진 첨부 공간</td>`)}
      ${R(L('아동의<br>놀이 상황'), `<td style="${CS}min-height:100px;color:#999;font-size:9px;">사진 첨부 공간</td>`)}
    `)}
  `);

  return [page1, page2, page3];
}

// ── 4. 놀이계획서(소그룹) ──────────────────────────────────────────────────────
function htmlGroupPlayPlan(j) {
  const peerRows = (j.peerLevelRows || []).length > 0
    ? j.peerLevelRows.map((r) => `<tr><td style="${CS}padding:4px;">${esc(r.childName)}</td><td style="${CS}padding:4px;">${esc(r.playLevel)}${r.notes ? '<br>' + esc(r.notes) : ''}</td></tr>`).join('')
    : Array(3).fill(`<tr><td style="${CS}height:24px;"></td><td style="${CS}"></td></tr>`).join('');

  return PAGE(`
    ${TITLE('[서식8] 놀이계획서', '놀이계획서 - 소그룹')}
    <div style="font-size:10px;margin-bottom:6px;">작성일: ${esc(j.writerDate || j.date || '')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;작성자: ${esc(j.writerName || j.saverName || '')}</div>
    ${TABLE(`
      ${R(L('활동일시', '18%'), C(j.date, 1, ''), L('월&nbsp;일&nbsp;요일<br>활동 시간:', '20%'), C(j.time), L('장소', '10%'), C(j.location || j.activityPlace))}
      ${R(L('참여 놀세이버<br>이름'), C(j.participantSaverNames || j.saverName, 5))}
      ${R(L('참여<br>아동이름(연령)'), C(j.participantChildrenSummary, 5))}
    `)}
    ${TABLE(`
      <tr>${H('아동별 또래와의 놀이활동 수준', 2)}</tr>
      <tr><th style="${LS}width:30%;">아동명</th><th style="${LS}">또래와의 놀이활동 수준 및 특성</th></tr>
      ${peerRows}
    `)}
    ${TABLE(`
      ${R(L('소그룹 매칭<br>특성 및<br>활동 목표', '22%'), C(`※ 소그룹 놀이 관련 목표 계획에 따른 활동 작성, 상세하게 작성\n\n${j.matchingGoal || ''}`, 1, '80px'))}
      ${R(L('놀이 활동 계획<br>활동 계획'), C(j.groupPlan, 1, '70px'))}
      ${R(L('구매 필요한 물품<br>(협력기관에<br>협조 요청 사항)'), C(j.neededMaterials, 1, '50px'))}
      ${R(L('비고'), C(j.note, 1, '28px'))}
    `)}
    <div style="margin-top:6px;font-size:10px;">협력기관 담당자 확인:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(명)</div>
  `);
}

// ── 5. 놀이계획서(개별) ────────────────────────────────────────────────────────
function htmlIndividualPlayPlan(j) {
  const isFirst = j.planPeriod !== '하반기';
  const periodLabel = isFirst ? '상반기' : '하반기';
  const months = isFirst
    ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월']
    : ['9월', '10월', '11월', '12월'];

  const planMap = {};
  (j.planRows || []).forEach((r) => {
    if (!planMap[r.month]) planMap[r.month] = [];
    planMap[r.month].push(r);
  });

  const planRows = months.flatMap((month) => {
    const rows = planMap[month]?.length > 0 ? planMap[month] : [{}];
    return rows.map((r, idx) => `
      <tr>
        <td style="${CS}text-align:center;padding:4px;">${idx === 0 ? month : ''}</td>
        <td style="${CS}text-align:center;padding:4px;">${esc(r.sessionCount)}</td>
        <td style="${CS}padding:4px;">${esc(r.playArea)}</td>
        <td style="${CS}padding:4px;">${esc(r.activityContent)}</td>
        <td style="${CS}text-align:center;padding:4px;">${esc(r.planNo)}</td>
        <td style="${CS}padding:4px;">${esc(r.placeMaterials)}</td>
      </tr>`);
  }).join('');

  const periodDate = j.activityStartDate && j.activityEndDate
    ? `${j.activityStartDate} ~ ${j.activityEndDate} (${j.weeklyCountText || ''})`
    : '';

  return PAGE(`
    ${TITLE('[서식8] 놀이계획서', `놀이계획서 - 개별 (${periodLabel})`)}
    ${TABLE(`
      ${R(L('놀세이버명', '16%'), C(j.saverName || j.writerName), L('(인)', '8%'), L('계획<br>일시', '12%'), C(j.date || j.writerDate))}
      ${R(L('아동명'), C(j.childName, 2), L('아동연령'), C(`${j.childAge || ''} 세 (${j.childGrade || ''} 학년)`))}
      ${R(L('활동 기간'), C(periodDate, 2), L('활동<br>시간'), C(j.activityTimeText))}
      ${R(L('현행 수준'), C(j.currentLevel, 4, '50px'))}
      ${R(L('놀이 목표'), C(`※ 아동별 학습/놀이관련 목표 계획에 따른 활동 작성\n${j.playGoal || ''}`, 4, '50px'))}
    `)}
    ${TABLE(`
      <tr>${H('월별 놀이 활동 계획', 6)}</tr>
      <tr>
        ${['회차', '회기수', '놀이 영역', '활동 내용', '활동계획안 NO.', '활동 장소 및<br>구매 필요한 물품'].map((h) => `<th style="${LS}">${h}</th>`).join('')}
      </tr>
      ${planRows}
      <tr>
        <td style="${LS}">합계</td>
        <td colspan="5" style="${CS}color:#777;font-size:9px;">총 회기수/놀이시간 작성</td>
      </tr>
    `)}
    <div style="margin-top:6px;font-size:10px;">협력기관 담당자 확인:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(명)</div>
  `);
}

// ── HTML → Canvas → PDF 변환기 ────────────────────────────────────────────────

function buildJournalPages(journal) {
  switch (journal.type) {
    case JOURNAL_TYPES.ACTIVITY_LOG:         return [htmlActivityLog(journal)];
    case JOURNAL_TYPES.INTERVIEW_LOG:        return [htmlInterviewLog(journal)];
    case JOURNAL_TYPES.INITIAL_CONSULTATION: return htmlInitialConsultation(journal);
    case JOURNAL_TYPES.PLAY_PLAN_GROUP:      return [htmlGroupPlayPlan(journal)];
    case JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL: return [htmlIndividualPlayPlan(journal)];
    default:                                 return [htmlActivityLog(journal)];
  }
}

async function renderHTMLToCanvas(html) {
  const { default: html2canvas } = await import('html2canvas');

  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;z-index:-1;';
  el.innerHTML = html;
  document.body.appendChild(el);

  try {
    return await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  } finally {
    document.body.removeChild(el);
  }
}

async function canvasToA4Pages(doc, canvas, isFirst) {
  // A4 비율: 210:297 = canvas 기준으로 한 페이지 높이 계산
  const pageHeightPx = Math.round(canvas.width * (297 / 210));
  const numPages = Math.ceil(canvas.height / pageHeightPx);

  for (let i = 0; i < numPages; i++) {
    if (!isFirst || i > 0) doc.addPage();

    const sliceH = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceH;
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, -i * pageHeightPx);

    const img = slice.toDataURL('image/jpeg', 0.96);
    const sliceHmm = (sliceH / canvas.width) * 210;
    doc.addImage(img, 'JPEG', 0, 0, 210, sliceHmm);
  }
}

// ── 공개 PDF 내보내기 함수 ────────────────────────────────────────────────────

export async function exportSingleJournalPDF(journal) {
  const pages = buildJournalPages(journal);
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let isFirst = true;

  for (const html of pages) {
    const canvas = await renderHTMLToCanvas(html);
    await canvasToA4Pages(doc, canvas, isFirst);
    isFirst = false;
  }

  const safe = (s) => s.replace(/[/\\?%*:|"<>]/g, '_');
  const name = safe(
    `${journalTypeLabel(journal.type)}_${journal.childName || '아동'}_${journal.date || format(new Date(), 'yyyy-MM-dd')}.pdf`,
  );
  doc.save(name);
}

export async function exportJournalFormPDF(journals) {
  if (!journals || journals.length === 0) throw new Error('선택된 양식이 없습니다.');
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let isFirst = true;

  for (const journal of journals) {
    const pages = buildJournalPages(journal);
    for (const html of pages) {
      const canvas = await renderHTMLToCanvas(html);
      await canvasToA4Pages(doc, canvas, isFirst);
      isFirst = false;
    }
  }

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
  const totalBudget = Number(meta.totalBudget) || 0;
  const totalSpent = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const bodyRows = items.map((item) => `
    <tr>
      <td style="${CS}text-align:center;">${esc(item.date)}</td>
      <td style="${CS}">${esc(item.category)}</td>
      <td style="${CS}">${esc(item.name)}</td>
      <td style="${CS}text-align:right;">${(Number(item.amount) || 0).toLocaleString()}원</td>
      <td style="${CS}">${esc(item.note)}</td>
    </tr>`).join('');

  const html = PAGE(`
    <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${esc(meta.title || '예산')}</div>
    <div style="font-size:11px;color:#555;margin-bottom:6px;">${meta.year}년 ${meta.month}월 &nbsp;·&nbsp; 총예산 ${totalBudget.toLocaleString()}원 / 지출 ${totalSpent.toLocaleString()}원</div>
    ${TABLE(`
      <tr>
        ${['날짜','카테고리','항목명','금액','비고'].map((h) => `<th style="${HS}">${h}</th>`).join('')}
      </tr>
      ${bodyRows}
      <tr>
        <td colspan="3" style="${LS}text-align:right;">합계</td>
        <td style="${CS}text-align:right;font-weight:700;">${totalSpent.toLocaleString()}원</td>
        <td style="${CS}"></td>
      </tr>
    `)}
  `);

  const canvas = await renderHTMLToCanvas(html);
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  await canvasToA4Pages(doc, canvas, true);
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
