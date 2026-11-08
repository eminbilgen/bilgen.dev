(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /* ---------- nav, progress, active link ---------- */
  const nav = $('#nav'), bar = $('#progress');
  function onScroll() {
    nav.classList.toggle('solid', scrollY > 40);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav nav a');
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => secObs.observe(s));

  /* ---------- reveal + word-by-word headings ---------- */
  function splitWords(el) {
    let n = 0;
    [...el.childNodes].forEach((node) => {
      if (node.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'w';
        const i = document.createElement('span'); i.textContent = part; i.style.transitionDelay = (n++ * 70) + 'ms';
        w.appendChild(i); frag.appendChild(w);
      });
      node.replaceWith(frag);
    });
    el.classList.add('split');
  }
  $$('.big.reveal, .huge.reveal').forEach((el) => { el.classList.remove('reveal'); splitWords(el); el.classList.add('reveal-split'); });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .reveal-split').forEach((el) => io.observe(el));

  /* ---------- pointer life: spotlight, magnetic buttons ---------- */
  if (finePointer && !reduce) {
    const spot = $('#spot');
    let sx = innerWidth / 2, sy = innerHeight / 2, tx = sx, ty = sy;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; spot.classList.add('on'); }, { passive: true });
    (function loop() {
      sx += (tx - sx) * 0.12; sy += (ty - sy) * 0.12;
      spot.style.transform = `translate(${sx - 300}px, ${sy - 300}px)`;
      requestAnimationFrame(loop);
    })();
    $$('.btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.repo');
      $$('.repo').forEach((c) => { if (c !== card) c.style.transform = ''; });
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-4px)`;
    }, { passive: true });
  }

  /* ---------- hero: a particle cloud that morphs through the four stages ---------- */
  const build = $('.build'), stages = $$('.stage');
  let progress = 0; // 0..4
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

  // deterministic random so the shapes are identical on every load
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function makeShapes(N) {
    const R = rng(7);
    const gauss = () => (R() + R() + R() - 1.5) * 0.9;
    const cloud = new Float32Array(N * 3), knot = new Float32Array(N * 3), cube = new Float32Array(N * 3), globe = new Float32Array(N * 3), coin = new Float32Array(N * 3);
    const cities = Array.from({ length: 16 }, () => { const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [s * Math.cos(a), u, s * Math.sin(a)]; });
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      // 0: loose swirling cloud
      { const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 3.5 * Math.cbrt(R()) + 0.3; cloud[o] = s * Math.cos(a) * r; cloud[o + 1] = u * r * 0.8; cloud[o + 2] = s * Math.sin(a) * r; }
      // 1: design, a torus knot ribbon
      { const t = (i / N) * Math.PI * 2 * 1; const p = 2, q = 3, rr = Math.cos(q * t) + 2; const sc = 0.95;
        knot[o] = rr * Math.cos(p * t) * sc + gauss() * 0.11; knot[o + 1] = rr * Math.sin(p * t) * sc + gauss() * 0.11; knot[o + 2] = -Math.sin(q * t) * sc * 1.2 + gauss() * 0.11; }
      // 2: build, a gridded cube (points lie on lattice lines of every face)
      { const s = 1.7;
        if (R() < 0.24) { // bright edges of the cube
          const ax = Math.floor(R() * 3), sa = R() < 0.5 ? s : -s, sb = R() < 0.5 ? s : -s, v = (R() * 2 - 1) * s;
          const p = [0, 0, 0]; p[ax] = v; p[(ax + 1) % 3] = sa; p[(ax + 2) % 3] = sb; cube[o] = p[0]; cube[o + 1] = p[1]; cube[o + 2] = p[2];
        } else {
          const f = Math.floor(R() * 6), a = (R() * 2 - 1) * s, b = (R() * 2 - 1) * s, step = 3.4 / 8; const snap = (v) => Math.round((v + s) / step) * step - s;
          const useA = R() < 0.5; const A = useA ? snap(a) : a, B = useA ? b : snap(b);
          const faces = [[s, A, B], [-s, A, B], [A, s, B], [A, -s, B], [A, B, s], [A, B, -s]]; cube[o] = faces[f][0]; cube[o + 1] = faces[f][1]; cube[o + 2] = faces[f][2];
        } }
      // 3: host, a globe drawn with latitude and longitude lines, plus bright city nodes
      { if (R() < 0.12) { const c = cities[Math.floor(R() * cities.length)]; globe[o] = c[0] * 2.05 + gauss() * 0.07; globe[o + 1] = c[1] * 2.05 + gauss() * 0.07; globe[o + 2] = c[2] * 2.05 + gauss() * 0.07; }
        else { let lat = Math.asin(R() * 2 - 1), lon = R() * Math.PI * 2; if (R() < 0.5) lat = Math.round(lat / (Math.PI / 12)) * (Math.PI / 12); else lon = Math.round(lon / (Math.PI / 12)) * (Math.PI / 12);
          globe[o] = Math.cos(lat) * Math.cos(lon) * 2; globe[o + 1] = Math.sin(lat) * 2; globe[o + 2] = Math.cos(lat) * Math.sin(lon) * 2; } }
      // 4: pay, a coin with engraved rings
      { const k = R(); let r, z; if (k < 0.18) { r = 2; z = (R() * 2 - 1) * 0.22; } else { r = Math.round(R() * 8) * 0.24 + 0.1 + (R() - 0.5) * 0.03; z = R() < 0.5 ? 0.22 : -0.22; }
        const a = R() * Math.PI * 2; coin[o] = Math.cos(a) * r; coin[o + 1] = Math.sin(a) * r; coin[o + 2] = z; }
    }
    return [cloud, knot, cube, globe, coin];
  }

  function startHero() {
    if (!window.THREE || !webglOk()) { document.body.classList.add('nogl'); return; }
    const canvas = $('#gl');
    const mobile = innerWidth < 900;
    const N = mobile ? 5200 : 10000;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    const px = Math.min(devicePixelRatio, 2);
    renderer.setPixelRatio(px);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    cam.position.set(0, 0, 9);

    const shapes = makeShapes(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(shapes[0], 3));
    shapes.forEach((s, i) => geo.setAttribute('s' + i, new THREE.BufferAttribute(s, 3)));
    const R = rng(99), rand = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) rand[i] = R();
    geo.setAttribute('aR', new THREE.BufferAttribute(rand, 4));

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uTime: { value: 0 }, uPx: { value: px }, uMix: { value: 0.3 }, uScale: { value: 1 } },
      vertexShader: `
        attribute vec3 s0; attribute vec3 s1; attribute vec3 s2; attribute vec3 s3; attribute vec3 s4; attribute vec4 aR;
        uniform float uT; uniform float uTime; uniform float uPx; uniform float uMix; uniform float uScale;
        varying vec3 vC; varying float vA;
        vec3 pick(float i){ if(i<0.5) return s0; if(i<1.5) return s1; if(i<2.5) return s2; if(i<3.5) return s3; return s4; }
        void main(){
          float k = min(floor(uT), 3.0); float f = uT >= 4.0 ? 1.0 : uT - floor(uT);
          float st = clamp(f * 1.7 - aR.x * 0.7, 0.0, 1.0); st = st * st * (3.0 - 2.0 * st);
          vec3 p = mix(pick(k), pick(k + 1.0), st);
          float w = uTime * 0.8;
          p += vec3(sin(w + aR.y * 6.2831), cos(w * 0.9 + aR.z * 6.2831), sin(w * 0.7 + aR.w * 6.2831)) * 0.045;
          float burst = sin(st * 3.14159) * 0.9; p += normalize(p + 0.0001) * burst * (0.3 + aR.x);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float size = 0.9 + aR.w * 1.5 + step(0.985, aR.y) * 2.2;
          gl_PointSize = size * uPx * uScale * (14.0 / -mv.z);
          float o = smoothstep(0.0, 1.0, aR.z + uMix - 0.3);
          vC = mix(vec3(0.95, 0.94, 0.9), vec3(1.0, 0.38, 0.2), o);
          vA = 0.42 + aR.w * 0.5;
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; if(a < 0.01) discard; gl_FragColor = vec4(vC, a); }`,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      mat.uniforms.uScale.value = clamp(h / 800, 0.6, 1.6);
    }
    addEventListener('resize', resize);
    resize();

    const mixPerStage = [0.25, 0.75, 0.45, 0.4, 0.8];
    let mx = 0, my = 0, tmx = 0, tmy = 0, t = progress, side = 0, time = 0, visible = true;
    if (finePointer) addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(build);

    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      if (!reduce) time += 0.016;
      t += (progress - t) * (reduce ? 1 : 0.075);
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      mat.uniforms.uT.value = t;
      mat.uniforms.uTime.value = time;
      const lo = Math.floor(t), fr = t - lo;
      mat.uniforms.uMix.value = mixPerStage[Math.min(lo, 4)] * (1 - fr) + mixPerStage[Math.min(lo + 1, 4)] * fr;
      const isMobile = innerWidth < 900;
      const sideT = isMobile ? 0 : ([1, 3].includes(Math.round(t)) || Math.round(t) === 0 ? 2.3 : -2.3);
      side += (sideT - side) * 0.06;
      const scale = isMobile ? 0.62 : 1;
      points.scale.setScalar(scale);
      points.position.set(side, isMobile ? 1.5 : 0, 0);
      points.rotation.y = time * 0.18 + t * 0.9 + mx * 0.6;
      points.rotation.x = -0.25 + t * 0.12 + my * 0.4;
      renderer.render(scene, cam);
    }
    frame();
  }
  function loadThree() {
    const t = document.createElement('script');
    t.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    t.onload = startHero;
    t.onerror = () => document.body.classList.add('nogl');
    document.head.appendChild(t);
  }
  if (document.readyState === 'complete') loadThree(); else addEventListener('load', loadThree);

  /* ---------- selected work ---------- */
  const WORK = [
    { n: 'Multi-chain payments', st: 'in testing', tag: 'Fintech infrastructure', sum: 'A multi-merchant crypto payment gateway: one checkout, four networks.',
      pts: ['ETH, Base, TRON and Solana behind a single API', 'Per-payment HD wallet derivation, automatic and manual sweeps with gas top-up', 'Merchant portal, webhooks and an internal ledger with withdrawal requests'],
      m: [['Networks', '4'], ['Stage', 'Testnet'], ['Model', 'Multi-merchant']] },
    { n: 'Mail infrastructure', st: 'running', tag: 'Self-hosted mail', sum: 'Business mail for several domains on servers I run, with the deliverability side handled.',
      pts: ['Postfix and Dovecot serving multiple domains from one host', 'One SAN certificate replaced a tangle of mismatched certificates', 'SPF, DKIM (2048-bit) and DMARC, plus an outbound relay and webmail'],
      m: [['Domains', '3+'], ['Protocols', 'IMAP · SMTP'], ['DKIM', '2048-bit']] },
    { n: 'AI tool launch page', st: 'built', tag: 'Launch page for a developer tool', sum: 'A launch page for an AI-agent developer tool, built around a 3D robot you can look at instead of a stock illustration.',
      pts: ['A Blender-made robot loaded as glTF, lit with an HDR environment and finished with a bloom pass', 'Animated backgrounds and scroll-driven reveals with GSAP, on smooth scrolling', 'A lighter path for phones: lower pixel ratio, bloom switched off, and a geometric stand-in if the model fails to load'],
      m: [['3D', 'glTF + HDR'], ['Motion', 'GSAP'], ['Mobile', 'Tuned']] },
    { n: '3D storytelling site', st: 'live', tag: 'Interactive web', sum: 'A studio site that behaves like an operating system: boot sequence, a 3D hardware deck and a showroom.',
      pts: ['A Stream Deck-style 3D hero that drives the whole interface', 'A showroom desktop with lazy-loaded video reels', 'Accent theming that recolors the UI, the glow and the video together'],
      m: [['Views', '3'], ['Scroll', 'None'], ['Mobile', 'Tuned']] },
    { n: 'sametkoch.com', st: 'live', tag: 'Photographer portfolio', sum: 'A portfolio gallery whose content the owner controls in real time.',
      pts: ['A React front end with hand-written CSS', 'A PHP API and admin panel behind it', 'A CDN with an image-resizing API tuned to each screen'],
      m: [['Front end', 'React'], ['API', 'PHP'], ['Images', 'Resized']], link: ['https://sametkoch.com', 'Visit sametkoch.com'] },
    { n: 'Industrial brand site', st: 'live', tag: 'Brand site, Latin America', sum: 'A Spanish-language site for a metal cutting and fabrication shop, in strict black and silver.',
      pts: ['An editorial layout with an interactive capabilities index that changes image and specs on hover', 'Staggered scroll reveals, a parallax banner, magnetic buttons and a count-up, all switched off for reduced motion', 'Self-hosted fonts, real shop photography and a blueprint-style detail layer'],
      m: [['Language', 'Spanish'], ['Palette', 'Black + silver'], ['Stack', 'HTML · CSS · JS']] },
    { n: 'Local service landing', st: 'live', tag: 'Google Ads and local SEO', sum: 'A one-page, mobile-first landing for a local taxi service in Türkiye, built to convert ad clicks into calls.',
      pts: ['A sticky call and WhatsApp bar, plus a WhatsApp order form that pre-fills the message', 'TaxiService, LocalBusiness and FAQPage structured data, sitemap and critical CSS inlined for speed', 'GA4 click events on every call and WhatsApp link, and a font fix so Turkish capitals render correctly'],
      m: [['Layout', 'Mobile-first'], ['Schema', '3 types'], ['Tracking', 'GA4 events']] },
    { n: 'Token launch sites', st: 'live', tag: 'Illustrated landing pages', sum: 'Playful, hand-drawn style landing pages for community tokens, built fast and kept light.',
      pts: ['A single long scroll with cartoon art, a copy-to-clipboard contract address and deep links to the exchange', 'An asset pipeline that turns generated illustrations into optimized, transparent web images', 'Careful legal copy so the page never implies an affiliation it does not have'],
      m: [['Format', 'One scroll'], ['Art', 'Illustrated'], ['Build', 'No framework']] },
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
    detail.innerHTML = `<div class="fade"><div class="tag">Case 0${cur + 1} · ${esc(w.tag)}</div><h3>${esc(w.n)}</h3><p class="sum">${esc(w.sum)}</p>
      <ul class="pts">${w.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <div class="metrics">${w.m.map((x) => `<div><small>${esc(x[0])}</small><b>${esc(x[1])}</b></div>`).join('')}</div>
      ${w.link ? `<p class="visit"><a class="btn btn-sm" href="${esc(w.link[0])}" rel="noopener">${esc(w.link[1])} ↗</a></p>` : ''}</div>`;
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
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { loadStatus(); o.disconnect(); setInterval(loadStatus, 60000); } }, { rootMargin: '200px' }).observe($('#statusCard'));

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
    return `<div class="ring"><svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="42" fill="none" stroke-width="8"/><circle class="fgc" cx="50" cy="50" r="42" fill="none" stroke-width="8" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-to="${C * (1 - score / 100)}" style="stroke:${color}"/></svg><b data-n="${score}">0</b></div>`;
  }
  const LABEL = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', info: 'INFO' };
  function countUp(el) {
    const to = +el.dataset.n, t0 = performance.now();
    (function tick(t) { const p = clamp((t - t0) / 1100, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); })(t0);
  }
  async function runCheck(domain) {
    mcOut.innerHTML = '<p class="mc-err" style="color:var(--mut)">Asking DNS…</p>';
    mcGo.disabled = true;
    try {
      const { runAll, dohResolver } = await engine();
      const rep = await runAll(domain, dohResolver());
      const bad = rep.checks.filter((c) => c.status === 'fail').length;
      mcOut.innerHTML = `<div class="mc-score">${ring(rep.score)}<div><h4>${esc(rep.domain)}: grade ${esc(rep.grade)}</h4><p>${bad ? bad + ' problem' + (bad > 1 ? 's' : '') + ' to fix' : 'No failing checks'}</p></div></div>
        <div class="mc-list">${rep.checks.map((c, i) => `<div class="mc-item" style="animation-delay:${i * 90}ms">${esc(c.title)}<span class="${c.status}">${LABEL[c.status]}</span></div>`).join('')}</div>
        <p class="mc-more"><a href="https://mailcheck.bilgen.dev/?d=${encodeURIComponent(rep.domain)}" rel="noopener">See every finding and the fix →</a></p>`;
      requestAnimationFrame(() => requestAnimationFrame(() => { $$('.fgc', mcOut).forEach((c) => { c.style.strokeDashoffset = c.dataset.to; }); $$('.ring b', mcOut).forEach(countUp); }));
    } catch (err) {
      mcOut.innerHTML = `<p class="mc-err">${esc(err.message || 'The check could not run.')} <a href="https://mailcheck.bilgen.dev/?d=${encodeURIComponent(domain)}" style="color:var(--ac)">Open the full tool →</a></p>`;
    } finally { mcGo.disabled = false; }
  }
  $('#mcForm').addEventListener('submit', (e) => { e.preventDefault(); if (mcInput.value.trim()) runCheck(mcInput.value.trim()); });
  $$('.try a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); mcInput.value = a.dataset.d; runCheck(a.dataset.d); }));
  // run once on its own when the card scrolls into view, so the page shows something alive
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); if (!mcInput.value) { mcInput.value = 'google.com'; runCheck('google.com'); } } }, { threshold: 0.35 }).observe($('#mailCard'));

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
