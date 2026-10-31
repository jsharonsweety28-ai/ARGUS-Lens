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
  return assessBlob(blob);
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

// A video frame: a screenshot of the visible tab, cropped to the video's box. Only what's on the
// user's screen; nothing is downloaded from the site.
async function captureFrame(tab, rect, dpr) {
  const shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const bitmap = await createImageBitmap(await (await fetch(shot)).blob());
  const x = Math.max(0, Math.round(rect.x * dpr)), y = Math.max(0, Math.round(rect.y * dpr));
  const w = Math.min(bitmap.width - x, Math.round(rect.width * dpr)), h = Math.min(bitmap.height - y, Math.round(rect.height * dpr));
  if (w < 50 || h < 50) throw new Error('The video is too small or off screen to check.');
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d').drawImage(bitmap, x, y, w, h, 0, 0, w, h);
  return canvas.convertToBlob({ type: 'image/png' });
}

async function assessBlob(blob) {
  let res;
  try { res = await fetch(`${await server()}/api/assess`, { method: 'POST', body: blob }); }
  catch { throw new Error("Can't reach the Argus Lens server. Check it's running, and its address in the extension's settings."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Argus Lens could not check this.');
  return data;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'assess') { handle(msg).then(reply, err => reply({ error: err.message })); return true; }
  if (msg?.type === 'captureFrame') {
    // Step 1 replies as soon as the screenshot is taken, so the page can show its buttons again.
    captureFrame(sender.tab, msg.rect, msg.dpr).then(blob => { frames.set(sender.tab.id, blob); reply({ ok: true }); }, err => reply({ error: err.message }));
    return true;
  }
  if (msg?.type === 'assessFrame') {
    const blob = frames.get(sender.tab.id); frames.delete(sender.tab.id);
    if (!blob) { reply({ error: 'No frame was captured.' }); return; }
    assessBlob(blob).then(result => reply({ result }), err => reply({ error: err.message }));
    return true;
  }
});
const frames = new Map(); // tab id → the frame just captured

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
