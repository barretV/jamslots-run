import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadGameThumbnail } from '../../lib/cityTextureCache';
import type { CityBuildingSlot, CitySpawn } from '../../lib/citySpiral';

interface CityBuildingsProps {
  buildings: CityBuildingSlot[];
  craftPos: THREE.Vector3;
  spawn: CitySpawn;
}

const POSTER_MAX = 38;
const POSTER_MAX_WORLD = 5.12;

function posterWorldSize(slot: CityBuildingSlot): number {
  const byFace = Math.min(slot.width * 0.92, slot.height * 0.34);
  return Math.min(POSTER_MAX_WORLD, Math.max(3.35, byFace));
}

function pickPosterSlots(
  buildings: CityBuildingSlot[],
  craft: THREE.Vector3,
  spawn: CitySpawn,
): Set<string> {
  const ids = new Set<string>();
  const byScore = [...buildings].sort((a, b) => {
    const da = (a.x - spawn.x) ** 2 + (a.z - spawn.z) ** 2;
    const db = (b.x - spawn.x) ** 2 + (b.z - spawn.z) ** 2;
    const nearSpawn = da < 55 * 55 ? 1 : 0;
    const nearSpawnB = db < 55 * 55 ? 1 : 0;
    if (nearSpawn !== nearSpawnB) return nearSpawn - nearSpawnB;
    const scoreA = (a.topVotes ? 4 : 0) + (a.topToday ? 2 : 0) + a.game.votes * 0.001;
    const scoreB = (b.topVotes ? 4 : 0) + (b.topToday ? 2 : 0) + b.game.votes * 0.001;
    return scoreB - scoreA;
  });
  for (const b of byScore) {
    if (ids.size >= POSTER_MAX) break;
    const radial = Math.hypot(b.x, b.z);
    if (radial < 22 || radial > 105) continue;
    const dSpawn = (b.x - spawn.x) ** 2 + (b.z - spawn.z) ** 2;
    if (dSpawn < 58 * 58) continue;
    const toHubX = spawn.focusX - b.x;
    const toHubZ = spawn.focusZ - b.z;
    const inwardX = -Math.sin(b.faceYaw);
    const inwardZ = -Math.cos(b.faceYaw);
    if (inwardX * toHubX + inwardZ * toHubZ < 0.35) continue;
    const dCraft = (b.x - craft.x) ** 2 + (b.z - craft.z) ** 2;
    if (dCraft < 38 * 38) continue;
    ids.add(b.game.gameId);
  }
  return ids;
}

function voxelColor(seed: number, lift = 0): THREE.Color {
  const hues = [0.74, 0.78, 0.82, 0.68, 0.58, 0.64];
  const h = hues[(seed + lift) % hues.length];
  const c = new THREE.Color();
  c.setHSL(h, 0.62 + (lift % 3) * 0.04, 0.26 + lift * 0.035);
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
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [posterIds, setPosterIds] = useState<Set<string>>(() => new Set());

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1038',
        emissive: '#4c1d95',
        emissiveIntensity: 0.32,
        metalness: 0.38,
        roughness: 0.44,
        vertexColors: true,
      }),
    [],
  );

  const crownMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e1065',
        emissive: '#22d3ee',
        emissiveIntensity: 1.05,
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
    let bodyIdx = 0;

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const tiers = b.tierScales.length;
      for (let s = 0; s < tiers; s++) {
        const t0 = s / tiers;
        const t1 = (s + 1) / tiers;
        const segH = b.height * (t1 - t0);
        const y = b.height * t0 + segH / 2;
        const scaleXZ = b.tierScales[s] * 0.92;
        const depthJitter = 0.9 + ((b.seed >> (s + 1)) % 5) * 0.02;
        dummy.position.set(b.x, y, b.z);
        dummy.scale.set(b.width * scaleXZ, segH, b.depth * scaleXZ * depthJitter);
        dummy.rotation.y = b.faceYaw;
        dummy.updateMatrix();
        mesh.setMatrixAt(bodyIdx, dummy.matrix);
        mesh.setColorAt(bodyIdx, voxelColor(b.seed, s));
        bodyIdx++;
      }
      if (b.topVotes || b.topToday) crownIndices.push(i);
    }
    mesh.count = bodyIdx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    const crown = crownRef.current;
    if (crown && crownIndices.length > 0) {
      let ci = 0;
      for (const i of crownIndices) {
        const b = buildings[i];
        dummy.position.set(b.x, b.height + (b.topVotes ? 2.2 : 1.2), b.z);
        dummy.scale.set(
          b.width * (b.topVotes ? 1.05 : 0.88),
          b.topVotes ? 2.4 : 1.2,
          b.depth * (b.topVotes ? 0.98 : 0.86),
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
      const next = pickPosterSlots(buildings, craftPos, spawn);
      if (prev.size === next.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  });

  const posters = useMemo(
    () => buildings.filter((b) => posterIds.has(b.game.gameId)),
    [buildings, posterIds],
  );

  const bodyCap = useMemo(
    () => Math.max(1, buildings.reduce((n, b) => n + b.tierScales.length, 0)),
    [buildings],
  );

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, bodyMat, bodyCap]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh
        ref={crownRef}
        args={[undefined, crownMat, Math.min(32, buildings.length)]}
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
  const size = posterWorldSize(slot);
  const y = slot.height * 0.42;
  const offset = -(slot.depth / 2 + 0.06);

  const posterMat = useMemo(() => {
    if (!tex) return null;
    return new THREE.MeshBasicMaterial({
      map: tex,
      toneMapped: false,
    });
  }, [tex]);

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
