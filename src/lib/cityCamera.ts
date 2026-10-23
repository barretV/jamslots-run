import * as THREE from 'three';
import type { CityBuildingSlot } from './citySpiral';

export const CITY_GROUND_Y = 0;
export const MIN_CAMERA_Y = 18;
export const MIN_UFO_Y = 24;
/** Keep UFO at least this far from skyline focus on XZ during the opening flight window. */
export const MIN_FOCUS_DIST_XZ = 44;

/** UFO / low flight — skip roofs we are clearly above. */
export function pushOutOfBuildings(pos: THREE.Vector3, buildings: CityBuildingSlot[], margin: number): void {
  for (const b of buildings) {
    if (pos.y > b.height + margin + 12) continue;
    pushOutOfColumn(pos, b, margin);
  }
}

/** Camera — must never sit inside a tower footprint (even when above the roof). */
export function pushCameraOutOfColumns(pos: THREE.Vector3, buildings: CityBuildingSlot[], margin: number): void {
  for (let pass = 0; pass < 4; pass++) {
    for (const b of buildings) {
      pushOutOfColumn(pos, b, margin);
    }
  }
}

function pushOutOfColumn(pos: THREE.Vector3, b: CityBuildingSlot, margin: number): void {
  const hr = Math.max(b.width, b.depth) * 0.55 + margin;
  const dx = pos.x - b.x;
  const dz = pos.z - b.z;
  const d2 = dx * dx + dz * dz;
  if (d2 >= hr * hr) return;
  const d = Math.sqrt(d2) || 0.001;
  const push = hr - d;
  pos.x += (dx / d) * push;
  pos.z += (dz / d) * push;
}

function viewRayBlocked(cam: THREE.Vector3, look: THREE.Vector3, buildings: CityBuildingSlot[], pad: number): boolean {
  for (let t = 0.08; t <= 0.92; t += 0.07) {
    const px = cam.x + (look.x - cam.x) * t;
    const py = cam.y + (look.y - cam.y) * t;
    const pz = cam.z + (look.z - cam.z) * t;
    for (const b of buildings) {
      if (py > b.height + pad + 6) continue;
      const hr = Math.max(b.width, b.depth) * 0.52 + pad;
      if ((px - b.x) ** 2 + (pz - b.z) ** 2 < hr * hr) return true;
    }
  }
  return false;
}

export function clampAboveGround(pos: THREE.Vector3, minY: number): void {
  pos.y = Math.max(minY, pos.y);
}

export function skylineLookAt(focusX: number, focusZ: number, peakRoof: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(focusX, Math.max(22, peakRoof * 0.58), focusZ);
}

/** Camera behind the UFO, looking toward the skyline (mockup-style, never grazing the ground). */
export function chaseCameraFromUfo(
  ufo: THREE.Vector3,
  look: THREE.Vector3,
  buildings: CityBuildingSlot[],
  out: THREE.Vector3,
  back = 56,
  up = 28,
): THREE.Vector3 {
  const toLook = new THREE.Vector3(look.x - ufo.x, 0, look.z - ufo.z);
  if (toLook.lengthSq() < 1e-5) toLook.set(0, 0, -1);
  else toLook.normalize();

  out.copy(ufo).addScaledVector(toLook, -back).add(new THREE.Vector3(0, up, 0));
  clampAboveGround(out, MIN_CAMERA_Y);

  const horiz = Math.hypot(look.x - out.x, look.z - out.z);
  const minPitchDrop = Math.max(4, horiz * 0.09);
  if (out.y < look.y + minPitchDrop) {
    out.y = look.y + minPitchDrop;
  }

  pushCameraOutOfColumns(out, buildings, 18);

  const away = new THREE.Vector3(out.x - look.x, 0, out.z - look.z);
  if (away.lengthSq() < 1e-5) away.set(0, 0, 1);
  else away.normalize();
  for (let i = 0; i < 10 && viewRayBlocked(out, look, buildings, 10); i++) {
    out.y += 5;
    out.addScaledVector(away, 7);
    pushCameraOutOfColumns(out, buildings, 18);
    clampAboveGround(out, MIN_CAMERA_Y);
  }

  clampAboveGround(out, MIN_CAMERA_Y);
  return out;
}

export function clampUfoAboveGround(ufo: THREE.Vector3): void {
  clampAboveGround(ufo, MIN_UFO_Y);
}

export function clampUfoMinFocusDist(
  ufo: THREE.Vector3,
  focusX: number,
  focusZ: number,
  minDist: number,
): void {
  const dx = ufo.x - focusX;
  const dz = ufo.z - focusZ;
  const d = Math.hypot(dx, dz);
  if (d >= minDist || d < 1e-4) return;
  const s = minDist / d;
  ufo.x = focusX + dx * s;
  ufo.z = focusZ + dz * s;
}

/** Movement forward should match camera view; returns horizontal unit vector. */
export function cameraForwardXZ(cam: THREE.PerspectiveCamera, out: THREE.Vector3): THREE.Vector3 {
  cam.getWorldDirection(out);
  out.y = 0;
  if (out.lengthSq() < 1e-6) return out.set(0, 0, -1);
  return out.normalize();
}

export function cameraRightXZ(forward: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  return out.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
}
