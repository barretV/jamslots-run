import * as THREE from 'three';

export const TRAIL_LIFE = 1.05;
export const TRAIL_KEEP = 36;

export const CYCLE_COLORS = ['#22d3ee', '#ff2bd6', '#ffb000', '#39ff14', '#ff6a00', '#c084fc'];

export interface TrailSample {
  x: number;
  y: number;
  z: number;
  t: number;
}

/** Flat saturated hull. Instance color is the neon, not a dark lit box. */
export function createCycleMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: '#ffffff',
    toneMapped: false,
  });
}

export function createTrailMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function attachGlow(geo: THREE.BufferGeometry, colors: THREE.Color[], gain: number): THREE.BufferGeometry {
  const arr = new Float32Array(Math.max(1, colors.length) * 3);
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i];
    arr[i * 3] = c.r * gain;
    arr[i * 3 + 1] = c.g * gain;
    arr[i * 3 + 2] = c.b * gain;
  }
  geo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(arr, 3));
  return geo;
}

export function paintInstanceColors(mesh: THREE.InstancedMesh | null, colors: THREE.Color[]): void {
  if (!mesh) return;
  for (let i = 0; i < colors.length; i++) mesh.setColorAt(i, colors[i]);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function pushTrail(samples: TrailSample[], x: number, y: number, z: number, now: number): void {
  const last = samples[samples.length - 1];
  if (!last) {
    samples.push({ x, y, z, t: now });
  } else {
    const dx = x - last.x;
    const dy = y - last.y;
    const dz = z - last.z;
    if (dx * dx + dy * dy + dz * dz < 4.8) {
      last.x = x;
      last.y = y;
      last.z = z;
      last.t = now;
    } else {
      samples.push({ x, y, z, t: now });
    }
  }
  while (samples.length > TRAIL_KEEP) samples.shift();
  while (samples.length > 1 && now - samples[0].t > TRAIL_LIFE) samples.shift();
}

export interface TrailDrawItem {
  samples: TrailSample[];
  color: THREE.Color;
  draw: boolean;
  height: number;
  thick: number;
}

export function writeTrailMesh(
  mesh: THREE.InstancedMesh | null,
  items: TrailDrawItem[],
  now: number,
  dummy: THREE.Object3D,
  tint: THREE.Color,
  max: number,
): void {
  if (!mesh) return;
  const up = _up;
  let n = 0;
  for (const item of items) {
    if (!item.draw || n >= max) continue;
    const samples = item.samples;
    for (let i = 1; i < samples.length && n < max; i++) {
      const a = samples[i - 1];
      const b = samples[i];
      const fade = 1 - (now - a.t) / TRAIL_LIFE;
      if (fade <= 0.04) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dy, dz);
      if (len < 0.08) continue;
      dummy.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5 + item.height * 0.35, (a.z + b.z) * 0.5);
      dummy.up.copy(up);
      dummy.lookAt(b.x, b.y + item.height * 0.35, b.z);
      dummy.scale.set(item.thick, item.height * (0.4 + fade * 0.6), Math.max(len, 0.12));
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      tint.copy(item.color).multiplyScalar(2.1 * fade);
      mesh.setColorAt(n, tint);
      n++;
    }
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

const _up = new THREE.Vector3(0, 1, 0);
