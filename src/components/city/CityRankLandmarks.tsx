import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot } from '../../lib/citySpiral';

const GOLD = '#fbbf24';
const AMBER = '#f59e0b';
const CREAM = '#fff4c2';

interface CrownMetrics {
  t: number;
  extraTiers: number;
  tierH: number;
  tierYs: number[];
  beaconH: number;
  spireH: number;
  meshTop: number;
  /** Clearance above the roof before a poster may start. */
  top: number;
  numeral: number;
  showSpire: boolean;
  showRing: boolean;
  glow: number;
}

/** Short gold crown. The old beacon ran through the poster. */
export function crownMetrics(rank: number): CrownMetrics {
  const t = (10 - rank) / 9;
  const extraTiers = rank === 1 ? 3 : rank <= 3 ? 2 : rank <= 6 ? 1 : 0;
  const tierH = 1.35 + t * 0.65;
  const capTop = 1.25;
  const tierYs: number[] = [];
  let tiersTop = capTop;
  for (let i = 0; i < extraTiers; i++) {
    const y = capTop + 0.35 + tierH * 0.5 + i * (tierH + 0.28);
    tierYs.push(y);
    tiersTop = y + tierH * 0.5;
  }
  const beaconH = 3.4 + t * 6.8;
  const spireH = rank <= 6 ? 2.6 + t * 4 : 0;
  const meshTop = Math.max(tiersTop, beaconH + spireH);
  const numeral = 4.6 + t * 6.4;
  return {
    t,
    extraTiers,
    tierH,
    tierYs,
    beaconH,
    spireH,
    meshTop,
    top: meshTop + 0.4,
    numeral,
    showSpire: rank <= 6,
    showRing: rank <= 4,
    glow: 1.15 + t * 2.35,
  };
}

export function rankTopperHeight(rank: number): number {
  if (rank < 1 || rank > 10) return 0;
  return crownMetrics(rank).top;
}

/** 0 when the poster is being read, 1 when the crown is a distant landmark. */
export function rankGlowMul(dist: number): number {
  return 0.1 + 0.9 * THREE.MathUtils.smoothstep(dist, 96, 250);
}

export function makeRankTexture(rank: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(12, 8, 2, 0.92)';
    ctx.fillRect(18, 48, 220, 160);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 48, 220, 160);
    ctx.font = 'bold 128px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1a0e02';
    ctx.strokeText(String(rank), 128, 132);
    ctx.fillStyle = CREAM;
    ctx.fillText(String(rank), 128, 132);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function goldMat(intensity: number, emissive: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#6b3a0a',
    emissive: new THREE.Color(emissive),
    emissiveIntensity: intensity,
    metalness: 0.35,
    roughness: 0.32,
    toneMapped: false,
  });
}

interface FadeSlot {
  emis?: THREE.MeshStandardMaterial;
  opac?: THREE.MeshBasicMaterial;
  base: number;
}

function RankMark({ slot }: { slot: CityBuildingSlot }) {
  const rank = slot.voteRank;
  const ringRef = useRef<THREE.Group>(null);

  const pieces = useMemo(() => {
    const m = crownMetrics(rank);
    const fades: FadeSlot[] = [];
    const cap = goldMat(m.glow, GOLD);
    fades.push({ emis: cap, base: m.glow });
    const tiers = m.tierYs.map((y, i) => {
      const intensity = m.glow * (1 - i * 0.12);
      const mat = goldMat(intensity, i % 2 === 0 ? GOLD : AMBER);
      fades.push({ emis: mat, base: intensity });
      return { y, mat, shrink: 1 - (i + 1) * 0.16 };
    });
    const beaconOp = 0.1 + m.t * 0.14;
    const beacon = new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: beaconOp,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    fades.push({ opac: beacon, base: beaconOp });
    let spire: THREE.MeshStandardMaterial | null = null;
    if (m.showSpire) {
      const spireBase = 1.2 + m.t * 1.5;
      spire = goldMat(spireBase, CREAM);
      fades.push({ emis: spire, base: spireBase });
    }
    let ring: THREE.MeshBasicMaterial | null = null;
    if (m.showRing) {
      ring = new THREE.MeshBasicMaterial({
        color: AMBER,
        transparent: true,
        opacity: 0.82,
        toneMapped: false,
      });
      fades.push({ opac: ring, base: 0.82 });
    }
    return { m, cap, tiers, beacon, spire, ring, fades };
  }, [rank]);

  useEffect(() => {
    const bag = pieces;
    return () => {
      bag.cap.dispose();
      bag.beacon.dispose();
      bag.spire?.dispose();
      bag.ring?.dispose();
      for (const tier of bag.tiers) tier.mat.dispose();
    };
  }, [pieces]);

  useFrame((state, delta) => {
    if (ringRef.current) ringRef.current.rotation.y += Math.min(delta, 0.05) * 0.35;
    const cam = state.camera.position;
    const crownY = slot.roofY + pieces.m.meshTop * 0.45;
    const dist = Math.hypot(cam.x - slot.x, cam.y - crownY, cam.z - slot.z);
    const mul = rankGlowMul(dist);
    const addMul = THREE.MathUtils.smoothstep(dist, 110, 200);
    for (const fade of pieces.fades) {
      if (fade.emis) fade.emis.emissiveIntensity = fade.base * mul;
      if (fade.opac) fade.opac.opacity = fade.base * addMul;
    }
  });

  const { m, cap, tiers, beacon, spire, ring } = pieces;
  const capW = slot.width * (0.62 + m.t * 0.34);
  const capD = slot.depth * (0.62 + m.t * 0.34);

  return (
    <group>
      <group position={[slot.x, slot.roofY, slot.z]}>
        <mesh position={[0, 0.7, 0]} material={cap}>
          <boxGeometry args={[capW, 1.1, capD]} />
        </mesh>
        {tiers.map((tier, i) => (
          <mesh key={i} position={[0, tier.y, 0]} material={tier.mat}>
            <boxGeometry args={[capW * tier.shrink, m.tierH, capD * tier.shrink]} />
          </mesh>
        ))}
        <mesh position={[0, m.beaconH * 0.5, 0]} material={beacon}>
          <boxGeometry args={[0.42 + m.t * 0.55, m.beaconH, 0.42 + m.t * 0.55]} />
        </mesh>
        {spire ? (
          <mesh position={[0, m.beaconH + m.spireH * 0.5, 0]} material={spire}>
            <boxGeometry args={[0.16, m.spireH, 0.16]} />
          </mesh>
        ) : null}
        {ring ? (
          <group ref={ringRef} position={[0, m.beaconH * 0.72, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={ring}>
              <torusGeometry args={[1.15 + m.t * 1.1, 0.07 + m.t * 0.04, 8, 28]} />
            </mesh>
          </group>
        ) : null}
      </group>
    </group>
  );
}

/** Real meshes for the ten most-voted towers. Everyone else stays on the instanced shell. */
export function CityRankLandmarks({ buildings }: { buildings: CityBuildingSlot[] }) {
  const ranked = useMemo(
    () => buildings.filter((b) => b.voteRank >= 1 && b.voteRank <= 10),
    [buildings],
  );
  return (
    <group>
      {ranked.map((slot) => (
        <RankMark key={slot.game.gameId} slot={slot} />
      ))}
    </group>
  );
}
