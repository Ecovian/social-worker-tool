import { clearPhotoStore, exportPhotoBackup, importPhotoBackup } from './photoStore';
import {
  ATTENDANCE_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  EMOTION_OPTIONS,
  JOURNAL_TYPE_OPTIONS,
  JOURNAL_TYPES,
  MEAL_OPTIONS,
  PARTICIPATION_OPTIONS,
  RISK_FLAG_OPTIONS,
  attendanceLabel,
  buildJournalSuggestion,
  contactMethodLabel,
  getJournalTemplate,
  journalTypeLabel,
  riskFlagLabel,
} from './journalTemplates';

const KEYS = {
  JOURNALS: 'swt_journals',
  JOURNAL_DRAFTS: 'swt_journal_drafts',
  BUDGET_ITEMS: 'swt_budget_items',
  BUDGET_META: 'swt_budget_meta',
  CLIENTS: 'swt_clients',
  CONTACT_LOGS: 'swt_contact_logs',
  PREFERENCES: 'swt_preferences',
};

const CURRENT_VERSION = 4;
const DEFAULT_FAVORITE_TYPES = [
  JOURNAL_TYPES.OBSERVATION,
  JOURNAL_TYPES.ATTENDANCE_DAILY,
  JOURNAL_TYPES.PROGRAM_GROUP,
  JOURNAL_TYPES.GUARDIAN_CONTACT,
];

function createLocalStorageAdapter() {
  return {
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
}

/**
 * @typedef {ReturnType<typeof createLocalStorageAdapter>} StorageAdapter
 */
export const StorageAdapter = createLocalStorageAdapter();

/**
 * @typedef {Object} JournalRecord
 * @property {string} id
 * @property {string} type
 * @property {string} status
 * @property {string} clientId
 * @property {string} childName
 * @property {string} date
 * @property {string} time
 * @property {string} title
 * @property {string} summary
 * @property {string[]} tags
 * @property {Array<string|object>} photos
 */

/**
 * @typedef {Object.<string, Object>} JournalTypePayloadMap
 */

/**
 * @typedef {Object} GroupJournalGenerationRequest
 * @property {string} journalId
 * @property {string[]} participantClientIds
 */

/**
 * @typedef {Object} MonthlyCareSummaryRequest
 * @property {string} clientId
 * @property {string} month
 */

function nowIso() {
  return new Date().toISOString();
}

export function genId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function defaultBudgetMeta() {
  return {
    totalBudget: 0,
    title: '센터 운영 예산',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
}

function normalizeTextList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
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

function defaultPreferences() {
  return {
    favoriteJournalTypes: DEFAULT_FAVORITE_TYPES,
  };
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

function emptyJournal() {
  const today = new Date();

  return {
    id: genId(),
    type: JOURNAL_TYPES.OBSERVATION,
    status: 'draft',
    clientId: '',
    childName: '',
    date: today.toISOString().slice(0, 10),
    time: today.toTimeString().slice(0, 5),
    title: '',
    summary: '',
    tags: [],
    photos: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    content: '',
    attendanceStatus: 'present',
    arrivalTime: '',
    departureTime: '',
    escortType: '',
    handoffNote: '',
    medicationGiven: false,
    medicationName: '',
    medicationDose: '',
    medicationNote: '',
    riskFlags: [],
    riskNote: '',
    followUpNeeded: false,
    followUpText: '',
    guardianContactNeeded: false,
    linkedGuardianContactId: '',
    activityName: '',
    activityGoal: '',
    participationLevel: '',
    peerInteraction: '',
    emotionState: '',
    interventionNote: '',
    nextPlan: '',
    participantClientIds: [],
    sourceGroupJournalId: '',
    generatedFromGroup: false,
    programDuration: '',
    programMood: '',
    programEvaluation: '',
    safetyNote: '',
    counselingTopic: '',
    mainIssue: '',
    intervention: '',
    nextAction: '',
    guardianName: '',
    contactMethod: CONTACT_METHOD_OPTIONS[0].value,
    deliveryContent: '',
    guardianResponse: '',
    guardianFollowUp: '',
    linkedJournalId: '',
    lifeArea: '',
    guidanceAction: '',
    guidanceResponse: '',
    incidentLevel: '주의',
    actionTaken: '',
    guardianNotified: '',
    homeworkSubject: '',
    learningLevel: '',
    supportMethod: '',
    learningOutcome: '',
    mealType: '',
    appetiteLevel: '',
    healthCheck: '',
    symptomNote: '',
  };
}

function normalizeJournal(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const base = emptyJournal();
  const type = JOURNAL_TYPE_OPTIONS.some((item) => item.value === raw.type)
    ? raw.type
    : JOURNAL_TYPES.OBSERVATION;

  return {
    ...base,
    ...raw,
    id: raw.id || genId(),
    type,
    status: raw.status === 'finalized' ? 'finalized' : 'draft',
    clientId: raw.clientId || '',
    childName: raw.childName || raw.name || '',
    date: raw.date || base.date,
    time: raw.time || base.time,
    title: raw.title || '',
    summary: raw.summary || '',
    tags: normalizeTextList(raw.tags),
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    content: raw.content || '',
    attendanceStatus: raw.attendanceStatus || raw.attendance || base.attendanceStatus,
    arrivalTime: raw.arrivalTime || '',
    departureTime: raw.departureTime || '',
    escortType: raw.escortType || '',
    handoffNote: raw.handoffNote || '',
    medicationGiven: Boolean(raw.medicationGiven),
    medicationName: raw.medicationName || '',
    medicationDose: raw.medicationDose || '',
    medicationNote: raw.medicationNote || '',
    riskFlags: normalizeTextList(raw.riskFlags),
    riskNote: raw.riskNote || '',
    followUpNeeded: Boolean(raw.followUpNeeded),
    followUpText: raw.followUpText || '',
    guardianContactNeeded: Boolean(raw.guardianContactNeeded),
    linkedGuardianContactId: raw.linkedGuardianContactId || '',
    activityName: raw.activityName || '',
    activityGoal: raw.activityGoal || '',
    participationLevel: raw.participationLevel || '',
    peerInteraction: raw.peerInteraction || '',
    emotionState: raw.emotionState || '',
    interventionNote: raw.interventionNote || '',
    nextPlan: raw.nextPlan || '',
    participantClientIds: normalizeTextList(raw.participantClientIds),
    sourceGroupJournalId: raw.sourceGroupJournalId || '',
    generatedFromGroup: Boolean(raw.generatedFromGroup),
    programDuration: raw.programDuration || '',
    programMood: raw.programMood || '',
    programEvaluation: raw.programEvaluation || '',
    safetyNote: raw.safetyNote || '',
    counselingTopic: raw.counselingTopic || '',
    mainIssue: raw.mainIssue || '',
    intervention: raw.intervention || '',
    nextAction: raw.nextAction || '',
    guardianName: raw.guardianName || '',
    contactMethod: raw.contactMethod || base.contactMethod,
    deliveryContent: raw.deliveryContent || raw.summary || '',
    guardianResponse: raw.guardianResponse || '',
    guardianFollowUp: raw.guardianFollowUp || '',
    linkedJournalId: raw.linkedJournalId || '',
    lifeArea: raw.lifeArea || '',
    guidanceAction: raw.guidanceAction || '',
    guidanceResponse: raw.guidanceResponse || '',
    incidentLevel: raw.incidentLevel || base.incidentLevel,
    actionTaken: raw.actionTaken || '',
    guardianNotified: raw.guardianNotified || '',
    homeworkSubject: raw.homeworkSubject || '',
    learningLevel: raw.learningLevel || '',
    supportMethod: raw.supportMethod || '',
    learningOutcome: raw.learningOutcome || '',
    mealType: raw.mealType || '',
    appetiteLevel: raw.appetiteLevel || '',
    healthCheck: raw.healthCheck || '',
    symptomNote: raw.symptomNote || '',
    createdAt: raw.createdAt || nowIso(),
    updatedAt: raw.updatedAt || raw.createdAt || nowIso(),
  };
}

function migrateLegacyJournal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (JOURNAL_TYPE_OPTIONS.some((item) => item.value === raw.type)) {
    return normalizeJournal(raw);
  }

  return normalizeJournal({
    ...raw,
    type: JOURNAL_TYPES.OBSERVATION,
    attendanceStatus: raw.attendance,
    followUpText: raw.followUpText || (raw.followUpNeeded ? '추가 관찰 및 후속 확인이 필요함.' : ''),
    summary: raw.summary || '',
  });
}

function migrateLegacyContactLog(raw) {
  if (!raw || typeof raw !== 'object') return null;

  return normalizeJournal({
    id: raw.id || genId(),
    type: JOURNAL_TYPES.GUARDIAN_CONTACT,
    status: 'finalized',
    clientId: raw.clientId || '',
    childName: raw.childName || '',
    date: raw.date || new Date().toISOString().slice(0, 10),
    time: raw.time || '17:00',
    title: raw.title || '보호자 연락 기록',
    summary: raw.summary || '',
    guardianName: raw.guardianName || '',
    contactMethod: raw.type || 'call',
    deliveryContent: raw.summary || '',
    guardianFollowUp: raw.actionItems || '',
    createdAt: raw.createdAt || nowIso(),
    updatedAt: raw.updatedAt || raw.createdAt || nowIso(),
  });
}

function loadRawJournals() {
  return StorageAdapter.load(KEYS.JOURNALS, []);
}

function saveRawJournals(journals) {
  StorageAdapter.save(KEYS.JOURNALS, journals);
}

function migrateJournalsIfNeeded() {
  const raw = loadRawJournals();
  const safeRaw = Array.isArray(raw) ? raw : [];
  const migrated = safeRaw
    .map(migrateLegacyJournal)
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));

  const legacyContactLogs = StorageAdapter.load(KEYS.CONTACT_LOGS, []);
  const safeContactLogs = Array.isArray(legacyContactLogs) ? legacyContactLogs : [];
  let didChange = migrated.length !== safeRaw.length;

  if (safeContactLogs.length > 0) {
    const migratedContacts = safeContactLogs.map(migrateLegacyContactLog).filter(Boolean);
    const existingIds = new Set(migrated.map((journal) => journal.id));
    migratedContacts.forEach((entry) => {
      if (!existingIds.has(entry.id)) {
        migrated.unshift(entry);
      }
    });
    StorageAdapter.save(KEYS.CONTACT_LOGS, []);
    didChange = true;
  }

  if (didChange) {
    saveRawJournals(migrated);
  }

  return migrated;
}

export function createEmptyJournal(type = JOURNAL_TYPES.OBSERVATION) {
  const template = getJournalTemplate(type);
  return normalizeJournal({
    ...emptyJournal(),
    type,
    title: template.defaultTitle,
  });
}

export function getJournals() {
  return migrateJournalsIfNeeded();
}

export function getJournal(id) {
  return getJournals().find((journal) => journal.id === id) || null;
}

function upsertJournalList(journals, journal) {
  const index = journals.findIndex((item) => item.id === journal.id);
  if (index >= 0) {
    journals[index] = journal;
  } else {
    journals.unshift(journal);
  }
}

function getClientNameMap() {
  return new Map(getClients().map((client) => [client.id, client.name]));
}

function buildGuardianContactFromSource(sourceJournal, clientNameMap) {
  const typeFields = {
    guardianName: sourceJournal.guardianName,
    contactMethod: 'call',
    deliveryContent: `${journalTypeLabel(sourceJournal.type)} 내용을 보호자에게 공유할 예정임.`,
    guardianFollowUp: sourceJournal.followUpText || '',
  };
  const suggestion = buildJournalSuggestion({
    type: JOURNAL_TYPES.GUARDIAN_CONTACT,
    commonFields: sourceJournal,
    typeFields,
    recentEntries: [],
  });

  return normalizeJournal({
    type: JOURNAL_TYPES.GUARDIAN_CONTACT,
    status: 'draft',
    clientId: sourceJournal.clientId,
    childName: sourceJournal.childName || clientNameMap.get(sourceJournal.clientId) || '',
    date: sourceJournal.date,
    time: sourceJournal.time,
    title: `${sourceJournal.childName || '아동'} 보호자 연락`,
    summary: suggestion.summary,
    content: suggestion.content,
    guardianName: sourceJournal.guardianName || '',
    contactMethod: 'call',
    deliveryContent: typeFields.deliveryContent,
    guardianFollowUp: sourceJournal.followUpText || '',
    linkedJournalId: sourceJournal.id,
  });
}

function buildGroupDraft(groupJournal, client, existingDraft) {
  const suggestion = buildJournalSuggestion({
    type: JOURNAL_TYPES.PLAY_INDIVIDUAL,
    commonFields: {
      childName: client.name,
      attendanceStatus: groupJournal.attendanceStatus,
      followUpNeeded: groupJournal.followUpNeeded,
      followUpText: groupJournal.followUpText,
    },
    typeFields: {
      activityName: groupJournal.activityName || groupJournal.title,
      participationLevel: existingDraft?.participationLevel || '',
      peerInteraction: existingDraft?.peerInteraction || '',
      emotionState: existingDraft?.emotionState || '',
      interventionNote: existingDraft?.interventionNote || '',
      nextPlan: existingDraft?.nextPlan || '',
    },
    recentEntries: [],
  });

  return normalizeJournal({
    ...existingDraft,
    type: JOURNAL_TYPES.PLAY_INDIVIDUAL,
    status: existingDraft?.status === 'finalized' ? 'finalized' : 'draft',
    clientId: client.id,
    childName: client.name,
    date: groupJournal.date,
    time: groupJournal.time,
    title: `${groupJournal.activityName || groupJournal.title || '집단 활동'} 참여 관찰`,
    summary: suggestion.summary,
    content: existingDraft?.content || suggestion.content,
    activityName: groupJournal.activityName || groupJournal.title,
    activityGoal: groupJournal.activityGoal,
    participationLevel: existingDraft?.participationLevel || '',
    peerInteraction: existingDraft?.peerInteraction || '',
    emotionState: existingDraft?.emotionState || '',
    interventionNote: existingDraft?.interventionNote || '',
    nextPlan: existingDraft?.nextPlan || '',
    attendanceStatus: existingDraft?.attendanceStatus || groupJournal.attendanceStatus || 'present',
    followUpNeeded: existingDraft?.followUpNeeded || groupJournal.followUpNeeded,
    followUpText: existingDraft?.followUpText || groupJournal.followUpText,
    sourceGroupJournalId: groupJournal.id,
    generatedFromGroup: true,
    participantClientIds: groupJournal.participantClientIds,
  });
}

function handleLinkedDrafts(journal, journals) {
  const clients = getClients();
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const clientNameMap = getClientNameMap();
  let linkedGuardianContactId = journal.linkedGuardianContactId || '';

  if (
    [JOURNAL_TYPES.OBSERVATION, JOURNAL_TYPES.PLAY_INDIVIDUAL, JOURNAL_TYPES.INCIDENT_RISK].includes(journal.type)
    && journal.guardianContactNeeded
    && !linkedGuardianContactId
  ) {
    const draft = buildGuardianContactFromSource(journal, clientNameMap);
    linkedGuardianContactId = draft.id;
    journals.unshift(draft);
  }

  if (journal.type === JOURNAL_TYPES.PROGRAM_GROUP && journal.participantClientIds.length > 0) {
    journal.participantClientIds.forEach((clientId) => {
      const client = clientMap.get(clientId);
      if (!client) return;

      const existingDraft = journals.find((entry) => (
        entry.sourceGroupJournalId === journal.id
        && entry.clientId === clientId
        && entry.generatedFromGroup
        && entry.type === JOURNAL_TYPES.PLAY_INDIVIDUAL
      ));

      if (existingDraft && existingDraft.status === 'finalized') return;

      const draft = buildGroupDraft(journal, client, existingDraft);
      upsertJournalList(journals, draft);
    });
  }

  return {
    ...journal,
    linkedGuardianContactId,
  };
}

export function saveJournal(input) {
  const journals = getJournals();
  const existing = journals.find((item) => item.id === input.id);
  const normalized = normalizeJournal({
    ...existing,
    ...input,
    createdAt: existing?.createdAt || input.createdAt || nowIso(),
    updatedAt: nowIso(),
  });
  const withLinkedDrafts = handleLinkedDrafts(normalized, journals);
  upsertJournalList(journals, withLinkedDrafts);
  saveRawJournals(
    journals.sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
  );
  return withLinkedDrafts;
}

export function resyncGroupDrafts(groupJournalId) {
  const journals = getJournals();
  const groupJournal = journals.find((journal) => journal.id === groupJournalId && journal.type === JOURNAL_TYPES.PROGRAM_GROUP);
  if (!groupJournal) return 0;

  const clients = new Map(getClients().map((client) => [client.id, client]));
  let updatedCount = 0;

  groupJournal.participantClientIds.forEach((clientId) => {
    const client = clients.get(clientId);
    const existingDraft = journals.find((entry) => (
      entry.sourceGroupJournalId === groupJournal.id
      && entry.clientId === clientId
      && entry.generatedFromGroup
      && entry.type === JOURNAL_TYPES.PLAY_INDIVIDUAL
    ));

    if (!client || !existingDraft || existingDraft.status === 'finalized') return;

    const synced = buildGroupDraft(groupJournal, client, existingDraft);
    upsertJournalList(journals, synced);
    updatedCount += 1;
  });

  saveRawJournals(journals);
  return updatedCount;
}

export function deleteJournal(id) {
  const journals = getJournals().filter((journal) => (
    journal.id !== id && journal.sourceGroupJournalId !== id && journal.linkedJournalId !== id
  ));
  saveRawJournals(journals);
}

export function getLinkedJournalChildren(id) {
  return getJournals().filter((journal) => journal.sourceGroupJournalId === id || journal.linkedJournalId === id);
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
  const set = new Set(preferences.favoriteJournalTypes);
  if (set.has(type)) {
    set.delete(type);
  } else {
    set.add(type);
  }
  const next = Array.from(set).slice(0, 4);
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

export function getBudgetItems() {
  const raw = StorageAdapter.load(KEYS.BUDGET_ITEMS, []);
  const safeRaw = Array.isArray(raw) ? raw : [];
  const fallbackDate = `${getBudgetMeta().year}-${String(getBudgetMeta().month).padStart(2, '0')}-01`;
  const normalized = safeRaw.map((item) => normalizeBudgetItem(item, fallbackDate)).filter(Boolean);
  if (normalized.length !== safeRaw.length) {
    StorageAdapter.save(KEYS.BUDGET_ITEMS, normalized);
  }
  return normalized;
}

export function saveBudgetItem(item) {
  const items = getBudgetItems();
  const normalized = normalizeBudgetItem(item, item.date);
  const index = items.findIndex((entry) => entry.id === normalized.id);

  if (index >= 0) {
    items[index] = {
      ...items[index],
      ...normalized,
      updatedAt: nowIso(),
    };
  } else {
    items.unshift(normalized);
  }

  StorageAdapter.save(KEYS.BUDGET_ITEMS, items);
}

export function deleteBudgetItem(id) {
  StorageAdapter.save(
    KEYS.BUDGET_ITEMS,
    getBudgetItems().filter((item) => item.id !== id),
  );
}

export function getBudgetMeta() {
  const meta = StorageAdapter.load(KEYS.BUDGET_META, defaultBudgetMeta());
  return {
    ...defaultBudgetMeta(),
    ...(meta && typeof meta === 'object' ? meta : {}),
  };
}

export function saveBudgetMeta(meta) {
  StorageAdapter.save(KEYS.BUDGET_META, {
    ...getBudgetMeta(),
    ...meta,
  });
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

  if (index >= 0) {
    clients[index] = next;
  } else {
    clients.unshift(next);
  }

  StorageAdapter.save(KEYS.CLIENTS, clients);

  if (previous && previous.name !== next.name) {
    const journals = getJournals().map((journal) => {
      if (journal.clientId !== next.id) return journal;
      return {
        ...journal,
        childName: next.name,
        updatedAt: nowIso(),
      };
    });
    saveRawJournals(journals);
  }
}

export function deleteClient(id) {
  StorageAdapter.save(
    KEYS.CLIENTS,
    getClients().filter((client) => client.id !== id),
  );
}

export function getContactLogs(clientId) {
  return getJournals()
    .filter((journal) => journal.type === JOURNAL_TYPES.GUARDIAN_CONTACT)
    .filter((journal) => !clientId || journal.clientId === clientId);
}

export function getContactLog(id) {
  return getContactLogs().find((entry) => entry.id === id) || null;
}

export function saveContactLog(log) {
  return saveJournal({
    ...log,
    type: JOURNAL_TYPES.GUARDIAN_CONTACT,
  });
}

export function deleteContactLog(id) {
  deleteJournal(id);
}

export function saveAttendanceBulk({ date, entries }) {
  const journals = getJournals();
  const clients = new Map(getClients().map((client) => [client.id, client]));
  const saved = [];

  entries.forEach((entry) => {
    const client = clients.get(entry.clientId);
    if (!client) return;

    const existing = journals.find((journal) => (
      journal.type === JOURNAL_TYPES.ATTENDANCE_DAILY
      && journal.date === date
      && journal.clientId === entry.clientId
    ));

    const journal = saveJournal({
      ...existing,
      type: JOURNAL_TYPES.ATTENDANCE_DAILY,
      status: entry.status || existing?.status || 'draft',
      clientId: entry.clientId,
      childName: client.name,
      date,
      time: existing?.time || '16:00',
      title: `${client.name} 출결·귀가 기록`,
      summary: `${attendanceLabel(entry.attendanceStatus)} / 귀가 ${entry.departureTime ? '확인' : '미확인'}`,
      attendanceStatus: entry.attendanceStatus || 'present',
      arrivalTime: entry.arrivalTime || '',
      departureTime: entry.departureTime || '',
      escortType: entry.escortType || '',
      handoffNote: entry.handoffNote || '',
      content: entry.handoffNote || '',
    });

    saved.push(journal);
  });

  return saved;
}

function belongsToClient(journal, clientId, clientName) {
  return journal.clientId === clientId || (!journal.clientId && clientName && journal.childName === clientName);
}

function countBy(list, keyGetter) {
  return list.reduce((accumulator, item) => {
    const key = keyGetter(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

export function getMonthlyCareSummary({ clientId, month }) {
  const client = getClient(clientId);
  if (!client) {
    return {
      journals: [],
      typeCounts: {},
      attendanceCounts: {},
      riskCount: 0,
      guardianContacts: [],
      followUps: [],
      topActivities: [],
    };
  }

  const journals = getJournals().filter((journal) => belongsToClient(journal, clientId, client.name));
  const monthly = journals.filter((journal) => (journal.date || '').startsWith(month));
  const guardianContacts = monthly.filter((journal) => journal.type === JOURNAL_TYPES.GUARDIAN_CONTACT);

  return {
    journals: monthly,
    typeCounts: countBy(monthly, (journal) => journal.type),
    attendanceCounts: countBy(monthly, (journal) => journal.attendanceStatus || 'unknown'),
    riskCount: monthly.filter((journal) => (journal.riskFlags || []).length > 0 || journal.type === JOURNAL_TYPES.INCIDENT_RISK).length,
    guardianContacts,
    followUps: monthly.filter((journal) => journal.followUpNeeded),
    topActivities: Object.entries(
      countBy(
        monthly.filter((journal) => journal.activityName),
        (journal) => journal.activityName,
      ),
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5),
  };
}

export function getDashboardSnapshot(date = new Date().toISOString().slice(0, 10)) {
  const journals = getJournals();
  const clients = getClients();
  const todayAttendance = journals.filter((journal) => journal.type === JOURNAL_TYPES.ATTENDANCE_DAILY && journal.date === date);
  const attendanceClientIds = new Set(todayAttendance.map((journal) => journal.clientId));
  const missingAttendanceClients = clients.filter((client) => !attendanceClientIds.has(client.id));
  const missingDeparture = todayAttendance.filter((journal) => journal.attendanceStatus !== 'absent' && !journal.departureTime);
  const followUpNeeded = journals.filter((journal) => journal.followUpNeeded && journal.status !== 'finalized');
  const guardianPending = journals.filter((journal) => (
    journal.type !== JOURNAL_TYPES.GUARDIAN_CONTACT
    && journal.guardianContactNeeded
    && !journal.linkedGuardianContactId
  ));

  return {
    missingAttendanceClients,
    missingDeparture,
    followUpNeeded,
    guardianPending,
    todayAttendance,
    latestJournals: journals.slice(0, 8),
  };
}

export function exportStructuredReportData() {
  const journals = getJournals();
  return {
    journals,
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
    if (data[key] === null) {
      StorageAdapter.remove(key);
    } else {
      StorageAdapter.save(key, data[key]);
    }
  });

  await clearPhotoStore();
  await importPhotoBackup(Array.isArray(data.__photos) ? data.__photos : []);
  migrateJournalsIfNeeded();
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
  ATTENDANCE_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  EMOTION_OPTIONS,
  JOURNAL_TYPES,
  JOURNAL_TYPE_OPTIONS,
  MEAL_OPTIONS,
  PARTICIPATION_OPTIONS,
  RISK_FLAG_OPTIONS,
  attendanceLabel,
  buildJournalSuggestion,
  contactMethodLabel,
  getJournalTemplate,
  journalTypeLabel,
  riskFlagLabel,
};
