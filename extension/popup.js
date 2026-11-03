// Toolbar panel: open the Lens page to check a file, open settings, or flip automatic checks.
const $ = id => document.getElementById(id);
chrome.storage.sync.get(['server', 'auto']).then(({ server, auto }) => {
  $('auto').checked = auto === true;
  $('file').onclick = () => { chrome.tabs.create({ url: (server || 'https://arguslens-ten.vercel.app').replace(/\/$/, '') + '/' }); window.close(); };
});
$('settings').onclick = () => { chrome.runtime.openOptionsPage(); window.close(); };
$('auto').onchange = () => chrome.storage.sync.set({ auto: $('auto').checked });
