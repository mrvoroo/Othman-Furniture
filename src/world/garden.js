import * as THREE from 'three';
import { loadModel, pbr, scaleUV } from './assets.js';

const tmp = new THREE.Box3();
const stone = () => pbr('beige_wall_001', { tint: 0xe3d3b0 });
const GOLD = new THREE.MeshStandardMaterial({ color: 0xc9a14f, metalness: 0.9, roughness: 0.3 });

/** حديقة كاملة: ممر ونافورة وأشجار وشجيرات وأعمدة إضاءة ومسبح خلفي */
export function buildGarden(world, { mobile }) {
  const g = new THREE.Group(); world.add(g);
  const pavers = pbr('concrete_pavers', { tint: 0xeadfc8, normal: 0.9 });
  const flat = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };

  // ممر الدخول + دوّار حول النافورة
  const FZ = 17;                                         // مركز النافورة
  const ringG = new THREE.RingGeometry(3.4, 6.2, 64); scaleUV(ringG, 3, 3); flat(ringG, pavers, 0, -0.02, FZ);
  const pathG = new THREE.PlaneGeometry(3.4, FZ - 6.2 - 8); scaleUV(pathG, 1.3, 3); flat(pathG, pavers, 0, -0.02, (FZ - 6.2 + 8) / 2);
  const gateG = new THREE.PlaneGeometry(4.6, 24 - FZ - 6.2 + 2); scaleUV(gateG, 1.8, 1); flat(gateG, pavers, 0, -0.02, (FZ + 6.2 + 24) / 2 + 0.2);
  // نافورة
  const water = new THREE.MeshPhysicalMaterial({ color: 0x4fa9b8, roughness: 0.04, metalness: 0, transmission: 0, transparent: true, opacity: 0.85, envMapIntensity: 2 });
  const sm = stone(); const f = new THREE.Group(); f.position.set(0, 0, FZ); g.add(f);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.7, 48), sm); basin.position.y = 0.35; basin.castShadow = basin.receiveShadow = true; f.add(basin);
  const wat = new THREE.Mesh(new THREE.CircleGeometry(1.95, 48), water); wat.rotation.x = -Math.PI / 2; wat.position.y = 0.62; f.add(wat);
  const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.5, 24), sm); pil.position.y = 1.2; f.add(pil);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.3, 0.3, 32), sm); bowl.position.y = 1.9; f.add(bowl);
  const wat2 = new THREE.Mesh(new THREE.CircleGeometry(0.78, 32), water); wat2.rotation.x = -Math.PI / 2; wat2.position.y = 2.04; f.add(wat2);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0xbfe6ee, transparent: true, opacity: 0.6 })); jet.position.y = 2.5; f.add(jet);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), GOLD); ball.position.y = 3.05; f.add(ball);

  // سور منخفض + أعمدة بوابة
  const wall = stone();
  for (const sx of [-1, 1]) { const len = 14; box(len, 1.0, 0.35, wall, sx * (2.6 + len / 2), 0.5, 24); box(len, 0.12, 0.5, new THREE.MeshStandardMaterial({ color: 0xd8c8a6 }), sx * (2.6 + len / 2), 1.06, 24); }
  for (const sx of [-1, 1]) { box(0.8, 2.1, 0.8, wall, sx * 2.7, 1.05, 24); box(1.0, 0.18, 1.0, new THREE.MeshStandardMaterial({ color: 0xd8c8a6 }), sx * 2.7, 2.2, 24); const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })); l.position.set(sx * 2.7, 2.55, 24); g.add(l); }
  for (const sx of [-1, 1]) { const len = 22; box(0.35, 1.0, 36, wall, sx * 21, 0.5, 6); }   // أسوار جانبية
  box(42, 1.0, 0.35, wall, 0, 0.5, -24); // سور خلفي

  // مسبح خلفي
  const poolW = new THREE.MeshStandardMaterial({ color: 0x2aa7bf, roughness: 0.03, metalness: 0.1 });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2), poolW); pool.rotation.x = -Math.PI / 2; pool.position.set(0, -0.04, -13.5); g.add(pool);
  flat(new THREE.PlaneGeometry(11, 6.2), pavers, 0, -0.045, -13.5).scale.set(1, 1, 1);
  pool.position.y = -0.02; for (const [w, d, x, z] of [[9.6, 0.3, 0, -15.75], [9.6, 0.3, 0, -11.25], [0.3, 4.8, -4.65, -13.5], [0.3, 4.8, 4.65, -13.5]]) box(w, 0.12, d, stone(), x, 0.0, z);

  // ---- مجسمات حقيقية ----
  const place = async (id, { x, z, h, s = 1, ry = 0, y = 0, shadow = true }) => {
    let src; try { src = await loadModel(id); } catch { return; }
    const o = src.clone(true); const wrap = new THREE.Group(); wrap.add(o);
    tmp.setFromObject(o); const size = tmp.getSize(new THREE.Vector3()); const sc = h ? h / size.y : s; wrap.scale.setScalar(sc);
    tmp.setFromObject(wrap); const c = tmp.getCenter(new THREE.Vector3()); o.position.set(-c.x / sc, -tmp.min.y / sc, -c.z / sc);
    const holder = new THREE.Group(); holder.add(wrap); holder.position.set(x, y, z); holder.rotation.y = ry; holder.traverse((m) => { if (m.isMesh) { m.castShadow = shadow; m.receiveShadow = true; } }); g.add(holder);
    return holder;
  };
  const rnd = (i) => { const t = Math.sin(i * 127.1) * 43758.5453; return t - Math.floor(t); };
  // أشجار ونخيل
  [[-15, 12, 7.5, 'island_tree_02'], [15, 11, 8.2, 'island_tree_01'], [-17, 1, 6.8, 'island_tree_01'], [17, -3, 7.2, 'island_tree_02'], [-14, -10, 7.4, 'island_tree_02'], [14, -9, 7.0, 'island_tree_01'], [-9, 21, 6.2, 'island_tree_01'], [9, 21, 6.4, 'island_tree_02']]
    .forEach(([x, z, h, id], i) => place(id, { x, z, h, ry: rnd(i) * 6.28 }));
  // شجيرات على جانبي الممر وحول الفيلا
  const shrubs = ['shrub_02', 'shrub_03', 'shrub_04', 'shrub_02'];
  for (let i = 0; i < 9; i++) { for (const sx of [-1, 1]) place(shrubs[(i + (sx > 0 ? 1 : 0)) % 4], { x: sx * (2.6 + i * 1.8 + (i > 3 ? 0.4 : 0)), z: 8.6, h: 0.9 + rnd(i * sx) * 0.4, ry: rnd(i + 3) * 6.28 }); }
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) place(shrubs[i % 4], { x: sx * (7.5 + rnd(i) * 3), z: 21.5, h: 1.0 + rnd(i + 9) * 0.4, ry: rnd(i + 5) * 6.28 });
  // أصص ونباتات بجانب الباب
  place('planter_box_02', { x: -3.4, z: 9.4, h: 0.8 }); place('planter_box_02', { x: 3.4, z: 9.4, h: 0.8 }); place('potted_plant_01', { x: -2.6, z: 9.2, h: 1.5 }); place('potted_plant_01', { x: 2.6, z: 9.2, h: 1.5 });
  // أزهار
  for (let i = 0; i < 10; i++) place('flower_gazania', { x: (rnd(i) - 0.5) * 30, z: 10 + rnd(i + 20) * 9, h: 0.35, ry: rnd(i) * 6 });
  // أعمدة إنارة على الممر
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
  [[-4.2, 10.5], [4.2, 10.5], [-4.2, 22.5], [4.2, 22.5]].forEach(([x, z]) => { place('street_lamp_01', { x, z, h: 3.6, ry: x < 0 ? 0 : Math.PI }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), lampGlow); b.position.set(x, 3.3, z); g.add(b); });
  const lampLight = new THREE.PointLight(0xffc27a, 18, 16, 1.6); lampLight.position.set(0, 3.5, 11); g.add(lampLight);
  // تمثال وبنش وصخور
  place('horse_statue_01', { x: -9, z: 15, h: 2.2, ry: 0.8 }); place('painted_wooden_bench', { x: 9, z: 14.5, h: 0.9, ry: -1.2 });
  place('boulder_01', { x: -12, z: 18, h: 1.3 }); place('boulder_01', { x: 13, z: 19, h: 1.0, ry: 2 });
  place('garden_gnome', { x: 3.8, z: 9.0, h: 0.55, ry: 0.3 });
  // نخيل خلفي حول المسبح
  place('pachira_aquatica_01', { x: -6.5, z: -12, h: 1.6 }); place('pachira_aquatica_01', { x: 6.5, z: -12, h: 1.6 });

  const anim = (t) => { wat.position.y = 0.62 + Math.sin(t * 1.6) * 0.004; jet.scale.y = 1 + Math.sin(t * 6) * 0.06; };
  return { group: g, anim };
}
