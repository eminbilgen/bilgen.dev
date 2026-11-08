(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /* ---------- nav, progress, reveal ---------- */
  const nav = $('#nav'), bar = $('#progress');
  function onScroll() {
    nav.classList.toggle('solid', scrollY > 40);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- 3D tower ---------- */
  const build = $('.build'), stages = $$('.stage');
  let progress = 0; // 0..4, one unit per stage
  function readProgress() {
    const r = build.getBoundingClientRect();
    progress = clamp(-r.top / innerHeight, 0, stages.length - 1);
    const s = Math.round(progress);
    stages.forEach((el, i) => el.classList.toggle('on', i === s));
  }
  addEventListener('scroll', readProgress, { passive: true });
  addEventListener('resize', readProgress);
  readProgress();

  function webglOk() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch { return false; }
  }

  function startTower() {
    if (!window.THREE || !webglOk()) { document.body.classList.add('nogl'); return; }
    const canvas = $('#gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0b, 9, 24);
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 7, 5); scene.add(key);
    const rim = new THREE.PointLight(0xff5b2e, 1.1, 12); rim.position.set(-3, 1, -2); scene.add(rim);
    const grid = new THREE.GridHelper(44, 66, 0x2a2a2e, 0x1a1a1d); grid.position.y = -1.6; scene.add(grid);

    const N = 4, H = 0.62, GAP = 0.18, slabs = [];
    for (let i = 0; i < N; i++) {
      const w = 3.4 - i * 0.18, d = 2.2 - i * 0.1;
      const geo = new THREE.BoxGeometry(w, H, d);
      const mat = new THREE.MeshStandardMaterial({ color: 0x151517, metalness: 0.55, roughness: 0.38, emissive: 0xff5b2e, emissiveIntensity: 0, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xff5b2e, transparent: true, opacity: 0 }));
      mesh.add(edges);
      mesh.userData = { edges, y: -1.6 + H / 2 + 0.02 + i * (H + GAP) };
      const lines = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7 * (1 - k * 0.04), 0.012, 0.01), new THREE.MeshBasicMaterial({ color: 0x3a3a40 }));
        b.position.set(0, -H / 2 + 0.1 + k * 0.1, d / 2 + 0.006);
        lines.add(b);
      }
      mesh.add(lines);
      scene.add(mesh);
      slabs.push(mesh);
    }

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    addEventListener('resize', resize);
    resize();

    const ease = (x) => 1 - Math.pow(1 - x, 3);
    let t = progress, side = 0, time = 0, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(build);

    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      time += 0.016;
      t += (progress - t) * (reduce ? 1 : 0.07);
      slabs.forEach((s, i) => {
        const a = ease(clamp(t - i, 0, 1));
        s.position.y = s.userData.y + (1 - a) * (0.9 + (N - i) * 0.55);
        s.rotation.y = (1 - a) * (0.5 + i * 0.25) + Math.sin(time * 0.3 + i) * 0.02;
        s.material.opacity = 0.28 + 0.72 * a;
        const active = Math.abs(t - (i + 1)) < 0.5;
        s.material.emissiveIntensity += ((active ? 0.16 : 0) - s.material.emissiveIntensity) * 0.1;
        s.userData.edges.material.opacity = (0.35 + 0.65 * a) * (active ? 1 : 0.55);
      });
      const mobile = innerWidth < 900;
      const ang = -0.7 + t * 0.42;
      const r = mobile ? 11.5 : 8.6;
      const si = Math.round(t);
      const sideT = mobile ? 0 : (si === 2 || si === 4 ? 2.1 : -2.1);
      side += (sideT - side) * 0.06;
      const m1 = Math.min(t, 1);
      cam.position.set(Math.sin(ang) * r, 1.2 + m1 * 0.8 + (mobile ? 1.2 : 0), Math.cos(ang) * r);
      cam.lookAt(side, 0.9 * (1 - m1) - 0.1 + (mobile ? 1.1 : 0), 0);
      rim.position.x = -3 + Math.sin(time * 0.5) * 1.2;
      renderer.render(scene, cam);
    }
    frame();
  }
  if (document.readyState === 'complete') startTower(); else addEventListener('load', startTower);

  /* ---------- selected work ---------- */
  const WORK = [
    { n: 'Multi-chain payments', st: 'in testing', tag: 'Case 01 · Fintech infrastructure', sum: 'A multi-merchant crypto payment gateway: one checkout, four networks.',
      pts: ['ETH, Base, TRON and Solana behind a single API', 'Per-payment HD wallet derivation, automatic and manual sweeps with gas top-up', 'Merchant portal, webhooks and an internal ledger with withdrawal requests'],
      m: [['Networks', '4'], ['Stage', 'Testnet'], ['Model', 'Multi-merchant']] },
    { n: 'Mail infrastructure', st: 'running', tag: 'Case 02 · Self-hosted mail', sum: 'Business mail for several domains on servers I run, with the deliverability side handled.',
      pts: ['Postfix and Dovecot serving multiple domains from one host', 'One SAN certificate replaced a tangle of mismatched certificates', 'SPF, DKIM (2048-bit) and DMARC, plus an outbound relay and webmail'],
      m: [['Domains', '3+'], ['Protocols', 'IMAP · SMTP'], ['DKIM', '2048-bit']] },
    { n: '3D storytelling site', st: 'live', tag: 'Case 03 · Interactive web', sum: 'A studio site that behaves like an operating system: boot sequence, a 3D hardware deck and a showroom.',
      pts: ['A Stream Deck-style 3D hero that drives the whole interface', 'A showroom desktop with lazy-loaded video reels', 'Accent theming that recolors the UI, the glow and the video together'],
      m: [['Views', '3'], ['Scroll', 'None'], ['Mobile', 'Tuned']] },
    { n: 'Photographer gallery', st: 'live', tag: 'Case 04 · Full-stack build', sum: 'A portfolio gallery whose content the owner controls in real time.',
      pts: ['A React front end with hand-written CSS', 'A PHP API and admin panel behind it', 'A CDN with an image-resizing API tuned to each screen'],
      m: [['Front end', 'React'], ['API', 'PHP'], ['Images', 'Resized']] },
  ];
  const rail = $('.rail', $('#workPanel')), detail = $('#workDetail');
  let cur = 0;
  WORK.forEach((w, i) => {
    const b = document.createElement('button');
    b.className = 'tab'; b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = `<span class="k">0${i + 1}</span><span class="n">${esc(w.n)}</span><span class="st">${esc(w.st)}</span>`;
    b.addEventListener('click', () => show(i));
    rail.appendChild(b);
  });
  function show(i) {
    cur = (i + WORK.length) % WORK.length;
    const w = WORK[cur];
    $$('.tab', rail).forEach((el, j) => { el.classList.toggle('on', j === cur); el.setAttribute('aria-selected', j === cur); });
    detail.innerHTML = `<div class="fade"><div class="tag">${esc(w.tag)}</div><h3>${esc(w.n)}</h3><p class="sum">${esc(w.sum)}</p>
      <ul class="pts">${w.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <div class="metrics">${w.m.map((x) => `<div><small>${esc(x[0])}</small><b>${esc(x[1])}</b></div>`).join('')}</div></div>`;
  }
  show(0);
  $('#workPanel').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); $$('.tab', rail)[cur].focus(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); $$('.tab', rail)[cur].focus(); }
  });

  /* ---------- live status (real data from status.bilgen.dev) ---------- */
  const ago = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 90 ? `${s}s` : s < 5400 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`; };
  async function loadStatus() {
    const dot = $('#statusDot'), text = $('#statusText'), rows = $('#statusRows'), meta = $('#statusMeta');
    try {
      const res = await fetch('https://status.bilgen.dev/status.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      const { up, total } = d.summary;
      const state = up === total ? 'ok' : up === 0 ? 'fail' : 'warn';
      dot.className = 'dot ' + state;
      text.textContent = state === 'ok' ? 'All systems operational' : state === 'fail' ? 'Major outage' : 'Partial outage';
      rows.innerHTML = d.targets.map((t) => {
        const max = Math.max(...t.recent.filter((r) => r.ok).map((r) => r.ms), 200);
        const bars = t.recent.slice(-60).map((r) => `<i class="${r.ok ? '' : 'bad'}" style="height:${r.ok ? Math.max(10, Math.round((r.ms / max) * 100)) : 100}%"></i>`).join('');
        return `<div class="row"><div class="row-top"><span>${esc(t.name)}</span><span class="s ${t.ok ? 'up' : 'down'}">${t.ok ? 'UP' : 'DOWN'}</span></div><div class="bars">${bars}</div>
          <div class="row-meta"><span>${t.uptime24h == null ? 'n/a' : t.uptime24h + '%'} 24h</span><span>${t.avgMs == null ? 'n/a' : t.avgMs + ' ms'} avg</span><span>TLS ${t.tlsDays == null ? 'n/a' : t.tlsDays + ' d'}</span></div></div>`;
      }).join('');
      const age = Date.now() - d.generatedAt;
      meta.textContent = `Checked ${ago(age)} ago by a monitor on my own server.` + (age > d.intervalMin * 60000 * 3 ? ' The monitor has gone quiet, so this may be out of date.' : '');
    } catch (err) {
      dot.className = 'dot';
      text.textContent = 'Status is unavailable right now';
      meta.innerHTML = 'Could not reach the monitor. <a href="https://status.bilgen.dev">Open the status page</a>.';
    }
  }
  const statusEl = $('#statusCard');
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { loadStatus(); o.disconnect(); setInterval(loadStatus, 60000); } }, { rootMargin: '200px' }).observe(statusEl);

  /* ---------- live mailcheck (the real engine, run in the browser) ---------- */
  const mcOut = $('#mcOut'), mcInput = $('#mcInput'), mcGo = $('#mcGo');
  let mcEngine = null;
  async function engine() {
    if (!mcEngine) mcEngine = import('https://mailcheck.bilgen.dev/src/index.js');
    return mcEngine;
  }
  function ring(score) {
    const C = 2 * Math.PI * 42;
    const color = score >= 75 ? 'var(--ok)' : score >= 40 ? 'var(--warn)' : 'var(--fail)';
    return `<div class="ring"><svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="42" fill="none" stroke-width="8"/><circle class="fgc" cx="50" cy="50" r="42" fill="none" stroke-width="8" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-to="${C * (1 - score / 100)}" style="stroke:${color}"/></svg><b>${score}</b></div>`;
  }
  const LABEL = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', info: 'INFO' };
  async function runCheck(domain) {
    mcOut.innerHTML = '<p class="mc-err" style="color:var(--mut)">Asking DNS…</p>';
    mcGo.disabled = true;
    try {
      const { runAll, dohResolver } = await engine();
      const rep = await runAll(domain, dohResolver());
      const bad = rep.checks.filter((c) => c.status === 'fail').length;
      mcOut.innerHTML = `<div class="mc-score">${ring(rep.score)}<div><h4>${esc(rep.domain)}: grade ${esc(rep.grade)}</h4><p>${bad ? bad + ' problem' + (bad > 1 ? 's' : '') + ' to fix' : 'No failing checks'}</p></div></div>
        <div class="mc-list">${rep.checks.map((c) => `<div class="mc-item">${esc(c.title)}<span class="${c.status}">${LABEL[c.status]}</span></div>`).join('')}</div>
        <p class="mc-more"><a href="https://mailcheck.bilgen.dev/?d=${encodeURIComponent(rep.domain)}" rel="noopener">See every finding and the fix →</a></p>`;
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.fgc', mcOut).forEach((c) => { c.style.strokeDashoffset = c.dataset.to; })));
    } catch (err) {
      mcOut.innerHTML = `<p class="mc-err">${esc(err.message || 'The check could not run.')} <a href="https://mailcheck.bilgen.dev/?d=${encodeURIComponent(domain)}" style="color:var(--ac)">Open the full tool →</a></p>`;
    } finally { mcGo.disabled = false; }
  }
  $('#mcForm').addEventListener('submit', (e) => { e.preventDefault(); if (mcInput.value.trim()) runCheck(mcInput.value.trim()); });
  $$('.try a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); mcInput.value = a.dataset.d; runCheck(a.dataset.d); }));

  /* ---------- open source, live from GitHub ---------- */
  const FALLBACK = [
    { name: 'mailcheck', description: 'Email authentication health check: SPF, DKIM, DMARC, MX, MTA-STS, TLS-RPT. CLI for Node and a static in-browser demo. Zero dependencies.', language: 'JavaScript', stargazers_count: 0, html_url: 'https://github.com/eminbilgen/mailcheck', homepage: 'https://mailcheck.bilgen.dev' },
    { name: 'statusboard', description: 'Self-hosted status page: a tiny Node monitor writes JSON, a static page renders uptime, latency, TLS expiry and incidents. Zero dependencies.', language: 'JavaScript', stargazers_count: 0, html_url: 'https://github.com/eminbilgen/statusboard', homepage: 'https://status.bilgen.dev' },
  ];
  function renderRepos(list) {
    $('#repos').innerHTML = list.map((r) => `<a class="repo reveal in" href="${esc(r.html_url)}" rel="noopener"><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p>
      <div class="meta">${r.language ? `<span class="lang">${esc(r.language)}</span>` : ''}<span>★ ${r.stargazers_count ?? 0}</span>${r.homepage ? `<span>${esc(r.homepage.replace(/^https?:\/\//, ''))}</span>` : ''}<span class="go">View on GitHub ↗</span></div></a>`).join('');
  }
  renderRepos(FALLBACK);
  fetch('https://api.github.com/users/eminbilgen/repos?per_page=100&sort=pushed')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((all) => {
      const list = all.filter((r) => !r.fork && r.description && !['eminbilgen', 'eminbilgen.github.io'].includes(r.name)).slice(0, 6);
      if (list.length) renderRepos(list);
    })
    .catch(() => { /* the static list above stays */ });
})();
