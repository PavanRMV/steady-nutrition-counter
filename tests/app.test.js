import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, DEFAULT_TARGETS, emptyState, validateEntry, calculateTotals, carbTotalLabel, carbEntryLabel,
  nutrientStatus, addEntry, updateEntry, deleteEntry, setWeight, setTargets,
  serializeBackup, parseBackup, recentLoggedDays, migrateState, loadStoredState, persistStoredState,
  REMINDER_INTERVAL_MS, REMINDER_MESSAGE, enableReminder, checkReminder,
  loadReminderSetting, persistReminderSetting, notifyReminder
} from '../app.js';

 test('enabling reminders schedules the first alert exactly three hours later without firing immediately', () => {
  const now = Date.UTC(2026, 8, 24, 12);
  assert.equal(REMINDER_MESSAGE, 'eat eat eat!!!');
  assert.equal(REMINDER_INTERVAL_MS, 3 * 60 * 60 * 1000);
  assert.deepEqual(enableReminder(now), { enabled: true, nextAt: now + REMINDER_INTERVAL_MS });
});

test('due reminders fire once and advance past now, including catch-up after reopen', () => {
  const start = Date.UTC(2026, 8, 24, 12);
  const scheduled = enableReminder(start);
  assert.deepEqual(checkReminder(scheduled, start + REMINDER_INTERVAL_MS - 1), { due: false, setting: scheduled });
  const caughtUp = checkReminder(scheduled, start + REMINDER_INTERVAL_MS * 3 + 5);
  assert.equal(caughtUp.due, true);
  assert.equal(caughtUp.setting.nextAt, start + REMINDER_INTERVAL_MS * 4);
  assert.equal(checkReminder(caughtUp.setting, start + REMINDER_INTERVAL_MS * 3 + 5).due, false);
});

test('reminder setting persists safely and malformed data falls back to disabled', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const setting = enableReminder(1000);
  assert.equal(persistReminderSetting(storage, setting).ok, true);
  assert.deepEqual(loadReminderSetting(storage), setting);
  memory.set('steady-gain-reminder-v1', '{bad');
  assert.deepEqual(loadReminderSetting(storage), { enabled: false, nextAt: null });
});

test('system reminder uses the service worker only with granted permission', async () => {
  const shown = [];
  assert.equal(await notifyReminder('denied', message => shown.push(message)), false);
  assert.equal(await notifyReminder('granted', message => shown.push(message)), true);
  assert.deepEqual(shown, ['eat eat eat!!!']);
});

const entry = (overrides = {}) => ({ id: 'a', name: 'Oats', calories: 500, protein: 25, fibre: 8, carbs: 70, ...overrides });

test('calculates totals and remaining or over target values', () => {
  const totals = calculateTotals([entry(), entry({ id: 'b', calories: 2300, protein: 90, fibre: 30 })]);
  assert.deepEqual(totals, { calories: 2800, protein: 115, fibre: 38, carbs: 140, unknownCarbEntries: 0, hasUnknownCarbs: false });
  assert.deepEqual(nutrientStatus(2800, 2650), { amount: 150, label: 'over', percent: 100, rawPercent: 105.7 });
  assert.deepEqual(nutrientStatus(25, 110), { amount: 85, label: 'remaining', percent: 22.7, rawPercent: 22.7 });
});

test('validates food names and rejects negative or invalid nutrients', () => {
  assert.equal(validateEntry(entry()).valid, true);
  assert.match(validateEntry(entry({ name: ' ' })).errors.name, /required/i);
  for (const field of ['calories', 'protein', 'fibre', 'carbs']) {
    assert.match(validateEntry(entry({ [field]: -1 })).errors[field], /zero or greater/i);
    assert.match(validateEntry(entry({ [field]: 'not-a-number' })).errors[field], /valid number/i);
  }
});

test('keeps entries and weight isolated by date', () => {
  let state = emptyState();
  state = addEntry(state, '2026-09-20', entry());
  state = addEntry(state, '2026-09-21', entry({ id: 'b', name: 'Rice' }));
  state = setWeight(state, '2026-09-20', 60.2);
  assert.equal(state.days['2026-09-20'].entries[0].name, 'Oats');
  assert.equal(state.days['2026-09-21'].entries[0].name, 'Rice');
  assert.equal(state.days['2026-09-20'].weight, 60.2);
  assert.equal(state.days['2026-09-21'].weight, null);
});

test('edits and deletes an entry without mutating input state', () => {
  const original = addEntry(emptyState(), '2026-09-21', entry());
  const edited = updateEntry(original, '2026-09-21', 'a', entry({ name: 'Overnight oats', calories: 550 }));
  const deleted = deleteEntry(edited, '2026-09-21', 'a');
  assert.equal(original.days['2026-09-21'].entries[0].name, 'Oats');
  assert.equal(edited.days['2026-09-21'].entries[0].calories, 550);
  assert.equal(deleted.days['2026-09-21'].entries.length, 0);
});

test('updates valid targets and rejects non-positive target values', () => {
  const state = setTargets(emptyState(), { calories: 2800, protein: 120, fibre: 40 });
  assert.deepEqual(state.targets, { calories: 2800, protein: 120, fibre: 40 });
  assert.throws(() => setTargets(state, { calories: 0, protein: 120, fibre: 40 }), /greater than zero/i);
  assert.deepEqual(DEFAULT_TARGETS, { calories: 2650, protein: 110, fibre: 35 });
  assert.match(STORAGE_KEY, /v1/);
});

test('backup round-trips and malformed or incompatible backups are rejected', () => {
  const state = addEntry(emptyState(), '2026-09-21', entry());
  assert.deepEqual(parseBackup(serializeBackup(state)), state);
  assert.throws(() => parseBackup('{oops'), /valid JSON/i);
  assert.throws(() => parseBackup(JSON.stringify({ version: 99, targets: {}, days: {} })), /version/i);
  assert.throws(() => parseBackup(JSON.stringify({ version: 1, targets: DEFAULT_TARGETS, days: { bad: {} } })), /date/i);
  assert.throws(() => parseBackup(JSON.stringify({ version: 1, targets: DEFAULT_TARGETS, days: { '2026-09-21': { weight: null, entries: [entry({ calories: -5 })] } } })), /entry/i);
  assert.throws(() => parseBackup(JSON.stringify({ version: 2, targets: DEFAULT_TARGETS, days: { '2026-09-21': { weight: null, entries: [entry({ carbs: 'not-a-number' })] } } })), /entry/i);
  assert.throws(() => parseBackup(JSON.stringify({ version: 2, targets: DEFAULT_TARGETS, days: { '2026-09-21': { weight: null, entries: [entry({ carbs: null })] } } })), /entry/i);
});

test('backup dates must be real calendar dates and permit leap days', () => {
  const backup = date => JSON.stringify({ version: 1, targets: DEFAULT_TARGETS, days: { [date]: { weight: null, entries: [] } } });
  for (const date of ['2026-02-29', '2026-02-31', '2026-04-31']) assert.throws(() => parseBackup(backup(date)), /date/i, date);
  assert.ok(parseBackup(backup('2024-02-29')).days['2024-02-29']);
});

test('history returns the most recent logged dates with summaries', () => {
  let state = emptyState();
  for (let day = 1; day <= 9; day += 1) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    state = addEntry(state, date, entry({ id: String(day), calories: day * 100 }));
  }
  const history = recentLoggedDays(state, 7);
  assert.equal(history.length, 7);
  assert.equal(history[0].date, '2026-09-09');
  assert.equal(history[0].totals.calories, 900);
  assert.equal(history.at(-1).date, '2026-09-03');
});

test('legacy entries migrate and catalog metadata survives add edit delete and backup', () => {
  const legacy = { targets: DEFAULT_TARGETS, days: { '2026-09-21': { weight: null, entries: [entry()] } } };
  const migrated = parseBackup(JSON.stringify(legacy));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.days['2026-09-21'].entries[0].carbs, 70);
  const rich = entry({ foodId: 'walnut-half', source: 'built-in', unit: 'half', quantity: 2, calories: 26.2, protein: 0.6, fibre: 0.28 });
  let state = addEntry(emptyState(), '2026-09-22', rich);
  assert.equal(state.days['2026-09-22'].entries[0].quantity, 2);
  state = updateEntry(state, '2026-09-22', 'a', { ...rich, quantity: 3, calories: 39.3 });
  assert.equal(state.days['2026-09-22'].entries[0].foodId, 'walnut-half');
  assert.deepEqual(parseBackup(serializeBackup(state)), state);
  state = deleteEntry(state, '2026-09-22', 'a');
  assert.equal(state.days['2026-09-22'].entries.length, 0);
});

test('corrupt or unsupported stored data is preserved and blocks writes until discarded', () => {
  for (const raw of ['{broken', 'null', '[]', '{}', JSON.stringify({ version: 99, targets: {}, days: {} })]) {
    let writes = 0;
    const storage = { getItem: () => raw, setItem: () => { writes += 1; } };
    const loaded = loadStoredState(storage);
    assert.equal(loaded.recovery.raw, raw);
    assert.match(loaded.error, /recover/i);
    assert.equal(persistStoredState(storage, loaded.state, Boolean(loaded.recovery)).ok, false);
    assert.equal(writes, 0);
  }
});

test('version 1 entries preserve unknown carbohydrates without inventing zero', () => {
  const old = { version: 1, targets: DEFAULT_TARGETS, days: { '2026-09-21': { weight: null, entries: [{ id: 'old', name: 'Legacy meal', calories: 200, protein: 10, fibre: 3 }] } } };
  const migrated = parseBackup(JSON.stringify(old));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.days['2026-09-21'].entries[0].carbs, null);
  assert.equal(migrated.days['2026-09-21'].entries[0].carbsUnknown, true);
  assert.deepEqual(calculateTotals(migrated.days['2026-09-21'].entries), { calories: 200, protein: 10, fibre: 3, carbs: 0, unknownCarbEntries: 1, hasUnknownCarbs: true });
  assert.deepEqual(parseBackup(serializeBackup(migrated)), migrated);
  const legacyNull = { ...old, days: { '2026-09-21': { weight: null, entries: [{ ...old.days['2026-09-21'].entries[0], carbs: null }] } } };
  assert.equal(parseBackup(JSON.stringify(legacyNull)).days['2026-09-21'].entries[0].carbsUnknown, true);
});

test('carbohydrate UI labels disclose known-only totals and unavailable legacy values', () => {
  const totals = calculateTotals([entry(), entry({ id: 'old', carbs: null, carbsUnknown: true })]);
  assert.equal(carbTotalLabel(totals), 'At least 70 g known carbs · 1 legacy entry has unknown carbs');
  assert.equal(carbEntryLabel({ carbs: null, carbsUnknown: true }), 'Carbs unavailable for legacy entry');
  assert.equal(carbEntryLabel(entry()), '70g carbs');
});

test('editing a legacy entry with supplied carbs resolves its unknown status', () => {
  const old = { version: 1, targets: DEFAULT_TARGETS, days: { '2026-09-21': { weight: null, entries: [{ id: 'old', name: 'Legacy meal', calories: 200, protein: 10, fibre: 3 }] } } };
  const migrated = parseBackup(JSON.stringify(old));
  const resolved = updateEntry(migrated, '2026-09-21', 'old', { ...migrated.days['2026-09-21'].entries[0], carbs: 32 });
  const item = resolved.days['2026-09-21'].entries[0];
  assert.equal(item.carbs, 32);
  assert.equal(item.carbsUnknown, undefined);
  assert.deepEqual(calculateTotals([item]), { calories: 200, protein: 10, fibre: 3, carbs: 32, unknownCarbEntries: 0, hasUnknownCarbs: false });
});

test('storage read and write failures return visible error contracts', () => {
  const read = loadStoredState({ getItem: () => { throw new Error('denied'); } });
  assert.match(read.error, /read/i);
  assert.equal(read.recovery, null);
  assert.equal(read.writeBlocked, true);
  const write = persistStoredState({ setItem: () => { throw new Error('quota'); } }, emptyState(), false);
  assert.deepEqual(write.ok, false);
  assert.match(write.error, /save/i);
});
