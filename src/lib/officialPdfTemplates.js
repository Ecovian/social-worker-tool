import {
  CONSULTATION_METHOD_OPTIONS,
  INFO_PROVIDER_OPTIONS,
  JOURNAL_TYPES,
  LEVEL_OPTIONS,
  SOLO_PLAY_TIME_OPTIONS,
  SATISFACTION_OPTIONS,
} from './journalTemplates';

export const OFFICIAL_PDF_PAGE_SIZE = Object.freeze({
  width: 595.28,
  height: 841.89,
});

function trimText(value) {
  return String(value ?? '').trim();
}

function formatCompactDate(value) {
  const raw = trimText(value);
  if (!raw) return '';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}요일`;
}

function sanitizeFileSegment(value) {
  const text = trimText(value);
  if (!text) return '미입력';

  return text
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function textField(config) {
  return {
    type: 'text',
    control: config.control || 'text',
    fontSize: 9,
    minFontSize: 7,
    align: 'left',
    valign: 'middle',
    padding: 2,
    ...config,
  };
}

function multilineField(config) {
  return {
    type: 'multiline',
    control: 'textarea',
    fontSize: 8.6,
    minFontSize: 6.4,
    align: 'left',
    valign: 'top',
    padding: 4,
    lineHeight: 1.24,
    ...config,
  };
}

function datePartsField(config) {
  return {
    type: 'dateParts',
    control: 'dateParts',
    fontSize: 9,
    minFontSize: 7,
    align: 'center',
    valign: 'middle',
    padding: 1.5,
    parts: [],
    ...config,
  };
}

function checkboxGroupField(config) {
  return {
    type: 'checkboxGroup',
    control: 'checkboxGroup',
    markSize: 5,
    ...config,
  };
}

function tableRowsField(config) {
  return {
    type: 'tableRows',
    control: 'tableRows',
    fontSize: 7.6,
    minFontSize: 6.4,
    padding: 2,
    lineHeight: 1.14,
    startIndex: 0,
    ...config,
  };
}

function imageSlotsField(config) {
  return {
    type: 'imageSlots',
    control: 'imageSlots',
    source: 'photos',
    ...config,
  };
}

function page(config) {
  return {
    width: OFFICIAL_PDF_PAGE_SIZE.width,
    height: OFFICIAL_PDF_PAGE_SIZE.height,
    ...config,
  };
}

function buildPlayPlanFooter(journal) {
  const total = [trimText(journal.weeklyCountText), trimText(journal.activityTimeText)].filter(Boolean);
  return total.length ? `총 ${total.join(' / ')} 작성` : '';
}

function buildActivityEvaluationText(journal) {
  const parts = [];
  if (trimText(journal.activityEvaluation)) {
    parts.push(`활동 평가\n${trimText(journal.activityEvaluation)}`);
  }
  if (trimText(journal.saverOpinion)) {
    parts.push(`놀세이버 의견\n${trimText(journal.saverOpinion)}`);
  }
  return parts.join('\n\n');
}

function checkboxOption(value, x, y, w = 62, h = 20, markOffsetX = 8, markOffsetY = 12) {
  return {
    value,
    x,
    y,
    w,
    h,
    markX: x + markOffsetX,
    markY: y + markOffsetY,
  };
}

const PLAY_PLAN_PAGE_COMMON = {
  type: JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL,
  label: '놀이계획서(개별)',
  zipFolder: '놀이계획서(개별)',
  templatePath: 'official-forms/templates/play-plan-individual.pdf',
};

const PLAY_PLAN_INDIVIDUAL_FIRST_HALF_PAGE = page({
  id: 'play-plan-individual-first-half',
  pdfPageIndex: 0,
  backgroundPath: 'official-forms/backgrounds/play-plan-individual-page-1.png',
  fields: [
    textField({ id: 'play_plan_saver_name_1', page: 0, key: 'saverName', x: 94, y: 152, w: 120, h: 14 }),
    datePartsField({
      id: 'play_plan_writer_date_1',
      page: 0,
      key: 'writerDate',
      inputRect: { x: 232, y: 146, w: 218, h: 18 },
      parts: [
        { part: 'year', x: 233, y: 148, w: 42, h: 14 },
        { part: 'month', x: 301, y: 148, w: 18, h: 14 },
        { part: 'day', x: 346, y: 148, w: 18, h: 14 },
        { part: 'weekday', x: 419, y: 148, w: 22, h: 14 },
      ],
    }),
    textField({ id: 'play_plan_child_name_1', page: 0, key: 'childName', x: 94, y: 179, w: 120, h: 14 }),
    textField({ id: 'play_plan_child_age_1', page: 0, key: 'childAge', x: 358, y: 179, w: 40, h: 14, align: 'center' }),
    textField({ id: 'play_plan_child_grade_1', page: 0, key: 'childGrade', x: 426, y: 179, w: 54, h: 14, align: 'center' }),
    datePartsField({
      id: 'play_plan_start_date_1',
      page: 0,
      key: 'activityStartDate',
      inputRect: { x: 140, y: 206, w: 76, h: 18 },
      parts: [
        { part: 'month', x: 141, y: 208, w: 18, h: 14 },
        { part: 'day', x: 184, y: 208, w: 18, h: 14 },
      ],
    }),
    datePartsField({
      id: 'play_plan_end_date_1',
      page: 0,
      key: 'activityEndDate',
      inputRect: { x: 220, y: 206, w: 76, h: 18 },
      parts: [
        { part: 'month', x: 221, y: 208, w: 18, h: 14 },
        { part: 'day', x: 264, y: 208, w: 18, h: 14 },
      ],
    }),
    textField({ id: 'play_plan_weekly_count_1', page: 0, key: 'weeklyCountText', x: 146, y: 226, w: 118, h: 14, align: 'center' }),
    textField({ id: 'play_plan_activity_time_1', page: 0, key: 'activityTimeText', x: 300, y: 226, w: 150, h: 14, align: 'center' }),
    multilineField({ id: 'play_plan_current_level_1', page: 0, key: 'currentLevel', x: 92, y: 224, w: 452, h: 50, continuationTitle: '현행 수준 추가기록' }),
    multilineField({ id: 'play_plan_goal_1', page: 0, key: 'playGoal', x: 92, y: 278, w: 452, h: 72, continuationTitle: '놀이 목표 추가기록' }),
    textField({
      id: 'play_plan_footer_1',
      page: 0,
      x: 132,
      y: 578,
      w: 200,
      h: 14,
      readOnly: true,
      read: buildPlayPlanFooter,
    }),
    textField({ id: 'play_plan_confirmed_1', page: 0, key: 'collaboratorConfirmed', x: 366, y: 596, w: 120, h: 14 }),
    tableRowsField({
      id: 'play_plan_rows_1',
      page: 0,
      listKey: 'planRows',
      rowSlots: [
        { y: 384, h: 19 },
        { y: 406, h: 19 },
        { y: 429, h: 19 },
        { y: 452, h: 19 },
        { y: 475, h: 19 },
        { y: 498, h: 19 },
        { y: 520, h: 19 },
        { y: 543, h: 19 },
      ],
      columns: [
        { key: 'sessionCount', label: '회기수', x: 91, w: 42, align: 'center' },
        { key: 'playArea', label: '놀이영역', x: 133, w: 39, align: 'center' },
        { key: 'activityContent', label: '활동 내용', x: 172, w: 206 },
        { key: 'planNo', label: '활동계획안 번호', x: 379, w: 75, align: 'center' },
        { key: 'placeMaterials', label: '장소 및 물품', x: 455, w: 98 },
      ],
      continuationTitle: '월별 놀이 활동 계획',
      continuationColumns: ['회기수', '놀이영역', '활동 내용', '활동계획안 번호', '장소 및 물품'],
    }),
  ],
});

const PLAY_PLAN_INDIVIDUAL_SECOND_HALF_PAGE = page({
  id: 'play-plan-individual-second-half',
  pdfPageIndex: 1,
  backgroundPath: 'official-forms/backgrounds/play-plan-individual-page-2.png',
  fields: [
    textField({ id: 'play_plan_saver_name_2', page: 0, key: 'saverName', x: 94, y: 166, w: 120, h: 14 }),
    datePartsField({
      id: 'play_plan_writer_date_2',
      page: 0,
      key: 'writerDate',
      inputRect: { x: 232, y: 162, w: 218, h: 18 },
      parts: [
        { part: 'year', x: 233, y: 164, w: 42, h: 14 },
        { part: 'month', x: 301, y: 164, w: 18, h: 14 },
        { part: 'day', x: 346, y: 164, w: 18, h: 14 },
        { part: 'weekday', x: 419, y: 164, w: 22, h: 14 },
      ],
    }),
    textField({ id: 'play_plan_child_name_2', page: 0, key: 'childName', x: 94, y: 193, w: 120, h: 14 }),
    textField({ id: 'play_plan_child_age_2', page: 0, key: 'childAge', x: 358, y: 193, w: 40, h: 14, align: 'center' }),
    textField({ id: 'play_plan_child_grade_2', page: 0, key: 'childGrade', x: 426, y: 193, w: 54, h: 14, align: 'center' }),
    datePartsField({
      id: 'play_plan_start_date_2',
      page: 0,
      key: 'activityStartDate',
      inputRect: { x: 140, y: 219, w: 76, h: 18 },
      parts: [
        { part: 'month', x: 141, y: 221, w: 18, h: 14 },
        { part: 'day', x: 184, y: 221, w: 18, h: 14 },
      ],
    }),
    datePartsField({
      id: 'play_plan_end_date_2',
      page: 0,
      key: 'activityEndDate',
      inputRect: { x: 220, y: 219, w: 76, h: 18 },
      parts: [
        { part: 'month', x: 221, y: 221, w: 18, h: 14 },
        { part: 'day', x: 264, y: 221, w: 18, h: 14 },
      ],
    }),
    textField({ id: 'play_plan_weekly_count_2', page: 0, key: 'weeklyCountText', x: 146, y: 239, w: 118, h: 14, align: 'center' }),
    textField({ id: 'play_plan_activity_time_2', page: 0, key: 'activityTimeText', x: 300, y: 239, w: 150, h: 14, align: 'center' }),
    multilineField({ id: 'play_plan_current_level_2', page: 0, key: 'currentLevel', x: 92, y: 239, w: 452, h: 50, continuationTitle: '현행 수준 추가기록' }),
    multilineField({ id: 'play_plan_goal_2', page: 0, key: 'playGoal', x: 92, y: 294, w: 452, h: 72, continuationTitle: '놀이 목표 추가기록' }),
    textField({
      id: 'play_plan_footer_2',
      page: 0,
      x: 132,
      y: 591,
      w: 200,
      h: 14,
      readOnly: true,
      read: buildPlayPlanFooter,
    }),
    textField({ id: 'play_plan_confirmed_2', page: 0, key: 'collaboratorConfirmed', x: 366, y: 608, w: 120, h: 14 }),
    tableRowsField({
      id: 'play_plan_rows_2',
      page: 0,
      listKey: 'planRows',
      startIndex: 0,
      rowSlots: [
        { y: 399, h: 19 },
        { y: 422, h: 19 },
        { y: 445, h: 19 },
        { y: 468, h: 19 },
      ],
      columns: [
        { key: 'sessionCount', label: '회기수', x: 91, w: 42, align: 'center' },
        { key: 'playArea', label: '놀이영역', x: 133, w: 39, align: 'center' },
        { key: 'activityContent', label: '활동 내용', x: 172, w: 206 },
        { key: 'planNo', label: '활동계획안 번호', x: 379, w: 75, align: 'center' },
        { key: 'placeMaterials', label: '장소 및 물품', x: 455, w: 98 },
      ],
      continuationTitle: '월별 놀이 활동 계획',
      continuationColumns: ['회기수', '놀이영역', '활동 내용', '활동계획안 번호', '장소 및 물품'],
    }),
  ],
});

const PLAY_PLAN_GROUP_PAGE = page({
  id: 'play-plan-group-main',
  pdfPageIndex: 0,
  backgroundPath: 'official-forms/backgrounds/play-plan-group-page-1.png',
  fields: [
    datePartsField({
      id: 'group_writer_date',
      page: 0,
      key: 'writerDate',
      inputRect: { x: 350, y: 106, w: 180, h: 18 },
      parts: [
        { part: 'year', x: 352, y: 108, w: 42, h: 14 },
        { part: 'month', x: 416, y: 108, w: 18, h: 14 },
        { part: 'day', x: 451, y: 108, w: 18, h: 14 },
        { part: 'weekday', x: 492, y: 108, w: 22, h: 14 },
      ],
    }),
    textField({ id: 'group_writer_name', page: 0, key: 'writerName', x: 350, y: 130, w: 120, h: 14 }),
    datePartsField({
      id: 'group_activity_date',
      page: 0,
      key: 'date',
      inputRect: { x: 155, y: 152, w: 95, h: 18 },
      parts: [
        { part: 'year', x: 156, y: 154, w: 34, h: 14 },
        { part: 'month', x: 204, y: 154, w: 16, h: 14 },
        { part: 'day', x: 229, y: 154, w: 16, h: 14 },
      ],
    }),
    textField({ id: 'group_activity_time', page: 0, key: 'time', x: 155, y: 173, w: 95, h: 14 }),
    textField({ id: 'group_location', page: 0, key: 'location', x: 260, y: 159, w: 120, h: 14 }),
    multilineField({ id: 'group_participant_savers', page: 0, key: 'participantSaverNames', x: 70, y: 168, w: 160, h: 52, fontSize: 8.4, minFontSize: 7 }),
    multilineField({ id: 'group_participant_children', page: 0, key: 'participantChildrenSummary', x: 70, y: 214, w: 160, h: 110, fontSize: 8.1, minFontSize: 6.8 }),
    tableRowsField({
      id: 'group_peer_level_rows',
      page: 0,
      listKey: 'peerLevelRows',
      rowSlots: [
        { y: 220, h: 24 },
        { y: 248, h: 24 },
        { y: 276, h: 24 },
        { y: 304, h: 24 },
      ],
      columns: [
        { key: 'childName', label: '아동명', x: 145, w: 110 },
        { key: 'playLevel', label: '놀이수준', x: 255, w: 54, align: 'center' },
        { key: 'notes', label: '수준 및 특성', x: 310, w: 230 },
      ],
      continuationTitle: '또래놀이 수준 및 특성',
      continuationColumns: ['아동명', '놀이수준', '수준 및 특성'],
      extraOverflowStartIndex: 4,
    }),
    multilineField({ id: 'group_matching_goal', page: 0, key: 'matchingGoal', x: 145, y: 358, w: 395, h: 82 }),
    multilineField({ id: 'group_plan', page: 0, key: 'groupPlan', x: 145, y: 445, w: 395, h: 140 }),
    multilineField({
      id: 'group_needed_materials',
      page: 0,
      key: 'neededMaterials',
      x: 145,
      y: 588,
      w: 395,
      h: 70,
      read: (journal) => [trimText(journal.neededMaterials), trimText(journal.note)].filter(Boolean).join('\n'),
    }),
    textField({ id: 'group_confirmed', page: 0, key: 'collaboratorConfirmed', x: 365, y: 638, w: 120, h: 14 }),
  ],
});

const INTERVIEW_LOG_PAGE = page({
  id: 'interview-log-main',
  pdfPageIndex: 0,
  backgroundPath: 'official-forms/backgrounds/interview-log-page-1.png',
  fields: [
    textField({ id: 'interview_saver_name', page: 0, key: 'saverName', x: 92, y: 97, w: 160, h: 14 }),
    datePartsField({
      id: 'interview_date',
      page: 0,
      key: 'consultationDate',
      inputRect: { x: 327, y: 95, w: 170, h: 18 },
      parts: [
        { part: 'year', x: 329, y: 97, w: 40, h: 14 },
        { part: 'month', x: 389, y: 97, w: 18, h: 14 },
        { part: 'day', x: 424, y: 97, w: 18, h: 14 },
        { part: 'weekday', x: 466, y: 97, w: 22, h: 14 },
      ],
    }),
    textField({ id: 'interview_child_name', page: 0, key: 'childName', x: 92, y: 120, w: 160, h: 14 }),
    textField({ id: 'interviewee_name', page: 0, key: 'intervieweeName', x: 327, y: 120, w: 150, h: 14 }),
    checkboxGroupField({
      id: 'consultation_method',
      page: 0,
      key: 'consultationMethod',
      options: [
        checkboxOption('전화', 108, 118),
        checkboxOption('내소(센터)', 144, 118, 74),
        checkboxOption('가정방문', 198, 118, 84),
        checkboxOption('기타', 108, 134, 60),
      ],
    }),
    checkboxGroupField({
      id: 'info_provider',
      page: 0,
      key: 'infoProvider',
      options: [
        checkboxOption('가족', 318, 118),
        checkboxOption('기관종사자', 378, 118, 90),
        checkboxOption('기타', 318, 134, 60),
      ],
    }),
    textField({
      id: 'consultation_method_other',
      page: 0,
      key: 'consultationMethod',
      x: 150,
      y: 141,
      w: 110,
      h: 14,
      readOnly: true,
      read: (journal) => (trimText(journal.consultationMethod) === '기타' ? trimText(journal.consultationMethod) : ''),
    }),
    textField({
      id: 'info_provider_other',
      page: 0,
      key: 'infoProviderDetail',
      x: 360,
      y: 141,
      w: 120,
      h: 14,
    }),
    multilineField({ id: 'interview_content', page: 0, key: 'consultationContent', x: 145, y: 175, w: 350, h: 380, continuationTitle: '상담(면담) 내용' }),
    multilineField({ id: 'interview_future_plan', page: 0, key: 'futurePlan', x: 145, y: 603, w: 350, h: 52, continuationTitle: '향후 개입 계획 및 보호자 상담 결과' }),
    textField({ id: 'interview_confirmed', page: 0, key: 'collaboratorConfirmed', x: 392, y: 649, w: 92, h: 14 }),
  ],
});

const INITIAL_CONSULTATION_PAGE_1 = page({
  id: 'initial-consultation-page-1',
  pdfPageIndex: 0,
  backgroundPath: 'official-forms/backgrounds/initial-consultation-page-1.png',
  fields: [
    textField({ id: 'initial_child_name', page: 0, key: 'childName', x: 112, y: 196, w: 120, h: 14 }),
    datePartsField({
      id: 'initial_birth_date',
      page: 0,
      key: 'birthDate',
      inputRect: { x: 265, y: 194, w: 120, h: 18 },
      parts: [
        { part: 'year', x: 266, y: 196, w: 38, h: 14 },
        { part: 'month', x: 320, y: 196, w: 16, h: 14 },
        { part: 'day', x: 349, y: 196, w: 16, h: 14 },
      ],
    }),
    textField({ id: 'initial_gender', page: 0, key: 'gender', x: 404, y: 196, w: 52, h: 14, align: 'center' }),
    textField({ id: 'initial_disability_type', page: 0, key: 'disabilityType', x: 456, y: 196, w: 84, h: 14 }),
    textField({ id: 'initial_disability_level', page: 0, key: 'disabilityLevel', x: 112, y: 220, w: 120, h: 14 }),
    textField({ id: 'initial_emergency_contact', page: 0, key: 'emergencyContact', x: 232, y: 220, w: 190, h: 14 }),
    multilineField({ id: 'initial_health_notes', page: 0, key: 'healthNotes', x: 112, y: 222, w: 430, h: 46, fontSize: 8.2, continuationTitle: '건강상 특이사항' }),
    tableRowsField({
      id: 'initial_family_rows',
      page: 0,
      listKey: 'familyRows',
      rowSlots: [
        { y: 430, h: 20 },
        { y: 452, h: 20 },
        { y: 474, h: 20 },
      ],
      columns: [
        { key: 'relation', label: '관계', x: 145, w: 52, align: 'center' },
        { key: 'name', label: '이름', x: 197, w: 46, align: 'center' },
        { key: 'age', label: '연령', x: 245, w: 33, align: 'center' },
        { key: 'disability', label: '장애유무', x: 279, w: 85 },
        { key: 'notes', label: '특이사항', x: 365, w: 177 },
      ],
      continuationTitle: '가족관계 추가기록',
      continuationColumns: ['관계', '이름', '연령', '장애유무', '특이사항'],
      extraOverflowStartIndex: 3,
      fontSize: 7.3,
      minFontSize: 6.2,
      lineHeight: 1.12,
    }),
    multilineField({ id: 'initial_leisure_activity', page: 0, key: 'leisureActivity', x: 145, y: 518, w: 395, h: 52 }),
    multilineField({ id: 'initial_frequent_place', page: 0, key: 'frequentPlace', x: 145, y: 573, w: 395, h: 34 }),
    checkboxGroupField({
      id: 'initial_solo_play_time',
      page: 0,
      key: 'soloPlayTimeRange',
      options: SOLO_PLAY_TIME_OPTIONS.map((value, index) => checkboxOption(value, 230 + (index * 62), 487, 62, 28, 8, 14)),
    }),
    checkboxGroupField({
      id: 'initial_toy_type_level',
      page: 0,
      key: 'toyTypeLevel',
      options: LEVEL_OPTIONS.map((value, index) => checkboxOption(value, 230 + (index * 58), 522, 58, 26, 8, 14)),
    }),
    checkboxGroupField({
      id: 'initial_toy_quantity_level',
      page: 0,
      key: 'toyQuantityLevel',
      options: LEVEL_OPTIONS.map((value, index) => checkboxOption(value, 230 + (index * 58), 560, 58, 26, 8, 14)),
    }),
    multilineField({ id: 'initial_toy_type_description', page: 0, key: 'toyTypeDescription', x: 450, y: 605, w: 90, h: 115, fontSize: 7.4, minFontSize: 6.4, padding: 3, lineHeight: 1.2 }),
  ],
});

const INITIAL_CONSULTATION_PAGE_2 = page({
  id: 'initial-consultation-page-2',
  pdfPageIndex: 1,
  backgroundPath: 'official-forms/backgrounds/initial-consultation-page-2.png',
  fields: [
    multilineField({ id: 'initial_peer_activities', page: 0, key: 'peerActivities', x: 145, y: 92, w: 395, h: 116 }),
    multilineField({ id: 'initial_peer_notes', page: 0, key: 'peerNotes', x: 145, y: 176, w: 395, h: 112 }),
    multilineField({ id: 'initial_dream', page: 0, key: 'dream', x: 145, y: 298, w: 395, h: 56 }),
    multilineField({ id: 'initial_strengths', page: 0, key: 'strengths', x: 145, y: 355, w: 395, h: 48 }),
    multilineField({ id: 'initial_favorite_things', page: 0, key: 'favoriteThings', x: 145, y: 435, w: 395, h: 62 }),
    multilineField({ id: 'initial_service_goals', page: 0, key: 'serviceGoals', x: 145, y: 497, w: 395, h: 66 }),
    multilineField({ id: 'initial_caution_behavior', page: 0, key: 'cautionBehavior', x: 145, y: 570, w: 395, h: 44 }),
    multilineField({ id: 'initial_caution_health', page: 0, key: 'cautionHealth', x: 145, y: 618, w: 395, h: 44 }),
    multilineField({ id: 'initial_caution_tips', page: 0, key: 'cautionTips', x: 145, y: 664, w: 395, h: 60 }),
    multilineField({ id: 'initial_outdoor_wish', page: 0, key: 'outdoorPlayWish', x: 145, y: 742, w: 395, h: 35 }),
    multilineField({ id: 'initial_outdoor_notes', page: 0, key: 'outdoorPlayNotes', x: 145, y: 778, w: 395, h: 40 }),
  ],
});

const INITIAL_CONSULTATION_PAGE_3 = page({
  id: 'initial-consultation-page-3',
  pdfPageIndex: 2,
  backgroundPath: 'official-forms/backgrounds/initial-consultation-page-3.png',
  fields: [
    imageSlotsField({
      id: 'initial_consultation_photos',
      page: 0,
      slots: [
        { x: 110, y: 150, w: 430, h: 155 },
        { x: 110, y: 308, w: 430, h: 155 },
        { x: 110, y: 467, w: 430, h: 118 },
        { x: 110, y: 588, w: 430, h: 134 },
      ],
      continuationTitle: '첨부 사진',
    }),
  ],
});

const ACTIVITY_LOG_PAGE_1 = page({
  id: 'activity-log-page-1',
  pdfPageIndex: 0,
  backgroundPath: 'official-forms/backgrounds/activity-log-page-1.png',
  fields: [
    textField({ id: 'activity_saver_members', page: 0, key: 'saverMembers', x: 74, y: 128, w: 210, h: 14, fontSize: 8.8 }),
    textField({ id: 'activity_child_participants', page: 0, key: 'childParticipants', x: 74, y: 152, w: 210, h: 14, fontSize: 8.8 }),
    textField({ id: 'activity_plan_no', page: 0, key: 'activityPlanNo', x: 74, y: 178, w: 120, h: 14, fontSize: 8.8 }),
    textField({ id: 'activity_session_number', page: 0, key: 'sessionNumber', x: 416, y: 106, w: 48, h: 14, fontSize: 10, align: 'center' }),
    textField({ id: 'activity_cumulative_hours', page: 0, key: 'cumulativeHours', x: 470, y: 106, w: 92, h: 14, fontSize: 10, align: 'center' }),
    datePartsField({
      id: 'activity_date',
      page: 0,
      key: 'date',
      inputRect: { x: 294, y: 130, w: 180, h: 18 },
      fontSize: 8.8,
      parts: [
        { part: 'year', x: 296, y: 132, w: 40, h: 14, fontSize: 8.8 },
        { part: 'month', x: 357, y: 132, w: 18, h: 14, fontSize: 8.8 },
        { part: 'day', x: 392, y: 132, w: 18, h: 14, fontSize: 8.8 },
        { part: 'weekday', x: 434, y: 132, w: 22, h: 14, fontSize: 8.8 },
      ],
    }),
    textField({ id: 'activity_time', page: 0, key: 'time', x: 382, y: 152, w: 80, h: 14, fontSize: 8.8, align: 'center' }),
    textField({
      id: 'activity_kind',
      page: 0,
      key: 'activityKind',
      x: 334,
      y: 178,
      w: 140,
      h: 16,
      fontSize: 8.8,
      control: 'select',
      options: ['개별활동', '소그룹활동', '집단활동'],
    }),
    textField({ id: 'activity_place', page: 0, key: 'activityPlace', x: 74, y: 238, w: 140, h: 14, fontSize: 8.8 }),
    textField({
      id: 'activity_satisfaction',
      page: 0,
      key: 'satisfaction',
      x: 238,
      y: 238,
      w: 110,
      h: 14,
      fontSize: 8.8,
      control: 'select',
      options: SATISFACTION_OPTIONS,
    }),
    textField({ id: 'activity_subject', page: 0, key: 'activitySubject', x: 74, y: 291, w: 220, h: 14, fontSize: 8.8 }),
    textField({ id: 'activity_materials', page: 0, key: 'playMaterials', x: 74, y: 322, w: 220, h: 14, fontSize: 8.8 }),
    multilineField({ id: 'activity_detailed_activities', page: 0, key: 'detailedActivities', x: 145, y: 182, w: 390, h: 245, continuationTitle: '세부 활동 내용', fontSize: 8.5, lineHeight: 1.26 }),
    multilineField({ id: 'activity_process', page: 0, key: 'playProcess', x: 145, y: 449, w: 390, h: 34, continuationTitle: '놀이과정' }),
    multilineField({ id: 'activity_content', page: 0, key: 'content', x: 145, y: 487, w: 390, h: 30, continuationTitle: '관찰내용' }),
    multilineField({ id: 'activity_conversation_notes', page: 0, key: 'conversationNotes', x: 145, y: 518, w: 390, h: 86, continuationTitle: '이야기 나눈 내용' }),
  ],
});

const ACTIVITY_LOG_PAGE_2 = page({
  id: 'activity-log-page-2',
  pdfPageIndex: 1,
  backgroundPath: 'official-forms/backgrounds/activity-log-page-2.png',
  fields: [
    multilineField({
      id: 'activity_evaluation',
      page: 0,
      key: 'activityEvaluation',
      x: 132,
      y: 72,
      w: 420,
      h: 146,
      continuationTitle: '활동 평가',
    }),
    multilineField({
      id: 'activity_saver_opinion',
      page: 0,
      key: 'saverOpinion',
      x: 132,
      y: 222,
      w: 420,
      h: 170,
      continuationTitle: '놀세이버 의견',
    }),
    textField({ id: 'activity_confirmed', page: 0, key: 'collaboratorConfirmed', x: 390, y: 283, w: 120, h: 14, fontSize: 8.5 }),
    imageSlotsField({
      id: 'activity_log_photos',
      page: 0,
      slots: [
        { x: 132, y: 531, w: 420, h: 138 },
        { x: 132, y: 676, w: 420, h: 100 },
      ],
      continuationTitle: '첨부 사진',
    }),
  ],
});

const TEMPLATE_DEFINITIONS = {
  [JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL]: {
    ...PLAY_PLAN_PAGE_COMMON,
    description: '상반기/하반기 선택에 따라 해당 공식 양식 1장만 편집합니다.',
    resolvePages: (journal) => (
      trimText(journal?.planPeriod) === '하반기'
        ? [PLAY_PLAN_INDIVIDUAL_SECOND_HALF_PAGE]
        : [PLAY_PLAN_INDIVIDUAL_FIRST_HALF_PAGE]
    ),
  },
  [JOURNAL_TYPES.PLAY_PLAN_GROUP]: {
    type: JOURNAL_TYPES.PLAY_PLAN_GROUP,
    label: '놀이계획서(소그룹/집단)',
    zipFolder: '놀이계획서(소그룹·집단)',
    templatePath: 'official-forms/templates/play-plan-group.pdf',
    description: '소그룹·집단 놀이계획서를 공식 양식 그대로 작성합니다.',
    pages: [PLAY_PLAN_GROUP_PAGE],
  },
  [JOURNAL_TYPES.INTERVIEW_LOG]: {
    type: JOURNAL_TYPES.INTERVIEW_LOG,
    label: '면담일지',
    zipFolder: '면담일지',
    templatePath: 'official-forms/templates/interview-log.pdf',
    description: '공식 면담/상담 일지 양식 위에서 바로 입력합니다.',
    pages: [INTERVIEW_LOG_PAGE],
  },
  [JOURNAL_TYPES.INITIAL_CONSULTATION]: {
    type: JOURNAL_TYPES.INITIAL_CONSULTATION,
    label: '초기상담기록지',
    zipFolder: '초기상담기록지',
    templatePath: 'official-forms/templates/initial-consultation.pdf',
    description: '3페이지 공식 초기상담기록지 양식 위에서 직접 작성합니다.',
    pages: [INITIAL_CONSULTATION_PAGE_1, INITIAL_CONSULTATION_PAGE_2, INITIAL_CONSULTATION_PAGE_3],
  },
  [JOURNAL_TYPES.ACTIVITY_LOG]: {
    type: JOURNAL_TYPES.ACTIVITY_LOG,
    label: '활동일지(개별/소그룹/집단)',
    zipFolder: '활동일지',
    templatePath: 'official-forms/templates/activity-log.pdf',
    description: '활동일지 본문과 평가/사진 페이지를 공식 양식 그대로 작성합니다.',
    pages: [ACTIVITY_LOG_PAGE_1, ACTIVITY_LOG_PAGE_2],
  },
};

export function getOfficialPdfTemplate(type) {
  return TEMPLATE_DEFINITIONS[type] || TEMPLATE_DEFINITIONS[JOURNAL_TYPES.ACTIVITY_LOG];
}

export function resolveOfficialFormSchema(type, journal = {}) {
  const template = getOfficialPdfTemplate(type);
  const pages = template.resolvePages ? template.resolvePages(journal) : template.pages;
  return {
    ...template,
    pages: pages.map((currentPage, pageIndex) => ({
      ...currentPage,
      page: pageIndex,
      fields: currentPage.fields.map((field) => ({ ...field, page: pageIndex })),
    })),
  };
}

export function buildOfficialPdfFileName(journal) {
  const template = getOfficialPdfTemplate(journal?.type);
  const date = sanitizeFileSegment(journal?.consultationDate || journal?.date || journal?.writerDate);
  const childName = sanitizeFileSegment(journal?.childName);
  const label = sanitizeFileSegment(template.label);
  return `${date}_${childName}_${label}.pdf`;
}
