/**
 * Career Copilot bridge.
 *
 * The two files in /artifacts are self-contained prototypes that keep all their
 * state in two localStorage blobs (`sr_tracked`, `sr_custom`). Rather than
 * rewrite them, this bridge:
 *
 *   1. gates the page behind the single-user login,
 *   2. hydrates those two keys from GET /api/state BEFORE the app script runs,
 *   3. mirrors every localStorage write back to the server (debounced),
 *   4. adds an AI drawer for research / outreach / WIN doc / resume tailoring.
 *
 * The build step (scripts/build-web.js) retags the prototype's inline <script>
 * as type="text/cc-app" so it does not execute until state is loaded.
 */
(function () {
  'use strict';

  var API = (window.CC_API_BASE || '/api').replace(/\/$/, '');
  var TOKEN_KEY = 'cc_token';
  var SYNC_KEYS = ['sr_tracked', 'sr_custom'];

  var token = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch (e) { token = null; }

  // ── HTTP ────────────────────────────────────────────────────────────
  function api(path, options) {
    options = options || {};
    // Only declare a JSON body when there is one — Fastify rejects an empty
    // body sent with application/json.
    var headers = {};
    if (options.body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;

    return fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      if (res.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
        location.reload();
        throw new Error('Session expired');
      }
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.message || data.error || 'Request failed (' + res.status + ')');
        return data;
      });
    });
  }


  /**
   * Run an AI task as a background job and poll for the result.
   *
   * Grounded research takes about two minutes; Cloudflare kills a proxied
   * request at roughly 100 seconds. So nothing heavy is awaited directly —
   * we queue it and poll until it lands.
   */
  function runJob(kind, payload, onTick) {
    return api('/tasks', { method: 'POST', body: Object.assign({ kind: kind }, payload || {}) })
      .then(function (data) {
        var id = data.job.id;
        var started = Date.now();

        return new Promise(function (resolve, reject) {
          var poll = function () {
            api('/tasks/' + id)
              .then(function (res) {
                var job = res.job;
                if (onTick) onTick(Math.round((Date.now() - started) / 1000), job.status, job.steps || []);
                if (job.status === 'done') return resolve(job.result);
                if (job.status === 'error') return reject(new Error(job.error || 'Job failed'));
                setTimeout(poll, 2000);
              })
              .catch(reject);
          };
          setTimeout(poll, 1500);
        });
      });
  }

  // ── Login gate ──────────────────────────────────────────────────────
  function showGate() {
    var gate = document.createElement('div');
    gate.className = 'cc-gate';
    gate.innerHTML =
      '<form>' +
      '<h2>Career Copilot</h2>' +
      '<p>Job search OS — sign in to continue.</p>' +
      '<input type="email" name="email" placeholder="Email" autocomplete="username" required>' +
      '<input type="password" name="password" placeholder="Password" autocomplete="current-password" required>' +
      '<button type="submit">Sign in</button>' +
      '<div class="cc-err"></div>' +
      '</form>';
    document.body.appendChild(gate);

    var form = gate.querySelector('form');
    var err = gate.querySelector('.cc-err');
    var btn = gate.querySelector('button');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Signing in…';

      api('/auth/login', {
        method: 'POST',
        body: { email: form.email.value, password: form.password.value },
      })
        .then(function (data) {
          localStorage.setItem(TOKEN_KEY, data.token);
          location.reload();
        })
        .catch(function (e2) {
          err.textContent = e2.message;
          btn.disabled = false;
          btn.textContent = 'Sign in';
        });
    });
  }

  // ── Sync status pill ────────────────────────────────────────────────
  var pill;
  function setStatus(state, text) {
    if (!pill) return;
    pill.setAttribute('data-state', state);
    pill.querySelector('.cc-text').textContent = text;
  }

  function buildPill() {
    pill = document.createElement('div');
    pill.className = 'cc-pill';
    pill.setAttribute('data-state', 'ok');
    pill.innerHTML = '<span class="cc-dot"></span><span class="cc-text">Synced</span><button type="button">Sign out</button>';
    pill.querySelector('button').addEventListener('click', function () {
      localStorage.removeItem(TOKEN_KEY);
      location.reload();
    });
    document.body.appendChild(pill);
  }

  // ── Server → localStorage hydration ─────────────────────────────────
  function hydrate() {
    // Two fetches in parallel: /state hydrates the two localStorage keys the
    // prototype reads on boot; /companies overrides its hard-coded COS[] so
    // catalogue additions in the DB show up without editing the artifact.
    return Promise.all([
      api('/state'),
      api('/companies').catch(function () { return { companies: [] }; }),
    ]).then(function (results) {
      var state = results[0] || {};
      var companies = (results[1] && results[1].companies) || [];

      localStorage.setItem('sr_tracked', JSON.stringify(state.tracked || {}));
      localStorage.setItem('sr_custom', JSON.stringify(state.custom || []));

      // Map to the shape the prototype's COS entries use. Catalogue rows
      // (custom = false) become the override; user-added customs stay in
      // the sr_custom bucket so the existing "custom company" flow keeps
      // working end-to-end.
      window.__CC_CATALOGUE__ = companies
        .filter(function (c) { return !c.custom; })
        .map(function (c) {
          return {
            id: c.id,
            name: c.name,
            region: c.region || 'global',
            roles: Array.isArray(c.roles) ? c.roles : [],
            pay: c.pay || '',
            desc: c.desc || c.description || '',
            apply: c.apply || c.apply_url || '',
            dismissed: !!c.dismissed,
          };
        });

      window.__CC_DISMISSED__ = new Set(
        companies.filter(function (c) { return c.dismissed; }).map(function (c) { return c.id; }),
      );

      // Favourites, exposed as a Set so the Pipeline filter can lookup in O(1).
      // Lives beside __CC_CATALOGUE__ because the prototype's COS shape has no
      // place for it — this keeps the override data pure to the prototype's
      // schema while still giving augmentation code the extra signal it needs.
      window.__CC_FAVOURITES__ = new Set(
        companies.filter(function (c) { return c.favourite; }).map(function (c) { return c.id; }),
      );
      // Freelance marketplaces (Upwork, Mercor, A.Team, …) — sit in the same
      // catalogue as FTE targets but render / filter differently.
      window.__CC_FREELANCE__ = new Set(
        companies.filter(function (c) { return c.freelance; }).map(function (c) { return c.id; }),
      );
    });
  }

  /**
   * Mirror localStorage writes to the server. The prototypes call
   * localStorage.setItem directly from their save helpers, so patching the
   * method catches every write without touching their code.
   */
  var syncTimer = null;
  var syncing = false;
  var pendingWhileSyncing = false;

  function pushState() {
    if (syncing) { pendingWhileSyncing = true; return; }
    syncing = true;
    setStatus('saving', 'Saving…');

    var tracked = {};
    var custom = [];
    try { tracked = JSON.parse(localStorage.getItem('sr_tracked') || '{}'); } catch (e) {}
    try { custom = JSON.parse(localStorage.getItem('sr_custom') || '[]'); } catch (e) {}

    api('/state', { method: 'PUT', body: { tracked: tracked, custom: custom } })
      .then(function () {
        setStatus('ok', 'Synced');
      })
      .catch(function (e) {
        setStatus('error', 'Not saved — ' + e.message);
      })
      .then(function () {
        syncing = false;
        if (pendingWhileSyncing) { pendingWhileSyncing = false; scheduleSync(); }
      });
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushState, 700);
  }

  function patchStorage() {
    var original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      original(key, value);
      if (SYNC_KEYS.indexOf(key) !== -1) scheduleSync();
    };
  }

  // ── AI drawer ───────────────────────────────────────────────────────
  var companies = [];
  var openCopilot = null;
  var refreshCompaniesFn = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function card(title, body, meta) {
    return (
      '<div class="cc-card">' +
      (meta ? '<div class="cc-meta">' + meta + '</div>' : '') +
      (title ? '<strong>' + esc(title) + '</strong>\n' : '') +
      esc(body) +
      '<br><button class="cc-copy" type="button">Copy</button>' +
      '</div>'
    );
  }

  // ── Universal App Modal System (appConfirm & appAlert) ────────────────
  function showAppDialog(opts) {
    return new Promise(function (resolve) {
      opts = typeof opts === 'string' ? { message: opts } : (opts || {});
      var isAlert = opts.isAlert === true;
      var type = opts.type || (isAlert ? 'info' : 'danger');
      var title = opts.title || (isAlert ? 'Notice' : 'Confirmation');
      var message = opts.message || '';
      var confirmText = opts.confirmText || (isAlert ? 'OK' : (type === 'danger' ? 'Delete' : 'Confirm'));
      var cancelText = opts.cancelText || 'Cancel';

      var iconSvg = type === 'danger' ? '⚠️' : (type === 'warning' ? '⚡' : 'ℹ️');

      var overlay = document.createElement('div');
      overlay.className = 'cc-dialog-overlay';
      overlay.innerHTML =
        '<div class="cc-dialog-card" role="dialog" aria-modal="true">' +
          '<div class="cc-dialog-header">' +
            '<div class="cc-dialog-icon-wrap ' + esc(type) + '">' + iconSvg + '</div>' +
            '<div style="flex:1">' +
              '<h3 class="cc-dialog-title">' + esc(title) + '</h3>' +
              '<div class="cc-dialog-desc">' + esc(message) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cc-dialog-actions">' +
            (isAlert ? '' : '<button type="button" class="cc-dialog-btn cancel">' + esc(cancelText) + '</button>') +
            '<button type="button" class="cc-dialog-btn ' + (type === 'danger' ? 'danger' : 'primary') + '">' + esc(confirmText) + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      // Trigger animation frame
      overlay.offsetWidth;
      overlay.classList.add('cc-dialog-visible');

      var cancelBtn = overlay.querySelector('.cc-dialog-btn.cancel');
      var confirmBtn = overlay.querySelector('.cc-dialog-btn:not(.cancel)');

      if (confirmBtn) confirmBtn.focus();

      var closed = false;
      function cleanup(result) {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKeyDown);
        overlay.classList.remove('cc-dialog-visible');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
        resolve(result);
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanup(true);
        }
      }

      document.addEventListener('keydown', onKeyDown);

      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () { cleanup(false); });
      }
      if (confirmBtn) {
        confirmBtn.addEventListener('click', function () { cleanup(true); });
      }
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cleanup(false);
      });
    });
  }

  window.appConfirm = function (opts) {
    return showAppDialog(Object.assign({}, typeof opts === 'string' ? { message: opts } : opts, { isAlert: false }));
  };
  window.appAlert = function (opts) {
    return showAppDialog(Object.assign({}, typeof opts === 'string' ? { message: opts } : opts, { isAlert: true }));
  };

  // ── JD Text Cleaner & Entity Decoder ────────────────────────────────
  function cleanJdText(raw) {
    if (!raw || typeof raw !== 'string') return '';
    var text = raw;
    for (var i = 0; i < 2; i++) {
      if (!/&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/.test(text)) break;
      text = text
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, function (_, dec) { return String.fromCharCode(dec); })
        .replace(/&#x([0-9a-fA-F]+);/g, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); });
    }
    text = text
      .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    return text
      .split('\n')
      .map(function (l) { return l.trim(); })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  window.cleanJdText = cleanJdText;

  // ── Navigate to Tailor Resume Flow ──────────────────────────────────
  function navigateToTailorResume(companyId, roleTitle, directJd) {
    var companyName = '';
    var co = null;
    if (window.__CC_CATALOGUE__) {
      co = window.__CC_CATALOGUE__.find(function (x) { return x.id === companyId; });
    }
    if (!co && typeof COS !== 'undefined' && Array.isArray(COS)) {
      co = COS.find(function (x) { return x.id === companyId; });
    }
    companyName = (co && co.name) || companyId || '';

    var role = roleTitle || (co && (co.roleTitle || (Array.isArray(co.roles) ? co.roles[0] : ''))) || '';
    var jd = directJd || '';

    try {
      var tr = (typeof tracked !== 'undefined' && tracked && tracked[companyId]) || {};
      if (!role && tr.roleTitle) role = tr.roleTitle;
      if (!jd && (tr.jdText || tr.jd)) {
        jd = tr.jdText || tr.jd;
      }
    } catch (e) {}

    var cleanJd = cleanJdText(jd);

    // If already on outreach page, just switch tab and prefill
    if (window.location.pathname.indexOf('outreach') !== -1 && typeof window.showTab === 'function') {
      window.showTab('resume');
      var compInput = document.getElementById('tailorCompany');
      var rInput = document.getElementById('tailorRole');
      var jdArea = document.getElementById('tailorJD');
      if (compInput && companyName) compInput.value = companyName;
      if (rInput && role) rInput.value = role;
      if (jdArea && cleanJd) {
        jdArea.value = cleanJd;
        if (typeof window.updateJdCount === 'function') window.updateJdCount();
      } else if (jdArea && !jdArea.value && companyId) {
        api('/companies/' + encodeURIComponent(companyId) + '/autofill')
          .then(function (d) {
            var fetchedJd = d && d.suggested && d.suggested.jdText;
            if (fetchedJd && !jdArea.value) {
              jdArea.value = cleanJdText(fetchedJd);
              if (typeof window.updateJdCount === 'function') window.updateJdCount();
            }
          }).catch(function () {});
      }
      var card = document.getElementById('resumeTargetCard');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var drawer = document.querySelector('.cc-drawer');
      if (drawer) drawer.classList.remove('cc-open');
      return;
    }

    var prefillData = {
      companyId: companyId || '',
      companyName: companyName || '',
      role: role || '',
      jdText: cleanJd || ''
    };

    try {
      sessionStorage.setItem('cc_tailor_prefill', JSON.stringify(prefillData));
    } catch (e) {}

    var targetUrl = '/outreach.html?tab=resume' +
      (companyName ? '&company=' + encodeURIComponent(companyName) : '') +
      (role ? '&role=' + encodeURIComponent(role) : '') +
      (companyId ? '&companyId=' + encodeURIComponent(companyId) : '');

    // If no JD text yet but we have companyId, attempt a quick autofill fetch before redirecting
    if (!cleanJd && companyId) {
      var redirected = false;
      var timer = setTimeout(function () {
        if (!redirected) {
          redirected = true;
          window.location.href = targetUrl;
        }
      }, 350);

      api('/companies/' + encodeURIComponent(companyId) + '/autofill')
        .then(function (d) {
          if (!redirected) {
            clearTimeout(timer);
            redirected = true;
            var fetchedJd = d && d.suggested && d.suggested.jdText;
            if (fetchedJd) {
              prefillData.jdText = cleanJdText(fetchedJd);
              try { sessionStorage.setItem('cc_tailor_prefill', JSON.stringify(prefillData)); } catch (e) {}
            }
            window.location.href = targetUrl;
          }
        })
        .catch(function () {
          if (!redirected) {
            clearTimeout(timer);
            redirected = true;
            window.location.href = targetUrl;
          }
        });
      return;
    }

    window.location.href = targetUrl;
  }
  window.navigateToTailorResume = navigateToTailorResume;

  // ── WIN doc slide viewer ────────────────────────────────────────────
  /**
   * Render a slide from the WIN doc's `slides[]` array. Each `kind` has its
   * own layout, but they share the same wrapper so the deck's rhythm is
   * consistent — header at the top, body in the middle, footer with a
   * page indicator at the bottom.
   */
  function renderSlide(s, idx, total) {
    var kind = (s && s.kind) || 'generic';
    var body = '';
    if (kind === 'cover') {
      body =
        '<div class="cc-slide-cover">' +
        '<div class="cc-brand-mark"><img class="cc-brand-logo" alt="" onerror="this.style.display=\'none\'"></div>' +
        '<h1>' + esc(s.title || 'WIN Document') + '</h1>' +
        (s.subtitle ? '<p class="cc-sub">' + esc(s.subtitle) + '</p>' : '') +
        '<div class="cc-slide-rule"></div>' +
        (s.footer ? '<p class="cc-foot">' + esc(s.footer) + '</p>' : '') +
        '</div>';
    } else if (kind === 'plan') {
      var cols = (s.columns || []).map(function (col) {
        return '<div class="cc-plan-col">' +
          '<h3>' + esc(col.heading || '') + '</h3>' +
          '<p>' + esc(col.body || '') + '</p>' +
          '</div>';
      }).join('');
      body =
        '<h2>' + esc(s.title || 'First 90 days') + '</h2>' +
        '<div class="cc-slide-rule"></div>' +
        '<div class="cc-plan-grid">' + cols + '</div>';
    } else {
      var status = s.status
        ? '<span class="cc-status cc-status-' +
          (String(s.status).toUpperCase() === 'CONFIRMED' ? 'confirmed' : 'hypothesis') +
          '">' + esc(String(s.status).toUpperCase()) + '</span>'
        : '';
      var label = kind === 'solution'
        ? '<span class="cc-slide-label">SOLUTION</span>'
        : '';
      var bullets = (s.bullets || []).filter(Boolean).map(function (b) {
        return '<li>' + esc(b) + '</li>';
      }).join('');
      body =
        '<div class="cc-slide-head">' +
        '<h2>' + esc(s.title || '') + '</h2>' + status +
        '</div>' +
        '<div class="cc-slide-rule"></div>' +
        label +
        (s.body ? '<p class="cc-slide-body">' + esc(s.body) + '</p>' : '') +
        (bullets ? '<ul class="cc-slide-bullets">' + bullets + '</ul>' : '');
    }

    return (
      '<div class="cc-slide cc-slide-' + esc(kind) + '" data-idx="' + idx + '">' +
      body +
      '<div class="cc-slide-num">' + (idx + 1) + ' / ' + total + '</div>' +
      '</div>'
    );
  }

  /**
   * Full deck viewer — status header, action row (Present / Download / View
   * markdown), the slide carousel with prev/next controls, and a filmstrip
   * of thumbnails so you can jump directly to a slide.
   *
   * All slide styling is driven by CSS variables on `.cc-deck`, so a later
   * applyBrand() call re-themes the whole viewer without re-rendering.
   */
  function renderWinDeck(cfg) {
    var container = cfg.container;
    var w = cfg.winDoc || {};
    var slides = cfg.slides || [];
    var winDocId = cfg.winDocId;
    var companyName = cfg.companyName || '';

    // If the model returned nothing usable, fall back to the old markdown view
    // so we never leave the user with a blank drawer.
    if (!slides.length) {
      container.innerHTML =
        '<div class="cc-warn">This WIN doc has no structured slides — falling back to markdown.</div>' +
        (w.sendMessage ? '<h4>Message to send with it</h4>' + card('', w.sendMessage) : '') +
        '<h4>WIN document</h4>' + card('', w.markdown || '');
      return;
    }

    var header = '<div class="cc-ok">Saved. Stage moved to <strong>WIN</strong>.</div>';
    if (w.grounded) {
      header += '<div class="cc-ok">Public evidence grounded in a live search — ' +
        ((w.sources || []).length) + ' sources.</div>';
    } else {
      header += '<div class="cc-warn">Live search was unavailable — the doc rests only on what your contact told you.</div>';
    }
    if (w.sendMessage) header += '<h4>Message to send with it</h4>' + card('', w.sendMessage);

    var slidesHtml = slides.map(function (s, i) { return renderSlide(s, i, slides.length); }).join('');
    var thumbs = slides.map(function (s, i) {
      var label = s.kind === 'cover' ? 'Cover'
        : (s.title || s.kind || ('Slide ' + (i + 1))).slice(0, 22);
      return '<button class="cc-thumb" type="button" data-idx="' + i + '">' +
        '<span class="cc-thumb-n">' + (i + 1) + '</span>' +
        '<span class="cc-thumb-t">' + esc(label) + '</span></button>';
    }).join('');

    container.innerHTML =
      header +
      '<div class="cc-deck" data-company="' + esc(companyName) + '">' +
      '<div class="cc-deck-actions">' +
      '<button class="cc-primary cc-deck-present" type="button">▶ Present</button>' +
      (winDocId ? '<button class="cc-deck-pptx" type="button">⬇ Download .pptx</button>' : '') +
      '<button class="cc-deck-md" type="button">View markdown</button>' +
      '</div>' +
      '<div class="cc-deck-stage">' +
      '<button class="cc-deck-nav cc-deck-prev" type="button" aria-label="Previous">‹</button>' +
      '<div class="cc-deck-track">' + slidesHtml + '</div>' +
      '<button class="cc-deck-nav cc-deck-next" type="button" aria-label="Next">›</button>' +
      '</div>' +
      '<div class="cc-deck-strip">' + thumbs + '</div>' +
      '</div>' +
      '<div class="cc-deck-md-out"></div>';

    var deck = container.querySelector('.cc-deck');
    var track = deck.querySelector('.cc-deck-track');
    var thumbBar = deck.querySelector('.cc-deck-strip');
    var current = 0;
    var count = slides.length;

    function goTo(i) {
      current = Math.max(0, Math.min(count - 1, i));
      track.style.transform = 'translateX(' + (-current * 100) + '%)';
      var buttons = thumbBar.querySelectorAll('.cc-thumb');
      for (var j = 0; j < buttons.length; j += 1) {
        buttons[j].classList.toggle('is-active', j === current);
      }
    }

    deck.querySelector('.cc-deck-prev').addEventListener('click', function () { goTo(current - 1); });
    deck.querySelector('.cc-deck-next').addEventListener('click', function () { goTo(current + 1); });
    thumbBar.querySelectorAll('.cc-thumb').forEach(function (b) {
      b.addEventListener('click', function () { goTo(parseInt(b.dataset.idx, 10) || 0); });
    });

    // Present mode — clones the deck into a fullscreen overlay so the user can
    // walk through it as an actual presentation. Escape and click-out close.
    deck.querySelector('.cc-deck-present').addEventListener('click', function () {
      openPresent(slides, companyName);
    });

    var mdBtn = deck.querySelector('.cc-deck-md');
    var mdOut = container.querySelector('.cc-deck-md-out');
    mdBtn.addEventListener('click', function () {
      if (mdOut.innerHTML) { mdOut.innerHTML = ''; mdBtn.textContent = 'View markdown'; return; }
      mdOut.innerHTML = '<h4>WIN document (markdown)</h4>' + card('', w.markdown || '');
      mdBtn.textContent = 'Hide markdown';
    });

    var pptxBtn = deck.querySelector('.cc-deck-pptx');
    if (pptxBtn) {
      pptxBtn.addEventListener('click', function () {
        pptxBtn.disabled = true;
        var original = pptxBtn.textContent;
        pptxBtn.textContent = 'Building…';
        downloadWinDocPptx(winDocId, companyName)
          .catch(function (err) {
            alert('Could not download .pptx: ' + err.message);
          })
          .then(function () {
            pptxBtn.disabled = false;
            pptxBtn.textContent = original;
          });
      });
    }

    goTo(0);

    // Keep Present hotkeys quiet — only bind arrow-key navigation when the
    // deck is the last thing the user interacted with. Otherwise arrow keys in
    // the outreach text areas would jump slides.
    deck.tabIndex = 0;
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(current + 1); }
      if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); goTo(current - 1); }
    });
  }

  /**
   * Swap the deck's CSS variables to the company's brand colors and drop the
   * logo into every cover slide. Safe to call before or after render — reads
   * the current `.cc-deck` and every `.cc-brand-logo`, no state required.
   */
  function applyBrand(brand) {
    if (!brand) return;
    var colors = brand.colors || {};
    var deck = document.querySelector('.cc-deck');
    if (deck) {
      deck.style.setProperty('--cc-brand-primary', colors.primary || '#4a7cff');
      deck.style.setProperty('--cc-brand-accent',  colors.accent  || '#8b5cf6');
      deck.style.setProperty('--cc-brand-bg',      colors.bg      || '#0f131b');
      deck.style.setProperty('--cc-brand-surface', colors.surface || '#151a24');
      deck.style.setProperty('--cc-brand-text',    colors.text    || '#e7ecf3');
      deck.style.setProperty('--cc-brand-muted',   colors.muted   || '#7c8ba3');
    }
    if (brand.logoUrl) {
      var logos = document.querySelectorAll('.cc-brand-logo');
      for (var i = 0; i < logos.length; i += 1) {
        logos[i].src = brand.logoUrl;
        logos[i].style.display = '';
      }
    }
    // Also theme any open Present overlay.
    var present = document.querySelector('.cc-present');
    if (present && deck) {
      present.style.setProperty('--cc-brand-primary', deck.style.getPropertyValue('--cc-brand-primary'));
      present.style.setProperty('--cc-brand-accent',  deck.style.getPropertyValue('--cc-brand-accent'));
      present.style.setProperty('--cc-brand-bg',      deck.style.getPropertyValue('--cc-brand-bg'));
      present.style.setProperty('--cc-brand-surface', deck.style.getPropertyValue('--cc-brand-surface'));
      present.style.setProperty('--cc-brand-text',    deck.style.getPropertyValue('--cc-brand-text'));
      present.style.setProperty('--cc-brand-muted',   deck.style.getPropertyValue('--cc-brand-muted'));
    }
  }

  /**
   * Fullscreen presentation mode. Renders the same slide markup into a
   * modal overlay sized to the viewport, with keyboard + click controls.
   */
  function openPresent(slides, companyName) {
    var overlay = document.createElement('div');
    overlay.className = 'cc-present';
    overlay.innerHTML =
      '<button class="cc-present-close" type="button" aria-label="Close">×</button>' +
      '<div class="cc-present-stage">' +
      slides.map(function (s, i) { return renderSlide(s, i, slides.length); }).join('') +
      '</div>' +
      '<div class="cc-present-controls">' +
      '<button class="cc-present-prev" type="button">‹ Prev</button>' +
      '<span class="cc-present-count"></span>' +
      '<button class="cc-present-next" type="button">Next ›</button>' +
      '</div>';
    document.body.appendChild(overlay);
    if (overlay.requestFullscreen) overlay.requestFullscreen().catch(function () {});
    // Copy brand vars from the drawer's deck so Present renders in the same theme.
    var srcDeck = document.querySelector('.cc-deck');
    if (srcDeck) {
      ['--cc-brand-primary','--cc-brand-accent','--cc-brand-bg','--cc-brand-surface','--cc-brand-text','--cc-brand-muted']
        .forEach(function (v) { overlay.style.setProperty(v, srcDeck.style.getPropertyValue(v)); });
    }
    // Ensure logos inside Present pick up the brand image too.
    var brandLogos = overlay.querySelectorAll('.cc-brand-logo');
    var refLogo = document.querySelector('.cc-deck .cc-brand-logo');
    if (refLogo && refLogo.src) {
      for (var i = 0; i < brandLogos.length; i += 1) {
        brandLogos[i].src = refLogo.src;
        brandLogos[i].style.display = '';
      }
    }

    var stage = overlay.querySelector('.cc-present-stage');
    var count = slides.length;
    var idx = 0;
    var counter = overlay.querySelector('.cc-present-count');

    function go(i) {
      idx = Math.max(0, Math.min(count - 1, i));
      stage.style.transform = 'translateX(' + (-idx * 100) + 'vw)';
      counter.textContent = (idx + 1) + ' / ' + count;
    }
    function close() {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') return close();
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(idx + 1); }
      if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); go(idx - 1); }
    }

    overlay.querySelector('.cc-present-prev').addEventListener('click', function () { go(idx - 1); });
    overlay.querySelector('.cc-present-next').addEventListener('click', function () { go(idx + 1); });
    overlay.querySelector('.cc-present-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);

    go(0);
  }

  /**
   * Pull the .pptx down through fetch so the JWT header attaches — a plain
   * <a href> can't carry Authorization, and the endpoint requires it.
   */
  function downloadWinDocPptx(id, companyName) {
    var headers = {};
    var t = null;
    try { t = localStorage.getItem('cc_token'); } catch (e) {}
    if (t) headers.Authorization = 'Bearer ' + t;

    return fetch((window.CC_API_BASE || '/api').replace(/\/$/, '') + '/win-docs/' + encodeURIComponent(id) + '/pptx', { headers: headers })
      .then(function (res) {
        if (!res.ok) throw new Error('Server returned ' + res.status);
        return res.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var safe = String(companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company';
        a.href = url;
        a.download = 'win-doc-' + safe + '.pptx';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
      });
  }

  function buildDrawer() {
    var fab = document.createElement('button');
    fab.className = 'cc-fab';
    fab.type = 'button';
    fab.textContent = '✨ AI Copilot';
    document.body.appendChild(fab);

    var drawer = document.createElement('div');
    drawer.className = 'cc-drawer';
    drawer.innerHTML =
      '<header><h3>AI Copilot</h3><button class="cc-close" type="button">×</button></header>' +
      '<div class="cc-body">' +
      '<div class="cc-row" style="margin-bottom:6px">' +
      '<select class="cc-company" style="flex:1.2"></select>' +
      '<input type="text" class="cc-role" placeholder="Role (e.g. Forward Deployed Engineer)">' +
      '</div>' +
      '<div class="cc-other-row" style="display:none;margin-bottom:12px">' +
      '<div style="display:flex;gap:6px">' +
      '<input type="text" class="cc-other-company" placeholder="Enter company name (e.g. Anthropic, Datadog)..." style="flex:1">' +
      '<button type="button" class="cc-cancel-other" style="padding:6px 10px;font-size:11px;background:#1b2130;border:1px solid #2a3243;color:#8b96a8;border-radius:8px;cursor:pointer">Cancel</button>' +
      '</div>' +
      '</div>' +
      '<div class="cc-actions">' +
      '<button data-act="research" class="cc-primary" type="button">1. Research</button>' +
      '<button data-act="view-research" type="button">View saved brief</button>' +
      '<button data-act="messages" type="button">2. Outreach messages</button>' +
      '<button data-act="callprep" type="button">3. Call prep</button>' +
      '<button data-act="windoc" type="button">4. WIN doc</button>' +
      '<button data-act="resume" type="button">Tailor resume</button>' +
      '<button data-act="email" type="button">Cold email</button>' +
      '</div>' +
      '<div class="cc-extra"></div>' +
      '<div class="cc-out"><p class="cc-muted">Pick a company or select Other to type one, then start with Research — every other step reads from it.</p></div>' +
      '</div>';
    document.body.appendChild(drawer);

    var out = drawer.querySelector('.cc-out');
    var extra = drawer.querySelector('.cc-extra');
    var select = drawer.querySelector('.cc-company');
    var roleInput = drawer.querySelector('.cc-role');
    var otherRow = drawer.querySelector('.cc-other-row');
    var otherInput = drawer.querySelector('.cc-other-company');
    var cancelOtherBtn = drawer.querySelector('.cc-cancel-other');

    fab.addEventListener('click', function () { drawer.classList.add('cc-open'); });
    drawer.querySelector('.cc-close').addEventListener('click', function () {
      drawer.classList.remove('cc-open');
    });

    drawer.addEventListener('click', function (e) {
      if (!e.target.classList.contains('cc-copy')) return;
      var text = e.target.parentNode.textContent.replace(/Copy$/, '').trim();
      navigator.clipboard.writeText(text).then(function () {
        e.target.textContent = '✓ Copied';
        setTimeout(function () { e.target.textContent = 'Copy'; }, 1800);
      });
    });

    function renderCompanySelect(selectedId) {
      var opts = '';
      if (companies.length) {
        opts += '<optgroup label="Target & Tracked Companies">';
        opts += companies.map(function (c) {
          return '<option value="' + esc(c.id) + '">' + esc(c.name) +
            (c.research ? ' ✓' : '') + '</option>';
        }).join('');
        opts += '</optgroup>';
      }
      opts += '<optgroup label="Custom / Applied Somewhere Else">';
      opts += '<option value="__other__">✏️ Other / Type Company Name…</option>';
      opts += '</optgroup>';
      select.innerHTML = opts;
      if (selectedId) {
        select.value = selectedId;
        if (select.value === selectedId) {
          otherRow.style.display = 'none';
        }
      }
    }

    function refreshCompanies(selectedId) {
      return api('/companies')
        .then(function (data) {
          companies = data.companies || [];
          renderCompanySelect(selectedId || select.value);
        });
    }
    refreshCompaniesFn = refreshCompanies;

    refreshCompanies().catch(function () {
      select.innerHTML = '<option value="">Could not load companies</option><option value="__other__">✏️ Other / Type Company Name…</option>';
    });

    select.addEventListener('change', function () {
      if (select.value === '__other__') {
        otherRow.style.display = 'block';
        otherInput.value = '';
        otherInput.focus();
      } else {
        otherRow.style.display = 'none';
      }
    });

    cancelOtherBtn.addEventListener('click', function () {
      otherRow.style.display = 'none';
      otherInput.value = '';
      if (companies.length) select.value = companies[0].id;
      else select.value = '';
    });

    function busy(label) {
      out.innerHTML = '<p class="cc-muted"><span class="cc-spin">◐</span> ' + esc(label) + '…</p>' +
        '<p class="cc-muted cc-tick"></p>' +
        '<div class="cc-card cc-steps" style="max-height:46vh;overflow-y:auto"></div>';
    }

    /**
     * Live trace. A grounded research run takes two minutes and does real
     * work — several web searches, then a synthesis pass. Showing each step,
     * with the sources it actually read, makes that auditable rather than
     * asking you to trust a spinner.
     */
    function tick(label) {
      return function (seconds, status, steps) {
        var el = out.querySelector('.cc-tick');
        if (el) el.textContent = status + ' — ' + seconds + 's elapsed';

        var log = out.querySelector('.cc-steps');
        if (!log || !steps || !steps.length) return;

        log.innerHTML = steps.map(function (s) {
          var icon = s.status === 'ok' || s.status === 'done' ? '✓'
            : s.status === 'failed' ? '✕'
            : s.status === 'cached' ? '⟳' : '▸';
          var colour = s.status === 'failed' ? '#ff9b9b'
            : (s.status === 'ok' || s.status === 'done') ? '#7ee0a8' : '#7c8ba3';

          var html = '<div style="padding:5px 0;border-bottom:1px solid #1b212e">' +
            '<span style="color:' + colour + ';font-weight:700">' + icon + '</span> ' +
            '<span style="font-size:12px">' + esc(s.message || '') + '</span>';

          if (s.detail) {
            html += '<div class="cc-muted" style="font-size:10px;margin:3px 0 0 14px">' +
              s.detail.map(function (d) { return '• ' + esc(String(d.query).slice(0, 130)) + '…'; }).join('<br>') +
              '</div>';
          }
          if (s.sources && s.sources.length) {
            html += '<div style="font-size:10px;margin:3px 0 0 14px">' +
              s.sources.slice(0, 5).map(function (x) {
                return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" style="color:#5b86ff">' +
                  esc((x.title || x.url).slice(0, 72)) + '</a>' +
                  (x.date ? ' <span class="cc-muted">(' + esc(x.date) + ')</span>' : '');
              }).join('<br>') + '</div>';
          }
          return html + '</div>';
        }).join('');
      };
    }

    function job(kind, payload, label) {
      busy(label);
      return runJob(kind, payload, tick(label));
    }
    function fail(e) {
      out.innerHTML = '<div class="cc-bad"><strong>Failed.</strong><br>' + esc(e.message) + '</div>';
    }
    function selected() {
      if (select.value === '__other__') {
        var customName = (otherInput.value || '').trim();
        if (!customName) {
          throw new Error('Please type a company name first.');
        }
        var match = companies.find(function (c) {
          return (c.name || '').toLowerCase() === customName.toLowerCase();
        });
        if (match) {
          return { id: match.id, name: match.name, isCustom: false };
        }
        return { id: null, name: customName, isCustom: true };
      }
      var opt = select.options[select.selectedIndex];
      return { id: select.value, name: opt ? opt.text.replace(/ ✓$/, '') : '', isCustom: false };
    }

    function ensureSelectedCompany() {
      var c;
      try {
        c = selected();
      } catch (err) {
        return Promise.reject(err);
      }
      if (!c.name) return Promise.reject(new Error('Please select or type a company name first.'));
      if (c.id && !c.isCustom) return Promise.resolve(c);

      var role = (roleInput.value || '').trim();
      busy('Adding ' + c.name + ' to your companies & pipeline');
      return api('/companies', {
        method: 'POST',
        body: {
          name: c.name,
          roleTitle: role || 'Full-Stack',
          roles: ['fs'],
          region: 'global',
          stage: 'applied'
        }
      }).then(function (res) {
        var created = res.company;
        c.id = created.id;
        c.name = created.name;
        c.isCustom = false;

        var existing = companies.find(function (x) { return x.id === created.id; });
        if (!existing) companies.unshift(created);

        renderCompanySelect(created.id);
        otherRow.style.display = 'none';

        if (typeof window.addCompanyFromExternal === 'function') {
          window.addCompanyFromExternal(created, 'applied');
        }

        return c;
      });
    }

    /**
     * One renderer for the brief, used both by a fresh run and by viewing the
     * saved one — so the two can never drift apart.
     */
    function renderResearch(r, evidence, traceEl) {
      var traceHtml = traceEl ? traceEl.innerHTML : '';
            var r = data.research;
            var html = '';

            if (r.grounded) {
              html += '<div class="cc-ok">Grounded in a live web search' +
                (r.searchedAt ? ' on ' + new Date(r.searchedAt).toLocaleString() : '') +
                ' — ' + ((r.sources || []).length) + ' sources. Every claim below links to one.</div>';
            } else {
              html += '<div class="cc-warn"><strong>Not grounded — from model memory.</strong> ' +
                'Verify any dates or news before using them.</div>';
            }

            html += '<h4>Curiosity hook</h4>' + card('', r.hookSentence || '');

            html += '<h4>Challenges <span class="cc-muted">(by business impact)</span></h4>';
            (r.challenges || []).forEach(function (ch, i) {
              var body =
                'Evidence: ' + (ch.evidence || '') +
                '\n\nWhy it matters to this role: ' + (ch.whyItMattersToRole || '—') +
                '\n\nRoot cause: ' + (ch.rootCause || '—') +
                '\n\nSolution: ' + (ch.solution || '—') +
                ((ch.actionsAndKpis || []).length
                  ? '\n\nActions / KPIs:\n' + ch.actionsAndKpis.map(function (a) { return '• ' + a; }).join('\n')
                  : '') +
                '\n\nProof story: ' + (ch.proofStory || '—');

              var meta = '<span>' + esc(ch.evidenceType || 'unknown') + '</span>' +
                '<span>impact: ' + esc(ch.businessImpact || '—') + '</span>' +
                (ch.sourceDate ? '<span>' + esc(ch.sourceDate) + '</span>' : '') +
                (ch.sourceUrl ? '<a href="' + esc(ch.sourceUrl) + '" target="_blank" rel="noopener" style="color:#5b86ff">source</a>' : '');

              html += card('Challenge ' + (i + 1) + ' — ' + (ch.challenge || ''), body, meta);
            });

            html += '<h4>First DM</h4>' + card('', r.firstDM || '');

            if (r.interviewSignal) {
              var sig = r.interviewSignal;
              html += '<h4>Interview process signal</h4>' +
                '<div class="' + (sig.style === 'algorithmic' ? 'cc-bad' : 'cc-card') + '">' +
                '<strong>' + esc(sig.style || 'unknown') + '</strong><br>' + esc(sig.evidence || '') +
                (sig.sourceUrl ? '<br><a href="' + esc(sig.sourceUrl) + '" target="_blank" rel="noopener" style="color:#5b86ff">source</a>' : '') +
                '</div>';
            }

            if ((r.recentNews || []).length) {
              html += '<h4>Recent news</h4>';
              r.recentNews.forEach(function (n) {
                if (typeof n === 'string') { html += card('', n); return; }
                html += card('', n.item || '',
                  (n.date ? '<span>' + esc(n.date) + '</span>' : '') +
                  (n.sourceUrl ? '<a href="' + esc(n.sourceUrl) + '" target="_blank" rel="noopener" style="color:#5b86ff">source</a>' : ''));
              });
            }

            if ((r.gaps || []).length) {
              html += '<h4>Could not establish</h4><div class="cc-warn">' +
                r.gaps.map(function (g) { return '• ' + esc(g); }).join('<br>') + '</div>';
            }

            var trace = out.querySelector('.cc-steps');
            var traceHtml = trace ? trace.innerHTML : '';

            if ((r.sources || []).length) {
              html += '<h4>Sources searched</h4><div class="cc-card">' +
                r.sources.slice(0, 25).map(function (s) {
                  return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" style="color:#5b86ff">' +
                    esc(s.title || s.url) + '</a>' + (s.date ? ' <span class="cc-muted">(' + esc(s.date) + ')</span>' : '');
                }).join('<br>') + '</div>';
            }

            if (traceHtml) {
              html += '<h4>What the agent did</h4>' +
                '<div class="cc-card" style="max-height:40vh;overflow-y:auto">' + traceHtml + '</div>';
            }

      if (evidence && evidence.length) {
        html += '<h4>Evidence it was built from</h4>';
        (evidence[0].findings || []).forEach(function (f) {
          html += '<div class="cc-card"><div class="cc-meta">' + esc(f.key || '') + '</div>' +
            esc(String(f.content || '').slice(0, 900)) + '</div>';
        });
      }
      out.innerHTML = html;
    }

    var ACTIONS = {
      /** Show the brief already on file, without paying for a new search. */
      'view-research': function () {
        try {
          var c = selected();
          if (c.isCustom && !c.id) {
            out.innerHTML = '<div class="cc-warn">No brief saved for <strong>' + esc(c.name) + '</strong> yet.<br><br>Click <strong>1. Research</strong> to run live web research.</div>';
            return;
          }
          extra.innerHTML = '';
          out.innerHTML = '<p class="cc-muted">Loading the saved brief…</p>';
          api('/companies/' + encodeURIComponent(c.id) + '/research')
            .then(function (d) {
              renderResearch(d.research, d.evidence);
            })
            .catch(function (err) {
              out.innerHTML = '<div class="cc-warn">' + esc(err.message) +
                '<br><br>Run <strong>1. Research</strong> to build one.</div>';
            });
        } catch (err) {
          fail(err);
        }
      },

      research: function () {
        extra.innerHTML = '';
        ensureSelectedCompany()
          .then(function (c) {
            return job('research', { companyId: c.id, roleName: roleInput.value, force: true },
                'Searching the live web for ' + c.name + ', then building the brief')
              .then(function (data) { renderResearch(data.research, null, out.querySelector('.cc-steps')); });
          })
          .catch(fail);
      },

      messages: function () {
        extra.innerHTML = '';
        ensureSelectedCompany()
          .then(function (c) {
            return job('generate-messages', { companyId: c.id, roleName: roleInput.value },
                'Writing outreach for ' + c.name)
              .then(function (data) {
                var m = data.messages;
                var over = m.connectionNoteOverLimit;
                var html = '';
                html += '<h4>Connection request</h4>' +
                  card('', m.connectionNote || '',
                    '<span' + (over ? ' style="color:#ff6b6b"' : '') + '>' +
                    m.connectionNoteChars + ' / 300 chars' + (over ? ' — TOO LONG' : '') + '</span>');
                html += '<h4>First DM</h4>' + card('', m.firstDM || '');
                html += '<h4>Peer / referral DM</h4>' + card('', m.peerDM || '');
                html += '<h4>Follow-up (day 4)</h4>' + card('', m.followUp || '');
                if (m.rationale) html += '<p class="cc-muted">Angle: ' + esc(m.rationale) + '</p>';
                out.innerHTML = html;
              });
          })
          .catch(fail);
      },

      callprep: function () {
        extra.innerHTML = '';
        ensureSelectedCompany()
          .then(function (c) {
            return job('call-prep', { companyId: c.id }, 'Preparing call script for ' + c.name)
              .then(function (data) {
                var p = data.callPrep;
                var html = '<h4>Opening</h4>' + card('', p.opening || '');
                html += '<h4>Questions — listen 80%, talk 20%</h4>';
                (p.questions || []).forEach(function (q, i) {
                  html += card((i + 1) + '. ' + (q.question || ''),
                    'Why: ' + (q.why || '') + '\nListen for: ' + (q.listenFor || ''));
                });
                html += '<h4>Closing — earns the WIN doc</h4>' + card('', p.closing || '');
                if (p.gapAnswer) html += '<h4>If the gap comes up</h4>' + card('', p.gapAnswer);
                if ((p.notesToCapture || []).length) {
                  html += '<h4>Capture immediately after</h4>' +
                    card('', (p.notesToCapture || []).map(function (n) { return '• ' + n; }).join('\n'));
                }
                out.innerHTML = html;
              });
          })
          .catch(fail);
      },

      windoc: function () {
        extra.innerHTML =
          '<div class="cc-ok">The WIN doc is built from research — you do not need a call first. ' +
          'Before a conversation it is what makes you interesting enough to get one. ' +
          'If you have already spoken to someone, add their confirmed problems below and those ' +
          'replace the hypotheses.</div>' +
          '<div class="cc-row"><input type="text" class="cc-contact" placeholder="Who you spoke to (optional)"></div>' +
          '<textarea class="cc-problems" placeholder="Optional — one problem they CONFIRMED, in their words, per line. Leave blank to build from research alone."></textarea>' +
          '<div class="cc-actions">' +
          '<button class="cc-primary cc-go" type="button">Build WIN doc</button>' +
          '</div>';

        extra.querySelector('.cc-go').addEventListener('click', function () {
          var problems = extra.querySelector('.cc-problems').value
            .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          var contactVal = extra.querySelector('.cc-contact').value;
          ensureSelectedCompany()
            .then(function (c) {
              return job('generate-win-doc', {
                companyId: c.id,
                roleTitle: roleInput.value,
                contactName: contactVal,
                problems: problems,
              }, (problems.length ? 'Building WIN doc from your call notes for ' : 'Researching and building the WIN doc for ') + c.name)
                .then(function (data) {
                  var w = data.winDoc || {};
                  var winDocId = data.id;
                  var slides = (w.slides && w.slides.length) ? w.slides
                    : (w.sections && w.sections.slides) || [];

                  // Brand fetch is fire-and-forget: the slide viewer renders with a
                  // safe default palette immediately and swaps to the company's own
                  // colors once /brand returns. This keeps the deck usable even if
                  // Brandfetch is down or the domain resolution missed.
                  api('/companies/' + encodeURIComponent(c.id) + '/brand')
                    .then(function (b) { applyBrand(b.brand); })
                    .catch(function () {});

                  renderWinDeck({
                    container: out,
                    winDoc: w,
                    slides: slides,
                    companyName: c.name,
                    winDocId: winDocId,
                  });
                });
            })
            .catch(fail);
        });
        out.innerHTML = '<p class="cc-muted">Fill in the call notes above, then generate.</p>';
      },

      resume: function () {
        extra.innerHTML = '';
        var c;
        try { c = selected(); } catch (e) { c = null; }
        var role = (roleInput ? roleInput.value : '').trim();
        if (c && c.id) {
          navigateToTailorResume(c.id, role);
        } else {
          window.location.href = '/outreach.html?tab=resume';
        }
      },

      email: function () {
        extra.innerHTML = '';
        ensureSelectedCompany()
          .then(function (c) {
            return job('cold-email', { companyId: c.id, roleName: roleInput.value },
                'Writing cold email for ' + c.name)
              .then(function (data) {
                var e = data.email;
                out.innerHTML =
                  '<h4>Subject</h4>' + card('', e.subject || '') +
                  '<h4>Body</h4>' + card('', e.body || '') +
                  '<h4>Follow-up</h4>' + card('', (e.followUpSubject || '') + '\n\n' + (e.followUpBody || ''));
              });
          })
          .catch(fail);
      },
    };

    drawer.querySelectorAll('.cc-actions [data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fn = ACTIONS[btn.getAttribute('data-act')];
        if (fn) fn();
      });
    });

    /**
     * Open the drawer already pointed at one company, with a summary of what
     * the system knows about it — so every action below runs in that context
     * instead of making you re-pick it.
     */
    openCopilot = function (companyId, roleTitle, initialAction) {
      drawer.classList.add('cc-open');
      extra.innerHTML = '';

      var apply = function () {
        if (companyId) {
          select.value = companyId;
          if (select.value === companyId) {
            otherRow.style.display = 'none';
          }
        }
        if (roleTitle) roleInput.value = roleTitle;
        if (initialAction) {
          drawer.querySelectorAll('.cc-actions [data-act]').forEach(function (b) {
            b.classList.toggle('cc-primary', b.getAttribute('data-act') === initialAction);
          });
          if (ACTIONS[initialAction]) {
            ACTIONS[initialAction]();
            return;
          }
        }
        loadOverview();
      };

      var loadOverview = function () {
        if (!companyId) return;
        out.innerHTML = '<p class="cc-muted">Loading what we know about this company…</p>';

        api('/companies/' + encodeURIComponent(companyId) + '/autofill')
          .then(function (d) {
            var f = d.facts || {};
            if (!roleInput.value && d.suggested && d.suggested.jd) {
              // nothing to fill from a URL, but keep the JD handy below
            }

            var rows = [
              ['Research', f.researched
                ? '<a href="#" class="cc-view-research" style="color:#5b86ff">done' +
                  (f.researchedAt ? ' · ' + new Date(f.researchedAt).toLocaleDateString() : '') + ' — view</a>'
                : 'not run yet'],
              ['Connections', String(f.connections || 0)],
              ['Messages', String(f.messages || 0)],
              ['WIN docs', String(f.winDocs || 0)],
              ['Tailored resumes', String(f.tailoredResumes || 0)],
              ['LinkedIn ID', f.linkedInId ? f.linkedInId : 'not set'],
            ];

            var html = '<div class="cc-card"><strong>' + esc(d.company.name) + '</strong>' +
              '<div class="cc-meta" style="margin-top:7px">IN CONTEXT FOR EVERY ACTION BELOW</div>' +
              rows.map(function (r) {
                // The research row carries a link, so it is not escaped.
                var isLink = r[0] === 'Research' && /^</.test(r[1]);
                return '<div style="display:flex;justify-content:space-between;gap:12px">' +
                  '<span class="cc-muted">' + esc(r[0]) + '</span><span>' +
                  (isLink ? r[1] : esc(r[1])) + '</span></div>';
              }).join('') + '</div>';

            if (d.suggested && d.suggested.notes) {
              html += '<div class="cc-ok"><strong>Next step:</strong> ' + esc(d.suggested.notes) + '</div>';
            }
            if (d.suggested && d.suggested.jd) {
              html += '<p class="cc-muted">Role / JD: <a href="' + esc(d.suggested.jd) +
                '" target="_blank" rel="noopener" style="color:#5b86ff">' + esc(d.suggested.jd) + '</a></p>';
            }
            if ((f.interviews || []).length) {
              html += '<p class="cc-muted">Interviews: ' + f.interviews.map(function (i) {
                return '<a href="/interview.html?session=' + esc(i.id) + '" style="color:#5b86ff">' +
                  esc(i.round) + (i.readiness ? ' (' + esc(i.readiness) + ')' : '') + '</a>';
              }).join(' · ') + '</p>';
            }

            html += '<p class="cc-muted">Pick an action above — it will use this company.</p>';
            out.innerHTML = html;

            var link = out.querySelector('.cc-view-research');
            if (link) {
              link.addEventListener('click', function (e) {
                e.preventDefault();
                if (ACTIONS['view-research']) ACTIONS['view-research']();
              });
            }
          })
          .catch(function (err) {
            out.innerHTML = '<div class="cc-bad">Could not load company context: ' + esc(err.message) + '</div>';
          });
      };

      // The company list may still be loading on first open.
      if (select.options.length) apply(); else setTimeout(apply, 600);
    };
  }

  // ── Boot ────────────────────────────────────────────────────────────
  function runApp() {
    // The build step retagged the prototype's inline script so it waits for us.
    document.querySelectorAll('script[type="text/cc-app"]').forEach(function (node) {
      var script = document.createElement('script');
      script.textContent = node.textContent;
      document.body.appendChild(script);
    });

    // Then replace the prototype's copy-paste prompt generators with real,
    // executed actions. Loaded after the app script so these definitions win.
    window.__CC__ = {
      api: api, runJob: runJob, esc: esc,
      pushState: pushState, scheduleSync: scheduleSync,
      openCopilot: function (id, role, act) { if (openCopilot) openCopilot(id, role, act); },
      refreshCompanies: function (id) { if (refreshCompaniesFn) return refreshCompaniesFn(id); },
      navigateToResume: navigateToTailorResume,
      cleanJdText: cleanJdText,
      appConfirm: window.appConfirm,
      appAlert: window.appAlert,
      // Slide-viewer primitives so the outreach page's Step 4 renders WIN docs
      // the same way as the AI Copilot drawer — one implementation, both UIs.
      renderWinDeck: renderWinDeck,
      applyBrand: applyBrand,
    };
    var overrides = document.createElement('script');
    // Versioned by the build step so a deploy is not masked by a cached copy.
    overrides.src = '/prototype-actions.js?v=' + (window.CC_ASSET_VERSION || Date.now());
    document.body.appendChild(overrides);
  }

  function boot() {
    if (!token) { showGate(); return; }

    hydrate()
      .then(function () {
        patchStorage();
        buildPill();
        buildDrawer();
        runApp();
      })
      .catch(function (err) {
        // Offline or server down: run against whatever is in localStorage
        // rather than showing a blank page, and make it obvious nothing saves.
        patchStorage();
        buildPill();
        buildDrawer();
        runApp();
        setStatus('error', 'Offline — ' + err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
