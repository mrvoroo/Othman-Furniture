import './style.css';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { ROOMS, FLOOR_Y, H, INFO, DESIGNS } from './data.js';
import { buildHouse } from './world/house.js';
import { buildDesign } from './world/furniture.js';
import { buildGarden } from './world/garden.js';
import { Rig } from './world/rig.js';
import { setAniso } from './world/assets.js';
import { waLink } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 760;

$('#fab').href = waLink('السلام عليكم، أبي أحجز استشارة مع نور');
$('#waMain').href = waLink('السلام عليكم، أبي أحجز استشارة مع نور');
$$('[data-service]').forEach((a) => a.addEventListener('click', () => { $('select[name=service]').value = a.dataset.service; }));
initForm();

/* ============ المشهد ============ */
const canvas = $('#gl');
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
if (!webglOK()) { $('#loader').classList.add('done'); $('#tour').style.height = '100vh'; $('.chapter').classList.add('on'); } else boot();

function boot() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2); renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  setAniso(Math.min(renderer.capabilities.getMaxAnisotropy(), mobile ? 4 : 8));

  const scene = new THREE.Scene();
  const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256; const sg = skyC.getContext('2d'); const gr = sg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2b3a63'); gr.addColorStop(0.5, '#c98f78'); gr.addColorStop(0.8, '#f1c993'); gr.addColorStop(1, '#f6dcae'); sg.fillStyle = gr; sg.fillRect(0, 0, 4, 256);
  const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace; scene.background = skyT;
  scene.fog = new THREE.Fog(0xf0cf9f, 90, 230);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 300);
  const rig = new Rig(camera);

  new RGBELoader().load(import.meta.env.BASE_URL + 'hdr/brown_photostudio_02.' + (window.__BIN_EXT__ || 'hdr'), (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture; scene.environmentIntensity = 1.0; ready.hdr = true; maybeReady();
  });
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x8a7358, 0.35));
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.1); sun.position.set(-4, 14, 10); scene.add(sun, sun.target);

  const house = buildHouse({ mobile }); scene.add(house.root);
  const garden = buildGarden(house.world, { mobile });
  const ctx = { updatables: [], pops: [] };
  const roomsById = house.rooms;

  /* ---------- حالة التطبيق ---------- */
  const S = { mode: 'intro', floor: 'g', room: null, design: 0, hotIdx: -1, p: 0, sp: 0, yaw: 0, pitch: 0, dyaw: 0, dpitch: 0, focus: null };
  const ready = { hdr: false, first: false };
  function maybeReady() { if (ready.hdr && ready.first) { $('#loader').classList.add('done'); } }

  /* ---------- أماكن الكاميرا ---------- */
  const aspectK = () => (camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.95 : 1);
  const planView = (floor) => { const y = floor === 'u' ? FLOOR_Y.u : 0; const k = aspectK(); return { pos: new THREE.Vector3(0, y + 25 * k, 18 * k + 2), tgt: new THREE.Vector3(0, y, 0.5) }; };
  const roomDir = (r) => new THREE.Vector3(r.def.cam[0], 0, r.def.cam[1]).normalize();
  function roomView(r, yaw = 0, pitch = 0) {
    const R = Math.max(r.size[0], r.size[1]); const dist = (R * 0.86 + 2.6) * aspectK() * (r.def.id === 'hall' || r.def.id === 'landing' ? 1.15 : 1);
    const el = THREE.MathUtils.degToRad(44 + pitch); const dir = roomDir(r).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const tgt = r.center.clone().add(new THREE.Vector3(0, 0.7, 0));
    const pos = tgt.clone().add(new THREE.Vector3(dir.x * Math.cos(el) * dist, Math.sin(el) * dist, dir.z * Math.cos(el) * dist));
    return { pos, tgt };
  }
  function itemView(r, it) {
    const dir = roomDir(r); const rad = Math.max(it.size.x, it.size.y, it.size.z); const dist = rad * 1.5 + 1.8 * aspectK(); const el = THREE.MathUtils.degToRad(22);
    const tgt = it.center.clone(); const pos = tgt.clone().add(new THREE.Vector3(dir.x * Math.cos(el) * dist, Math.sin(el) * dist + 0.3, dir.z * Math.cos(el) * dist));
    return { pos, tgt };
  }

  /* مسار المقدمة (سينمائي): خارج → الباب → المدخل → يرتفع للخريطة */
  const kfPos = [[-7, 3.4, 47], [3.4, 2.6, 33], [3.6, 2.0, 21], [1.4, 1.7, 12.8], [0, 1.7, 7.8], [0, 1.65, 3.2], [0, 1.9, 0.2], [0, 4.0, 1.5], [0, 12, 6]];
  const kfTgt = [[0, 3.2, 0], [0, 2.6, 0], [0, 2.2, 0], [0, 1.9, 0], [0, 1.6, -2], [0, 1.5, -5], [0, 1.2, -6], [0, 0.5, -1], [0, 0, 0.5]];
  const posCurve = new THREE.CatmullRomCurve3(kfPos.map((v) => new THREE.Vector3(...v)), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(kfTgt.map((v) => new THREE.Vector3(...v)), false, 'centripetal');
  // مسار ما بعد الفيديو: من داخل المدخل يرتفع مباشرة إلى خريطة الفيلا
  const posCurveV = new THREE.CatmullRomCurve3([[0, 1.65, 5.6], [0, 1.9, 2.4], [0, 5.5, 4.0], [0, 12, 8]].map((v) => new THREE.Vector3(...v)), false, 'centripetal');
  const tgtCurveV = new THREE.CatmullRomCurve3([[0, 1.6, -3], [0, 1.4, -4], [0, 0.6, -1], [0, 0, 0.5]].map((v) => new THREE.Vector3(...v)), false, 'centripetal');
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ---------- تحميل التصاميم ---------- */
  const designs = {}; // id -> [ {group,hot,name} ]
  const pending = {};
  async function ensureDesign(id, idx) {
    designs[id] = designs[id] || []; if (designs[id][idx]) return designs[id][idx];
    const key = id + idx; if (pending[key]) return pending[key];
    pending[key] = buildDesign(roomsById[id], idx, ctx).then((d) => { designs[id][idx] = d; roomsById[id].items.add(d.group); d.group.visible = (S.room === id && S.design === idx) || (!S.room && idx === 0); return d; });
    return pending[key];
  }
  // تحميل التصاميم الأولى في الخلفية: الدور الأرضي أولاً ثم العلوي
  const order = [...ROOMS.filter((r) => r.f === 'g'), ...ROOMS.filter((r) => r.f === 'u')];
  let loaded = 0; const total = order.length;
  (async () => {
    for (const r of order) { await ensureDesign(r.id, 0); loaded++; const b = $('#loadBar'); if (b) b.style.width = Math.round((loaded / total) * 100) + '%'; const pl = $('#pillLoad'); pl.hidden = loaded >= total; pl.textContent = `تجهيز الأثاث ${loaded}/${total}`; if (loaded === 3) { ready.first = true; maybeReady(); } shadowDirty = true; }
  })();

  /* ---------- واجهة الاختيار ---------- */
  const labels = $('#labels'), hotBox = $('#hot');
  const navRooms = ROOMS.filter((r) => r.nav);
  const roomListEl = $('#roomList');
  function renderRoomList() {
    roomListEl.innerHTML = ''; labels.innerHTML = '';
    navRooms.filter((r) => r.f === S.floor).forEach((r) => {
      const b = document.createElement('button'); b.textContent = r.name; b.onclick = () => selectRoom(r.id); roomListEl.appendChild(b);
      const l = document.createElement('button'); l.className = 'rl'; l.textContent = r.name; l.dataset.id = r.id; l.onclick = () => selectRoom(r.id); labels.appendChild(l);
    });
  }
  $$('#planUI .floors button').forEach((b) => b.onclick = () => setFloor(b.dataset.floor));
  function setFloor(f) { S.floor = f; $$('#planUI .floors button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.floor === f)); renderRoomList(); }
  renderRoomList();

  let hotEls = []; // [{el, anchor, item}]
  function clearHot() { hotBox.innerHTML = ''; hotEls = []; }
  function selectRoom(id, designIdx = 0) {
    const r = roomsById[id]; S.mode = 'room'; S.room = id; S.floor = r.def.f; S.design = designIdx; S.yaw = S.pitch = S.dyaw = S.dpitch = 0; S.focus = null; S.hotIdx = -1;
    $('#card').hidden = true; setFloor(r.def.f); fillRoomUI(r); showDesign(id, designIdx);
  }
  async function showDesign(id, idx) {
    const r = roomsById[id]; S.design = idx;
    $$('#designList button').forEach((b, i) => b.setAttribute('aria-pressed', i === idx));
    const d = await ensureDesign(id, idx); if (S.room !== id || S.design !== idx) return;
    (designs[id] || []).forEach((x, i) => { if (x) x.group.visible = i === idx; });
    // نقاط التعريف
    clearHot(); let n = 1;
    const list = d.hot.slice(); const wa = house.windowAnchors[id]; if (wa) list.push({ key: '_curtain', anchor: wa, center: wa, size: new THREE.Vector3(2.5, 2.5, 1) });
    list.forEach((it) => { const el = document.createElement('button'); el.className = 'hs'; el.textContent = '+'; el.setAttribute('aria-label', (INFO[it.key] || ['قطعة'])[0]); el.onclick = (e) => { e.stopPropagation(); S.hotIdx = list.indexOf(it); focusItem(it); }; hotBox.appendChild(el); hotEls.push({ el, it }); });
    S.hotList = list; fitShadow(r); shadowDirty = true;
    $('#orderBtn').href = waLink(`السلام عليكم، عجبني تصميم "${d.name}" لـ${r.def.name} من نور، أبي أعرف التفاصيل وأحجز زيارة.`);
  }
  function fillRoomUI(r) {
    $('#rName').textContent = r.def.name; $('#rBlurb').textContent = r.def.blurb || '';
    const dl = $('#designList'); dl.innerHTML = '';
    (DESIGNS[r.def.id] || []).forEach((d, i) => { const b = document.createElement('button'); b.textContent = d.name; b.onclick = () => { S.focus = null; $('#card').hidden = true; showDesign(r.def.id, i); }; dl.appendChild(b); });
    $('.designs').style.display = (DESIGNS[r.def.id] || []).length > 1 ? '' : 'none';
  }
  function focusItem(it) {
    S.focus = it; const info = INFO[it.key] || ['قطعة', '', '']; const r = roomsById[S.room];
    $('#cTitle').textContent = info[0]; $('#cMat').textContent = info[1]; $('#cText').textContent = info[2];
    $('#cOrder').href = waLink(`السلام عليكم، أبي أستفسر عن "${info[0]}" (${info[1]}) في ${r.def.name} من معرض نور.`);
    $('#card').hidden = false;
  }
  const REAL = { hall: 'المدخل', majlis: 'مجلس/صالة', dining: 'غرفة طعام', family: 'غرفة معيشة', guest: 'غرفة ضيوف', master: 'غرفة نوم رئيسية', boys: 'غرفة شباب', girls: 'غرفة نوم', kids: 'غرفة صغيرة' };
  $('#realBtn').onclick = () => { const id = S.room; if (!REAL[id]) return; const v = $('#realVid'); const B = import.meta.env.BASE_URL; v.poster = `${B}media/rooms/${id}.jpg`; v.src = `${B}media/rooms/${id}.mp4`; $('#realCap').textContent = `لقطة حقيقية لغرفة مشابهة (${REAL[id]}) — للاستلهام، وغرفتك تُفصَّل على مقاسك`; $('#realBox').hidden = false; v.play().catch(() => {}); };
  $('#realX').onclick = () => { $('#realBox').hidden = true; $('#realVid').pause(); };
  $('#cardX').onclick = () => { $('#card').hidden = true; S.focus = null; };
  $('#cNext').onclick = () => { const l = S.hotList || []; if (!l.length) return; S.hotIdx = (S.hotIdx + 1) % l.length; focusItem(l[S.hotIdx]); };
  $('#tourBtn').onclick = () => { const l = S.hotList || []; if (!l.length) return; S.hotIdx = (S.hotIdx + 1) % l.length; focusItem(l[S.hotIdx]); };
  $('#backBtn').onclick = () => { S.mode = 'plan'; S.room = null; S.focus = null; $('#card').hidden = true; clearHot(); (Object.keys(designs)).forEach((id) => designs[id].forEach((d, i) => d && (d.group.visible = i === 0))); sun.castShadow = false; };

  /* ---------- الظل ---------- */
  let shadowDirty = true; let lastShadowRoom = null;
  function fitShadow(r) {
    const R = Math.max(r.size[0], r.size[1]) * 0.78; const c = r.center;
    sun.position.set(c.x - 3, c.y + 12, c.z + 5); sun.target.position.copy(c);
    const cam = sun.shadow.camera; cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.near = 1; cam.far = 30; cam.updateProjectionMatrix();
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    if (lastShadowRoom !== r.def.id) { sun.shadow.map?.dispose(); sun.shadow.map = null; lastShadowRoom = r.def.id; }
    sun.castShadow = true;
  }

  /* ---------- التفاعل: سحب للتدوير + نقر لاختيار غرفة ---------- */
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let down = null;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, yaw: S.dyaw, pitch: S.dpitch, moved: false }; });
  addEventListener('pointermove', (e) => {
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
    if (S.mode === 'room' && !S.focus && down.moved) { S.dyaw = clamp(down.yaw - dx * 0.006, -1.0, 1.0); if (e.pointerType === 'mouse') S.dpitch = clamp(down.pitch + dy * 0.12, -12, 18); }
  });
  addEventListener('pointerup', (e) => {
    const d = down; down = null; if (!d || d.moved || S.mode !== 'plan') return;
    const rc = canvas.getBoundingClientRect(); ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const picks = navRooms.filter((r) => r.f === S.floor).map((r) => roomsById[r.id].pick);
    const hit = ray.intersectObjects(picks, false)[0]; if (hit) selectRoom(hit.object.userData.roomId);
  });

  /* ---------- التمرير ---------- */
  const tour = $('#tour'); const bar = $('#progressBar'), hint = $('#hint');
  const calc = () => { const r = tour.getBoundingClientRect(); const tot = r.height - innerHeight; S.p = tot > 0 ? clamp(-r.top / tot) : 0; };
  addEventListener('scroll', calc, { passive: true }); calc(); S.sp = S.p;
  let visible = true; new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(tour);
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 0.8 ? 58 : 44; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', () => { resize(); calc(); });

  /* مقدمة بفيديو حقيقي: السكرول يحرّك الفيديو، ثم ينتقل للبيت ثلاثي الأبعاد */
  const vid = $('#introVid'); let VIDEO = false; const VP = 0.40; let lastVT = -1;
  (async () => {
    const BASE = import.meta.env.BASE_URL; const src = BASE + (mobile ? 'media/intro-m.mp4' : 'media/intro.mp4');
    try {
      const h = await fetch(src, { method: 'HEAD' }); if (!h.ok || !(h.headers.get('content-type') || '').includes('video')) return;
      vid.src = src; vid.poster = BASE + 'media/intro-poster.jpg'; vid.load();
      await new Promise((res, rej) => { vid.onloadedmetadata = res; vid.onerror = rej; setTimeout(rej, 15000); });
      VIDEO = true;
    } catch { VIDEO = false; }
  })();
  const chapters = $$('.chapter'); const planUI = $('#planUI'), roomUI = $('#roomUI');
  const v3 = new THREE.Vector3();
  let prev = performance.now(), slow = 0, firstFrame = true, lastMode = '';
  const PLAN_AT = 0.72;

  const manual = location.search.includes('manual');
  function frame(now, doRender = true) {
    if (!manual) requestAnimationFrame(frame);
    if (!visible || document.hidden) { prev = now; return; }
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now; const t = now / 1000;
    S.sp += (S.p - S.sp) * (1 - Math.exp(-dt * 5)); if (Math.abs(S.p - S.sp) < 1e-5) S.sp = S.p;

    if (S.mode !== 'room') S.mode = S.sp >= PLAN_AT ? 'plan' : 'intro';
    const q = clamp(S.sp / PLAN_AT);

    // الظهور
    const intro = S.mode === 'intro';
    const vOn = VIDEO && intro && S.sp < VP + 0.08;
    house.exterior.visible = intro && !VIDEO && q < 0.58; house.roof.visible = intro && !VIDEO && q < 0.58;
    const showUpper = S.mode !== 'intro' && S.floor === 'u';
    house.upper.visible = showUpper; house.ground.visible = true;
    house.setDoor(VIDEO ? 1 : sstep(0.18, 0.4, q));
    vid.classList.toggle('on', vOn); if (vOn) { vid.style.opacity = String(1 - sstep(VP, VP + 0.07, S.sp)); const dur = vid.duration || 12; const tt = clamp(S.sp / VP) * (dur - 0.05); if (Math.abs(tt - lastVT) > 0.02 && !vid.seeking) { vid.currentTime = tt; lastVT = tt; } } else vid.style.opacity = '0';

    // الكاميرا
    if (S.mode === 'intro') {
      const ql = VIDEO ? clamp((S.sp - VP) / (PLAN_AT - VP)) : q; const ct = ql * 0.999;
      const pp = (VIDEO ? posCurveV : posCurve).getPoint(ct), tt = (VIDEO ? tgtCurveV : tgtCurve).getPoint(ct);
      if (ql > 0.8) { const pv = planView('g'); const k = sstep(0.8, 1, ql); pp.lerp(pv.pos, k); tt.lerp(pv.tgt, k); } // يطابق الخريطة تماماً
      rig.set(pp, tt, true); rig.update(dt);
    } else if (S.mode === 'plan') { const pv = planView(S.floor); rig.set(pv.pos, pv.tgt); rig.update(dt, 2.6); }
    else {
      const r = roomsById[S.room]; S.yaw += (S.dyaw - S.yaw) * (1 - Math.exp(-dt * 6)); S.pitch += (S.dpitch - S.pitch) * (1 - Math.exp(-dt * 6));
      const view = S.focus ? itemView(r, S.focus) : roomView(r, S.yaw, S.pitch); rig.set(view.pos, view.tgt); rig.update(dt, S.focus ? 2.6 : 3.2);
    }

    // الواجهة
    if (lastMode !== S.mode) { planUI.hidden = S.mode !== 'plan'; roomUI.hidden = S.mode !== 'room'; labels.style.display = S.mode === 'plan' ? '' : 'none'; hotBox.style.display = S.mode === 'room' ? '' : 'none'; lastMode = S.mode; }
    chapters.forEach((c) => c.classList.toggle('on', S.mode === 'intro' && q >= +c.dataset.from * 1 && q <= +c.dataset.to * 1 / 1));
    hint.style.opacity = S.sp > 0.02 ? 0 : 1; bar.style.transform = `scaleX(${S.sp})`;

    // علامات الغرف والنقاط الساخنة
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const project = (p, el) => { v3.copy(p).project(camera); const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1; el.style.display = vis ? '' : 'none'; if (vis) el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px,${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`; };
    if (S.mode === 'plan') $$('.rl', labels).forEach((el) => { const r = roomsById[el.dataset.id]; project(v3.set(r.center.x, r.center.y + 0.9, r.center.z).clone(), el); el.style.left = 0; el.style.top = 0; });
    if (S.mode === 'room') hotEls.forEach(({ el, it }) => { project(it.anchor, el); el.style.left = 0; el.style.top = 0; });

    // حركة
    house.updateCurtains(t); garden.anim(t);
    ctx.updatables.forEach((u) => { u.t += dt; if (u.t >= u.every) { u.t = 0; u.fn(t); } });
    for (let i = ctx.pops.length - 1; i >= 0; i--) { const o = ctx.pops[i]; o.userData.pop += dt * 2.4; const k = clamp(o.userData.pop - (o.id % 7) * 0.04); const e = 1 - Math.pow(1 - k, 3); o.scale.setScalar(Math.max(0.001, e)); if (k >= 1) ctx.pops.splice(i, 1); }
    if (ctx.pops.length || shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }

    if (doRender) renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; ready.first = ready.first || false; }
    if (dt > 0.034) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 50 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); slow = 0; resize(); }
  }
  if (!manual) requestAnimationFrame(frame);
  let fake = performance.now();
  const step = (frames = 40, dt = 50) => { for (let i = 0; i < frames; i++) { fake += dt; frame(fake, i === frames - 1); } return canvas.toDataURL('image/jpeg', 0.85); };
  setTimeout(() => { ready.first = true; maybeReady(); }, 6000);
  window.__noor = { step, shot: () => step(40, 50), S, selectRoom, setFloor, showDesign, scene, camera, house };
}

/* ============ نموذج التواصل ============ */
function initForm() {
  const form = $('#form'), status = $('#status');
  const LABEL = { consultation: 'حجز استشارة', free_visit: 'زيارة منزلية مجانية', fabrics: 'معاينة الأقمشة', quote: 'تسعيرة بالمقاسات', other: 'استفسار' };
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(form)); if (d.website) return;
    status.className = 'status'; status.textContent = '';
    if (!d.name.trim() || d.phone.replace(/\D/g, '').length < 7) { status.classList.add('err'); status.textContent = 'فضلاً اكتب الاسم ورقم جوال صحيح.'; return; }
    const btn = $('button[type=submit]', form); btn.disabled = true;
    const msg = `السلام عليكم، أنا ${d.name}\nالطلب: ${LABEL[d.service]}\n${d.area ? 'المنطقة: ' + d.area + '\n' : ''}${d.size ? 'المقاسات: ' + d.size + '\n' : ''}${d.message || ''}`.trim();
    try {
      const r = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); if (!r.ok) throw new Error('x');
      status.classList.add('ok'); status.innerHTML = 'وصلنا طلبك، بنتواصل معك قريب 🌿 <a href="' + waLink(msg) + '" target="_blank" rel="noopener" style="text-decoration:underline">أو كمّل معنا عبر واتساب</a>'; form.reset();
    } catch { status.classList.add('err'); status.textContent = 'تعذر الإرسال الآن، سنفتح واتساب لإكمال طلبك.'; open(waLink(msg), '_blank'); }
    finally { btn.disabled = false; }
  });
}
