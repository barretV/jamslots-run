import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadGameThumbnail } from '../../lib/cityTextureCache';
import type { CityBuildingSlot } from '../../lib/citySpiral';

interface CityBuildingsProps {
  buildings: CityBuildingSlot[];
  craftPos: THREE.Vector3;
}

const POSTER_MAX = 56;
/** World units for the 512×512 poster quad (square billboards). */
const POSTER_WORLD = 5.12;
const BODY_SEGMENTS = 3;

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
    ids.add(b.game.gameId);
  }
  return ids;
}

function voxelColor(seed: number, lift = 0): THREE.Color {
  const hues = [0.74, 0.78, 0.82, 0.68, 0.58];
  const h = hues[(seed + lift) % hues.length];
  const c = new THREE.Color();
  c.setHSL(h, 0.68, 0.28 + lift * 0.04);
  return c;
}

function emissiveColor(seed: number): THREE.Color {
  const hues = [0.82, 0.52, 0.12, 0.68];
  const h = hues[seed % hues.length];
  const c = new THREE.Color();
  c.setHSL(h, 0.85, 0.55);
  return c;
}

export function CityBuildings({ buildings, craftPos }: CityBuildingsProps) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const windowRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [posterIds, setPosterIds] = useState<Set<string>>(() => new Set());

  const bodyMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#1a1038',
      emissive: '#4c1d95',
      emissiveIntensity: 0.52,
      metalness: 0.38,
      roughness: 0.44,
      vertexColors: true,
    });
    return m;
  }, []);

  const windowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#22d3ee',
        emissiveIntensity: 1.85,
        metalness: 0.2,
        roughness: 0.35,
        vertexColors: true,
      }),
    [],
  );

  const crownMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e1065',
        emissive: '#ffffff',
        emissiveIntensity: 1.2,
        metalness: 0.35,
        roughness: 0.3,
        vertexColors: true,
      }),
    [],
  );

  useEffect(() => {
    const mesh = bodyRef.current;
    if (!mesh || buildings.length === 0) return;

    const crownIndices: number[] = [];
    const windows = windowRef.current;
    let winIdx = 0;

    const bodyCount = buildings.length * BODY_SEGMENTS;
    let bodyIdx = 0;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      for (let s = 0; s < BODY_SEGMENTS; s++) {
        const t0 = s / BODY_SEGMENTS;
        const t1 = (s + 1) / BODY_SEGMENTS;
        const segH = b.height * (t1 - t0);
        const y = b.height * t0 + segH / 2;
        const taper = 1 - s * 0.07;
        dummy.position.set(b.x, y, b.z);
        dummy.scale.set(b.width * taper, segH, b.depth * taper);
        dummy.rotation.y = b.faceYaw;
        dummy.updateMatrix();
        mesh.setMatrixAt(bodyIdx, dummy.matrix);
        mesh.setColorAt(bodyIdx, voxelColor(b.seed, s));
        bodyIdx++;
      }
      if (b.topVotes || b.topToday) crownIndices.push(i);

      if (windows) {
        const bands = [0.28, 0.52, 0.76];
        for (const t of bands) {
          dummy.position.set(b.x, b.height * t, b.z + b.depth * 0.52);
          dummy.scale.set(b.width * 0.88, 0.42, 0.18);
          dummy.rotation.y = b.faceYaw;
          dummy.updateMatrix();
          windows.setMatrixAt(winIdx, dummy.matrix);
          windows.setColorAt(winIdx, emissiveColor(b.seed + winIdx));
          winIdx++;
        }
      }
    }
    mesh.count = bodyCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (windows) {
      windows.count = winIdx;
      windows.instanceMatrix.needsUpdate = true;
      if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    const crown = crownRef.current;
    if (crown && crownIndices.length > 0) {
      let ci = 0;
      for (const i of crownIndices) {
        const b = buildings[i];
        dummy.position.set(b.x, b.height + (b.topVotes ? 2.2 : 1.2), b.z);
        dummy.scale.set(
          b.width * (b.topVotes ? 1.08 : 1),
          b.topVotes ? 2.8 : 1.6,
          b.depth * (b.topVotes ? 1.08 : 1),
        );
        dummy.rotation.y = b.faceYaw;
        dummy.updateMatrix();
        crown.setMatrixAt(ci++, dummy.matrix);
        crown.setColorAt(ci - 1, emissiveColor(b.seed));
      }
      crown.count = crownIndices.length;
      crown.instanceMatrix.needsUpdate = true;
      if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
    } else if (crown) {
      crown.count = 0;
    }
  }, [buildings, dummy]);

  useFrame(() => {
    setPosterIds((prev) => {
      const next = pickPosterSlots(buildings, craftPos);
      if (prev.size === next.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  });

  const posters = useMemo(
    () => buildings.filter((b) => posterIds.has(b.game.gameId)),
    [buildings, posterIds],
  );

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[undefined, bodyMat, Math.max(1, buildings.length * BODY_SEGMENTS)]}
        frustumCulled={false}
      >
        <boxGeometry />
      </instancedMesh>
      <instancedMesh
        ref={windowRef}
        args={[undefined, windowMat, Math.max(1, buildings.length * 3)]}
        frustumCulled={false}
      >
        <boxGeometry />
      </instancedMesh>
      <instancedMesh
        ref={crownRef}
        args={[undefined, crownMat, Math.min(24, buildings.length)]}
        frustumCulled={false}
      >
        <boxGeometry />
      </instancedMesh>
      {posters.map((b) => (
        <GameBillboard key={b.game.gameId} slot={b} />
      ))}
    </group>
  );
}

function GameBillboard({ slot }: { slot: CityBuildingSlot }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const size = Math.min(POSTER_WORLD, slot.posterSize);
  const y = slot.height * 0.48;
  const offset = slot.depth / 2 + 0.22;

  useEffect(() => {
    let alive = true;
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

  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, slot.faceYaw, 0]}>
      <mesh position={[0, y, offset]}>
        <boxGeometry args={[size + 0.35, size + 0.35, 0.12]} />
        <meshStandardMaterial
          color="#120a1e"
          emissive="#f472b6"
          emissiveIntensity={0.65}
          metalness={0.55}
          roughness={0.32}
        />
      </mesh>
      {tex ? (
        <mesh position={[0, y, offset + 0.08]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial map={tex} toneMapped={false} color="#ffffff" />
        </mesh>
      ) : (
        <mesh position={[0, y, offset + 0.08]}>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial color="#4c1d95" emissive="#a855f7" emissiveIntensity={0.9} />
        </mesh>
      )}
      {slot.topToday && (slot.game.votesToday ?? 0) > 0 ? (
        <mesh position={[0, y + size * 0.55, offset + 0.12]}>
          <planeGeometry args={[size * 0.85, 1.1]} />
          <meshStandardMaterial color="#0f172a" emissive="#fbbf24" emissiveIntensity={2.2} />
        </mesh>
      ) : null}
    </group>
  );
}
