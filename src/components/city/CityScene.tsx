import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { preloadCityThumbnails } from '../../lib/cityTextureCache';
import { buildCityLayout, computeCitySpawn, type CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { CityBuildings } from './CityBuildings';
import { CityRoad } from './CityRoad';
import { CityTraffic } from './CityTraffic';
import { UfoRig, type FlightInput } from './UfoRig';

export type CityFlightMode = 'fly' | 'landing' | 'landed';

interface CitySceneProps {
  games: JamGame[];
  inputRef: MutableRefObject<FlightInput>;
  mode: CityFlightMode;
  landTarget: CityBuildingSlot | null;
  landProgress: number;
  onCraftMove: (pos: THREE.Vector3) => void;
  onNearBuilding: (slot: CityBuildingSlot | null) => void;
}

export function CityScene({
  games,
  inputRef,
  mode,
  landTarget,
  landProgress,
  onCraftMove,
  onNearBuilding,
}: CitySceneProps) {
  const layout = useMemo(() => buildCityLayout(games), [games]);
  const { buildings, roadPoints } = layout;
  const spawn = useMemo(() => computeCitySpawn(buildings), [buildings]);
  const craftPos = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));

  useEffect(() => {
    const w = window as typeof window & { __cityFocus?: { x: number; z: number } };
    w.__cityFocus = { x: spawn.focusX, z: spawn.focusZ };
  }, [spawn]);

  useEffect(() => {
    const urls = buildings
      .filter((b) => b.topVotes || b.topToday || b.index < 160)
      .slice(0, 120)
      .map((b) => b.game.thumbnailUrl);
    preloadCityThumbnails(urls);
  }, [buildings]);

  useFrame(() => {
    if (mode === 'fly') {
      let best: CityBuildingSlot | null = null;
      let bestD = Infinity;
      for (const b of buildings) {
        const dx = craftPos.current.x - b.x;
        const dz = craftPos.current.z - b.z;
        const horiz = Math.hypot(dx, dz);
        if (horiz > Math.max(12, b.width * 1.5)) continue;
        const dy = Math.abs(craftPos.current.y - (b.roofY + 5));
        if (dy > 16) continue;
        if (horiz < bestD) {
          bestD = horiz;
          best = b;
        }
      }
      onNearBuilding(best);
    } else {
      onNearBuilding(landTarget);
    }
  });

  return (
    <>
      <color attach="background" args={['#12061f']} />
      <fog attach="fog" args={['#12061f', 85, 380]} />
      <hemisphereLight color="#a78bfa" groundColor="#0a0614" intensity={0.38} />
      <ambientLight intensity={0.28} color="#4c1d95" />
      <directionalLight position={[60, 90, 40]} intensity={0.95} color="#e9d5ff" />
      <pointLight position={[spawn.focusX, spawn.focusY + 18, spawn.focusZ]} intensity={1.35} color="#c084fc" distance={320} decay={1.6} />
      <pointLight position={[-80, 30, 60]} intensity={0.75} color="#c084fc" distance={170} decay={2} />
      <pointLight position={[90, 25, -50]} intensity={0.85} color="#22d3ee" distance={160} decay={2} />
      <spotLight
        position={[0, 120, 0]}
        angle={0.45}
        penumbra={0.6}
        intensity={0.65}
        color="#c4b5fd"
        distance={280}
      />
      <CityRoad points={roadPoints} />
      <CityTraffic points={roadPoints} />
      <CityBuildings buildings={buildings} craftPos={craftPos.current} spawn={spawn} />
      <UfoRig
        inputRef={inputRef}
        mode={mode}
        spawn={spawn}
        buildings={buildings}
        landTarget={landTarget ? { x: landTarget.x, z: landTarget.z, roofY: landTarget.roofY } : null}
        landProgress={landProgress}
        onPosition={(pos) => {
          craftPos.current.copy(pos);
          onCraftMove(pos);
        }}
      />
    </>
  );
}
