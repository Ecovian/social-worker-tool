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
import { attendanceLabel, journalTypeLabel, riskFlagLabel } from './storage';

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

function journalRows(journals) {
  return journals.map((journal) => ({
    날짜: journal.date || '',
    시간: journal.time || '',
    아동: journal.childName || '',
    유형: journalTypeLabel(journal.type),
    상태: journal.status === 'finalized' ? '확정' : '임시 저장',
    제목: journal.title || '',
    출결: journal.attendanceStatus ? attendanceLabel(journal.attendanceStatus) : '',
    요약: journal.summary || '',
    본문: journal.content || '',
    위험징후: (journal.riskFlags || []).map(riskFlagLabel).join(', '),
    후속조치: journal.followUpText || '',
    보호자연락필요: journal.guardianContactNeeded ? '예' : '아니오',
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
  doc.text('다종 일지 출력', 14, 18);
  doc.setFontSize(10);
  doc.text(`생성일시 ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 25);

  autoTable(doc, {
    startY: 32,
    head: [['날짜', '아동', '유형', '제목', '상태']],
    body: journals.map((journal) => [
      journal.date || '',
      journal.childName || '',
      journalTypeLabel(journal.type),
      journal.title || '',
      journal.status === 'finalized' ? '확정' : '임시 저장',
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
    doc.text(`아동 ${journal.childName || '-'} / 날짜 ${journal.date || '-'} ${journal.time || ''}`, 14, y);
    y += 5;
    doc.text(`출결 ${journal.attendanceStatus ? attendanceLabel(journal.attendanceStatus) : '-'} / 사진 ${photoCount}장`, 14, y);
    y += 5;
    const bodyLines = doc.splitTextToSize(journal.summary || journal.content || '내용 없음', 180);
    doc.text(bodyLines, 14, y);
    y += bodyLines.length * 4.2 + 5;
  }

  doc.save('다종일지.pdf');
}

export async function exportJournalXLSX(journals) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(journalRows(journals));
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 28 },
    { wch: 10 },
    { wch: 24 },
    { wch: 48 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, '일지');
  XLSX.writeFile(workbook, '다종일지.xlsx');
}

export async function exportJournalDOCX(journals) {
  const children = [
    new Paragraph({
      text: '다종 일지 출력',
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
        text: `아동 ${journal.childName || '-'} / 날짜 ${journal.date || '-'} ${journal.time || ''} / 상태 ${journal.status === 'finalized' ? '확정' : '임시 저장'}`,
      }),
      new Paragraph({
        text: `출결 ${journal.attendanceStatus ? attendanceLabel(journal.attendanceStatus) : '-'} / 위험 ${journal.riskFlags.length > 0 ? journal.riskFlags.map(riskFlagLabel).join(', ') : '없음'}`,
      }),
      new Paragraph({
        text: journal.summary || journal.content || '내용 없음',
        spacing: { after: 180 },
      }),
    );
  });

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, '다종일지.docx');
}

export async function exportBudgetPDF(items, meta) {
  const doc = await createPdf('p');
  const totalBudget = Number(meta.totalBudget) || 0;
  const totalSpent = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  doc.setFontSize(18);
  doc.text(meta.title || '예산표', 14, 18);
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

  doc.save('예산표.pdf');
}

export async function exportBudgetXLSX(items, meta) {
  const workbook = XLSX.utils.book_new();
  const rows = budgetRows(items);
  rows.unshift({
    날짜: '',
    카테고리: '',
    항목명: `${meta.year}년 ${meta.month}월 ${meta.title || '예산표'}`,
    금액: Number(meta.totalBudget) || 0,
    비고: '총 예산',
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, '예산');
  XLSX.writeFile(workbook, '예산표.xlsx');
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
          text: meta.title || '예산표',
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
  saveAs(blob, '예산표.docx');
}
