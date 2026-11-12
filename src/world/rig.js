import * as THREE from 'three';
/** كاميرا بنابض: تتحرك بنعومة نحو موضع/هدف مطلوب */
export class Rig {
  constructor(camera) { this.cam = camera; this.pos = new THREE.Vector3(0, 3, 40); this.tgt = new THREE.Vector3(0, 3, 0); this.dpos = this.pos.clone(); this.dtgt = this.tgt.clone(); this.k = 3.2; }
  set(pos, tgt, snap = false) { this.dpos.copy(pos); this.dtgt.copy(tgt); if (snap) { this.pos.copy(pos); this.tgt.copy(tgt); } }
  update(dt, k = this.k) { const a = 1 - Math.exp(-dt * k); this.pos.lerp(this.dpos, a); this.tgt.lerp(this.dtgt, a); this.cam.position.copy(this.pos); this.cam.lookAt(this.tgt); }
}
