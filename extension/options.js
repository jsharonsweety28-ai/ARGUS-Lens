const $ = id => document.getElementById(id);
chrome.storage.sync.get(['server', 'auto', 'limit']).then(({ server, auto, limit }) => {
  $('server').value = server || 'https://arguslens-ten.vercel.app';
  $('auto').checked = auto === true;
  $('limit').value = limit || 10;
});
$('save').addEventListener('click', async () => {
  const limit = Math.min(60, Math.max(1, Math.round(Number($('limit').value) || 10)));
  await chrome.storage.sync.set({ server: $('server').value.trim(), auto: $('auto').checked, limit });
  $('limit').value = limit;
  $('saved').textContent = 'Saved';
  setTimeout(() => ($('saved').textContent = ''), 1500);
});
