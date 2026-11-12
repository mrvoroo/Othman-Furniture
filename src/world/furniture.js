import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { H, FLOOR_Y, DESIGNS } from '../data.js';
import { loadModel, pbr, scaleUV } from './assets.js';

const rad = (d) => (d * Math.PI) / 180;
const tmpBox = new THREE.Box3();

/** شاشة مضيئة متحركة (للكمبيوتر والتلفزيون) */
function screenTexture(kind) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const draw = (time) => {
    if (kind === 'pc') { // مشهد لعبة بنمط نيون
      const gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, '#1b0a3d'); gr.addColorStop(0.55, '#7a1f7a'); gr.addColorStop(1, '#ff6a3d'); g.fillStyle = gr; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(160, 82, 38, 0, 7); g.fill();
      g.fillStyle = '#1b0a3d'; for (let i = 0; i < 5; i++) g.fillRect(110, 70 + i * 9 + ((time * 8) % 9) * 0, 100, 2 + i);
      g.fillStyle = '#0d0420'; g.fillRect(0, 108, 320, 72); g.strokeStyle = '#34e0ff'; g.lineWidth = 1;
      for (let i = -10; i < 11; i++) { g.beginPath(); g.moveTo(160 + i * 6, 108); g.lineTo(160 + i * 40, 180); g.stroke(); }
      for (let j = 0; j < 8; j++) { const y = 108 + ((j * 9 + time * 40) % 72); g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke(); }
      g.fillStyle = '#34e0ff'; g.font = 'bold 14px sans-serif'; g.fillText('NOOR GAMING', 10, 20); g.fillStyle = '#fff'; g.fillText('SCORE ' + String(Math.floor(time * 137) % 99999).padStart(5, '0'), 220, 20);
    } else { // تلفزيون: ألوان هادئة
      const gr = g.createLinearGradient(0, 0, 320, 180); const h = (time * 20) % 360; gr.addColorStop(0, `hsl(${h},50%,30%)`); gr.addColorStop(1, `hsl(${(h + 60) % 360},60%,45%)`); g.fillStyle = gr; g.fillRect(0, 0, 320, 180);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 130, 320, 50); g.fillStyle = '#fff'; g.font = 'bold 16px sans-serif'; g.fillText('نور', 20, 160);
    }
    t.needsUpdate = true;
  };
  draw(0); return { texture: t, draw };
}

const blackMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.35, metalness: 0.6 });

function makePC(ctx) {
  const g = new THREE.Group();
  const scr = screenTexture('pc'); ctx.updatables.push({ every: 1 / 15, t: 0, fn: (t) => scr.draw(t) });
  const mon = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.42, 0.035, 2, 0.01), blackMat); mon.position.set(0, 0.34, 0); g.add(mon);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.69, 0.388), new THREE.MeshBasicMaterial({ map: scr.texture, toneMapped: false })); sc.position.set(0, 0.34, 0.019); g.add(sc);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.03), blackMat); stand.position.set(0, 0.07, -0.02); g.add(stand);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.16), blackMat); foot.position.set(0, 0.008, 0.0); g.add(foot);
  const kb = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.02, 0.15, 2, 0.006), blackMat); kb.position.set(0, 0.012, 0.28); g.add(kb);
  const rgb = new THREE.MeshBasicMaterial({ color: 0xff2bd6, toneMapped: false });
  const kbl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.004, 0.006), rgb); kbl.position.set(0, 0.024, 0.34); g.add(kbl);
  const mouse = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.025, 0.1, 2, 0.01), blackMat); mouse.position.set(0.35, 0.013, 0.28); g.add(mouse);
  const tower = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.46, 0.44, 2, 0.01), blackMat); tower.position.set(0.62, 0.23, -0.05); g.add(tower);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.42), new THREE.MeshBasicMaterial({ color: 0x4b1d8f, transparent: true, opacity: 0.55, toneMapped: false })); glass.rotation.y = -Math.PI / 2; glass.position.set(0.502, 0.23, -0.05); g.add(glass);
  for (let i = 0; i < 3; i++) { const fan = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 32), new THREE.MeshBasicMaterial({ color: 0x34e0ff, toneMapped: false })); fan.rotation.y = Math.PI / 2; fan.position.set(0.505, 0.1 + i * 0.13, -0.05); g.add(fan); }
  const light = new THREE.PointLight(0xb84dff, 6, 3.2, 1.8); light.position.set(0.25, 0.45, 0.3); g.add(light);
  ctx.updatables.push({ every: 1 / 20, t: 0, fn: (t) => { const c = new THREE.Color().setHSL((t * 0.15) % 1, 1, 0.55); rgb.color.copy(c); light.color.copy(c); } });
  return g;
}
function makeTV(ctx) {
  const g = new THREE.Group(); const scr = screenTexture('tv'); ctx.updatables.push({ every: 1 / 10, t: 0, fn: (t) => scr.draw(t) });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.9, 0.05, 2, 0.01), blackMat); body.position.y = 0.45; g.add(body);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.84), new THREE.MeshBasicMaterial({ map: scr.texture, toneMapped: false })); sc.position.set(0, 0.45, 0.027); g.add(sc);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.2), blackMat); stand.position.y = 0.01; g.add(stand);
  const light = new THREE.PointLight(0x9fc4ff, 3, 4, 1.8); light.position.set(0, 0.5, 0.8); g.add(light);
  return g;
}
function makeRug(it) {
  const g = new THREE.Group(); const m = pbr('quatrefoil_jacquard_fabric', { tint: new THREE.Color(it.color), normal: 0.7 });
  const geo = new THREE.PlaneGeometry(it.w, it.d); scaleUV(geo, it.w / 0.8, it.d / 0.8);
  const r = new THREE.Mesh(geo, m); r.rotation.x = -Math.PI / 2; r.position.y = 0.014; r.receiveShadow = true; g.add(r);
  const bg = new THREE.PlaneGeometry(it.w + 0.18, it.d + 0.18); const bm = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: new THREE.Color(it.color).multiplyScalar(0.45), roughness: 1 }));
  bm.rotation.x = -Math.PI / 2; bm.position.y = 0.01; bm.receiveShadow = true; g.add(bm);
  return g;
}
const fabricCache = {};
function mattress(color) {
  const m = fabricCache[color] || (fabricCache[color] = pbr('quatrefoil_jacquard_fabric', { tint: new THREE.Color(color), normal: 0.5 }));
  const g = new THREE.Group();
  const a = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.2, 1.9, 4, 0.06), new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 1 })); a.position.set(0, 0.5, 0.02); g.add(a);
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.08, 1.2, 3, 0.03), m); b.position.set(0, 0.63, 0.42); g.add(b);
  const p = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.12, 0.3, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })); p.position.set(0, 0.64, -0.7); p.rotation.x = -0.15; g.add(p);
  return g;
}

/** يبني مجموعة تصميم كاملة لغرفة. يعيد { group, hot:[{m,key,anchor,center,size}] } */
export async function buildDesign(room, designIdx, ctx) {
  const def = room.def; const design = DESIGNS[def.id][designIdx];
  const group = new THREE.Group(); group.visible = false;
  const rc = room.center; const fy = FLOOR_Y[def.f]; const hot = [];
  const jobs = design.items.map(async (it) => {
    if (it.skip) return;
    let obj;
    if (it.m === '_rug') obj = makeRug(it);
    else if (it.m === '_pc') obj = makePC(ctx);
    else if (it.m === '_tv') obj = makeTV(ctx);
    else {
      let src; try { src = await loadModel(it.m); } catch { return; }
      obj = src.clone(true); const s = it.w ? 1 : (it.s || 1);
      const wrap = new THREE.Group(); wrap.add(obj);
      tmpBox.setFromObject(obj); const bs = tmpBox.getSize(new THREE.Vector3()); const sc = it.w ? it.w / bs.x : s; wrap.scale.setScalar(sc);
      tmpBox.setFromObject(wrap); const c = tmpBox.getCenter(new THREE.Vector3());
      obj.position.set(-c.x / sc, -tmpBox.min.y / sc, -c.z / sc); // مركز القاعدة عند الأصل
      const h = tmpBox.max.y - tmpBox.min.y;
      if (it.mattress) { const mt = mattress(it.mattress); mt.scale.setScalar(1 / sc); wrap.add(mt); mt.position.y = 0; }
      wrap.userData.h = h; wrap.userData.sc = sc; obj = wrap;
    }
    const holder = new THREE.Group(); holder.add(obj);
    let y = 0; const h = obj.userData.h || 0;
    if (it.on !== undefined) y = it.on; else if (it.wall !== undefined) y = it.wall - h / 2; else if (it.ceil) y = H - h;
    holder.position.set(rc.x + it.x, fy + y, rc.z + it.z); holder.rotation.y = rad(it.ry || 0);
    holder.traverse((o) => { if (o.isMesh) { o.castShadow = it.m !== '_rug'; o.receiveShadow = true; } });
    group.add(holder);
    if (it.hot) {
      holder.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(holder); const center = b.getCenter(new THREE.Vector3()); const size = b.getSize(new THREE.Vector3());
      hot.push({ key: it.m, anchor: new THREE.Vector3(center.x, Math.min(b.max.y + 0.15, fy + H - 0.3), center.z), center, size, holder });
    }
    holder.userData.pop = 0; holder.scale.setScalar(0.001); ctx.pops.push(holder);
  });
  await Promise.all(jobs);
  return { group, hot, name: design.name };
}
