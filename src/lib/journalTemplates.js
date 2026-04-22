export const JOURNAL_TYPES = {
  PLAY_PLAN_INDIVIDUAL: 'play_plan_individual',
  PLAY_PLAN_GROUP: 'play_plan_group',
  INTERVIEW_LOG: 'interview_log',
  INITIAL_CONSULTATION: 'initial_consultation',
  ACTIVITY_LOG: 'activity_log',
};

export const JOURNAL_TYPE_OPTIONS = [
  {
    value: JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL,
    label: '놀이계획서(개별)',
    shortLabel: '개별 계획',
    description: '개별 놀이계획서 양식에 맞춰 작성합니다.',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value: JOURNAL_TYPES.PLAY_PLAN_GROUP,
    label: '놀이계획서(소그룹/집단)',
    shortLabel: '소그룹 계획',
    description: '소그룹·집단 놀이계획서 양식에 맞춰 작성합니다.',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    value: JOURNAL_TYPES.INTERVIEW_LOG,
    label: '면담일지',
    shortLabel: '면담',
    description: '보호자 및 기관 면담 내용을 양식에 맞춰 기록합니다.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    value: JOURNAL_TYPES.INITIAL_CONSULTATION,
    label: '초기상담기록지',
    shortLabel: '초기상담',
    description: '초기상담기록지 항목에 맞춰 아동 기본정보를 정리합니다.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    value: JOURNAL_TYPES.ACTIVITY_LOG,
    label: '활동일지(개별/소그룹/집단)',
    shortLabel: '활동일지',
    description: '활동일지 양식에 맞춰 회기별 활동 내용을 기록합니다.',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

export const PLAN_PERIOD_OPTIONS = ['상반기', '하반기'];
export const ACTIVITY_KIND_OPTIONS = ['개별활동', '소그룹활동', '집단활동'];
export const CONSULTATION_METHOD_OPTIONS = ['전화', '내소(센터)', '가정방문', '기타'];
export const INFO_PROVIDER_OPTIONS = ['가족', '기관종사자', '기타'];
export const SOLO_PLAY_TIME_OPTIONS = [
  '1시간 미만',
  '1시간 이상~2시간 미만',
  '2시간 이상~3시간 미만',
  '3시간 이상~4시간 미만',
  '4시간 이상',
];
export const LEVEL_OPTIONS = ['매우 많다', '조금 많다', '보통이다', '부족하다', '매우 부족하다'];
export const SATISFACTION_OPTIONS = ['매우 만족', '만족', '보통', '불만족', '매우 불만족'];

const TEMPLATE_MAP = {
  [JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL]: {
    defaultTitle: '놀이계획서(개별)',
    quickPhrases: [
      '놀이 목표는 현재 수준을 기준으로 구체적인 행동 변화 중심으로 적습니다.',
      '월별 놀이 활동 계획은 회차, 놀이 영역, 활동 내용, 계획안 번호를 함께 정리합니다.',
      '활동 장소와 구매 필요한 물품은 기관 협조가 필요한 내용까지 함께 적습니다.',
    ],
  },
  [JOURNAL_TYPES.PLAY_PLAN_GROUP]: {
    defaultTitle: '놀이계획서(소그룹/집단)',
    quickPhrases: [
      '소그룹 매칭 특성은 아동별 놀이 수준과 상호작용 특성을 함께 적습니다.',
      '활동 목표는 또래 관계, 참여도, 공동 놀이 경험 중심으로 정리합니다.',
      '놀이 활동 계획은 진행 순서와 준비물, 기관 협조 사항이 보이게 적습니다.',
    ],
  },
  [JOURNAL_TYPES.INTERVIEW_LOG]: {
    defaultTitle: '면담일지',
    quickPhrases: [
      '놀이활동 내용과 변화, 특이사항, 욕구 파악 내용을 구분해서 기록합니다.',
      '자문위원 슈퍼비전이나 이후 계획 공유 내용은 향후 개입 계획에 반영합니다.',
      '보호자와 기관이 전달한 핵심 정보를 빠짐없이 남깁니다.',
    ],
  },
  [JOURNAL_TYPES.INITIAL_CONSULTATION]: {
    defaultTitle: '초기상담기록지',
    quickPhrases: [
      '가족관계, 건강상 특이사항, 비상연락처를 먼저 정리합니다.',
      '여가시간, 또래관계, 진로 및 욕구를 질문 문항 순서대로 기록합니다.',
      '외부 놀이 욕구와 주의해야 할 점은 실무에서 바로 참고할 수 있게 구체적으로 적습니다.',
    ],
  },
  [JOURNAL_TYPES.ACTIVITY_LOG]: {
    defaultTitle: '활동일지',
    quickPhrases: [
      '세부 활동내용은 계획안 번호와 실제 진행 순서가 보이도록 적습니다.',
      '관찰내용에는 아동 반응과 놀이 특성 변화를 구체적으로 적습니다.',
      '활동 평가 및 의견에는 보호자 면담 내용이나 부모 의견을 함께 정리합니다.',
    ],
  },
};

export function getJournalTemplate(type) {
  const option = JOURNAL_TYPE_OPTIONS.find((item) => item.value === type) || JOURNAL_TYPE_OPTIONS[0];
  return {
    ...option,
    defaultTitle: TEMPLATE_MAP[option.value]?.defaultTitle || option.label,
    quickPhrases: TEMPLATE_MAP[option.value]?.quickPhrases || [],
  };
}

function pushSection(sections, title, lines) {
  const filtered = lines.filter(Boolean);
  if (filtered.length === 0) return;
  sections.push({ title, lines: filtered });
}

function joinText(items, separator = ' ') {
  return (items || []).filter(Boolean).join(separator);
}

export function buildJournalSuggestion({ type, commonFields = {}, typeFields = {} }) {
  const template = getJournalTemplate(type);
  const sections = [];
  const titleCandidates = [];

  if (type === JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL) {
    titleCandidates.push(`${commonFields.childName || '아동'} 놀이계획서`, template.defaultTitle);
    pushSection(sections, '기본정보', [
      commonFields.childName ? `아동명: ${commonFields.childName}` : '',
      typeFields.childAge ? `연령: ${typeFields.childAge}` : '',
      typeFields.childGrade ? `학년: ${typeFields.childGrade}` : '',
      typeFields.currentLevel ? `현행 수준: ${typeFields.currentLevel}` : '',
    ]);
    pushSection(sections, '놀이 목표', [typeFields.playGoal || '']);
  }

  if (type === JOURNAL_TYPES.PLAY_PLAN_GROUP) {
    titleCandidates.push(template.defaultTitle);
    pushSection(sections, '활동 기본정보', [
      typeFields.participantSaverNames ? `참여 놀세이버: ${typeFields.participantSaverNames}` : '',
      typeFields.participantChildrenSummary ? `참여 아동: ${typeFields.participantChildrenSummary}` : '',
      commonFields.date ? `활동일시: ${commonFields.date} ${commonFields.time || ''}`.trim() : '',
      typeFields.location ? `장소: ${typeFields.location}` : '',
    ]);
    pushSection(sections, '소그룹 매칭 특성 및 목표', [typeFields.matchingGoal || '']);
    pushSection(sections, '놀이 활동 계획', [typeFields.groupPlan || '']);
  }

  if (type === JOURNAL_TYPES.INTERVIEW_LOG) {
    titleCandidates.push(`${commonFields.childName || '아동'} 면담일지`, template.defaultTitle);
    pushSection(sections, '면담 기본정보', [
      typeFields.saverName ? `놀세이버명: ${typeFields.saverName}` : '',
      typeFields.intervieweeName ? `면담자(보호자명): ${typeFields.intervieweeName}` : '',
      typeFields.consultationMethod ? `상담 수행 방법: ${typeFields.consultationMethod}` : '',
      typeFields.infoProvider ? `상담정보제공자: ${typeFields.infoProvider}` : '',
    ]);
    pushSection(sections, '상담 내용', [typeFields.consultationContent || '']);
    pushSection(sections, '향후 개입 계획 및 상담 결과', [typeFields.futurePlan || '']);
  }

  if (type === JOURNAL_TYPES.INITIAL_CONSULTATION) {
    titleCandidates.push(`${commonFields.childName || '아동'} 초기상담기록지`, template.defaultTitle);
    pushSection(sections, '기본정보', [
      commonFields.childName ? `아동명: ${commonFields.childName}` : '',
      typeFields.birthDate ? `생년월일: ${typeFields.birthDate}` : '',
      typeFields.gender ? `성별: ${typeFields.gender}` : '',
      typeFields.disabilityType ? `장애 유형: ${typeFields.disabilityType}` : '',
      typeFields.healthNotes ? `건강상 특이사항: ${typeFields.healthNotes}` : '',
    ]);
    pushSection(sections, '놀이 및 여가', [
      typeFields.leisureActivity || '',
      typeFields.frequentPlace || '',
      typeFields.favoriteThings || '',
    ]);
    pushSection(sections, '주의 사항', [
      typeFields.cautionBehavior || '',
      typeFields.cautionHealth || '',
      typeFields.cautionTips || '',
    ]);
  }

  if (type === JOURNAL_TYPES.ACTIVITY_LOG) {
    titleCandidates.push(`${commonFields.childName || '아동'} 활동일지`, template.defaultTitle);
    pushSection(sections, '활동 기본정보', [
      typeFields.sessionNumber ? `회차: ${typeFields.sessionNumber}` : '',
      typeFields.cumulativeHours ? `누적 시간: ${typeFields.cumulativeHours}` : '',
      typeFields.activityKind ? `활동구분: ${typeFields.activityKind}` : '',
      typeFields.activitySubject ? `활동 주제: ${typeFields.activitySubject}` : '',
    ]);
    pushSection(sections, '세부 활동내용', [typeFields.detailedActivities || '']);
    pushSection(sections, '놀이과정', [typeFields.playProcess || '']);
    pushSection(sections, '관찰내용', [commonFields.content || '']);
    pushSection(sections, '활동 평가 및 의견', [
      typeFields.activityEvaluation || '',
      typeFields.saverOpinion || '',
    ]);
  }

  const content = sections
    .map((section) => `[${section.title}]\n- ${section.lines.join('\n- ')}`)
    .join('\n\n');

  return {
    titleCandidates,
    title: titleCandidates[0] || template.defaultTitle,
    summary: joinText(sections.flatMap((section) => section.lines).slice(0, 2)).slice(0, 140),
    contentSections: sections,
    content,
  };
}

export function journalTypeLabel(type) {
  return getJournalTemplate(type).label;
}

export function activityKindLabel(value) {
  return ACTIVITY_KIND_OPTIONS.find((item) => item === value) || value || '';
}

export function consultationMethodLabel(value) {
  return CONSULTATION_METHOD_OPTIONS.find((item) => item === value) || value || '';
}
