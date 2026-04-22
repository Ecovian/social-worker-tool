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

let fontBase64 = null;

async function loadKoreanFont() {
  if (fontBase64) return fontBase64;

  const response = await fetch('/fonts/NanumGothic.ttf');
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
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
    doc.setFont('NanumGothic');
  } catch {
    // Fall back to default font if the embedded font fails to load.
  }

  return doc;
}

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
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
    { wch: 28 },
    { wch: 28 },
    { wch: 60 },
    { wch: 10 },
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
      new Paragraph({
        text: `${journalTypeLabel(journal.type)} · ${journal.title || '제목 없음'}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: `아동 ${journal.childName || '-'} / 날짜 ${journal.date || journal.writerDate || '-'} ${journal.time || ''} / 상태 ${journal.status === 'finalized' ? '확정본' : '임시저장'}`,
      }),
      new Paragraph({
        text: buildJournalBody(journal) || journal.summary || '내용 없음',
        spacing: { after: 180 },
      }),
    );
  });

  const doc = new Document({
    sections: [{ children }],
  });

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
  rows.unshift({
    날짜: '',
    카테고리: '',
    항목명: `${meta.year}년 ${meta.month}월 ${meta.title || '예산'}`,
    금액: Number(meta.totalBudget) || 0,
    비고: '총 예산',
  });
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
        item.date || '',
        item.category || '',
        item.name || '',
        `${(Number(item.amount) || 0).toLocaleString()}원`,
        item.note || '',
      ].map((text) => new TableCell({ children: [new Paragraph(String(text))] })),
    })),
  ];

  const document = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: meta.title || '예산',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `${meta.year}년 ${meta.month}월 / 총지출 ${totalSpent.toLocaleString()}원`,
          spacing: { after: 200 },
        }),
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, '예산.docx');
}
