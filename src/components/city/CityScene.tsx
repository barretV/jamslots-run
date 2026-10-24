import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { loadGameThumbnail, preloadCityThumbnails } from '../../lib/cityTextureCache';
import { buildCityLayout, computeCitySpawn, type CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { CityBuildings, pickCityPosterIds } from './CityBuildings';
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

  const posterUrls = useMemo(() => {
    const ids = pickCityPosterIds(buildings, spawn);
    return buildings.filter((b) => ids.has(b.game.gameId)).map((b) => b.game.thumbnailUrl);
  }, [buildings, spawn]);

  useEffect(() => {
    preloadCityThumbnails(
      buildings
        .filter((b) => b.topVotes || b.topToday || b.index < 80)
        .slice(0, 64)
        .map((b) => b.game.thumbnailUrl),
    );
  }, [buildings]);

  useEffect(() => {
    let alive = true;
    Promise.all(posterUrls.map((u) => loadGameThumbnail(u).catch(() => null))).then(() => {
      if (!alive) return;
      const w = window as typeof window & { __cityPostersReady?: boolean };
      w.__cityPostersReady = true;
    });
    return () => {
      alive = false;
    };
  }, [posterUrls]);

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
      <color attach="background" args={['#2a1450']} />
      <fog attach="fog" args={['#3b2068', 38, 260]} />
      <hemisphereLight color="#c084fc" groundColor="#14082a" intensity={0.48} />
      <ambientLight intensity={0.34} color="#6d28d9" />
      <directionalLight position={[60, 90, 40]} intensity={1.1} color="#f0e8ff" />
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
