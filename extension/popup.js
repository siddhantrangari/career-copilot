const $ = (id) => document.getElementById(id);
chrome.storage.sync.get({ server: 'https://career.myagentfirm.com', key: '' }, (v) => { $('server').value = v.server; $('key').value = v.key; });
$('save').addEventListener('click', async () => {
  const server = $('server').value.trim().replace(/\/$/, '') || 'https://career.myagentfirm.com';
  const key = $('key').value.trim();
  await chrome.storage.sync.set({ server, key });
  $('s').textContent = 'Testing…';
  try {
    const res = await fetch(`${server}/api/autofill/ping`, { headers: { 'x-autofill-key': key } });
    $('s').textContent = res.ok ? '✓ Connected' : '✕ Key not accepted';
    $('s').style.color = res.ok ? '#38d9a9' : '#ff8787';
  } catch (err) {
    $('s').textContent = `✕ ${err.message}`; $('s').style.color = '#ff8787';
  }
});
