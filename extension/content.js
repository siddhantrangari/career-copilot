/* Career Copilot Autofill — content script.
 *
 * Adds one button to application forms. Clicking it fetches the answers
 * prepared in Career Copilot for this role and fills what it can match:
 * text fields, dropdowns, radio buttons, the resume upload (his Studio PDF).
 * Filled fields turn green, ones to check amber, required ones it couldn't
 * fill red. It never ticks consent boxes and never presses Submit.
 */
(function () {
  'use strict';
  if (window.__ccAutofill) return;
  window.__ccAutofill = true;

  // Only where there is a form to fill.
  function hasForm() {
    return document.querySelectorAll('input[type="text"], input[type="email"], input[type="file"], textarea').length >= 2;
  }

  const norm = (s) => String(s || '').toLowerCase().replace(/\*/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
  function similar(a, b) {
    const A = words(a); const B = words(b);
    if (!A.size || !B.size) return 0;
    let hit = 0; A.forEach((w) => { if (B.has(w)) hit += 1; });
    const na = norm(a); const nb = norm(b);
    if (na && nb && (na.includes(nb) || nb.includes(na)) && Math.min(na.length, nb.length) > 6) return 1;
    return hit / Math.max(A.size, B.size);
  }

  function textOf(el) { return el ? (el.innerText || el.textContent || '').trim() : ''; }
  function labelOf(el) {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return textOf(l);
    }
    const wrap = el.closest('label');
    if (wrap) return textOf(wrap);
    const by = el.getAttribute('aria-labelledby');
    if (by) return by.split(/\s+/).map((id) => textOf(document.getElementById(id))).join(' ');
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    const box = el.closest('fieldset, .field, .application-question, .form-field, [class*="question"], [class*="field"], li, .input-wrapper');
    if (box) {
      const l = box.querySelector('legend, label, .label, [class*="label"], h3, h4');
      if (l && l !== el) return textOf(l);
      return textOf(box).slice(0, 200);
    }
    return el.placeholder || el.name || '';
  }

  // React and friends only notice values set through the native setter.
  function setValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  const mark = (el, kind) => {
    const color = { ok: '#22c55e', check: '#f59e0b', missing: '#ef4444' }[kind];
    (el.type === 'radio' || el.type === 'checkbox' ? (el.closest('fieldset, label, div') || el) : el).style.outline = `2px solid ${color}`;
    el.dataset.ccFilled = kind;
  };

  function pickOption(options, want) {
    const w = norm(want);
    if (!w) return null;
    return options.find((o) => norm(o.text) === w) || options.find((o) => norm(o.text).startsWith(w)) || options.find((o) => norm(o.text).includes(w)) || null;
  }

  function findAnswer(el, label, pack, used) {
    // 1. The form's own field name or id (Greenhouse: first_name, question_123…).
    const id = el.id || ''; const name = el.name || '';
    let f = pack.fields.find((x) => x.id && (x.id === id || x.id === name || name.endsWith(`[${x.id}]`) || id.endsWith(x.id)));
    // 2. The question text.
    if (!f && label) {
      let best = null; let score = 0;
      for (const x of pack.fields) {
        const s = similar(label, x.label);
        if (s > score) { score = s; best = x; }
      }
      if (score >= 0.6) f = best;
    }
    // 3. The kind of question (LinkedIn, phone…) from his profile.
    if (!f && label) {
      const cat = (pack.categories.find(([, re]) => new RegExp(re, 'i').test(label)) || [])[0];
      if (cat && pack.profile[cat]) return { value: pack.profile[cat], category: cat, needsYou: false, synthetic: true };
      if (cat) f = pack.fields.find((x) => x.category === cat && !used.has(x.id));
    }
    return f || null;
  }

  async function attachResume(input, pack) {
    if (!pack.resume) return false;
    const bytes = Uint8Array.from(atob(pack.resume.base64), (c) => c.charCodeAt(0));
    const file = new File([bytes], pack.resume.filename || 'resume.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function fill(pack) {
    const used = new Set();
    const report = { filled: 0, check: [], missing: [], consent: [] };

    // Files: the resume upload.
    for (const input of document.querySelectorAll('input[type="file"]')) {
      const label = `${labelOf(input)} ${input.name} ${input.id}`;
      if (/resume|cv/i.test(label) && !/cover/i.test(label)) {
        if (await attachResume(input, pack)) { mark(input, 'ok'); report.filled += 1; } else report.missing.push('Resume — ' + (pack.resumeNote || 'no PDF'));
      }
    }

    // Text fields and dropdowns.
    for (const el of document.querySelectorAll('input:not([type]), input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], textarea, select')) {
      if (el.disabled || el.readOnly || el.type === 'hidden' || el.offsetParent === null) continue;
      if (el.getAttribute('role') === 'combobox' || el.closest('[class*="select__"]')) continue; // handled below
      const label = labelOf(el);
      const f = findAnswer(el, label, pack, used);
      if (!f || f.value == null || f.value === '') {
        if (el.required || /\*/.test(label)) { mark(el, 'missing'); report.missing.push(label.slice(0, 60)); }
        continue;
      }
      if (f.category === 'consent') { report.consent.push(label.slice(0, 60)); continue; }
      if (el.value && el.value.trim()) { continue; } // never overwrite what's already there
      if (el.tagName === 'SELECT') {
        const o = pickOption([...el.options], f.value);
        if (!o) { mark(el, 'check'); report.check.push(label.slice(0, 60)); continue; }
        setValue(el, o.value);
      } else {
        setValue(el, String(f.value));
      }
      if (f.id) used.add(f.id);
      mark(el, f.needsYou || f.category === 'open_text' || f.category === 'why_company' ? 'check' : 'ok');
      if (f.needsYou || f.category === 'why_company' || f.category === 'open_text') report.check.push(label.slice(0, 60)); else report.filled += 1;
    }

    // Radio groups.
    const groups = {};
    document.querySelectorAll('input[type="radio"]').forEach((r) => { (groups[r.name] = groups[r.name] || []).push(r); });
    for (const radios of Object.values(groups)) {
      if (radios.some((r) => r.checked)) continue;
      const box = radios[0].closest('fieldset, [class*="question"], [class*="field"], li') || radios[0].parentElement;
      const legend = box ? textOf(box.querySelector('legend, label, [class*="label"]')) || textOf(box).slice(0, 160) : '';
      const f = findAnswer(radios[0], legend, pack, used);
      if (!f || !f.value || f.category === 'consent') { if (f?.category === 'consent') report.consent.push(legend.slice(0, 60)); continue; }
      const opts = radios.map((r) => ({ r, text: labelOf(r) || r.value }));
      const o = pickOption(opts, f.value);
      if (o) { o.r.click(); mark(o.r, f.needsYou ? 'check' : 'ok'); report.filled += 1; if (f.id) used.add(f.id); } else report.check.push(legend.slice(0, 60));
    }

    // Comboboxes (Greenhouse's new forms use react-select): type, then pick the match.
    for (const el of document.querySelectorAll('input[role="combobox"]')) {
      if (el.offsetParent === null) continue;
      const box = el.closest('[class*="field"], [class*="question"], .select, div');
      const label = labelOf(el) || textOf(box?.parentElement?.querySelector('label'));
      const f = findAnswer(el, label, pack, used);
      if (!f || !f.value || f.category === 'consent') continue;
      const shown = box ? textOf(box) : '';
      if (shown && norm(shown).includes(norm(f.value)) && norm(f.value).length > 1) continue; // already chosen
      el.focus();
      setValue(el, String(f.value).slice(0, 40));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await sleep(350);
      const options = [...document.querySelectorAll('[role="option"], [class*="option"]')].map((o) => ({ o, text: textOf(o) }));
      const hit = pickOption(options, f.value);
      if (hit) { hit.o.click(); mark(el, f.needsYou ? 'check' : 'ok'); report.filled += 1; if (f.id) used.add(f.id); } else { mark(el, 'check'); report.check.push(label.slice(0, 60)); }
      await sleep(120);
    }

    // Consent checkboxes are his to tick.
    document.querySelectorAll('input[type="checkbox"]').forEach((c) => {
      const l = labelOf(c);
      if (/consent|agree|privacy|acknowledge|terms|certify/i.test(l) && !c.checked) { mark(c, 'check'); report.consent.push(l.slice(0, 60)); }
    });
    return report;
  }

  function panel(html, tone) {
    let p = document.getElementById('cc-af-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'cc-af-panel';
      p.style.cssText = 'position:fixed;left:16px;bottom:64px;z-index:2147483647;max-width:360px;background:#141822;color:#c9d4e3;border:1px solid #2a3244;border-radius:12px;padding:12px 14px;font:12.5px/1.5 -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4)';
      document.body.appendChild(p);
    }
    p.style.borderColor = tone === 'bad' ? '#ef4444' : '#2a3244';
    p.innerHTML = html + '<div style="text-align:right;margin-top:6px"><a href="#" id="cc-af-close" style="color:#7c8ba3">close</a></div>';
    p.querySelector('#cc-af-close').onclick = (e) => { e.preventDefault(); p.remove(); };
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function addButton() {
    if (document.getElementById('cc-af-btn') || !hasForm()) return;
    const b = document.createElement('button');
    b.id = 'cc-af-btn';
    b.type = 'button';
    b.textContent = '⚡ Fill with Career Copilot';
    b.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483647;background:linear-gradient(135deg,#22c55e,#0ea5e9);color:#fff;border:0;border-radius:999px;padding:10px 16px;font:600 13px -apple-system,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35)';
    b.addEventListener('click', () => {
      b.disabled = true; b.textContent = '⏳ Filling…';
      chrome.runtime.sendMessage({ type: 'cc-pack', url: location.href }, async (pack) => {
        b.disabled = false; b.textContent = '⚡ Fill with Career Copilot';
        if (!pack || pack.error) { panel(`<b>Couldn't fill</b><br>${esc(pack?.error || 'No answer from Career Copilot')}`, 'bad'); return; }
        if (!pack.found) { panel(`<b>Not in Career Copilot</b><br>${esc(pack.message)}`, 'bad'); return; }
        const r = await fill(pack);
        panel(
          `<b>${esc(pack.company)} · ${esc(pack.title)}</b><br>` +
          `<span style="color:#22c55e">✓ ${r.filled} filled</span>` +
          (r.check.length ? `<br><span style="color:#f59e0b">● Check ${r.check.length}:</span> ${esc(r.check.slice(0, 5).join(' · '))}` : '') +
          (r.missing.length ? `<br><span style="color:#ef4444">● Needs you ${r.missing.length}:</span> ${esc(r.missing.slice(0, 5).join(' · '))}` : '') +
          (r.consent.length ? `<br>☐ Tick yourself: ${esc(r.consent.slice(0, 3).join(' · '))}` : '') +
          (pack.resumeNote ? `<br><span style="color:#f59e0b">${esc(pack.resumeNote)}</span>` : '') +
          '<br><b>Review the form, then press Submit yourself.</b> Then ✓ Applied in Career Copilot.');
      });
    });
    document.body.appendChild(b);
  }

  addButton();
  // Single-page forms render late.
  new MutationObserver(() => addButton()).observe(document.documentElement, { childList: true, subtree: true });
})();
