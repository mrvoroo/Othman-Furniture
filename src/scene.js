import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const FABRICS = [
  { name: 'أخضر زيتي', hex: '#6f8f86' },
  { name: 'طوبي', hex: '#c0674a' },
  { name: 'كحلي', hex: '#2f4a63' },
  { name: 'رملي', hex: '#d6c3a0' },
  { name: 'عنابي', hex: '#7a3b4a' },
  { name: 'فحمي', hex: '#3b3a38' },
];

const W = 5; // half width of the house
const H = 3.2;
const GOLD = 0xc9a14f;

/* ---------- procedural textures ---------- */
function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const weaveTex = () => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 3) { g.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.07})`; g.fillRect(i, 0, 1.4, h); }
  for (let j = 0; j < h; j += 3) { g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`; g.fillRect(0, j, w, 1.4); }
}, [3, 3]);
const woodTex = (rep) => canvasTex(256, 256, (g, w, h) => {
  const pl = 4, ph = h / pl;
  for (let i = 0; i < pl; i++) {
    const l = 48 + Math.random() * 8;
    g.fillStyle = `hsl(28 ${35 + Math.random() * 8}% ${l}%)`; g.fillRect(0, i * ph, w, ph);
    for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(60,35,15,${Math.random() * 0.12})`; g.beginPath(); const y = i * ph + Math.random() * ph; g.moveTo(0, y); g.lineTo(w, y + (Math.random() - .5) * 3); g.stroke(); }
    g.fillStyle = 'rgba(40,22,8,.45)'; g.fillRect(0, i * ph, w, 1.5);
  }
}, rep);
const rugTex = (base, accent, rep = [1, 1]) => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
  g.lineWidth = 2; g.strokeRect(34, 34, w - 68, h - 68);
  g.save(); g.translate(w / 2, h / 2);
  for (let r = 190; r > 20; r -= 38) {
    g.strokeStyle = accent; g.globalAlpha = r % 76 ? 0.55 : 0.9; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); g.stroke();
  }
  g.globalAlpha = 1; g.fillStyle = accent; g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); g.restore();
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}, rep);
const blobTex = () => canvasTex(128, 128, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
}, [1, 1], false);
const skyTex = () => canvasTex(8, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#171d3b'); gr.addColorStop(.45, '#5a4a6e'); gr.addColorStop(.75, '#d79a6c'); gr.addColorStop(1, '#f0c58c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, [1, 1]);
export function textTex(text, color = '#d9b36c', size = 220) {
  return canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${size}px "Aref Ruqaa","Tajawal",serif`; g.direction = 'rtl'; g.fillText(text, w / 2, h / 2 + 8);
  });
}

export function createScene(canvas, { mobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  let dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = skyTex();
  scene.fog = new THREE.FogExp2(0xd9a877, 0.011);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(mobile ? 62 : 52, 1, 0.1, 140);

  /* ---------- materials ---------- */
  const weave = weaveTex();
  const fab = (hex, rough = 0.95) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, map: weave, bumpMap: weave, bumpScale: 0.6 });
  const M = {
    wall: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 }),
    gold: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85, roughness: 0.32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.55 }),
    ceil: new THREE.MeshStandardMaterial({ color: 0xf1eadb, roughness: 1 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xfff1cf }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffe2a8 }),
  };
  const sofaMat = fab('#6f8f86'); // living sofa
  const chairMat = fab(FABRICS[0].hex); // customisable armchair
  const cream = fab('#e6dccb'), terra = fab('#c0674a'), navy = fab('#2f4a63'), sand = fab('#d6c3a0'), burg = fab('#7a3b4a'), sage = fab('#8aa097');
  const blobT = blobTex();
  const blobMat = new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false, opacity: .9 });

  /* ---------- helpers ---------- */
  const add = (o, parent = scene) => (parent.add(o), o);
  const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const rbox = (w, h, d, r, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20, parent = scene) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const blob = (w, d, x, z, parent = scene, y = 0.012) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), blobMat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); parent.add(m); return m; };
  const rug = (w, d, x, z, tex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); scene.add(m); return m; };

  /* ---------- shell: floors, walls, ceiling ---------- */
  const rooms = [
    { z0: 0, z1: -9, wall: '#eadfcc', floor: woodTex([4, 4]) },
    { z0: -9, z1: -18, wall: '#dde2d8', floor: woodTex([4, 4]) },
    { z0: -18, z1: -27, wall: '#d8c3a1', floor: woodTex([4, 4]) },
    { z0: -27, z1: -36, wall: '#f0ebe2', floor: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9d0c0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = `hsla(${25 + Math.random() * 20},${15 + Math.random() * 20}%,${40 + Math.random() * 40}%,.5)`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7); g.fill(); } }, [3, 3]) },
  ];
  rooms.forEach((r, i) => {
    const len = r.z0 - r.z1, cz = (r.z0 + r.z1) / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, len), new THREE.MeshStandardMaterial({ map: r.floor, roughness: i === 3 ? 0.35 : 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, cz); scene.add(floor);
    const wm = M.wall(r.wall);
    box(0.3, H, len, wm, -W - 0.15, H / 2, cz); box(0.3, H, len, wm, W + 0.15, H / 2, cz);
    box(W * 2 + 0.6, 0.12, len, M.ceil, 0, H + .06, cz);
    // skirting
    box(0.04, 0.12, len, M.dark, -W + 0.02, 0.06, cz); box(0.04, 0.12, len, M.dark, W - 0.02, 0.06, cz);
    // cove light strip
    box(0.12, 0.05, len - .4, M.glow, -W + 0.08, H - 0.1, cz); box(0.12, 0.05, len - .4, M.glow, W - 0.08, H - 0.1, cz);
  });
  const wallZ = (z, { x0 = -W - .3, x1 = W + .3, doorX = 3.5, doorW = 1.8, doorH = 2.45, mat }) => {
    const t = 0.3, l0 = x0, l1 = doorX - doorW / 2, r0 = doorX + doorW / 2, r1 = x1;
    box(l1 - l0, H, t, mat, (l0 + l1) / 2, H / 2, z); box(r1 - r0, H, t, mat, (r0 + r1) / 2, H / 2, z);
    box(doorW, H - doorH, t, mat, doorX, doorH + (H - doorH) / 2, z);
    // gold frame
    box(0.05, doorH, t + .04, M.gold, l1, doorH / 2, z); box(0.05, doorH, t + .04, M.gold, r0, doorH / 2, z); box(doorW + .05, 0.05, t + .04, M.gold, doorX, doorH, z);
  };
  wallZ(-9, { mat: M.wall('#e6dccb') }); wallZ(-18, { mat: M.wall('#d3d9cc') }); wallZ(-27, { mat: M.wall('#e0cba9') });
  box(W * 2 + 0.6, H + .12, .3, M.wall('#efe9de'), 0, H / 2, -36.15); // end wall

  /* ---------- exterior ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0xc8b189, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -40); scene.add(ground);
  const facadeMat = new THREE.MeshStandardMaterial({ color: 0xe9dcc3, roughness: 0.9 });
  const FH = 5.2, DW = 1.7, DH = 2.6;
  box(14, FH, 0.35, facadeMat, -(DW / 2 + 7), FH / 2, 0); box(14, FH, 0.35, facadeMat, DW / 2 + 7, FH / 2, 0);
  box(DW, FH - DH, 0.35, facadeMat, 0, DH + (FH - DH) / 2, 0);
  box(30, .25, .6, new THREE.MeshStandardMaterial({ color: 0xd2c19f }), 0, FH + .12, .05); // parapet cap
  // door frame
  box(0.1, DH, .5, M.gold, -DW / 2, DH / 2, 0.02); box(0.1, DH, .5, M.gold, DW / 2, DH / 2, 0.02); box(DW + .1, .1, .5, M.gold, 0, DH, 0.02);
  // decorative arched panels
  [-5.2, 5.2, -9.5, 9.5].forEach((x) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.1), new THREE.MeshStandardMaterial({ color: 0xcdb892, roughness: 1 })); p.position.set(x, 2.1, .2); scene.add(p);
    box(2.2, .06, .08, M.gold, x, .55, .22); box(2.2, .06, .08, M.gold, x, 3.65, .22); box(.06, 3.1, .08, M.gold, x - 1.07, 2.1, .22); box(.06, 3.1, .08, M.gold, x + 1.07, 2.1, .22);
  });
  // sign above door
  const signMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), signMat); sign.position.set(0, DH + .95, .22); scene.add(sign);
  // door leaf
  const doorPivot = new THREE.Group(); doorPivot.position.set(-DW / 2 + .02, 0, -0.02); scene.add(doorPivot);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.5 });
  box(DW - .06, DH - .04, .09, doorMat, (DW - .06) / 2, (DH - .04) / 2, 0, doorPivot);
  [[.5, 1.9], [.5, 0.7]].forEach(([w, y]) => { rbox(DW / 2 - .15, y === 1.9 ? .8 : 1.05, .04, .02, new THREE.MeshStandardMaterial({ color: 0x70492c, roughness: .5 }), (DW - .06) * .28, y + (y === 1.9 ? 0 : .05), .06, doorPivot); rbox(DW / 2 - .15, y === 1.9 ? .8 : 1.05, .04, .02, new THREE.MeshStandardMaterial({ color: 0x70492c, roughness: .5 }), (DW - .06) * .74, y + (y === 1.9 ? 0 : .05), .06, doorPivot); });
  cyl(.025, .025, .45, M.gold, DW - .25, 1.1, .1, 12, doorPivot);
  // lanterns beside the door
  const lanterns = [];
  [-1.5, 1.5].forEach((x) => { const g = new THREE.Group(); g.position.set(x, 2.2, .35); scene.add(g); cyl(.14, .1, .34, M.lamp, 0, 0, 0, 8, g); cyl(.17, .01, .12, M.gold, 0, .22, 0, 8, g); cyl(.1, .17, .06, M.gold, 0, -.2, 0, 8, g); lanterns.push(g); });
  const doorLight = new THREE.PointLight(0xffc27a, 14, 12, 2); doorLight.position.set(0, 2.4, 2.2); scene.add(doorLight);
  // path + steps
  for (let i = 0; i < 7; i++) box(2.2, .06, .8, new THREE.MeshStandardMaterial({ color: 0xd8cdb6, roughness: .9 }), 0, .01, 1.2 + i * 1.3);
  box(2.6, .12, 1.4, new THREE.MeshStandardMaterial({ color: 0xcfc3a9 }), 0, .06, .8);
  // palms
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x6b5638, roughness: 1 }), leafM = new THREE.MeshStandardMaterial({ color: 0x3f6a3c, roughness: .8, side: THREE.DoubleSide });
  const palm = (x, z, s = 1) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    const t = cyl(.14, .22, 5.2, trunkM, 0, 2.6, 0, 8, g); t.rotation.z = .06;
    for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.55, 3), leafM); l.geometry.translate(0, 1.5, 0); l.position.y = 5.1; l.rotation.set(1.15 + Math.random() * .2, (i / 9) * Math.PI * 2, 0, 'YXZ'); g.add(l); }
  };
  palm(-7, 6, 1.1); palm(7.5, 5, 1); palm(-11, 12, 1.2); palm(11.5, 13, 1.1);
  // low garden wall
  box(40, .8, .3, new THREE.MeshStandardMaterial({ color: 0xd9c8a4 }), 0, .4, 22);

  /* ---------- furniture builders ---------- */
  function sofa({ w = 3.4, mat = sofaMat, n = 3, arms = true, low = false, pillows = [] } = {}) {
    const g = new THREE.Group(); const legH = low ? 0 : .13; const seatH = low ? .34 : .38;
    if (!low) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(.03, .02, legH, M.gold, sx * (w / 2 - .12), legH / 2, sz * .38, 10, g));
    rbox(w, seatH, .95, .08, mat, 0, legH + seatH / 2, 0, g);
    const armW = arms ? .26 : 0; const inner = w - armW * 2; const cw = inner / n;
    if (arms) [-1, 1].forEach((s) => rbox(.28, .6, .95, .1, mat, s * (w / 2 - .14), legH + .3, 0, g));
    rbox(w, low ? .55 : .72, .26, .1, mat, 0, legH + seatH + (low ? .24 : .3), -.34, g);
    for (let i = 0; i < n; i++) {
      const x = -inner / 2 + cw * (i + .5);
      rbox(cw - .03, .2, .72, .09, mat, x, legH + seatH + .1, .08, g);
      const b = rbox(cw - .05, low ? .48 : .56, .2, .1, mat, x, legH + seatH + (low ? .38 : .46), -.14, g); b.rotation.x = -.16;
    }
    pillows.forEach(([px, mt, rz], i) => { const p = rbox(.44, .44, .15, .07, mt, px * (inner / 2 - .3), legH + seatH + .42, .0 + i * .01, g); p.rotation.set(-.22, 0, rz || 0); });
    return g;
  }
  function bed() {
    const g = new THREE.Group();
    rbox(2.1, .32, 2.25, .05, M.dark, 0, .24, 0, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(.04, .03, .12, M.gold, a * .95, .06, b * 1.05, 10, g));
    rbox(1.95, .26, 2.1, .09, cream, 0, .53, 0, g);
    rbox(2.0, .12, 1.45, .06, sage, 0, .7, .36, g);
    rbox(2.02, .08, .46, .04, terra, 0, .74, .84, g);
    [-.5, .5].forEach((x) => { const p = rbox(.74, .17, .44, .08, cream, x, .75, -.8, g); p.rotation.x = -.18; });
    [-.5, .5].forEach((x) => { const p = rbox(.5, .2, .34, .08, burg, x, .88, -.62, g); p.rotation.x = -.45; });
    rbox(.56, .56, .15, .07, sand, 0, .87, -.36, g).rotation.x = -.2;
    rbox(2.45, 1.45, .2, .08, burg, 0, .85, -1.22, g);
    for (let i = -3; i <= 3; i++) rbox(.3, 1.3, .07, .03, new THREE.MeshStandardMaterial({ color: 0x8a4a5b, roughness: .95, map: weave }), i * .33, .85, -1.1, g);
    box(2.5, .04, .24, M.gold, 0, 1.6, -1.22, g);
    return g;
  }
  function nightstand(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    rbox(.55, .5, .45, .04, M.wood, 0, .3, 0, g); [-1, 1].forEach((s) => [-1, 1].forEach((t) => cyl(.015, .01, .1, M.gold, s * .22, .05, t * .17, 8, g)));
    cyl(.05, .06, .14, M.gold, 0, .62, 0, 10, g); cyl(.14, .19, .26, M.lamp, 0, .8, 0, 14, g);
    return g;
  }
  function armchairBuild() { return sofa({ w: 1.15, mat: chairMat, n: 1, pillows: [] }); }
  function curtainPair({ w = 2.8, h = 2.9, folds = 7, mat, sheerMat, rodW }) {
    const g = new THREE.Group(); const items = [];
    const mk = (cw, ox, m, amp, f, z) => {
      const geo = new THREE.PlaneGeometry(cw, h, 70, 1); const base = geo.attributes.position.array.slice();
      const mesh = new THREE.Mesh(geo, m); mesh.position.set(ox, h / 2 + .15, z); g.add(mesh);
      items.push({ geo, base, amp, f, cw });
    };
    mk(w / 2 - .05, -w / 4, mat, .07, folds, .02); mk(w / 2 - .05, w / 4, mat, .07, folds, .02);
    if (sheerMat) mk(w - .1, 0, sheerMat, .03, folds * 1.5, -.1);
    const rod = cyl(.025, .025, rodW || w + .5, M.gold, 0, h + .2, .05, 10, g); rod.rotation.z = Math.PI / 2;
    [-1, 1].forEach((s) => { const f = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), M.gold); f.position.set(s * ((rodW || w + .5) / 2), h + .2, .05); g.add(f); });
    const update = (t) => items.forEach((it) => {
      const p = it.geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const x = it.base[i]; const k = (x / it.cw) * it.f * Math.PI * 2;
        p[i + 2] = it.amp * Math.sin(k) + .012 * Math.sin(t * 1.1 + x * 3 + it.base[i + 1] * .8);
      }
      it.geo.attributes.position.needsUpdate = true;
    });
    update(0);
    return { group: g, update };
  }
  const sheer = new THREE.MeshStandardMaterial({ color: 0xfff6e6, transparent: true, opacity: .42, side: THREE.DoubleSide, roughness: 1, depthWrite: false });
  const curtainMat = (c) => { const m = fab(c); m.side = THREE.DoubleSide; return m; };
  const curtains = [];
  function windowOn(wallX, z, facing, mat, w = 3) {
    const g = new THREE.Group(); g.position.set(wallX, 0, z); g.rotation.y = facing; scene.add(g);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.3), new THREE.MeshBasicMaterial({ color: 0xfff0cc })); pane.position.set(0, 1.75, 0); g.add(pane);
    box(w + .15, .08, .1, M.gold, 0, 2.92, .04, g); box(w + .15, .08, .1, M.gold, 0, .6, .04, g);
    box(.06, 2.3, .06, M.gold, 0, 1.75, .04, g);
    const c = curtainPair({ w: w + .6, h: 2.7, mat, sheerMat: sheer }); c.group.position.set(0, 0.35, .22); g.add(c.group); curtains.push(c);
    return g;
  }
  function pendant(x, z, y = H) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    cyl(.012, .012, y - 2.2, M.gold, 0, (y + 2.2) / 2, 0, 6, g);
    cyl(.28, .2, .5, M.lamp, 0, 1.95, 0, 8, g); cyl(.34, .02, .16, M.gold, 0, 2.3, 0, 8, g); cyl(.14, .3, .1, M.gold, 0, 1.68, 0, 8, g);
    return g;
  }

  /* ---------- Room 1: living ---------- */
  const rug1 = rug(5.2, 3.6, -.4, -5.2, rugTex('#ddd0b6', '#9b7a44'));
  const s1 = sofa({ w: 3.5, mat: sofaMat, pillows: [[-1, terra, .15], [1, navy, -.1], [-.5, sand, .1]] }); s1.position.set(-1.4, 0, -8.3); scene.add(s1); blob(4.2, 1.6, -1.4, -8.2);
  const s2 = sofa({ w: 2.3, mat: sofaMat, n: 2, pillows: [[1, burg, .1]] }); s2.position.set(-4.3, 0, -5.4); s2.rotation.y = Math.PI / 2; scene.add(s2); blob(1.7, 3, -4.2, -5.4);
  const ac1 = sofa({ w: 1.1, mat: terra, n: 1 }); ac1.position.set(1.5, 0, -6.2); ac1.rotation.y = -Math.PI / 2 - .5; scene.add(ac1); blob(1.7, 1.7, 1.55, -6.2);
  // coffee table
  const ct = new THREE.Group(); ct.position.set(-.4, 0, -5.6); scene.add(ct);
  cyl(.7, .7, .05, M.gold, 0, .42, 0, 32, ct); cyl(.7, .7, .03, new THREE.MeshStandardMaterial({ color: 0xece4d4, roughness: .2, metalness: .1 }), 0, .45, 0, 32, ct); cyl(.1, .3, .4, M.gold, 0, .2, 0, 16, ct);
  cyl(.1, .08, .18, new THREE.MeshStandardMaterial({ color: 0x3f6a3c, roughness: .6 }), .15, .56, .1, 12, ct); blob(1.8, 1.8, -.4, -5.6);
  windowOn(W - .02, -4.6, -Math.PI / 2, curtainMat('#d8c9a8'), 3.2);
  windowOn(W - .02, -1.6, -Math.PI / 2, curtainMat('#d8c9a8'), 1.4);
  // floor lamp
  const fl = new THREE.Group(); fl.position.set(-4.2, 0, -8.2); scene.add(fl); cyl(.15, .17, .03, M.gold, 0, .02, 0, 12, fl); cyl(.012, .012, 1.5, M.gold, 0, .78, 0, 6, fl); cyl(.2, .28, .34, M.lamp, 0, 1.62, 0, 14, fl);
  // wall art
  [[-1.4, -8.8, 1.2], [.9, -8.8, .8]].forEach(([x, z, w], i) => { box(w, w * .75, .05, M.gold, x, 1.95, z + .12); box(w - .1, w * .75 - .1, .06, new THREE.MeshStandardMaterial({ color: i ? 0xb9a07a : 0x7d8f86, roughness: .9 }), x, 1.95, z + .13); });
  pendant(-.4, -5.4);

  /* ---------- Room 2: bedroom ---------- */
  rug(4.2, 3.4, -2, -15.8, rugTex('#d1d8cc', '#6b8479'));
  const bd = bed(); bd.position.set(-2, 0, -16.5); scene.add(bd); blob(3.2, 3.2, -2, -16.3);
  nightstand(-4, -17.4); nightstand(0, -17.4);
  windowOn(-W + .02, -13.4, Math.PI / 2, curtainMat('#9bb0a7'), 3.2);
  const dresser = new THREE.Group(); dresser.position.set(4.1, 0, -14.6); dresser.rotation.y = -Math.PI / 2; scene.add(dresser);
  rbox(1.8, .8, .5, .03, M.wood, 0, .4, 0, dresser); for (let i = 0; i < 3; i++) box(.5, .02, .02, M.gold, -.55 + i * .55, .6, .26, dresser);
  const bench = rbox(1.5, .4, .5, .08, burg, -2, .35, -14.9); bench.material = burg;
  pendant(-2, -14.2);

  /* ---------- Room 3: diwaniya ---------- */
  rug(6.2, 5.4, -.4, -22.6, rugTex('#c9a86f', '#6d3a1f'));
  const majlisMat = fab('#7a3b4a'), majlisMat2 = fab('#a56a3f');
  const mL = sofa({ w: 7.2, mat: majlisMat, n: 6, arms: false, low: true, pillows: [[-.8, sand, .1], [0, terra, -.1], [.8, navy, .1]] }); mL.position.set(-4.5, 0, -22.6); mL.rotation.y = Math.PI / 2; scene.add(mL); blob(1.8, 7.8, -4.4, -22.6);
  const mB = sofa({ w: 5.6, mat: majlisMat, n: 5, arms: false, low: true, pillows: [[-.6, terra, .1], [.6, sand, -.1]] }); mB.position.set(-1.1, 0, -26.45); scene.add(mB); blob(6.2, 1.8, -1.1, -26.3);
  const mR = sofa({ w: 5.2, mat: majlisMat, n: 4, arms: false, low: true, pillows: [[0, navy, .1]] }); mR.position.set(4.5, 0, -21.9); mR.rotation.y = -Math.PI / 2; scene.add(mR); blob(1.8, 5.8, 4.4, -21.9);
  const tbl = new THREE.Group(); tbl.position.set(-.5, 0, -22.4); scene.add(tbl);
  cyl(.62, .62, .06, M.gold, 0, .4, 0, 32, tbl); cyl(.08, .26, .38, M.gold, 0, .2, 0, 16, tbl); blob(1.9, 1.9, -.5, -22.4);
  // dallah-like pot + cups
  cyl(.1, .15, .22, M.gold, 0, .54, 0, 14, tbl); cyl(.05, .1, .12, M.gold, 0, .69, 0, 14, tbl); cyl(.02, .02, .2, M.gold, .16, .6, 0, 6, tbl).rotation.z = .7;
  [-.3, .3].forEach((x) => cyl(.05, .03, .06, M.gold, x, .46, .25, 10, tbl));
  [[-.5, -20.9, terra], [1.6, -22.4, navy], [-.6, -24.0, sand]].forEach(([x, z, m], i) => { const c = rbox(.8, .18, .8, .08, m, x, .09, z); c.rotation.y = i * .5; });
  pendant(-.5, -22.4);
  windowOn(W - .02, -20.2, -Math.PI / 2, curtainMat('#c9a86f'), 1.6);

  /* ---------- Room 4: fabric studio ---------- */
  const ped = new THREE.Group(); ped.position.set(-.5, 0, -31.4); scene.add(ped);
  cyl(1.25, 1.3, .22, new THREE.MeshStandardMaterial({ color: 0xf1ebdf, roughness: .35 }), 0, .11, 0, 48, ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .02, 8, 64), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = .22; ped.add(ring);
  const turntable = new THREE.Group(); turntable.position.y = .22; ped.add(turntable);
  const chair = armchairBuild(); chair.scale.setScalar(1.35); turntable.add(chair);
  chair.position.y = 0; blob(2.4, 2.4, -.5, -31.4, scene, .014);
  // hanging fabric strips
  const strips = [];
  const cols = ['#6f8f86', '#c0674a', '#2f4a63', '#d6c3a0', '#7a3b4a', '#3b3a38', '#a56a3f', '#8aa097'];
  cols.forEach((c, i) => {
    const m = curtainMat(c); const g = new THREE.PlaneGeometry(.78, 2.5, 20, 1);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(-4.1 + i * 1.12, 1.65, -35.7); scene.add(mesh);
    const base = g.attributes.position.array.slice(); strips.push({ g, base, i });
    cyl(.02, .02, .86, M.gold, -4.1 + i * 1.12, 2.93, -35.68, 8).rotation.z = Math.PI / 2;
  });
  box(10, .05, .1, M.gold, 0, 2.97, -35.66);
  const studioSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), signMat); studioSign.position.set(-.5, 3.0 - .05, -35.55); studioSign.scale.set(.6, .6, 1); scene.add(studioSign);
  pendant(-.5, -31.4);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x8a6e4e, 1.0));
  const sun = new THREE.DirectionalLight(0xffd29a, 1.1); sun.position.set(6, 10, 20); scene.add(sun);
  const roomLights = [-4.5, -13.5, -22.5, -31.5].map((z) => { const l = new THREE.PointLight(0xffd9a0, 34, 15, 1.6); l.position.set(-.5, 2.8, z); scene.add(l); return l; });

  /* ---------- camera path ---------- */
  const KF = [
    [[0, 2.5, 19], [0, 1.7, 0]],
    [[0, 1.7, 7.6], [0, 1.5, 0]],
    [[.4, 1.65, 1.8], [0, 1.3, -6]],
    [[2.8, 1.55, -2.4], [-1.6, .8, -8]],
    [[-2.4, 1.5, -3], [5, 1.9, -4.5]],
    [[-.6, 1.05, -5.4], [-2, .65, -8.2]],
    [[3.5, 1.5, -8.2], [2.6, 1.1, -14]],
    [[3.2, 1.6, -11.6], [-2, .85, -17]],
    [[1.2, 1.5, -13.2], [-5, 1.7, -13.6]],
    [[3.5, 1.5, -19.4], [-1.2, .7, -23.5]],
    [[1.6, 1.25, -21.4], [-4.5, .6, -23.4]],
    [[3.5, 1.5, -27.2], [-.5, .9, -31.4]],
    [[1.9, 1.35, -33.6], [-.5, .75, -31.4]],
  ];
  const posCurve = new THREE.CatmullRomCurve3(KF.map((k) => new THREE.Vector3(...k[0])), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(KF.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const state = { px: 0, py: 0, vis: true };
  const targetColor = new THREE.Color(FABRICS[0].hex);
  function setFabric(hex) { targetColor.set(hex); }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 70 : 52; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  function setSigns() {
    const t = textTex('نور', '#e9c98a'); signMat.map = t; signMat.needsUpdate = true;
  }
  setSigns();

  let last = performance.now(), slow = 0, frames = 0;
  function frame(now, progress) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = Math.min(1, Math.max(0, progress));
    posCurve.getPoint(t, tmpP); lookCurve.getPoint(t, tmpL);
    camera.position.copy(tmpP).add(new THREE.Vector3(state.px * .12, state.py * .06, 0));
    camera.lookAt(tmpL);
    doorPivot.rotation.y = 1.85 * sstep(.025, .085, t);
    const tt = now / 1000;
    curtains.forEach((c) => c.update(tt));
    strips.forEach((s) => { const p = s.g.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 2] = .05 * Math.sin(s.base[i] * 7 + s.i) + .02 * Math.sin(tt * 1.3 + s.i + s.base[i + 1]); s.g.attributes.position.needsUpdate = true; });
    turntable.rotation.y = tt * .45;
    chairMat.color.lerp(targetColor, 1 - Math.exp(-dt * 6));
    // light spill follows camera a bit
    roomLights.forEach((l, i) => { const d = Math.abs(l.position.z - tmpP.z); l.intensity = 20 + 22 * Math.max(0, 1 - d / 14); });
    doorLight.intensity = 14 * (1 - sstep(.1, .2, t) * .8);
    renderer.render(scene, camera);
    // adaptive quality
    frames++;
    if (dt > 0.034) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 40 && dpr > 1) { dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); slow = 0; resize(); }
  }
  return { frame, setFabric, resize, state };
}
