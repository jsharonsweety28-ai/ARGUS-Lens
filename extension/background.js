// Fetches the image the user asked about and sends it to the Argus Lens server. The extension
// holds no model key: the server calls Muse Spark and SAM 3.1.
const DEFAULT_SERVER = 'http://localhost:8800';

async function server() {
  const { server } = await chrome.storage.sync.get('server');
  return (server || DEFAULT_SERVER).replace(/\/$/, '');
}

// Image bytes, from any site: host permissions let the extension read images that a page's own
// scripts can't (cross-origin). Cookies are not sent.
async function imageBytes(url) {
  if (url.startsWith('data:')) return await (await fetch(url)).blob();
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Couldn't load the image (HTTP ${res.status}).`);
  return await res.blob();
}

async function assess(url) {
  const blob = await imageBytes(url);
  if (blob.size > 10 * 1024 * 1024) throw new Error('Images up to 10 MB.');
  let res;
  try { res = await fetch(`${await server()}/api/assess`, { method: 'POST', body: blob }); }
  catch { throw new Error("Can't reach the Argus Lens server. Check it's running, and its address in the extension's settings."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Argus Lens could not check this image.');
  return data;
}

// Each image is checked once: results are remembered by image address (and a check already
// running is shared), so scrolling back or a feed re-rendering costs nothing.
const results = new Map(); // url → { result, at }
const running = new Map(); // url → Promise
const KEEP_MS = 60 * 60_000, KEEP_MAX = 500;
function remembered(url) {
  const hit = results.get(url);
  return hit && Date.now() - hit.at < KEEP_MS ? hit.result : null;
}
function remember(url, result) {
  results.set(url, { result, at: Date.now() });
  if (results.size > KEEP_MAX) results.delete(results.keys().next().value);
}

// Automatic checks are capped per minute across all tabs, to protect the user's API credits.
// Checks the user clicks for are never capped.
const autoTimes = [];
async function autoAllowed() {
  const { limit } = await chrome.storage.sync.get('limit');
  const now = Date.now();
  while (autoTimes.length && now - autoTimes[0] > 60_000) autoTimes.shift();
  if (autoTimes.length >= (limit || 10)) return 60_000 - (now - autoTimes[0]);
  autoTimes.push(now);
  return 0;
}

async function handle({ url, auto }) {
  const known = remembered(url);
  if (known) return { result: known, cached: true };
  if (running.has(url)) return { result: await running.get(url) };
  if (auto) { const wait = await autoAllowed(); if (wait) return { deferred: true, retryInMs: wait }; }
  const job = assess(url);
  running.set(url, job);
  try { const result = await job; remember(url, result); return { result }; }
  finally { running.delete(url); }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== 'assess') return;
  handle(msg).then(reply, err => reply({ error: err.message }));
  return true; // reply asynchronously
});

// Right-click any image, on any site.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'argus-lens', title: 'Check with Argus Lens', contexts: ['image'] });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'argus-lens' || !tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: 'check', url: info.srcUrl }); }
  catch {
    // No content script on this site yet: add it, then ask again.
    await chrome.scripting?.executeScript?.({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
    chrome.tabs.sendMessage(tab.id, { type: 'check', url: info.srcUrl }).catch(() => {});
  }
});
