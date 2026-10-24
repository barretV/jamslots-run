import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { loadGameThumbnail, preloadCityThumbnails } from '../../lib/cityTextureCache';
import { buildCityLayout, computeCitySpawn, type CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { CityAirTraffic } from './CityAirTraffic';
import { CityBuildings, landAnchorY } from './CityBuildings';
import { CityPostFX } from './CityPostFX';
import { CityRain } from './CityRain';
import { CityRoad } from './CityRoad';
import { CitySearchlights } from './CitySearchlights';
import { CitySky } from './CitySky';
import { CityTraffic } from './CityTraffic';
import { UfoRig, type FlightInput, type SteerTarget } from './UfoRig';

export type CityFlightMode = 'fly' | 'landing' | 'landed';

interface CitySceneProps {
  games: JamGame[];
  inputRef: MutableRefObject<FlightInput>;
  steerRef: MutableRefObject<SteerTarget | null>;
  mode: CityFlightMode;
  landTarget: CityBuildingSlot | null;
  landProgress: number;
  onCraftMove: (pos: THREE.Vector3) => void;
  onNearBuilding: (slot: CityBuildingSlot | null) => void;
  quality?: 'low' | 'high';
  isFavorite?: (gameId: string) => boolean;
}

export function CityScene({
  games,
  inputRef,
  steerRef,
  mode,
  landTarget,
  landProgress,
  onCraftMove,
  onNearBuilding,
  quality = 'high',
  isFavorite,
}: CitySceneProps) {
  const layout = useMemo(() => buildCityLayout(games), [games]);
  const { buildings, streets } = layout;
  const spawn = useMemo(() => computeCitySpawn(buildings), [buildings]);
  const craftPos = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));

  useEffect(() => {
    const w = window as typeof window & {
      __cityFocus?: { x: number; z: number };
      __citySlots?: { id: string; title: string; x: number; z: number; y: number; width: number; height: number; voteRank: number }[];
    };
    w.__cityFocus = { x: spawn.focusX, z: spawn.focusZ };
    w.__citySlots = buildings.map((b) => ({
      id: b.game.gameId,
      title: b.game.title,
      x: b.x,
      z: b.z,
      y: b.roofY,
      width: b.width,
      height: b.height,
      voteRank: b.voteRank,
    }));
  }, [buildings, spawn]);

  useEffect(() => {
    preloadCityThumbnails(
      buildings
        .filter((b) => b.topVotes || b.topToday)
        .slice(0, 70)
        .map((b) => b.game.thumbnailUrl),
    );
  }, [buildings]);

  useEffect(() => {
    let alive = true;
    // Billboards now lazy-load their own textures based on craft proximity, so
    // we only eagerly warm the cache for the downtown headliners.
    Promise.all(
      buildings
        .filter((b) => b.topVotes || b.topToday)
        .slice(0, 40)
        .map((b) => loadGameThumbnail(b.game.thumbnailUrl).catch(() => null)),
    ).then(() => {
      if (!alive) return;
      const w = window as typeof window & { __cityPostersReady?: boolean };
      w.__cityPostersReady = true;
    });
    return () => {
      alive = false;
    };
  }, [buildings]);

  useFrame(() => {
    if (mode === 'fly') {
      let best: CityBuildingSlot | null = null;
      let bestD = Infinity;
      for (const b of buildings) {
        const dx = craftPos.current.x - b.x;
        const dz = craftPos.current.z - b.z;
        const horiz = Math.hypot(dx, dz);
        if (horiz > Math.max(14, b.width * 1.8)) continue;
        const dy = Math.abs(craftPos.current.y - landAnchorY(b));
        if (dy > 18) continue;
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

  // Matches the sky's horizon base so the far skyline dissolves into the glow.
  const fogColor = '#3a1f57';

  return (
    <>
      <color attach="background" args={['#3a1f57']} />
      <fog attach="fog" args={[fogColor, 145, 760]} />
      <CitySky />

      <hemisphereLight color="#7a63e8" groundColor="#0a0718" intensity={0.5} />
      <ambientLight intensity={0.1} color="#3b2566" />
      <directionalLight position={[140, 260, 120]} intensity={0.72} color="#d6d9ff" />
      <directionalLight position={[-130, 110, -140]} intensity={0.26} color="#c026d3" />
      <pointLight
        position={[spawn.focusX, spawn.focusY + 60, spawn.focusZ]}
        intensity={1.5}
        color="#a855f7"
        distance={520}
        decay={1.5}
      />
      <pointLight position={[spawn.focusX + 120, 60, spawn.focusZ - 90]} intensity={0.55} color="#fbbf24" distance={280} decay={1.8} />
      <pointLight position={[spawn.focusX - 120, 48, spawn.focusZ + 100]} intensity={0.55} color="#f472b6" distance={280} decay={1.8} />

      {/* Ground haze plane so the city never floats in a void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} frustumCulled={false}>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#0a0718" metalness={0.15} roughness={0.92} />
      </mesh>

      <CityRoad streets={streets} />
      <CityTraffic streets={streets} />
      <CityAirTraffic streets={streets} buildings={buildings} />
      <CitySearchlights buildings={buildings} />
      {quality !== 'low' ? <CityRain /> : null}
      <CityBuildings buildings={buildings} craftPos={craftPos.current} spawn={spawn} isFavorite={isFavorite} />
      <UfoRig
        inputRef={inputRef}
        steerRef={steerRef}
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

      <CityPostFX
        bloomStrength={quality === 'low' ? 0.28 : 0.7}
        bloomRadius={0.66}
        bloomThreshold={0.85}
        bloomScale={quality === 'low' ? 0.4 : 0.5}
      />
    </>
  );
}
