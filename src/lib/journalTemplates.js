export const JOURNAL_TYPES = {
  OBSERVATION: 'observation',
  PLAY_INDIVIDUAL: 'play_individual',
  PROGRAM_GROUP: 'program_group',
  COUNSELING: 'counseling',
  GUARDIAN_CONTACT: 'guardian_contact',
  ATTENDANCE_DAILY: 'attendance_daily',
  LIFE_GUIDANCE: 'life_guidance',
  INCIDENT_RISK: 'incident_risk',
  HOMEWORK_GUIDANCE: 'homework_guidance',
  MEAL_HEALTH: 'meal_health',
};

export const JOURNAL_TYPE_OPTIONS = [
  {
    value: JOURNAL_TYPES.OBSERVATION,
    label: '아동관찰일지',
    shortLabel: '관찰',
    description: '일상 관찰, 정서 변화, 개입 내용을 기록합니다.',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value: JOURNAL_TYPES.PLAY_INDIVIDUAL,
    label: '놀이활동일지(개별)',
    shortLabel: '놀이',
    description: '놀이 참여 반응과 또래 상호작용을 기록합니다.',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    value: JOURNAL_TYPES.PROGRAM_GROUP,
    label: '프로그램활동일지(집단)',
    shortLabel: '집단',
    description: '집단 프로그램 운영 결과와 참여 아동을 기록합니다.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    value: JOURNAL_TYPES.COUNSELING,
    label: '상담일지',
    shortLabel: '상담',
    description: '상담 주제, 개입, 후속 계획을 정리합니다.',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    value: JOURNAL_TYPES.GUARDIAN_CONTACT,
    label: '보호자연락일지',
    shortLabel: '연락',
    description: '전화, 문자, 대면 연락 내용을 관리합니다.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    value: JOURNAL_TYPES.ATTENDANCE_DAILY,
    label: '출결·귀가일지',
    shortLabel: '출결',
    description: '출결, 등원·귀가 시간, 인계사항을 기록합니다.',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  {
    value: JOURNAL_TYPES.LIFE_GUIDANCE,
    label: '생활지도일지',
    shortLabel: '생활',
    description: '규칙 지도, 생활 습관, 생활지도 반응을 남깁니다.',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    value: JOURNAL_TYPES.INCIDENT_RISK,
    label: '사고·위험기록지',
    shortLabel: '위험',
    description: '사고, 위험징후, 즉시 조치와 보고 내용을 기록합니다.',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    value: JOURNAL_TYPES.HOMEWORK_GUIDANCE,
    label: '숙제·학습지도일지',
    shortLabel: '학습',
    description: '숙제 수행, 학습 지원, 이해도를 기록합니다.',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    value: JOURNAL_TYPES.MEAL_HEALTH,
    label: '급간식·건강관리일지',
    shortLabel: '건강',
    description: '식사 상태, 컨디션, 건강 이상 여부를 기록합니다.',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
];

const TEMPLATE_MAP = {
  [JOURNAL_TYPES.OBSERVATION]: {
    defaultTitle: '일상 관찰 기록',
    quickPhrases: [
      '관찰: 오늘 아동은 활동 참여 전후로 정서 변화가 비교적 안정적이었음.',
      '개입: 선택권을 제공하고 차분한 언어로 반응을 정리하도록 도왔음.',
      '후속: 다음 회기에도 비슷한 상황에서 반응을 지속 관찰할 예정임.',
    ],
  },
  [JOURNAL_TYPES.PLAY_INDIVIDUAL]: {
    defaultTitle: '놀이활동 참여 기록',
    quickPhrases: [
      '놀이 반응: 활동 제안 후 흥미를 보이며 자발적으로 참여함.',
      '상호작용: 또래와 순서를 조율하며 협력하려는 모습을 보였음.',
      '후속: 선호 놀이를 기반으로 자기표현 활동을 확장할 예정임.',
    ],
  },
  [JOURNAL_TYPES.PROGRAM_GROUP]: {
    defaultTitle: '집단 프로그램 운영 기록',
    quickPhrases: [
      '운영 개요: 프로그램 목표를 안내하고 도입-본활동-마무리 순으로 진행함.',
      '집단 분위기: 참여 아동 대부분이 활동 지시에 안정적으로 반응함.',
      '평가: 다음 회기에는 난이도 조절과 역할 분담 안내를 보완할 예정임.',
    ],
  },
  [JOURNAL_TYPES.COUNSELING]: {
    defaultTitle: '상담 진행 기록',
    quickPhrases: [
      '주제: 최근 학교생활 및 또래관계에 대한 정서 반응을 중심으로 이야기함.',
      '개입: 감정 명명과 상황 재구성을 통해 스스로 표현하도록 지원함.',
      '후속: 다음 상담에서 반복되는 갈등 상황을 더 구체적으로 다룰 예정임.',
    ],
  },
  [JOURNAL_TYPES.GUARDIAN_CONTACT]: {
    defaultTitle: '보호자 연락 기록',
    quickPhrases: [
      '전달: 오늘 활동 및 관찰 내용을 보호자에게 요약 전달함.',
      '반응: 보호자는 가정 내 상황과 연계해 협조 의사를 보였음.',
      '후속: 필요 시 추가 연락 및 가정 연계 내용을 재확인할 예정임.',
    ],
  },
  [JOURNAL_TYPES.ATTENDANCE_DAILY]: {
    defaultTitle: '출결·귀가 기록',
    quickPhrases: [
      '출결: 등원 여부와 시간 확인을 완료함.',
      '귀가: 보호자 인계 또는 귀가 방식 확인이 필요함.',
      '특이사항: 당일 컨디션과 인계 메모를 함께 기록함.',
    ],
  },
  [JOURNAL_TYPES.LIFE_GUIDANCE]: {
    defaultTitle: '생활지도 기록',
    quickPhrases: [
      '상황: 생활 규칙 준수와 정리 습관 형성을 중심으로 지도함.',
      '개입: 구체적인 행동 기준을 제시하고 즉시 피드백을 제공함.',
      '반응: 반복 안내 후 스스로 수정하려는 태도를 보였음.',
    ],
  },
  [JOURNAL_TYPES.INCIDENT_RISK]: {
    defaultTitle: '사고·위험 상황 기록',
    quickPhrases: [
      '상황: 위험 상황 발생 시 즉시 안전 확보와 분리 조치를 진행함.',
      '조치: 현장 안정화 후 담당자 공유 및 보호자 안내 여부를 확인함.',
      '후속: 재발 방지를 위한 추가 관찰과 환경 조정을 계획함.',
    ],
  },
  [JOURNAL_TYPES.HOMEWORK_GUIDANCE]: {
    defaultTitle: '숙제·학습지도 기록',
    quickPhrases: [
      '학습 상태: 과제 이해도와 집중 지속 시간을 확인함.',
      '지원: 단계별 힌트 제공과 자기점검을 중심으로 안내함.',
      '후속: 다음 시간에는 미완료 과제와 취약 단원을 점검할 예정임.',
    ],
  },
  [JOURNAL_TYPES.MEAL_HEALTH]: {
    defaultTitle: '급간식·건강관리 기록',
    quickPhrases: [
      '식사 상태: 식사량과 선호도를 확인하고 관찰함.',
      '건강 상태: 컨디션, 복약, 증상 여부를 함께 확인함.',
      '후속: 이상 징후가 지속되면 보호자 및 담당자와 공유할 예정임.',
    ],
  },
};

export const ATTENDANCE_OPTIONS = [
  { value: 'present', label: '출석' },
  { value: 'late', label: '지각' },
  { value: 'absent', label: '결석' },
  { value: 'left_early', label: '조퇴' },
];

export const CONTACT_METHOD_OPTIONS = [
  { value: 'call', label: '전화' },
  { value: 'sms', label: '문자' },
  { value: 'visit', label: '대면' },
  { value: 'notice', label: '알림장' },
  { value: 'other', label: '기타' },
];

export const PARTICIPATION_OPTIONS = ['매우 적극적', '안정적 참여', '부분 참여', '관찰 위주', '참여 거부'];
export const EMOTION_OPTIONS = ['안정', '기쁨', '긴장', '불안', '예민', '무기력'];
export const MEAL_OPTIONS = ['아침', '점심', '간식', '저녁'];
export const APPETITE_OPTIONS = ['양호', '보통', '부진', '거부'];
export const RISK_FLAG_OPTIONS = [
  { value: 'mood', label: '정서 불안정' },
  { value: 'health', label: '건강 이상' },
  { value: 'violence', label: '공격 행동' },
  { value: 'self_harm', label: '자해 위험' },
  { value: 'abuse', label: '학대 의심' },
  { value: 'runaway', label: '무단이탈 위험' },
];

export function getJournalTemplate(type) {
  const option = JOURNAL_TYPE_OPTIONS.find((item) => item.value === type) || JOURNAL_TYPE_OPTIONS[0];
  return {
    type: option.value,
    label: option.label,
    shortLabel: option.shortLabel,
    description: option.description,
    color: option.color,
    defaultTitle: TEMPLATE_MAP[option.value]?.defaultTitle || option.label,
    quickPhrases: TEMPLATE_MAP[option.value]?.quickPhrases || [],
  };
}

function joinDefined(parts, separator = ' / ') {
  return parts.filter(Boolean).join(separator);
}

function pushSection(sections, title, lines) {
  const filtered = lines.filter(Boolean);
  if (filtered.length === 0) return;
  sections.push({
    title,
    lines: filtered,
  });
}

export function buildJournalSuggestion({
  type,
  commonFields = {},
  typeFields = {},
  recentEntries = [],
}) {
  const template = getJournalTemplate(type);
  const sections = [];
  const titleCandidates = [];

  if (type === JOURNAL_TYPES.OBSERVATION) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 일상 관찰`,
      `${commonFields.childName || '아동'} 활동 반응 기록`,
    );
    pushSection(sections, '관찰', [
      commonFields.attendanceStatus ? `출결 상태는 ${attendanceLabel(commonFields.attendanceStatus)}으로 확인됨.` : '',
      typeFields.emotionState ? `정서 상태는 ${typeFields.emotionState}로 관찰됨.` : '',
      typeFields.activityName ? `${typeFields.activityName} 활동 중 반응을 중심으로 관찰함.` : '',
      recentEntries[0]?.title ? `최근 기록 흐름상 "${recentEntries[0].title}"와 연결되는 변화 여부를 함께 확인함.` : '',
    ]);
    pushSection(sections, '개입', [
      typeFields.interventionNote || '',
      commonFields.medicationGiven ? `복약 기록: ${joinDefined([commonFields.medicationName, commonFields.medicationDose]) || '복약 완료'}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.PLAY_INDIVIDUAL) {
    titleCandidates.push(
      `${typeFields.activityName || '놀이'} 참여 기록`,
      `${commonFields.childName || '아동'} 놀이 관찰`,
    );
    pushSection(sections, '놀이 참여', [
      typeFields.activityName ? `활동명: ${typeFields.activityName}.` : '',
      typeFields.participationLevel ? `참여 수준은 ${typeFields.participationLevel}으로 보였음.` : '',
      typeFields.peerInteraction ? `또래 상호작용은 ${typeFields.peerInteraction}.` : '',
      typeFields.emotionState ? `놀이 중 정서 상태는 ${typeFields.emotionState}.` : '',
    ]);
    pushSection(sections, '지원 내용', [
      typeFields.interventionNote || '',
      typeFields.nextPlan ? `다음 계획: ${typeFields.nextPlan}` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.PROGRAM_GROUP) {
    titleCandidates.push(
      `${typeFields.activityName || commonFields.title || '프로그램'} 운영 기록`,
      `${typeFields.activityName || '집단 활동'} 결과`,
    );
    pushSection(sections, '프로그램 운영', [
      typeFields.activityName ? `활동명: ${typeFields.activityName}.` : '',
      typeFields.activityGoal ? `목표: ${typeFields.activityGoal}.` : '',
      typeFields.programDuration ? `진행 시간: ${typeFields.programDuration}.` : '',
      (typeFields.participantClientIds || []).length > 0 ? `참여 아동 ${typeFields.participantClientIds.length}명을 대상으로 진행함.` : '',
    ]);
    pushSection(sections, '집단 반응', [
      typeFields.programMood ? `집단 분위기: ${typeFields.programMood}.` : '',
      typeFields.programEvaluation ? `운영 평가: ${typeFields.programEvaluation}.` : '',
      typeFields.safetyNote ? `안전 사항: ${typeFields.safetyNote}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.COUNSELING) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 상담 기록`,
      `${typeFields.counselingTopic || '정서 상담'} 진행 내용`,
    );
    pushSection(sections, '상담 내용', [
      typeFields.counselingTopic ? `상담 주제: ${typeFields.counselingTopic}.` : '',
      typeFields.mainIssue ? `주요 이슈: ${typeFields.mainIssue}.` : '',
      typeFields.intervention ? `개입 내용: ${typeFields.intervention}.` : '',
      typeFields.nextAction ? `다음 상담 계획: ${typeFields.nextAction}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.GUARDIAN_CONTACT) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 보호자 연락`,
      `${typeFields.guardianName || '보호자'} 연락 기록`,
    );
    pushSection(sections, '연락 내용', [
      typeFields.contactMethod ? `연락 방식: ${contactMethodLabel(typeFields.contactMethod)}.` : '',
      typeFields.deliveryContent ? `전달 내용: ${typeFields.deliveryContent}.` : '',
      typeFields.guardianResponse ? `보호자 반응: ${typeFields.guardianResponse}.` : '',
      typeFields.guardianFollowUp ? `후속 계획: ${typeFields.guardianFollowUp}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.ATTENDANCE_DAILY) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 출결·귀가 기록`,
      `${commonFields.childName || '아동'} 당일 출결`,
    );
    pushSection(sections, '출결', [
      commonFields.attendanceStatus ? `출결 상태는 ${attendanceLabel(commonFields.attendanceStatus)}.` : '',
      commonFields.arrivalTime ? `등원 시간: ${commonFields.arrivalTime}.` : '',
      commonFields.departureTime ? `귀가 시간: ${commonFields.departureTime}.` : '',
      commonFields.escortType ? `귀가 방식/인계자: ${commonFields.escortType}.` : '',
      commonFields.handoffNote ? `특이사항: ${commonFields.handoffNote}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.LIFE_GUIDANCE) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 생활지도 기록`,
      `${typeFields.lifeArea || '생활지도'} 관찰`,
    );
    pushSection(sections, '생활지도', [
      typeFields.lifeArea ? `지도 영역: ${typeFields.lifeArea}.` : '',
      typeFields.guidanceAction ? `지도 내용: ${typeFields.guidanceAction}.` : '',
      typeFields.guidanceResponse ? `아동 반응: ${typeFields.guidanceResponse}.` : '',
      commonFields.followUpText ? `후속 계획: ${commonFields.followUpText}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.INCIDENT_RISK) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 위험 상황 기록`,
      `${commonFields.childName || '아동'} 사고·위험 보고`,
    );
    pushSection(sections, '상황', [
      typeFields.incidentLevel ? `위험 수준: ${typeFields.incidentLevel}.` : '',
      (commonFields.riskFlags || []).length > 0 ? `위험 징후: ${commonFields.riskFlags.map(riskFlagLabel).join(', ')}.` : '',
      commonFields.riskNote ? `상세 상황: ${commonFields.riskNote}.` : '',
    ]);
    pushSection(sections, '조치', [
      typeFields.actionTaken ? `즉시 조치: ${typeFields.actionTaken}.` : '',
      typeFields.guardianNotified ? `보호자 안내 여부: ${typeFields.guardianNotified}.` : '',
      commonFields.followUpText ? `후속 계획: ${commonFields.followUpText}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.HOMEWORK_GUIDANCE) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 학습지도 기록`,
      `${typeFields.homeworkSubject || '학습'} 지원 기록`,
    );
    pushSection(sections, '학습지도', [
      typeFields.homeworkSubject ? `학습 영역: ${typeFields.homeworkSubject}.` : '',
      typeFields.learningLevel ? `현재 수준: ${typeFields.learningLevel}.` : '',
      typeFields.supportMethod ? `지원 방법: ${typeFields.supportMethod}.` : '',
      typeFields.learningOutcome ? `학습 반응: ${typeFields.learningOutcome}.` : '',
    ]);
  }

  if (type === JOURNAL_TYPES.MEAL_HEALTH) {
    titleCandidates.push(
      `${commonFields.childName || '아동'} 급간식·건강 기록`,
      `${typeFields.mealType || '건강'} 관리 기록`,
    );
    pushSection(sections, '건강 상태', [
      typeFields.mealType ? `급식 구분: ${typeFields.mealType}.` : '',
      typeFields.appetiteLevel ? `식사 상태: ${typeFields.appetiteLevel}.` : '',
      typeFields.healthCheck ? `건강 체크: ${typeFields.healthCheck}.` : '',
      typeFields.symptomNote ? `증상/메모: ${typeFields.symptomNote}.` : '',
      commonFields.medicationGiven ? `복약 기록: ${joinDefined([commonFields.medicationName, commonFields.medicationDose]) || '복약 완료'}.` : '',
    ]);
  }

  if (commonFields.followUpNeeded && commonFields.followUpText) {
    pushSection(sections, '후속 조치', [commonFields.followUpText]);
  }

  if (commonFields.guardianContactNeeded) {
    pushSection(sections, '보호자 소통', ['보호자 안내가 필요한 내용으로 후속 연락 일지 연계를 권장함.']);
  }

  const content = sections
    .map((section) => `[${section.title}]\n- ${section.lines.join('\n- ')}`)
    .join('\n\n');

  return {
    titleCandidates: titleCandidates.filter(Boolean),
    title: titleCandidates[0] || template.defaultTitle,
    summary: sections.flatMap((section) => section.lines).slice(0, 2).join(' ').slice(0, 120),
    contentSections: sections,
    followUpText: commonFields.followUpText || '',
    content,
  };
}

export function attendanceLabel(value) {
  return ATTENDANCE_OPTIONS.find((item) => item.value === value)?.label || '미기록';
}

export function contactMethodLabel(value) {
  return CONTACT_METHOD_OPTIONS.find((item) => item.value === value)?.label || '기타';
}

export function riskFlagLabel(value) {
  return RISK_FLAG_OPTIONS.find((item) => item.value === value)?.label || value;
}

export function journalTypeLabel(type) {
  return getJournalTemplate(type).label;
}
