/**
 * Interview room client.
 *
 * Speech recognition runs in the browser (Web Speech API) rather than through
 * an API: it is free, it streams, and it keeps a 45-minute session from
 * costing anything on the listening side. The interviewer's voice comes from
 * the server, which falls back to the browser's own synthesis when no paid
 * voice is available — so the interview always works, it just sounds worse.
 *
 * Known limits, stated plainly rather than hidden: Web Speech API is Chrome-
 * only in practice and routes audio through Google's servers. The type-instead
 * path exists for when that is not acceptable, or the mic misbehaves.
 */
(function () {
  'use strict';

  var API = '/api';
  var token = null;
  try { token = localStorage.getItem('cc_token'); } catch (e) {}

  if (!token) { location.href = '/'; return; }

  function api(path, options) {
    options = options || {};
    // Fastify rejects a request that declares application/json but sends no
    // body, so the header is only set when there is actually something to send.
    var headers = { Authorization: 'Bearer ' + token };
    if (options.body) headers['Content-Type'] = 'application/json';

    return fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      if (res.status === 401) { localStorage.removeItem('cc_token'); location.href = '/'; throw new Error('Session expired'); }
      if (res.status === 204) return null;
      return res.json().then(function (d) {
        if (!res.ok) throw new Error(d.message || d.error || 'Request failed');
        return d;
      });
    });
  }

  function pollJob(id, onTick) {
    var started = Date.now();
    return new Promise(function (resolve, reject) {
      var poll = function () {
        api('/tasks/' + id).then(function (r) {
          var j = r.job;
          if (j.status === 'done') return resolve(j.result);
          if (j.status === 'error') return reject(new Error(j.error || 'Failed'));
          if (onTick) onTick(Math.round((Date.now() - started) / 1000), j.status, j.steps || []);
          setTimeout(poll, 2000);
        }).catch(reject);
      };
      setTimeout(poll, 1200);
    });
  }

  var $ = function (id) { return document.getElementById(id); };

  /** Styled confirm. Resolves true/false; Escape and backdrop both cancel. */
  function confirmModal(title, body, okLabel) {
    return new Promise(function (resolve) {
      var m = $('modal');
      $('modalTitle').textContent = title;
      $('modalBody').textContent = body;
      $('modalOk').textContent = okLabel || 'Confirm';
      m.classList.add('open');

      function close(result) {
        m.classList.remove('open');
        $('modalOk').onclick = null;
        $('modalCancel').onclick = null;
        m.onclick = null;
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }

      $('modalOk').onclick = function () { close(true); };
      $('modalCancel').onclick = function () { close(false); };
      m.onclick = function (e) { if (e.target === m) close(false); };
      document.addEventListener('keydown', onKey);
      $('modalOk').focus();
    });
  }
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  var session = null;
  var interviewer = {};
  var timerHandle = null;
  var startedAt = null;
  var durationMin = 30;
  var busy = false;
  var reportDelivery = null;
  var reportRecordingStatus = null;

  // ── Setup ──────────────────────────────────────────────────────
  // Tracked first, then freelance platforms, then everything else — so any
  // catalogue entry can be prepped, not only the ones already in the pipeline.
  api('/companies').then(function (d) {
    var all = d.companies || [];
    var opt = function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) +
        (c.research ? ' ✓researched' : '') + '</option>';
    };
    var groups = [
      ['📊 Tracked', all.filter(function (c) { return c.stage; })],
      ['💼 Freelance platforms', all.filter(function (c) { return !c.stage && c.freelance; })],
      ['🏢 All companies', all.filter(function (c) { return !c.stage && !c.freelance; })],
    ];
    $('company').innerHTML = groups
      .filter(function (g) { return g[1].length; })
      .map(function (g) {
        return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(opt).join('') + '</optgroup>';
      }).join('');
  });

  var voiceChoice = 'browser';

  api('/interview/rounds').then(function (d) {
    var voices = (d.tts || {}).voices || [{ id: 'browser', label: 'Browser voice — free', costPerInterviewUsd: 0 }];
    $('voice').innerHTML = voices.map(function (v) {
      return '<option value="' + esc(v.id) + '">' + esc(v.label) +
        (v.costPerInterviewUsd ? ' (~$' + v.costPerInterviewUsd.toFixed(2) + ')' : ' ($0)') + '</option>';
    }).join('');
    $('voice').addEventListener('change', function () { voiceChoice = $('voice').value; updateCostNote(voices); });
    updateCostNote(voices);
  }).catch(function () {});

  function updateCostNote(voices) {
    var v = (voices || []).filter(function (x) { return x.id === voiceChoice; })[0] || {};
    var voiceCost = v.costPerInterviewUsd || 0;
    $('costNote').textContent =
      'Speech recognition is free (runs in your browser). Voice: ' +
      (voiceCost ? '~$' + voiceCost.toFixed(2) : '$0.00') +
      '. The interviewer\'s reasoning costs roughly $0.05-0.10 per interview — ' +
      'the exact figure is metered live during the session.';
  }

  api('/interview?limit=8').then(function (d) {
    var s = d.sessions || [];
    if (!s.length) { $('history').textContent = 'None yet.'; return; }
    $('history').innerHTML = s.map(function (x) {
      return '<div style="padding:7px 0;border-bottom:1px solid var(--line)">' +
        '<a href="/interview.html?session=' + x.id + '" style="color:var(--ac);text-decoration:none">' +
        esc(x.company_name) + (x.role_title ? ' · ' + esc(x.role_title) : '') +
        ' — ' + esc(x.round) + '</a> ' +
        '<span style="color:var(--t3);font-size:12px">' +
        new Date(x.started_at).toLocaleDateString() + ' · ' + x.turns + ' turns' +
        (x.readiness ? ' · ' + esc(x.readiness) : ' · ' + esc(x.status)) + '</span></div>';
    }).join('');
  }).catch(function () { $('history').textContent = 'Could not load.'; });

  // ── FDE drills ─────────────────────────────────────────────────
  // Each drill is a customer situation the interviewer role-plays, with one
  // constraint left out of the brief so discovery is actually tested.
  var FDE_DRILLS = [
    { id: 'p2p', title: 'Process mining: late invoice payments',
      skill: 'Discovery + value maths',
      scenario: 'You are Lucia, Head of Procurement Operations at a mid-size Spanish manufacturer. Invoices are paid late and you lose early-payment discounts; you suspect approvals are the bottleneck but have no proof. About 4,000 invoices a month. Hidden constraint: your SAP data can only be extracted nightly, never live. Objection to raise: "IT will never give an outside tool access to SAP."' },
    { id: 'tickets', title: 'AI agent for support-ticket triage',
      skill: 'Scoping a POC',
      scenario: 'You are Marco, VP Customer Support at a European logistics SaaS. 9,000 tickets a month, first response takes 14 hours, and you want "an AI agent that handles tickets". Hidden constraint: customer data must not leave the EU, and legal must approve any model provider. Push him to promise full automation in a month.' },
    { id: 'demo', title: 'Demo to a non-technical buyer',
      skill: 'Demo storyline',
      scenario: 'You are Priya, Head of Marketing at a 40-person D2C brand. You are not technical. Ask him to demo an AI system he has built (for example MyAgentFirm) as if you were buying it. Interrupt any jargon. Hidden constraint: you care only about cutting agency spend on ad creatives. Objection: "This looks like every other AI tool."' },
    { id: 'tried-ai', title: '"We tried AI and it failed"',
      skill: 'Objection handling',
      scenario: 'You are Thomas, CFO of an insurance broker. A chatbot pilot last year gave wrong answers to customers and was switched off, and you are sceptical of anything with AI in the name. Hidden constraint: the failed pilot had no human review step and no evaluation set. Make him earn a small paid pilot.' },
    { id: 'failed-poc', title: 'POC missed its target',
      skill: 'Ownership under pressure',
      scenario: 'You are Anna, an operations director whose team ran his document-extraction POC. He promised 90% field accuracy; production shows 62% on real scanned invoices, and your boss is asking why you backed this. You are angry. Hidden detail: about a third of the documents are low-quality phone photos that were never in the test set.' },
    { id: 'say-no', title: 'Out-of-scope request by Friday',
      skill: 'Saying no, product feedback',
      scenario: 'You are Javier, a key-account customer two weeks into a deployment. You demand a custom integration with your in-house ERP by Friday for a board demo, and hint you will escalate to his CEO. Hidden constraint: the ERP has no API, only CSV exports. Test whether he offers a smaller version that still delivers value and routes the rest to the product team.' },
  ];

  var pendingScenario = '';

  function drillDoneAt(id) {
    try { return localStorage.getItem('cc_fde_drill_' + id); } catch (e) { return null; }
  }

  function renderDrills() {
    $('fdeDrills').innerHTML = FDE_DRILLS.map(function (d) {
      var done = drillDoneAt(d.id);
      return '<div class="drill"><div><b>' + esc(d.title) + '</b>' +
        (done ? ' <span class="done">✓ last run ' + esc(done) + '</span>' : '') +
        '<span class="hint">Skill: ' + esc(d.skill) + '</span></div>' +
        '<button class="btn" type="button" data-drill="' + esc(d.id) + '">Run drill →</button></div>';
    }).join('');
  }
  renderDrills();

  // Launched from the FDE Lab: a discovery role-play with that day's business,
  // which is not a company in his pipeline, so it goes by name.
  var labQs = new URLSearchParams(location.search);
  var labCase = labQs.get('lab') ? {
    day: labQs.get('lab'), company: labQs.get('company') || '', role: labQs.get('role') || '', scenario: labQs.get('scenario') || '',
  } : null;
  if (labCase) {
    $('round').value = 'fde';
    $('duration').value = '15';
    $('role').value = 'Forward Deployed Engineer';
    $('setupHint').textContent = 'FDE Lab day ' + labCase.day + ': the interviewer plays the ' + labCase.role + ' of ' +
      labCase.company + '. Press Start mock interview.';
  }

  $('fdeDrills').addEventListener('click', function (e) {
    var b = e.target.closest('[data-drill]');
    if (!b) return;
    var d = FDE_DRILLS.filter(function (x) { return x.id === b.getAttribute('data-drill'); })[0];
    if (!d) return;
    $('round').value = 'fde';
    $('duration').value = '15';
    if (!$('role').value.trim()) $('role').value = 'Forward Deployed Engineer';
    pendingScenario = d.scenario;
    try { localStorage.setItem('cc_fde_drill_' + d.id, new Date().toISOString().slice(0, 10)); } catch (err) {}
    renderDrills();
    $('startBtn').click();
  });

  $('startBtn').addEventListener('click', function () {
    var btn = $('startBtn');
    var scenario = pendingScenario || (labCase && labCase.scenario) || '';
    pendingScenario = '';
    recordMode = $('record').value;
    btn.disabled = true;
    $('setupHint').textContent = 'Reading the JD, your WIN doc and the research…';

    api('/interview/start', {
      method: 'POST',
      body: {
        companyId: labCase ? undefined : $('company').value,
        companyName: labCase ? labCase.company : undefined,
        roleTitle: $('role').value.trim(),
        round: $('round').value,
        durationMin: parseInt($('duration').value, 10),
        jobDescription: $('jd').value.trim(),
        scenario: scenario || undefined,
      },
    })
      .then(function (d) {
        return pollJob(d.job.id, function (s) {
          $('setupHint').textContent = 'Designing your interview… ' + s + 's';
        });
      })
      .then(function (res) { enterRoom(res); })
      .catch(function (err) {
        $('setupHint').textContent = '';
        alert(err.message);
        btn.disabled = false;
      });
  });

  // ── Prep guide ─────────────────────────────────────────────────
  // Shares the setup panel with the mock but produces a study document.
  // Progress is streamed step-by-step so the live searches (Glassdoor,
  // Reddit, Blind) are auditable rather than a two-minute spinner.
  function renderPrepSteps(steps) {
    var trace = $('prepTrace');
    if (!steps || !steps.length) return;
    trace.style.display = 'block';
    trace.innerHTML = steps.map(function (s) {
      var icon = s.status === 'ok' || s.status === 'done' ? '✓'
        : s.status === 'failed' ? '✕'
        : s.status === 'cached' ? '⟳' : '▸';
      var color = s.status === 'failed' ? '#ff9b9b'
        : (s.status === 'ok' || s.status === 'done') ? '#7ee0a8' : '#7c8ba3';
      var head = '<div style="padding:5px 0;border-bottom:1px solid var(--line)">' +
        '<span style="color:' + color + ';font-weight:700">' + icon + '</span> ' +
        '<span style="font-size:12px">' + esc(s.message || '') + '</span>';
      if (s.sources && s.sources.length) {
        head += '<div style="font-size:10px;margin:3px 0 0 14px">' +
          s.sources.slice(0, 5).map(function (x) {
            return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" style="color:var(--ac)">' +
              esc((x.title || x.url).slice(0, 72)) + '</a>' +
              (x.date ? ' <span style="color:var(--t3)">(' + esc(x.date) + ')</span>' : '');
          }).join('<br>') + '</div>';
      }
      return head + '</div>';
    }).join('');
  }

  $('prepBtn').addEventListener('click', function () {
    var btn = $('prepBtn');
    btn.disabled = true;
    $('startBtn').disabled = true;
    $('setupHint').textContent = 'Preparing your study guide…';
    $('prepProgress').style.display = 'block';
    $('prepProgress').textContent = 'Searching how ' + ($('company').selectedOptions[0]?.text || 'this company') +
      ' actually interviews — Glassdoor, Reddit, Blind, engineering blogs…';

    api('/interview/prep', {
      method: 'POST',
      body: {
        companyId: $('company').value,
        roleTitle: $('role').value.trim(),
        round: $('round').value,
        jobDescription: $('jd').value.trim(),
      },
    })
      .then(function (d) {
        return pollJob(d.job.id, function (secs, status, steps) {
          $('prepProgress').textContent = 'Building the guide — ' + secs + 's elapsed';
          renderPrepSteps(steps);
        });
      })
      .then(function (res) {
        renderPrepView(res.prep, res.id);
      })
      .catch(function (err) {
        $('setupHint').textContent = '';
        $('prepProgress').style.display = 'none';
        alert(err.message);
      })
      .then(function () {
        btn.disabled = false;
        $('startBtn').disabled = false;
      });
  });

  function pill(text, tone) {
    return '<span class="rating ' + tone + '" style="margin-left:6px">' + esc(text) + '</span>';
  }

  function bulletList(items) {
    return '<ul style="margin:4px 0 0 20px;padding:0">' +
      (items || []).map(function (b) { return '<li style="margin:3px 0">' + esc(b) + '</li>'; }).join('') +
      '</ul>';
  }

  // Escaped payload so we can round-trip the whole question object through a
  // data attribute — the deep-dive handler needs the walkthrough / STAR /
  // connectsTo as context so its answer is coherent with the guide.
  function encQuestion(q) {
    try { return esc(JSON.stringify(q)); } catch (e) { return ''; }
  }

  function questionCard(q, opts) {
    var connects = q.connectsTo
      ? '<div style="font-size:11px;color:var(--t3);margin-top:6px">↳ ' + esc(q.connectsTo) + '</div>'
      : '';
    var prep = q.prepPoints && q.prepPoints.length
      ? '<div style="margin-top:8px"><strong style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Prep points</strong>' +
        bulletList(q.prepPoints) + '</div>'
      : '';
    var walkthrough = q.walkthrough
      ? '<div style="margin-top:10px;padding:10px 12px;background:rgba(74,124,255,.06);border-left:3px solid var(--ac);border-radius:0 8px 8px 0">' +
        '<div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Walkthrough</div>' +
        '<div style="font-size:13px;line-height:1.55">' + esc(q.walkthrough) + '</div>' +
        '</div>'
      : '';
    var story = q.prepStory
      ? '<div class="model-answer" style="margin-top:8px">' +
        (q.prepStory.project ? '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">Story: ' + esc(q.prepStory.project) + '</div>' : '') +
        (q.prepStory.situation ? '<div style="margin-bottom:4px"><strong>S:</strong> ' + esc(q.prepStory.situation) + '</div>' : '') +
        (q.prepStory.task      ? '<div style="margin-bottom:4px"><strong>T:</strong> ' + esc(q.prepStory.task) + '</div>' : '') +
        (q.prepStory.action    ? '<div style="margin-bottom:4px"><strong>A:</strong> ' + esc(q.prepStory.action) + '</div>' : '') +
        (q.prepStory.result    ? '<div><strong>R:</strong> ' + esc(q.prepStory.result) + '</div>' : '') +
        '</div>'
      : '';
    var delivery = q.delivery
      ? '<div style="font-size:12px;color:var(--t2);margin-top:6px"><strong>Delivery:</strong> ' + esc(q.delivery) + '</div>'
      : '';

    var dive =
      '<div style="margin-top:10px">' +
      '<button class="btn cc-deep-dive" type="button" data-q="' + encQuestion(q) + '" style="font-size:12px;padding:6px 10px">' +
      '🧠 Brush me up on this</button>' +
      '<div class="cc-deep-out" style="margin-top:10px"></div>' +
      '</div>';

    return '<div style="border:1px solid var(--line);border-radius:10px;padding:12px 15px;margin:8px 0;background:var(--panel2)">' +
      '<div style="font-size:14px;font-weight:600">' + esc(q.question || '') + '</div>' +
      (q.why ? '<div style="font-size:12px;color:var(--t2);margin-top:4px">' + esc(q.why) + '</div>' : '') +
      prep + walkthrough + story + delivery + connects + dive +
      '</div>';
  }

  /**
   * Fire the on-demand deep dive. The button carries the question payload as a
   * data attribute so we do not need to keep a parallel index of cards.
   */
  var lastPrepId = null;
  function runDeepDive(btn) {
    var out = btn.parentNode.querySelector('.cc-deep-out');
    if (out.dataset.loaded === '1') {
      out.style.display = out.style.display === 'none' ? 'block' : 'none';
      return;
    }
    var q = {};
    try { q = JSON.parse(btn.dataset.q.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')); }
    catch (e) {}
    var topic = q.question || '';
    var ctx = [
      q.why ? 'Why they ask: ' + q.why : '',
      q.connectsTo ? 'Connects to: ' + q.connectsTo : '',
      q.walkthrough ? 'Walkthrough hint: ' + q.walkthrough : '',
      q.prepStory ? 'Suggested story project: ' + (q.prepStory.project || '') : '',
    ].filter(Boolean).join('\n');

    btn.disabled = true;
    var original = btn.textContent;
    btn.textContent = '🧠 Coaching…';

    api('/interview/preps/deep-dive', {
      method: 'POST',
      body: { prepId: lastPrepId, topic: topic, questionContext: ctx },
    })
      .then(function (r) { renderDeepDive(out, r.deepDive); out.dataset.loaded = '1'; })
      .catch(function (err) {
        out.innerHTML = '<div class="cc-bad">Deep dive failed: ' + esc(err.message) + '</div>';
      })
      .then(function () { btn.disabled = false; btn.textContent = original; });
  }

  function renderDeepDive(el, d) {
    var followUps = (d.followUps || []).map(function (f) {
      return '<div style="padding:6px 0;border-bottom:1px solid var(--line)">' +
        '<div style="font-size:13px;font-weight:600">' + esc(f.question || '') + '</div>' +
        '<div style="font-size:12px;color:var(--t2);margin-top:2px">' + esc(f.howToHandle || '') + '</div>' +
        '</div>';
    }).join('');
    var gotchas = (d.gotchas || []).map(function (g) {
      return '<div style="padding:6px 0;border-bottom:1px solid var(--line)">' +
        '<div style="font-size:13px">✕ ' + esc(g.wrongAnswer || '') + '</div>' +
        '<div style="font-size:12px;color:var(--t2);margin-top:2px">' + esc(g.whyItFails || '') + '</div>' +
        '</div>';
    }).join('');
    var pointers = (d.studyPointers || []).length
      ? '<div style="margin-top:10px"><strong style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Look these up</strong>' +
        bulletList(d.studyPointers) + '</div>'
      : '';

    el.innerHTML =
      '<div style="border:1px solid var(--line);border-left:3px solid #7ee0a8;border-radius:0 10px 10px 0;padding:14px 16px;background:#0d1017">' +
      (d.coreConcept ? '<h4 style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3)">Core concept</h4>' +
        '<div style="font-size:13px;line-height:1.6">' + esc(d.coreConcept) + '</div>' : '') +

      (d.whatTheyreTesting ? '<h4 style="margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3)">What they\'re testing</h4>' +
        '<div style="font-size:13px;line-height:1.6">' + esc(d.whatTheyreTesting) + '</div>' : '') +

      (d.howToAnswer ? '<h4 style="margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3)">How to answer</h4>' +
        '<div style="font-size:13px;line-height:1.6">' + esc(d.howToAnswer) + '</div>' : '') +

      (d.workedExample ? '<h4 style="margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3)">Worked example (speak it out loud)</h4>' +
        '<div style="font-size:13px;line-height:1.6;padding:10px 12px;background:rgba(61,220,132,.06);border-left:3px solid #7ee0a8;border-radius:0 8px 8px 0">' +
        esc(d.workedExample) + '</div>' : '') +

      (followUps ? '<h4 style="margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3)">Follow-ups you will get</h4>' + followUps : '') +

      (gotchas ? '<h4 style="margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3)">Gotchas — do not say these</h4>' + gotchas : '') +

      pointers +
      '</div>';
  }

  var lastPrepSetup = null;

  function renderPrepView(guide, prepId) {
    lastPrepSetup = {
      companyId: $('company').value,
      companyName: $('company').selectedOptions[0]?.text || guide.companyName,
      role: $('role').value,
      round: $('round').value,
      duration: $('duration').value,
      jd: $('jd').value,
    };

    $('setup').style.display = 'none';
    $('prepView').style.display = 'block';

    $('prepTitle').textContent = 'Prep guide — ' + (guide.companyName || '') +
      (guide.roleTitle ? ' · ' + guide.roleTitle : '');
    var confidence = guide.confidence || 'general';
    var confPill = confidence === 'grounded' ? pill('grounded in candidate reports', 'strong')
      : confidence === 'partial' ? pill('partial evidence', 'adequate')
      : pill('general — no specific reports found', 'needs-practice');
    $('prepSub').innerHTML =
      (guide.round && guide.round !== 'any' ? esc(guide.round) + ' round emphasis' : 'All rounds covered') +
      confPill +
      (guide.sources && guide.sources.length ? ' · ' + guide.sources.length + ' sources' : '') +
      (prepId ? ' · <span style="color:var(--t3)">saved</span>' : '');

    var html = '';

    var isFreelance = guide.freelance || !!guide.freelancePlaybook;

    if (guide.summary) {
      html += '<div class="cc-ok" style="margin-bottom:14px">' + esc(guide.summary) + '</div>';
    }

    // The playbook is the most actionable part of a freelance guide, so it
    // leads: what to put on the profile today, how to pitch, what to charge.
    var pb = guide.freelancePlaybook;
    if (pb) {
      var copyable = function (label, text) {
        if (!text) return '';
        return '<div style="margin:10px 0">' +
          '<div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">' + esc(label) + '</div>' +
          '<div class="model-answer" style="margin:0;white-space:pre-wrap">' + esc(text) + '</div>' +
          '<button class="btn cc-copy-pb" type="button" data-text="' + esc(text) + '" style="font-size:11px;padding:4px 10px;margin-top:6px">Copy</button>' +
          '</div>';
      };
      html += '<h3>💼 Freelance playbook</h3>' +
        (pb.nicheToLeadWith ? '<div class="cc-ok" style="margin-bottom:10px"><strong>Lead with:</strong> ' + esc(pb.nicheToLeadWith) + '</div>' : '') +
        copyable('Profile headline', pb.profileHeadline) +
        copyable('Profile summary', pb.profileSummary) +
        copyable('Proposal / pitch template', pb.proposalTemplate) +
        (pb.rateStrategy
          ? '<div style="margin:10px 0"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Rate strategy</div>' +
            '<div style="font-size:13px;line-height:1.55">' + esc(pb.rateStrategy) + '</div></div>'
          : '') +
        ((pb.portfolioPieces || []).length
          ? '<div style="margin:10px 0"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Portfolio pieces</div>' +
            pb.portfolioPieces.map(function (p) {
              return '<div style="padding:6px 0;border-bottom:1px solid var(--line)"><strong>' + esc(p.project || '') + '</strong>' +
                '<div style="font-size:12px;color:var(--t2)">' + esc(p.howToPresent || '') + '</div></div>';
            }).join('') + '</div>'
          : '') +
        ((pb.first14Days || []).length
          ? '<div style="margin:10px 0"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">First 14 days</div>' +
            bulletList(pb.first14Days) + '</div>'
          : '');
    }

    if (guide.format) {
      html += '<h3>' + (isFreelance ? 'The vetting pipeline' : 'The interview loop') + '</h3>' +
        '<div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px 15px">' +
        (guide.format.style ? '<div><strong>Style:</strong> ' + esc(guide.format.style) + '</div>' : '') +
        (guide.format.duration ? '<div><strong>Duration:</strong> ' + esc(guide.format.duration) + '</div>' : '') +
        ((guide.format.rounds || []).length
          ? '<div style="margin-top:6px"><strong>Rounds:</strong> ' + (guide.format.rounds || []).map(esc).join(' → ') + '</div>' : '') +
        ((guide.format.evidence || []).length
          ? '<div style="margin-top:8px"><strong style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Evidence</strong>' +
            (guide.format.evidence || []).map(function (e) { return '<blockquote>' + esc(e) + '</blockquote>'; }).join('') + '</div>' : '') +
        '</div>';
    }

    if ((guide.focusAreas || []).length) {
      html += '<h3>Focus areas <span style="font-size:11px;color:var(--t3);font-weight:400">— concept refresher on each</span></h3>';
      (guide.focusAreas || []).forEach(function (f) {
        var tone = f.priority === 'high' ? 'needs-practice' : f.priority === 'low' ? 'not-assessed' : 'adequate';
        var refresher = f.refresher
          ? '<div style="margin-top:10px;padding:12px 14px;background:rgba(74,124,255,.06);border-left:3px solid var(--ac);border-radius:0 8px 8px 0">' +
            '<div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Refresher</div>' +
            '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap">' + esc(f.refresher) + '</div>' +
            (f.connectToHisWork
              ? '<div style="font-size:12px;color:var(--t2);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)"><strong>Your angle:</strong> ' + esc(f.connectToHisWork) + '</div>'
              : '') +
            '</div>'
          : '';
        html += '<div style="padding:12px 0;border-bottom:1px solid var(--line)">' +
          '<div style="display:flex;gap:10px;align-items:flex-start">' +
          '<div style="flex:1"><strong>' + esc(f.area || '') + '</strong>' +
          '<div style="font-size:12px;color:var(--t2);margin-top:2px">' + esc(f.why || '') + '</div>' +
          '</div>' + pill(f.priority || 'med', tone) + '</div>' +
          refresher +
          '</div>';
      });
    }

    var lq = guide.likelyQuestions || {};
    if ((lq.technical || []).length) {
      html += '<h3>' + (isFreelance ? 'Vetting / skills-test questions' : 'Likely technical questions') + '</h3>' +
        (lq.technical || []).map(function (q) { return questionCard(q); }).join('');
    }
    if ((lq.behavioural || []).length) {
      html += '<h3>' + (isFreelance ? 'Client discovery-call questions' : 'Likely behavioural questions') + '</h3>' +
        (lq.behavioural || []).map(function (q) { return questionCard(q); }).join('');
    }
    if ((lq.companySpecific || []).length) {
      html += '<h3>' + (isFreelance ? 'Platform-specific screening quirks' : 'Company-specific — expect these') + '</h3>' +
        (lq.companySpecific || []).map(function (q) { return questionCard(q); }).join('');
    }

    if ((guide.candidateReports || []).length) {
      html += '<h3>' + (isFreelance ? 'What real freelancers said' : 'What real candidates said') + '</h3>';
      (guide.candidateReports || []).forEach(function (r) {
        html += '<div style="border-left:3px solid var(--ac);padding:8px 12px;margin:8px 0;background:var(--panel2);border-radius:0 8px 8px 0">' +
          '<blockquote style="margin:0 0 6px;padding:0;border:0;background:none">' + esc(r.quote || '') + '</blockquote>' +
          '<div style="font-size:11px;color:var(--t3)">' +
          (r.source ? '<a href="' + (String(r.source).match(/^https?:/) ? esc(r.source) : '#') + '" target="_blank" rel="noopener" style="color:var(--ac)">' + esc(r.source) + '</a>' : '') +
          (r.date ? ' · ' + esc(r.date) : '') + '</div>' +
          (r.takeaway ? '<div style="font-size:12px;color:var(--t2);margin-top:6px">' + esc(r.takeaway) + '</div>' : '') +
          '</div>';
      });
    }

    if ((guide.askThem || []).length) {
      html += '<h3>' + (isFreelance ? 'Ask the client' : 'Ask them') + '</h3>' + bulletList(guide.askThem);
    }

    if ((guide.redFlags || []).length) {
      html += '<h3>Red flags to avoid</h3><div class="cc-bad" style="border-radius:10px">' +
        (guide.redFlags || []).map(function (r) { return '• ' + esc(r); }).join('<br>') +
        '</div>';
    }

    if ((guide.studyChecklist || []).length) {
      html += '<h3>Study checklist</h3>';
      (guide.studyChecklist || []).forEach(function (t, i) {
        var tone = t.priority === 'high' ? 'needs-practice' : t.priority === 'low' ? 'not-assessed' : 'adequate';
        html += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)">' +
          '<label style="display:flex;gap:8px;align-items:flex-start;flex:1;cursor:pointer">' +
          '<input type="checkbox" data-check="' + i + '" style="margin-top:4px">' +
          '<span><strong>' + esc(t.task || '') + '</strong>' +
          '<div style="font-size:12px;color:var(--t2);margin-top:2px">' + esc(t.why || '') + '</div></span>' +
          '</label>' + pill((t.durationMin ? t.durationMin + ' min · ' : '') + (t.priority || 'med'), tone) +
          '</div>';
      });
    }

    if ((guide.sources || []).length) {
      html += '<h3>Sources</h3><div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px 15px;font-size:12px">' +
        (guide.sources || []).slice(0, 30).map(function (s) {
          return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" style="color:var(--ac)">' +
            esc(s.title || s.url) + '</a>' + (s.date ? ' <span style="color:var(--t3)">(' + esc(s.date) + ')</span>' : '');
        }).join('<br>') + '</div>';
    }

    $('prepReport').innerHTML = html;

    // Wire the on-demand "Brush me up" buttons — one delegated listener would
    // work, but per-button attachment keeps the flow easy to trace.
    lastPrepId = prepId || null;
    $('prepReport').querySelectorAll('.cc-deep-dive').forEach(function (b) {
      b.addEventListener('click', function () { runDeepDive(b); });
    });
    $('prepReport').querySelectorAll('.cc-copy-pb').forEach(function (b) {
      b.addEventListener('click', function () {
        navigator.clipboard.writeText(b.dataset.text || '').then(function () {
          b.textContent = '✓ Copied';
          setTimeout(function () { b.textContent = 'Copy'; }, 1600);
        });
      });
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('prepBack').addEventListener('click', function () {
    $('prepView').style.display = 'none';
    $('setup').style.display = 'block';
    $('prepProgress').style.display = 'none';
    $('prepTrace').style.display = 'none';
    $('setupHint').textContent = '';
    refreshPrepHistory();
  });

  // Same setup, but drop into the mock — keeps flow "study, then practice".
  $('prepToMock').addEventListener('click', function () {
    $('prepView').style.display = 'none';
    $('setup').style.display = 'block';
    if (lastPrepSetup) {
      if (lastPrepSetup.companyId) $('company').value = lastPrepSetup.companyId;
      if (lastPrepSetup.role) $('role').value = lastPrepSetup.role;
      if (lastPrepSetup.round) $('round').value = lastPrepSetup.round;
      if (lastPrepSetup.duration) $('duration').value = lastPrepSetup.duration;
      if (lastPrepSetup.jd) $('jd').value = lastPrepSetup.jd;
    }
    $('startBtn').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function refreshPrepHistory() {
    api('/interview/preps?limit=8').then(function (d) {
      var list = d.preps || [];
      var el = $('prepHistory');
      if (!list.length) { el.textContent = 'None yet.'; return; }
      el.innerHTML = list.map(function (p) {
        return '<div style="padding:7px 0;border-bottom:1px solid var(--line)">' +
          '<a href="#" data-prep-id="' + esc(p.id) + '" style="color:var(--ac);text-decoration:none">' +
          esc(p.company_name || '') + (p.role_title ? ' · ' + esc(p.role_title) : '') +
          '</a> <span style="color:var(--t3);font-size:12px">' +
          new Date(p.created_at).toLocaleDateString() +
          (p.confidence ? ' · ' + esc(p.confidence) : '') +
          (p.source_count ? ' · ' + p.source_count + ' sources' : '') +
          '</span></div>';
      }).join('');
      el.querySelectorAll('[data-prep-id]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var id = a.dataset.prepId;
          api('/interview/preps/' + id).then(function (r) {
            var row = r.prep;
            renderPrepView({
              ...row.guide,
              sources: row.sources || [],
              companyName: row.company_name,
              roleTitle: row.role_title,
              round: row.round,
            }, row.id);
          }).catch(function (err) { alert(err.message); });
        });
      });
    }).catch(function () { $('prepHistory').textContent = 'Could not load.'; });
  }
  refreshPrepHistory();

  // Opened from the Today board with ?prep=<id>: show that guide straight away.
  if (new URLSearchParams(location.search).get('prep')) {
    api('/interview/preps/' + encodeURIComponent(new URLSearchParams(location.search).get('prep'))).then(function (r) {
      var row = r.prep;
      renderPrepView({
        ...row.guide,
        sources: row.sources || [],
        companyName: row.company_name,
        roleTitle: row.role_title,
        round: row.round,
      }, row.id);
    }).catch(function () { /* the setup page stays as it is */ });
  }

  // ── Recording ──────────────────────────────────────────────────
  // MediaRecorder writes short chunks which are uploaded as they are produced,
  // so a crashed tab costs seconds rather than the whole session, and no large
  // blob is ever held in memory.
  var recorder = null;
  var mediaStream = null;
  var recordMode = 'video';
  var chunkQueue = Promise.resolve();

  function pickMime() {
    var candidates = recordMode === 'audio'
      ? ['audio/webm;codecs=opus', 'audio/webm']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < candidates.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return '';
  }

  function startRecording() {
    if (recordMode === 'off' || !window.MediaRecorder || !navigator.mediaDevices) {
      return Promise.resolve(false);
    }

    var constraints = recordMode === 'audio'
      ? { audio: true }
      : { audio: true, video: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } };

    return navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        mediaStream = stream;

        if (recordMode === 'video') {
          var v = $('selfView');
          v.srcObject = stream;
          v.classList.add('on');
        }

        var mime = pickMime();
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 600000 } : undefined);

        recorder.ondataavailable = function (e) {
          if (!e.data || !e.data.size) return;
          // Serialised so chunks append to the file in order.
          chunkQueue = chunkQueue.then(function () {
            return fetch(API + '/interview/' + session.id + '/recording/chunk', {
              method: 'POST',
              headers: { 'Content-Type': mime || 'video/webm', Authorization: 'Bearer ' + token },
              body: e.data,
            }).catch(function () { /* a dropped chunk must not stop the interview */ });
          });
        };

        recorder.start(6000); // a chunk every 6 seconds
        $('recDot').classList.add('on');
        return true;
      })
      .catch(function (err) {
        $('micHint').textContent = 'Recording unavailable (' + err.name + ') — the interview still works.';
        return false;
      });
  }

  function stopRecording() {
    if (!recorder) return Promise.resolve();
    try { recorder.stop(); } catch (e) {}
    $('recDot').classList.remove('on');
    $('selfView').classList.remove('on');
    if (mediaStream) mediaStream.getTracks().forEach(function (t) { t.stop(); });
    recorder = null;

    // Wait for outstanding chunks before telling the server the file is done.
    return chunkQueue.then(function () {
      return api('/interview/' + session.id + '/recording/finish', { method: 'POST' })
        .catch(function () { return null; });
    });
  }

  // ── Room ───────────────────────────────────────────────────────
  function enterRoom(res) {
    session = res.session;
    interviewer = res.interviewer || {};
    durationMin = session.duration_min;
    startedAt = Date.now();

    $('setup').style.display = 'none';
    $('room').style.display = 'block';

    var name = interviewer.name || 'Interviewer';
    $('ivName').textContent = name;
    $('ivTitle').textContent = (interviewer.title || '') + ' · ' + session.company_name;
    $('avatar').textContent = name.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
    $('roundLabel').textContent = session.round + ' · ' +
      (res.usedWinDoc ? 'WIN doc loaded' : 'no WIN doc') +
      (res.usedResearch ? ' · research loaded' : '');

    history.replaceState({}, '', '/interview.html?session=' + session.id);
    tickTimer();
    timerHandle = setInterval(tickTimer, 1000);
    setInterval(refreshCost, 8000);
    refreshCost();

    startRecording();
    addMessage('interviewer', res.opening);
    say(res.opening);
  }

  function refreshCost() {
    if (!session) return;
    api('/interview/' + session.id + '/cost')
      .then(function (c) {
        $('costMeter').textContent = '$' + Number(c.usd || 0).toFixed(4);
      })
      .catch(function () {});
  }

  var wrappedUp = false;
  var timeUpAnnounced = false;

  function markTimeUp() {
    wrappedUp = true;
    $('endBtn').classList.add('pri');
    var b = $('timeUp');
    b.textContent = 'Interview complete. You can still add a final answer, or end it and get your feedback.';
    b.classList.add('show');
  }

  function tickTimer() {
    var s = Math.floor((Date.now() - startedAt) / 1000);
    var m = Math.floor(s / 60);
    var el = $('timer');
    el.textContent = String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    if (m >= durationMin - 5) el.classList.add('low');

    // Out of time: ask the interviewer to close properly rather than leaving
    // the conversation hanging. Answering is still allowed afterwards.
    if (m >= durationMin && !timeUpAnnounced && !busy) {
      timeUpAnnounced = true;
      var b = $('timeUp');
      b.textContent = 'Time is up — ' + (interviewer.name || 'the interviewer') + ' is wrapping up.';
      b.classList.add('show');
      busy = true;
      $('mic').disabled = true;
      api('/interview/' + session.id + '/turn', { method: 'POST', body: { wrapUp: true } })
        .then(function (r) {
          addMessage('interviewer', r.say);
          say(r.say);
          busy = false;
          $('mic').disabled = false;
          markTimeUp();
          $('micHint').textContent = 'Interview complete — add a final answer, or end it for feedback.';
        })
        .catch(function () {
          busy = false;
          $('mic').disabled = false;
          markTimeUp();
          $('micHint').textContent = 'Interview complete — end it for feedback.';
        });
    }
  }

  function addMessage(who, text, interim) {
    var t = $('transcript');
    if (interim) {
      var prev = t.querySelector('.msg.interim');
      if (prev) prev.remove();
    }
    var div = document.createElement('div');
    div.className = 'msg ' + who + (interim ? ' interim' : '');
    div.innerHTML =
      '<div class="tag">' + (who === 'interviewer' ? 'IV' : 'YOU') + '</div>' +
      '<div class="body"><div class="name">' +
      esc(who === 'interviewer' ? (interviewer.name || 'Interviewer') : 'You') +
      '</div>' + esc(text) + '</div>';
    t.appendChild(div);
    t.scrollTop = t.scrollHeight;
    return div;
  }

  // ── Interviewer voice ──────────────────────────────────────────
  function browserSpeak(text) {
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 1;
      var voices = speechSynthesis.getVoices();
      var preferred = voices.filter(function (v) { return /en-GB|en-US/.test(v.lang) && !/Google/.test(v.name); })[0];
      if (preferred) u.voice = preferred;
      u.onend = function () { $('avatar').classList.remove('speaking'); };
      speechSynthesis.speak(u);
    } catch (e) {
      $('avatar').classList.remove('speaking');
    }
  }

  function say(text) {
    $('avatar').classList.add('speaking');

    // The free browser voice never touches the server.
    if (voiceChoice === 'browser') { browserSpeak(text); return Promise.resolve(); }

    return fetch(API + '/interview/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ text: text, model: voiceChoice }),
    })
      .then(function (res) {
        // 204 = no paid voice available; use the free browser one.
        if (res.status === 204) { browserSpeak(text); return; }
        if (!res.ok) { browserSpeak(text); return; }
        return res.blob().then(function (blob) {
          var audio = new Audio(URL.createObjectURL(blob));
          audio.onended = function () { $('avatar').classList.remove('speaking'); };
          audio.onerror = function () { browserSpeak(text); };
          return audio.play().catch(function () { browserSpeak(text); });
        });
      })
      .catch(function () { browserSpeak(text); });
  }

  // ── Candidate voice (free, in-browser) ─────────────────────────
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null;
  var listening = false;
  var finalText = '';
  var lastInterim = '';
  var spokeAt = null;

  if (!SR) {
    $('micHint').textContent = 'Your browser has no speech recognition (Chrome does) — use Type instead.';
    $('mic').disabled = true;
    $('typeRow').style.display = 'block';
  }

  function startListening() {
    if (!SR || listening || busy) return;
    recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-IN';

    finalText = '';
    lastInterim = '';
    spokeAt = Date.now();

    recog.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk + ' ';
        else interim += chunk;
      }
      // Stopping recognition discards anything not yet marked final, so the
      // last interim is kept as a fallback — otherwise a complete spoken
      // answer is silently thrown away as "nothing heard".
      if (interim) { lastInterim = interim; addMessage('candidate', interim, true); }
    };

    recog.onerror = function (e) {
      if (e.error === 'not-allowed') {
        $('micHint').textContent = 'Microphone blocked. Allow it in the address bar, or use Type instead.';
      }
      stopListening(false);
    };

    recog.onend = function () { if (listening) { try { recog.start(); } catch (err) {} } };

    try { recog.start(); } catch (err) {}
    listening = true;
    $('mic').classList.add('listening');
    $('micHint').textContent = 'Listening… click the mic again when you have finished answering.';
  }

  function stopListening(send) {
    if (!listening) return;
    listening = false;
    $('mic').classList.remove('listening');
    try { recog.stop(); } catch (e) {}

    var interim = $('transcript').querySelector('.msg.interim');
    if (interim) interim.remove();

    var answer = (finalText.trim() || lastInterim.trim());
    if (!send || !answer) {
      $('micHint').textContent = answer ? 'Discarded.' : 'Nothing heard — try again, or type instead.';
      return;
    }
    addMessage('candidate', answer);
    sendAnswer(answer, Date.now() - spokeAt);
  }

  $('mic').addEventListener('click', function () {
    if (listening) stopListening(true); else startListening();
  });

  $('typeBtn').addEventListener('click', function () {
    var row = $('typeRow');
    row.style.display = row.style.display === 'none' ? 'block' : 'none';
  });

  $('sendTyped').addEventListener('click', function () {
    var text = $('typed').value.trim();
    if (!text) return;
    $('typed').value = '';
    addMessage('candidate', text);
    sendAnswer(text, null);
  });

  function sendAnswer(answer, ms) {
    busy = true;
    $('mic').disabled = true;
    $('micHint').textContent = (interviewer.name || 'The interviewer') + ' is thinking…';

    api('/interview/' + session.id + '/turn', { method: 'POST', body: { answer: answer, answerMs: ms } })
      .then(function (r) {
        addMessage('interviewer', r.say);
        say(r.say);
        busy = false;
        $('mic').disabled = false;
        if (r.shouldEnd) {
          markTimeUp();
          $('micHint').textContent = 'Interview complete — get your feedback when ready.';
        } else {
          $('micHint').textContent = 'Click the mic to answer.';
        }
      })
      .catch(function (err) {
        busy = false;
        $('mic').disabled = false;
        $('micHint').textContent = 'Error: ' + err.message;
      });
  }

  // ── Finish ─────────────────────────────────────────────────────
  $('endBtn').addEventListener('click', function () {
    if (listening) stopListening(true);

    confirmModal(
      'End the interview?',
      (wrappedUp
        ? 'I\'ll assess your answers and show you what to practise next.'
        : 'You still have time left. Ending now assesses only what you have answered so far.'),
      'End & get feedback'
    ).then(function (ok) {
      if (ok) endInterview();
    });
  });

  function endInterview() {
    clearInterval(timerHandle);
    stopRecording();
    try { speechSynthesis.cancel(); } catch (e) {}

    $('endBtn').disabled = true;
    $('micHint').textContent = 'Assessing your answers…';

    api('/interview/' + session.id + '/finish', { method: 'POST' })
      .then(function (d) {
        return pollJob(d.job.id, function (s) {
          $('micHint').textContent = 'Assessing your answers… ' + s + 's';
        });
      })
      .then(function (res) {
        refreshCost();
        // Fetch the stored turns so the finished report carries the full
        // transcript, exactly as reopening the session later does.
        reportDelivery = res.delivery || null;
        return api('/interview/' + session.id)
          .then(function (d) {
            reportRecordingStatus = d.session.recording_status;
            showReport(res.report, d.turns);
          })
          .catch(function () { showReport(res.report); });
      })
      .catch(function (err) {
        $('micHint').textContent = 'Could not assess: ' + err.message;
        $('endBtn').disabled = false;
      });
  }

  function renderDelivery(d) {
    if (!d) return '';
    var html = '<h3>How you delivered it</h3>' +
      '<p class="cc-muted" style="margin-top:-2px">' + esc(d.note) + '</p><div class="metric-row">';

    var metrics = [
      [d.avgWordsPerMinute || '—', 'words / min'],
      [d.fillerRatePercent + '%', 'filler words'],
      [d.longestUnbrokenRun, 'longest run-on'],
      [d.avgWordsPerAnswer, 'avg answer'],
      [(d.talkShare == null ? '—' : d.talkShare + '%'), 'you talking'],
    ];
    metrics.forEach(function (m) {
      html += '<div class="metric"><b>' + esc(String(m[0])) + '</b><span>' + esc(m[1]) + '</span></div>';
    });
    html += '</div>';

    (d.flags || []).forEach(function (f) {
      html += '<div class="' + (f.severity === 'high' ? 'cc-bad' : 'cc-warn') + '">' +
        '<strong>' + esc(f.metric) + ': ' + esc(f.value) + '</strong><br>' + esc(f.note) + '</div>';
    });

    if ((d.topFillers || []).length) {
      html += '<p class="cc-muted">Most used: ' +
        d.topFillers.map(function (f) { return esc(f.word) + ' ×' + f.count; }).join(' · ') + '</p>';
    }
    return html;
  }

  function renderRecording(sessionId, status) {
    if (!status || status === 'none') return '';
    var where = status === 'stored' ? 'stored in R2'
      : status === 'uploading' ? 'moving to R2'
      : status === 'local' ? 'on the server' : status;
    return '<h3>Watch yourself back</h3>' +
      '<video id="playback" controls preload="metadata" src="' + API + '/interview/' + sessionId +
      '/recording?t=' + Date.now() + '"></video>' +
      '<p class="cc-muted">Recording ' + esc(where) + '. Nothing in the assessment above is derived ' +
      'from this video — it is here so you can review your own delivery.</p>';
  }

  function showReport(r, turns) {
    $('room').style.display = 'none';
    $('setup').style.display = 'none';
    $('reportView').style.display = 'block';
    $('reportSub').textContent = session.company_name + ' · ' + session.round + ' round';
    api('/interview/' + session.id + '/cost').then(function (c) {
      $('reportSub').textContent += ' · cost $' + Number(c.usd || 0).toFixed(4) +
        ' (' + c.calls + ' AI calls)';
    }).catch(function () {});

    var html = '<p><strong>' + esc(r.overall || '') + '</strong></p>';
    if (r.readiness) {
      html += '<p><span class="rating ' + esc(r.readiness) + '">' + esc(r.readiness) + '</span></p>';
    }

    if ((r.competencies || []).length) {
      html += '<h3>By competency</h3>';
      r.competencies.forEach(function (c) {
        html += '<div style="margin-bottom:13px">' +
          '<strong>' + esc(c.name) + '</strong> ' +
          '<span class="rating ' + esc(c.rating) + '">' + esc(c.rating) + '</span>' +
          (c.evidence ? '<blockquote>' + esc(c.evidence) + '</blockquote>' : '') +
          '<div style="color:var(--t2)">' + esc(c.comment || '') + '</div></div>';
      });
    }

    if (r.weakestAnswer) {
      var w = r.weakestAnswer;
      html += '<h3>Weakest answer</h3>' +
        '<div style="color:var(--t2)">' + esc(w.question || '') + '</div>' +
        (w.hisAnswer ? '<blockquote>' + esc(w.hisAnswer) + '</blockquote>' : '') +
        '<p><strong>Missing:</strong> ' + esc(w.whatWasMissing || '') + '</p>' +
        '<p><strong>A strong version:</strong> ' + esc(w.strongVersion || '') + '</p>';
    }

    if ((r.missedOpportunities || []).length) {
      html += '<h3>You had better material and did not use it</h3>';
      r.missedOpportunities.forEach(function (m) {
        html += '<div style="margin-bottom:9px">' + esc(m.moment || '') +
          '<br><span style="color:var(--g)">→ ' + esc(m.shouldHaveUsed || '') + '</span></div>';
      });
    }

    if (r.nextPractice) {
      html += '<h3>Practise this next</h3>' +
        '<div class="cc-ok"><strong>' + esc(r.nextPractice.focus || '') + '</strong> · ' +
        esc(String(r.nextPractice.durationMin || 20)) + ' min<br>' +
        esc(r.nextPractice.why || '') + '</div>';
    }

    if (!(r.modelAnswers || []).length) {
      html += '<div class="cc-warn" id="reassessBox"><strong>This feedback predates per-question model answers.</strong><br>' +
        'Re-assess the same transcript against the current format to get a written-out ' +
        'better answer for every question, plus delivery metrics.' +
        '<div style="margin-top:9px"><button class="btn pri" id="reassessBtn" type="button">Re-assess this interview</button></div></div>';
    }

    if ((r.modelAnswers || []).length) {
      html += '<h3>How to answer each question better</h3>';
      r.modelAnswers.forEach(function (m, i) {
        html += '<div style="margin-bottom:20px">' +
          '<strong>' + (i + 1) + '. ' + esc(m.question) + '</strong>' +
          (m.hisAnswer ? '<blockquote>' + esc(m.hisAnswer) + '</blockquote>' : '') +
          (m.problem ? '<p style="color:var(--t2)"><strong>Problem:</strong> ' + esc(m.problem) + '</p>' : '') +
          '<div class="model-answer"><div class="cc-muted" style="margin-bottom:5px">SAY THIS INSTEAD</div>' +
          esc(m.modelAnswer || '') +
          '<br><button class="cc-copy" type="button" style="margin-top:9px;padding:5px 11px;font-size:11px;font-weight:600;background:#222a39;border:1px solid #333d50;border-radius:6px;color:#a9b6c9;cursor:pointer">Copy</button></div>' +
          (m.whyBetter ? '<p class="cc-muted">' + esc(m.whyBetter) + '</p>' : '') +
          '</div>';
      });
    }

    html += renderDelivery(reportDelivery);
    html += renderRecording(session.id, reportRecordingStatus);

    if ((turns || []).length) {
      html += '<h3>Full transcript</h3><div id="pastTranscript"></div>';
    }

    $('report').innerHTML = html;

    var reassess = $('reassessBtn');
    if (reassess) {
      reassess.addEventListener('click', function () {
        reassess.disabled = true;
        reassess.textContent = 'Re-assessing…';
        api('/interview/' + session.id + '/reassess', { method: 'POST' })
          .then(function (d) {
            return pollJob(d.job.id, function (secs) {
              reassess.textContent = 'Re-assessing… ' + secs + 's';
            });
          })
          .then(function (res) {
            reportDelivery = res.delivery || null;
            return api('/interview/' + session.id)
              .then(function (full) { showReport(res.report, full.turns); });
          })
          .catch(function (err) {
            reassess.disabled = false;
            reassess.textContent = 'Re-assess this interview';
            alert(err.message);
          });
      });
    }

    $('report').addEventListener('click', function (e) {
      if (!e.target.classList || !e.target.classList.contains('cc-copy')) return;
      var text = e.target.parentNode.textContent.replace(/^SAY THIS INSTEAD/, '').replace(/Copy$/, '').trim();
      navigator.clipboard.writeText(text).then(function () {
        e.target.textContent = '✓ Copied';
        setTimeout(function () { e.target.textContent = 'Copy'; }, 1800);
      });
    });

    if ((turns || []).length) {
      var host = $('pastTranscript');
      turns.forEach(function (t) {
        var div = document.createElement('div');
        div.className = 'msg ' + t.speaker;
        div.innerHTML =
          '<div class="tag">' + (t.speaker === 'interviewer' ? 'IV' : 'YOU') + '</div>' +
          '<div class="body"><div class="name">' +
          esc(t.speaker === 'interviewer' ? (interviewer.name || 'Interviewer') : 'You') +
          '</div>' + esc(t.text) + '</div>';
        host.appendChild(div);
      });
    }
  }

  $('againBtn').addEventListener('click', function () { location.href = '/interview.html'; });

  // ── Reopen a saved interview ───────────────────────────────────
  // A finished one shows its feedback and full transcript; an unfinished one
  // is resumed in place, with the conversation replayed, so a session is never
  // lost just because the tab was closed.
  var qs = new URLSearchParams(location.search);

  // Launched from a company card: preselect it and pull the role through.
  if (qs.get('company') && !qs.get('session') && !qs.get('lab')) {
    var wantCompany = qs.get('company');
    var wantRole = qs.get('role') || '';
    var applyPrefill = function () {
      var sel = $('company');
      if (!sel || !sel.options.length) return setTimeout(applyPrefill, 250);
      sel.value = wantCompany;
      if (wantRole) $('role').value = wantRole;
      $('setupHint').textContent =
        'Ready — this interview will use that company\'s JD, tailored resume, ' +
        'WIN document and research.';
    };
    applyPrefill();
  }

  if (qs.get('session')) {
    $('setup').style.display = 'none';
    api('/interview/' + qs.get('session'))
      .then(function (d) {
        session = d.session;
        interviewer = d.session.interviewer || {};
        durationMin = d.session.duration_min;

        if (d.session.report) {
          reportDelivery = d.session.delivery || null;
          reportRecordingStatus = d.session.recording_status;
          showReport(d.session.report, d.turns);
          return;
        }

        // Still active — put the room back exactly as it was.
        $('room').style.display = 'block';
        var name = interviewer.name || 'Interviewer';
        $('ivName').textContent = name;
        $('ivTitle').textContent = (interviewer.title || '') + ' · ' + session.company_name;
        $('avatar').textContent = name.split(' ').map(function (p) { return p[0]; })
          .join('').slice(0, 2).toUpperCase();
        $('roundLabel').textContent = session.round +
          (session.role_title ? ' · ' + session.role_title : '');

        (d.turns || []).forEach(function (t) { addMessage(t.speaker, t.text); });

        startedAt = new Date(session.started_at).getTime();
        tickTimer();
        timerHandle = setInterval(tickTimer, 1000);
        setInterval(refreshCost, 8000);
        refreshCost();

        var over = Math.floor((Date.now() - startedAt) / 60000) >= durationMin;
        if (over) { timeUpAnnounced = true; markTimeUp(); }
        $('micHint').textContent = over
          ? 'Resumed after time. Add a final answer, or end it and get feedback.'
          : 'Resumed. Click the mic to carry on.';
      })
      .catch(function (err) {
        $('setup').style.display = 'block';
        $('setupHint').textContent = 'Could not reopen that interview: ' + err.message;
      });
  }
})();
