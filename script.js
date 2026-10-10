/* =========================================================
   YUSUF — interactions & motion
   Vanilla JS, no dependencies.
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  root.classList.add('motion');

  /* =========================================================
     CONFIG — spam protection is live.
     The Discord webhook lives only in the Vercel environment
     variable WEBHOOK_URL, never in this file.
     ========================================================= */
  var CONFIG = {
    /* public key from Cloudflare Turnstile — safe to publish */
    turnstileSitekey: '0x4AAAAAAFTM_22mdauosyR5',

    /* handled by api/contact.js, which Vercel deploys automatically */
    contactEndpoint: '/api/contact'
  };

  /* ---------- preloader ---------- */
  (function preloader() {
    var pre = $('#preloader');
    if (!pre) return;
    var counter = $('#preCount');
    var bar = $('#preBar');

    function finish() {
      pre.classList.add('is-done');
      doc.body.classList.add('is-ready');
      window.setTimeout(function () { pre.remove(); }, 1800);
    }

    if (reduced) {
      counter.textContent = '100';
      bar.style.width = '100%';
      finish();
      return;
    }

    var duration = 1400;
    var start = performance.now();
    var pageLoaded = doc.readyState === 'complete';
    window.addEventListener('load', function () { pageLoaded = true; });

    (function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var v = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      counter.textContent = v;
      bar.style.width = v + '%';

      if (p < 1) { requestAnimationFrame(tick); return; }

      var waitStart = Date.now();
      (function waitForPage() {
        if (pageLoaded || Date.now() - waitStart > 1100) window.setTimeout(finish, 180);
        else requestAnimationFrame(waitForPage);
      })();
    })(start);
  })();

  /* ---------- clock / year ---------- */
  (function meta() {
    var year = String(new Date().getFullYear());
    $$('[data-year]').forEach(function (el) { el.textContent = year; });

    var clocks = $$('[data-clock]');
    if (!clocks.length) return;
    var fmt = null;
    try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { fmt = null; }

    function tick() {
      var text = fmt ? fmt.format(new Date()) : new Date().toTimeString().slice(0, 5);
      clocks.forEach(function (el) { el.textContent = text; });
    }
    tick();
    window.setInterval(tick, 20000);
  })();

  /* ---------- image fallback ---------- */
  $$('img').forEach(function (img) {
    img.addEventListener('error', function () {
      var box = doc.createElement('div');
      box.style.cssText = 'width:100%;height:100%;display:grid;place-items:center;font-family:Syncopate,sans-serif;font-size:2.4rem;color:#ff2b2b;background:rgba(255,43,43,.08)';
      box.textContent = 'Y';
      img.replaceWith(box);
    });
  });

  /* ---------- toast ---------- */
  var toastEl = $('#toast');
  var toastTimer;

  function toast(message, ok) {
    if (!toastEl) return;
    var icon = ok === false ? '<i class="fa-solid fa-triangle-exclamation" style="color:#ff6a6a"></i>' : '<i class="fa-solid fa-circle-check"></i>';
    toastEl.innerHTML = icon + '<span>' + message + '</span>';
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('show'); }, 2300);
  }

  /* ---------- copy to clipboard ---------- */
  (function copyables() {
    $$('[data-copy]').forEach(function (el) {
      function run() {
        var text = el.getAttribute('data-copy') || '';
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(
            function () { sfx.copy(); toast('Copied ' + text); },
            function () { legacy(text); }
          );
        } else {
          legacy(text);
        }
      }

      function legacy(text) {
        var ta = doc.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0';
        doc.body.appendChild(ta);
        ta.select();
        try {
          doc.execCommand('copy');
          sfx.copy();
          toast('Copied ' + text);
        } catch (e) {
          toast('Copy it manually — it is ' + text, false);
        }
        doc.body.removeChild(ta);
      }

      el.addEventListener('click', run);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); }
      });
    });
  })();

  /* ---------- background particles ---------- */
  (function particles() {
    var cvs = $('#bg');
    if (!cvs || reduced) return;
    var ctx = cvs.getContext('2d');
    var TAU = Math.PI * 2;
    var LINK = 132;
    var FIELD = 300;
    var PUSH = 34;
    var RETURN = 0.925;
    var w = 0, h = 0, dots = [], raf = null;
    var pointer = { x: -9999, y: -9999, active: false, power: 0 };

    function make() {
      var ox = Math.random() * w;
      var oy = Math.random() * h;
      return {
        ox: ox, oy: oy,
        dx: 0, dy: 0,
        x: ox, y: oy,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.9 + 0.9
      };
    }

    function build() {
      var target = Math.max(28, Math.min(Math.round((w * h) / 16000), 92));
      dots = [];
      for (var i = 0; i < target; i++) dots.push(make());
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function step() {
      var i, p;

      pointer.power += ((pointer.active ? 1 : 0) - pointer.power) * 0.08;

      ctx.clearRect(0, 0, w, h);

      if (pointer.power > 0.01) {
        var glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, FIELD);
        glow.addColorStop(0, 'rgba(255, 43, 43, ' + (0.11 * pointer.power).toFixed(3) + ')');
        glow.addColorStop(1, 'rgba(255, 43, 43, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }

      for (i = 0; i < dots.length; i++) {
        p = dots[i];
        p.ox += p.vx;
        p.oy += p.vy;

        if (p.ox < -30) p.ox = w + 30; else if (p.ox > w + 30) p.ox = -30;
        if (p.oy < -30) p.oy = h + 30; else if (p.oy > h + 30) p.oy = -30;

        if (pointer.power > 0.01) {
          var px = pointer.x - p.ox;
          var py = pointer.y - p.oy;
          var d = Math.sqrt(px * px + py * py);
          if (d < FIELD && d > 0.5) {
            var t = 1 - d / FIELD;
            var f = t * t * PUSH * pointer.power;
            p.dx -= (px / d) * f;
            p.dy -= (py / d) * f;
          }
        }

        p.dx *= RETURN;
        p.dy *= RETURN;
        p.x = p.ox + p.dx;
        p.y = p.oy + p.dy;
      }

      ctx.lineWidth = 1;
      for (i = 0; i < dots.length; i++) {
        for (var b = i + 1; b < dots.length; b++) {
          var q = dots[b];
          var ex = q.x - dots[i].x;
          var ey = q.y - dots[i].y;
          var d2 = ex * ex + ey * ey;
          if (d2 > LINK * LINK) continue;
          var alpha = (1 - Math.sqrt(d2) / LINK) * 0.24;
          ctx.strokeStyle = 'rgba(255, 43, 43, ' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(255, 43, 43, 0.55)';
      ctx.fillStyle = 'rgba(255, 62, 62, 0.82)';
      ctx.beginPath();
      for (var n = 0; n < dots.length; n++) {
        ctx.moveTo(dots[n].x + dots[n].r, dots[n].y);
        ctx.arc(dots[n].x, dots[n].y, dots[n].r, 0, TAU);
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(step);
    }

    var timer;
    window.addEventListener('resize', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(resize, 160);
    });

    window.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }, { passive: true });

    window.addEventListener('blur', function () { pointer.active = false; });
    doc.addEventListener('pointerleave', function () { pointer.active = false; });
    doc.addEventListener('pointerenter', function () { pointer.active = true; });

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
      else if (!raf) raf = requestAnimationFrame(step);
    });

    resize();
    raf = requestAnimationFrame(step);
  })();

  /* ---------- sound engine (web audio, no files) ---------- */
  var sfx = (function () {
    var ctx = null;
    var enabled = true;

    try { enabled = window.localStorage.getItem('yf-sound') !== '0'; } catch (e) { enabled = true; }

    function audio() {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      if (!ctx) ctx = new Ctor();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, dur, type, vol, slideTo, delay) {
      if (!enabled) return;
      var c = audio();
      if (!c) return;
      var t0 = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    }

    function noise(dur, vol, freq, sweepTo) {
      if (!enabled) return;
      var c = audio();
      if (!c) return;
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buffer = c.createBuffer(1, len, c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource();
      src.buffer = buffer;
      var filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq || 900, c.currentTime);
      if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + dur);
      filter.Q.value = 1.1;
      var gain = c.createGain();
      gain.gain.value = vol || 0.04;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();
    }

    return {
      on: function () { return enabled; },
      toggle: function () {
        enabled = !enabled;
        try { window.localStorage.setItem('yf-sound', enabled ? '1' : '0'); } catch (e) { /* ignore */ }
        if (enabled) this.click();
        return enabled;
      },
      hover: function () { tone(1180, 0.045, 'sine', 0.012); },
      click: function () { tone(420, 0.09, 'triangle', 0.045, 720); },
      soft: function () { tone(660, 0.07, 'sine', 0.03); },
      open: function () {
        noise(0.42, 0.05, 500, 2600);
        tone(180, 0.28, 'sine', 0.05, 460, 0.03);
      },
      close: function () {
        noise(0.3, 0.04, 2400, 420);
        tone(420, 0.22, 'sine', 0.04, 150, 0.02);
      },
      key: function () { tone(1500 + Math.random() * 400, 0.022, 'square', 0.008); },
      copy: function () { tone(880, 0.07, 'sine', 0.04); tone(1320, 0.08, 'sine', 0.035, null, 0.08); },
      chime: function () {
        tone(784, 0.16, 'sine', 0.045);
        tone(1046, 0.18, 'sine', 0.04, null, 0.09);
        tone(1568, 0.28, 'sine', 0.035, null, 0.18);
      },
      success: function () {
        tone(523, 0.13, 'triangle', 0.05);
        tone(659, 0.13, 'triangle', 0.05, null, 0.1);
        tone(784, 0.13, 'triangle', 0.05, null, 0.2);
        tone(1046, 0.4, 'sine', 0.045, null, 0.3);
      },
      error: function () { tone(180, 0.3, 'sawtooth', 0.045, 90); }
    };
  })();

  /* ---------- sound toggle ---------- */
  (function soundToggle() {
    var btn = $('#soundBtn');
    if (!btn) return;
    var icon = btn.querySelector('i');

    function paint() {
      btn.setAttribute('aria-pressed', sfx.on() ? 'true' : 'false');
      icon.className = sfx.on() ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }

    paint();
    btn.addEventListener('click', function () {
      sfx.toggle();
      paint();
    });
  })();

  /* ---------- button / link sounds + spark burst ---------- */
  (function interactions() {
    var clickables = '.btn, .top-discord, .top-sound, .burger, .fab-discord, .copy-row, .menu-list a, .mc-socials a, .contact-socials a, .faq-q, .proj-link, .foot-nav a, .to-top';
    var hovered = '.btn, .top-discord, .burger, .fab-discord, .proj-link';

    doc.addEventListener('pointerdown', function (e) {
      var el = e.target.closest ? e.target.closest(clickables) : null;
      if (!el) return;
      sfx.click();
      if (el.classList.contains('btn-primary') || el.classList.contains('fab-discord')) {
        burst(e.clientX, e.clientY);
      }
    }, { passive: true });

    doc.addEventListener('pointerover', function (e) {
      var el = e.target.closest ? e.target.closest(hovered) : null;
      if (!el || el.__hovered) return;
      el.__hovered = true;
      sfx.hover();
    });

    doc.addEventListener('pointerout', function (e) {
      var el = e.target.closest ? e.target.closest(hovered) : null;
      if (!el) return;
      el.__hovered = false;
    });

    function fly(node, angle, distance) {
      node.style.transform = 'translate3d(' + (Math.cos(angle) * distance).toFixed(1) + 'px,' +
        (Math.sin(angle) * distance + 26).toFixed(1) + 'px,0) scale(0)';
      node.style.opacity = '0';
    }

    window.burst = function (x, y) {
      if (reduced) return;
      var host = doc.createElement('div');
      host.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;z-index:1500;pointer-events:none';
      for (var i = 0; i < 16; i++) {
        var node = doc.createElement('i');
        node.className = 'spark';
        node.style.marginLeft = '-2px';
        node.style.marginTop = '-2px';
        host.appendChild(node);
        (function (n, a, d) {
          window.requestAnimationFrame(function () { fly(n, a, d); });
        })(node, (i / 16) * Math.PI * 2 + Math.random() * 0.35, 46 + Math.random() * 78);
      }
      doc.body.appendChild(host);
      window.setTimeout(function () { host.remove(); }, 900);
    };
  })();

  /* ---------- button ripple ---------- */
  (function ripple() {
    if (reduced) return;
    $$('.btn').forEach(function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        var r = btn.getBoundingClientRect();
        var size = Math.max(r.width, r.height) * 2.1;
        var s = doc.createElement('span');
        s.className = 'ripple';
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        s.style.left = (e.clientX - r.left) + 'px';
        s.style.top = (e.clientY - r.top) + 'px';
        btn.appendChild(s);
        window.setTimeout(function () { s.remove(); }, 700);
      });
    });
  })();

  /* ---------- image shimmer ---------- */
  (function imageStates() {
    $$('.hero-avatar, .id-av').forEach(function (box) {
      var img = box.querySelector('img');
      if (!img) return;
      if (img.complete && img.naturalWidth > 0) return;
      box.classList.add('is-loading');
      var clear = function () { box.classList.remove('is-loading'); };
      img.addEventListener('load', clear);
      img.addEventListener('error', clear);
    });
  })();

  /* ---------- pointer extras ---------- */
  if (fine) {
    (function cursor() {
      var dot = $('.cursor-dot');
      var ring = $('.cursor-ring');
      var label = $('.cursor-label');
      if (!dot || !ring) return;

      var mx = window.innerWidth / 2, my = window.innerHeight / 2;
      var rx = mx, ry = my;

      window.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      }, { passive: true });

      (function loop() {
        rx += (mx - rx) * 0.16;
        ry += (my - ry) * 0.16;
        ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
        requestAnimationFrame(loop);
      })();

      var targets = 'a, button, input, select, textarea, [role="button"], .cap, .proj, .stat, .faq-q, .bar-row, .ring-item';
      doc.addEventListener('pointerover', function (e) {
        var el = e.target.closest ? e.target.closest(targets) : null;
        if (!el) return;
        doc.body.classList.add('cursor-active');
        if (label) label.textContent = el.getAttribute('data-cursor') || '';
      });
      doc.addEventListener('pointerout', function (e) {
        var el = e.target.closest ? e.target.closest(targets) : null;
        if (!el) return;
        if (e.relatedTarget && el.contains(e.relatedTarget)) return;
        doc.body.classList.remove('cursor-active');
        if (label) label.textContent = '';
      });
    })();

    (function magnetic() {
      $$('[data-magnetic]').forEach(function (el) {
        el.addEventListener('pointerenter', function () {
          el.style.transition = 'transform .2s cubic-bezier(.22,1,.36,1)';
        });
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width / 2) * 0.24;
          var y = (e.clientY - r.top - r.height / 2) * 0.34;
          el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        });
        el.addEventListener('pointerleave', function () {
          el.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
          el.style.transform = '';
        });
      });
    })();

    (function tilt() {
      $$('[data-tilt]').forEach(function (el) {
        var max = 6;
        el.addEventListener('pointerenter', function () {
          el.style.transition = 'transform .3s cubic-bezier(.22,1,.36,1), border-color .4s';
        });
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform =
            'perspective(900px) rotateX(' + (-py * max).toFixed(2) + 'deg) rotateY(' +
            (px * max).toFixed(2) + 'deg) translateY(-6px) scale(1.012)';
        });
        el.addEventListener('pointerleave', function () {
          el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1), border-color .4s';
          el.style.transform = '';
        });
      });
    })();

    (function glow() {
      $$('[data-glow]').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    })();
  }

  /* ---------- reveal ---------- */
  (function reveal() {
    var els = $$('[data-reveal]');
    els.forEach(function (el) {
      var delay = el.getAttribute('data-delay');
      if (delay) el.style.setProperty('--d', delay + 'ms');
    });

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- text scramble ---------- */
  (function scramble() {
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*<>[]{}';
    var targets = $$('[data-scramble]');
    if (!targets.length) return;

    function run(el) {
      var nodes = [];
      (function walk(node) {
        Array.prototype.forEach.call(node.childNodes, function (child) {
          if (child.nodeType === 3) nodes.push(child);
          else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
        });
      })(el);

      nodes.forEach(function (node) {
        var target = node.nodeValue;
        var len = target.length;
        if (reduced || len < 4) return;

        var start = performance.now();
        var duration = Math.min(1000, 300 + len * 26);

        (function tick(now) {
          var p = Math.min((now - start) / duration, 1);
          var out = '';
          for (var k = 0; k < len; k++) {
            var ch = target[k];
            if (ch === ' ') { out += ' '; continue; }
            out += (k / len < p) ? ch : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
          }
          node.nodeValue = out;
          if (p < 1) requestAnimationFrame(tick);
          else node.nodeValue = target;
        })(start);
      });
    }

    if (!('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- counters ---------- */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduced) { el.textContent = target + suffix; return; }
      var start = performance.now();
      (function tick(now) {
        var p = Math.min((now - start) / 1700, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else sfx.chime();
      })(start);
    }

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- skill bars & rings ---------- */
  (function skills() {
    var RING_LEN = 2 * Math.PI * 52;
    var bars = $$('[data-bar]');
    var rings = $$('[data-ring]');

    function runBar(el) {
      var v = parseFloat(el.getAttribute('data-bar')) || 0;
      if (reduced) { el.style.width = v + '%'; return; }
      window.setTimeout(function () { el.style.width = v + '%'; }, 120);
    }

    function runRing(el) {
      var v = parseFloat(el.getAttribute('data-ring')) || 0;
      el.style.strokeDashoffset = RING_LEN * (1 - v / 100);
    }

    rings.forEach(function (el) { el.style.strokeDashoffset = RING_LEN; });

    if (!('IntersectionObserver' in window)) {
      bars.forEach(runBar);
      rings.forEach(runRing);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (entry.target.hasAttribute('data-bar')) runBar(entry.target);
        if (entry.target.hasAttribute('data-ring')) runRing(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    bars.concat(rings).forEach(function (el) { io.observe(el); });
  })();

  /* ---------- typing terminal ---------- */
  (function terminal() {
    var body = $('#termBody');
    if (!body) return;

    var LINES = [
      { cmd: 'whoami', out: '17 · self-taught developer · high school student' },
      { cmd: 'stack', out: 'lua / luau · roblox · js · automation' },
      { cmd: 'server', out: 'Syniox Hub — owner & main builder' },
      { cmd: 'mentors', out: 'HalisAnteo · Henne' },
      { cmd: 'contact', out: 'discord → ruling.dev' }
    ];

    function staticRender() {
      body.innerHTML = '';
      LINES.forEach(function (line) {
        var c = doc.createElement('div');
        c.innerHTML = '<span class="t-cmd">$ <span class="t-key">' + line.cmd + '</span></span>';
        body.appendChild(c);
        var o = doc.createElement('div');
        o.className = 't-out';
        o.textContent = line.out;
        body.appendChild(o);
      });
      var cur = doc.createElement('span');
      cur.className = 'term-cursor';
      body.appendChild(cur);
    }

    function sleep(ms) { return new Promise(function (res) { window.setTimeout(res, ms); }); }

    async function play() {
      if (reduced) { staticRender(); return; }
      while (true) {
        body.innerHTML = '';
        for (var i = 0; i < LINES.length; i++) {
          var line = LINES[i];
          var row = doc.createElement('div');
          row.innerHTML = '<span class="t-cmd">$ <span class="t-key"></span></span>';
          body.appendChild(row);
          var key = row.querySelector('.t-key');

          for (var c = 0; c <= line.cmd.length; c++) {
            key.textContent = line.cmd.slice(0, c);
            sfx.key();
            await sleep(52 + Math.random() * 45);
          }
          await sleep(160);

          var out = doc.createElement('div');
          out.className = 't-out';
          out.textContent = line.out;
          body.appendChild(out);
          await sleep(420);
        }
        var cur = doc.createElement('span');
        cur.className = 'term-cursor';
        body.appendChild(cur);
        await sleep(3200);
      }
    }

    if (!('IntersectionObserver' in window)) { staticRender(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        play();
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    io.observe(body);
  })();

  /* ---------- hero title ---------- */
  (function heroName() {
    var el = $('#heroName');
    if (!el || reduced) return;
    var text = el.textContent.trim();
    el.textContent = '';
    text.split('').forEach(function (c, i) {
      var s = doc.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      s.style.transitionDelay = (260 + i * 75) + 'ms';
      el.appendChild(s);
    });
    window.setTimeout(function () {
      $$('.hero-name .ch').forEach(function (s) { s.classList.add('in'); });
    }, 240);

    if (!fine) return;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      el.style.setProperty('--hxg', x.toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--hxg', '50%');
    });
  })();

  /* ---------- rotating role ---------- */
  (function rotator() {
    var el = $('#rot');
    if (!el || reduced) return;
    var list;
    try { list = JSON.parse((el.getAttribute('data-roles') || '[]').replace(/&amp;/g, '&')); }
    catch (e) { return; }
    if (!list.length) return;

    var i = 0;
    window.setInterval(function () {
      el.classList.add('out');
      window.setTimeout(function () {
        i = (i + 1) % list.length;
        el.textContent = list[i];
        el.classList.remove('out');
      }, 420);
    }, 3400);
  })();

  /* ---------- scroll systems ---------- */
  (function scrollSystems() {
    var bar = $('.scroll-progress i');
    var topProg = $('.topbar-progress i');
    var topbar = $('.topbar');
    var toTop = $('#toTop');
    var ring = $('#ttRing');
    var hint = $('.scroll-hint');
    var fab = $('.fab-discord');
    var dots = $$('.dots a');
    var navLinks = $$('.top-nav a');
    var orbs = $$('[data-par]');
    var footWord = $('.foot-word');
    var RING_C = 2 * Math.PI * 20;
    var pill = $('.top-nav-pill');
    var lastY = 0;
    var sections = ['hero', 'story', 'capabilities', 'skills', 'work', 'journey', 'faq', 'contact']
      .map(function (id) { return doc.getElementById(id); })
      .filter(Boolean);

    var ticking = false;

    function update() {
      var y = window.pageYOffset || root.scrollTop;
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? y / max : 0;

      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (topProg) topProg.style.transform = 'scaleX(' + p + ')';
      if (ring) ring.style.strokeDashoffset = RING_C * (1 - p);
      if (topbar) topbar.classList.toggle('is-stuck', y > 24);
      if (toTop) toTop.classList.toggle('show', y > 700);

      if (fab) {
        var movingDown = y > lastY;
        if (Math.abs(y - lastY) > 5) {
          fab.classList.toggle('show', y > 620 && y < max - 400 && !movingDown);
          lastY = y;
        }
      }
      if (hint) hint.style.opacity = Math.max(0, 1 - y / 280);

      for (var i = 0; i < orbs.length; i++) {
        var s = parseFloat(orbs[i].getAttribute('data-par')) || 0;
        orbs[i].style.translate = '0 ' + (y * s).toFixed(1) + 'px';
      }

      if (footWord) {
        var box = footWord.getBoundingClientRect();
        var drift = (box.top - window.innerHeight * 0.6) * -0.055;
        footWord.style.transform = 'translate3d(' + drift.toFixed(1) + 'px,0,0)';
      }

      if (dots.length && sections.length) {
        var line = window.innerHeight * 0.34;
        var current = sections[0].id;
        for (var k = 0; k < sections.length; k++) {
          if (sections[k].getBoundingClientRect().top <= line) current = sections[k].id;
        }
        for (var d = 0; d < dots.length; d++) {
          dots[d].classList.toggle('is-active', dots[d].getAttribute('data-dot') === current);
        }
        for (var n = 0; n < navLinks.length; n++) {
          navLinks[n].classList.toggle('is-active', navLinks[n].getAttribute('href') === '#' + current);
        }
      }

      if (pill) {
        var activeLink = $('.top-nav a.is-active');
        if (activeLink) {
          pill.style.width = activeLink.offsetWidth + 'px';
          pill.style.transform = 'translate(' + activeLink.offsetLeft + 'px,-50%)';
          pill.classList.add('on');
        } else {
          pill.classList.remove('on');
        }
      }

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  /* ---------- back to top ---------- */
  (function backToTop() {
    var btn = $('#toTop');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  })();

  /* ---------- menu ---------- */
  (function menu() {
    var panel = $('#menu');
    var burger = $('#burger');
    if (!panel || !burger) return;

    var links = $$('[data-menu-link]', panel);
    var lastFocus = null;

    function focusables() {
      return $$('a[href], button:not([disabled]), input, select, textarea', panel)
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function open() {
      lastFocus = doc.activeElement;
      sfx.open();
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      burger.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      root.classList.add('is-locked');
      window.setTimeout(function () {
        var f = focusables();
        if (f.length) f[0].focus();
      }, reduced ? 0 : 480);
    }

    function close() {
      if (panel.classList.contains('is-open')) sfx.close();
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      root.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function isOpen() { return panel.classList.contains('is-open'); }

    burger.addEventListener('click', function () {
      if (isOpen()) close(); else open();
    });

    links.forEach(function (a) { a.addEventListener('click', close); });

    $$('[data-menu-close]').forEach(function (b) {
      b.addEventListener('click', function () {
        close();
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    doc.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;

      var f = focusables();
      if (!f.length) return;
      if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  })();

  /* ---------- faq ---------- */
  (function accordion() {
    var items = $$('.faq-item');
    if (!items.length) return;

    items.forEach(function (item) {
      var btn = $('.faq-q', item);
      btn.addEventListener('click', function () {
        var open = item.classList.contains('is-open');
        items.forEach(function (other) {
          other.classList.remove('is-open');
          $('.faq-q', other).setAttribute('aria-expanded', 'false');
        });
        if (!open) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  })();

  /* ---------- cloudflare turnstile ---------- */
  var turnstileToken = '';

  (function turnstile() {
    var host = $('#turnstile-widget');
    if (!host) return;

    var box = host.parentNode;

    function ready(fn, tries) {
      if (window.turnstile) return fn();
      if (tries > 40) { if (box) box.classList.add('is-hidden'); return; }
      window.setTimeout(function () { ready(fn, tries + 1); }, 120);
    }

    ready(function () {
      if (CONFIG.turnstileSitekey.indexOf('PASTE_') === 0) return;
      window.turnstile.render(host, {
        sitekey: CONFIG.turnstileSitekey,
        theme: 'dark',
        size: 'flexible',
        appearance: 'interaction-only',
        callback: function (token) { turnstileToken = token; },
        'expired-callback': function () { turnstileToken = ''; },
        'error-callback': function () { turnstileToken = ''; }
      });
    });
  })();

  /* ---------- contact form ---------- */
  (function contactForm() {
    var form = $('#contactForm');
    if (!form) return;
    var note = $('#formNote');
    var btn = $('button[type="submit"]', form);
    var btnLabel = btn ? btn.querySelector('span') : null;
    var opened = performance.now();
    var lastSent = 0;

    try { lastSent = parseInt(window.localStorage.getItem('yf-last-sent') || '0', 10) || 0; } catch (e) { lastSent = 0; }

    function say(text, state) {
      note.textContent = text;
      note.className = 'form-note' + (state ? ' ' + state : '');
    }

    function validate() {
      var name = $('#name');
      var message = $('#message');
      var ok = true;

      var nameField = name.closest('.field');
      var nameOk = name.value.trim().length > 1;
      nameField.classList.toggle('invalid', !nameOk);
      if (!nameOk) ok = false;

      var msgField = message.closest('.field');
      var msgOk = message.value.trim().length >= 10;
      msgField.classList.toggle('invalid', !msgOk);
      if (!msgOk) ok = false;

      return ok;
    }

    ['name', 'message'].forEach(function (id) {
      var input = $('#' + id);
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field.classList.contains('invalid') && input.value.trim().length > (id === 'name' ? 1 : 9)) {
          field.classList.remove('invalid');
        }
      });
    });

    function resetCaptcha() {
      if (window.turnstile && CONFIG.turnstileSitekey.indexOf('PASTE_') !== 0) {
        try { window.turnstile.reset('#turnstile-widget'); } catch (e) { /* ignore */ }
      }
      turnstileToken = '';
    }

    function markSent() {
      lastSent = Date.now();
      try { window.localStorage.setItem('yf-last-sent', String(lastSent)); } catch (err) { /* ignore */ }
      form.reset();
      sfx.success();
      say('Sent. It landed straight in my Discord.', 'ok');
      toast('Message sent to Discord');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sfx.soft();

      var honey = $('#website');
      if (honey && honey.value) { markSent(); return; }

      if (performance.now() - opened < 2500) {
        sfx.error();
        say('Take a second and try again.', 'bad');
        return;
      }

      if (!validate()) {
        sfx.error();
        say('Please fix the highlighted fields.', 'bad');
        return;
      }

      if (Date.now() - lastSent < 20000) {
        sfx.error();
        say('You just sent a message — give it a moment.', 'bad');
        return;
      }

      if (btn) btn.disabled = true;
      if (btnLabel) btnLabel.textContent = 'Sending…';
      say('');

      var data = {
        name: $('#name').value,
        contact: $('#contact').value,
        topic: $('#subject').value,
        message: $('#message').value,
        website: honey ? honey.value : '',
        token: turnstileToken
      };

      fetch(CONFIG.contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().then(function (payload) {
          if (!res.ok) throw new Error(payload.error || 'send failed');
          return payload;
        });
      }).then(function () {
        markSent();
      }).catch(function (err) {
        sfx.error();
        say(err.message || 'Something went wrong. Try Discord instead.', 'bad');
      }).then(function () {
        resetCaptcha();
        if (btn) btn.disabled = false;
        if (btnLabel) btnLabel.textContent = 'Send message';
      });
    });
  })();

  /* ---------- misc: discord links open safely ---------- */
  $$('a[target="_blank"]').forEach(function (a) {
    if (!a.rel || a.rel.indexOf('noopener') === -1) a.rel = 'noopener noreferrer';
  });

})();