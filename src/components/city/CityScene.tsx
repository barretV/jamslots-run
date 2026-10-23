import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildCityLayout, type CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { BalloonRig } from './BalloonRig';
import type { FlightInput } from './BalloonRig';
import { CityBuildings } from './CityBuildings';
import { CityRoad } from './CityRoad';
import { CityTraffic } from './CityTraffic';

export type CityFlightMode = 'fly' | 'landing' | 'landed';

interface CitySceneProps {
  games: JamGame[];
  inputRef: MutableRefObject<FlightInput>;
  mode: CityFlightMode;
  landTarget: CityBuildingSlot | null;
  landProgress: number;
  onBalloonMove: (pos: THREE.Vector3) => void;
  onNearBuilding: (slot: CityBuildingSlot | null) => void;
}

export function CityScene({
  games,
  inputRef,
  mode,
  landTarget,
  landProgress,
  onBalloonMove,
  onNearBuilding,
}: CitySceneProps) {
  const layout = useMemo(() => buildCityLayout(games), [games]);
  const { buildings, roadPoints } = layout;
  const spawn = useMemo(() => {
    const b = buildings[0];
    if (!b) return { x: 0, y: 30, z: 6 };
    return { x: b.x, y: b.roofY + 7, z: b.z + 5 };
  }, [buildings]);
  const balloonPos = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));
  const windowMat = useRef<THREE.ShaderMaterial | null>(null);
  const [, setTick] = useState(0);

  useFrame((state) => {
    if (windowMat.current) windowMat.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (mode === 'fly') {
      let best: CityBuildingSlot | null = null;
      let bestD = Infinity;
      for (const b of buildings) {
        const dx = balloonPos.current.x - b.x;
        const dz = balloonPos.current.z - b.z;
        const horiz = Math.hypot(dx, dz);
        if (horiz > Math.max(9, b.width * 1.8)) continue;
        const dy = Math.abs(balloonPos.current.y - (b.roofY + 4));
        if (dy > 14) continue;
        if (horiz < bestD) {
          bestD = horiz;
          best = b;
        }
      }
      onNearBuilding(best);
    } else {
      onNearBuilding(landTarget);
    }
    setTick((t) => t);
  });

  const groundSize = 520;

  return (
    <>
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 45, 260]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[40, 80, 20]} intensity={0.55} color="#c4b5fd" />
      <pointLight position={[0, 40, 0]} intensity={0.35} color="#22d3ee" distance={120} />
      <Stars radius={180} depth={60} count={1200} factor={3} saturation={0.15} fade speed={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial
          color="#030308"
          emissive="#0f172a"
          emissiveIntensity={0.2}
          metalness={0.92}
          roughness={0.28}
        />
      </mesh>
      <CityRoad points={roadPoints} />
      <CityTraffic points={roadPoints} />
      <CityBuildings
        buildings={buildings}
        balloonPos={balloonPos.current}
        onMaterialsReady={(m) => {
          windowMat.current = m;
        }}
      />
      <BalloonRig
        inputRef={inputRef}
        mode={mode}
        spawn={spawn}
        landTarget={landTarget ? { x: landTarget.x, z: landTarget.z, roofY: landTarget.roofY } : null}
        landProgress={landProgress}
        onPosition={(pos) => {
          balloonPos.current.copy(pos);
          onBalloonMove(pos);
        }}
      />
    </>
  );
}
