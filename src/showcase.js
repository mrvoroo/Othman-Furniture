import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { waLink } from './config.js';

const MODELS = [
  { id: 'sofa', label: 'كنب منحني مخمل', file: '/models/GlamVelvetSofa.glb', height: 1.0 },
  { id: 'chair', label: 'كرسي استقبال', file: '/models/SheenChair.glb', height: 1.05 },
];
const COLORS = [
  { name: 'شمبانيا', hex: '#cdb892' },
  { name: 'وردي هادئ', hex: '#c9929a' },
  { name: 'أخضر زيتي', hex: '#6f8f86' },
  { name: 'طوبي', hex: '#b5593c' },
  { name: 'كحلي', hex: '#26405c' },
  { name: 'رمادي', hex: '#8a8a86' },
  { name: 'عنابي', hex: '#6e2d3d' },
  { name: 'أسود', hex: '#1d1c1b' },
];

export function initShowcase(root, { mobile }) {
  const canvas = root.querySelector('canvas');
  const tabs = root.querySelector('[data-tabs]');
  const sws = root.querySelector('[data-colors]');
  const nameEl = root.querySelector('[data-cname]');
  const order = root.querySelector('[data-order]');
  const busy = root.querySelector('[data-busy]');
  let started = false;

  const state = { model: MODELS[0], color: COLORS[0] };
  const updateOrder = () => { order.href = waLink(`السلام عليكم، عجبني ${state.model.label} بلون ${state.color.name} من معرض نور، أبي أعرف التفاصيل وأحجز زيارة.`); };
  MODELS.forEach((m, i) => { const b = document.createElement('button'); b.textContent = m.label; b.setAttribute('aria-pressed', i === 0); b.onclick = () => { if (state.model !== m) select(m); }; tabs.appendChild(b); });
  COLORS.forEach((c, i) => { const b = document.createElement('button'); b.style.background = c.hex; b.setAttribute('aria-label', c.name); b.setAttribute('aria-pressed', i === 0); b.onclick = () => { state.color = c; paint(); }; sws.appendChild(b); });
  nameEl.textContent = state.color.name; updateOrder();

  let renderer, scene, camera, controls, current, loaded = {}, visible = false, shadowFloor, key;
  const target = new THREE.Color(COLORS[0].hex); const fabricMats = [];

  function paint() {
    target.set(state.color.hex);
    [...sws.children].forEach((b, i) => b.setAttribute('aria-pressed', COLORS[i] === state.color));
    nameEl.textContent = state.color.name; updateOrder();
  }
  function select(m) {
    state.model = m;
    [...tabs.children].forEach((b, i) => b.setAttribute('aria-pressed', MODELS[i] === m)); updateOrder();
    show(m);
  }

  function setup() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.85;
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50); camera.position.set(2.6, 1.3, 3.4);
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
    controls.minPolarAngle = 0.9; controls.maxPolarAngle = 1.5; controls.target.set(0, 0.45, 0);
    controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
    canvas.style.touchAction = 'pan-y';
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(3, 5, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -3; key.shadow.bias = -0.0004; key.shadow.radius = 5;
    scene.add(key);
    shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.38 }));
    shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.receiveShadow = true; scene.add(shadowFloor);
    resize(); addEventListener('resize', resize);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(canvas);
    let prev = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min(.05, (now - prev) / 1000); prev = now;
      fabricMats.forEach((m) => m.color.lerp(target, 1 - Math.exp(-dt * 7)));
      controls.update(); renderer.render(scene, camera);
    };
    requestAnimationFrame(loop);
  }
  function resize() {
    if (!renderer) return;
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 46 : 35; camera.updateProjectionMatrix();
  }
  const loader = new GLTFLoader();
  function prepare(gltf, m) {
    const obj = gltf.scene; const mats = [];
    obj.traverse((o) => {
      if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => { if (/fabric/i.test(mt.name)) { mt.map = null; mt.needsUpdate = true; if (!mats.includes(mt)) mats.push(mt); } });
    });
    // keep only the material variant actually used by the meshes; recolour all fabric ones
    const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
    const s = m.height / size.y; obj.scale.multiplyScalar(s);
    box.setFromObject(obj); const c = box.getCenter(new THREE.Vector3()); obj.position.set(-c.x, -box.min.y, -c.z);
    const g = new THREE.Group(); g.add(obj); return { group: g, mats };
  }
  async function show(m) {
    if (!loaded[m.id]) {
      busy.hidden = false;
      try {
        const gltf = await loader.loadAsync(m.file); loaded[m.id] = prepare(gltf, m);
      } catch (e) { console.error(e); busy.textContent = 'تعذر تحميل المجسم'; return; }
    }
    busy.hidden = true;
    if (state.model !== m) return; // user switched meanwhile
    if (current) scene.remove(current.group);
    current = loaded[m.id]; scene.add(current.group);
    fabricMats.length = 0; fabricMats.push(...current.mats);
    current.mats.forEach((mt) => mt.color.set(target)); // snap
    controls.autoRotate = true;
  }
  // lazy start when near viewport
  new IntersectionObserver((es, obs) => {
    if (es[0].isIntersecting && !started) { started = true; obs.disconnect(); setup(); show(state.model); }
  }, { rootMargin: '600px' }).observe(root);
}
