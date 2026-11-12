import * as THREE from 'three';
import { ROOMS, DOORS, WINDOWS, H, FLOOR_Y, BOUNDS } from '../data.js';
import { pbr, scaleUV } from './assets.js';

const CURTAIN = { hall: '#7b5a3c', majlis: '#6b2f3a', dining: '#8c7a52', family: '#4d5a6b', guest: '#6c7f78', core: '#7b5a3c', master: '#5a4a63', boys: '#2f4260', girls: '#c78aa0', kids: '#e2b84a', landing: '#7b5a3c' };
const GOLD = new THREE.MeshStandardMaterial({ color: 0xc9a14f, metalness: 0.9, roughness: 0.3 });
const CAP = new THREE.MeshStandardMaterial({ color: 0xf4eddd, roughness: 0.9 });
const TILE = 2.2;

const plane = (w, h, mat, uvTile = true) => { const g = new THREE.PlaneGeometry(w, h); if (uvTile) scaleUV(g, w / TILE, h / TILE); return new THREE.Mesh(g, mat); };
const box = (w, h, d, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent?.add(m); return m; };

/** يقسّم جداراً إلى قطع حول فتحات الأبواب */
function wallPieces({ axis, at, a, b, y, normalSign, openings, mat, H: height = H, parent }) {
  const ops = openings.filter((o) => o.pos > a && o.pos < b).sort((p, q) => p.pos - q.pos);
  const pieces = []; let cur = a;
  for (const o of ops) { pieces.push([cur, o.pos - o.w / 2, 0, height]); pieces.push([o.pos - o.w / 2, o.pos + o.w / 2, o.h, height]); cur = o.pos + o.w / 2; }
  pieces.push([cur, b, 0, height]);
  for (const [t0, t1, y0, y1] of pieces) {
    if (t1 - t0 < 0.02 || y1 - y0 < 0.02) continue;
    const m = plane(t1 - t0, y1 - y0, mat);
    const mid = (t0 + t1) / 2, ym = y + (y0 + y1) / 2;
    if (axis === 'z') { m.position.set(mid, ym, at); m.rotation.y = normalSign > 0 ? 0 : Math.PI; }
    else { m.position.set(at, ym, mid); m.rotation.y = normalSign > 0 ? Math.PI / 2 : -Math.PI / 2; }
    m.receiveShadow = true; parent.add(m);
  }
}

export function buildHouse({ mobile }) {
  const root = new THREE.Group();
  const ground = new THREE.Group(), upper = new THREE.Group(), exterior = new THREE.Group(), roof = new THREE.Group(), world = new THREE.Group();
  root.add(world, ground, upper, exterior, roof);
  const rooms = {}; const curtains = []; const windowAnchors = {};

  // ---- الأرض: عشب + فناء مرصوف حول الفيلا ----
  const lawnMat = pbr('aerial_grass_rock', { tint: new THREE.Color(0x9fb86f), normal: 0.8 }); const lawnG = new THREE.PlaneGeometry(260, 260); scaleUV(lawnG, 65, 65);
  const lawn = new THREE.Mesh(lawnG, lawnMat); lawn.rotation.x = -Math.PI / 2; lawn.position.y = -0.06; lawn.receiveShadow = true; world.add(lawn);
  const padMat = pbr('concrete_pavers', { tint: 0xe9dfcc }); const padG = new THREE.PlaneGeometry(27, 17); scaleUV(padG, 10, 6.5);
  const pad = new THREE.Mesh(padG, padMat); pad.rotation.x = -Math.PI / 2; pad.position.set(0, -0.03, 1); pad.receiveShadow = true; world.add(pad);

  // ---- الغرف: أرضيات وجدران وأسقف ----
  const wallMats = {};
  for (const r of ROOMS) {
    const [x0, x1, z0, z1] = r.r; const y = FLOOR_Y[r.f]; const grp = r.f === 'g' ? ground : upper;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const wm = pbr('painted_plaster_wall', { tint: new THREE.Color(r.wall), normal: 0.6 });
    wallMats[r.id] = wm;
    // الأرضية
    const fm = pbr(r.floor, { tint: r.floor === 'laminate_floor_02' ? 0xf2e3cf : 0xffffff, normal: 0.8, rough: 0.9 });
    let floor;
    if (r.id === 'landing') { // فتحة الدرج
      const s = new THREE.Shape(); s.moveTo(x0, -7); s.lineTo(x1, -7); s.lineTo(x1, 7); s.lineTo(x0, 7); s.closePath();
      const h = new THREE.Path(); h.moveTo(-2.2, 1.2); h.lineTo(-0.8, 1.2); h.lineTo(-0.8, 6.1); h.lineTo(-2.2, 6.1); h.closePath(); s.holes.push(h);
      const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); scaleUV(g, 1 / TILE, 1 / TILE); floor = new THREE.Mesh(g, fm); floor.position.set(0, y + 0.005, 0);
    } else { floor = plane(w, d, fm); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, y + 0.005, cz); }
    floor.receiveShadow = true; grp.add(floor);
    // السقف (يظهر من الداخل فقط)
    if (r.id !== 'core') { const c = plane(w, d, new THREE.MeshStandardMaterial({ color: 0xf6f0e3, roughness: 1 }), false); c.rotation.x = Math.PI / 2; c.position.set(cx, y + H, cz); grp.add(c); }
    // الجدران
    const edges = [
      { axis: 'z', at: z0, a: x0, b: x1, n: +1 }, { axis: 'z', at: z1, a: x0, b: x1, n: -1 },
      { axis: 'x', at: x0, a: z0, b: z1, n: +1 }, { axis: 'x', at: x1, a: z0, b: z1, n: -1 },
    ];
    for (const e of edges) {
      const openings = DOORS.filter((dr) => dr.f === r.f && dr.axis === e.axis && Math.abs(dr.at - e.at) < 0.01);
      wallPieces({ ...e, y, normalSign: e.n, openings, mat: wm, parent: grp });
      // حافة الجدار من فوق
      const len = e.b - e.a; const cap = e.axis === 'z' ? box(len, 0.1, 0.18, CAP, (e.a + e.b) / 2, y + H + 0.05, e.at, grp) : box(0.18, 0.1, len, CAP, e.at, y + H + 0.05, (e.a + e.b) / 2, grp);
      cap.castShadow = false;
    }
    // نقاط التقاط الغرفة (للنقر) + تمييز
    const pick = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, d - 0.3), new THREE.MeshBasicMaterial({ color: 0xd9b36c, transparent: true, opacity: 0, depthWrite: false }));
    pick.rotation.x = -Math.PI / 2; pick.position.set(cx, y + 0.06, cz); pick.userData.roomId = r.id; grp.add(pick);
    const items = new THREE.Group(); grp.add(items);
    rooms[r.id] = { def: r, center: new THREE.Vector3(cx, y, cz), size: [w, d], pick, items, variants: [], group: grp };
  }

  // ---- الدرج ----
  const stairMat = pbr('marble_tiles', { tint: 0xf3ead8 });
  for (let i = 0; i < 16; i++) {
    const top = (i + 1) * 0.225; const s = box(1.4, top, 0.3, stairMat, -1.5, top / 2, -1.45 - i * 0.3, ground); s.material = stairMat;
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, Math.hypot(4.8, 3.6)), GOLD);
  rail.position.set(-2.18, 1.8 + 0.95, -3.7); rail.rotation.x = Math.atan2(3.6, 4.8); ground.add(rail);
  rail.rotation.x = Math.atan2(3.6, 4.8); // يصعد باتجاه -z

  // ---- نوافذ داخلية + ستائر، ونوافذ خارجية ----
  const sky = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#cfe3f5'); gr.addColorStop(1, '#fff6dc'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return c; })());
  sky.colorSpace = THREE.SRGBColorSpace;
  const glowMat = new THREE.MeshBasicMaterial({ map: sky, toneMapped: false });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1f2a36, metalness: 0.6, roughness: 0.15 });
  const fabric = (hex) => pbr('quatrefoil_jacquard_fabric', { tint: new THREE.Color(hex), side: THREE.FrontSide, normal: 0.8 });
  const sideInfo = { s: { axis: 'z', at: BOUNDS.z1, n: -1 }, n: { axis: 'z', at: BOUNDS.z0, n: +1 }, e: { axis: 'x', at: BOUNDS.x1, n: -1 }, w: { axis: 'x', at: BOUNDS.x0, n: +1 } };
  function curtainPair(wd, hd, mat) {
    const g = new THREE.Group(); const items = [];
    const mk = (cw, ox) => { const geo = new THREE.PlaneGeometry(cw, hd, 60, 1); scaleUV(geo, cw / 0.9, hd / 0.9); const base = geo.attributes.position.array.slice(); const m = new THREE.Mesh(geo, mat); m.position.set(ox, hd / 2, 0); g.add(m); items.push({ geo, base, cw }); };
    mk(wd / 2, -wd / 4); mk(wd / 2, wd / 4);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, wd + 0.3, 10), GOLD); rod.rotation.z = Math.PI / 2; rod.position.set(0, hd + 0.05, 0.04); g.add(rod);
    return { g, items };
  }
  for (const win of WINDOWS) {
    const si = sideInfo[win.side]; const y = FLOOR_Y[win.f]; const g = new THREE.Group();
    const rot = si.axis === 'z' ? (si.n > 0 ? 0 : Math.PI) : (si.n > 0 ? Math.PI / 2 : -Math.PI / 2);
    g.rotation.y = rot; const off = 0.03; // داخل الغرفة
    if (si.axis === 'z') g.position.set(win.pos, y, si.at + si.n * off); else g.position.set(si.at + si.n * off, y, win.pos);
    const wd = win.w, wh = 1.7;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(wd, wh), glowMat); glow.position.y = 1.0 + wh / 2; g.add(glow);
    box(wd + 0.12, 0.07, 0.08, GOLD, 0, 1.0 + wh + 0.03, 0.03, g); box(wd + 0.12, 0.07, 0.08, GOLD, 0, 0.98, 0.03, g);
    box(0.05, wh, 0.05, GOLD, 0, 1.0 + wh / 2, 0.03, g); box(0.05, wh, 0.05, GOLD, -wd / 2, 1.0 + wh / 2, 0.03, g); box(0.05, wh, 0.05, GOLD, wd / 2, 1.0 + wh / 2, 0.03, g);
    // ستارة (حسب الغرفة)
    const pt = si.axis === 'z' ? new THREE.Vector2(win.pos, si.at - si.n * 0.5) : new THREE.Vector2(si.at - si.n * 0.5, win.pos);
    const room = ROOMS.find((r) => r.f === win.f && pt.x > r.r[0] && pt.x < r.r[1] && pt.y > r.r[2] && pt.y < r.r[3]);
    const cm = fabric(CURTAIN[room?.id] || '#7b5a3c'); const cp = curtainPair(wd + 0.5, 2.7, cm); cp.g.position.set(0, 0.35, 0.1); g.add(cp.g); curtains.push(cp);
    (win.f === 'g' ? ground : upper).add(g);
    if (room && !windowAnchors[room.id]) windowAnchors[room.id] = new THREE.Vector3().setFromMatrixPosition((g.updateMatrixWorld(true), new THREE.Matrix4().makeTranslation(g.position.x, y + 2.9, g.position.z)));
    // الواجهة الخارجية: زجاج + إطار
    const eg = new THREE.Group(); eg.rotation.y = rot + Math.PI;
    if (si.axis === 'z') eg.position.set(win.pos, y, si.at - si.n * 0.04); else eg.position.set(si.at - si.n * 0.04, y, win.pos);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(wd, wh), glassMat); gl.position.y = 1.0 + wh / 2; eg.add(gl);
    box(wd + 0.3, 0.1, 0.12, new THREE.MeshStandardMaterial({ color: 0xd8c8a6, roughness: 0.9 }), 0, 1.0 + wh + 0.08, -0.02, eg); box(wd + 0.3, 0.1, 0.14, new THREE.MeshStandardMaterial({ color: 0xd8c8a6, roughness: 0.9 }), 0, 0.92, -0.04, eg);
    box(0.06, wh, 0.06, GOLD, 0, 1.0 + wh / 2, -0.02, eg);
    exterior.add(eg);
  }

  // ---- الواجهة الخارجية (تظهر في المقدمة فقط) ----
  const facade = pbr('beige_wall_001', { tint: 0xf0e2c4, normal: 0.7 });
  const totalH = FLOOR_Y.u + H;
  wallPieces({ axis: 'z', at: BOUNDS.z1 + 0.0, a: -11, b: 11, y: 0, normalSign: +1, openings: [{ pos: 0, w: 2.0, h: 2.7 }], mat: facade, H: totalH, parent: exterior });
  wallPieces({ axis: 'z', at: BOUNDS.z0, a: -11, b: 11, y: 0, normalSign: -1, openings: [], mat: facade, H: totalH, parent: exterior });
  wallPieces({ axis: 'x', at: BOUNDS.x1, a: -7, b: 7, y: 0, normalSign: +1, openings: [], mat: facade, H: totalH, parent: exterior });
  wallPieces({ axis: 'x', at: BOUNDS.x0, a: -7, b: 7, y: 0, normalSign: -1, openings: [], mat: facade, H: totalH, parent: exterior });
  const trim = new THREE.MeshStandardMaterial({ color: 0xe0d0ae, roughness: 0.85 });
  box(22.6, 0.25, 0.4, trim, 0, 3.5, 7.1, exterior); box(22.6, 0.4, 0.5, trim, 0, totalH, 7.1, exterior);
  box(22.6, 0.25, 0.4, trim, 0, 3.5, -7.1, exterior); box(22.6, 0.4, 0.5, trim, 0, totalH, -7.1, exterior);
  box(0.5, 0.4, 14.6, trim, 11.05, totalH, 0, exterior); box(0.5, 0.4, 14.6, trim, -11.05, totalH, 0, exterior);
  // مدخل: أعمدة وكنب
  const colMat = pbr('beige_wall_001', { tint: 0xf4e9d2 });
  for (const x of [-1.9, 1.9]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.6, 24), colMat); c.position.set(x, 1.8, 8.6); c.castShadow = true; exterior.add(c); box(0.7, 0.2, 0.7, trim, x, 3.7, 8.6, exterior); box(0.8, 0.2, 0.8, trim, x, 0.1, 8.6, exterior); }
  box(5.4, 0.35, 2.8, trim, 0, 3.9, 8.5, exterior); box(5.6, 0.12, 3.0, GOLD, 0, 4.1, 8.5, exterior);
  for (let i = 0; i < 3; i++) box(5 - i * 0.2, 0.12, 1.4 - i * 0.3 + 1.4, new THREE.MeshStandardMaterial({ color: 0xe2d6bd, roughness: 0.9 }), 0, 0.06 + i * 0.0, 8.0 + i * 0.9, exterior).position.y = 0.06 - i * 0.02;
  // لوحة "نور" فوق الباب
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 256; const sg = sc.getContext('2d');
  const signTex = new THREE.CanvasTexture(sc); signTex.colorSpace = SRGB;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false, toneMapped: false })); sign.position.set(0, 3.25, 7.12); exterior.add(sign);
  const drawSign = () => { sg.clearRect(0, 0, 512, 256); sg.fillStyle = '#d9b36c'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.font = '700 190px "Aref Ruqaa","Tajawal",serif'; sg.direction = 'rtl'; sg.fillText('نور', 256, 135); signTex.needsUpdate = true; };
  drawSign(); document.fonts?.ready.then(drawSign);

  // الباب الرئيسي (ورقتان)
  const doorMat = pbr('dark_wood', { tint: 0xd9b89a });
  const makeLeaf = (sign) => { const p = new THREE.Group(); p.position.set(sign * 1.0, 0, 7.0); const L = new THREE.Group(); L.position.x = -sign * 0.5; p.add(L); box(0.98, 2.68, 0.09, doorMat, 0, 1.34, 0, L); box(0.62, 1.0, 0.04, doorMat, 0, 1.9, 0.06, L); box(0.62, 1.0, 0.04, doorMat, 0, 0.75, 0.06, L); box(0.04, 0.5, 0.05, GOLD, -sign * 0.4, 1.2, 0.08, L); ground.add(p); return p; };
  const doorL = makeLeaf(-1), doorR = makeLeaf(+1);
  box(2.2, 0.12, 0.3, GOLD, 0, 2.76, 7.0, ground); box(0.1, 2.7, 0.3, GOLD, -1.05, 1.35, 7.0, ground); box(0.1, 2.7, 0.3, GOLD, 1.05, 1.35, 7.0, ground);
  const setDoor = (t) => { const a = 1.85 * t; doorL.rotation.y = a; doorR.rotation.y = -a; };

  // السطح
  box(23, 0.4, 15, trim, 0, totalH + 0.2, 0, roof); box(23, 0.5, 0.3, trim, 0, totalH + 0.65, 7.35, roof); box(23, 0.5, 0.3, trim, 0, totalH + 0.65, -7.35, roof);
  box(0.3, 0.5, 14.4, trim, 11.35, totalH + 0.65, 0, roof); box(0.3, 0.5, 14.4, trim, -11.35, totalH + 0.65, 0, roof);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9a14f, metalness: 0.85, roughness: 0.32 }));
  dome.position.set(0, totalH + 0.4, 0); roof.add(dome);

  // ---- أنيميشن الستائر ----
  const updateCurtains = (t) => curtains.forEach((c) => c.items.forEach((it) => {
    const p = it.geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = it.base[i]; p[i + 2] = 0.06 * Math.sin((x / it.cw) * 7 * Math.PI * 2) + 0.012 * Math.sin(t * 1.1 + x * 3 + it.base[i + 1] * 0.8); }
    it.geo.attributes.position.needsUpdate = true;
  }));
  updateCurtains(0);

  return { root, ground, upper, exterior, roof, world, rooms, setDoor, updateCurtains, windowAnchors };
}
const SRGB = THREE.SRGBColorSpace;
