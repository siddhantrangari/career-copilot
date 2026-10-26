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
        'full-stack + AI engineer in Bangalore (ex-Philips) exploring global roles. Would love to ' +
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
      '</div></div><div id="cc-feed-tabs" class="tabs" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap"></div>' +
      '<div id="cc-feed-body" style="margin-top:10px"></div>';

    host.insertBefore(panel, host.firstChild);

    var body = document.getElementById('cc-feed-body');
    var tabs = document.getElementById('cc-feed-tabs');
    var feedPlace = '';
    var PLACES = [['', 'All'], ['india', '🇮🇳 India'], ['remote', '🌐 Remote'], ['abroad', '✈️ Abroad']];
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-place]');
      if (!b) return;
      feedPlace = b.getAttribute('data-place');
      renderJobs();
    });

    function renderJobs() {
      body.innerHTML = '<p class="cc-muted">Loading roles…</p>';
      api('/jobs/discovered?limit=60&minRelevance=50&sort=best&counts=true' + (feedPlace ? '&place=' + feedPlace : ''))
        .then(function (d) {
          var jobs = d.jobs || [];
          var c = d.counts || {};
          tabs.innerHTML = PLACES.map(function (p) {
            var n = p[0] ? c[p[0]] : null;
            return '<button class="btn' + (feedPlace === p[0] ? ' pri' : '') + '" data-place="' + p[0] + '" type="button">' +
              p[1] + (n != null ? ' (' + n + ')' : '') + '</button>';
          }).join('');
          if (!jobs.length) {
            body.innerHTML = '<p class="cc-muted">' + (feedPlace ? 'No roles in this tab yet.' : 'Nothing found yet. Hit “Scan now”.') + '</p>';
            return;
          }
          document.getElementById('cc-feed-sub').textContent =
            jobs.length + ' matching roles · last 7 days first, best fit first · fit = JD vs your profile';

          body.innerHTML = jobs.map(function (j) {
            var when = ago(j.posted_at);
            var fresh = j.posted_at && (Date.now() - new Date(j.posted_at)) < 7 * 86400000;
            return '<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid #1e2430;align-items:baseline">' +
              '<span style="flex:none;width:76px;font-size:11px;font-weight:700;' +
              (fresh ? 'color:#7ee0a8' : 'color:#7c8ba3') + '">' + esc(when || '—') + '</span>' +
              '<div style="flex:1;min-width:0">' +
              '<a href="' + esc(j.url) + '" target="_blank" rel="noopener" ' +
              'style="color:#e7ecf3;text-decoration:none;font-weight:600">' + esc(j.title) + '</a>' +
              (j.target_priority ? ' <span style="font-size:9.5px;font-weight:800;color:#fbbf24">⭐ PRIORITY</span>' : '') +
              (j.target_tag === 'apply' ? ' <span style="font-size:9.5px;font-weight:800;color:#34d399">APPLY</span>' : j.target_tag === 'outreach' ? ' <span style="font-size:9.5px;font-weight:800;color:#c4b5fd">OUTREACH</span>' : '') +
              '<div class="cc-muted" style="font-size:11px">' + esc(j.company_name) +
              (j.location ? ' · ' + esc(j.location) : '') +
              (j.fit_score != null ? ' · <b style="color:' + (j.fit_score >= 75 ? '#7ee0a8' : j.fit_score >= 55 ? '#ffd166' : '#ff8787') + '">fit ' + j.fit_score + '</b>' : ' · match ' + j.relevance) +
              (j.no_dsa === false ? ' · <span style="color:#ffb020">DSA signals</span>' : '') +
              '</div>' +
              (j.why_role ? '<div style="font-size:11px;color:#9fd3ff;margin-top:2px" title="Why this role">💡 ' + esc(j.why_role) + '</div>' : '') +
              (j.why_company ? '<div style="font-size:10.5px;color:#7c8ba3;margin-top:1px" title="Why this company">🏢 ' + esc(j.why_company) + '</div>' : '') +
              '</div></div>';
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

  // ── Collapsible panels, so the feed is reachable without scrolling ──
  // The first child is the header; clicking it shows or hides the rest.
  // [data-fold-hide] inside the header (its buttons) hides with the body.
  function fold(panel, key, defaultOpen) {
    var head = panel.firstElementChild;
    var saved = null;
    try { saved = localStorage.getItem(key); } catch (e) { /* private window */ }
    var isOpen = saved == null ? defaultOpen : saved === '1';
    var mark = document.createElement('span');
    mark.style.cssText = 'font-size:11px;color:#7c8ba3;margin-left:8px;cursor:pointer;flex:none';
    head.style.cursor = 'pointer';
    head.appendChild(mark);
    function apply() {
      Array.prototype.forEach.call(panel.children, function (c) { if (c !== head) c.style.display = isOpen ? '' : 'none'; });
      head.querySelectorAll('[data-fold-hide]').forEach(function (c) { c.style.display = isOpen ? '' : 'none'; });
      mark.textContent = isOpen ? '▾ hide' : '▸ show';
      panel.style.padding = isOpen ? '' : '10px 20px';
    }
    head.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button,a,input,select')) return;
      isOpen = !isOpen;
      try { localStorage.setItem(key, isOpen ? '1' : '0'); } catch (err) { /* private window */ }
      apply();
    });
    apply();
  }

  // ── Morning digest panel, above the live feed ───────────────────────
  function buildDigestPanel() {
    var host = document.getElementById('discovery') || document.getElementById('jobs');
    var feed = document.getElementById('cc-feed');
    if (!host || !feed || host.querySelector('#cc-digest')) return;

    var panel = document.createElement('div');
    panel.id = 'cc-digest';
    panel.style.cssText =
      'background:#141822;border:1px solid #232a38;border-radius:14px;padding:16px 20px;margin-bottom:16px';
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<div><strong style="font-size:15px">☀️ Morning digest</strong>' +
      '<div class="cc-muted" id="cc-digest-sub">Loading…</div></div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap" data-fold-hide="1">' +
      '<button class="btn" id="cc-digest-chat" type="button">Find my chat id</button>' +
      '<button class="btn" id="cc-digest-preview" type="button">Preview</button>' +
      '<button class="btn pri" id="cc-digest-send" type="button">Send now</button>' +
      '</div></div><div><div id="cc-digest-body" style="margin-top:12px;display:none"></div></div>';
    host.insertBefore(panel, feed);
    fold(panel, 'cc_fold_digest', false);

    var sub = document.getElementById('cc-digest-sub');
    var body = document.getElementById('cc-digest-body');
    var show = function (html) { body.style.display = ''; body.innerHTML = html; };

    function refreshStatus() {
      api('/digest/status').then(function (s) {
        var ready = s.telegram.botToken && s.telegram.chatId;
        var last = s.last
          ? ' · last ' + (s.last.status === 'sent' ? 'sent ' : 'failed ') + ago(s.last.created_at)
          : '';
        sub.innerHTML = !s.enabled ? 'Disabled (DIGEST_ENABLED=false)'
          : ready ? 'Telegram · daily at ' + esc(s.sendsAt) + esc(last)
          : '<span style="color:#ffb020">Not connected</span> — set ' +
            (s.telegram.botToken ? 'TELEGRAM_CHAT_ID' : 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID') +
            ' in .env.production, then redeploy';
        document.getElementById('cc-digest-send').disabled = !ready;
      }).catch(function (e) { sub.textContent = 'Status unavailable: ' + e.message; });
    }

    document.getElementById('cc-digest-preview').addEventListener('click', function () {
      show('<p class="cc-muted">Building preview…</p>');
      api('/digest/preview').then(function (d) {
        // The server escapes every value; Telegram HTML is a safe subset.
        show(d.messages.map(function (m) {
          return '<div style="white-space:pre-wrap;font-size:12.5px;line-height:1.55;background:#0f131b;' +
            'border:1px solid #232a38;border-radius:10px;padding:12px 14px;margin-bottom:8px">' + m + '</div>';
        }).join('') + '<p class="cc-muted" style="font-size:11px">Preview only — nothing was sent or marked.</p>');
        body.querySelectorAll('a').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; a.style.color = '#7cb4ff'; });
      }).catch(function (e) { show('<div class="cc-bad">' + esc(e.message) + '</div>'); });
    });

    document.getElementById('cc-digest-send').addEventListener('click', function () {
      var btn = this;
      var go = function () {
        btn.disabled = true;
        api('/digest/send', { method: 'POST', body: {} }).then(function (r) {
          show('<div style="color:#7ee0a8">Sent to Telegram — ' + r.counts.jobs + ' roles, ' +
            r.counts.followUps + ' follow-ups, ' + r.counts.interviews + ' interviews.</div>');
          refreshStatus();
        }).catch(function (e) {
          show('<div class="cc-bad">' + esc(e.message) + '</div>');
        }).then(function () { btn.disabled = false; });
      };
      var msg = 'Send today’s digest to Telegram now? The roles in it are marked as sent, and the 8am digest is skipped for today.';
      if (window.appConfirm) {
        window.appConfirm({ title: 'Send digest now', message: msg, confirmText: 'Send' })
          .then(function (ok) { if (ok) go(); });
      } else if (window.confirm(msg)) go();
    });

    document.getElementById('cc-digest-chat').addEventListener('click', function () {
      show('<p class="cc-muted">Checking the bot’s messages…</p>');
      api('/digest/telegram/chats').then(function (d) {
        if (!d.chats.length) {
          show('<p class="cc-muted">No chats yet. Open your bot in Telegram, send it any message, then try again.</p>');
          return;
        }
        show('<p class="cc-muted" style="margin-bottom:6px">Put this in .env.production as TELEGRAM_CHAT_ID, then redeploy:</p>' +
          d.chats.map(function (c) {
            return '<div><code style="font-size:13px">' + esc(c.id) + '</code> <span class="cc-muted">' +
              esc(c.name) + ' (' + esc(c.type) + ')</span></div>';
          }).join(''));
      }).catch(function (e) { show('<div class="cc-bad">' + esc(e.message) + '</div>'); });
    });

    refreshStatus();
  }

  // ── Web search panel: Google boolean + portal searches he opens ──────
  // LinkedIn, Naukri, Instahyre and the rest forbid automated reading, so
  // these are links; one site: query covers each portal for the past week.
  function buildWebSearchPanel() {
    var host = document.getElementById('discovery') || document.getElementById('jobs');
    var feed = document.getElementById('cc-feed');
    if (!host || !feed || host.querySelector('#cc-websearch')) return;

    var panel = document.createElement('div');
    panel.id = 'cc-websearch';
    panel.style.cssText =
      'background:#141822;border:1px solid #232a38;border-radius:14px;padding:16px 20px;margin-bottom:16px';
    var field = 'background:#0f131b;border:1px solid #232a38;border-radius:8px;color:#e7ecf3;padding:7px 10px;font-size:12.5px';
    panel.innerHTML =
      '<div style="display:flex;align-items:center"><strong style="font-size:15px">🔎 Web search</strong>' +
      '<span class="cc-muted" style="font-size:11px;margin-left:10px;flex:1">Google boolean searches you open — LinkedIn, Naukri, ATS boards, careers pages</span></div>' +
      '<div class="cc-muted" style="margin:8px 0 10px">Google boolean searches across LinkedIn, Naukri, Instahyre, foundit, Indeed, Wellfound, Cutshort, Hirist, ATS boards and careers pages — opened by you.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<input id="cc-ws-role" value="AI Engineer" placeholder="Role" style="' + field + ';min-width:180px">' +
      '<select id="cc-ws-loc" style="' + field + '"><option value="">Bangalore or Remote India</option><option>Bangalore</option><option>Remote India</option></select>' +
      '<select id="cc-ws-period" style="' + field + '"><option value="day">Past 24h</option><option value="week" selected>Past week</option><option value="month">Past month</option></select>' +
      '<button class="btn pri" id="cc-ws-go" type="button">Build searches</button>' +
      '</div><div id="cc-ws-body" style="margin-top:12px"></div>';
    host.insertBefore(panel, feed);
    fold(panel, 'cc_fold_websearch', false);

    var body = document.getElementById('cc-ws-body');
    var btn = function (l) {
      return '<a class="btn" target="_blank" rel="noopener" style="font-size:11px;padding:4px 9px;margin:0 6px 6px 0;display:inline-block" href="' +
        esc(l.url) + '"' + (l.query ? ' title="' + esc(l.query) + '"' : '') + '>' + esc(l.name.replace(/^Google · /, '')) + ' ↗</a>';
    };
    function build() {
      var role = document.getElementById('cc-ws-role').value.trim() || 'AI Engineer';
      var loc = document.getElementById('cc-ws-loc').value;
      var period = document.getElementById('cc-ws-period').value;
      body.innerHTML = '<p class="cc-muted">Building…</p>';
      api('/jobs/search-links?role=' + encodeURIComponent(role) + '&location=' + encodeURIComponent(loc || 'India') + '&period=' + period)
        .then(function (d) {
          var w = d.web || { google: [], portals: [] };
          body.innerHTML =
            '<div class="cc-muted" style="font-size:11px;margin-bottom:4px">Google (' + esc(period === 'day' ? 'past 24h' : 'past ' + period) + ')</div>' +
            w.google.map(btn).join('') +
            '<div class="cc-muted" style="font-size:11px;margin:6px 0 4px">Portal search pages</div>' +
            w.portals.map(btn).join('');
        })
        .catch(function (e) { body.innerHTML = '<div class="cc-bad">' + esc(e.message) + '</div>'; });
    }
    document.getElementById('cc-ws-go').addEventListener('click', build);
    build();
  }

  // ── Targets panel: company-first plan (NxtJob method) ───────────────
  // apply = a fit-75+ role is open; outreach = no matching role posted, so
  // reach insiders; ⭐ priority = hiring hard and one of his best fits.
  function buildTargetsPanel() {
    var host = document.getElementById('discovery') || document.getElementById('jobs');
    var feed = document.getElementById('cc-feed');
    if (!host || !feed || host.querySelector('#cc-targets')) return;
    var first = document.getElementById('cc-digest') || feed;

    var panel = document.createElement('div');
    panel.id = 'cc-targets';
    if (!document.getElementById('cc-tg-css')) {
      var st = document.createElement('style');
      st.id = 'cc-tg-css';
      st.textContent = '#cc-targets .tg-w{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}#cc-targets .tg-row.full .tg-w{white-space:normal}';
      document.head.appendChild(st);
    }
    panel.style.cssText = 'background:#141822;border:1px solid #232a38;border-radius:14px;padding:16px 20px;margin-bottom:16px';
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<div><strong style="font-size:15px">🎯 Target companies</strong>' +
      '<div class="cc-muted" id="cc-tg-sub">Loading…</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap" id="cc-tg-filters" data-fold-hide="1">' +
      ['all', 'priority', 'apply', 'outreach'].map(function (f) {
        return '<button class="btn' + (f === 'all' ? ' pri' : '') + '" type="button" data-f="' + f + '" style="font-size:11px;padding:4px 10px">' +
          { all: 'All', priority: '⭐ Priority', apply: 'Apply', outreach: 'Outreach' }[f] + '</button>';
      }).join('') +
      '</div></div><div id="cc-tg-body" style="margin-top:12px"></div>';
    host.insertBefore(panel, first);
    fold(panel, 'cc_fold_targets', false);

    var sub = document.getElementById('cc-tg-sub');
    var body = document.getElementById('cc-tg-body');
    var data = null;
    var filter = 'all';
    var showAll = false;
    var badge = function (t) {
      return (t.priority ? '<span style="font-size:9.5px;font-weight:800;color:#fbbf24;margin-right:6px">⭐ PRIORITY</span>' : '') +
        '<span style="font-size:9.5px;font-weight:800;color:' + (t.tag === 'apply' ? '#34d399' : '#c4b5fd') + '">' + (t.tag === 'apply' ? 'APPLY' : 'OUTREACH') + '</span>';
    };
    function render() {
      if (!data) return;
      var matching = data.targets.filter(function (t) { return filter === 'all' || (filter === 'priority' ? t.priority : t.tag === filter); });
      var rows = showAll ? matching : matching.slice(0, 5);
      body.innerHTML = rows.length ? rows.map(function (t) {
        return '<div class="tg-row" style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #1e2430;align-items:flex-start;cursor:pointer" title="Click to show the why lines in full">' +
          '<span style="flex:none;width:30px;font-size:12px;font-weight:800;color:#7c8ba3">#' + t.rank + '</span>' +
          '<div style="flex:1;min-width:0">' +
          '<div><b style="color:#e7ecf3;cursor:pointer;text-decoration:underline dotted" data-detail-key="' + esc(t.key) + '" title="Everything about this company">' + esc(t.name) + '</b> ' + badge(t) +
          '<span class="cc-muted" style="font-size:11px"> · hiring ' + t.hiring_score + ' · fit ' + t.company_fit +
          (t.in_catalogue ? '' : ' · <span style="color:#fbbf24" title="Found by job discovery; not in your Companies tab">not in your Companies list</span>') + (t.pipeline_stage ? ' · ' + esc(t.pipeline_stage) : '') + '</span></div>' +
          (t.why_company ? '<div class="tg-w" style="font-size:11.5px;color:#9aa6b8;margin-top:2px">💡 Why this company: ' + esc(t.why_company) + '</div>' : '') +
          (t.why_now ? '<div style="font-size:11.5px;color:#fbbf24;margin-top:2px">📈 ' + esc(t.why_now) + '</div>' : '') +
          (t.best_role ? '<div style="font-size:11.5px;margin-top:2px"><a target="_blank" rel="noopener" style="color:#9fd3ff" href="' + esc(t.best_role_url || '#') + '">' + esc(t.best_role) + '</a>' + (t.best_fit ? ' <span class="cc-muted">fit ' + t.best_fit + '</span>' : '') + '</div>' : '') +
          (t.best_role && t.why_role ? '<div class="tg-w" style="font-size:11.5px;color:#9aa6b8;margin-top:2px">🎯 Why this role: ' + esc(t.why_role) + '</div>' : '') +
          '<div style="font-size:11.5px;color:#c9d4e3;margin-top:3px">→ ' + esc(t.nextAction || '') + '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:4px;flex:none">' +
          '<button class="btn" type="button" data-detail-key="' + esc(t.key) + '" style="font-size:11px;padding:4px 9px">ℹ️ Details</button>' +
          (!t.in_catalogue
            ? '<button class="btn" type="button" data-add-key="' + esc(t.key) + '" data-stage="new" style="font-size:11px;padding:4px 9px;color:#38d9a9" title="Add to your Companies tab">＋ Companies</button>' +
              '<button class="btn" type="button" data-add-key="' + esc(t.key) + '" data-stage="interested" style="font-size:11px;padding:4px 9px;color:#fb923c" title="Add to Companies and your pipeline as Interested">⭐ Interested</button>'
            : (t.company_id && typeof window.openTrack === 'function'
              ? '<button class="btn" type="button" data-open="' + esc(t.company_id) + '" style="font-size:11px;padding:4px 9px">📊 Track</button>' : '')) +
          '</div></div>';
      }).join('') : '<p class="cc-muted">No companies in this view yet.</p>';
      if (matching.length > 5) {
        body.innerHTML += '<button class="btn" type="button" data-more="1" style="font-size:11px;padding:4px 10px;margin-top:8px">' +
          (showAll ? 'Show top 5' : 'Show all ' + matching.length) + '</button>';
      }
      if (data.suggested && data.suggested.length) {
        body.innerHTML += '<div class="cc-muted" style="font-size:11.5px;margin-top:10px">➕ Worth adding to your list (found by discovery, strong fit): ' +
          data.suggested.map(function (s) { return '<b style="color:#e7ecf3">' + esc(s.name) + '</b> (fit ' + s.best_fit + ')'; }).join(', ') + '</div>';
      }
    }
    panel.addEventListener('click', function (e) {
      var f = e.target.closest ? e.target.closest('[data-f]') : null;
      if (f) {
        filter = f.getAttribute('data-f');
        panel.querySelectorAll('[data-f]').forEach(function (b) { b.classList.toggle('pri', b === f); });
        render();
      }
      var o = e.target.closest ? e.target.closest('[data-open]') : null;
      if (o) window.openTrack(o.getAttribute('data-open'));
      if (e.target.closest && e.target.closest('[data-more]')) { showAll = !showAll; render(); return; }
      var add = e.target.closest ? e.target.closest('[data-add-key]') : null;
      if (add) {
        add.disabled = true;
        api('/targets/company/add', { method: 'POST', body: { key: add.getAttribute('data-add-key'), stage: add.getAttribute('data-stage') } })
          .then(function (r) {
            var row = data.targets.find(function (x) { return x.key === add.getAttribute('data-add-key'); });
            if (row) { row.in_catalogue = true; row.company_id = r.companyId; row.pipeline_stage = r.stage; }
            render();
            if (typeof window.ccRefreshToday === 'function') window.ccRefreshToday();
          })
          .catch(function (err) { add.disabled = false; window.alert(err.message); });
        return;
      }
      if (e.target.closest && e.target.closest('[data-detail-key]')) return;
      var row = e.target.closest && !e.target.closest('a,button') ? e.target.closest('.tg-row') : null;
      if (row) row.classList.toggle('full');
    });
    api('/targets/plan?limit=40').then(function (d) {
      data = d;
      var p = d.progress;
      var prio = d.targets.filter(function (t) { return t.priority; }).length;
      sub.innerHTML = 'This week: <b>' + p.connections + '/' + p.connectionsTarget + '</b> connection requests · ' +
        p.messages + ' messages · <b>' + p.calls + '/' + p.callsTarget + (p.callsStretch > p.callsTarget ? '–' + p.callsStretch : '') + '</b> calls · ' + p.referrals + ' referrals · ' +
        prio + ' priority targets';
      render();
    }).catch(function (e) { sub.textContent = 'Could not load: ' + e.message; });
  }

  buildFeed();
  buildDigestPanel();
  buildWebSearchPanel();
  buildTargetsPanel();
  // The Job Discovery section may only exist once its tab is opened.
  document.addEventListener('click', function () { setTimeout(function () { buildFeed(); buildDigestPanel(); buildWebSearchPanel(); buildTargetsPanel(); }, 120); });
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
  var STAGES = ['new', 'interested', 'applied', 'networking', 'call', 'win', 'interview', 'offer', 'failed'];

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

  var STAGES = ['new', 'interested', 'applied', 'networking', 'call', 'win', 'interview', 'offer', 'failed'];
  var STAGE_LABELS = {
    new: 'New', interested: 'Interested', applied: 'Applied', networking: 'Networking', call: 'Call',
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

        var current = col.getAttribute('data-stage') || STAGES[colIdx] || 'new';
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

/* ────────────────────────────────────────────────────────────────────
 * Today board: his Daily System as a live tracker and action plan.
 *
 * Sits above the Companies / Pipeline / Job Discovery tabs so today's
 * targets and next actions are visible without scrolling. Counts are what
 * actually happened (logged outreach, contacts added or moved, roles
 * applied); +1 logs one, Done logs an action and hides it for the day.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;
  var main = document.querySelector('.main');
  // Only on Companies & Pipeline — the page with the companies tab.
  if (!main || !document.getElementById('companies') || document.getElementById('cc-today')) return;

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } },
  };

  var css = document.createElement('style');
  css.textContent =
    '#cc-today{background:#141822;border:1px solid #232a38;border-radius:14px;padding:12px 16px;margin-bottom:14px}' +
    '#cc-today .td-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;cursor:pointer;user-select:none}' +
    '#cc-today .td-week{font-size:11.5px;color:#9aa6b8;flex:1;min-width:200px}' +
    '#cc-today .td-week b{color:#e7ecf3}' +
    '#cc-today .td-meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:10px}' +
    '#cc-today .td-m{background:#0f131b;border:1px solid #232a38;border-radius:10px;padding:8px 10px}' +
    '#cc-today .td-m .l{font-size:10.5px;color:#9aa6b8;text-transform:uppercase;letter-spacing:.04em}' +
    '#cc-today .td-m .n{font-size:17px;font-weight:800;color:#e7ecf3;margin:2px 0 4px}' +
    '#cc-today .td-m .n span{font-size:11px;color:#7c8ba3;font-weight:600}' +
    '#cc-today .td-bar{height:4px;background:#232a38;border-radius:3px;overflow:hidden}' +
    '#cc-today .td-bar i{display:block;height:100%;background:#38d9a9}' +
    '#cc-today .td-m.hit .td-bar i{background:#fbbf24}' +
    '#cc-today .td-m .b{display:flex;gap:4px;margin-top:6px}' +
    '#cc-today .td-m .b button{flex:1;font-size:10.5px;padding:2px 0;background:#1a2030;border:1px solid #2a3244;color:#c9d4e3;border-radius:6px;cursor:pointer}' +
    '#cc-today .td-m .b button:hover{border-color:#38d9a9;color:#38d9a9}' +
    '#cc-today .td-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:8px;margin-top:10px}' +
    '#cc-today .td-a{background:#0f131b;border:1px solid #232a38;border-radius:10px;padding:8px 10px;display:flex;gap:9px;align-items:flex-start;min-width:0}' +
    // Grid items default to their content's width; the one-line why text would stretch them.
    '#cc-today .td-acts>*,#cc-today .td-m{min-width:0}' +
    '#cc-today .td-a.prio{border-color:rgba(251,191,36,.45)}' +
    '#cc-today .td-a .i{font-size:16px;line-height:1.2}' +
    '#cc-today .td-a .t{flex:1;min-width:0;font-size:12px;color:#c9d4e3}' +
    '#cc-today .td-a .t b{color:#e7ecf3}' +
    '#cc-today .td-a .w{font-size:11px;color:#9aa6b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#cc-today .td-a.full .w{white-space:normal}' +
    '#cc-today .td-a .ab{display:flex;flex-direction:column;gap:4px;flex:none}' +
    '#cc-today .td-a .ab a,#cc-today .td-a .ab button{font-size:10.5px;padding:3px 8px;text-align:center;background:#1a2030;border:1px solid #2a3244;color:#c9d4e3;border-radius:6px;cursor:pointer;text-decoration:none}' +
    '#cc-today .td-a .ab .ok{border-color:rgba(56,217,169,.5);color:#38d9a9}' +
    '#cc-today .td-a .ab.grid{display:grid;grid-template-columns:auto auto}' +
    '#cc-today .td-tag{font-size:9px;font-weight:800;margin-left:5px}' +
    '#cc-today .td-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#7c8ba3}' +
    '#cc-today .td-foot a{color:#9fd3ff;cursor:pointer}' +
    '#cc-today .td-q{margin-top:8px;padding:8px 12px;border-radius:10px;border:1px solid rgba(56,217,169,.4);background:rgba(56,217,169,.07);cursor:pointer;font-size:12px;color:#c9d4e3;display:flex;gap:6px;flex-wrap:wrap;align-items:center}' +
    '#cc-today .td-q span{color:#9aa6b8}' +
    '#cc-today .td-q .go{margin-left:auto;color:#38d9a9;font-weight:700}' +
    // Phone: two meters a row, one action a row, buttons in a row under the text.
    '@media (max-width:600px){' +
      '#cc-today{padding:10px 12px}' +
      '#cc-today .td-meters{grid-template-columns:1fr 1fr;gap:6px}' +
      '#cc-today .td-m{padding:7px 8px}' +
      '#cc-today .td-acts{grid-template-columns:1fr}' +
      '#cc-today .td-a{flex-wrap:wrap}' +
      '#cc-today .td-a .t{flex-basis:calc(100% - 30px)}' +
      '#cc-today .td-a .ab,#cc-today .td-a .ab.grid{display:flex;flex-direction:row;flex-wrap:wrap;width:100%;padding-left:25px}' +
      '#cc-today .td-a .ab a,#cc-today .td-a .ab button{padding:6px 10px;font-size:11.5px}' +
      '#cc-today .td-week{min-width:0;flex-basis:100%;order:3}' +
      '#cc-today .td-foot{flex-direction:column}' +
    '}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'cc-today';
  main.insertBefore(box, main.firstChild);

  var open = store.get('cc_today_open') !== '0';
  var more = false;
  var queue = null;
  var SHOWN = 6;
  var data = null;

  var KIND = { connections: 'connection_request', dms: 'dm', applications: 'application', posts: 'post', referrals: 'referral_ask',
    abroad: null, india: null, remote: null, mocks: null };
  var STEP = { connections: [1, 5], dms: [1, 5], applications: [1], posts: [1], referrals: [1], abroad: [], india: [], remote: [], mocks: [] };
  // The split meters count roles marked applied; each opens its own queue tab.
  var SCOPE = { abroad: 'abroad', india: 'bangalore', remote: 'remote' };
  var LINK = 'float:right;color:#9fd3ff;cursor:pointer;text-transform:none;letter-spacing:0';

  function meter(k, m) {
    var pct = m.target ? Math.min(100, Math.round(m.done / m.target * 100)) : 0;
    return '<div class="td-m' + (m.done >= m.target ? ' hit' : '') + '"><div class="l">' + esc(m.label) +
      (k === 'posts' ? ' <a data-post="1" style="float:right;color:#9fd3ff;cursor:pointer;text-transform:none;letter-spacing:0" title="Draft today’s post in your LinkedIn rules">✍️ Draft</a>' : '') +
      (k === 'applications' ? ' <a data-queue="1" style="' + LINK + '" title="The next roles to apply to, best first">🚀 Queue</a>' : '') +
      (SCOPE[k] ? ' <a data-queue="' + SCOPE[k] + '" style="' + LINK + '" title="Open the queue on this tab">🚀</a>' : '') +
      (k === 'mocks' ? ' <a href="/interview.html" style="' + LINK + '" title="Open the Interview Room">🎙 Practice</a>' : '') + '</div>' +
      '<div class="n">' + m.done + ' <span>/ ' + m.target + (m.stretch ? ' · stretch ' + m.stretch : '') + (m.done >= m.target ? ' ✓' : '') + '</span></div>' +
      '<div class="td-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="b">' + STEP[k].map(function (n) { return '<button type="button" data-log="' + k + '" data-n="' + n + '">+' + n + '</button>'; }).join('') + '</div></div>';
  }

  function action(a, i) {
    if (a.type === 'apply_plan' || a.type === 'mock') {
      return '<div class="td-a"><div class="i">' + a.icon + '</div><div class="t"><div><b>' + esc(a.title) + '</b></div>' +
        '<div style="margin-top:2px">→ ' + esc(a.detail) + '</div></div><div class="ab">' +
        (a.type === 'mock'
          ? '<a href="/interview.html" title="Open the Interview Room">🎙 Start a mock</a>'
          : '<button type="button" data-queue="' + esc(a.scope) + '" title="Open the Apply queue on this tab">🚀 Open queue</button>') +
        '</div></div>';
    }
    var tag = a.priority ? '<span class="td-tag" style="color:#fbbf24">⭐ PRIORITY</span>' : '';
    var role = a.role ? (a.url ? '<a target="_blank" rel="noopener" style="color:#9fd3ff" href="' + esc(a.url) + '">' + esc(a.role) + '</a>' : esc(a.role)) : '';
    return '<div class="td-a' + (a.priority ? ' prio' : '') + '"><div class="i">' + a.icon + '</div><div class="t">' +
      '<div><b data-detail-name="' + esc(a.company) + '" style="cursor:pointer;text-decoration:underline dotted" title="Everything about this company">' + esc(a.company) + '</b>' + tag + ' · ' + esc(a.title) + '</div>' +
      (role ? '<div style="margin-top:2px">' + role + '</div>' : '') +
      (a.detail ? '<div style="margin-top:2px">→ ' + esc(a.detail) + '</div>' : '') +
      (a.whyCompany ? '<div class="w" title="' + esc(a.whyCompany) + '">💡 Why this company: ' + esc(a.whyCompany) + '</div>' : '') +
      (a.whyRole ? '<div class="w" title="' + esc(a.whyRole) + '">🎯 Why this role: ' + esc(a.whyRole) + '</div>' : '') +
      (a.whyNowLine ? '<div class="w" style="color:#d6b25e" title="' + esc(a.whyNowLine) + '">📈 ' + esc(a.whyNowLine) + '</div>' : '') +
      '</div><div class="ab' + (a.fkey ? ' grid' : '') + '">' +
      (a.url && a.type === 'apply' ? '<a target="_blank" rel="noopener" href="' + esc(a.url) + '">Apply ↗</a>' : '') +
      (a.type === 'apply' && a.jobId ? '<button type="button" data-guide="' + esc(a.jobId) + '" title="Guided apply">🧭 Guided</button>' : '') +
      (a.type === 'apply' && a.jobId ? '<button type="button" data-tailor="' + esc(a.jobId) + '" data-co="' + esc(a.company) + '" data-role="' + esc(a.role || '') + '" data-url="' + esc(a.url || '') + '" title="Tailor your resume to this role first">📄 Tailor</button>' : '') +
      (a.type === 'interview' && a.prepId ? '<a href="/interview.html?prep=' + esc(a.prepId) + '" title="Your prep guide">📘 Prep guide</a>' : '') +
      (a.type === 'interview' && a.companyId ? '<a href="/interview.html?company=' + encodeURIComponent(a.companyId) + (a.role ? '&role=' + encodeURIComponent(a.role) : '') + '" title="' + (a.prepId ? 'Run a mock round' : 'Build the prep guide, then run a mock round') + '">' + (a.prepId ? '🎙 Mock' : '🧠 Prep & mock') + '</a>' : '') +
      (a.url && a.type === 'follow_up' ? '<a target="_blank" rel="noopener" href="' + esc(a.url) + '">Open ↗</a>' : '') +
      (a.type === 'outreach' ? '<button type="button" data-detail-name="' + esc(a.company) + '" title="People to reach, news, and DM drafts">👥 People</button>' : '') +
      (a.companyId && typeof window.openTrack === 'function' ? '<button type="button" data-open="' + esc(a.companyId) + '">Track</button>' : '') +
      (a.type === 'apply' && a.jobId
        ? '<button type="button" class="ok" data-applied="' + esc(a.jobId) + '" title="Mark applied — counts toward today">✓ Applied</button>'
        : a.fkey
        ? '<button type="button" data-nudge="' + esc(a.fkey) + '" title="Draft the follow-up (one AI call)">✍️ Draft</button>' +
          '<button type="button" class="ok" data-fact="sent" data-fk="' + esc(a.fkey) + '" title="You followed up — the clock restarts">✓ Sent</button>' +
          '<button type="button" data-fact="snooze" data-fk="' + esc(a.fkey) + '" title="Waiting on them — hide for 7 days">💤 7d</button>' +
          '<button type="button" data-fact="close" data-fk="' + esc(a.fkey) + '" title="It is over — moves to Closed, history kept">✕ Close</button>'
        : '<button type="button" class="ok" data-done="' + i + '" title="Mark done — logs it and hides it for today">Done ✓</button>') +
      '</div></div>';
  }

  function render() {
    var w = data && data.week;
    var weekLine = !w ? 'Loading…'
      : 'This week: <b>' + w.connections.done + '/' + w.connections.target + '</b> connections · <b>' + w.dms.done + '/' + w.dms.target + '</b> DMs · <b>' +
        w.applications.done + '/' + w.applications.target + '</b> applications (abroad ' + w.abroad.done + '/' + w.abroad.target +
        ', India ' + w.india.done + '/' + w.india.target + ', remote ' + w.remote.done + '/' + w.remote.target + ') · <b>' +
        w.mocks.done + '/' + w.mocks.target + '</b> mocks · <b>' + w.referrals.done + '/' + w.referrals.target + '</b> referral asks · <b>' +
        w.calls.done + '/' + w.calls.target + '–' + w.calls.stretch + '</b> calls';
    var html = '<div class="td-head" data-toggle="1"><strong style="font-size:14px">📅 Today</strong>' +
      '<span class="td-week">' + weekLine + '</span>' +
      '<span style="font-size:11px;color:#7c8ba3">' + (data ? data.actions.length + ' actions · ' : '') + (open ? '▾ hide' : '▸ show') + '</span></div>';
    if (open && data) {
      html += '<div class="td-meters">' + Object.keys(KIND).map(function (k) { return meter(k, data.today[k]); }).join('') + '</div>';
      if (queue) {
        html += '<div class="td-q" data-queue="1" title="Open the Apply queue">🚀 <b>' + (queue.counts.bangalore + queue.counts.remote + queue.counts.abroad) + ' roles ready to apply</b>' +
          ' <span>· Bangalore ' + queue.counts.bangalore + ' · Remote ' + queue.counts.remote + ' · Abroad with visa/relocation ' + queue.counts.abroad + '</span>' +
          '<span class="go">Open queue →</span></div>';
      }
      html += data.actions.length
        ? '<div class="td-acts">' + (more ? data.actions : data.actions.slice(0, SHOWN)).map(action).join('') + '</div>' +
          (data.actions.length > SHOWN ? '<a data-more="1" style="display:inline-block;margin-top:6px;font-size:11px;color:#9fd3ff;cursor:pointer">' +
            (more ? 'Show fewer' : 'Show ' + (data.actions.length - SHOWN) + ' more actions') + '</a>' : '')
        : '<p class="cc-muted" style="margin:10px 0 0">Nothing urgent left today — send connection requests to your Outreach companies.</p>';
      html += '<div class="td-foot"><span>Targets from your Daily System · ⭐ Priority → Apply → Outreach · ' + data.priorityTargets + ' priority companies</span>' +
        '<span>' + (data.followUpsDue ? '<a data-triage="1">📬 Triage ' + data.followUpsDue + ' follow-ups →</a> · ' : '') + '<a data-all="1">All target companies →</a></span></div>';
    }
    box.innerHTML = html;
  }

  function load() {
    api('/targets/apply-queue?limit=1').then(function (q) { queue = q; render(); }).catch(function () { /* the board works without it */ });
    return api('/targets/today').then(function (d) { data = d; render(); })
      .catch(function (e) { box.innerHTML = '<div class="cc-muted">📅 Today — could not load: ' + esc(e.message) + '</div>'; });
  }

  function log(body) { return api('/targets/activity', { method: 'POST', body: body }).then(load); }

  box.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target : null;
    if (!el) return;
    var b;
    if ((b = el.closest('[data-log]'))) {
      b.disabled = true;
      log({ kind: KIND[b.getAttribute('data-log')], count: Number(b.getAttribute('data-n')) })
        .catch(function (err) { b.disabled = false; window.alert(err.message); });
      return;
    }
    if ((b = el.closest('[data-done]'))) {
      var a = data.actions[Number(b.getAttribute('data-done'))];
      b.disabled = true;
      log({ kind: a.logKind || 'action_done', companyId: a.companyId || undefined, company: a.company, actionKey: a.key })
        .catch(function (err) { b.disabled = false; window.alert(err.message); });
      return;
    }
    if ((b = el.closest('[data-open]'))) { window.openTrack(b.getAttribute('data-open')); return; }
    if (el.closest('[data-more]')) { more = !more; render(); return; }
    if (el.closest('[data-triage]')) { if (window.ccTriage) window.ccTriage(); return; }
    if ((b = el.closest('[data-queue]'))) { if (window.ccApplyQueue) window.ccApplyQueue(b.getAttribute('data-queue') === '1' ? null : b.getAttribute('data-queue')); return; }
    if ((b = el.closest('[data-tailor]'))) { if (window.ccTailor) window.ccTailor(b); return; }
    if ((b = el.closest('[data-guide]'))) { if (window.ccGuidedApply) window.ccGuidedApply(b.getAttribute('data-guide')); return; }
    if ((b = el.closest('[data-applied]'))) {
      b.disabled = true;
      api('/targets/apply-queue/applied', { method: 'POST', body: { jobId: b.getAttribute('data-applied') } })
        .then(load).catch(function (err) { b.disabled = false; window.alert(err.message); });
      return;
    }
    if (el.closest('[data-post]')) { if (window.ccPostHelper) window.ccPostHelper(); return; }
    if ((b = el.closest('[data-nudge]'))) { if (window.ccTriage) window.ccTriage(b.getAttribute('data-nudge')); return; }
    if ((b = el.closest('[data-fact]'))) {
      b.disabled = true;
      api('/targets/followups/act', { method: 'POST', body: { key: b.getAttribute('data-fk'), action: b.getAttribute('data-fact') } })
        .then(load).catch(function (err) { b.disabled = false; window.alert(err.message); });
      return;
    }
    if (el.closest('[data-detail-name]')) return;
    // Clicking an action's text shows its why lines in full.
    if ((b = el.closest('.td-a .t')) && !el.closest('a')) { b.parentNode.classList.toggle('full'); return; }
    if (el.closest('[data-all]')) {
      if (typeof window.showTab === 'function') window.showTab('discovery');
      setTimeout(function () {
        var t = document.getElementById('cc-targets');
        if (!t) return;
        if (t.lastElementChild.style.display === 'none') t.firstElementChild.click();
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
      return;
    }
    if (el.closest('a')) return;
    if (el.closest('[data-toggle]')) { open = !open; store.set('cc_today_open', open ? '1' : '0'); render(); }
  });

  window.ccRefreshToday = load;
  render();
  load();
  // Keep it current: when he comes back to the tab, and every 10 minutes.
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  setInterval(function () { if (!document.hidden) load(); }, 600000);
})();

/* ────────────────────────────────────────────────────────────────────
 * Company detail: everything known about one company, in one modal.
 *
 * Opens from stored data only (no search API). What is new on the web —
 * news, funding, layoffs, India expansion, interviews, people to reach —
 * comes as free Google searches he opens. From here he can add the company
 * to his list, log a contact, and draft outreach (one AI call, on demand).
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  var css = document.createElement('style');
  css.textContent =
    '#cc-cd{position:fixed;inset:0;z-index:10000;background:rgba(5,8,14,.72);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto}' +
    '#cc-cd .cd{background:#141822;border:1px solid #2a3244;border-radius:14px;width:100%;max-width:960px;padding:18px 22px;color:#c9d4e3;font-size:12.5px;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '#cc-cd h3{margin:0;font-size:19px;color:#e7ecf3}' +
    '#cc-cd h4{margin:16px 0 6px;font-size:12px;color:#9aa6b8;text-transform:uppercase;letter-spacing:.05em}' +
    '#cc-cd .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '#cc-cd .muted{color:#7c8ba3}' +
    '#cc-cd .chip{font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;border:1px solid}' +
    '#cc-cd .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}' +
    '#cc-cd .box{background:#0f131b;border:1px solid #232a38;border-radius:10px;padding:10px 12px}' +
    '#cc-cd .lnk{display:inline-block;margin:0 6px 6px 0;font-size:11px;padding:4px 9px;border-radius:7px;border:1px solid #2a3244;background:#1a2030;color:#c9d4e3;text-decoration:none}' +
    '#cc-cd .lnk:hover{border-color:#9fd3ff;color:#9fd3ff}' +
    '#cc-cd .lnk small{color:#7c8ba3;margin-left:4px}' +
    '#cc-cd .b{font-size:11.5px;padding:5px 11px;border-radius:7px;border:1px solid #2a3244;background:#1a2030;color:#c9d4e3;cursor:pointer}' +
    '#cc-cd .b.pri{border-color:rgba(56,217,169,.55);color:#38d9a9}' +
    '#cc-cd .b.amb{border-color:rgba(251,146,60,.5);color:#fb923c}' +
    '#cc-cd .role{padding:6px 0;border-bottom:1px solid #1e2430}' +
    '#cc-cd input,#cc-cd select{background:#0f131b;border:1px solid #2a3244;border-radius:7px;color:#e7ecf3;padding:5px 8px;font-size:12px;font-family:inherit}' +
    '#cc-cd .msg{white-space:pre-wrap;background:#0f131b;border:1px solid #232a38;border-radius:8px;padding:9px 11px;margin-top:6px;line-height:1.5}' +
    '@media (max-width:720px){#cc-cd .grid2{grid-template-columns:1fr}}';
  document.head.appendChild(css);

  var ref = null;
  var data = null;

  function ago(iso) {
    if (!iso) return '';
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? d + 'd ago' : Math.floor(d / 30) + 'mo ago';
  }
  var STAGE = { new: 'New', interested: 'Interested', applied: 'Applied', networking: 'Networking', call: 'Call', win: 'WIN doc', interview: 'Interview', offer: 'Offer', failed: 'Closed' };
  var REGION = { eu: 'Europe', gulf: 'Gulf', global: 'Global remote', global_onsite: 'Global on-site', in_remote: 'India remote', blr_onsite: 'Bangalore on-site', blr_hybrid: 'Bangalore hybrid', india: 'India' };
  var CONN = { req: 'Request sent', dm: 'DM sent', reply: 'Replied', fu1: 'Follow-up 1', fu2: 'Follow-up 2', fu3: 'Follow-up 3', win: 'WIN doc', call: 'Call', ref: 'Referral', ab: 'No reply' };

  function close() { var m = document.getElementById('cc-cd'); if (m) m.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function shell(inner) {
    var m = document.getElementById('cc-cd');
    if (!m) {
      m = document.createElement('div');
      m.id = 'cc-cd';
      m.addEventListener('click', function (e) { if (e.target === m) close(); });
      m.addEventListener('click', onClick);
      document.body.appendChild(m);
      document.addEventListener('keydown', onKey);
    }
    m.innerHTML = '<div class="cd">' + inner + '</div>';
  }

  function list(items, fn, empty) { return items && items.length ? items.map(fn).join('') : '<div class="muted">' + esc(empty) + '</div>'; }

  function render() {
    var d = data, t = d.target || {}, co = d.company || {}, r = t.research || {}, cr = co.research || {};
    var tag = t.tag && t.tag !== 'watch'
      ? (t.priority ? '<span class="chip" style="color:#fbbf24;border-color:rgba(251,191,36,.5)">⭐ PRIORITY</span>' : '') +
        '<span class="chip" style="color:' + (t.tag === 'apply' ? '#34d399;border-color:rgba(52,211,153,.5)' : '#c4b5fd;border-color:rgba(196,181,253,.5)') + '">' + (t.tag === 'apply' ? 'APPLY' : 'OUTREACH') + (t.rank ? ' #' + t.rank : '') + '</span>'
      : '';
    var stage = d.pipeline ? d.pipeline.stage : null;
    var listBtns = !d.inList
      ? '<button class="b pri" data-add="new" type="button" title="Add to your Companies tab">＋ Add to Companies</button>' +
        '<button class="b amb" data-add="interested" type="button" title="Add to Companies and to your pipeline as Interested">⭐ Add as Interested</button>'
      : (!stage || stage === 'new' ? '<button class="b amb" data-add="interested" type="button" title="Move into your pipeline as Interested">⭐ Mark Interested</button>' : '') +
        (typeof window.openTrack === 'function' ? '<button class="b" data-track="1" type="button">📊 Track</button>' : '');

    var html =
      '<div class="row" style="justify-content:space-between;align-items:flex-start">' +
        '<div><div class="row"><h3>' + esc(d.name) + '</h3>' + tag + '</div>' +
        '<div class="muted" style="margin-top:4px">' +
          (t.hiring != null ? 'hiring ' + t.hiring + ' · company fit ' + t.fit + ' · ' : '') +
          (d.inList ? 'in your Companies list' + (stage ? ' · pipeline: ' + esc(STAGE[stage] || stage) : '') : '<span style="color:#fbbf24">found by job discovery — not in your Companies list yet</span>') +
          (co.region ? ' · ' + esc(REGION[co.region] || co.region) : '') + (co.pay ? ' · ' + esc(co.pay) : '') + (co.dsa ? ' · expects DSA rounds' : '') +
        '</div></div>' +
        '<div class="row">' + listBtns + '<button class="b" data-close="1" type="button">✕</button></div>' +
      '</div>';

    if (d.nextAction) html += '<div class="box" style="margin-top:12px;border-color:rgba(56,217,169,.35)"><b style="color:#38d9a9">→ Next:</b> ' + esc(d.nextAction) + '</div>';

    html += '<div class="grid2" style="margin-top:4px"><div>';
    html += '<h4>Why this company</h4><div>' + (d.whyCompany ? '💡 ' + esc(d.whyCompany) : '<span class="muted">No why line yet — it is written within a few hours of discovery.</span>') + '</div>';
    if (co.description && co.description !== d.whyCompany) html += '<div class="muted" style="margin-top:6px">' + esc(co.description) + '</div>';
    html += '<h4>Hiring signals</h4>';
    html += '<div>' + (t.whyNow ? '📈 ' + esc(t.whyNow) : '<span class="muted">No signals yet.</span>') + '</div>';
    html += '<div class="muted" style="margin-top:4px">' + (t.new30d != null ? t.new30d + ' relevant roles in the last 30 days (' + t.prev30d + ' the 30 before) · ' + t.openFit75 + ' open with fit 75+' : '') + '</div>';
    if (r.layoffs) html += '<div style="color:#ff8787;margin-top:6px">⚠️ Layoffs or a hiring freeze in the last 6 months</div>';
    if (r.signals && r.signals.length) {
      html += '<div style="margin-top:6px">' + r.signals.map(function (s) {
        return '<div style="margin:3px 0">• ' + esc(s.text) + ' <span class="muted">' + esc(s.date || '') + '</span>' +
          (s.source && /^https?:/.test(s.source) ? ' <a target="_blank" rel="noopener" style="color:#9fd3ff" href="' + esc(s.source) + '">source</a>' : '') + '</div>';
      }).join('') + '</div><div class="muted" style="font-size:11px">Researched ' + ago(t.researchAt) + '</div>';
    } else {
      html += '<div class="muted" style="font-size:11px;margin-top:4px">Not researched yet — the Monday run researches the top candidates. Use the news searches below for anything newer.</div>';
    }
    if (cr.challenges || cr.recentNews || cr.hookSentence) {
      html += '<h4>From your research</h4>';
      if (cr.hookSentence) html += '<div>🪝 ' + esc(cr.hookSentence) + '</div>';
      if (cr.challenges && cr.challenges.length) html += '<div style="margin-top:4px">' + cr.challenges.slice(0, 5).map(function (c) { return '<div>• ' + esc(typeof c === 'string' ? c : (c.title || c.challenge || c.text || JSON.stringify(c))) + '</div>'; }).join('') + '</div>';
      if (cr.recentNews && cr.recentNews.length) html += '<div style="margin-top:4px">' + cr.recentNews.slice(0, 5).map(function (n) { return '<div>📰 ' + esc(typeof n === 'string' ? n : (n.headline || n.title || n.text || '')) + (n.date ? ' <span class="muted">' + esc(n.date) + '</span>' : '') + '</div>'; }).join('') + '</div>';
      if (cr.lastResearched) html += '<div class="muted" style="font-size:11px">Researched ' + ago(cr.lastResearched) + '</div>';
    }
    html += '</div><div>';
    html += '<h4>Open roles (' + d.roles.length + ')</h4>' + list(d.roles, function (j) {
      return '<div class="role"><a target="_blank" rel="noopener" style="color:#9fd3ff" href="' + esc(j.url) + '">' + esc(j.title) + '</a>' +
        (j.fit_score != null ? ' <b style="color:' + (j.fit_score >= 80 ? '#38d9a9' : '#c9d4e3') + '">fit ' + j.fit_score + '</b>' : '') +
        (j.app_status ? ' <span class="chip" style="color:#fb923c;border-color:rgba(251,146,60,.5)">' + esc(j.app_status) + '</span>' : '') +
        '<div class="muted">' + esc(j.location || '') + ' · ' + esc(j.source || '') + ' · ' + ago(j.posted_at || j.discovered_at) + '</div>' +
        (j.why_role ? '<div style="font-size:11.5px;margin-top:2px">🎯 ' + esc(j.why_role) + '</div>' : '') + '</div>';
    }, 'No open roles found — an Outreach target: reach people before a role is posted.');
    html += '</div></div>';

    // Pipeline and contacts
    html += '<h4>Your pipeline</h4><div class="grid2"><div class="box">';
    html += d.pipeline
      ? '<div>Stage: <b>' + esc(STAGE[d.pipeline.stage] || d.pipeline.stage) + '</b> <span class="muted">since ' + ago(d.pipeline.since) + '</span></div>' +
        list(d.pipeline.roles, function (x) { return '<div>• ' + esc(x.title || 'Role') + ' <span class="muted">' + esc(x.stage || '') + (x.appliedAt ? ' · applied ' + esc(String(x.appliedAt).slice(0, 10)) : '') + (x.interviewAt ? ' · interview ' + esc(String(x.interviewAt).slice(0, 16).replace('T', ' ')) : '') + '</span></div>'; }, 'No roles tracked yet.')
      : '<span class="muted">Not in your pipeline.</span>';
    html += '<div style="margin-top:8px"><b>Recent activity</b></div>' + list(d.activity, function (a) {
      return '<div class="muted">• ' + esc(a.kind.replace(/_/g, ' ')) + (a.count > 1 ? ' ×' + a.count : '') + ' · ' + ago(a.at) + '</div>';
    }, 'Nothing logged yet.');
    html += '</div><div class="box"><b>Contacts (' + d.contacts.length + ')</b>' + list(d.contacts, function (c) {
      return '<div style="margin-top:3px">• ' + (c.linkedin_url ? '<a target="_blank" rel="noopener" style="color:#9fd3ff" href="' + esc(c.linkedin_url) + '">' + esc(c.name) + '</a>' : esc(c.name)) +
        ' <span class="muted">' + esc(c.role || c.type) + ' · ' + esc(CONN[c.status] || c.status) + '</span></div>';
    }, 'No one logged yet — find people below.') + '</div></div>';

    // What's happening — free Google searches
    html += '<h4>📰 What’s happening — free Google searches (open in your browser)</h4><div>' +
      d.links.news.map(function (l) { return '<a class="lnk" target="_blank" rel="noopener" href="' + esc(l.url) + '" title="' + esc(l.hint) + '">' + esc(l.name) + ' ↗</a>'; }).join('') + '</div>' +
      '<div class="muted" style="font-size:11px">These are Google searches you open — nothing is fetched by the server and no search API is used.</div>';

    // People + outreach
    html += '<h4>👥 Find people to reach</h4><div>' +
      d.links.people.map(function (l) { return '<a class="lnk" target="_blank" rel="noopener" href="' + esc(l.url) + '" title="' + esc(l.hint) + '">' + esc(l.name) + ' ↗</a>'; }).join('') + '</div>';
    html += '<div class="box" style="margin-top:6px"><div class="row">' +
      '<input id="cc-cd-name" placeholder="Name" style="min-width:140px">' +
      '<input id="cc-cd-role" placeholder="Role (e.g. Engineering Manager)" style="min-width:200px">' +
      '<select id="cc-cd-type"><option value="hm">Hiring manager</option><option value="peer" selected>Peer engineer</option><option value="indian">Indian engineer</option><option value="hr">Recruiter</option><option value="other">Other</option></select>' +
      '<input id="cc-cd-li" placeholder="LinkedIn URL" style="min-width:200px;flex:1">' +
      '</div><div class="row" style="margin-top:8px">' +
      '<button class="b pri" data-contact="1" type="button" title="Saves the person as a contact (request sent) — counts toward today’s connections">＋ Save contact (request sent)</button>' +
      '<button class="b" data-draft="1" type="button" title="One AI call, grounded in your profile and this company’s stored research — no search API">✍️ Draft connection note + DMs</button>' +
      '<span class="muted" id="cc-cd-status"></span></div><div id="cc-cd-drafts"></div></div>';
    shell(html);
  }

  function load() {
    shell('<div class="muted">Loading ' + esc(ref.name || '') + '…</div>');
    var q = Object.keys(ref).filter(function (k) { return ref[k]; }).map(function (k) { return k + '=' + encodeURIComponent(ref[k]); }).join('&');
    return api('/targets/company?' + q).then(function (d) { data = d; ref = { key: d.key }; render(); })
      .catch(function (e) { shell('<div class="cc-bad">' + esc(e.message) + '</div><button class="b" data-close="1" type="button">Close</button>'); });
  }

  function status(t, bad) { var s = document.getElementById('cc-cd-status'); if (s) { s.textContent = t; s.style.color = bad ? '#ff8787' : ''; } }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function afterChange() {
    if (typeof window.ccRefreshToday === 'function') window.ccRefreshToday();
    if (CC.refreshState) CC.refreshState();
  }

  function ensureInList(stage) {
    if (data.companyId && data.inList && stage !== 'interested') return Promise.resolve(data.companyId);
    return api('/targets/company/add', { method: 'POST', body: { key: data.key, stage: stage || 'new' } }).then(function (r) { return r.companyId; });
  }

  function onClick(e) {
    var el = e.target.closest ? e.target : null;
    if (!el) return;
    var b;
    if (el.closest('[data-close]')) { close(); return; }
    if ((b = el.closest('[data-track]'))) { var id = data.companyId; close(); window.openTrack(id); return; }
    if ((b = el.closest('[data-add]'))) {
      b.disabled = true;
      ensureInList(b.getAttribute('data-add')).then(function () { afterChange(); return load(); })
        .catch(function (err) { b.disabled = false; window.alert(err.message); });
      return;
    }
    if ((b = el.closest('[data-contact]'))) {
      var name = val('cc-cd-name');
      if (!name) { status('Enter a name first', true); return; }
      b.disabled = true; status('Saving…');
      ensureInList('new').then(function (id) {
        return api('/tracked/' + encodeURIComponent(id) + '/connections', { method: 'POST', body: { name: name, role: val('cc-cd-role'), type: val('cc-cd-type'), li: val('cc-cd-li'), status: 'req' } });
      }).then(function () { afterChange(); return load(); })
        .catch(function (err) { b.disabled = false; status(err.message, true); });
      return;
    }
    if ((b = el.closest('[data-draft]'))) {
      b.disabled = true; status('Drafting (one AI call, ~15s)…');
      api('/targets/company/draft', { method: 'POST', body: { key: data.key, contact: { name: val('cc-cd-name'), role: val('cc-cd-role'), type: val('cc-cd-type') } } })
        .then(function (r) {
          var m = r.messages || {};
          var block = function (label, text, extra) {
            return text ? '<div style="margin-top:10px"><b>' + label + '</b>' + (extra || '') + ' <button class="b" data-copy="1" type="button" style="padding:2px 8px;font-size:10.5px">Copy</button><div class="msg">' + esc(text) + '</div></div>' : '';
          };
          document.getElementById('cc-cd-drafts').innerHTML =
            block('Connection note', m.connectionNote, ' <span class="muted">' + (m.connectionNoteChars || 0) + '/300' + (m.connectionNoteOverLimit ? ' — too long, trim it' : '') + '</span>') +
            block('First DM (after they accept)', m.firstDM) + block('Peer DM', m.peerDM) + block('Day-4 follow-up', m.followUp) +
            (m.rationale ? '<div class="muted" style="margin-top:8px">Angle: ' + esc(m.rationale) + '</div>' : '') +
            (r.grounded && !r.grounded.research ? '<div style="color:#fbbf24;margin-top:6px">No research on file for this company yet — check the specifics before sending.</div>' : '');
          status(''); b.disabled = false;
        })
        .catch(function (err) { b.disabled = false; status(err.message, true); });
      return;
    }
    if ((b = el.closest('[data-copy]'))) {
      var text = b.parentNode.querySelector('.msg').textContent;
      navigator.clipboard.writeText(text).then(function () { b.textContent = '✓ Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); });
    }
  }

  /** Open the detail modal: { key } (target), { id } (catalogue) or { name }. */
  window.ccCompanyDetail = function (r) { ref = r || {}; data = null; load(); };

  // Any element with data-detail-key / data-detail-name opens it.
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-detail-key],[data-detail-name],[data-detail-id]') : null;
    if (!el || (e.target.closest && e.target.closest('a'))) return;
    e.preventDefault();
    window.ccCompanyDetail({ key: el.getAttribute('data-detail-key'), id: el.getAttribute('data-detail-id'), name: el.getAttribute('data-detail-name') });
  });
})();

/* ────────────────────────────────────────────────────────────────────
 * Follow-up triage and the LinkedIn post helper — two modals opened from
 * the Today board. Triage: every follow-up due, one decision each (sent /
 * waiting 7 days / close; nothing is deleted) with a drafted nudge on
 * demand. Posts: angles from his real week, then a draft in his LinkedIn
 * rules with hooks whose lengths are checked.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  var css = document.createElement('style');
  css.textContent =
    '.cc-md{position:fixed;inset:0;z-index:10000;background:rgba(5,8,14,.72);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto}' +
    '.cc-md .cd{background:#141822;border:1px solid #2a3244;border-radius:14px;width:100%;max-width:880px;padding:18px 22px;color:#c9d4e3;font-size:12.5px}' +
    '.cc-md h3{margin:0;font-size:18px;color:#e7ecf3}' +
    '.cc-md .muted{color:#7c8ba3}' +
    '.cc-md .b{font-size:11px;padding:4px 10px;border-radius:7px;border:1px solid #2a3244;background:#1a2030;color:#c9d4e3;cursor:pointer}' +
    '.cc-md .b.pri{border-color:rgba(56,217,169,.55);color:#38d9a9}' +
    '.cc-md .fu{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid #1e2430}' +
    '.cc-md .fu .t{flex:1;min-width:0}' +
    '.cc-md .fu .a{display:flex;gap:5px;flex-wrap:wrap;flex:none;justify-content:flex-end;max-width:320px}' +
    '.cc-md .msg{white-space:pre-wrap;background:#0f131b;border:1px solid #232a38;border-radius:8px;padding:9px 11px;margin-top:6px;line-height:1.5}' +
    '.cc-md textarea,.cc-md select{background:#0f131b;border:1px solid #2a3244;border-radius:8px;color:#e7ecf3;padding:8px 10px;font-size:12.5px;font-family:inherit}' +
    '.cc-md .hk{border:1px solid #232a38;border-radius:8px;padding:8px 10px;margin-top:6px;cursor:pointer}' +
    '.cc-md .hk.sel{border-color:rgba(56,217,169,.6);background:rgba(56,217,169,.06)}' +
    '.cc-md .tabs{display:flex;gap:6px;margin:10px 0 4px;flex-wrap:wrap}' +
    '@media (max-width:600px){' +
      '.cc-md,#cc-cd{padding:0}' +
      '.cc-md .cd,#cc-cd .cd{border-radius:0;min-height:100vh;padding:14px 14px 40px;border:0}' +
      '.cc-md .fu,#cc-queue .q{flex-direction:column}' +
      '.cc-md .fu .a,#cc-queue .q .a{justify-content:flex-start;max-width:none}' +
      '.cc-md .b,#cc-cd .b,#cc-cd .lnk{padding:7px 11px;font-size:12px}' +
      '#cc-cd .row{gap:6px}' +
      '#cc-cd input{min-width:0 !important;flex:1 1 100%}' +
      '#cc-queue .w{white-space:normal}' +
    '}';
  document.head.appendChild(css);

  function modal(id) {
    var m = document.getElementById(id);
    if (!m) {
      m = document.createElement('div');
      m.id = id; m.className = 'cc-md';
      m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
      document.body.appendChild(m);
      var onKey = function (e) { if (e.key === 'Escape') { m.remove(); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
    }
    return m;
  }
  var refreshToday = function () { if (window.ccRefreshToday) window.ccRefreshToday(); };
  var copyBtn = '<button class="b" data-copy="1" type="button" style="padding:2px 8px;font-size:10.5px">Copy</button>';
  function wireCopy(root) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-copy]');
      if (!b) return;
      var box = b.parentNode.querySelector('.msg') || b.parentNode.parentNode.querySelector('.msg');
      navigator.clipboard.writeText(box.textContent).then(function () { b.textContent = '✓ Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); });
    });
  }

  // ── Follow-up triage ─────────────────────────────────────────────────
  var KIND = { applied: '📨 Application', dm: '💬 DM', networking: '🤝 Networking' };
  var fu = { items: [], filter: 'all' };

  function triageRender(m) {
    var items = fu.items.filter(function (i) { return fu.filter === 'all' || i.kind === fu.filter; });
    var count = function (k) { return fu.items.filter(function (i) { return k === 'all' || i.kind === k; }).length; };
    m.innerHTML = '<div class="cd"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<div><h3>📬 Follow-up triage</h3><div class="muted">' + fu.items.length + ' due' + (fu.waiting ? ' · ' + fu.waiting + ' waiting (snoozed)' : '') + (fu.parked ? ' · ' + fu.parked + ' quiet over 45 days, not shown' : '') +
      ' · one decision each — nothing is deleted</div></div><button class="b" data-x="1" type="button">✕</button></div>' +
      '<div class="tabs">' + ['all', 'applied', 'dm', 'networking'].map(function (k) {
        return '<button class="b' + (fu.filter === k ? ' pri' : '') + '" data-f="' + k + '" type="button">' + (k === 'all' ? 'All' : KIND[k]) + ' (' + count(k) + ')</button>';
      }).join('') + '</div>' +
      (items.length ? items.map(function (i) {
        var what = i.kind === 'applied' ? (i.role ? esc(i.role) : 'Application') : i.kind === 'dm' ? 'DM to ' + esc(i.name) : 'Networking gone quiet';
        return '<div class="fu" data-row="' + esc(i.key) + '"><div class="t"><b style="color:#e7ecf3">' + esc(i.company) + '</b> · ' + (KIND[i.kind] || '') +
          '<div>' + what + ' · <span style="color:' + (i.days >= 14 ? '#ff8787' : '#fbbf24') + '">quiet ' + i.days + ' days</span></div>' +
          '<div class="drafts"></div></div><div class="a">' +
          '<button class="b" data-draft="1" type="button" title="One AI call">✍️ Draft</button>' +
          '<button class="b pri" data-act="sent" type="button" title="You followed up — the clock restarts">✓ Sent</button>' +
          (i.kind === 'applied' ? '<button class="b pri" data-act="sent" data-as="referral" type="button" title="You asked someone for a referral">🤝 Asked referral</button>' : '') +
          '<button class="b" data-act="snooze" type="button" title="Waiting on them — back in 7 days">💤 7 days</button>' +
          '<button class="b" data-act="close" type="button" title="It is over — Closed (role/company) or no reply (contact); history kept">✕ Close</button>' +
          (i.companyId && typeof window.openTrack === 'function' ? '<button class="b" data-track="' + esc(i.companyId) + '" type="button">📊</button>' : '') +
          '</div></div>';
      }).join('') : '<p class="muted" style="margin-top:12px">Nothing due here. 🎉</p>') + '</div>';
  }

  function triageLoad(m, openKey) {
    m.innerHTML = '<div class="cd"><span class="muted">Loading follow-ups…</span></div>';
    return api('/targets/followups').then(function (d) {
      fu.items = d.items; fu.waiting = d.waiting; fu.parked = d.parked;
      triageRender(m);
      if (openKey) { var b = m.querySelector('[data-row="' + CSS.escape(openKey) + '"] [data-draft]'); if (b) { b.scrollIntoView({ block: 'center' }); b.click(); } }
    }).catch(function (e) { m.innerHTML = '<div class="cd"><div class="cc-bad">' + esc(e.message) + '</div></div>'; });
  }

  window.ccTriage = function (openKey) {
    var m = modal('cc-triage');
    if (!m.__wired) {
      m.__wired = true;
      wireCopy(m);
      m.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target : null;
        if (!el) return;
        var b;
        if (el.closest('[data-x]')) { m.remove(); return; }
        if ((b = el.closest('[data-f]'))) { fu.filter = b.getAttribute('data-f'); triageRender(m); return; }
        if ((b = el.closest('[data-track]'))) { var id = b.getAttribute('data-track'); m.remove(); window.openTrack(id); return; }
        var row = el.closest('[data-row]');
        if (!row) return;
        var key = row.getAttribute('data-row');
        if ((b = el.closest('[data-act]'))) {
          b.disabled = true;
          api('/targets/followups/act', { method: 'POST', body: { key: key, action: b.getAttribute('data-act'), as: b.getAttribute('data-as') || undefined } })
            .then(function (r) {
              fu.items = fu.items.filter(function (i) { return i.key !== key; });
              if (b.getAttribute('data-act') === 'snooze') fu.waiting = (fu.waiting || 0) + 1;
              row.innerHTML = '<div class="muted">✓ ' + esc(r.item.company) + ' — ' + esc(r.done) + '</div>';
              setTimeout(function () { triageRender(m); }, 900);
              refreshToday();
            })
            .catch(function (err) { b.disabled = false; window.alert(err.message); });
          return;
        }
        if ((b = el.closest('[data-draft]'))) {
          var out = row.querySelector('.drafts');
          b.disabled = true; out.innerHTML = '<div class="muted">Drafting…</div>';
          api('/targets/followups/draft', { method: 'POST', body: { key: key } }).then(function (r) {
            var d = r.drafts || {};
            var block = function (label, text) { return text ? '<div style="margin-top:8px"><b>' + label + '</b> ' + copyBtn + '<div class="msg">' + esc(text) + '</div></div>' : ''; };
            out.innerHTML = block('Recruiter / hiring-manager nudge', d.recruiterNudge) + block('Referral ask', d.referralAsk) + block('Message', d.message) +
              (d.tip ? '<div class="muted" style="margin-top:6px">💡 ' + esc(d.tip) + '</div>' : '');
            b.disabled = false;
          }).catch(function (err) { out.innerHTML = '<div class="cc-bad">' + esc(err.message) + '</div>'; b.disabled = false; });
        }
      });
    }
    triageLoad(m, openKey);
  };

  // ── LinkedIn post helper ─────────────────────────────────────────────
  var post = { result: null, hook: null };

  function postRender(m) {
    var r = post.result;
    var hooks = r ? r.hooks.map(function (h) {
      return '<div class="hk' + (post.hook === h.format ? ' sel' : '') + '" data-hook="' + h.format + '">' +
        '<div class="muted" style="font-size:11px">' + esc(h.label) + ' · ' + h.chars + ' chars · ' + h.lines + ' line' + (h.lines === 1 ? '' : 's') + ' · ' +
        (h.ok ? '<span style="color:#38d9a9">fits the format</span>' : '<span style="color:#ff8787">outside the format — edit before using</span>') +
        (r.recommended === h.format ? ' · <b style="color:#fbbf24">recommended</b>' : '') + '</div>' +
        '<div style="white-space:pre-wrap;color:#e7ecf3;margin-top:3px">' + esc(h.text) + '</div></div>';
    }).join('') : '';
    var sel = r && (r.hooks.find(function (h) { return h.format === post.hook; }) || r.hooks[0]);
    var full = r ? (sel ? sel.text + '\n\n' : '') + r.body : '';
    m.querySelector('#cc-post-out').innerHTML = r
      ? '<div style="margin-top:14px"><b>Pick a hook</b> <span class="muted">(written last, from the sharpest detail)</span>' + hooks +
        (r.why ? '<div class="muted" style="margin-top:4px">Why: ' + esc(r.why) + '</div>' : '') + '</div>' +
        (r.warnings && r.warnings.length ? '<div style="color:#fbbf24;margin-top:8px">⚠️ Check these before posting: ' + esc(r.warnings.join(', ')) + '</div>' : '') +
        '<div style="margin-top:12px"><b>Full post</b> ' + copyBtn + ' <button class="b pri" data-posted="1" type="button" title="Counts toward today’s 1 post">✓ Posted</button><div class="msg">' + esc(full) + '</div></div>' +
        '<div class="muted" style="margin-top:6px">A strong first draft, not a final: read it once on your phone before posting.</div>'
      : '';
  }

  window.ccPostHelper = function () {
    var m = modal('cc-post');
    post = { result: null, hook: null };
    m.innerHTML = '<div class="cd"><div style="display:flex;justify-content:space-between;align-items:center">' +
      '<div><h3>✍️ Today’s LinkedIn post</h3><div class="muted">Your rules: never from a blank page. Write the real moment, or pick an angle from your week.</div></div>' +
      '<button class="b" data-x="1" type="button">✕</button></div>' +
      '<textarea id="cc-post-mat" rows="6" style="width:100%;margin-top:12px;box-sizing:border-box" placeholder="What happened, what you built or what you noticed. Numbers, names, the real detail. e.g. Built an LLM router with failover across 3 providers; cut errors from X to Y…"></textarea>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">' +
      '<select id="cc-post-bucket"><option value="authority">Authority — a system or result you built</option><option value="growth">Growth — a take or pattern you have seen</option><option value="personal">Personal — a real moment</option></select>' +
      '<button class="b" data-angles="1" type="button" title="One AI call: 3 angles from your achievements and this week">💡 Suggest angles</button>' +
      '<button class="b pri" data-go="1" type="button" title="One AI call">Draft post</button><span class="muted" id="cc-post-status"></span></div>' +
      '<div id="cc-post-angles"></div><div id="cc-post-out"></div></div>';
    var status = function (t) { m.querySelector('#cc-post-status').textContent = t || ''; };
    wireCopy(m);
    m.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target : null;
      if (!el) return;
      var b;
      if (el.closest('[data-x]')) { m.remove(); return; }
      if ((b = el.closest('[data-hook]'))) { post.hook = b.getAttribute('data-hook'); postRender(m); return; }
      if ((b = el.closest('[data-angle]'))) {
        var a = JSON.parse(b.getAttribute('data-angle'));
        m.querySelector('#cc-post-bucket').value = a.bucket || 'authority';
        var ta = m.querySelector('#cc-post-mat');
        ta.value = 'Angle: ' + a.title + '\nBased on: ' + a.basedOn + '\n' + (a.question ? 'Q: ' + a.question + '\nMy answer: ' : 'My detail: ');
        ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
        return;
      }
      if ((b = el.closest('[data-angles]'))) {
        b.disabled = true; status('Finding angles…');
        api('/targets/post/angles', { method: 'POST', body: {} }).then(function (r) {
          m.querySelector('#cc-post-angles').innerHTML = (r.angles || []).map(function (a) {
            return '<div class="hk" data-angle="' + esc(JSON.stringify(a)) + '"><b style="color:#e7ecf3">' + esc(a.title) + '</b> <span class="muted">· ' + esc(a.bucket) + '</span>' +
              '<div class="muted">Based on: ' + esc(a.basedOn) + '</div>' + (a.question ? '<div>❓ ' + esc(a.question) + '</div>' : '') + '</div>';
          }).join('') + '<div class="muted" style="margin-top:4px">Click one, then add your real detail below the question.</div>';
          status(''); b.disabled = false;
        }).catch(function (err) { status(err.message); b.disabled = false; });
        return;
      }
      if ((b = el.closest('[data-go]'))) {
        b.disabled = true; status('Drafting (~15s)…');
        api('/targets/post/draft', { method: 'POST', body: { material: m.querySelector('#cc-post-mat').value, bucket: m.querySelector('#cc-post-bucket').value } })
          .then(function (r) { post.result = r; post.hook = r.recommended || (r.hooks[0] && r.hooks[0].format); postRender(m); status(''); b.disabled = false; })
          .catch(function (err) { status(err.message); b.disabled = false; });
        return;
      }
      if ((b = el.closest('[data-posted]'))) {
        b.disabled = true;
        api('/targets/activity', { method: 'POST', body: { kind: 'post', count: 1 } }).then(function () { b.textContent = '✓ Logged'; refreshToday(); })
          .catch(function (err) { b.disabled = false; window.alert(err.message); });
      }
    });
  };
})();

/* ────────────────────────────────────────────────────────────────────
 * Apply queue: the next roles to apply to, at volume (30–45 a day: abroad 15–20, India 10–15, remote 5–10).
 *
 * Bangalore, remote open to India, and abroad with visa sponsorship or
 * relocation stated in the JD (Gulf counts), ranked by fit, then hiring
 * signals, then freshness. Open ↗ → apply → ✓ Applied, in one row; Tailor
 * for the roles worth a tailored resume; Skip hides it (reversible).
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  var css = document.createElement('style');
  css.textContent =
    '#cc-queue .q{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid #1e2430}' +
    '#cc-queue .q .t{flex:1;min-width:0}' +
    '#cc-queue .q .a{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;flex:none;max-width:260px}' +
    '#cc-queue .q.opened{background:rgba(56,217,169,.05)}' +
    '#cc-queue .chip{font-size:10px;font-weight:700;padding:1px 7px;border-radius:9px;border:1px solid #2a3244;margin-left:4px}' +
    '#cc-queue .w{font-size:11px;color:#9aa6b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#cc-queue .ev{font-size:11px;color:#8fd6b6;margin-top:2px;font-style:italic}' +
    '#cc-queue .ev.no{color:#ff8787}' +
    '#cc-queue .bar{height:6px;background:#232a38;border-radius:4px;overflow:hidden;margin-top:6px}' +
    '#cc-queue .bar i{display:block;height:100%;background:#38d9a9}';
  document.head.appendChild(css);

  var st = { scope: 'all', minFit: 70, limit: 40, unverified: false, data: null, opened: {} };
  var PLACE = { bangalore: '#38d9a9', remote: '#9fd3ff', abroad: '#fbbf24' };
  var refreshToday = function () { if (window.ccRefreshToday) window.ccRefreshToday(); };

  function ago(iso) {
    if (!iso) return '';
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? d + 'd ago' : Math.floor(d / 30) + 'mo ago';
  }

  function row(j) {
    var ev = j.evidence ? '<div class="ev' + (j.visa === 'no' ? ' no' : '') + '" title="From the job description">“' + esc(j.evidence) + '”</div>' : '';
    return '<div class="q' + (st.opened[j.id] ? ' opened' : '') + '" data-q="' + esc(j.id) + '"><div class="t">' +
      '<div><b style="color:#e7ecf3;cursor:pointer;text-decoration:underline dotted" data-detail-name="' + esc(j.company) + '">' + esc(j.company) + '</b>' +
      (j.priority ? '<span class="chip" style="color:#fbbf24;border-color:rgba(251,191,36,.5)">⭐ PRIORITY</span>' : '') +
      '<span class="chip" style="color:' + (PLACE[j.place] || '#c9d4e3') + '">' + esc(j.placeLabel) + '</span>' +
      (j.fit != null ? ' <b style="color:' + (j.fit >= 85 ? '#38d9a9' : '#c9d4e3') + ';font-size:11.5px">fit ' + j.fit + '</b>' : '') +
      (j.hiring ? ' <span class="muted" style="font-size:11px">· hiring ' + j.hiring + '</span>' : '') + '</div>' +
      '<div style="margin-top:2px"><a target="_blank" rel="noopener" data-open-role="' + esc(j.id) + '" style="color:#9fd3ff" href="' + esc(j.url) + '">' + esc(j.title) + '</a>' +
      ' <span class="muted" style="font-size:11px">· ' + esc(j.location || '') + ' · ' + ago(j.posted) + '</span></div>' +
      (j.whyRole ? '<div class="w" title="' + esc(j.whyRole) + '">🎯 ' + esc(j.whyRole) + '</div>' : '') +
      (j.whyNow ? '<div class="w" style="color:#d6b25e" title="' + esc(j.whyNow) + '">📈 ' + esc(j.whyNow) + '</div>' : '') + ev +
      '</div><div class="a">' +
      '<a class="b" target="_blank" rel="noopener" data-open-role="' + esc(j.id) + '" href="' + esc(j.url) + '" style="text-decoration:none">Open ↗</a>' +
      '<button class="b" data-guide="' + esc(j.id) + '" type="button" title="Form questions answered, resume PDF ready, autofill in your browser — you press Submit">🧭 Guided</button>' +
      '<button class="b pri" data-ap="' + esc(j.id) + '" type="button" title="Mark applied — counts toward today">✓ Applied</button>' +
      ((j.fit || 0) >= 85 || j.priority ? '<button class="b" data-tailor="' + esc(j.id) + '" data-co="' + esc(j.company) + '" data-role="' + esc(j.title) + '" data-url="' + esc(j.url) + '" type="button" title="Worth a tailored resume: fit 85+ or a priority company">📄 Tailor</button>' : '') +
      '<button class="b" data-skip="' + esc(j.id) + '" type="button" title="Not for me — hidden (reversible)">Skip</button>' +
      '</div></div>';
  }

  function render(m) {
    var d = st.data;
    var today = d ? d.appliedFromQueue.today : 0;
    var t = d ? d.target : { daily: 20, stretch: 100 };
    var pct = Math.min(100, Math.round(today / (t.stretch || 100) * 100));
    m.innerHTML = '<div class="cd" style="max-width:980px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
      '<div><h3>🚀 Apply queue</h3><div class="muted">Applied from the queue today: <b style="color:#e7ecf3">' + today + '</b> · target ' + t.daily + ', stretch ' + t.stretch +
      (d ? ' · this week ' + d.appliedFromQueue.week : '') + '</div>' +
      '<div class="bar" style="width:260px"><i style="width:' + pct + '%"></i></div></div><button class="b" data-x="1" type="button">✕</button></div>' +
      '<div class="tabs">' + [['all', 'All'], ['bangalore', 'Bangalore'], ['remote', 'Remote'], ['abroad', 'Abroad · visa / relocation']].map(function (s) {
        var n = !d ? '' : s[0] === 'all' ? d.counts.bangalore + d.counts.remote + d.counts.abroad : d.counts[s[0]];
        return '<button class="b' + (st.scope === s[0] ? ' pri' : '') + '" data-scope="' + s[0] + '" type="button">' + s[1] + (n !== '' ? ' (' + n + ')' : '') + '</button>';
      }).join('') +
      '<select data-minfit="1" style="margin-left:6px">' + [60, 70, 80, 85].map(function (f) { return '<option value="' + f + '"' + (st.minFit === f ? ' selected' : '') + '>fit ' + f + '+</option>'; }).join('') + '</select>' +
      '<label class="muted" style="display:flex;align-items:center;gap:4px;margin-left:6px"><input type="checkbox" data-unv="1"' + (st.unverified ? ' checked' : '') + '> abroad, sponsorship not stated' + (d ? ' (' + d.counts.unverifiedAbroad + ')' : '') + '</label>' +
      '</div>' +
      '<div class="muted" style="font-size:11px;margin:4px 0 6px">Open ↗, apply, then ✓ Applied. Tailor appears for fit 85+ and priority companies; the rest go with your master resume. Other Indian cities and region-locked remote are left out.</div>' +
      (!d ? '<div class="muted">Loading…</div>' : d.items.length ? d.items.map(row).join('') +
        (d.total > d.items.length ? '<button class="b" data-more="1" type="button" style="margin-top:10px">Show more (' + (d.total - d.items.length) + ' left)</button>' : '')
        : '<p class="muted">Nothing left at this fit level — lower the fit filter, or use Web search for abroad / visa roles.</p>') + '</div>';
  }

  function load(m) {
    var q = 'scope=' + st.scope + '&minFit=' + st.minFit + '&limit=' + st.limit + (st.unverified ? '&unverified=true' : '');
    return api('/targets/apply-queue?' + q).then(function (d) { st.data = d; render(m); })
      .catch(function (e) { m.innerHTML = '<div class="cd"><div class="cc-bad">' + esc(e.message) + '</div></div>'; });
  }

  /** Tailor: make sure the company is in his list, then open the Studio with the role and its link. */
  window.ccTailor = function (b) {
    b.disabled = true;
    api('/targets/company/add', { method: 'POST', body: { name: b.getAttribute('data-co') } }).then(function (r) {
      if (typeof window.openCompanyStudio === 'function') {
        window.openCompanyStudio(null, r.companyId, b.getAttribute('data-role'), 'resume', null, b.getAttribute('data-url') || '');
      } else {
        window.location.href = '/outreach.html?tab=resume&companyId=' + encodeURIComponent(r.companyId) + '&role=' + encodeURIComponent(b.getAttribute('data-role') || '');
      }
    }).catch(function (err) { b.disabled = false; window.alert(err.message); });
  };

  window.ccApplyQueue = function (scope) {
    if (scope) { st.scope = scope; st.limit = 40; }
    var m = document.getElementById('cc-queue');
    if (!m) {
      m = document.createElement('div');
      m.id = 'cc-queue'; m.className = 'cc-md';
      document.body.appendChild(m);
      m.addEventListener('click', function (e) {
        if (e.target === m) { m.remove(); return; }
        var el = e.target.closest ? e.target : null;
        if (!el) return;
        var b;
        if (el.closest('[data-x]')) { m.remove(); return; }
        if ((b = el.closest('[data-open-role]'))) { st.opened[b.getAttribute('data-open-role')] = true; var r0 = b.closest('.q'); if (r0) r0.classList.add('opened'); return; }
        if ((b = el.closest('[data-scope]'))) { st.scope = b.getAttribute('data-scope'); st.limit = 40; load(m); return; }
        if (el.closest('[data-more]')) { st.limit += 40; load(m); return; }
        if (el.closest('[data-detail-name]')) return;
        if ((b = el.closest('[data-tailor]'))) { window.ccTailor(b); return; }
        if ((b = el.closest('[data-guide]'))) { if (window.ccGuidedApply) window.ccGuidedApply(b.getAttribute('data-guide')); return; }
        if ((b = el.closest('[data-ap]')) || (b = el.closest('[data-skip]'))) {
          var applied = b.hasAttribute('data-ap');
          var id = b.getAttribute(applied ? 'data-ap' : 'data-skip');
          var rowEl = b.closest('.q');
          b.disabled = true;
          api(applied ? '/targets/apply-queue/applied' : '/targets/apply-queue/skip', { method: 'POST', body: { jobId: id } }).then(function (r) {
            st.data.items = st.data.items.filter(function (x) { return x.id !== id; });
            st.data.total -= 1;
            if (applied) st.data.appliedFromQueue.today += 1, st.data.appliedFromQueue.week += 1;
            rowEl.innerHTML = '<div class="muted" style="padding:2px 0">' + (applied ? '✓ Applied — ' + esc(r.company) + ' added to your pipeline' : 'Skipped · <a data-unskip="' + esc(id) + '" style="color:#9fd3ff;cursor:pointer">undo</a>') + '</div>';
            if (applied) { setTimeout(function () { render(m); }, 700); refreshToday(); }
          }).catch(function (err) { b.disabled = false; window.alert(err.message); });
          return;
        }
        if ((b = el.closest('[data-unskip]'))) {
          api('/targets/apply-queue/skip', { method: 'POST', body: { jobId: b.getAttribute('data-unskip'), undo: true } }).then(function () { load(m); });
        }
      });
      m.addEventListener('change', function (e) {
        if (e.target.matches('[data-minfit]')) { st.minFit = Number(e.target.value); st.limit = 40; load(m); }
        if (e.target.matches('[data-unv]')) { st.unverified = e.target.checked; st.limit = 40; load(m); }
      });
      var onKey = function (e) { if (e.key === 'Escape' && document.getElementById('cc-queue')) { m.remove(); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
    }
    st.data = null; render(m); load(m);
  };
})();

/* ────────────────────────────────────────────────────────────────────
 * Guided apply: one role's application form, prepared.
 *
 * The form's real questions (Greenhouse) or the standard set, answered from
 * his profile, his answer bank and one AI draft; what only he can answer is
 * flagged at the top. The Career Copilot extension fills the form in his
 * own browser with these answers and his Studio PDF. He presses Submit.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CC = window.__CC__;
  if (!CC) return;
  var api = CC.api, esc = CC.esc;

  var css = document.createElement('style');
  css.textContent =
    '#cc-guide .qq{padding:8px 0;border-bottom:1px solid #1e2430}' +
    '#cc-guide .qq.need{background:rgba(251,191,36,.06);border-left:3px solid #fbbf24;padding-left:9px}' +
    '#cc-guide .ql{font-size:12px;color:#e7ecf3;margin-bottom:4px}' +
    '#cc-guide .src{font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:8px;border:1px solid #2a3244;margin-left:6px;color:#9aa6b8}' +
    '#cc-guide .src.ai{color:#c4b5fd;border-color:rgba(196,181,253,.5)}#cc-guide .src.you{color:#38d9a9;border-color:rgba(56,217,169,.5)}' +
    '#cc-guide .src.default{color:#fbbf24;border-color:rgba(251,191,36,.5)}' +
    '#cc-guide input[type=text],#cc-guide select,#cc-guide textarea{width:100%;box-sizing:border-box;background:#0f131b;border:1px solid #2a3244;border-radius:7px;color:#e7ecf3;padding:6px 9px;font-size:12.5px;font-family:inherit}' +
    '#cc-guide .box{background:#0f131b;border:1px solid #232a38;border-radius:10px;padding:10px 12px;margin-top:10px}' +
    '#cc-guide code{background:#0f131b;border:1px solid #2a3244;border-radius:5px;padding:1px 5px;font-size:11.5px}';
  document.head.appendChild(css);

  var st = { pack: null, dirty: {} };
  var SRC = { profile: 'profile', bank: 'saved answer', default: 'default — check', ai: 'AI draft — read it', you: 'yours', file: 'Studio PDF' };

  function control(q) {
    var v = q.answer.value || '';
    var name = 'data-q="' + esc(q.id) + '"';
    if (q.type === 'input_file') return '<div class="muted">📄 ' + esc(v || 'Your Studio PDF') + '</div>';
    if (q.options && q.options.length && q.options.length <= 60) {
      return '<select ' + name + '><option value="">— pick —</option>' + q.options.map(function (o) {
        return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
    }
    if (q.options && q.options.length > 60) return '<input type="text" ' + name + ' value="' + esc(v) + '" placeholder="Type to match one of ' + q.options.length + ' options (e.g. India)">';
    if (q.type === 'textarea' || String(v).length > 90 || q.answer.category === 'why_company') return '<textarea rows="4" ' + name + '>' + esc(v) + '</textarea>';
    return '<input type="text" ' + name + ' value="' + esc(v) + '">';
  }

  function qrow(q) {
    var a = q.answer;
    return '<div class="qq' + (a.needsYou ? ' need' : '') + '"><div class="ql">' + esc(q.label) + (q.required ? ' <span style="color:#ff8787">*</span>' : '') +
      (a.source ? '<span class="src ' + esc(a.source) + '">' + esc(SRC[a.source] || a.source) + '</span>' : '') +
      (a.note ? ' <span class="muted" style="font-size:11px">· ' + esc(a.note) + '</span>' : '') + '</div>' + control(q) + '</div>';
  }

  function render(m) {
    var p = st.pack;
    if (!p) { m.innerHTML = '<div class="cd"><div class="muted">Reading the application form and preparing answers…</div></div>'; return; }
    var need = p.questions.filter(function (q) { return q.answer.needsYou; });
    var rest = p.questions.filter(function (q) { return !q.answer.needsYou; });
    var r = p.resume;
    var resumeLine = r.ready
      ? '✅ <b>' + esc(r.label) + '</b> <span class="muted">(' + esc(r.filename || '') + ')</span> — attached by the autofill' +
        (r.tailoredNotExported ? ' · <a style="color:#9fd3ff" href="/outreach.html?tab=resume&pdf=' + encodeURIComponent(r.tailoredNotExported) + '">export the tailored one instead</a>' : '')
      : '⚠️ No Studio PDF yet — <a style="color:#9fd3ff" href="/outreach.html?tab=resume&pdf=' + encodeURIComponent(r.tailoredNotExported || 'master') + '">export it once in the Resume Studio</a>';
    m.innerHTML = '<div class="cd" style="max-width:860px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
      '<div><h3>🧭 Guided apply</h3><div class="muted"><b style="color:#e7ecf3">' + esc(p.company) + '</b> · ' + esc(p.title) + ' · ' +
      (p.source === 'greenhouse' ? 'the form’s real questions' : 'standard questions (this site doesn’t publish its form)') + '</div></div>' +
      '<button class="b" data-x="1" type="button">✕</button></div>' +
      '<div class="box">' + resumeLine + '</div>' +
      (need.length ? '<h4 style="margin:14px 0 4px;font-size:12px;color:#fbbf24">NEEDS YOU (' + need.length + ')</h4>' + need.map(qrow).join('') : '<div class="muted" style="margin-top:10px">✓ Nothing needs you — every question has an answer.</div>') +
      '<h4 style="margin:14px 0 4px;font-size:12px;color:#9aa6b8">PREPARED (' + rest.length + ')</h4>' + rest.map(qrow).join('') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center">' +
      '<button class="b pri" data-save="1" type="button">Save answers</button>' +
      '<a class="b" target="_blank" rel="noopener" href="' + esc(p.applyUrl) + '" style="text-decoration:none">Open application ↗</a>' +
      '<button class="b pri" data-applied="1" type="button" title="After you pressed Submit">✓ I submitted it</button>' +
      '<button class="b" data-rebuild="1" type="button" title="Re-read the form and redraft (keeps your own answers)">↻ Rebuild</button>' +
      '<span class="muted" id="cc-guide-status"></span></div>' +
      '<div class="box"><b>How it fills</b><div class="muted" style="margin-top:4px">Open the application, click <b>⚡ Fill with Career Copilot</b> (bottom-left of the form), check the highlighted fields, tick the consent boxes yourself, and press Submit. The extension never submits.</div>' +
      '<details style="margin-top:6px"><summary style="cursor:pointer;color:#9fd3ff">Autofill setup (once)</summary><div class="muted" style="margin-top:6px;line-height:1.6">' +
      '1. In Chrome open <code>chrome://extensions</code>, turn on <b>Developer mode</b>, click <b>Load unpacked</b> and pick the <code>extension</code> folder in your career-copilot repo.<br>' +
      '2. <button class="b" data-key="1" type="button">Create autofill key</button> <span id="cc-guide-key"></span><br>' +
      '3. Click the extension’s icon, paste the key, Save. The key can only read your prepared answers and resume PDF; creating a new key retires the old one.</div></details></div></div>';
  }

  function load(m, jobId, rebuild) {
    st.pack = null; st.dirty = {}; render(m);
    return api('/targets/apply-pack', { method: 'POST', body: { jobId: jobId, rebuild: !!rebuild } })
      .then(function (p) { st.pack = p; render(m); })
      .catch(function (e) { m.innerHTML = '<div class="cd"><div class="cc-bad">' + esc(e.message) + '</div><button class="b" data-x="1" type="button">Close</button></div>'; });
  }

  window.ccGuidedApply = function (jobId) {
    var m = document.getElementById('cc-guide');
    if (!m) {
      m = document.createElement('div');
      m.id = 'cc-guide'; m.className = 'cc-md';
      document.body.appendChild(m);
      var status = function (t, bad) { var e = document.getElementById('cc-guide-status'); if (e) { e.textContent = t; e.style.color = bad ? '#ff8787' : ''; } };
      m.addEventListener('input', function (e) { var q = e.target.getAttribute && e.target.getAttribute('data-q'); if (q) st.dirty[q] = e.target.value; });
      m.addEventListener('change', function (e) { var q = e.target.getAttribute && e.target.getAttribute('data-q'); if (q) st.dirty[q] = e.target.value; });
      m.addEventListener('click', function (e) {
        if (e.target === m) { m.remove(); return; }
        var el = e.target.closest ? e.target : null;
        if (!el) return;
        var b;
        if (el.closest('[data-x]')) { m.remove(); return; }
        if ((b = el.closest('[data-save]'))) {
          if (!Object.keys(st.dirty).length) { status('Nothing changed'); return; }
          b.disabled = true; status('Saving…');
          api('/targets/apply-pack', { method: 'PUT', body: { jobId: st.pack.jobId, answers: st.dirty } }).then(function (p) {
            st.pack = p; st.dirty = {}; render(m);
            status('Saved' + (p.banked ? ' · ' + p.banked + ' kept for future applications' : ''));
          }).catch(function (err) { b.disabled = false; status(err.message, true); });
          return;
        }
        if (el.closest('[data-rebuild]')) { load(m, st.pack.jobId, true); return; }
        if ((b = el.closest('[data-applied]'))) {
          b.disabled = true;
          api('/targets/apply-queue/applied', { method: 'POST', body: { jobId: st.pack.jobId } }).then(function () {
            status('✓ Marked applied'); if (window.ccRefreshToday) window.ccRefreshToday();
          }).catch(function (err) { b.disabled = false; status(err.message, true); });
          return;
        }
        if ((b = el.closest('[data-key]'))) {
          b.disabled = true;
          api('/targets/autofill-key', { method: 'POST', body: {} }).then(function (r) {
            document.getElementById('cc-guide-key').innerHTML = '<code style="user-select:all">' + esc(r.key) + '</code> <button class="b" data-copykey="' + esc(r.key) + '" type="button">Copy</button> <span style="color:#fbbf24">shown once</span>';
          }).catch(function (err) { b.disabled = false; window.alert(err.message); });
          return;
        }
        if ((b = el.closest('[data-copykey]'))) {
          navigator.clipboard.writeText(b.getAttribute('data-copykey')).then(function () { b.textContent = '✓ Copied'; });
        }
      });
      var onKey = function (e) { if (e.key === 'Escape' && document.getElementById('cc-guide')) { m.remove(); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
    }
    load(m, jobId, false);
  };
})();
