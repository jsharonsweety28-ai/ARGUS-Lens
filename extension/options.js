const input = document.getElementById('server');
chrome.storage.sync.get('server').then(({ server }) => { input.value = server || 'http://localhost:8800'; });
document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({ server: input.value.trim() });
  document.getElementById('saved').textContent = 'Saved';
  setTimeout(() => (document.getElementById('saved').textContent = ''), 1500);
});
