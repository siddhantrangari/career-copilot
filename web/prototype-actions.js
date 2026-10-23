/**
 * Turns the prototypes' prompt generators into real, executed actions.
 *
 * The originals produced text to copy into Claude or ChatGPT by hand, then the
 * result lived in a chat window and nowhere else. The server can now run all of
 * it — grounded in live web search — and persist both the run and its output,
 * so these overrides replace the copy-paste flow with a real one.
 *
 * Loaded by bridge.js AFTER the prototype's own script has executed, so these
 * definitions win.
 */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;

  var esc = CC.esc;
  var runJob = CC.runJob;

  // ── Shared result panel ────────────────────────────────────────────
  function panel(el) {
    var box = el.querySelector('.cc-inline-out');
    if (!box) {
      box = document.createElement('div');
      box.className = 'cc-inline-out';
      el.appendChild(box);
    }
    return box;
  }

  function running(box, label) {
    box.innerHTML = '<div class="cc-card"><span class="cc-spin">◐</span> ' + esc(label) +
      '…<div class="cc-tick cc-muted" style="margin-top:6px"></div></div>';
    return function (seconds, status) {
      var t = box.querySelector('.cc-tick');
      if (t) {
        t.textContent = status + ' — ' + seconds + 's' +
          (seconds > 45 ? ' · live web search in progress, this is normal' : '');
      }
    };
  }

  function failed(box, err) {
    box.innerHTML = '<div class="cc-bad"><strong>Failed.</strong><br>' + esc(err.message) + '</div>';
  }

  function copyBlock(text) {
    return '<div class="cc-card">' + esc(text) +
      '<br><button class="cc-copy" type="button">Copy</button></div>';
  }

  // Delegate copy clicks for anything rendered here.
  document.addEventListener('click', function (e) {
    if (!e.target.classList || !e.target.classList.contains('cc-copy')) return;
    var text = e.target.parentNode.textContent.replace(/Copy$/, '').trim();
    navigator.clipboard.writeText(text).then(function () {
      e.target.textContent = '✓ Copied';
      setTimeout(function () { e.target.textContent = 'Copy'; }, 1800);
    });
  });

  function renderResearch(box, r) {
    var html = '';
    html += '<div class="cc-ok">Grounded in a live web search' +
      (r.searchedAt ? ' on ' + new Date(r.searchedAt).toLocaleString() : '') +
      ' — ' + ((r.sources || []).length) + ' sources. Saved to this company in your pipeline.</div>';

    html += '<h4>Curiosity hook</h4>' + copyBlock(r.hookSentence || '');

    html += '<h4>Challenges (by business impact)</h4>';
    (r.challenges || []).forEach(function (ch, i) {
      html += '<div class="cc-card"><div class="cc-meta">' +
        '<span>' + esc(ch.evidenceType || '') + '</span>' +
        '<span>impact: ' + esc(ch.businessImpact || '—') + '</span>' +
        (ch.sourceDate ? '<span>' + esc(ch.sourceDate) + '</span>' : '') +
        (ch.sourceUrl ? '<a href="' + esc(ch.sourceUrl) + '" target="_blank" rel="noopener" style="color:#5b86ff">source</a>' : '') +
        '</div><strong>' + (i + 1) + '. ' + esc(ch.challenge || '') + '</strong>\n\n' +
        'Evidence: ' + esc(ch.evidence || '') + '\n\n' +
        'Why it matters: ' + esc(ch.whyItMattersToRole || '—') + '\n\n' +
        'Root cause: ' + esc(ch.rootCause || '—') + '\n\n' +
        'Solution: ' + esc(ch.solution || '—') + '\n\n' +
        'Proof: ' + esc(ch.proofStory || '—') +
        '</div>';
    });

    html += '<h4>First DM</h4>' + copyBlock(r.firstDM || '');

    if (r.interviewSignal) {
      html += '<h4>Interview process</h4><div class="' +
        (r.interviewSignal.style === 'algorithmic' ? 'cc-bad' : 'cc-ok') + '"><strong>' +
        esc(r.interviewSignal.style || 'unknown') + '</strong><br>' +
        esc(r.interviewSignal.evidence || '') + '</div>';
    }

    if ((r.recentNews || []).length) {
      html += '<h4>Recent news</h4><div class="cc-card">' +
        r.recentNews.map(function (n) {
          if (typeof n === 'string') return esc(n);
          return '<strong>' + esc(n.date || '') + '</strong> — ' + esc(n.item || '') +
            (n.sourceUrl ? ' <a href="' + esc(n.sourceUrl) + '" target="_blank" rel="noopener" style="color:#5b86ff">link</a>' : '');
        }).join('<br><br>') + '</div>';
    }

    if ((r.gaps || []).length) {
      html += '<h4>Could not establish</h4><div class="cc-warn">' +
        r.gaps.map(function (g) { return '• ' + esc(g); }).join('<br>') + '</div>';
    }

    box.innerHTML = html;
  }

  // ── main page: Company Research ────────────────────────────────────
  if (document.getElementById('researchCo')) {
    var researchSection = document.getElementById('researchCo').closest('div[style]') ||
      document.getElementById('researchCo').parentNode;

    window.genResearchPrompt = function () {
      var name = document.getElementById('researchCo').value.trim();
      var role = document.getElementById('researchRole').value.trim();
      if (!name) { alert('Enter company name'); return; }

      var host = document.getElementById('researchOut') || researchSection;
      host.style.display = 'block';
      var legacy = document.getElementById('researchText');
      if (legacy) legacy.parentNode.style.display = 'none';

      var box = panel(host);
      var onTick = running(box, 'Searching the live web for ' + name);

      runJob('research', { companyName: name, roleName: role, force: true }, onTick)
        .then(function (res) { renderResearch(box, res.research); })
        .catch(function (err) { failed(box, err); });
    };
  }

  // ── main page: Cold Email ──────────────────────────────────────────
  if (document.getElementById('ceCompany')) {
    window.genColdEmail = function () {
      var name = document.getElementById('ceCompany').value.trim();
      var role = document.getElementById('ceRole').value.trim();
      var recipient = document.getElementById('ceRecruiter').value.trim();
      if (!name) { alert('Enter the company name'); return; }

      var host = document.getElementById('ceOut') || document.getElementById('ceCompany').parentNode;
      host.style.display = 'block';
      var box = panel(host);
      var onTick = running(box, 'Writing a cold email for ' + name);

      runJob('cold-email', { companyName: name, roleName: role, recipient: recipient }, onTick)
        .then(function (res) {
          var e = res.email;
          box.innerHTML =
            '<div class="cc-ok">Written from this company\'s research and saved to your message log.</div>' +
            '<h4>Subject</h4>' + copyBlock(e.subject || '') +
            '<h4>Body</h4>' + copyBlock(e.body || '') +
            '<h4>Follow-up</h4>' + copyBlock((e.followUpSubject || '') + '\n\n' + (e.followUpBody || ''));
        })
        .catch(function (err) { failed(box, err); });
    };
  }

  // ── outreach page: Tailored Resume ─────────────────────────────────
  // ── outreach page: Tailored Resume & Studio ───────────────────────
  window.__CC_RESUME_STUDIO_ACTIONS__ = {
    runJob: runJob,
    api: window.__CC__.api,
    esc: esc,
    running: running,
    failed: failed,
  };

  if (document.getElementById('tailorJD')) {
    window.genTailorPrompt = function () {
      if (typeof window.triggerTailorResume === 'function') {
        window.triggerTailorResume();
        return;
      }
      var name = document.getElementById('tailorCompany').value.trim();
      var role = document.getElementById('tailorRole').value.trim();
      var jd = document.getElementById('tailorJD').value.trim();
      if (!jd) { alert('Please paste the job description'); return; }

      var host = document.getElementById('tailorJD').parentNode;
      var box = panel(host);
      var onTick = running(box, 'Tailoring your resume and fact-checking it');

      runJob('tailor-resume', {
        companyName: name, jobTitle: role, jobDescription: jd,
      }, onTick)
        .then(function (res) {
          var r = res.resume;
          var v = r.verification || {};
          var html = '';

          if (v.safeToSend === false) {
            html += '<div class="cc-bad"><strong>Do not send as-is — ' + v.blockingCount +
              ' unverifiable claim(s).</strong></div>';
          } else if (v.clean) {
            html += '<div class="cc-ok">Fact-check passed — every claim traces to your real history.</div>';
          }

          (v.issues || []).forEach(function (i) {
            html += '<div class="' + (i.severity === 'minor' ? 'cc-warn' : 'cc-bad') + '"><strong>' +
              esc(i.severity) + '</strong> — ' + esc(i.claim) + '<br>' + esc(i.problem) +
              '<br><em>Fix: ' + esc(i.correction) + '</em></div>';
          });

          html += '<h4>Match: ' + (r.matchScore || 0) + '/100</h4>';
          if (r.dsaSignal && r.dsaSignal.likely) {
            html += '<div class="cc-warn"><strong>Possible DSA/LeetCode process.</strong><br>' +
              esc(r.dsaSignal.evidence) + '</div>';
          }
          if ((r.talkingPoints || []).length) {
            html += '<h4>Lead with these</h4>' +
              copyBlock(r.talkingPoints.map(function (t) { return '• ' + t; }).join('\n'));
          }
          html += '<h4>Tailored resume</h4>' + copyBlock(r.tailoredResumeText || '');
          box.innerHTML = html;
        })
        .catch(function (err) { failed(box, err); });
    };
  }

  // ── outreach page: STEP 1 / STEP 4 static prompt blocks ────────────
  // These were paragraphs of prompt text with a Copy button. Give each one a
  // button that actually runs the step against the live API.
  function upgradeStep(titleMatch, label, build) {
    var titles = Array.prototype.slice.call(document.querySelectorAll('.stitle'));
    var title = titles.filter(function (t) {
      return t.textContent.indexOf(titleMatch) !== -1;
    })[0];
    if (!title) return;

    var section = title.parentNode;
    var bar = document.createElement('div');
    bar.style.marginTop = '10px';
    section.appendChild(bar);
    build(bar, section);
  }

  upgradeStep('STEP 1', 'research', function (bar, section) {
    bar.innerHTML =
      '<div class="cc-warn" style="margin-bottom:8px">You no longer need to paste this anywhere — ' +
      'run it here and it searches the live web, then saves the brief to the company.</div>' +
      '<input type="text" class="cc-s1-co" placeholder="Company name" ' +
      'style="padding:8px 11px;margin-right:6px;background:#151a24;border:1px solid #2a3243;border-radius:8px;color:#e7ecf3">' +
      '<input type="text" class="cc-s1-role" placeholder="Role" ' +
      'style="padding:8px 11px;margin-right:6px;background:#151a24;border:1px solid #2a3243;border-radius:8px;color:#e7ecf3">' +
      '<button class="btn pri cc-s1-go" type="button">Run live research</button>';

    bar.querySelector('.cc-s1-go').addEventListener('click', function () {
      var name = bar.querySelector('.cc-s1-co').value.trim();
      if (!name) { alert('Enter a company name'); return; }
      var box = panel(section);
      var onTick = running(box, 'Searching the live web for ' + name);
      runJob('research', {
        companyName: name,
        roleName: bar.querySelector('.cc-s1-role').value.trim(),
        force: true,
      }, onTick)
        .then(function (res) { renderResearch(box, res.research); })
        .catch(function (err) { failed(box, err); });
    });
  });

  upgradeStep('STEP 4', 'win', function (bar, section) {
    bar.innerHTML =
      '<div class="cc-warn" style="margin-bottom:8px">Run this directly — it pulls live public ' +
      'evidence for each problem and saves the WIN doc to the company.</div>' +
      '<input type="text" class="cc-s4-co" placeholder="Company" ' +
      'style="padding:8px 11px;margin-right:6px;background:#151a24;border:1px solid #2a3243;border-radius:8px;color:#e7ecf3">' +
      '<input type="text" class="cc-s4-name" placeholder="Who you spoke to" ' +
      'style="padding:8px 11px;background:#151a24;border:1px solid #2a3243;border-radius:8px;color:#e7ecf3">' +
      '<textarea class="cc-s4-problems" placeholder="One confirmed problem per line — their words" ' +
      'style="width:100%;min-height:80px;margin-top:8px;padding:9px 11px;background:#151a24;border:1px solid #2a3243;border-radius:8px;color:#e7ecf3;font-family:inherit"></textarea>' +
      '<button class="btn pri cc-s4-go" type="button" style="margin-top:8px">Build WIN document</button>';

    bar.querySelector('.cc-s4-go').addEventListener('click', function () {
      var name = bar.querySelector('.cc-s4-co').value.trim();
      var problems = bar.querySelector('.cc-s4-problems').value
        .split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!name) { alert('Enter the company'); return; }
      if (!problems.length) { alert('Add at least one problem they confirmed on the call'); return; }

      var box = panel(section);
      var onTick = running(box, 'Building the WIN document for ' + name);
      runJob('generate-win-doc', {
        companyName: name,
        contactName: bar.querySelector('.cc-s4-name').value.trim(),
        problems: problems,
      }, onTick)
        .then(function (res) {
          var w = res.winDoc || {};
          var slides = (w.slides && w.slides.length)
            ? w.slides
            : (w.sections && w.sections.slides) || [];
          var CC = window.__CC__ || {};
          var companyId = res.companyId;

          if (CC.renderWinDeck) {
            CC.renderWinDeck({
              container: box,
              winDoc: w,
              slides: slides,
              companyName: name,
              winDocId: res.id,
            });
            if (CC.api && companyId && CC.applyBrand) {
              CC.api('/companies/' + encodeURIComponent(companyId) + '/brand')
                .then(function (b) { CC.applyBrand(b.brand); })
                .catch(function () {});
            }
          } else {
            // bridge.js should always be loaded first, but never leave the user
            // with no output at all if it isn't.
            box.innerHTML =
              (w.sendMessage ? '<h4>Message to send with it</h4>' + copyBlock(w.sendMessage) : '') +
              '<h4>WIN document</h4>' + copyBlock(w.markdown || '');
          }
        })
        .catch(function (err) { failed(box, err); });
    });
  });
})();

/* ────────────────────────────────────────────────────────────────────
 * Network modal — correct LinkedIn faceted search.
 *
 * The prototype built currentCompany=["Remote.com"]. LinkedIn's facet takes a
 * numeric organisation id, so the name was silently dropped and the search ran
 * unfiltered — returning engineering managers at unrelated companies while
 * looking like it worked. This replaces openNet() with URLs built server-side
 * from resolved ids, and says plainly when an id is missing.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC || typeof window.openNet !== 'function') return;

  var api = CC.api, esc = CC.esc;

  var MESSAGES = {
    peers: function (n) {
      return 'Hi [Name] — I came across your profile while researching ' + n +
        "'s engineering team. I'm a senior full-stack + AI engineer (ex-Philips, 12 years) " +
        'exploring senior roles globally. Would love to connect and hear about your experience at ' + n + '.';
    },
    managers: function (n) {
      return 'Hi [Name] — I\'ve been following ' + n + "'s work and came across something " +
        'interesting about [specific challenge from your research]. I\'m a senior full-stack + AI ' +
        'engineer (ex-Philips) — would love to connect and share a quick perspective.';
    },
    recruiters: function (n) {
      return 'Hi [Name] — I\'m a senior full-stack + AI engineer with 12+ years (ex-Philips ' +
        'Innovation Campus) actively exploring opportunities at ' + n + '. Would love to connect ' +
        'and learn about any upcoming roles.';
    },
    indians: function (n) {
      return 'Hi [Name] — noticed you\'re at ' + n + ' and thought I\'d reach out. I\'m a senior ' +
        'full-stack + AI engineer from Mumbai (ex-Philips) exploring global roles. Would love to ' +
        'hear about your experience there — happy to keep it to 15 minutes!';
    },
  };

  var ICONS = { peers: '👩‍💻', managers: '🏢', recruiters: '📋', indians: '🇮🇳' };

  window.openNet = function (companyId) {
    var title = document.getElementById('netTitle');
    var body = document.getElementById('netBody');
    if (!title || !body) return;

    title.textContent = 'Network — loading…';
    body.innerHTML = '<p class="cc-muted">Building LinkedIn searches…</p>';
    openM('netModal');

    api('/linkedin/network/' + encodeURIComponent(companyId))
      .then(function (d) {
        var name = d.company.name;
        title.textContent = 'Network at ' + name;

        var html = '';

        if (!d.precise) {
          html += '<div class="cc-bad"><strong>No LinkedIn company ID for ' + esc(name) + '.</strong><br>' +
            'LinkedIn\'s company filter needs a numeric ID — a name is silently ignored and ' +
            'returns people at unrelated companies. These searches fall back to a keyword ' +
            'query, which is less precise.<br><br>' +
            'Fix it once: open the company on LinkedIn, apply the company filter in People ' +
            'search, then paste that URL here.' +
            '<div style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap">' +
            '<input type="text" class="cc-li-input" placeholder="Paste LinkedIn URL or numeric ID" ' +
            'style="flex:1;min-width:200px;padding:7px 10px;background:#151a24;border:1px solid #2a3243;border-radius:7px;color:#e7ecf3">' +
            '<button class="cc-li-save" type="button" style="padding:7px 13px;border-radius:7px;background:#4a7cff;border:0;color:#fff;font-weight:600;cursor:pointer">Save</button>' +
            '<a href="' + esc(d.companyPage) + '" target="_blank" rel="noopener" ' +
            'style="padding:7px 13px;border-radius:7px;border:1px solid #2a3243;color:#9ab4ff;text-decoration:none">Find on LinkedIn ↗</a>' +
            '</div></div>';
        } else if (!d.verified) {
          html += '<div class="cc-warn"><strong>Using LinkedIn ID ' + esc(d.linkedInId) + ' — ' +
            'matched automatically as "' + esc(d.linkedInName || '?') + '".</strong><br>' +
            'If that is not the right company (auto-matching can pick a research arm or a ' +
            'similarly named firm), correct it before relying on these results.' +
            '<div style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap">' +
            '<button class="cc-li-verify" type="button" style="padding:6px 12px;border-radius:7px;background:#1f3a2c;border:1px solid #2c5540;color:#7ee0a8;font-weight:600;cursor:pointer">That\'s correct</button>' +
            '<input type="text" class="cc-li-input" placeholder="Or paste the right URL / ID" ' +
            'style="flex:1;min-width:180px;padding:6px 10px;background:#151a24;border:1px solid #2a3243;border-radius:7px;color:#e7ecf3">' +
            '<button class="cc-li-save" type="button" style="padding:6px 12px;border-radius:7px;background:#4a7cff;border:0;color:#fff;font-weight:600;cursor:pointer">Save</button>' +
            '</div></div>';
        } else {
          html += '<div class="cc-ok">Filtering on LinkedIn company ID ' + esc(d.linkedInId) +
            ' (' + esc(d.linkedInName || name) + ') — verified.</div>';
        }

        html += '<div class="cc-muted" style="margin-bottom:10px">Open LinkedIn → copy message → Connect → paste as note</div>';

        d.searches.forEach(function (s) {
          html += '<div class="cc-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
            '<strong>' + ICONS[s.key] + ' ' + esc(s.label) + '</strong>' +
            '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" ' +
            'style="flex:none;padding:5px 12px;border-radius:7px;border:1px solid #2a3243;color:#9ab4ff;text-decoration:none;font-size:12px;font-weight:600">Open LinkedIn ↗</a>' +
            '</div>' +
            '<div class="cc-meta" style="margin-top:7px">COPY → LINKEDIN → CONNECT → PASTE AS NOTE (300 CHAR LIMIT)</div>' +
            (MESSAGES[s.key] ? MESSAGES[s.key](name) : '') +
            '<br><button class="cc-copy" type="button">Copy</button>' +
            '</div>';
        });

        body.innerHTML = html;

        var input = body.querySelector('.cc-li-input');
        var save = body.querySelector('.cc-li-save');
        if (save) {
          save.addEventListener('click', function () {
            var value = input.value.trim();
            if (!value) return;
            save.disabled = true;
            save.textContent = 'Saving…';
            api('/linkedin/companies/' + encodeURIComponent(companyId), {
              method: 'POST', body: { value: value },
            })
              .then(function () { window.openNet(companyId); })
              .catch(function (e) {
                save.disabled = false;
                save.textContent = 'Save';
                alert(e.message);
              });
          });
        }

        var verify = body.querySelector('.cc-li-verify');
        if (verify) {
          verify.addEventListener('click', function () {
            verify.disabled = true;
            api('/linkedin/companies/' + encodeURIComponent(companyId) + '/verify', { method: 'POST' })
              .then(function () { window.openNet(companyId); })
              .catch(function (e) { verify.disabled = false; alert(e.message); });
          });
        }
      })
      .catch(function (err) {
        body.innerHTML = '<div class="cc-bad">Could not build searches: ' + esc(err.message) + '</div>';
      });
  };
})();

/* ────────────────────────────────────────────────────────────────────
 * Track modal — open pre-filled instead of blank.
 *
 * The server already knows the apply URL, how many messages were generated,
 * whether a WIN doc exists, which connections are logged and how far along the
 * company actually is. The prototype opened an empty form regardless. This
 * fills what it can and labels every auto-filled value with where it came
 * from, so nothing looks like it was invented.
 *
 * Values already saved always win — auto-fill only proposes for empty fields.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC || typeof window.openTrack !== 'function') return;

  var api = CC.api, esc = CC.esc;
  var original = window.openTrack;

  function hintRow(field, text) {
    var el = document.getElementById(field);
    if (!el || !text) return;
    var existing = el.parentNode.querySelector('.cc-prov');
    if (existing) existing.remove();
    var d = document.createElement('div');
    d.className = 'cc-prov';
    d.style.cssText = 'font-size:10px;color:#5b86ff;margin-top:4px;line-height:1.4';
    d.textContent = '↳ ' + text;
    el.parentNode.appendChild(d);
  }

  window.openTrack = function (id) {
    // Render the prototype's modal first so it never feels slower than before.
    original(id);

    document.querySelectorAll('#trackModal .cc-prov, #trackModal .cc-facts').forEach(function (n) { n.remove(); });

    api('/companies/' + encodeURIComponent(id) + '/autofill')
      .then(function (d) {
        var s = d.suggested || {}, p = d.provenance || {}, f = d.facts || {};

        // Only fill fields the user has not already filled.
        [['tJD', 'jd'], ['tJdText', 'jdText'], ['tMsgs', 'msgs'], ['tNotes', 'notes']].forEach(function (pair) {
          var el = document.getElementById(pair[0]);
          if (el && !el.value.trim() && s[pair[1]]) {
            el.value = s[pair[1]];
            hintRow(pair[0], p[pair[1]]);
            if (pair[0] === 'tJdText' && typeof window.updateJdWordCount === 'function') {
              window.updateJdWordCount();
            }
          }
        });

        var stageEl = document.getElementById('tStage');
        if (stageEl && s.stage && s.stage !== stageEl.value) {
          stageEl.value = s.stage;
          hintRow('tStage', p.stage);
        }

        var winEl = document.getElementById('tWin');
        if (winEl && s.win && winEl.value === 'none') {
          winEl.value = s.win;
          hintRow('tWin', p.win);
        }

        // A compact summary of what exists for this company.
        var bits = [];
        if (f.researched) bits.push('✓ researched' + (f.researchedAt ? ' ' + new Date(f.researchedAt).toLocaleDateString() : ''));
        else bits.push('○ no research yet');
        bits.push((f.connections || 0) + ' connections');
        bits.push((f.messages || 0) + ' messages');
        bits.push((f.winDocs || 0) + ' WIN docs');
        bits.push((f.tailoredResumes || 0) + ' tailored resumes');
        if (f.linkedInId) bits.push('LinkedIn ID set');

        var host = document.getElementById('trackTitle');
        if (host) {
          var box = document.createElement('div');
          box.className = 'cc-facts';
          box.style.cssText = 'margin-top:8px;font-size:11px;color:#7c8ba3;line-height:1.6';
          box.innerHTML = esc(bits.join(' · ')) +
            ((f.interviews || []).length
              ? '<br>' + f.interviews.map(function (i) {
                  return '<a href="/interview.html?session=' + esc(i.id) + '" style="color:#5b86ff;text-decoration:none">' +
                    esc(i.round) + ' interview' + (i.readiness ? ' — ' + esc(i.readiness) : '') + ' ↗</a>';
                }).join(' · ')
              : '');
          host.parentNode.appendChild(box);
        }
      })
      .catch(function () { /* a failed prefill must not block the form */ });
  };
})();

/* ────────────────────────────────────────────────────────────────────
 * Copilot button on every company card, and auto-fill for the outreach
 * page's Track modal.
 *
 * The outreach page has its own track modal (openUpdate, updateJD…) with
 * different element ids from the main page's (openTrack, tJD…), which is why
 * auto-fill worked on one page and not the other.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  // ── Outreach page: same auto-fill, different element ids ────────────
  if (typeof window.openUpdate === 'function') {
    var originalUpdate = window.openUpdate;

    window.openUpdate = function (id) {
      originalUpdate(id);
      document.querySelectorAll('#updateModal .cc-prov').forEach(function (n) { n.remove(); });

      api('/companies/' + encodeURIComponent(id) + '/autofill')
        .then(function (d) {
          var s = d.suggested || {}, p = d.provenance || {};

          var fill = function (elId, key) {
            var el = document.getElementById(elId);
            if (!el || el.value.trim() || !s[key]) return;
            el.value = s[key];
            var note = document.createElement('div');
            note.className = 'cc-prov';
            note.style.cssText = 'font-size:10px;color:#5b86ff;margin-top:4px';
            note.textContent = '↳ ' + (p[key] || '');
            el.parentNode.appendChild(note);
          };

          fill('updateJD', 'jd');
          fill('updateMsgs', 'msgs');
          fill('updateNotes', 'notes');

          var conns = document.getElementById('updateConns');
          if (conns && !conns.value.trim() && (d.connections || []).length) {
            var byType = {};
            d.connections.forEach(function (c) { byType[c.type] = (byType[c.type] || 0) + 1; });
            conns.value = Object.keys(byType).map(function (t) { return byType[t] + ' ' + t; }).join(', ');
          }

          var stage = document.getElementById('updateStage');
          if (stage && s.stage && stage.value === 'new') stage.value = s.stage;

          var win = document.getElementById('updateWin');
          if (win && s.win && win.value === 'none') win.value = s.win;
        })
        .catch(function () {});
    };
  }

  // ── Copilot button on each company card ─────────────────────────────
  function addCopilotButtons() {
    var triggers = document.querySelectorAll(
      'button[onclick^="openTrack("], button[onclick^="openUpdate("]'
    );

    triggers.forEach(function (btn) {
      if (btn.dataset.ccCopilot) return;
      btn.dataset.ccCopilot = '1';

      var m = (btn.getAttribute('onclick') || '').match(/^open(?:Track|Update)\('([^']+)'\)/);
      if (!m) return;
      // Only on the card grid, not the pipeline table's Update buttons.
      if (!btn.parentNode || btn.parentNode.querySelector('a[target="_blank"]') === null) return;

      var id = m[1];
      var copilot = document.createElement('button');
      copilot.type = 'button';
      copilot.className = btn.className;
      copilot.textContent = '✨ Copilot';
      copilot.style.cssText = 'border-color:#4a7cff;color:#9ab4ff';
      copilot.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var card = btn.closest('.cc') || btn.closest('div');
        var role = '';
        try {
          var tag = card && card.querySelector('.rtag');
          role = tag ? tag.textContent.trim() : '';
        } catch (err) {}
        CC.openCopilot(id, role);
      });
      btn.parentNode.appendChild(copilot);
    });
  }

  addCopilotButtons();

  // Cards re-render on filter changes, so watch the grid and re-attach.
  var grid = document.getElementById('cgrid') || document.getElementById('companyGrid') || document.body;
  if (window.MutationObserver) {
    new MutationObserver(function () { addCopilotButtons(); })
      .observe(grid, { childList: true, subtree: true });
  }
})();

/* ────────────────────────────────────────────────────────────────────
 * Job discovery: posted dates on company cards, a newest-first feed, and
 * the agent's run log.
 *
 * Jobs come from public Greenhouse / Lever / Ashby JSON feeds, so the posted
 * dates are the real ones the ATS reports rather than a model's guess.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  function ago(iso) {
    if (!iso) return null;
    var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    return Math.floor(days / 30) + 'mo ago';
  }

  // ── Posted-date badge on each company card ──────────────────────────
  function paintCardBadges(byCompany) {
    document.querySelectorAll('button[data-cc-copilot]').forEach(function (btn) {
      var m = (btn.getAttribute('onclick') || '').match(/^open(?:Track|Update)\('([^']+)'\)/);
      if (!m) return;
      var info = byCompany[m[1]];
      var card = btn.closest('div');
      if (!card) return;

      var existing = card.querySelector('.cc-jobbadge');
      if (existing) existing.remove();
      if (!info || !info.open_jobs) return;

      var fresh = Number(info.fresh_jobs || 0);
      var badge = document.createElement('div');
      badge.className = 'cc-jobbadge';
      badge.style.cssText =
        'margin:6px 0;font-size:11px;font-weight:600;display:inline-flex;gap:7px;' +
        'align-items:center;padding:3px 9px;border-radius:999px;' +
        (fresh
          ? 'background:rgba(61,220,132,.12);border:1px solid rgba(61,220,132,.35);color:#7ee0a8'
          : 'background:#1b2130;border:1px solid #2a3243;color:#7c8ba3');
      badge.textContent = info.open_jobs + ' open role' + (info.open_jobs > 1 ? 's' : '') +
        (info.latest_posted ? ' · newest ' + ago(info.latest_posted) : '');
      badge.title = 'From the company’s own job board';

      var pay = card.querySelector('.pay');
      if (pay && pay.parentNode) pay.parentNode.insertBefore(badge, pay.nextSibling);
      else btn.parentNode.parentNode.insertBefore(badge, btn.parentNode);
    });
  }

  var badgeCache = null;
  function loadBadges() {
    api('/jobs/latest-by-company')
      .then(function (d) {
        badgeCache = {};
        (d.companies || []).forEach(function (c) { badgeCache[c.company_id] = c; });
        window.__CC_BADGE_CACHE__ = badgeCache;
        if (typeof window.renderCards === 'function') {
          window.renderCards();
        } else {
          paintCardBadges(badgeCache);
        }
      })
      .catch(function () {});
  }
  loadBadges();

  // ── Company Dismiss / Not Interested ────────────────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.cc-co-dismiss') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var companyId = btn.getAttribute('data-company');
    if (!companyId) return;

    btn.disabled = true;
    api('/companies/' + encodeURIComponent(companyId) + '/dismiss', { method: 'POST', body: {} })
      .then(function (res) {
        var isDismissed = Boolean(res.company && res.company.dismissed);
        if (!window.__CC_DISMISSED__) window.__CC_DISMISSED__ = new Set();
        if (isDismissed) window.__CC_DISMISSED__.add(companyId);
        else window.__CC_DISMISSED__.delete(companyId);

        var list = window.__CC_CATALOGUE__ || [];
        var target = list.find(function (c) { return c.id === companyId; });
        if (target) target.dismissed = isDismissed;

        if (typeof window.renderCards === 'function') {
          window.renderCards();
        }
      })
      .catch(function (err) {
        alert('Could not update company: ' + err.message);
        btn.disabled = false;
      });
  });

  // ── Company Delete ──────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.cc-co-delete') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var companyId = btn.getAttribute('data-company');
    var companyName = btn.getAttribute('data-company-name') || companyId;
    if (!companyId) return;

    var runDelete = function () {
      btn.disabled = true;
      api('/companies/' + encodeURIComponent(companyId), { method: 'DELETE' })
        .then(function () {
          if (window.__CC_CATALOGUE__) {
            window.__CC_CATALOGUE__ = window.__CC_CATALOGUE__.filter(function (c) { return c.id !== companyId; });
          }
          if (typeof COS !== 'undefined' && Array.isArray(COS)) {
            var idx = COS.findIndex(function (c) { return c.id === companyId; });
            if (idx !== -1) COS.splice(idx, 1);
          }
          if (window.__CC_DISMISSED__) window.__CC_DISMISSED__.delete(companyId);

          try {
            var t = JSON.parse(localStorage.getItem('sr_tracked') || '{}');
            delete t[companyId];
            localStorage.setItem('sr_tracked', JSON.stringify(t));
            var cu = JSON.parse(localStorage.getItem('sr_custom') || '[]');
            cu = cu.filter(function (c) { return c.id !== companyId; });
            localStorage.setItem('sr_custom', JSON.stringify(cu));
          } catch (err) {}

          if (typeof window.renderCards === 'function') {
            window.renderCards();
          }
          if (typeof window.renderPipeline === 'function') {
            window.renderPipeline();
          }
        })
        .catch(function (err) {
          if (window.appAlert) {
            window.appAlert({ title: 'Could not delete company', message: err.message, type: 'danger' });
          } else {
            alert('Could not delete company: ' + err.message);
          }
          btn.disabled = false;
        });
    };

    if (window.appConfirm) {
      window.appConfirm({
        title: 'Permanently Delete Company?',
        message: 'Are you sure you want to permanently delete "' + companyName + '" from your target companies? This action cannot be undone.',
        confirmText: 'Delete Company',
        cancelText: 'Cancel',
        type: 'danger'
      }).then(function (confirmed) {
        if (confirmed) runDelete();
      });
    } else if (confirm('Are you sure you want to permanently delete "' + companyName + '" from your target companies?')) {
      runDelete();
    }
  });

  // Cards re-render on filter change; repaint from cache.
  var grid = document.getElementById('cgrid');
  if (grid && window.MutationObserver) {
    new MutationObserver(function () { if (badgeCache) paintCardBadges(badgeCache); })
      .observe(grid, { childList: true });
  }

  // ── Live jobs feed + agent log, injected into Job Discovery ─────────
  function buildFeed() {
    var host = document.getElementById('discovery') || document.getElementById('jobs');
    if (!host || host.querySelector('#cc-feed')) return;

    var panel = document.createElement('div');
    panel.id = 'cc-feed';
    panel.style.cssText =
      'background:#141822;border:1px solid #232a38;border-radius:14px;padding:18px 20px;margin-bottom:16px';
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<div><strong style="font-size:15px">🛰 Live job feed</strong>' +
      '<div class="cc-muted" id="cc-feed-sub">Loading…</div></div>' +
      '<div style="display:flex;gap:7px">' +
      '<button class="btn" id="cc-agent-log" type="button">Agent log</button>' +
      '<button class="btn pri" id="cc-scan" type="button">Scan now</button>' +
      '</div></div><div id="cc-feed-body" style="margin-top:14px"></div>';

    host.insertBefore(panel, host.firstChild);

    var body = document.getElementById('cc-feed-body');

    function renderJobs() {
      body.innerHTML = '<p class="cc-muted">Loading roles…</p>';
      api('/jobs/discovered?limit=60&minRelevance=50')
        .then(function (d) {
          var jobs = d.jobs || [];
          if (!jobs.length) {
            body.innerHTML = '<p class="cc-muted">Nothing found yet. Hit “Scan now”.</p>';
            return;
          }
          document.getElementById('cc-feed-sub').textContent =
            jobs.length + ' matching roles · newest first · real posted dates from each company’s job board';

          body.innerHTML = jobs.map(function (j) {
            var when = ago(j.posted_at);
            var fresh = j.posted_at && (Date.now() - new Date(j.posted_at)) < 7 * 86400000;
            return '<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid #1e2430;align-items:baseline">' +
              '<span style="flex:none;width:76px;font-size:11px;font-weight:700;' +
              (fresh ? 'color:#7ee0a8' : 'color:#7c8ba3') + '">' + esc(when || '—') + '</span>' +
              '<div style="flex:1;min-width:0">' +
              '<a href="' + esc(j.url) + '" target="_blank" rel="noopener" ' +
              'style="color:#e7ecf3;text-decoration:none;font-weight:600">' + esc(j.title) + '</a>' +
              '<div class="cc-muted" style="font-size:11px">' + esc(j.company_name) +
              (j.location ? ' · ' + esc(j.location) : '') +
              ' · match ' + j.relevance +
              (j.no_dsa === false ? ' · <span style="color:#ffb020">DSA signals</span>' : '') +
              '</div></div></div>';
          }).join('');
        })
        .catch(function (e) {
          body.innerHTML = '<div class="cc-bad">Could not load: ' + esc(e.message) + '</div>';
        });
    }

    document.getElementById('cc-scan').addEventListener('click', function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'Scanning…';
      CC.runJob('job-discovery', {}, function (secs) {
        btn.textContent = 'Scanning… ' + secs + 's';
      })
        .then(function (r) {
          btn.disabled = false;
          btn.textContent = 'Scan now';
          document.getElementById('cc-feed-sub').textContent =
            r.jobsNew + ' new · ' + r.jobsSeen + ' matching across ' +
            r.boardsFound + '/' + r.companies + ' job boards';
          renderJobs();
          loadBadges();
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'Scan now';
          body.innerHTML = '<div class="cc-bad">Scan failed: ' + esc(e.message) + '</div>';
        });
    });

    document.getElementById('cc-agent-log').addEventListener('click', function () {
      body.innerHTML = '<p class="cc-muted">Loading agent history…</p>';
      api('/jobs/agent/runs?limit=20')
        .then(function (d) {
          var runs = d.runs || [];
          if (!runs.length) { body.innerHTML = '<p class="cc-muted">The agent has not run yet.</p>'; return; }
          body.innerHTML =
            '<div style="margin-bottom:8px"><button class="btn" id="cc-back-jobs" type="button">← Back to roles</button></div>' +
            runs.map(function (r) {
              var bad = r.status === 'error' || r.error_count > 0;
              return '<div style="padding:9px 0;border-bottom:1px solid #1e2430">' +
                '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
                '<strong style="font-size:12px;color:' + (bad ? '#ffb3b3' : '#9ff0c2') + '">' +
                esc(r.status) + ' · ' + esc(r.trigger) + '</strong>' +
                '<span class="cc-muted" style="font-size:11px">' +
                new Date(r.started_at).toLocaleString() + ' · ' + r.duration_sec + 's</span></div>' +
                '<div class="cc-muted" style="font-size:11px">' +
                r.companies + ' companies · ' + r.jobs_seen + ' matching · ' +
                r.jobs_new + ' new · ' + r.jobs_closed + ' closed' +
                (r.error_count ? ' · ' + r.error_count + ' errors' : '') +
                ' · <a href="#" data-run="' + esc(r.id) + '" style="color:#5b86ff">detail</a>' +
                '</div></div>';
            }).join('');

          document.getElementById('cc-back-jobs').addEventListener('click', renderJobs);

          body.querySelectorAll('a[data-run]').forEach(function (a) {
            a.addEventListener('click', function (e) {
              e.preventDefault();
              api('/jobs/agent/runs/' + a.getAttribute('data-run')).then(function (res) {
                var r = res.run;
                body.innerHTML =
                  '<div style="margin-bottom:8px"><button class="btn" id="cc-back-jobs" type="button">← Back to roles</button></div>' +
                  '<div class="cc-card" style="white-space:pre-wrap;font-size:11px;max-height:50vh;overflow:auto">' +
                  esc(JSON.stringify({ errors: r.errors, detail: r.detail }, null, 1)) + '</div>';
                document.getElementById('cc-back-jobs').addEventListener('click', renderJobs);
              });
            });
          });
        })
        .catch(function (e) {
          body.innerHTML = '<div class="cc-bad">' + esc(e.message) + '</div>';
        });
    });

    renderJobs();
  }

  buildFeed();
  // The Job Discovery section may only exist once its tab is opened.
  document.addEventListener('click', function () { setTimeout(buildFeed, 120); });
})();

/* ────────────────────────────────────────────────────────────────────
 * Open roles as company-style cards, favourites, and a research viewer.
 *
 * Discovered roles now render in the same grid and the same card styling as
 * companies, because they are the same kind of decision: is this worth
 * pursuing? Favouriting either one starts tracking the company, so "I am
 * interested" and "this is in my pipeline" stop being separate actions.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  function ago(iso) {
    if (!iso) return '';
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? d + 'd ago'
      : d < 30 ? Math.floor(d / 7) + 'w ago' : Math.floor(d / 30) + 'mo ago';
  }

  var ROLE_LABEL = { fde: 'FDE', ai: 'AI Eng', fs: 'Full-Stack', se: 'Solutions Eng' };

  // ── Filter chips: open roles + favourites ───────────────────────────
  var filterBar = document.querySelector('.fbar') ||
    (document.querySelector('.fb') && document.querySelector('.fb').parentNode);
  var grid = document.getElementById('cgrid');
  var mode = 'companies';

  function chip(label, onClick) {
    var b = document.createElement('button');
    b.className = 'fb';
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', function () {
      filterBar.querySelectorAll('.fb').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      onClick();
    });
    filterBar.appendChild(b);
    return b;
  }

  function cardCompanyId(card) {
    var m = (card.innerHTML || '').match(/openTrack\('([^']+)'\)/);
    return m ? m[1] : null;
  }

  // ── 💼 Freelance: live gig board ────────────────────────────────────
  // Real open work pulled every 6h from Freelancer.com, Mercor, RemoteOK,
  // Himalayas and Remotive, scored against his stack and residence. The
  // marketplaces that publish nothing (Upwork, Toptal, A.Team …) sit in the
  // platforms strip as "join / track" links instead.
  var SOURCE_LABEL = {
    freelancer: 'Freelancer.com', mercor: 'Mercor', remoteok: 'RemoteOK',
    himalayas: 'Himalayas', remotive: 'Remotive',
  };
  var ENGAGEMENT_LABEL = { freelance: 'Freelance', contract: 'Contract', 'part-time': 'Part-time' };
  var STATUS_LABEL = { '': 'Not applied', applied: '📨 Applied', talking: '💬 In talks', won: '🏆 Won', lost: '✕ Lost' };
  var gigState = { sort: 'match', source: '', status: '', platformsOpen: false };
  var gigBar = null;

  function money(n) {
    if (n == null || n === '') return '';
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function rateText(j) {
    var m = j.meta || {};
    if (j.rate_min == null && j.rate_max == null) return m.salary || 'Rate not stated';
    var sym = m.sign || { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$' }[j.currency] ||
      (j.currency ? j.currency + ' ' : '$');
    var unit = { hour: '/hr', fixed: ' fixed', task: '/task', year: '/yr' }[j.rate_unit] || '';
    var lo = j.rate_min, hi = j.rate_max;
    var range = sym + money(lo != null ? lo : hi) + (hi != null && lo != null && Number(hi) !== Number(lo) ? '–' + money(hi) : '') + unit;
    if (j.currency && j.currency !== 'USD' && m.usdMax) {
      range += ' ≈ $' + money(m.usdMin != null ? m.usdMin : m.usdMax) + (m.usdMin != null && m.usdMin !== m.usdMax ? '–' + money(m.usdMax) : '');
    }
    if (m.hoursPerWeek) range += ' · ' + m.hoursPerWeek + ' h/wk';
    return range;
  }

  function gigCard(j) {
    var m = j.meta || {};
    var roles = (j.matched_roles || []).map(function (r) {
      return '<span class="rtag t-' + esc(r) + '">' + esc(ROLE_LABEL[r] || r) + '</span>';
    }).join('');
    var skills = (j.skills || []).slice(0, 6).map(function (s) {
      return '<span style="font-size:10px;color:var(--t3);border:1px solid var(--bd);border-radius:4px;padding:1px 6px;margin:0 4px 4px 0;display:inline-block">' + esc(s) + '</span>';
    }).join('');
    var fresh = j.posted_at && (Date.now() - new Date(j.posted_at)) < 3 * 86400000;
    var status = j.app_status || '';
    return '<div class="cc" data-gig="' + esc(j.id) + '"' + (j.dismissed ? ' style="opacity:.42"' : '') + '>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">' +
      '<div class="cn">' + esc(j.title) + '</div>' +
      '<span class="rb" style="background:rgba(255,176,32,.14);color:#ffd08a;white-space:nowrap">💼 ' +
      esc(SOURCE_LABEL[j.source] || j.source) + '</span></div>' +
      '<div style="margin-bottom:5px">' +
      '<span class="rtag" style="background:rgba(74,124,255,.14);color:#9ab4ff">' + esc(ENGAGEMENT_LABEL[j.engagement] || j.engagement) + '</span>' +
      roles +
      '<span class="rtag" style="' + (fresh ? 'background:rgba(61,220,132,.15);color:#7ee0a8' : '') + '">' + esc(ago(j.posted_at) || 'date n/a') + '</span>' +
      (m.bids != null ? '<span class="rtag">' + m.bids + ' bids</span>' : '') +
      '</div>' +
      '<div style="margin:5px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<span class="pay">' + esc(rateText(j)) + '</span>' +
      '<span style="font-size:10px;color:var(--t3)">match ' + j.relevance + '</span></div>' +
      '<div class="cdesc" style="margin-bottom:4px"><strong>' + esc(j.company_name || '') + '</strong>' +
      (j.location ? ' · ' + esc(j.location) : '') + '</div>' +
      '<div class="cdesc" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">' +
      esc(j.snippet || '') + '</div>' +
      (skills ? '<div style="margin-top:6px">' + skills + '</div>' : '') +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">' +
      '<a href="' + esc(j.url) + '" target="_blank" rel="noopener" class="btn ac">Apply ↗</a>' +
      '<button class="btn grn cc-gig-prop" type="button" data-job="' + esc(j.id) + '">✍️ ' + (j.has_proposal ? 'Proposal' : 'Draft proposal') + '</button>' +
      '<button class="btn cc-gig-det" type="button" data-job="' + esc(j.id) + '">Details ▾</button>' +
      '<button class="btn cc-fav" type="button" data-job="' + esc(j.id) + '">' + (j.favourite ? '★ Saved' : '☆ Interested') + '</button>' +
      '<button class="btn cc-dismiss" type="button" data-job="' + esc(j.id) + '">' + (j.dismissed ? '↩ Restore' : '✕ Not for me') + '</button>' +
      '<select class="cc-gig-status" data-job="' + esc(j.id) + '" title="Track where you are with this gig" ' +
      'style="background:#1b2130;border:1px solid #2a3243;border-radius:6px;color:#cfd8e6;font-size:11px;padding:4px 6px;font-family:inherit">' +
      Object.keys(STATUS_LABEL).map(function (k) {
        return '<option value="' + k + '"' + (k === status ? ' selected' : '') + '>' + STATUS_LABEL[k] + '</option>';
      }).join('') + '</select>' +
      '</div>' +
      '<div class="cc-gig-more" style="margin-top:8px"></div>' +
      '</div>';
  }

  function ensureGigBar() {
    if (gigBar) return gigBar;
    gigBar = document.createElement('div');
    gigBar.id = 'cc-gig-bar';
    gigBar.style.cssText = 'display:none;margin:0 0 12px;padding:12px 14px;background:#141822;border:1px solid #2a3243;border-radius:10px';
    var sel = 'background:#0f131b;border:1px solid #2a3243;border-radius:6px;color:#e7ecf3;font-size:12px;padding:5px 8px;font-family:inherit';
    gigBar.innerHTML =
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<div class="cc-gig-summary" style="flex:1;min-width:220px;font-size:12px;color:#a9b6c9">Loading open gigs…</div>' +
      '<select class="cc-gig-sort" style="' + sel + '"><option value="match">Best match</option><option value="recent">Newest</option><option value="pay">Highest pay</option></select>' +
      '<select class="cc-gig-source" style="' + sel + '"><option value="">All sources</option>' +
      Object.keys(SOURCE_LABEL).map(function (k) { return '<option value="' + k + '">' + SOURCE_LABEL[k] + '</option>'; }).join('') + '</select>' +
      '<select class="cc-gig-filter" style="' + sel + '"><option value="">All open gigs</option><option value="saved">★ Saved</option>' +
      '<option value="any">My applications</option><option value="applied">📨 Applied</option><option value="talking">💬 In talks</option>' +
      '<option value="won">🏆 Won</option><option value="lost">✕ Lost</option></select>' +
      '<button class="btn cc-gig-refresh" type="button">↻ Refresh now</button>' +
      '<button class="btn cc-gig-platforms" type="button">Platforms to join ▾</button>' +
      '</div>' +
      '<div class="cc-gig-platform-list" style="display:none;margin-top:10px"></div>';
    grid.parentNode.insertBefore(gigBar, grid);

    gigBar.querySelector('.cc-gig-sort').addEventListener('change', function (e) { gigState.sort = e.target.value; loadGigs(); });
    gigBar.querySelector('.cc-gig-source').addEventListener('change', function (e) { gigState.source = e.target.value; loadGigs(); });
    gigBar.querySelector('.cc-gig-filter').addEventListener('change', function (e) { gigState.status = e.target.value; loadGigs(); });
    gigBar.querySelector('.cc-gig-platforms').addEventListener('click', function () {
      gigState.platformsOpen = !gigState.platformsOpen;
      renderPlatformStrip();
    });
    gigBar.querySelector('.cc-gig-refresh').addEventListener('click', refreshGigs);
    return gigBar;
  }

  function renderPlatformStrip() {
    var box = gigBar.querySelector('.cc-gig-platform-list');
    box.style.display = gigState.platformsOpen ? 'block' : 'none';
    gigBar.querySelector('.cc-gig-platforms').textContent = gigState.platformsOpen ? 'Platforms to join ▴' : 'Platforms to join ▾';
    if (!gigState.platformsOpen) return;
    var set = window.__CC_FREELANCE__ || new Set();
    var list = (window.__CC_CATALOGUE__ || []).filter(function (c) { return set.has(c.id); });
    box.innerHTML =
      '<div style="font-size:11px;color:#7c8ba3;margin-bottom:8px">Vetted networks publish no job feed — you join, pass their screening, ' +
      'and they match you. Use 📊 Track to follow each application, and 🎙 Interview Room → Prep guide for their screening.</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
      list.map(function (c) {
        return '<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid #2a3243;border-radius:6px;padding:4px 6px 4px 9px;font-size:11px;background:#0f131b">' +
          '<strong style="color:#e7ecf3">' + esc(c.name) + '</strong><span style="color:#7c8ba3">' + esc(c.pay) + '</span>' +
          '<a class="btn ac" style="font-size:10px;padding:2px 7px" target="_blank" rel="noopener" href="' + esc(c.apply) + '">Join ↗</a>' +
          '<button class="btn grn" type="button" style="font-size:10px;padding:2px 7px" onclick="openTrack(\'' + esc(c.id) + '\')">📊 Track</button>' +
          '</span>';
      }).join('') + '</div>';
  }

  function loadSummary() {
    api('/jobs/gigs/summary').then(function (s) {
      var el = gigBar.querySelector('.cc-gig-summary');
      var total = (s.bySource || []).reduce(function (n, x) { return n + x.open; }, 0);
      var parts = (s.bySource || []).map(function (x) { return (SOURCE_LABEL[x.source] || x.source) + ' ' + x.open; });
      var mine = (s.byStatus || []).map(function (x) { return STATUS_LABEL[x.status] + ' ' + x.n; });
      var last = s.lastRun && s.lastRun.finished_at ? 'refreshed ' + ago(s.lastRun.finished_at) : 'not refreshed yet';
      el.innerHTML = '<strong style="color:#e7ecf3">' + total + ' open gigs for you</strong> · ' +
        esc(parts.join(' · ') || 'no sources yet') + ' · <span style="color:#7c8ba3">' + esc(last) + '</span>' +
        (mine.length ? '<br><span style="color:#7ee0a8">Your pipeline: ' + esc(mine.join(' · ')) + '</span>' : '');
    }).catch(function () {});
  }

  function loadGigs() {
    var q = '/jobs/discovered?kind=gigs&minRelevance=30&limit=150&sort=' + gigState.sort;
    if (gigState.source) q += '&source=' + encodeURIComponent(gigState.source);
    if (gigState.status === 'saved') q += '&favourites=true';
    else if (gigState.status) q += '&status=' + encodeURIComponent(gigState.status);
    grid.innerHTML = '<p class="cc-muted" style="padding:14px">Loading open gigs…</p>';
    api(q).then(function (d) {
      var jobs = d.jobs || [];
      if (!jobs.length) {
        grid.innerHTML = '<p class="cc-muted" style="padding:14px">' +
          (gigState.status ? 'Nothing here yet.' : 'No gigs pulled yet — hit ↻ Refresh now (takes about 30 seconds).') + '</p>';
        return;
      }
      grid.innerHTML = jobs.map(gigCard).join('');
    }).catch(function (e) {
      grid.innerHTML = '<div class="cc-bad" style="margin:14px">' + esc(e.message) + '</div>';
    });
  }

  function refreshGigs() {
    var btn = gigBar.querySelector('.cc-gig-refresh');
    btn.disabled = true;
    btn.textContent = '↻ Pulling gigs…';
    api('/jobs/gigs/refresh', { method: 'POST', body: {} })
      .then(function (d) {
        return new Promise(function (resolve, reject) {
          (function poll() {
            api('/tasks/' + d.job.id).then(function (r) {
              var steps = r.job.steps || [];
              if (steps.length) btn.textContent = '↻ ' + (steps[steps.length - 1].message || 'Working…').slice(0, 40);
              if (r.job.status === 'done') return resolve(r.job.result);
              if (r.job.status === 'error') return reject(new Error(r.job.error || 'Refresh failed'));
              setTimeout(poll, 2000);
            }).catch(reject);
          })();
        });
      })
      .then(function () { loadSummary(); loadGigs(); })
      .catch(function (e) { alert('Could not refresh gigs: ' + e.message); })
      .then(function () { btn.disabled = false; btn.textContent = '↻ Refresh now'; });
  }

  function showGigView() {
    ensureGigBar().style.display = 'block';
    renderPlatformStrip();
    loadSummary();
    loadGigs();
  }

  function hideGigView() { if (gigBar) gigBar.style.display = 'none'; }

  function renderProposal(box, p, jobId) {
    var list = function (title, items, color) {
      if (!items || !items.length) return '';
      return '<div style="margin-top:8px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:' + (color || '#7c8ba3') + '">' + title + '</div>' +
        '<ul style="margin:3px 0 0 18px;padding:0;font-size:12px">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    };
    var score = Number(p.fitScore || 0);
    var tone = score >= 70 ? '#7ee0a8' : score >= 45 ? '#ffd08a' : '#ff9b9b';
    box.innerHTML =
      '<div style="border:1px solid #2a3243;border-left:3px solid ' + tone + ';border-radius:0 8px 8px 0;padding:10px 12px;background:#0f131b">' +
      '<div style="font-size:12px"><strong style="color:' + tone + '">Fit ' + score + '/100</strong> — ' + esc(p.fitSummary || '') + '</div>' +
      list('Why you fit', p.strengths, '#7ee0a8') +
      list('Gaps — be honest about these', p.gaps, '#ffd08a') +
      '<div style="margin-top:10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#7c8ba3">Proposal to paste</div>' +
      '<div class="cc-gig-proposal-text" style="white-space:pre-wrap;font-size:12px;line-height:1.55;background:#151a24;border:1px solid #2a3243;border-radius:6px;padding:9px 11px;margin-top:4px">' + esc(p.proposal || '') + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
      '<button class="btn grn cc-gig-copy" type="button">Copy proposal</button>' +
      '<button class="btn cc-gig-regen" type="button" data-job="' + esc(jobId) + '">↻ Regenerate</button></div>' +
      (p.suggestedRate ? '<div style="margin-top:8px;font-size:12px"><strong>Rate:</strong> ' + esc(p.suggestedRate) + '</div>' : '') +
      list('Ask the client', p.questionsToAsk) +
      list('Revise before the screening', p.screeningPrep) +
      list('Red flags', p.redFlags, '#ff9b9b') +
      '</div>';
  }

  function draftProposal(btn, regenerate) {
    var card = btn.closest('.cc');
    var box = card.querySelector('.cc-gig-more');
    var id = btn.getAttribute('data-job');
    btn.disabled = true;
    box.innerHTML = '<p class="cc-muted" style="font-size:12px">✍️ Reading the posting and your history… (about 10 seconds)</p>';
    api('/jobs/' + id + '/proposal', { method: 'POST', body: { regenerate: !!regenerate } })
      .then(function (r) { renderProposal(box, r.proposal || {}, id); })
      .catch(function (e) { box.innerHTML = '<div class="cc-bad">' + esc(e.message) + '</div>'; })
      .then(function () { btn.disabled = false; });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var prop = t.closest('.cc-gig-prop');
    if (prop) { e.preventDefault(); draftProposal(prop, false); return; }
    var regen = t.closest('.cc-gig-regen');
    if (regen) { e.preventDefault(); draftProposal(regen, true); return; }
    var copy = t.closest('.cc-gig-copy');
    if (copy) {
      var txt = copy.closest('.cc-gig-more').querySelector('.cc-gig-proposal-text');
      navigator.clipboard.writeText(txt ? txt.textContent : '').then(function () {
        copy.textContent = '✓ Copied';
        setTimeout(function () { copy.textContent = 'Copy proposal'; }, 1600);
      });
      return;
    }
    var det = t.closest('.cc-gig-det');
    if (det) {
      e.preventDefault();
      var box = det.closest('.cc').querySelector('.cc-gig-more');
      if (box.dataset.details === '1') { box.innerHTML = ''; box.dataset.details = ''; det.textContent = 'Details ▾'; return; }
      box.innerHTML = '<p class="cc-muted" style="font-size:12px">Loading…</p>';
      api('/jobs/' + det.getAttribute('data-job')).then(function (r) {
        box.dataset.details = '1';
        det.textContent = 'Details ▴';
        box.innerHTML = '<div style="white-space:pre-wrap;font-size:12px;line-height:1.55;max-height:340px;overflow-y:auto;' +
          'background:#0f131b;border:1px solid #2a3243;border-radius:6px;padding:9px 11px">' +
          esc(r.job.description || 'No description provided.') + '</div>';
      }).catch(function (err) { box.innerHTML = '<div class="cc-bad">' + esc(err.message) + '</div>'; });
    }
  });

  document.addEventListener('change', function (e) {
    var sel = e.target.closest ? e.target.closest('.cc-gig-status') : null;
    if (!sel) return;
    sel.disabled = true;
    api('/jobs/' + sel.getAttribute('data-job') + '/status', { method: 'POST', body: { status: sel.value || null } })
      .then(function (r) {
        var fav = sel.closest('.cc') && sel.closest('.cc').querySelector('.cc-fav');
        if (fav && r.job && r.job.favourite) fav.textContent = '★ Saved';
        loadSummary();
      })
      .catch(function (err) { alert('Could not save status: ' + err.message); })
      .then(function () { sel.disabled = false; });
  });

  function badgeFreelanceCards() {
    var set = window.__CC_FREELANCE__;
    if (!set || !set.size || !grid) return;
    grid.querySelectorAll('.cc').forEach(function (card) {
      var id = cardCompanyId(card);
      if (!id || !set.has(id)) return;
      var rb = card.querySelector('.rb');
      if (rb && rb.textContent !== '💼 Freelance') {
        rb.textContent = '💼 Freelance';
        rb.style.background = 'rgba(255,176,32,.14)';
        rb.style.color = '#ffd08a';
      }
    });
  }

  if (filterBar && grid) {
    chip('🛰 Open roles', function () { mode = 'jobs'; hideGigView(); renderJobCards(false); });
    chip('⭐ Favourites', function () { mode = 'favs'; hideGigView(); renderJobCards(true); });
    chip('💼 Freelance gigs', function () { mode = 'gigs'; showGigView(); });

    // Any of the prototype's own filters returns the grid to companies.
    filterBar.querySelectorAll('.fb').forEach(function (b) {
      if (/Open roles|Favourites|Freelance/.test(b.textContent)) return;
      b.addEventListener('click', function () { mode = 'companies'; hideGigView(); });
    });

    badgeFreelanceCards();
    if (window.MutationObserver) {
      new MutationObserver(badgeFreelanceCards).observe(grid, { childList: true });
    }
  }

  function jobCard(j) {
    var roles = (j.matched_roles || []).map(function (r) {
      return '<span class="rtag t-' + esc(r) + '">' + esc(ROLE_LABEL[r] || r) + '</span>';
    }).join('');
    var when = ago(j.posted_at);
    var fresh = j.posted_at && (Date.now() - new Date(j.posted_at)) < 7 * 86400000;

    return '<div class="cc" data-job="' + esc(j.id) + '"' +
      (j.dismissed ? ' style="opacity:.42"' : '') + '>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
      '<div class="cn">' + esc(j.title) + '</div>' +
      '<span class="rb" style="' + (fresh ? 'background:rgba(61,220,132,.15);color:#7ee0a8' : '') + '">' +
      esc(when) + '</span></div>' +
      '<div style="margin-bottom:5px">' + roles +
      (j.no_dsa === false ? '<span class="rtag" style="background:rgba(255,176,32,.15);color:#ffd08a">⚠ DSA signals</span>'
                          : '<span class="ndsa">✓ No DSA</span>') + '</div>' +
      '<div class="cdesc">' + esc(j.company_name) + (j.location ? ' · ' + esc(j.location) : '') + '</div>' +
      '<div style="margin:5px 0;display:flex;align-items:center;gap:8px">' +
      '<span class="pay">match ' + j.relevance + '</span>' +
      '<span style="font-size:10px;color:var(--t3)">via ' + esc(j.source) + '</span></div>' +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">' +
      '<a href="' + esc(j.url) + '" target="_blank" rel="noopener" class="btn ac">Apply ↗</a>' +
      '<button class="btn cc-fav" type="button" data-job="' + esc(j.id) + '">' +
      (j.favourite ? '★ Saved' : '☆ Interested') + '</button>' +
      '<button class="btn cc-dismiss" type="button" data-job="' + esc(j.id) + '">' +
      (j.dismissed ? '↩ Restore' : '✕ Not for me') + '</button>' +
      (j.company_id
        ? '<button class="btn grn" type="button" onclick="openTrack(\'' + esc(j.company_id) + '\')">📊 Track</button>'
        : '') +
      '</div></div>';
  }

  function renderJobCards(favouritesOnly) {
    grid.innerHTML = '<p class="cc-muted" style="padding:14px">Loading open roles…</p>';
    api('/jobs/discovered?limit=120&minRelevance=50' + (favouritesOnly ? '&favourites=true' : ''))
      .then(function (d) {
        var jobs = d.jobs || [];
        if (!jobs.length) {
          grid.innerHTML = '<p class="cc-muted" style="padding:14px">' +
            (favouritesOnly
              ? 'Nothing saved yet — hit “Interested” on a role or company.'
              : 'No roles found yet. Open Job Discovery and run a scan.') + '</p>';
          return;
        }
        grid.innerHTML = jobs.map(jobCard).join('');
      })
      .catch(function (e) {
        grid.innerHTML = '<div class="cc-bad" style="margin:14px">' + esc(e.message) + '</div>';
      });
  }

  // ── Favourite toggles (job cards and company cards) ─────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.cc-fav') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var jobId = btn.getAttribute('data-job');
    var companyId = btn.getAttribute('data-company');
    var path = jobId ? '/jobs/' + jobId + '/favourite' : '/companies/' + companyId + '/favourite';

    btn.disabled = true;
    api(path, { method: 'POST', body: {} })
      .then(function (r) {
        var on = (r.job || r.company).favourite;
        btn.textContent = on ? '★ Saved' : '☆ Interested';
        btn.disabled = false;
        // Keep the Pipeline's favourites filter in step without a reload.
        if (r.company) {
          if (window.__CC_FAVOURITES__) {
            if (on) window.__CC_FAVOURITES__.add(r.company.id);
            else window.__CC_FAVOURITES__.delete(r.company.id);
          }
          if (on) {
            try {
              var tr = JSON.parse(localStorage.getItem('sr_tracked') || '{}');
              if (!tr[r.company.id]) {
                tr[r.company.id] = { stage: 'new', connections: [], msgs: '', win: 'none', notes: '', jd: '', updated: new Date().toLocaleDateString() };
                localStorage.setItem('sr_tracked', JSON.stringify(tr));
                if (typeof tracked === 'object' && tracked) {
                  tracked[r.company.id] = tr[r.company.id];
                }
              }
            } catch (err) {}
          }
          if (typeof window.renderPipeline === 'function') window.renderPipeline();
          if (typeof window.updateStats === 'function') window.updateStats();
        }
      })
      .catch(function () { btn.disabled = false; });
  });

  // Dismissing keeps the row but sinks it, so the next scan does not
  // resurface it as new.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.cc-dismiss') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    btn.disabled = true;
    api('/jobs/' + btn.getAttribute('data-job') + '/dismiss', { method: 'POST', body: {} })
      .then(function (r) {
        var card = btn.closest('.cc');
        if (r.job.dismissed) {
          btn.textContent = '↩ Restore';
          if (card) {
            card.style.opacity = '.42';
            card.parentNode.appendChild(card); // sink it to the bottom
            var fav = card.querySelector('.cc-fav');
            if (fav) fav.textContent = '☆ Interested';
          }
        } else {
          btn.textContent = '✕ Not for me';
          if (card) card.style.opacity = '';
        }
        btn.disabled = false;
      })
      .catch(function () { btn.disabled = false; });
  });

  // An "Interested" button on each company card too.
  function addCompanyFavButtons() {
    document.querySelectorAll('button[data-cc-copilot]').forEach(function (btn) {
      if (btn.dataset.ccFav) return;
      btn.dataset.ccFav = '1';
      var m = (btn.getAttribute('onclick') || '').match(/^open(?:Track|Update)\('([^']+)'\)/);
      if (!m || !btn.parentNode || !btn.parentNode.querySelector('a[target="_blank"]')) return;

      var fav = document.createElement('button');
      fav.type = 'button';
      fav.className = btn.className + ' cc-fav';
      fav.setAttribute('data-company', m[1]);
      var isFav = window.__CC_FAVOURITES__ && window.__CC_FAVOURITES__.has(m[1]);
      fav.textContent = isFav ? '★ Saved' : '☆ Interested';
      btn.parentNode.appendChild(fav);
    });
  }
  addCompanyFavButtons();
  if (grid && window.MutationObserver) {
    new MutationObserver(function () {
      if (mode === 'companies') addCompanyFavButtons();
    }).observe(grid, { childList: true });
  }

  // ── View the research that already exists ───────────────────────────
  CC.viewResearch = function (companyId, render) {
    return api('/companies/' + encodeURIComponent(companyId) + '/research').then(render);
  };
})();

/* ────────────────────────────────────────────────────────────────────
 * Interview practice from a company card, and a drag-and-drop pipeline.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  // ── "Practice" button → Interview Room, prefilled ───────────────────
  function addPracticeButtons() {
    document.querySelectorAll('button[data-cc-copilot]').forEach(function (btn) {
      if (btn.dataset.ccPractice) return;
      btn.dataset.ccPractice = '1';
      var m = (btn.getAttribute('onclick') || '').match(/^open(?:Track|Update)\('([^']+)'\)/);
      if (!m || !btn.parentNode || !btn.parentNode.querySelector('a[target="_blank"]')) return;

      var card = btn.closest('.cc') || btn.closest('.ccard') || btn.closest('div');
      var tag = card && card.querySelector('.rtag');
      var role = tag ? tag.textContent.trim() : '';

      var practice = document.createElement('a');
      practice.className = btn.className;
      practice.style.cssText = 'border-color:#8b5cf6;color:#c4b5fd;text-decoration:none';
      practice.textContent = '🎙 Practice';
      // Everything the room needs is in the URL; it resolves the JD, WIN doc
      // and research from the company id on the other side.
      practice.href = '/interview.html?company=' + encodeURIComponent(m[1]) +
        (role ? '&role=' + encodeURIComponent(role) : '');
      btn.parentNode.appendChild(practice);
    });
  }
  addPracticeButtons();

  var grid = document.getElementById('cgrid');
  if (grid && window.MutationObserver) {
    new MutationObserver(function () { addPracticeButtons(); }).observe(grid, { childList: true });
  }

  // ── Drag a company between pipeline columns ─────────────────────────
  var STAGES = ['new', 'applied', 'networking', 'call', 'win', 'interview', 'offer', 'failed'];

  function wireBoard() {
    // Native drag-and-drop is cleanly integrated into renderKanban() with
    // 0ms optimistic updates, drag-depth tracking, and pulse animations.
    if (typeof window.moveCompanyToStage !== 'function' && typeof changeStage === 'function') {
      window.moveCompanyToStage = function (id, nextStage) {
        changeStage(id, nextStage);
      };
    }
  }

  wireBoard();
  document.addEventListener('click', function () { setTimeout(wireBoard, 150); });
})();

/* ────────────────────────────────────────────────────────────────────
 * Live, filter-aware counts.
 *
 * The prototype hardcoded "45 pre-loaded" into the subtitle. It was wrong
 * (there are 44), it never moved when a filter changed, and it said nothing
 * about what the discovery agent had found — so the one number on the page
 * was the least trustworthy thing on it.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  var sub = document.querySelector('.ss') || document.querySelector('.sec-sub');
  var grid = document.getElementById('cgrid');
  if (!sub || !grid) return;

  var totals = null;

  function activeFilterLabel() {
    var on = document.querySelector('.fb.active');
    var t = on ? on.textContent.trim() : 'All';
    return /^All$/i.test(t) ? null : t;
  }

  function paint() {
    var shown = grid.querySelectorAll('.cc, .ccard').length;
    var filter = activeFilterLabel();
    var bits = [];

    if (filter && /Freelance/.test(filter)) {
      bits.push(shown + ' gig' + (shown === 1 ? '' : 's') + ' shown · 💼 Freelance & contract work');
    } else if (filter && /Open roles|Favourites/.test(filter)) {
      bits.push(shown + ' role' + (shown === 1 ? '' : 's') + ' shown · ' + filter.replace(/^[^\w]+/, ''));
      if (totals) bits.push(totals.openJobs + ' open across ' + totals.companiesWithRoles + ' companies');
    } else {
      bits.push(
        (filter ? shown + ' of ' + (totals ? totals.companies : shown) + ' companies · ' + filter
                : shown + ' companies'),
      );
      if (totals) {
        if (totals.openJobs) {
          bits.push(totals.openJobs + ' open roles found' +
            (totals.freshJobs ? ' · ' + totals.freshJobs + ' posted this fortnight' : ''));
        }
        if (totals.tracked) bits.push(totals.tracked + ' tracked');
        if (totals.researched) bits.push(totals.researched + ' researched');
      }
    }

    sub.textContent = bits.join(' · ');
  }

  function loadTotals() {
    Promise.all([
      api('/stats').catch(function () { return null; }),
      api('/jobs/latest-by-company').catch(function () { return null; }),
    ]).then(function (res) {
      var s = res[0] && res[0].totals;
      var byCompany = (res[1] && res[1].companies) || [];
      totals = {
        companies: s ? s.companies : grid.children.length,
        tracked: s ? s.tracked : 0,
        researched: s ? s.researched : 0,
        openJobs: byCompany.reduce(function (n, c) { return n + Number(c.open_jobs || 0); }, 0),
        freshJobs: byCompany.reduce(function (n, c) { return n + Number(c.fresh_jobs || 0); }, 0),
        companiesWithRoles: byCompany.length,
      };
      paint();
    });
  }

  loadTotals();

  // Repaint whenever the grid changes — filters, job cards, favourites.
  if (window.MutationObserver) {
    new MutationObserver(function () { paint(); }).observe(grid, { childList: true });
  }
  // And refresh the totals after anything that could change them.
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.cc-fav, .cc-dismiss, #cc-scan')) {
      setTimeout(loadTotals, 1200);
    }
  });
})();

/**
 * Pipeline augmentations.
 *
 * The prototype's pipeline toolbar has a stage filter (`#pf`) but no text
 * search, no favourites filter, and the kanban is stage-change by drag only.
 * This module adds:
 *   - a search input beside the stage filter,
 *   - a ⭐ Favourites toggle that filters to companies you marked interested,
 *   - a per-card / per-row stage dropdown so a stage change is one click
 *     away without having to drag,
 *   - a visible drag handle, bigger drop zones and clearer visual feedback
 *     on the kanban so drag-and-drop stops being fiddly.
 *
 * Everything is DOM-level augmentation so the prototype's own render code
 * stays untouched; a MutationObserver re-applies the augmentations after any
 * redraw (filter change, drop, stage change).
 */
(function () {
  'use strict';

  var STAGES = ['new', 'applied', 'networking', 'call', 'win', 'interview', 'offer', 'failed'];
  var STAGE_LABELS = {
    new: 'New', applied: 'Applied', networking: 'Networking', call: 'Call',
    win: 'WIN Sent', interview: 'Interview', offer: 'Offer 🎉', failed: 'Closed',
  };

  function favSet() { return window.__CC_FAVOURITES__ || new Set(); }

  // ── Toolbar: search box + favourites toggle ──────────────────────────
  function ensureToolbar() {
    var pf = document.getElementById('pf');
    if (!pf) return;

    if (!document.getElementById('cc-pipe-search')) {
      var wrap = document.createElement('span');
      wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:4px';

      var input = document.createElement('input');
      input.type = 'search';
      input.id = 'cc-pipe-search';
      input.placeholder = '🔎 Search companies, notes, JD…';
      input.autocomplete = 'off';
      input.style.cssText =
        'background:#151a24;border:1px solid #2a3243;border-radius:5px;' +
        'padding:5px 9px;color:#e7ecf3;font-size:12px;font-family:inherit;' +
        'min-width:220px';

      var clear = document.createElement('button');
      clear.type = 'button';
      clear.textContent = '×';
      clear.title = 'Clear search';
      clear.style.cssText =
        'background:transparent;border:0;color:#7c8ba3;cursor:pointer;' +
        'font-size:16px;line-height:1;padding:2px 6px;display:none';
      clear.addEventListener('click', function () {
        input.value = ''; clear.style.display = 'none'; applyFilter(); input.focus();
      });

      wrap.appendChild(input);
      wrap.appendChild(clear);
      pf.parentNode.insertBefore(wrap, pf.nextSibling);

      input.addEventListener('input', function () {
        clear.style.display = input.value ? '' : 'none';
        applyFilter();
      });
    }

    if (!document.getElementById('cc-pipe-fav')) {
      var favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.id = 'cc-pipe-fav';
      favBtn.textContent = '⭐ Favourites';
      favBtn.title = 'Only show companies you marked interested';
      favBtn.style.cssText =
        'background:#151a24;border:1px solid #2a3243;border-radius:5px;' +
        'padding:5px 10px;color:#cfd8e6;cursor:pointer;' +
        'font-size:12px;font-weight:600;font-family:inherit;margin-left:6px';
      favBtn.addEventListener('click', function () {
        var on = favBtn.dataset.on === '1';
        favBtn.dataset.on = on ? '' : '1';
        favBtn.style.background = on ? '#151a24' : '#4a7cff';
        favBtn.style.borderColor = on ? '#2a3243' : '#4a7cff';
        favBtn.style.color = on ? '#cfd8e6' : '#fff';
        applyFilter();
      });
      pf.parentNode.insertBefore(favBtn, pf);
    }

    // Freelance and full-time run as two parallel tracks; this splits them.
    if (!document.getElementById('cc-pipe-type')) {
      var typeSel = document.createElement('select');
      typeSel.id = 'cc-pipe-type';
      typeSel.title = 'Freelance platforms vs full-time employers';
      typeSel.style.cssText =
        'background:#151a24;border:1px solid #2a3243;border-radius:5px;' +
        'padding:5px 8px;color:#e7ecf3;font-size:12px;font-family:inherit;margin-left:6px';
      typeSel.innerHTML =
        '<option value="all">All types</option>' +
        '<option value="freelance">💼 Freelance</option>' +
        '<option value="fte">🏢 Full-time</option>';
      typeSel.addEventListener('change', applyFilter);
      pf.parentNode.insertBefore(typeSel, pf.nextSibling);
    }
  }

  function typeFilter() {
    var el = document.getElementById('cc-pipe-type');
    return el ? el.value : 'all';
  }

  function currentQuery() {
    var el = document.getElementById('cc-pipe-search');
    return el ? el.value.trim().toLowerCase() : '';
  }
  function favouritesOnly() {
    var el = document.getElementById('cc-pipe-fav');
    return !!(el && el.dataset.on === '1');
  }

  /** Pull the company id out of the row/card by parsing its openTrack('…'). */
  function companyIdFrom(el) {
    var btn = el.querySelector ? el.querySelector('[onclick*="openTrack"]') : null;
    var target = btn || el;
    var m = (target.getAttribute && target.getAttribute('onclick') || '').match(/openTrack\('([^']+)'\)/);
    return m ? m[1] : null;
  }

  function matchRow(el) {
    var q = currentQuery();
    var fav = favouritesOnly();
    var type = typeFilter();
    if (q && (el.textContent || '').toLowerCase().indexOf(q) === -1) return false;
    var id = (fav || type !== 'all') ? companyIdFrom(el) : null;
    if (fav && (!id || !favSet().has(id))) return false;
    if (type !== 'all') {
      var isFreelance = !!(id && window.__CC_FREELANCE__ && window.__CC_FREELANCE__.has(id));
      if (type === 'freelance' && !isFreelance) return false;
      if (type === 'fte' && isFreelance) return false;
    }
    return true;
  }

  function applyFilter() {
    var q = currentQuery();
    var fav = favouritesOnly() || typeFilter() !== 'all';
    var matches = 0;

    var pBody = document.getElementById('pBody');
    if (pBody) {
      pBody.querySelectorAll('tr').forEach(function (row) {
        var hit = matchRow(row);
        row.style.display = hit ? '' : 'none';
        if (hit) matches += 1;
      });
    }

    var board = document.getElementById('kanbanBoard');
    if (board) {
      board.querySelectorAll('.kcard').forEach(function (card) {
        var hit = matchRow(card);
        card.style.display = hit ? '' : 'none';
        if (hit) matches += 1;
      });
      // Keep every column visible when a filter is active so empty drop zones
      // stay available — otherwise there is nowhere to drag a card into.
      // When nothing is filtered, let the prototype's own layout stand.
    }

    var empty = document.getElementById('pEmpty');
    if (empty && pBody && (q || fav)) {
      empty.style.display = matches === 0 ? 'block' : 'none';
      if (matches === 0) {
        empty.textContent = q
          ? 'No companies match "' + q + '".'
          : typeFilter() === 'freelance'
            ? 'No freelance platforms in this view yet. Use 📊 Track on a 💼 Freelance card to start one.'
            : 'No companies match these filters.';
      }
    } else if (empty && !q && !fav && pBody && pBody.querySelectorAll('tr').length) {
      empty.style.display = 'none';
      empty.textContent = 'No companies match this filter. Use + Add Company or Track from Companies tab.';
    }
  }

  // ── Per-row / per-card stage dropdown ───────────────────────────────
  // Drag is fine when it works, but the hit targets are small and the
  // columns scroll — a one-click dropdown on the card itself is much more
  // reliable. Writes through the API so the server stays authoritative.
  function changeStage(id, nextStage, afterRender) {
    if (!id || STAGES.indexOf(nextStage) === -1) return;

    if (typeof window.moveCompanyToStage === 'function') {
      window.moveCompanyToStage(id, nextStage);
      if (afterRender) setTimeout(afterRender, 60);
      return;
    }

    api('/tracked/' + encodeURIComponent(id), { method: 'POST', body: { stage: nextStage } })
      .then(function () {
        // Keep the prototype's localStorage mirror in sync so its re-render
        // reflects the new stage without a round-trip through hydrate().
        try {
          var t = JSON.parse(localStorage.getItem('sr_tracked') || '{}');
          t[id] = Object.assign({ connections: [] }, t[id] || {}, {
            stage: nextStage,
            updated: new Date().toLocaleDateString(),
          });
          localStorage.setItem('sr_tracked', JSON.stringify(t));
        } catch (err) {}

        try {
          /* eslint-disable no-undef */
          if (typeof tracked === 'object' && tracked) {
            tracked[id] = Object.assign({}, tracked[id] || { connections: [] }, {
              stage: nextStage,
              updated: new Date().toLocaleDateString(),
            });
          }
          /* eslint-enable no-undef */
        } catch (err) {}

        if (typeof window.renderPipeline === 'function') {
          window.renderPipeline();
          if (typeof window.updateStats === 'function') window.updateStats();
        } else {
          location.reload();
        }
        if (afterRender) setTimeout(afterRender, 60);
      })
      .catch(function (err) { alert('Could not change stage: ' + err.message); });
  }

  /**
   * Wrap the stage pill / column name on each card with a dropdown. On
   * mobile this is also a real native <select>, so the whole flow is
   * accessible without touch-dragging.
   */
  function makeStagePicker(id, currentStage) {
    var sel = document.createElement('select');
    sel.className = 'cc-stage-pick';
    sel.title = 'Change stage';
    sel.setAttribute('data-company', id);
    sel.style.cssText =
      'background:#1b2130;border:1px solid #2a3243;border-radius:999px;' +
      'padding:3px 9px;color:#cfd8e6;font-size:11px;font-weight:600;' +
      'font-family:inherit;cursor:pointer;appearance:none;' +
      '-webkit-appearance:none;-moz-appearance:none;' +
      // The native caret is clipped by the pill shape; add an inline one.
      'background-image:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'><path fill=\'%238b96a8\' d=\'M0 0l5 6 5-6z\'/></svg>");' +
      'background-repeat:no-repeat;background-position:right 7px center;padding-right:22px';

    sel.innerHTML = STAGES.map(function (s) {
      return '<option value="' + s + '"' + (s === currentStage ? ' selected' : '') + '>' + STAGE_LABELS[s] + '</option>';
    }).join('');
    sel.addEventListener('change', function (e) {
      e.stopPropagation();
      changeStage(id, sel.value);
    });
    sel.addEventListener('click', function (e) { e.stopPropagation(); });
    return sel;
  }

  function augmentTableRows() {
    var pBody = document.getElementById('pBody');
    if (!pBody) return;
    pBody.querySelectorAll('tr').forEach(function (row) {
      if (row.dataset.ccPicker === '1') return;
      var id = companyIdFrom(row);
      if (!id) return;
      row.dataset.ccPicker = '1';

      // Second <td> holds the stage pill.
      var cell = row.children[1];
      if (!cell) return;
      var pill = cell.querySelector('.stage');
      var current = 'new';
      if (pill) {
        for (var i = 0; i < STAGES.length; i += 1) {
          if (pill.textContent.toLowerCase().indexOf(STAGES[i]) !== -1 ||
              pill.textContent.indexOf(STAGE_LABELS[STAGES[i]]) !== -1) {
            current = STAGES[i]; break;
          }
        }
      }
      var picker = makeStagePicker(id, current);
      cell.innerHTML = '';
      cell.appendChild(picker);
    });
  }

  function augmentKanbanCards() {
    var board = document.getElementById('kanbanBoard');
    if (!board) return;
    board.querySelectorAll('.kcol').forEach(function (col, colIdx) {
      col.querySelectorAll('.kcard').forEach(function (card) {
        if (card.dataset.ccPicker === '1') return;
        var id = companyIdFrom(card);
        if (!id) return;
        card.dataset.ccPicker = '1';

        var current = STAGES[colIdx] || 'new';
        var picker = makeStagePicker(id, current);
        picker.style.marginTop = '6px';
        card.appendChild(picker);

        // Dedicated drag handle so the whole card is still clickable to open
        // the Track modal — grabbing the small ≡ handle is less fidgety than
        // trying not to click the card body.
        if (!card.querySelector('.cc-drag-handle')) {
          var handle = document.createElement('span');
          handle.className = 'cc-drag-handle';
          handle.textContent = '⋮⋮';
          handle.title = 'Drag to move stage';
          handle.style.cssText =
            'position:absolute;top:6px;right:8px;color:#7c8ba3;cursor:grab;' +
            'font-size:14px;line-height:1;letter-spacing:-2px;user-select:none';
          card.style.position = 'relative';
          card.style.paddingTop = '16px';
          card.insertBefore(handle, card.firstChild);
        }
      });
    });
  }

  // ── Drop-zone upgrade ───────────────────────────────────────────────
  function enlargeDropZones() {
    // Drop zones, visual feedback, and column drop handling are now natively
    // integrated directly into renderKanban() with zero-latency optimistic updates.
  }

  // Watch the pipeline containers so augmentations re-apply after every
  // re-render — stage changes, filters, drops, favourite toggles.
  function watch(el) {
    if (!el || !window.MutationObserver || el.dataset.ccWatched) return;
    el.dataset.ccWatched = '1';
    new MutationObserver(function () {
      augmentTableRows();
      augmentKanbanCards();
      enlargeDropZones();
      applyFilter();
    }).observe(el, { childList: true, subtree: true });
  }

  function boot() {
    ensureToolbar();
    augmentTableRows();
    augmentKanbanCards();
    enlargeDropZones();
    watch(document.getElementById('pBody'));
    watch(document.getElementById('kanbanBoard'));
    applyFilter();
  }

  window.__CC_APPLY_PIPE_FILTER__ = applyFilter;

  // Intercept addCo to guarantee instant pipeline refresh, search filter update and server sync
  if (typeof window.addCo === 'function' && !window.addCo.__ccWrapped) {
    var origAddCo = window.addCo;
    window.addCo = function () {
      origAddCo.apply(this, arguments);
      if (typeof window.renderPipeline === 'function') {
        window.renderPipeline();
      }
      if (typeof window.renderCards === 'function') {
        window.renderCards();
      }
      if (typeof window.updateStats === 'function') {
        window.updateStats();
      }
      applyFilter();
      if (window.__CC__ && typeof window.__CC__.pushState === 'function') {
        window.__CC__.pushState();
      }
    };
    window.addCo.__ccWrapped = true;
  }

  if (typeof window.saveTrack === 'function' && !window.saveTrack.__ccWrapped) {
    var origSaveTrack = window.saveTrack;
    window.saveTrack = function () {
      origSaveTrack.apply(this, arguments);
      if (typeof window.renderPipeline === 'function') {
        window.renderPipeline();
      }
      if (typeof window.renderCards === 'function') {
        window.renderCards();
      }
      if (typeof window.updateStats === 'function') {
        window.updateStats();
      }
      applyFilter();
      if (window.__CC__ && typeof window.__CC__.pushState === 'function') {
        window.__CC__.pushState();
      }
    };
    window.saveTrack.__ccWrapped = true;
  }

  boot();
  document.addEventListener('click', function () { setTimeout(boot, 80); });
})();


/**
 * Boolean / X-Ray search panels on Job Discovery.
 *
 * Instahyre, Indeed, Naukri, Upwork, Contra and friends have no free public
 * API, so their listings cannot be ingested. Google X-Ray search reaches the
 * same pages for free: `site:upwork.com/freelance-jobs "AI agent" contract`
 * surfaces every indexed posting without an API, auth or scraping.
 *
 * Two panels share one builder: full-time roles (India / UAE / Europe boards)
 * and freelance / contract work (marketplaces). Every field is editable; a
 * live preview shows the exact query the first button will fire.
 */
(function () {
  'use strict';

  var PANELS = [
    {
      id: 'cc-xray',
      title: '🧬 Boolean / X-Ray Search — Full-time · Instahyre · Indeed · Naukri',
      blurb: 'These sites have no free API. Google X-Ray reaches the same listings — ' +
        'edit the keywords, click a site, Google opens with your query.',
      fields: [
        { key: 'roles', label: 'Role titles', value: '"Forward Deployed Engineer" OR "AI Engineer" OR "Solutions Engineer" OR "Full-Stack Engineer"' },
        { key: 'sen',   label: 'Seniority',   value: 'senior OR staff OR lead' },
        { key: 'stack', label: 'Tech stack',  value: 'Python OR Java OR TypeScript OR LLM OR LangChain OR MCP' },
        { key: 'loc',   label: 'Location / mode', value: 'remote OR Europe OR Dubai OR India' },
      ],
      sites: [
        { label: '🔎 Instahyre (India)',     site: 'instahyre.com' },
        { label: '🔎 Naukri (India)',        site: 'naukri.com' },
        { label: '🔎 Indeed India',          site: 'indeed.co.in' },
        { label: '🔎 Indeed (Global)',       site: 'indeed.com' },
        { label: '🔎 Bayt (Gulf)',           site: 'bayt.com' },
        { label: '🔎 LinkedIn Jobs (X-Ray)', site: 'linkedin.com/jobs/view' },
        { label: '🔎 Glassdoor',             site: 'glassdoor.com/job-listing' },
        { label: '🔎 Wellfound',             site: 'wellfound.com/jobs' },
      ],
      native: [],
    },
    {
      id: 'cc-xray-fl',
      title: '💼 Freelance & Contract Search — Upwork · Contra · Freelancer · Truelancer',
      blurb: 'Contract and freelance postings across the marketplaces. Upwork also gets a ' +
        'native search link sorted newest-first — early proposals win far more often.',
      fields: [
        { key: 'work',  label: 'Work type',  value: '"AI agent" OR LLM OR RAG OR LangChain OR "AI engineer" OR "full stack developer"' },
        { key: 'eng',   label: 'Engagement', value: 'contract OR freelance OR fractional OR "part-time" OR hourly' },
        { key: 'stack', label: 'Tech stack', value: 'Python OR TypeScript OR Java OR "Spring Boot" OR React OR "Node.js"' },
        { key: 'loc',   label: 'Location / mode', value: 'remote OR worldwide OR India OR UAE OR Europe' },
      ],
      sites: [
        { label: '🔎 Upwork jobs',          site: 'upwork.com/freelance-jobs' },
        { label: '🔎 Contra',               site: 'contra.com' },
        { label: '🔎 Freelancer.com',       site: 'freelancer.com/projects' },
        { label: '🔎 Truelancer (India)',   site: 'truelancer.com' },
        { label: '🔎 We Work Remotely',     site: 'weworkremotely.com' },
        { label: '🔎 RemoteOK',             site: 'remoteok.com' },
        { label: '🔎 LinkedIn contract',    site: 'linkedin.com/jobs/view' },
        { label: '🔎 Wellfound contract',   site: 'wellfound.com/jobs' },
      ],
      // Upwork's own job search is public and supports quotes / OR, and
      // sorting by recency matters more on Upwork than anywhere else.
      native: [
        {
          label: '⚡ Upwork — newest first',
          build: function (v) {
            return 'https://www.upwork.com/nx/search/jobs/?q=' + encodeURIComponent(v.work || '') + '&sort=recency';
          },
        },
      ],
    },
  ];

  var INPUT_CSS =
    'width:100%;padding:7px 10px;background:#0f131b;border:1px solid #2a3243;border-radius:6px;' +
    'color:#e7ecf3;font-size:12px;font-family:inherit;margin-top:3px;box-sizing:border-box';
  var BTN_CSS =
    'padding:7px 11px;border-radius:6px;background:#1b2130;border:1px solid #2a3243;' +
    'color:#cfd8e6;cursor:pointer;font-size:11px;font-weight:600;text-decoration:none';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function values(panel) {
    var out = {};
    panel.fields.forEach(function (f) {
      var el = document.getElementById(panel.id + '-' + f.key);
      out[f.key] = el ? el.value.trim() : '';
    });
    return out;
  }

  // Negated terms (-"full-time") are passed bare: Google ignores a minus
  // sign inside a parenthesised group.
  function queryText(panel, site) {
    var v = values(panel);
    var parts = ['site:' + site];
    panel.fields.forEach(function (f) {
      var t = v[f.key];
      if (!t) return;
      parts.push(t.charAt(0) === '-' ? t : '(' + t + ')');
    });
    return parts.join(' ');
  }

  function linkButton(label, hrefFn) {
    var a = document.createElement('a');
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'btn';
    a.textContent = label;
    a.style.cssText = BTN_CSS;
    a.href = hrefFn();
    // Rebuild on press so edits made after render are always used, including
    // middle-click and keyboard activation.
    ['mousedown', 'focus', 'click'].forEach(function (ev) {
      a.addEventListener(ev, function () { a.href = hrefFn(); });
    });
    a.addEventListener('mouseenter', function () { a.style.borderColor = '#4a7cff'; a.style.color = '#fff'; });
    a.addEventListener('mouseleave', function () { a.style.borderColor = '#2a3243'; a.style.color = '#cfd8e6'; });
    return a;
  }

  function buildPanel(panel) {
    var card = document.createElement('div');
    card.id = panel.id + '-card';
    card.className = 'card';
    card.style.cssText =
      'margin:12px 0 14px;padding:14px 16px;background:#141822;border:1px solid #2a3243;border-radius:10px';

    card.innerHTML =
      '<div style="font-size:12px;font-weight:700;color:#4a7cff;margin-bottom:4px">' + esc(panel.title) + '</div>' +
      '<div style="font-size:11px;color:#7c8ba3;margin-bottom:10px">' + esc(panel.blurb) + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin-bottom:8px">' +
      panel.fields.map(function (f) {
        return '<div><label style="font-size:10px;color:#7c8ba3;text-transform:uppercase;letter-spacing:.06em">' +
          esc(f.label) + '</label><input id="' + panel.id + '-' + f.key + '" type="text" value="' +
          esc(f.value) + '" style="' + INPUT_CSS + '"></div>';
      }).join('') +
      '</div>' +
      '<div class="cc-xray-preview" style="font-size:10px;color:#7c8ba3;background:#0f131b;border:1px dashed #2a3243;' +
      'border-radius:6px;padding:7px 9px;margin-bottom:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;' +
      'overflow-wrap:anywhere"></div>' +
      '<div class="cc-xray-buttons" style="display:flex;flex-wrap:wrap;gap:6px"></div>';

    var bar = card.querySelector('.cc-xray-buttons');
    panel.native.forEach(function (n) {
      var a = linkButton(n.label, function () { return n.build(values(panel)); });
      a.style.borderColor = '#3ddc84';
      bar.appendChild(a);
    });
    panel.sites.forEach(function (s) {
      bar.appendChild(linkButton(s.label, function () {
        return 'https://www.google.com/search?q=' + encodeURIComponent(queryText(panel, s.site));
      }));
    });

    var preview = card.querySelector('.cc-xray-preview');
    function sync() { preview.textContent = queryText(panel, panel.sites[0].site); }
    card.querySelectorAll('input').forEach(function (el) { el.addEventListener('input', sync); });
    sync();
    return card;
  }

  function render() {
    var disc = document.getElementById('discovery');
    if (!disc) return;

    // Each panel goes after the previous one, the first right under the
    // section subtitle, so the existing Quick Links grid stays below them.
    var anchor = disc.querySelector('.ss');
    PANELS.forEach(function (panel) {
      var existing = document.getElementById(panel.id + '-card');
      if (existing) { anchor = existing; return; }
      var card = buildPanel(panel);
      if (anchor && anchor.parentNode === disc) disc.insertBefore(card, anchor.nextSibling);
      else disc.insertBefore(card, disc.firstChild);
      anchor = card;
    });
  }

  render();
  // Discovery tab only mounts when visited — re-check on nav clicks.
  document.addEventListener('click', function () { setTimeout(render, 100); });
})();
