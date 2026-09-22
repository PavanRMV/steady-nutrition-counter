import { searchCatalog, calculateFood, normalizeOpenFoodFactsProduct } from './catalog.js';
export const STORAGE_KEY = 'steady-gain-nutrition-v1';
export const DATA_VERSION = 1;
export const DEFAULT_TARGETS = Object.freeze({ calories: 2650, protein: 110, fibre: 35 });

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;
const isCalendarDate = value => {
  const match = isoDate.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const freshDay = () => ({ weight: null, entries: [] });
const clone = value => JSON.parse(JSON.stringify(value));
const rounded = value => Math.round(value * 10) / 10;

export function emptyState() {
  return { version: DATA_VERSION, targets: { ...DEFAULT_TARGETS }, days: {} };
}

export function validateEntry(input) {
  const errors = {};
  const name = String(input?.name ?? '').trim();
  if (!name) errors.name = 'Food or meal name is required.';
  for (const field of ['calories', 'protein', 'fibre']) {
    const raw = input?.[field];
    if (raw === '' || raw === null || raw === undefined || !Number.isFinite(Number(raw))) {
      errors[field] = 'Enter a valid number.';
    } else if (Number(raw) < 0) {
      errors[field] = 'Must be zero or greater.';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function normalizeEntry(input) {
  const result = validateEntry(input);
  if (!result.valid) throw new Error('Invalid entry');
  const item = {
    id: String(input.id),
    name: String(input.name).trim(),
    calories: Number(input.calories),
    protein: Number(input.protein),
    fibre: Number(input.fibre)
  };
  for (const key of ['foodId', 'source', 'unit']) if (input[key]) item[key] = String(input[key]);
  if (input.quantity !== undefined) {
    const quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero.');
    item.quantity = quantity;
  }
  return item;
}

export function calculateTotals(entries = []) {
  const totals = entries.reduce((sum, item) => ({
    calories: sum.calories + Number(item.calories),
    protein: sum.protein + Number(item.protein),
    fibre: sum.fibre + Number(item.fibre)
  }), { calories: 0, protein: 0, fibre: 0 });
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, rounded(value)]));
}

export function nutrientStatus(total, target) {
  const rawPercent = rounded((Number(total) / Number(target)) * 100);
  return {
    amount: rounded(Math.abs(Number(target) - Number(total))),
    label: Number(total) > Number(target) ? 'over' : 'remaining',
    percent: Math.min(100, Math.max(0, rawPercent)),
    rawPercent
  };
}

function withDay(state, date, change) {
  const next = clone(state);
  const day = next.days[date] || freshDay();
  next.days[date] = change(day);
  return next;
}

export function addEntry(state, date, input) {
  const item = normalizeEntry(input);
  return withDay(state, date, day => ({ ...day, entries: [...day.entries, item] }));
}

export function updateEntry(state, date, id, input) {
  const item = normalizeEntry({ ...input, id });
  return withDay(state, date, day => {
    if (!day.entries.some(entry => entry.id === id)) throw new Error('Entry not found');
    return { ...day, entries: day.entries.map(entry => entry.id === id ? item : entry) };
  });
}

export function deleteEntry(state, date, id) {
  return withDay(state, date, day => ({ ...day, entries: day.entries.filter(entry => entry.id !== id) }));
}

export function setWeight(state, date, weight) {
  const value = weight === '' || weight === null ? null : Number(weight);
  if (value !== null && (!Number.isFinite(value) || value <= 0)) throw new Error('Weight must be greater than zero.');
  return withDay(state, date, day => ({ ...day, weight: value }));
}

export function setTargets(state, targets) {
  const normalized = {};
  for (const field of ['calories', 'protein', 'fibre']) {
    const value = Number(targets[field]);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Targets must be valid numbers greater than zero.');
    normalized[field] = value;
  }
  return { ...clone(state), targets: normalized };
}

export function recentLoggedDays(state, limit = 7) {
  return Object.keys(state.days)
    .filter(date => state.days[date].entries.length || state.days[date].weight !== null)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .map(date => ({ date, weight: state.days[date].weight, totals: calculateTotals(state.days[date].entries) }));
}

function validateState(value) {
  if (!value || typeof value !== 'object' || value.version !== DATA_VERSION) throw new Error('Backup version is not supported.');
  setTargets(emptyState(), value.targets || {});
  if (!value.days || typeof value.days !== 'object' || Array.isArray(value.days)) throw new Error('Backup days are invalid.');
  for (const [date, day] of Object.entries(value.days)) {
    if (!isCalendarDate(date)) throw new Error('Backup contains an invalid date.');
    if (!day || !Array.isArray(day.entries)) throw new Error('Backup day is invalid.');
    if (day.weight !== null && (!Number.isFinite(Number(day.weight)) || Number(day.weight) <= 0)) throw new Error('Backup weight is invalid.');
    for (const item of day.entries) {
      if (!item?.id || !validateEntry(item).valid) throw new Error('Backup contains an invalid entry.');
    }
  }
  return true;
}

export function serializeBackup(state) {
  validateState(state);
  return JSON.stringify(state, null, 2);
}

export function parseBackup(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Choose a valid JSON backup file.'); }
  const migrated = migrateState(value);
  validateState(migrated);
  return clone(migrated);
}

export function migrateState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Backup data is invalid.');
  if (value.version === DATA_VERSION) return clone(value);
  if (value.version === undefined && value.days && value.targets) return { ...clone(value), version: DATA_VERSION };
  throw new Error(value.version === undefined ? 'Backup data is invalid.' : 'Backup version is not supported.');
}

export function loadStoredState(storage) {
  let raw;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { return { state: emptyState(), recovery: null, error: 'Unable to read local data. Saving is blocked to protect it.', writeBlocked: true }; }
  if (!raw) return { state: emptyState(), recovery: null, error: null, writeBlocked: false };
  try { return { state: parseBackup(raw), recovery: null, error: null, writeBlocked: false }; }
  catch (error) {
    return { state: emptyState(), recovery: { raw, reason: error.message }, error: 'Stored data needs recovery. Download it or discard it before saving.', writeBlocked: true };
  }
}

export function persistStoredState(storage, state, blocked = false) {
  if (blocked) return { ok: false, error: 'Saving is blocked until the stored-data warning is resolved.' };
  try { storage.setItem(STORAGE_KEY, serializeBackup(state)); return { ok: true, error: null }; }
  catch { return { ok: false, error: 'Unable to save data in this browser.' }; }
}

function initBrowser() {
  const $ = selector => document.querySelector(selector);
  const dateInput = $('#log-date');
  const form = $('#entry-form');
  const targetForm = $('#target-form');
  const weightInput = $('#weight');
  const announcer = $('#announcer');
  const loaded = loadStoredState(localStorage);
  let state = loaded.state;
  let recovery = loaded.recovery;
  let storageBlocked = loaded.writeBlocked;
  let editingId = null;
  let selectedFood = null;
  let onlineTimer;
  let onlineController;

  function localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  dateInput.value = localToday();

  function showStorageWarning(message) {
    const banner = $('#storage-warning');
    banner.hidden = !message;
    $('#storage-warning-text').textContent = message || '';
    $('#download-raw-data').hidden = !recovery?.raw;
    document.querySelectorAll('#main input, #main button').forEach(control => { control.disabled = storageBlocked; });
  }
  function save(message) {
    const result = persistStoredState(localStorage, state, storageBlocked);
    if (!result.ok) { showStorageWarning(result.error); return false; }
    if (message) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = message; }); }
    return true;
  }
  function day() { return state.days[dateInput.value] || freshDay(); }
  function formatNumber(value) { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value); }
  function formatDate(value) { return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function esc(text) { const span = document.createElement('span'); span.textContent = text; return span.innerHTML; }

  function render() {
    const current = day();
    const totals = calculateTotals(current.entries);
    $('#date-heading').textContent = dateInput.value === localToday() ? 'Today' : formatDate(dateInput.value);
    weightInput.value = current.weight ?? '';
    for (const key of ['calories', 'protein', 'fibre']) {
      const unit = key === 'calories' ? 'kcal' : 'g';
      const status = nutrientStatus(totals[key], state.targets[key]);
      $(`#${key}-total`).textContent = `${formatNumber(totals[key])} / ${formatNumber(state.targets[key])} ${unit}`;
      $(`#${key}-status`).textContent = `${formatNumber(status.amount)} ${unit} ${status.label}`;
      const bar = $(`#${key}-bar`);
      bar.style.width = `${status.percent}%`;
      bar.parentElement.setAttribute('aria-valuenow', String(totals[key]));
      bar.parentElement.setAttribute('aria-valuemax', String(state.targets[key]));
      bar.parentElement.setAttribute('aria-valuetext', `${formatNumber(totals[key])} of ${formatNumber(state.targets[key])} ${unit}; ${formatNumber(status.amount)} ${status.label}`);
      bar.classList.toggle('over', status.label === 'over');
    }
    $('#entries').innerHTML = current.entries.length ? current.entries.map(item => `
      <li class="entry-card">
        <div><strong>${esc(item.name)}</strong><span>${item.quantity ? `${formatNumber(item.quantity)} ${esc(item.unit || 'serving')} · ` : ''}${formatNumber(item.calories)} kcal · ${formatNumber(item.protein)}g protein · ${formatNumber(item.fibre)}g fibre</span></div>
        <div class="entry-actions"><button type="button" class="text-button" data-edit="${esc(item.id)}" aria-label="Edit ${esc(item.name)}">Edit</button><button type="button" class="text-button danger" data-delete="${esc(item.id)}" aria-label="Delete ${esc(item.name)}">Delete</button></div>
      </li>`).join('') : '<li class="empty">No food logged yet. Add your first meal below.</li>';
    $('#clear-day').disabled = !current.entries.length && current.weight === null;
    renderTargets();
    renderHistory();
  }

  function renderTargets() {
    for (const key of ['calories', 'protein', 'fibre']) $(`#target-${key}`).value = state.targets[key];
  }
  function renderHistory() {
    const history = recentLoggedDays(state, 7);
    $('#history').innerHTML = history.length ? history.map(item => `<li><button type="button" data-history="${item.date}"><span><strong>${formatDate(item.date)}</strong>${item.weight === null ? '' : `<small>${formatNumber(item.weight)} kg</small>`}</span><span>${formatNumber(item.totals.calories)} kcal<br><small>${formatNumber(item.totals.protein)}g P · ${formatNumber(item.totals.fibre)}g F</small></span></button></li>`).join('') : '<li class="empty">Your recent logged days will appear here.</li>';
  }
  function readForm() {
    const base = { id: editingId || crypto.randomUUID(), name: $('#food-name').value, calories: $('#calories').value, protein: $('#protein').value, fibre: $('#fibre').value };
    return selectedFood ? { ...base, foodId: selectedFood.id, source: selectedFood.source, unit: selectedFood.unit, quantity: $('#quantity').value } : base;
  }
  function showErrors(errors) {
    for (const key of ['name', 'calories', 'protein', 'fibre']) {
      const field = key === 'name' ? $('#food-name') : $(`#${key}`);
      field.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
      $(`#${key}-error`).textContent = errors[key] || '';
    }
  }
  function stopEditing() {
    editingId = null; selectedFood = null; form.reset(); $('#quantity').value = 1; $('#quantity-unit').textContent = 'serving'; $('#nutrient-preview').textContent = 'Select a catalog food or enter nutrients manually.'; showErrors({}); $('#save-entry').textContent = 'Add entry'; $('#cancel-edit').hidden = true;
  }

  function chooseFood(food) {
    selectedFood = food; $('#food-name').value = food.name; $('#food-search').value = food.name; $('#quantity-unit').textContent = food.unit; $('#quantity').value = 1; $('#food-results').innerHTML = ''; $('#online-results').innerHTML = ''; updatePreview();
  }
  function updatePreview() {
    if (!selectedFood) return;
    try {
      const item = calculateFood(selectedFood, $('#quantity').value);
      $('#calories').value = item.calories; $('#protein').value = item.protein; $('#fibre').value = item.fibre;
      $('#nutrient-preview').textContent = `${formatNumber(item.quantity)} ${item.unit}: ${formatNumber(item.calories)} kcal · ${formatNumber(item.protein)}g protein · ${formatNumber(item.fibre)}g fibre`;
    } catch { $('#nutrient-preview').textContent = 'Enter a quantity greater than zero.'; }
  }
  function renderChoices(target, foods) {
    target.innerHTML = foods.length ? foods.map((food, index) => `<li><button type="button" data-choice="${index}"><strong>${esc(food.name)}</strong><span>${formatNumber(food.calories)} kcal / ${esc(food.unit)} · ${esc(food.source === 'built-in' ? 'USDA-based estimate' : food.source)}</span></button></li>`).join('') : '<li class="empty">No matches found.</li>';
    target.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => chooseFood(foods[Number(button.dataset.choice)])));
  }

  $('#food-search').addEventListener('input', event => renderChoices($('#food-results'), searchCatalog(event.target.value)));
  $('#quantity').addEventListener('input', updatePreview);
  $('#quantity-minus').addEventListener('click', () => { $('#quantity').value = Math.max(0.01, (Number($('#quantity').value) || 1) - 1); updatePreview(); });
  $('#quantity-plus').addEventListener('click', () => { $('#quantity').value = (Number($('#quantity').value) || 0) + 1; updatePreview(); });
  $('#manual-mode').addEventListener('click', () => { selectedFood = null; $('#food-search').value = ''; $('#food-results').innerHTML = ''; $('#quantity-unit').textContent = 'serving'; $('#nutrient-preview').textContent = 'Manual mode: enter the totals for this entry.'; $('#food-name').focus(); });
  $('#catalog-mode').addEventListener('click', () => $('#food-search').focus());
  $('#online-search').addEventListener('input', event => {
    clearTimeout(onlineTimer); onlineController?.abort();
    const query = event.target.value.trim();
    if (query.length < 3) { $('#online-status').textContent = 'Type at least 3 characters. Built-in search remains available offline.'; $('#online-results').innerHTML = ''; return; }
    $('#online-status').textContent = 'Waiting to search Open Food Facts…';
    onlineTimer = setTimeout(async () => {
      onlineController = new AbortController(); const timeout = setTimeout(() => onlineController.abort(), 6000);
      $('#online-status').textContent = 'Searching Open Food Facts…';
      try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,serving_size,nutriments`;
        const response = await fetch(url, { signal: onlineController.signal });
        if (!response.ok) throw new Error('unavailable');
        const foods = (await response.json()).products.map(normalizeOpenFoodFactsProduct).filter(Boolean);
        $('#online-status').textContent = foods.length ? 'Results from Open Food Facts. Check package labels for accuracy.' : 'No usable packaged-food results found.';
        renderChoices($('#online-results'), foods);
      } catch (error) {
        if (error.name !== 'AbortError' || event.target.value.trim() === query) $('#online-status').textContent = 'Online search unavailable. Built-in foods and manual entry still work offline.';
      } finally { clearTimeout(timeout); }
    }, 400);
  });

  let installPrompt;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#install-app').hidden = false; });
  $('#install-app').addEventListener('click', async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; $('#install-app').hidden = true; });
  window.addEventListener('appinstalled', () => { $('#install-app').hidden = true; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');

  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = readForm();
    const result = validateEntry(input);
    showErrors(result.errors);
    if (!result.valid) return;
    state = editingId ? updateEntry(state, dateInput.value, editingId, input) : addEntry(state, dateInput.value, input);
    save(editingId ? 'Entry updated.' : 'Entry added.');
    stopEditing(); render();
  });
  $('#cancel-edit').addEventListener('click', stopEditing);
  $('#entries').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    const remove = event.target.closest('[data-delete]');
    if (edit) {
      const item = day().entries.find(value => value.id === edit.dataset.edit);
      editingId = item.id;
      $('#food-name').value = item.name; $('#calories').value = item.calories; $('#protein').value = item.protein; $('#fibre').value = item.fibre;
      if (item.foodId) {
        const quantity = item.quantity || 1;
        selectedFood = { id: item.foodId, name: item.name, source: item.source, unit: item.unit, calories: item.calories / quantity, protein: item.protein / quantity, fibre: item.fibre / quantity };
        $('#quantity').value = quantity; $('#quantity-unit').textContent = item.unit; updatePreview();
      } else selectedFood = null;
      $('#save-entry').textContent = 'Save changes'; $('#cancel-edit').hidden = false; $('#food-name').focus();
    }
    if (remove) {
      state = deleteEntry(state, dateInput.value, remove.dataset.delete); save('Entry deleted.'); render();
    }
  });
  dateInput.addEventListener('change', () => { stopEditing(); render(); });
  weightInput.addEventListener('change', () => {
    try { state = setWeight(state, dateInput.value, weightInput.value); save('Weight saved.'); $('#weight-error').textContent = ''; render(); }
    catch (error) { $('#weight-error').textContent = error.message; }
  });
  targetForm.addEventListener('submit', event => {
    event.preventDefault();
    try {
      state = setTargets(state, { calories: $('#target-calories').value, protein: $('#target-protein').value, fibre: $('#target-fibre').value });
      save('Targets updated.'); $('#target-error').textContent = ''; render();
    } catch (error) { $('#target-error').textContent = error.message; }
  });
  $('#history').addEventListener('click', event => {
    const button = event.target.closest('[data-history]');
    if (button) { dateInput.value = button.dataset.history; stopEditing(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  $('#download-raw-data').addEventListener('click', () => {
    if (!recovery?.raw) return;
    const blob = new Blob([recovery.raw], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `nutrition-recovery-${localToday()}.txt`; link.click(); URL.revokeObjectURL(link.href);
  });
  $('#discard-raw-data').addEventListener('click', () => {
    if (!confirm('Discard the unreadable stored data? This cannot be undone.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      recovery = null; storageBlocked = false; state = emptyState(); showStorageWarning(null); render();
      announcer.textContent = 'Stored data discarded. Saving is available again.';
    } catch { showStorageWarning('Unable to discard local data. Saving remains blocked.'); }
  });
  $('#export-data').addEventListener('click', () => {
    const blob = new Blob([serializeBackup(state)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `nutrition-backup-${localToday()}.json`; link.click(); URL.revokeObjectURL(link.href);
  });
  $('#import-data').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { state = parseBackup(await file.text()); save('Backup imported.'); stopEditing(); render(); }
    catch (error) { alert(error.message); }
    event.target.value = '';
  });
  $('#clear-day').addEventListener('click', () => {
    if (!confirm(`Clear all food and weight data for ${formatDate(dateInput.value)}? This cannot be undone.`)) return;
    const next = clone(state); delete next.days[dateInput.value]; state = next; save('Current day cleared.'); stopEditing(); render();
  });
  showStorageWarning(loaded.error);
  render();
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', initBrowser);
