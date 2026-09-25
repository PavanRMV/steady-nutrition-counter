import fs from 'node:fs/promises';
const host = 'http://127.0.0.1:9223';
const app = process.argv[2] || 'http://127.0.0.1:8765/';
const target = await fetch(`${host}/json/new?${encodeURIComponent(app)}`, { method: 'PUT' }).then(response => response.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const promise = pending.get(message.id);
  pending.delete(message.id);
  message.error ? promise.reject(new Error(JSON.stringify(message.error))) : promise.resolve(message.result);
});
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const callId = ++id; pending.set(callId, { resolve, reject }); ws.send(JSON.stringify({ id: callId, method, params })); });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await sleep(100); }
  throw new Error(`Timeout: ${expression}`);
}
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: app });
await waitFor("document.readyState==='complete' && document.querySelector('#reminder-toggle')");
await evaluate("localStorage.clear(); caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))); location.reload(); true");
await waitFor("document.readyState==='complete' && document.querySelector('#suggestions-body .suggestion-select')");
const initial = await evaluate(`(() => ({
  empty: document.querySelector('#entries').textContent.trim(),
  carbs: document.querySelector('#carbs-total').textContent,
  reminder: document.querySelector('#reminder-status').textContent,
  disclosure: document.querySelector('.reminder-panel p').textContent,
  notificationPermission: typeof Notification === 'undefined' ? 'unavailable' : Notification.permission,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  suggestionRows: document.querySelectorAll('#suggestions-body tr').length
}))()`);
await evaluate("document.querySelector('[data-suggestion-filter=protein]').click(); true");
await waitFor("document.querySelector('[data-suggestion-filter=protein]').getAttribute('aria-pressed')==='true'");
const beforeSuggestionEntries = await evaluate("document.querySelectorAll('.entry-card').length");
await evaluate("document.querySelector('#suggestions-body .suggestion-select').click(); true");
const suggestion = await evaluate(`(() => ({
  selectedName: document.querySelector('#food-name').value,
  carbsPrefilled: Number(document.querySelector('#carbs').value),
  entryCount: document.querySelectorAll('.entry-card').length,
  filterPressed: document.querySelector('[data-suggestion-filter=protein]').getAttribute('aria-pressed')
}))()`);
if (beforeSuggestionEntries !== 0 || suggestion.entryCount !== 0 || !suggestion.selectedName) throw new Error('Suggestion selection silently logged or failed to prefill.');
await evaluate(`(() => {
  document.querySelector('#manual-mode').click();
  const values = { '#food-name':'QA meal', '#calories':'420', '#protein':'21', '#fibre':'7', '#carbs':'42' };
  for (const [selector, value] of Object.entries(values)) { const input = document.querySelector(selector); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }
  document.querySelector('#entry-form').requestSubmit();
  return true;
})()`);
await waitFor("document.querySelectorAll('.entry-card').length===1 && document.querySelector('#carbs-total').textContent.includes('42')");
const beforeReminder = await evaluate("({entry:document.querySelector('.entry-card').textContent.replace(/\\s+/g,' ').trim(),carbs:document.querySelector('#carbs-total').textContent})");
await evaluate("document.querySelector('#reminder-toggle').click(); true");
await waitFor("JSON.parse(localStorage.getItem('steady-gain-reminder-v1'))?.enabled===true");
const enabled = await evaluate(`(() => { const setting=JSON.parse(localStorage.getItem('steady-gain-reminder-v1')); return {
  pressed: document.querySelector('#reminder-toggle').getAttribute('aria-pressed'),
  status: document.querySelector('#reminder-status').textContent,
  alertHidden: document.querySelector('#reminder-alert').hidden,
  delay: setting.nextAt-Date.now()
}; })()`);
if (!enabled.alertHidden || enabled.delay < 10790000 || enabled.delay > 10801000) throw new Error('Reminder fired immediately or was not scheduled for three hours.');
await evaluate("(()=>{const key='steady-gain-reminder-v1';const setting=JSON.parse(localStorage.getItem(key));setting.nextAt=Date.now()-1;localStorage.setItem(key,JSON.stringify(setting));location.reload();return true})()");
await waitFor("document.readyState==='complete' && document.querySelector('#reminder-alert').textContent==='eat eat eat!!!'");
const catchup = await evaluate(`(() => { const setting=JSON.parse(localStorage.getItem('steady-gain-reminder-v1')); return {
  message: document.querySelector('#reminder-alert').textContent,
  hidden: document.querySelector('#reminder-alert').hidden,
  nextInFuture: setting.nextAt > Date.now(),
  entryCount: document.querySelectorAll('.entry-card').length,
  carbs: document.querySelector('#carbs-total').textContent,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
}; })()`);
await evaluate("location.reload(); true");
await waitFor("document.readyState==='complete' && document.querySelectorAll('.entry-card').length===1");
const persisted = await evaluate("({reminderEnabled:JSON.parse(localStorage.getItem('steady-gain-reminder-v1')).enabled,alertHidden:document.querySelector('#reminder-alert').hidden,carbs:document.querySelector('#carbs-total').textContent})");
await evaluate("document.querySelector('#reminder-toggle').click(); true");
await waitFor("JSON.parse(localStorage.getItem('steady-gain-reminder-v1'))?.enabled===false");
const disabled = await evaluate("({pressed:document.querySelector('#reminder-toggle').getAttribute('aria-pressed'),status:document.querySelector('#reminder-status').textContent,setting:JSON.parse(localStorage.getItem('steady-gain-reminder-v1'))})");
await evaluate("document.querySelector('#reminder-toggle').click(); true");
await waitFor("JSON.parse(localStorage.getItem('steady-gain-reminder-v1'))?.enabled===true");
await evaluate("navigator.serviceWorker.ready.then(() => true)");
await sleep(500);
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send('Page.reload', { ignoreCache: true });
await waitFor("document.readyState==='complete' && document.querySelectorAll('.entry-card').length===1", 10000);
const offline = await evaluate("({title:document.title,controlled:!!navigator.serviceWorker.controller,carbs:document.querySelector('#carbs-total').textContent,entryCount:document.querySelectorAll('.entry-card').length})");
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await fs.mkdir('outputs', { recursive: true });
const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await fs.writeFile('outputs/pwa-mobile-qa.png', Buffer.from(screenshot.data, 'base64'));
const report = { viewport: { width: 390, height: 844 }, initial, suggestion, manualEntry: beforeReminder, enabled, catchup, persisted, disabled, offline };
await fs.writeFile('outputs/pwa-browser-qa.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
ws.close();
