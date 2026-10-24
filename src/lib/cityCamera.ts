import * as THREE from 'three';
import type { CityBuildingSlot } from './citySpiral';

export const CITY_GROUND_Y = 0;
export const MIN_CAMERA_Y = 6;
export const MIN_UFO_Y = 7;
/** UFO hull radius used for collision. */
export const UFO_RADIUS = 3.2;

/**
 * Push a point out of every building footprint it overlaps.
 * Buildings are axis-aligned boxes, so this is a cheap AABB resolve on XZ.
 */
function pushOutOfBox(pos: THREE.Vector3, b: CityBuildingSlot, margin: number): void {
  const hx = b.width * 0.5 + margin;
  const hz = b.depth * 0.5 + margin;
  const dx = pos.x - b.x;
  const dz = pos.z - b.z;
  if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) return;
  // Resolve along the shallowest axis so we slide along walls instead of snapping.
  const penX = hx - Math.abs(dx);
  const penZ = hz - Math.abs(dz);
  if (penX < penZ) pos.x += (dx >= 0 ? penX : -penX);
  else pos.z += (dz >= 0 ? penZ : -penZ);
}

/** UFO / low flight — ignore roofs we are clearly above. */
export function pushOutOfBuildings(pos: THREE.Vector3, buildings: CityBuildingSlot[], margin: number): void {
  for (const b of buildings) {
    if (pos.y > b.height + 1.5) continue;
    pushOutOfBox(pos, b, margin);
  }
}

/** Camera must never sit inside a tower footprint (even above the roof). */
export function pushCameraOutOfColumns(pos: THREE.Vector3, buildings: CityBuildingSlot[], margin: number): void {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const b of buildings) {
      if (pos.y > b.height + 0.5) continue;
      const before = pos.x + pos.z;
      pushOutOfBox(pos, b, margin);
      if (pos.x + pos.z !== before) moved = true;
    }
    if (!moved) break;
  }
}

function viewRayBlocked(cam: THREE.Vector3, look: THREE.Vector3, buildings: CityBuildingSlot[], pad: number): boolean {
  for (let t = 0.1; t <= 0.9; t += 0.1) {
    const px = cam.x + (look.x - cam.x) * t;
    const py = cam.y + (look.y - cam.y) * t;
    const pz = cam.z + (look.z - cam.z) * t;
    for (const b of buildings) {
      if (py > b.height + pad + 3) continue;
      const hx = b.width * 0.5 + pad;
      const hz = b.depth * 0.5 + pad;
      if (Math.abs(px - b.x) < hx && Math.abs(pz - b.z) < hz) return true;
    }
  }
  return false;
}

export function clampAboveGround(pos: THREE.Vector3, minY: number): void {
  pos.y = Math.max(minY, pos.y);
}

export function skylineLookAt(focusX: number, focusZ: number, peakRoof: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(focusX, Math.max(18, peakRoof * 0.42), focusZ);
}

/**
 * Third-person chase camera: sits behind and above the saucer, looks past it
 * across the city. Never dips to the ground and keeps towers out of the lens.
 */
export function chaseCameraFromUfo(
  ufo: THREE.Vector3,
  look: THREE.Vector3,
  buildings: CityBuildingSlot[],
  out: THREE.Vector3,
  back = 13,
  up = 5.5,
): THREE.Vector3 {
  const toLook = new THREE.Vector3(look.x - ufo.x, 0, look.z - ufo.z);
  if (toLook.lengthSq() < 1e-5) toLook.set(0, 0, -1);
  else toLook.normalize();

  out.copy(ufo).addScaledVector(toLook, -back).add(new THREE.Vector3(0, up, 0));
  clampAboveGround(out, MIN_CAMERA_Y);
  pushCameraOutOfColumns(out, buildings, 3.2);

  // If a tower is between us and the city, lift + back off until we can see.
  const away = new THREE.Vector3(out.x - look.x, 0, out.z - look.z);
  if (away.lengthSq() < 1e-5) away.set(0, 0, 1);
  else away.normalize();
  for (let i = 0; i < 5 && viewRayBlocked(out, look, buildings, 3); i++) {
    out.y += 3;
    out.addScaledVector(away, 4);
    pushCameraOutOfColumns(out, buildings, 3.2);
  }

  out.y = Math.max(out.y, MIN_CAMERA_Y);
  out.y = Math.min(out.y, ufo.y + 14);
  return out;
}

export function clampUfoAboveGround(ufo: THREE.Vector3): void {
  clampAboveGround(ufo, MIN_UFO_Y);
}

/** Movement forward should match camera view; returns horizontal unit vector. */
export function cameraForwardXZ(cam: THREE.PerspectiveCamera, out: THREE.Vector3): THREE.Vector3 {
  cam.getWorldDirection(out);
  out.y = 0;
  if (out.lengthSq() < 1e-6) return out.set(0, 0, -1);
  return out.normalize();
}

export function cameraRightXZ(forward: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  return out.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
}
