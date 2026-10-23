import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadGameThumbnail } from '../../lib/cityTextureCache';
import type { CityBuildingSlot, CitySpawn } from '../../lib/citySpiral';

interface CityBuildingsProps {
  buildings: CityBuildingSlot[];
  craftPos: THREE.Vector3;
  spawn: CitySpawn;
}

const POSTER_MAX = 52;
const BODY_SEGMENTS = 3;

function posterWorldSize(): number {
  return 5.12;
}

function pickPosterSlots(buildings: CityBuildingSlot[], craft: THREE.Vector3): Set<string> {
  const ids = new Set<string>();
  for (const b of buildings) {
    if (b.topVotes || b.topToday) ids.add(b.game.gameId);
  }
  const byDist = [...buildings].sort((a, b) => {
    const da = (a.x - craft.x) ** 2 + (a.z - craft.z) ** 2;
    const db = (b.x - craft.x) ** 2 + (b.z - craft.z) ** 2;
    return da - db;
  });
  for (const b of byDist) {
    if (ids.size >= POSTER_MAX) break;
    const radial = Math.hypot(b.x, b.z);
    if (radial < 14) continue;
    ids.add(b.game.gameId);
  }
  return ids;
}

function voxelColor(seed: number, lift = 0): THREE.Color {
  const hues = [0.72, 0.76, 0.8, 0.66, 0.62];
  const h = hues[(seed + lift) % hues.length];
  const c = new THREE.Color();
  c.setHSL(h, 0.58, 0.24 + lift * 0.04);
  return c;
}

function emissiveColor(seed: number): THREE.Color {
  const hues = [0.82, 0.52, 0.12, 0.68, 0.45];
  const h = hues[seed % hues.length];
  const c = new THREE.Color();
  c.setHSL(h, 0.85, 0.55);
  return c;
}

export function CityBuildings({ buildings, craftPos, spawn }: CityBuildingsProps) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const slabRef = useRef<THREE.InstancedMesh>(null);
  const windowRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const posterIds = useMemo(() => {
    const atSpawn = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
    return pickPosterSlots(buildings, atSpawn);
  }, [buildings, spawn.x, spawn.y, spawn.z]);

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1038',
        emissive: '#4c1d95',
        emissiveIntensity: 0.38,
        metalness: 0.38,
        roughness: 0.44,
        vertexColors: true,
      }),
    [],
  );

  const slabMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e1065',
        emissive: '#4c1d95',
        emissiveIntensity: 0.28,
        metalness: 0.4,
        roughness: 0.38,
        vertexColors: true,
      }),
    [],
  );

  const windowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#38bdf8',
        emissiveIntensity: 0.95,
        metalness: 0.2,
        roughness: 0.35,
        vertexColors: true,
      }),
    [],
  );

  useEffect(() => {
    const mesh = bodyRef.current;
    const slabs = slabRef.current;
    const windows = windowRef.current;
    if (!mesh || buildings.length === 0) return;

    let bodyIdx = 0;
    let slabIdx = 0;
    let winIdx = 0;

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      for (let s = 0; s < BODY_SEGMENTS; s++) {
        const t0 = s / BODY_SEGMENTS;
        const t1 = (s + 1) / BODY_SEGMENTS;
        const segH = b.height * (t1 - t0);
        const y = b.height * t0 + segH / 2;
        const taper = 1 - s * 0.09;
        dummy.position.set(b.x, y, b.z);
        dummy.scale.set(b.width * taper, segH, b.depth * taper);
        dummy.rotation.y = b.faceYaw;
        dummy.updateMatrix();
        mesh.setMatrixAt(bodyIdx++, dummy.matrix);
        mesh.setColorAt(bodyIdx - 1, voxelColor(b.seed, s));

        if (slabs) {
          dummy.position.set(b.x, b.height * t1 - 0.08, b.z);
          dummy.scale.set(b.width * taper * 1.14, 0.55, b.depth * taper * 1.14);
          dummy.rotation.y = b.faceYaw;
          dummy.updateMatrix();
          slabs.setMatrixAt(slabIdx++, dummy.matrix);
          slabs.setColorAt(slabIdx - 1, voxelColor(b.seed, s + 2));
        }
      }

      if (windows) {
        const bands = [0.32, 0.58, 0.82];
        for (const t of bands) {
          const taper = 1 - Math.floor(t * BODY_SEGMENTS) * 0.09;
          const faceZ = b.depth * taper * 0.52;
          dummy.position.set(
            b.x + Math.sin(b.faceYaw) * faceZ,
            b.height * t,
            b.z + Math.cos(b.faceYaw) * faceZ,
          );
          dummy.scale.set(b.width * taper * 0.9, 1.05, 0.35);
          dummy.rotation.y = b.faceYaw;
          dummy.updateMatrix();
          windows.setMatrixAt(winIdx, dummy.matrix);
          windows.setColorAt(winIdx, emissiveColor(b.seed + winIdx));
          winIdx++;
        }
      }
    }

    mesh.count = bodyIdx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (slabs) {
      slabs.count = slabIdx;
      slabs.instanceMatrix.needsUpdate = true;
      if (slabs.instanceColor) slabs.instanceColor.needsUpdate = true;
    }
    if (windows) {
      windows.count = winIdx;
      windows.instanceMatrix.needsUpdate = true;
      if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
    }
  }, [buildings, dummy]);

  const posters = useMemo(
    () => buildings.filter((b) => posterIds.has(b.game.gameId)),
    [buildings, posterIds],
  );

  const bodyCap = Math.max(1, buildings.length * BODY_SEGMENTS);

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, bodyMat, bodyCap]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={slabRef} args={[undefined, slabMat, bodyCap]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh
        ref={windowRef}
        args={[undefined, windowMat, Math.max(1, buildings.length * 3)]}
        frustumCulled={false}
      >
        <boxGeometry />
      </instancedMesh>
      {posters.map((b) => (
        <GameBillboard key={b.game.gameId} slot={b} spawn={spawn} />
      ))}
    </group>
  );
}

function GameBillboard({ slot }: { slot: CityBuildingSlot; spawn: CitySpawn }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const size = posterWorldSize();
  const y = slot.height * 0.48;
  const offset = -(slot.depth / 2 + 0.14);

  const posterMat = useMemo(() => {
    if (!tex) return null;
    return new THREE.MeshBasicMaterial({
      map: tex,
      toneMapped: false,
    });
  }, [tex]);

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#312e81',
        emissiveIntensity: 0.25,
        metalness: 0.5,
        roughness: 0.4,
      }),
    [],
  );

  useEffect(() => {
    let alive = true;
    setTex(null);
    loadGameThumbnail(slot.game.thumbnailUrl)
      .then((t) => {
        if (alive) setTex(t);
      })
      .catch(() => {
        if (alive) setTex(null);
      });
    return () => {
      alive = false;
    };
  }, [slot.game.thumbnailUrl]);

  if (!tex || !posterMat) return null;

  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, slot.faceYaw, 0]}>
      <mesh position={[0, y, offset - 0.06]} rotation={[0, Math.PI, 0]} material={frameMat}>
        <boxGeometry args={[size + 0.28, size + 0.28, 0.16]} />
      </mesh>
      <mesh position={[0, y, offset - 0.04]} rotation={[0, Math.PI, 0]} material={posterMat}>
        <planeGeometry args={[size, size]} />
      </mesh>
      {slot.topToday && (slot.game.votesToday ?? 0) > 0 ? (
        <mesh position={[0, y + size * 0.52, offset + 0.05]}>
          <boxGeometry args={[size * 0.82, 0.9, 0.1]} />
          <meshStandardMaterial color="#0f172a" emissive="#fbbf24" emissiveIntensity={2.2} />
        </mesh>
      ) : null}
    </group>
  );
}
