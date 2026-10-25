// Fetches the prepared answers and Studio PDF for the page he is on, with
// his read-only autofill key. Runs here (not in the page) so the job site
// never sees the key and its security policy can't block the request.
const DEFAULT_SERVER = 'https://career.myagentfirm.com';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'cc-pack') return false;
  chrome.storage.sync.get({ server: DEFAULT_SERVER, key: '' }, async ({ server, key }) => {
    if (!key) { sendResponse({ error: 'Add your autofill key: click the Career Copilot extension icon.' }); return; }
    try {
      const res = await fetch(`${server.replace(/\/$/, '')}/api/autofill/pack?url=${encodeURIComponent(msg.url)}`, { headers: { 'x-autofill-key': key } });
      const data = await res.json().catch(() => ({}));
      sendResponse(res.ok ? data : { error: data.error || `Career Copilot answered ${res.status}` });
    } catch (err) {
      sendResponse({ error: `Could not reach Career Copilot: ${err.message}` });
    }
  });
  return true; // async response
});
