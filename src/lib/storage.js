import { clearPhotoStore, exportPhotoBackup, importPhotoBackup } from './photoStore';
import {
  ACTIVITY_KIND_OPTIONS,
  CONSULTATION_METHOD_OPTIONS,
  INFO_PROVIDER_OPTIONS,
  JOURNAL_TYPE_OPTIONS,
  JOURNAL_TYPES,
  LEVEL_OPTIONS,
  PLAN_PERIOD_OPTIONS,
  SATISFACTION_OPTIONS,
  SOLO_PLAY_TIME_OPTIONS,
  buildJournalSuggestion,
  consultationMethodLabel,
  getJournalTemplate,
  journalTypeLabel,
} from './journalTemplates';

const KEYS = {
  JOURNALS: 'swt_journals',
  JOURNAL_DRAFTS: 'swt_journal_drafts',
  BUDGET_ITEMS: 'swt_budget_items',
  BUDGET_META: 'swt_budget_meta',
  CLIENTS: 'swt_clients',
  PREFERENCES: 'swt_preferences',
};

const CURRENT_VERSION = 6;
const DEFAULT_FAVORITES = [
  JOURNAL_TYPES.ACTIVITY_LOG,
  JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL,
  JOURNAL_TYPES.INTERVIEW_LOG,
  JOURNAL_TYPES.INITIAL_CONSULTATION,
];

function nowIso() {
  return new Date().toISOString();
}

export function genId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const StorageAdapter = {
  load(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  save(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    window.localStorage.removeItem(key);
  },
};

function defaultBudgetMeta() {
  return {
    totalBudget: 0,
    title: '센터 운영 예산',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
}

function defaultPreferences() {
  return {
    favoriteJournalTypes: DEFAULT_FAVORITES,
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeTextList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function emptyPlanRow(month = '') {
  return {
    id: genId(),
    month,
    sessionCount: '',
    playArea: '',
    activityContent: '',
    planNo: '',
    placeMaterials: '',
  };
}

function emptyPeerLevelRow() {
  return {
    id: genId(),
    childName: '',
    playLevel: '',
    notes: '',
  };
}

function emptyFamilyRow() {
  return {
    id: genId(),
    relation: '',
    name: '',
    age: '',
    disability: '',
    notes: '',
  };
}

function emptyJournal() {
  const today = new Date();
  return {
    id: genId(),
    type: JOURNAL_TYPES.ACTIVITY_LOG,
    status: 'draft',
    clientId: '',
    childName: '',
    date: today.toISOString().slice(0, 10),
    time: today.toTimeString().slice(0, 5),
    title: '',
    summary: '',
    content: '',
    tags: [],
    photos: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    collaboratorConfirmed: '',
    saverName: '',
    writerName: '',
    writerDate: today.toISOString().slice(0, 10),
    planPeriod: PLAN_PERIOD_OPTIONS[0],
    childAge: '',
    childGrade: '',
    activityStartDate: '',
    activityEndDate: '',
    weeklyCountText: '',
    activityTimeText: '',
    currentLevel: '',
    playGoal: '',
    planRows: [],
    location: '',
    participantSaverNames: '',
    participantChildrenSummary: '',
    peerLevelRows: [],
    matchingGoal: '',
    groupPlan: '',
    neededMaterials: '',
    note: '',
    consultationDate: today.toISOString().slice(0, 10),
    intervieweeName: '',
    consultationMethod: CONSULTATION_METHOD_OPTIONS[0],
    infoProvider: INFO_PROVIDER_OPTIONS[0],
    infoProviderDetail: '',
    consultationContent: '',
    futurePlan: '',
    birthDate: '',
    gender: '',
    disabilityType: '',
    disabilityLevel: '',
    emergencyContact: '',
    healthNotes: '',
    familyRows: [],
    leisureActivity: '',
    frequentPlace: '',
    soloPlayTimeRange: SOLO_PLAY_TIME_OPTIONS[0],
    toyTypeLevel: LEVEL_OPTIONS[2],
    toyQuantityLevel: LEVEL_OPTIONS[2],
    toyTypeDescription: '',
    peerActivities: '',
    peerNotes: '',
    dream: '',
    strengths: '',
    favoriteThings: '',
    serviceGoals: '',
    cautionBehavior: '',
    cautionHealth: '',
    cautionTips: '',
    outdoorPlayWish: '',
    outdoorPlayNotes: '',
    sessionNumber: '',
    cumulativeHours: '',
    saverMembers: '',
    childParticipants: '',
    activityPlanNo: '',
    activityKind: ACTIVITY_KIND_OPTIONS[0],
    activityPlace: '',
    satisfaction: SATISFACTION_OPTIONS[2],
    activitySubject: '',
    playMaterials: '',
    detailedActivities: '',
    playProcess: '',
    conversationNotes: '',
    saverOpinion: '',
    activityEvaluation: '',
  };
}

function normalizeRowArray(value, factory) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => ({ ...factory(), ...row, id: row?.id || genId() }));
}

const LEGACY_TYPE_MAP = {
  observation: JOURNAL_TYPES.ACTIVITY_LOG,
  play_individual: JOURNAL_TYPES.ACTIVITY_LOG,
  program_group: JOURNAL_TYPES.PLAY_PLAN_GROUP,
  counseling: JOURNAL_TYPES.INTERVIEW_LOG,
  guardian_contact: JOURNAL_TYPES.INTERVIEW_LOG,
  attendance_daily: JOURNAL_TYPES.ACTIVITY_LOG,
  life_guidance: JOURNAL_TYPES.ACTIVITY_LOG,
  incident_risk: JOURNAL_TYPES.ACTIVITY_LOG,
  homework_guidance: JOURNAL_TYPES.ACTIVITY_LOG,
  meal_health: JOURNAL_TYPES.ACTIVITY_LOG,
};

function normalizeJournal(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const type = JOURNAL_TYPE_OPTIONS.some((item) => item.value === raw.type)
    ? raw.type
    : (LEGACY_TYPE_MAP[raw.type] || JOURNAL_TYPES.ACTIVITY_LOG);
  const base = emptyJournal();

  return {
    ...base,
    ...raw,
    id: raw.id || genId(),
    type,
    status: raw.status === 'finalized' ? 'finalized' : 'draft',
    clientId: normalizeText(raw.clientId),
    childName: normalizeText(raw.childName || raw.name),
    date: normalizeText(raw.date) || base.date,
    time: normalizeText(raw.time) || base.time,
    title: normalizeText(raw.title) || getJournalTemplate(type).defaultTitle,
    summary: normalizeText(raw.summary),
    content: normalizeText(raw.content),
    tags: normalizeTextList(raw.tags),
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    collaboratorConfirmed: normalizeText(raw.collaboratorConfirmed),
    saverName: normalizeText(raw.saverName || raw.playSaverName || raw.guardianName),
    writerName: normalizeText(raw.writerName),
    writerDate: normalizeText(raw.writerDate) || normalizeText(raw.date) || base.writerDate,
    planPeriod: PLAN_PERIOD_OPTIONS.includes(raw.planPeriod) ? raw.planPeriod : base.planPeriod,
    childAge: normalizeText(raw.childAge),
    childGrade: normalizeText(raw.childGrade),
    activityStartDate: normalizeText(raw.activityStartDate),
    activityEndDate: normalizeText(raw.activityEndDate),
    weeklyCountText: normalizeText(raw.weeklyCountText),
    activityTimeText: normalizeText(raw.activityTimeText),
    currentLevel: normalizeText(raw.currentLevel),
    playGoal: normalizeText(raw.playGoal),
    planRows: normalizeRowArray(raw.planRows, emptyPlanRow),
    location: normalizeText(raw.location),
    participantSaverNames: normalizeText(raw.participantSaverNames),
    participantChildrenSummary: normalizeText(raw.participantChildrenSummary),
    peerLevelRows: normalizeRowArray(raw.peerLevelRows, emptyPeerLevelRow),
    matchingGoal: normalizeText(raw.matchingGoal),
    groupPlan: normalizeText(raw.groupPlan),
    neededMaterials: normalizeText(raw.neededMaterials),
    note: normalizeText(raw.note),
    consultationDate: normalizeText(raw.consultationDate || raw.date) || base.consultationDate,
    intervieweeName: normalizeText(raw.intervieweeName),
    consultationMethod: consultationMethodLabel(raw.consultationMethod) || base.consultationMethod,
    infoProvider: INFO_PROVIDER_OPTIONS.includes(raw.infoProvider) ? raw.infoProvider : base.infoProvider,
    infoProviderDetail: normalizeText(raw.infoProviderDetail),
    consultationContent: normalizeText(raw.consultationContent || raw.deliveryContent || raw.content),
    futurePlan: normalizeText(raw.futurePlan || raw.guardianFollowUp || raw.followUpText),
    birthDate: normalizeText(raw.birthDate),
    gender: normalizeText(raw.gender),
    disabilityType: normalizeText(raw.disabilityType),
    disabilityLevel: normalizeText(raw.disabilityLevel),
    emergencyContact: normalizeText(raw.emergencyContact),
    healthNotes: normalizeText(raw.healthNotes || raw.medicationNote),
    familyRows: normalizeRowArray(raw.familyRows, emptyFamilyRow),
    leisureActivity: normalizeText(raw.leisureActivity),
    frequentPlace: normalizeText(raw.frequentPlace),
    soloPlayTimeRange: SOLO_PLAY_TIME_OPTIONS.includes(raw.soloPlayTimeRange) ? raw.soloPlayTimeRange : base.soloPlayTimeRange,
    toyTypeLevel: LEVEL_OPTIONS.includes(raw.toyTypeLevel) ? raw.toyTypeLevel : base.toyTypeLevel,
    toyQuantityLevel: LEVEL_OPTIONS.includes(raw.toyQuantityLevel) ? raw.toyQuantityLevel : base.toyQuantityLevel,
    toyTypeDescription: normalizeText(raw.toyTypeDescription),
    peerActivities: normalizeText(raw.peerActivities),
    peerNotes: normalizeText(raw.peerNotes),
    dream: normalizeText(raw.dream),
    strengths: normalizeText(raw.strengths),
    favoriteThings: normalizeText(raw.favoriteThings),
    serviceGoals: normalizeText(raw.serviceGoals),
    cautionBehavior: normalizeText(raw.cautionBehavior),
    cautionHealth: normalizeText(raw.cautionHealth),
    cautionTips: normalizeText(raw.cautionTips),
    outdoorPlayWish: normalizeText(raw.outdoorPlayWish),
    outdoorPlayNotes: normalizeText(raw.outdoorPlayNotes),
    sessionNumber: normalizeText(raw.sessionNumber),
    cumulativeHours: normalizeText(raw.cumulativeHours),
    saverMembers: normalizeText(raw.saverMembers),
    childParticipants: normalizeText(raw.childParticipants),
    activityPlanNo: normalizeText(raw.activityPlanNo),
    activityKind: ACTIVITY_KIND_OPTIONS.includes(raw.activityKind) ? raw.activityKind : base.activityKind,
    activityPlace: normalizeText(raw.activityPlace || raw.location),
    satisfaction: SATISFACTION_OPTIONS.includes(raw.satisfaction) ? raw.satisfaction : base.satisfaction,
    activitySubject: normalizeText(raw.activitySubject),
    playMaterials: normalizeText(raw.playMaterials),
    detailedActivities: normalizeText(raw.detailedActivities || raw.content),
    playProcess: normalizeText(raw.playProcess),
    conversationNotes: normalizeText(raw.conversationNotes),
    saverOpinion: normalizeText(raw.saverOpinion),
    activityEvaluation: normalizeText(raw.activityEvaluation),
    createdAt: normalizeText(raw.createdAt) || nowIso(),
    updatedAt: normalizeText(raw.updatedAt) || normalizeText(raw.createdAt) || nowIso(),
  };
}

function getRawJournals() {
  return StorageAdapter.load(KEYS.JOURNALS, []);
}

function setRawJournals(journals) {
  StorageAdapter.save(KEYS.JOURNALS, journals);
}

export function createEmptyJournal(type = JOURNAL_TYPES.ACTIVITY_LOG) {
  const template = getJournalTemplate(type);
  return normalizeJournal({
    ...emptyJournal(),
    type,
    title: template.defaultTitle,
  });
}

export function getJournals() {
  const raw = getRawJournals();
  const journals = (Array.isArray(raw) ? raw : [])
    .map(normalizeJournal)
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));

  if (journals.length !== (Array.isArray(raw) ? raw.length : 0)) {
    setRawJournals(journals);
  }

  return journals;
}

export function getJournal(id) {
  return getJournals().find((journal) => journal.id === id) || null;
}

export function saveJournal(input) {
  const journals = getJournals();
  const index = journals.findIndex((journal) => journal.id === input.id);
  const normalized = normalizeJournal({
    ...input,
    createdAt: journals[index]?.createdAt || input.createdAt || nowIso(),
    updatedAt: nowIso(),
  });

  if (index >= 0) {
    journals[index] = normalized;
  } else {
    journals.unshift(normalized);
  }

  setRawJournals(journals);
  return normalized;
}

export function deleteJournal(id) {
  setRawJournals(getJournals().filter((journal) => journal.id !== id));
}

export function getJournalDraft(draftKey = 'new') {
  const drafts = StorageAdapter.load(KEYS.JOURNAL_DRAFTS, {});
  if (!drafts || typeof drafts !== 'object') return null;
  return drafts[draftKey] || null;
}

export function saveJournalDraft(draftKey, journal) {
  try {
    const drafts = StorageAdapter.load(KEYS.JOURNAL_DRAFTS, {});
    drafts[draftKey] = {
      ...journal,
      draftSavedAt: nowIso(),
    };
    StorageAdapter.save(KEYS.JOURNAL_DRAFTS, drafts);
    return true;
  } catch {
    return false;
  }
}

export function clearJournalDraft(draftKey = 'new') {
  const drafts = StorageAdapter.load(KEYS.JOURNAL_DRAFTS, {});
  if (!drafts || typeof drafts !== 'object') return;
  delete drafts[draftKey];
  StorageAdapter.save(KEYS.JOURNAL_DRAFTS, drafts);
}

export function getFavoriteJournalTypes() {
  return getPreferences().favoriteJournalTypes;
}

export function toggleFavoriteJournalType(type) {
  const preferences = getPreferences();
  const favorites = new Set(preferences.favoriteJournalTypes);
  if (favorites.has(type)) favorites.delete(type);
  else favorites.add(type);
  const next = Array.from(favorites).slice(0, 5);
  savePreferences({ ...preferences, favoriteJournalTypes: next });
  return next;
}

export function getRecentJournalTypes(limit = 3) {
  const seen = new Set();
  return getJournals()
    .map((journal) => journal.type)
    .filter((type) => {
      if (seen.has(type)) return false;
      seen.add(type);
      return true;
    })
    .slice(0, limit);
}

function getPreferences() {
  const raw = StorageAdapter.load(KEYS.PREFERENCES, defaultPreferences());
  return {
    ...defaultPreferences(),
    ...(raw && typeof raw === 'object' ? raw : {}),
  };
}

function savePreferences(preferences) {
  StorageAdapter.save(KEYS.PREFERENCES, {
    ...defaultPreferences(),
    ...preferences,
  });
}

function normalizeBudgetItem(item, fallbackDate) {
  if (!item || typeof item !== 'object') return null;
  const date = item.date || fallbackDate || new Date().toISOString().slice(0, 10);
  const createdAt = item.createdAt || `${date}T12:00:00.000Z`;
  return {
    id: item.id || genId(),
    category: item.category || 'program',
    date,
    name: item.name || '',
    amount: Number(item.amount) || 0,
    note: item.note || '',
    createdAt,
    updatedAt: item.updatedAt || createdAt,
  };
}

export function getBudgetItems() {
  const raw = StorageAdapter.load(KEYS.BUDGET_ITEMS, []);
  const fallbackDate = `${getBudgetMeta().year}-${String(getBudgetMeta().month).padStart(2, '0')}-01`;
  return (Array.isArray(raw) ? raw : []).map((item) => normalizeBudgetItem(item, fallbackDate)).filter(Boolean);
}

export function saveBudgetItem(item) {
  const items = getBudgetItems();
  const normalized = normalizeBudgetItem(item, item.date);
  const index = items.findIndex((entry) => entry.id === normalized.id);
  if (index >= 0) items[index] = { ...items[index], ...normalized, updatedAt: nowIso() };
  else items.unshift(normalized);
  StorageAdapter.save(KEYS.BUDGET_ITEMS, items);
}

export function deleteBudgetItem(id) {
  StorageAdapter.save(KEYS.BUDGET_ITEMS, getBudgetItems().filter((item) => item.id !== id));
}

export function getBudgetMeta() {
  const meta = StorageAdapter.load(KEYS.BUDGET_META, defaultBudgetMeta());
  return {
    ...defaultBudgetMeta(),
    ...(meta && typeof meta === 'object' ? meta : {}),
  };
}

export function saveBudgetMeta(meta) {
  StorageAdapter.save(KEYS.BUDGET_META, { ...getBudgetMeta(), ...meta });
}

export function getClients() {
  const raw = StorageAdapter.load(KEYS.CLIENTS, []);
  return (Array.isArray(raw) ? raw : []).map((client) => ({
    id: client.id || genId(),
    name: client.name || '',
    birthDate: client.birthDate || '',
    gender: client.gender || '',
    phone: client.phone || '',
    guardian: client.guardian || '',
    guardianPhone: client.guardianPhone || '',
    address: client.address || '',
    memo: client.memo || '',
    createdAt: client.createdAt || nowIso(),
    updatedAt: client.updatedAt || client.createdAt || nowIso(),
  }));
}

export function getClient(id) {
  return getClients().find((client) => client.id === id) || null;
}

export function saveClient(client) {
  const clients = getClients();
  const index = clients.findIndex((entry) => entry.id === client.id);
  const previous = index >= 0 ? clients[index] : null;
  const next = {
    ...previous,
    ...client,
    id: client.id || genId(),
    createdAt: previous?.createdAt || client.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  if (index >= 0) clients[index] = next;
  else clients.unshift(next);

  StorageAdapter.save(KEYS.CLIENTS, clients);

  if (previous && previous.name !== next.name) {
    const journals = getJournals().map((journal) => (
      journal.clientId === next.id ? { ...journal, childName: next.name, updatedAt: nowIso() } : journal
    ));
    setRawJournals(journals);
  }
}

export function deleteClient(id) {
  StorageAdapter.save(KEYS.CLIENTS, getClients().filter((client) => client.id !== id));
}

export function getContactLogs(clientId) {
  return getJournals()
    .filter((journal) => journal.type === JOURNAL_TYPES.INTERVIEW_LOG)
    .filter((journal) => !clientId || journal.clientId === clientId);
}

export function getContactLog(id) {
  return getContactLogs().find((entry) => entry.id === id) || null;
}

export function saveContactLog(log) {
  return saveJournal({ ...log, type: JOURNAL_TYPES.INTERVIEW_LOG });
}

export function deleteContactLog(id) {
  deleteJournal(id);
}

export function getMonthlyCareSummary({ clientId, month }) {
  const client = getClient(clientId);
  if (!client) {
    return {
      journals: [],
      typeCounts: {},
      interviewLogs: [],
      playPlans: [],
      initialConsultations: [],
      activityLogs: [],
    };
  }

  const linked = getJournals().filter((journal) => journal.clientId === clientId || (!journal.clientId && journal.childName === client.name));
  const monthly = linked.filter((journal) => !month || (journal.date || journal.writerDate || '').startsWith(month));
  const typeCounts = monthly.reduce((accumulator, journal) => {
    accumulator[journal.type] = (accumulator[journal.type] || 0) + 1;
    return accumulator;
  }, {});

  return {
    journals: monthly,
    typeCounts,
    interviewLogs: monthly.filter((journal) => journal.type === JOURNAL_TYPES.INTERVIEW_LOG),
    playPlans: monthly.filter((journal) => [JOURNAL_TYPES.PLAY_PLAN_INDIVIDUAL, JOURNAL_TYPES.PLAY_PLAN_GROUP].includes(journal.type)),
    initialConsultations: monthly.filter((journal) => journal.type === JOURNAL_TYPES.INITIAL_CONSULTATION),
    activityLogs: monthly.filter((journal) => journal.type === JOURNAL_TYPES.ACTIVITY_LOG),
  };
}

export function getDashboardSnapshot(date = new Date().toISOString().slice(0, 10)) {
  const journals = getJournals();
  const month = date.slice(0, 7);
  const monthly = journals.filter((journal) => (journal.date || journal.writerDate || '').startsWith(month));
  const draftCount = journals.filter((journal) => journal.status === 'draft').length;
  const typeCounts = monthly.reduce((accumulator, journal) => {
    accumulator[journal.type] = (accumulator[journal.type] || 0) + 1;
    return accumulator;
  }, {});

  return {
    latestJournals: journals.slice(0, 8),
    draftCount,
    monthlyTypeCounts: typeCounts,
    monthlyCount: monthly.length,
    clientCount: getClients().length,
  };
}

export function attendanceLabel(value) {
  return value || '';
}

export function exportStructuredReportData() {
  return {
    journals: getJournals(),
    clients: getClients(),
    budgetItems: getBudgetItems(),
    budgetMeta: getBudgetMeta(),
  };
}

const BACKUP_KEYS = Object.values(KEYS);

export async function exportBackup() {
  const payload = {};
  BACKUP_KEYS.forEach((key) => {
    payload[key] = StorageAdapter.load(key, null);
  });
  payload.__version = CURRENT_VERSION;
  payload.__exportedAt = nowIso();
  payload.__photos = await exportPhotoBackup();
  return payload;
}

export async function importBackup(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('올바른 백업 파일 형식이 아닙니다.');
  }

  BACKUP_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) return;
    if (data[key] === null) StorageAdapter.remove(key);
    else StorageAdapter.save(key, data[key]);
  });

  await clearPhotoStore();
  await importPhotoBackup(Array.isArray(data.__photos) ? data.__photos : []);
}

export const JournalRepository = {
  list: getJournals,
  get: getJournal,
  save: saveJournal,
  delete: deleteJournal,
  saveDraft: saveJournalDraft,
  clearDraft: clearJournalDraft,
};

export const ClientRepository = {
  list: getClients,
  get: getClient,
  save: saveClient,
  delete: deleteClient,
};

export const ContactRepository = {
  list: getContactLogs,
  get: getContactLog,
  save: saveContactLog,
  delete: deleteContactLog,
};

export const SettingsRepository = {
  getFavoriteJournalTypes,
  toggleFavoriteJournalType,
  getRecentJournalTypes,
};

export {
  ACTIVITY_KIND_OPTIONS,
  CONSULTATION_METHOD_OPTIONS,
  INFO_PROVIDER_OPTIONS,
  JOURNAL_TYPES,
  JOURNAL_TYPE_OPTIONS,
  LEVEL_OPTIONS,
  PLAN_PERIOD_OPTIONS,
  SATISFACTION_OPTIONS,
  SOLO_PLAY_TIME_OPTIONS,
  StorageAdapter,
  buildJournalSuggestion,
  consultationMethodLabel,
  getJournalTemplate,
  journalTypeLabel,
};
