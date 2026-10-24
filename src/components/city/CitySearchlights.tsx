import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot } from '../../lib/citySpiral';

/** A few slow beams from the tallest roofs. Outskirts stay dark. */
export function CitySearchlights({ buildings }: { buildings: CityBuildingSlot[] }) {
  const beamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#dbeafe',
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const picks = useMemo(
    () =>
      [...buildings]
        .sort((a, b) => b.height - a.height)
        .filter((b) => b.height > 70)
        .slice(0, 8),
    [buildings],
  );
  const rigs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rigs.current.forEach((rig, i) => {
      if (!rig) return;
      rig.rotation.y = t * 0.22 + i * 0.8;
      rig.rotation.z = Math.sin(t * 0.35 + i) * 0.28;
    });
  });

  if (picks.length === 0) return null;

  return (
    <group>
      {picks.map((b, i) => (
        <group
          key={b.game.gameId}
          position={[b.x, b.roofY, b.z]}
          ref={(node) => {
            rigs.current[i] = node;
          }}
        >
          <mesh position={[0, 42, 0]} rotation={[0.2, 0, 0.42]} material={beamMat}>
            <coneGeometry args={[8.5, 84, 14, 1, true]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
