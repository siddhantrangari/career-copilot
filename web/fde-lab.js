/**
 * FDE Lab page.
 *
 * Renders the 30-day curriculum from fde-lab-data-*.js, keeps his progress on
 * the server (/api/lab, insert-only), and assembles the complete prompts and
 * scripts for each day from that day's business, data and people, so every
 * copy button gives a prompt he can paste as it is.
 */
(function () {
  'use strict';

  var LAB = window.FDE_LAB;
  var API = '/api';
  var token = null;
  try { token = localStorage.getItem('cc_token'); } catch (e) {}
  if (!token) { location.href = '/'; return; }

  function api(path, options) {
    options = options || {};
    var headers = { Authorization: 'Bearer ' + token };
    if (options.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: options.method || 'GET', headers: headers, body: options.body ? JSON.stringify(options.body) : undefined })
      .then(function (res) {
        if (res.status === 401) { localStorage.removeItem('cc_token'); location.href = '/'; throw new Error('Session expired'); }
        return res.json().then(function (d) { if (!res.ok) throw new Error(d.message || d.error || 'Request failed'); return d; });
      });
  }

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };
  var STEPS = LAB.method.loop.map(function (s) { return s.step; });
  var state = { days: {}, startedAt: null };
  var current = 0; // 0 = how the lab works

  // ── Prompts and scripts, assembled per day ─────────────────────────
  function people(d) {
    return d.people.map(function (p) { return '- ' + p.role + ': cares about ' + p.cares; }).join('\n');
  }

  function scenario(d) {
    var lead = d.people[0];
    return 'You are the ' + lead.role + ' of ' + d.business.name + '. ' + d.business.profile +
      ' What you care about: ' + lead.cares +
      ' Hidden constraint (do not volunteer it; reveal it only if he asks the right question): ' + lead.hidden +
      (d.people[1] ? ' Your colleague the ' + d.people[1].role + ' would add: ' + d.people[1].hidden : '') +
      ' Be a busy, slightly skeptical executive. Push back if he proposes a solution before understanding the process, the metric, its owner and the cost.';
  }

  function discoveryScript(d) {
    var lead = d.people[0];
    return 'OPENING (30 seconds)\n' +
      'Thanks for the time. I have spent a little time with public data on ' + d.domain.toLowerCase() + ' and I would like to spend 15 minutes understanding how this works in your team before I suggest anything. Is it OK if I take notes?\n\n' +
      'UNDERSTAND THE PROBLEM\n' +
      LAB.method.discovery.map(function (q, i) { return (i + 1) + '. ' + q; }).join('\n') + '\n\n' +
      'SPECIFIC TO ' + d.business.name.toUpperCase() + '\n' +
      d.ask.map(function (q) { return '- ' + q; }).join('\n') + '\n\n' +
      'PLAY IT BACK (2 minutes)\n' +
      'Let me check I have this right: the problem is [one sentence], it shows up in [metric] which [owner] is measured on, it costs roughly [amount] a [period], and the constraint I must work within is [constraint]. Did I get that right?\n\n' +
      'CLOSE\n' +
      'Here is what I suggest: I come back with a one-page proposal and a small working prototype on your real data by [date], with one success measure we agree today. Who else should see it before then?\n\n' +
      'WHAT A ' + lead.role.toUpperCase() + ' LISTENS FOR\n' + lead.cares;
  }

  function analysisPrompt(d) {
    return 'I am a forward deployed engineer on day ' + d.day + ' of a practice lab. Business: ' + d.business.name + '. ' + d.business.profile + '\n\n' +
      'Data: ' + d.data.map(function (x) { return x.name + ' (' + x.url + '). ' + x.use; }).join(' | ') + '\n\n' +
      'Write DuckDB SQL (I run the DuckDB CLI on CSV files; no Python) for these questions. First give me one query that prints the column names and types so you can check your assumptions, then one query per question with a short comment saying what the result means:\n' +
      d.sql.map(function (q) { return '- ' + q; }).join('\n') + '\n\n' +
      'After I paste the results back, summarise the findings in 3 bullets, each with the number, and say which finding a ' + d.people[0].role + ' would care about most. Do not invent numbers I have not given you.';
  }

  function valuePrompt(d) {
    return 'Help me build a rough value model for ' + d.business.name + '.\n\n' +
      'Problem: ' + d.title + '.\nFormula to start from: ' + d.value + '\nGeneral rule: ' + LAB.method.value + '\n\n' +
      'Steps:\n1. List every input the formula needs.\n2. For each input, say where the number comes from: my data analysis (I will paste results), the customer (mark "ask the ' + d.people[0].role + '"), or an industry estimate (mark "estimate" and give a range with the source type).\n3. Compute low, likely and high yearly value in a table.\n4. Write the one-sentence problem statement and one success metric with a baseline.\n5. List the 2 inputs a CFO would challenge first.\nNever present an estimate as a fact.';
  }

  function onePager(d) {
    return 'Write a one-page proposal (markdown, under 350 words) for ' + d.business.name + ' from my notes below. Sections: the problem in their words, what I found in the data (numbers from my notes only), the proposed first step and why it is the smallest useful one, the constraint we are respecting, success metric and baseline, timeline (2 to 4 weeks), what I need from them, and the rough value with its weakest input named. No hype words.\n\nPeople:\n' + people(d) + '\n\nMy notes:\n[paste your discovery notes and findings]';
  }

  // ── Rendering ───────────────────────────────────────────────────────
  function dayState(n) { return state.days[n] || { steps: {}, notes: {} }; }
  function doneCount(n) { var s = dayState(n).steps; return STEPS.filter(function (k) { return s[k]; }).length; }

  function renderNav() {
    var html = '<button type="button" data-day="0" class="' + (current === 0 ? 'on' : '') + '"><span class="n">?</span><span class="t">How the lab works</span></button>';
    var week = 0;
    LAB.days.forEach(function (d) {
      if (d.week !== week) { week = d.week; html += '<div class="wk">Week ' + week + '</div>'; }
      var c = doneCount(d.day);
      html += '<button type="button" data-day="' + d.day + '" class="' + (current === d.day ? 'on' : '') + '" title="' + esc(d.title) + '">' +
        '<span class="n ' + (c === STEPS.length ? 'done' : c ? 'part' : '') + '">' + d.day + '</span><span class="t">' + esc(d.title) + '</span></button>';
    });
    $('days').innerHTML = html;
    var total = LAB.days.reduce(function (n, d) { return n + doneCount(d.day); }, 0);
    var max = LAB.days.length * STEPS.length;
    var full = LAB.days.filter(function (d) { return doneCount(d.day) === STEPS.length; }).length;
    $('bar').style.width = Math.round(total / max * 100) + '%';
    $('progressText').textContent = full + ' of 30 days complete' + (state.startedAt ? ' · started ' + new Date(state.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
  }

  function copyBlock(id, title, text, extra) {
    return '<div class="panel"><h3><span class="grow">' + title + '</span>' + (extra || '') +
      '<button class="btn" type="button" data-copy="' + id + '">Copy</button></h3><pre class="copy" id="' + id + '">' + esc(text) + '</pre></div>';
  }

  function renderMethod() {
    var m = LAB.method;
    $('main').innerHTML =
      '<div class="panel"><div class="meta">Start here</div><h2>How the lab works</h2>' +
      '<p>Thirty days, a different business each day, on real public data and real public complaints. Businesses are composites so nothing impersonates a real company; the data and pain points are real. Discovery calls are voice role-plays in the Interview Room; a real conversation, when you can get one, replaces the role-play that day.</p></div>' +
      '<div class="panel"><h3>The 2-hour daily loop</h3><ol>' + m.loop.map(function (s) { return '<li><b>' + esc(s.label) + '</b> (' + s.min + ' min): ' + esc(s.what) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="panel"><h3>Discovery questions you ask every time</h3><ol>' + m.discovery.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="panel"><h3>Value engineering</h3><p>' + esc(m.value) + '</p></div>' +
      '<div class="panel"><h3>How enterprises buy (process to procure)</h3><ul>' + m.procure.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="panel"><h3>Leading a customer implementation</h3><ol>' + m.implement.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="panel"><h3>The platform you build in week 3</h3><p>' + esc(m.platform) + '</p><p><b>Tools:</b> ' + esc(m.tools) + '</p></div>' +
      '<div class="panel"><h3>Real conversations (optional, never a blocker)</h3><p>' + esc(m.realTalks) + '</p></div>' +
      '<div class="panel"><h3>Video and LinkedIn</h3><p>Record each day in one take with Loom or OBS: face for the first and last 10 seconds, screen in between. Post with the video attached. Fill every [bracket] with your real number or moment before posting; never post a bracket or a number you did not get.</p>' +
      '<p class="rules">Your LinkedIn rules, already applied in every draft: short paragraphs, no em dashes, no emojis, no hype words, results first, a soft close. Rewrite the first line in your own voice; it is the hook.</p></div>' +
      '<div class="row"><button class="btn pri" type="button" data-day="' + firstOpenDay() + '">Go to day ' + firstOpenDay() + ' →</button></div>';
  }

  function firstOpenDay() {
    for (var i = 0; i < LAB.days.length; i += 1) if (doneCount(LAB.days[i].day) < STEPS.length) return LAB.days[i].day;
    return 30;
  }

  function renderDay(d) {
    var st = dayState(d.day);
    var interviewUrl = '/interview.html?lab=' + d.day +
      '&company=' + encodeURIComponent(d.business.name) +
      '&role=' + encodeURIComponent(d.people[0].role) +
      '&scenario=' + encodeURIComponent(scenario(d).slice(0, 1800));

    $('main').innerHTML =
      '<div class="panel"><div class="meta">Day ' + d.day + ' · week ' + d.week + ' · ' + esc(d.domain) + '</div>' +
      '<h2>' + esc(d.title) + '</h2><p><b>Skill:</b> ' + esc(d.focus) + '</p>' +
      '<div class="loop">' + LAB.method.loop.map(function (s) {
        var on = !!st.steps[s.step];
        return '<label class="step' + (on ? ' done' : '') + '"><input type="checkbox" data-step="' + s.step + '"' + (on ? ' checked' : '') + '>' +
          '<div><b>' + esc(s.label) + '</b><span>' + s.min + ' min · ' + esc(s.what) + '</span></div></label>';
      }).join('') + '</div></div>' +

      '<div class="panel"><h3>The business</h3><p><b>' + esc(d.business.name) + '.</b> ' + esc(d.business.profile) + '</p>' +
      '<h3 style="margin-top:12px">Real data</h3>' + d.data.map(function (x) {
        return '<div class="src"><b>' + esc(x.name) + '</b><br>' + esc(x.use) + '<br><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.url) + '</a></div>';
      }).join('') +
      '<h3 style="margin-top:12px">Where to read the real pain</h3><ul>' + d.pain.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' +

      '<div class="panel"><h3><span class="grow">The people in the room</span><a class="btn pri" href="' + esc(interviewUrl) + '">🎙 Run the discovery call</a></h3>' +
      '<div class="people">' + d.people.map(function (p, i) {
        return '<div class="person"><b>' + esc(p.role) + '</b><br>Cares about: ' + esc(p.cares) +
          '<div class="hidden-c">Hidden constraint: <span class="blur" id="hc' + i + '">' + esc(p.hidden) + '</span> <button class="btn" type="button" data-reveal="hc' + i + '">Reveal after your call</button></div></div>';
      }).join('') + '</div>' +
      '<p class="rules">The interviewer plays the first person above, with their hidden constraint, for 15 minutes. Find the constraint before you reveal it here.</p></div>' +

      copyBlock('cDisc', 'Discovery call script', discoveryScript(d)) +
      copyBlock('cSql', 'Analysis prompt (DuckDB SQL)', analysisPrompt(d)) +
      copyBlock('cVal', 'Value engineering prompt', valuePrompt(d)) +

      '<div class="panel"><h3>Build: ' + esc(d.build.goal) + '</h3><p class="rules">Paste into Claude Code in your lab repo. Read the plan it proposes before letting it write files.</p></div>' +
      copyBlock('cBuild', 'Build prompt (Claude Code)', d.build.prompt) +
      '<div class="panel"><h3>Done means</h3><ul>' + d.deliver.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      copyBlock('cOne', 'One-page proposal prompt', onePager(d)) +
      copyBlock('cVid', 'Video script (60 to 90 seconds)', d.video) +
      copyBlock('cPost', 'LinkedIn post draft', d.post, '<span class="rules" style="margin:0">Fill every [bracket] with your real result</span>') +

      '<div class="panel"><h3>Your notes and links</h3>' +
      '<label class="f">Discovery notes, findings, hidden constraint you found</label><textarea id="nNotes">' + esc(st.notes.notes || '') + '</textarea>' +
      '<label class="f">Repo or folder link</label><input type="text" id="nRepo" value="' + esc(st.notes.repo || '') + '" placeholder="https://github.com/…/opspilot/tree/main/day' + String(d.day).padStart(2, '0') + '">' +
      '<label class="f">Video link</label><input type="text" id="nVideo" value="' + esc(st.notes.video || '') + '" placeholder="Loom or YouTube link">' +
      '<label class="f">LinkedIn post link</label><input type="text" id="nPost" value="' + esc(st.notes.post || '') + '" placeholder="https://www.linkedin.com/posts/…">' +
      '<div class="row" style="margin-top:10px"><button class="btn pri" type="button" id="saveNotes">Save</button><span class="saved" id="savedMsg"></span></div></div>' +

      '<div class="row">' + (d.day > 1 ? '<button class="btn" type="button" data-day="' + (d.day - 1) + '">← Day ' + (d.day - 1) + '</button>' : '') +
      (d.day < 30 ? '<button class="btn" type="button" data-day="' + (d.day + 1) + '">Day ' + (d.day + 1) + ' →</button>' : '') + '</div>';
  }

  function show(n) {
    current = n;
    try { history.replaceState(null, '', n ? '#day-' + n : '#start'); } catch (e) {}
    renderNav();
    if (!n) renderMethod(); else renderDay(LAB.days.filter(function (d) { return d.day === n; })[0]);
    window.scrollTo(0, 0);
  }

  // ── Events ──────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-day],[data-copy],[data-reveal],#saveNotes');
    if (!b) return;
    if (b.hasAttribute('data-day')) { show(Number(b.getAttribute('data-day'))); return; }
    if (b.hasAttribute('data-copy')) {
      var text = $(b.getAttribute('data-copy')).textContent;
      navigator.clipboard.writeText(text).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); });
      return;
    }
    if (b.hasAttribute('data-reveal')) { $(b.getAttribute('data-reveal')).classList.remove('blur'); b.remove(); return; }
    if (b.id === 'saveNotes') {
      var day = current;
      var pairs = [['notes', $('nNotes').value], ['repo', $('nRepo').value.trim()], ['video', $('nVideo').value.trim()], ['post', $('nPost').value.trim()]];
      var prev = dayState(day).notes;
      var changed = pairs.filter(function (p) { return (prev[p[0]] || '') !== p[1]; });
      if (!changed.length) { $('savedMsg').textContent = 'Nothing changed'; return; }
      b.disabled = true;
      Promise.all(changed.map(function (p) { return api('/lab/note', { method: 'POST', body: { day: day, kind: p[0], value: p[1] } }); }))
        .then(function () {
          state.days[day] = state.days[day] || { steps: {}, notes: {} };
          changed.forEach(function (p) { state.days[day].notes[p[0]] = p[1]; });
          $('savedMsg').textContent = 'Saved';
        })
        .catch(function (err) { $('savedMsg').textContent = ''; alert(err.message); })
        .then(function () { b.disabled = false; });
    }
  });

  document.addEventListener('change', function (e) {
    var step = e.target.getAttribute && e.target.getAttribute('data-step');
    if (!step) return;
    var day = current, done = e.target.checked;
    e.target.disabled = true;
    api('/lab/step', { method: 'POST', body: { day: day, step: step, done: done } }).then(function () {
      state.days[day] = state.days[day] || { steps: {}, notes: {} };
      state.days[day].steps[step] = done;
      if (done && !state.startedAt) state.startedAt = new Date().toISOString();
      e.target.closest('.step').classList.toggle('done', done);
      renderNav();
    }).catch(function (err) { e.target.checked = !done; alert(err.message); })
      .then(function () { e.target.disabled = false; });
  });

  // ── Start ───────────────────────────────────────────────────────────
  api('/lab').then(function (p) {
    state = p;
    var m = /^#day-(\d+)$/.exec(location.hash);
    var n = m ? Number(m[1]) : (location.hash === '#start' || !state.startedAt ? 0 : firstOpenDay());
    show(n >= 1 && n <= 30 ? n : 0);
  }).catch(function (err) { $('main').innerHTML = '<div class="panel">Could not load your progress: ' + esc(err.message) + '</div>'; });
})();
