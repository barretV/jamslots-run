import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot } from '../../lib/citySpiral';
import { createBuildingWindowMaterial } from './buildingWindowMaterial';

interface CityBuildingsProps {
  buildings: CityBuildingSlot[];
  balloonPos: THREE.Vector3;
  onMaterialsReady?: (mat: THREE.ShaderMaterial) => void;
}

const POSTER_MAX = 48;

function pickPosterSlots(buildings: CityBuildingSlot[], balloon: THREE.Vector3): Set<string> {
  const ids = new Set<string>();
  for (const b of buildings) {
    if (b.topVotes || b.topToday) ids.add(b.game.gameId);
  }
  const byDist = [...buildings].sort((a, b) => {
    const da = (a.x - balloon.x) ** 2 + (a.z - balloon.z) ** 2;
    const db = (b.x - balloon.x) ** 2 + (b.z - balloon.z) ** 2;
    return da - db;
  });
  for (const b of byDist) {
    if (ids.size >= POSTER_MAX) break;
    ids.add(b.game.gameId);
  }
  return ids;
}

export function CityBuildings({ buildings, balloonPos, onMaterialsReady }: CityBuildingsProps) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => createBuildingWindowMaterial(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [posterIds, setPosterIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    onMaterialsReady?.(material);
  }, [material, onMaterialsReady]);

  useEffect(() => {
    const mesh = bodyRef.current;
    if (!mesh || buildings.length === 0) return;

    const seeds = new Float32Array(buildings.length);
    let crownCount = 0;
    const crownIndices: number[] = [];

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      seeds[i] = b.seed % 997;
      dummy.position.set(b.x, b.height / 2, b.z);
      dummy.scale.set(b.width, b.height, b.depth);
      dummy.rotation.y = (b.seed % 360) * (Math.PI / 180) * 0.08;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (b.topVotes || b.topToday) crownIndices.push(i);
    }
    mesh.instanceMatrix.needsUpdate = true;

    const geo = mesh.geometry as THREE.BoxGeometry;
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    crownCount = crownIndices.length;

    const crown = crownRef.current;
    if (crown && crownCount > 0) {
      let ci = 0;
      for (const i of crownIndices) {
        const b = buildings[i];
        dummy.position.set(b.x, b.height + (b.topVotes ? 1.2 : 0.6), b.z);
        dummy.scale.set(
          b.width * (b.topVotes ? 1.15 : 1),
          b.topToday ? 1.4 : 0.9,
          b.depth * (b.topVotes ? 1.15 : 1),
        );
        dummy.rotation.y = 0;
        dummy.updateMatrix();
        crown.setMatrixAt(ci++, dummy.matrix);
      }
      crown.count = crownCount;
      crown.instanceMatrix.needsUpdate = true;
    } else if (crown) {
      crown.count = 0;
    }
  }, [buildings, dummy]);

  useFrame(() => {
    setPosterIds((prev) => {
      const next = pickPosterSlots(buildings, balloonPos);
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
      <instancedMesh ref={bodyRef} args={[undefined, material, buildings.length]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[undefined, undefined, Math.min(24, buildings.length)]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial
          color="#1a1030"
          emissive="#f472b6"
          emissiveIntensity={1.4}
          metalness={0.6}
          roughness={0.25}
        />
      </instancedMesh>
      {posters.map((b) => (
        <BuildingFacade key={b.game.gameId} slot={b} balloonPos={balloonPos} />
      ))}
    </group>
  );
}

function BuildingFacade({ slot, balloonPos }: { slot: CityBuildingSlot; balloonPos: THREE.Vector3 }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const dist = Math.hypot(slot.x - balloonPos.x, slot.z - balloonPos.z);
  const showLabels = dist < 28;

  useEffect(() => {
    let alive = true;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      slot.game.thumbnailUrl,
      (t) => {
        if (!alive) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        loaded = t;
        setTex(t);
      },
      undefined,
      () => {
        if (alive) setTex(null);
      },
    );
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [slot.game.thumbnailUrl]);

  const faceZ = slot.depth / 2 + 0.06;
  const signPulse = slot.topToday ? 1.1 + Math.sin(performance.now() * 0.004) * 0.15 : 1;

  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, (slot.seed % 8) * 0.12, 0]}>
      {tex ? (
        <mesh position={[0, slot.height * 0.45, faceZ]}>
          <planeGeometry args={[slot.width * 0.85, slot.height * 0.35]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ) : null}
      {slot.topToday && (slot.game.votesToday ?? 0) > 0 && showLabels ? (
        <mesh position={[0, slot.height + 0.8, faceZ]} scale={[signPulse, signPulse, 1]}>
          <planeGeometry args={[2.4, 0.9]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#fbbf24"
            emissiveIntensity={2}
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>
      ) : null}
      {showLabels ? (
        <TitleLabel
          title={slot.game.title}
          today={slot.game.votesToday ?? 0}
          y={slot.height + (slot.topToday ? 1.6 : 0.4)}
          z={faceZ}
        />
      ) : null}
    </group>
  );
}

function TitleLabel({ title, today, y, z }: { title: string; today: number; y: number; z: number }) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = today > 0 ? 128 : 96;
    return c;
  }, [today]);

  const texture = useMemo(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);
    ctx.fillStyle = 'rgba(8,4,18,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillStyle = '#fde68a';
    const line = title.length > 28 ? `${title.slice(0, 26)}…` : title;
    ctx.fillText(line, 16, 52);
    if (today > 0) {
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`+${today} today`, 16, 108);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [canvas, title, today]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[4.2, today > 0 ? 1.05 : 0.75]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
