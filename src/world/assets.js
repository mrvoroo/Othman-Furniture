import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const B = import.meta.env.BASE_URL;
const texLoader = new THREE.TextureLoader();
const texCache = new Map();
let maxAniso = 4;
export const setAniso = (n) => { maxAniso = n; };

function loadTex(url, srgb) {
  if (texCache.has(url)) return texCache.get(url);
  const t = texLoader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(url, t); return t;
}
/** خامة PBR حقيقية من Poly Haven (diffuse + normal + roughness) */
export function pbr(name, { tint = 0xffffff, normal = 1, rough = 1, side = THREE.FrontSide } = {}) {
  return new THREE.MeshStandardMaterial({
    map: loadTex(`${B}tex/${name}_diff.jpg`, true), normalMap: loadTex(`${B}tex/${name}_nor.jpg`, false), roughnessMap: loadTex(`${B}tex/${name}_rough.jpg`, false),
    color: tint, roughness: rough, normalScale: new THREE.Vector2(normal, normal), side,
  });
}
export function scaleUV(geo, su, sv) {
  const a = geo.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv); a.needsUpdate = true; return geo;
}

const loader = new GLTFLoader();
const modelCache = new Map();
let active = 0; const queue = [];
const pump = () => { while (active < 3 && queue.length) { const j = queue.shift(); active++; j().finally(() => { active--; pump(); }); } };
export function loadModel(id) {
  if (modelCache.has(id)) return modelCache.get(id);
  const p = new Promise((res, rej) => {
    queue.push(() => loader.loadAsync(`${B}models/${id}.glb`).then((g) => { g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); res(g.scene); }, rej));
    pump();
  });
  modelCache.set(id, p); return p;
}
