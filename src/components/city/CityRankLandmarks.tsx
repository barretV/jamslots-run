import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot } from '../../lib/citySpiral';

const GOLD = '#fbbf24';
const AMBER = '#f59e0b';
const CREAM = '#fff4c2';

function rankStrength(rank: number): number {
  return (10 - rank) / 9;
}

function makeRankTexture(rank: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(28, 16, 2, 0.72)';
    ctx.fillRect(28, 58, 200, 140);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 8;
    ctx.strokeRect(28, 58, 200, 140);
    ctx.font = 'bold 132px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CREAM;
    ctx.shadowColor = AMBER;
    ctx.shadowBlur = 18;
    ctx.fillText(String(rank), 128, 132);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function RankMark({ slot }: { slot: CityBuildingSlot }) {
  const rank = slot.voteRank;
  const t = rankStrength(rank);
  const ringRef = useRef<THREE.Group>(null);
  const tex = useMemo(() => makeRankTexture(rank), [rank]);
  const numMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
    [tex],
  );
  useEffect(
    () => () => {
      tex.dispose();
      numMat.dispose();
    },
    [numMat, tex],
  );

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.y += Math.min(delta, 0.05) * (0.28 + t * 0.35);
  });

  const extraTiers = rank === 1 ? 3 : rank <= 3 ? 2 : rank <= 6 ? 1 : 0;
  const showSpire = rank <= 6;
  const showRing = rank <= 4;
  const beaconH = 26 + t * 98;
  const glow = 0.55 + t * 2.1;
  const capW = slot.width * (0.62 + t * 0.34);
  const capD = slot.depth * (0.62 + t * 0.34);
  const numeral = 8 + t * 14;
  const ox = slot.width * 0.22;
  const oz = -slot.depth * 0.22;
  return (
    <group position={[slot.x, slot.roofY, slot.z]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[capW, 1.1, capD]} />
        <meshStandardMaterial color="#6b3a0a" emissive={GOLD} emissiveIntensity={glow} metalness={0.35} roughness={0.32} toneMapped={false} />
      </mesh>
      {Array.from({ length: extraTiers }, (_, i) => {
        const shrink = 1 - (i + 1) * 0.16;
        const tierH = 2.2 + t * 1.4;
        return (
          <mesh key={i} position={[0, 1.6 + i * (tierH + 0.45), 0]}>
            <boxGeometry args={[capW * shrink, tierH, capD * shrink]} />
            <meshStandardMaterial
              color="#6b3a0a"
              emissive={i % 2 === 0 ? GOLD : AMBER}
              emissiveIntensity={glow * (1 - i * 0.12)}
              metalness={0.35}
              roughness={0.32}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      <mesh position={[ox, beaconH * 0.5, oz]}>
        <boxGeometry args={[0.7 + t * 0.55, beaconH, 0.7 + t * 0.55]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.38 + t * 0.28} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group position={[ox, 5 + t * 9, oz]}>
        <mesh position={[0, 0, 0.08]} material={numMat}>
          <planeGeometry args={[numeral, numeral]} />
        </mesh>
        <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]} material={numMat}>
          <planeGeometry args={[numeral, numeral]} />
        </mesh>
      </group>
      {showSpire ? (
        <mesh position={[ox, beaconH + numeral + (4 + t * 10), oz]}>
          <boxGeometry args={[0.16, 8 + t * 18, 0.16]} />
          <meshStandardMaterial color="#6b3a0a" emissive={CREAM} emissiveIntensity={1.2 + t} metalness={0.4} roughness={0.25} toneMapped={false} />
        </mesh>
      ) : null}
      {showRing ? (
        <group ref={ringRef} position={[ox, beaconH * (0.62 + t * 0.12), oz]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.8 + t * 2.4, 0.08 + t * 0.06, 8, 28]} />
            <meshBasicMaterial color={AMBER} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/** Real meshes for the ten most-voted towers. Everyone else stays on the instanced shell. */
export function CityRankLandmarks({ buildings }: { buildings: CityBuildingSlot[] }) {
  const ranked = useMemo(() => buildings.filter((b) => b.voteRank > 0), [buildings]);
  return (
    <group>
      {ranked.map((slot) => (
        <RankMark key={slot.game.gameId} slot={slot} />
      ))}
    </group>
  );
}
