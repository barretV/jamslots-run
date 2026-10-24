import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loadGameThumbnail } from '../../lib/cityTextureCache';
import {
  buildInstancedMesh,
  createNeonMaterial,
  createVoxelTowerMaterial,
  emptyBatch,
  neonColor,
  type InstanceBatch,
} from '../../lib/cityNeon';
import type { CityBuildingSlot, CitySpawn } from '../../lib/citySpiral';
import { isNewThisVisit } from '../../state/persistence';
import { CityRankLandmarks } from './CityRankLandmarks';

interface CityBuildingsProps {
  buildings: CityBuildingSlot[];
  craftPos: THREE.Vector3;
  spawn: CitySpawn;
  isFavorite?: (gameId: string) => boolean;
}

const PINK = '#f472b6';
const GREEN = '#39ff14';
const FACE_RANGE = 104;

interface CityTheme {
  body: THREE.Color;
  window: THREE.Color;
  accent: THREE.Color;
}

function buildThemes(): CityTheme[] {
  const t = (bodyH: number, winH: number, accH: number): CityTheme => ({
    body: neonColor(bodyH, 0.42, 0.09),
    window: neonColor(winH, 0.42, 0.64, 1.15),
    accent: neonColor(accH, 1.0, 0.56, 1.75),
  });
  return [
    t(0.72, 0.1, 0.86),
    t(0.76, 0.12, 0.9),
    t(0.68, 0.09, 0.82),
    t(0.8, 0.08, 0.72),
    t(0.64, 0.13, 0.95),
    t(0.7, 0.12, 0.88),
  ];
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function roofSignWorldSize(slot: CityBuildingSlot): number {
  const footprint = Math.min(slot.width, slot.depth);
  let boost = slot.topToday ? 1.12 : 1;
  if (slot.voteRank > 0) {
    const t = (10 - slot.voteRank) / 9;
    boost = 1.08 + t * 0.62;
  }
  const byFoot = footprint * 1.1 * boost;
  const byHeight = slot.height * 0.075 * boost;
  return Math.min(22, Math.max(slot.posterSize * boost, byFoot, byHeight));
}

function pushBox(
  batch: InstanceBatch,
  dummy: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  yaw: number,
  color: THREE.Color,
  glow: THREE.Color,
) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, yaw, 0);
  dummy.scale.set(Math.max(0.08, sx), Math.max(0.08, sy), Math.max(0.08, sz));
  dummy.updateMatrix();
  batch.matrices.push(dummy.matrix.clone());
  batch.colors.push(color.clone());
  batch.glows.push(glow.clone());
}

/** Instanced city shell. Silhouette comes from the seed, still one box batch. */
function useCityShell(buildings: CityBuildingSlot[]) {
  return useMemo(() => {
    const group = new THREE.Group();
    group.name = 'city-shell';
    if (buildings.length === 0) return group;

    const themes = buildThemes();
    const bodyBatch = emptyBatch();
    const slabBatch = emptyBatch();
    const stripBatch = emptyBatch();
    const capBatch = emptyBatch();
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (const b of buildings) {
      const theme = themes[b.theme % themes.length];
      const seed = b.seed;
      const kind = seed % 5;
      const yaw = b.faceYaw;
      const litScale = 0.38 + Math.min(1, b.height / 130) * 0.66;
      const shimmer = 0.85 + (((seed >> 13) % 40) / 40) * 0.3;
      tint.copy(theme.window).multiplyScalar(litScale * shimmer);
      const winGlow = tint.clone();
      const bodyTint = tint.clone().copy(theme.body).multiplyScalar(0.75 + (((seed >> 5) % 40) / 40) * 0.45);
      const slabTint = tint.clone().copy(theme.body).multiplyScalar(0.6);
      const accent = tint.clone().copy(theme.accent);

      if (kind === 0) {
        const segments = 3;
        for (let s = 0; s < segments; s++) {
          const segH = b.height / segments;
          const taper = 1 - s * 0.085;
          pushBox(bodyBatch, dummy, b.x, segH * s + segH / 2, b.z, b.width * taper, segH, b.depth * taper, yaw, bodyTint, winGlow);
          if (s < segments - 1) {
            pushBox(
              slabBatch,
              dummy,
              b.x,
              segH * (s + 1),
              b.z,
              b.width * taper,
              0.7,
              b.depth * taper,
              yaw,
              slabTint,
              accent.clone().multiplyScalar(0.15 * litScale),
            );
          }
        }
      } else if (kind === 1) {
        const podiumH = b.height * 0.26;
        const shaftH = b.height - podiumH;
        pushBox(bodyBatch, dummy, b.x, podiumH * 0.5, b.z, b.width, podiumH, b.depth, yaw, bodyTint, winGlow);
        pushBox(
          bodyBatch,
          dummy,
          b.x,
          podiumH + shaftH * 0.5,
          b.z,
          b.width * 0.46,
          shaftH,
          b.depth * 0.44,
          yaw,
          bodyTint,
          winGlow,
        );
        pushBox(slabBatch, dummy, b.x, podiumH, b.z, b.width, 0.7, b.depth, yaw, slabTint, accent.clone().multiplyScalar(0.2 * litScale));
      } else if (kind === 2) {
        const needleH = b.height * 0.9;
        pushBox(bodyBatch, dummy, b.x, needleH * 0.32, b.z, b.width * 0.34, needleH * 0.64, b.depth * 0.3, yaw, bodyTint, winGlow);
        pushBox(
          bodyBatch,
          dummy,
          b.x,
          needleH * 0.78,
          b.z,
          b.width * 0.2,
          needleH * 0.28,
          b.depth * 0.18,
          yaw,
          bodyTint,
          winGlow,
        );
        const antennaH = Math.min(16, Math.max(7, b.height * 0.12));
        pushBox(
          stripBatch,
          dummy,
          b.x + b.width * 0.22,
          b.height + antennaH * 0.5,
          b.z + b.depth * 0.22,
          0.28,
          antennaH,
          0.28,
          0,
          slabTint,
          accent,
        );
      } else if (kind === 3) {
        const n = Math.min(8, Math.max(1, b.tierScales.length));
        const segH = b.height / n;
        for (let s = 0; s < n; s++) {
          const sc = Math.min(1, Math.max(0.4, b.tierScales[s] ?? 1));
          pushBox(
            bodyBatch,
            dummy,
            b.x,
            segH * s + segH / 2,
            b.z,
            b.width * sc,
            segH,
            b.depth * sc,
            yaw,
            bodyTint,
            winGlow,
          );
          const next = Math.min(1, Math.max(0.4, b.tierScales[s + 1] ?? sc));
          if (s < n - 1 && next < sc - 0.03) {
            pushBox(slabBatch, dummy, b.x, segH * (s + 1), b.z, b.width * sc, 0.45, b.depth * sc, yaw, slabTint, accent.clone().multiplyScalar(0.18));
          }
        }
      } else {
        pushBox(bodyBatch, dummy, b.x, b.height * 0.22, b.z, b.width * 0.68, b.height * 0.44, b.depth * 0.66, yaw, bodyTint, winGlow);
        pushBox(bodyBatch, dummy, b.x, b.height * 0.7, b.z, b.width * 0.58, b.height * 0.32, b.depth * 0.56, yaw, bodyTint, winGlow);
        pushBox(bodyBatch, dummy, b.x, b.height * 0.94, b.z, b.width, b.height * 0.12, b.depth, yaw, bodyTint, winGlow);
        pushBox(slabBatch, dummy, b.x, b.height * 0.5, b.z, b.width * 0.98, 1.5, b.depth * 0.98, yaw, slabTint, accent.clone().multiplyScalar(0.85));
      }

      if (b.height > 24) {
        const bandH = Math.min(1.6, 0.5 + b.height * 0.008);
        pushBox(
          capBatch,
          dummy,
          b.x,
          b.height - bandH * 0.5 - 0.1,
          b.z,
          b.width * 0.94,
          bandH,
          b.depth * 0.94,
          yaw,
          slabTint,
          accent.clone().multiplyScalar(0.55 + litScale * 0.4),
        );
      }

      if (b.height > 52) {
        for (let k = 0; k < 2; k++) {
          const sx = k === 0 ? 1 : -1;
          const sz = k === 0 ? 1 : -1;
          pushBox(
            stripBatch,
            dummy,
            b.x + sx * b.width * 0.26,
            b.height * 0.5,
            b.z + sz * b.depth * 0.26,
            0.22,
            b.height * 0.985,
            0.22,
            0,
            slabTint,
            accent,
          );
        }
      }
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = createVoxelTowerMaterial({
      color: '#050510',
      metalness: 0.1,
      roughness: 0.9,
      windowStrength: 0.7,
      cols: 1.6,
      rows: 1.9,
      ambient: 0.017,
      litRatio: 0.5,
    });
    const slabMat = createNeonMaterial({ color: '#050510', metalness: 0.2, roughness: 0.5, vertexColors: true });
    const stripMat = createNeonMaterial({ color: '#050512', metalness: 0.5, roughness: 0.35, vertexColors: true });
    const meshes = [
      buildInstancedMesh(bodyBatch, boxGeo, bodyMat),
      buildInstancedMesh(slabBatch, boxGeo, slabMat),
      buildInstancedMesh(stripBatch, boxGeo, stripMat),
      buildInstancedMesh(capBatch, boxGeo, stripMat),
    ];
    for (const m of meshes) if (m) group.add(m);
    boxGeo.dispose();
    group.userData.uTime = bodyMat.userData.uTime;
    return group;
  }, [buildings]);
}

function columnMesh(slots: CityBuildingSlot[], color: string, offsetFor: (b: CityBuildingSlot) => number): THREE.InstancedMesh | null {
  if (slots.length === 0) return null;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, slots.length);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const h = 168;
  slots.forEach((b, i) => {
    dummy.position.set(b.x + offsetFor(b), b.roofY + h * 0.42, b.z);
    dummy.scale.set(1.15, h, 1.15);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function CitySignalBeacons({
  buildings,
  isFavorite,
}: {
  buildings: CityBuildingSlot[];
  isFavorite?: (gameId: string) => boolean;
}) {
  const group = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'city-beacons';
    const favs = buildings.filter((b) => isFavorite?.(b.game.gameId));
    const news = buildings.filter((b) => isNewThisVisit(b.game.gameId));
    const favMesh = columnMesh(favs, PINK, (b) => (isNewThisVisit(b.game.gameId) ? -Math.min(2.4, b.width * 0.3) : 0));
    const newMesh = columnMesh(news, GREEN, (b) => (isFavorite?.(b.game.gameId) ? Math.min(2.4, b.width * 0.3) : 0));
    if (favMesh) g.add(favMesh);
    if (newMesh) g.add(newMesh);
    return g;
  }, [buildings, isFavorite]);

  useEffect(
    () => () => {
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
    },
    [group],
  );

  return <primitive object={group} />;
}

function paintStats(slot: CityBuildingSlot, isFavorite: boolean, isNew: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const W = canvas.width;
    const H = canvas.height;
    const accent = isFavorite ? PINK : isNew ? GREEN : '#67e8f9';
    ctx.fillStyle = 'rgba(6, 4, 16, 0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    ctx.textBaseline = 'top';
    ctx.font = 'bold 36px sans-serif';
    if (isNew) {
      ctx.fillStyle = GREEN;
      ctx.textAlign = 'left';
      ctx.fillText('NEW', 36, 28);
    }
    if (isFavorite) {
      ctx.fillStyle = PINK;
      ctx.textAlign = 'right';
      ctx.fillText('FAVORITE', W - 36, 28);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    const title = slot.game.title.length > 28 ? slot.game.title.slice(0, 26) + '…' : slot.game.title;
    ctx.fillText(title, 36, 84);

    const stats = [
      { label: 'PLAYS', value: formatCount(slot.game.totalPlays), color: '#67e8f9' },
      { label: 'VOTES', value: formatCount(slot.game.votes), color: '#f9a8d4' },
      { label: 'TODAY', value: formatCount(slot.game.votesToday ?? 0), color: '#fbbf24' },
    ];
    const colW = (W - 72) / 3;
    stats.forEach((s, i) => {
      const x = 36 + i * colW;
      ctx.fillStyle = s.color;
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(s.label, x, 156);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 80px sans-serif';
      ctx.fillText(s.value, x, 204);
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function CityBuildings({ buildings, spawn, craftPos, isFavorite }: CityBuildingsProps) {
  const shell = useCityShell(buildings);
  const facingRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      shell.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
    };
  }, [shell]);

  useFrame((_, delta) => {
    const u = shell.userData.uTime as { value: number } | undefined;
    if (u) u.value += Math.min(delta, 0.05);
    let best: string | null = null;
    let bestD = FACE_RANGE;
    for (const b of buildings) {
      const d = Math.hypot(craftPos.x - b.x, craftPos.z - b.z);
      if (d < bestD) {
        bestD = d;
        best = b.game.gameId;
      }
    }
    facingRef.current = best;
  });

  return (
    <group>
      <primitive object={shell} />
      <CitySignalBeacons buildings={buildings} isFavorite={isFavorite} />
      <CityRankLandmarks buildings={buildings} />
      {buildings.map((b) => (
        <GameBillboard
          key={b.game.gameId}
          slot={b}
          spawn={spawn}
          craftPos={craftPos}
          facingRef={facingRef}
          isFavorite={isFavorite?.(b.game.gameId) ?? false}
          isNew={isNewThisVisit(b.game.gameId)}
        />
      ))}
    </group>
  );
}

function GameBillboard({
  slot,
  spawn,
  craftPos,
  facingRef,
  isFavorite,
  isNew,
}: {
  slot: CityBuildingSlot;
  spawn: CitySpawn;
  craftPos: THREE.Vector3;
  facingRef: MutableRefObject<string | null>;
  isFavorite?: boolean;
  isNew: boolean;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [visible, setVisible] = useState(false);
  const [statsTex, setStatsTex] = useState<THREE.Texture | null>(null);
  const triedRef = useRef(false);
  const auraRef = useRef<THREE.MeshBasicMaterial>(null);
  const greenRingRef = useRef<THREE.MeshBasicMaterial>(null);
  const yawGroupRef = useRef<THREE.Group | null>(null);
  const baseYaw = Math.atan2(slot.x - spawn.focusX, slot.z - spawn.focusZ);
  const yawState = useRef(baseYaw);
  const spin = useRef(0);
  const size = roofSignWorldSize(slot);
  const y = slot.roofY + size * 0.5 + 0.5;
  const lean = slot.voteRank > 0 ? 0.14 : slot.topToday ? 0.12 : 0.11;
  const framePad = 0.7;
  const panelDepth = 0.26;
  const halfDepth = panelDepth * 0.5;
  const artZ = halfDepth + 0.02;
  const accent = isFavorite ? PINK : isNew ? GREEN : slot.voteRank > 0 ? '#fbbf24' : '#22d3ee';
  const boardW = Math.min(9.2, Math.max(6.2, size * 0.78));
  const boardH = boardW * (384 / 1024);
  const statsX = size * 0.5 + boardW * 0.5 + 0.55;

  const LOAD_DISTANCE = 260;
  const RENDER_DISTANCE = 230;
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = yawGroupRef.current;
    if (g) {
      let target = baseYaw;
      if (facingRef.current === slot.game.gameId) {
        const dx = craftPos.x - slot.x;
        const dz = craftPos.z - slot.z;
        if (dx * dx + dz * dz > 36) target = Math.atan2(dx, dz);
        else target = yawState.current;
      }
      let diff = target - yawState.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const omega = 5.2;
      spin.current += (diff * omega * omega - 2 * omega * spin.current) * dt;
      const maxSpin = 1.35;
      spin.current = Math.max(-maxSpin, Math.min(maxSpin, spin.current));
      yawState.current += spin.current * dt;
      g.rotation.set(0, yawState.current, 0);
      if (facingRef.current === slot.game.gameId) {
        const w = window as typeof window & { __citySignYaw?: number };
        w.__citySignYaw = yawState.current;
      }
    }

    const d = Math.hypot(craftPos.x - slot.x, craftPos.z - slot.z);
    const shouldLoad = d < LOAD_DISTANCE;
    const shouldRender = d < RENDER_DISTANCE;
    if (shouldRender !== visible) setVisible(shouldRender);
    if (shouldLoad && !triedRef.current) {
      triedRef.current = true;
      loadGameThumbnail(slot.game.thumbnailUrl)
        .then((t) => setTex(t))
        .catch(() => setTex(null));
    }
    if (shouldRender && !statsTex) setStatsTex(paintStats(slot, !!isFavorite, isNew));
    if (auraRef.current) {
      auraRef.current.opacity = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.4));
    }
    if (greenRingRef.current) {
      greenRingRef.current.opacity = 0.2 + 0.12 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.1));
    }
  });

  const posterMat = useMemo(() => {
    if (!tex) return null;
    return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.FrontSide });
  }, [tex]);

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#080512',
        metalness: 0.5,
        roughness: 0.4,
        emissive: new THREE.Color(accent),
        emissiveIntensity: isFavorite || isNew ? 0.45 : slot.voteRank > 0 ? 0.4 : 0.26,
      }),
    [accent, isFavorite, isNew, slot.voteRank],
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.09,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [accent],
  );

  const statsMat = useMemo(() => {
    if (!statsTex) return null;
    return new THREE.MeshBasicMaterial({
      map: statsTex,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      side: THREE.FrontSide,
    });
  }, [statsTex]);

  useEffect(() => {
    return () => {
      posterMat?.dispose();
      frameMat.dispose();
      glowMat.dispose();
      statsTex?.dispose();
      statsMat?.dispose();
    };
  }, [posterMat, frameMat, glowMat, statsTex, statsMat]);

  if (!visible || !tex || !posterMat) return null;

  const postH = slot.roofY + size * 0.5 + 0.2;
  const greenRadius = size * (isFavorite ? 1.15 : 0.95);

  return (
    <group
      position={[slot.x, 0, slot.z]}
      ref={(node) => {
        yawGroupRef.current = node;
        if (node) node.rotation.y = yawState.current;
      }}
    >
      <mesh position={[0, postH * 0.5, 0]} material={frameMat}>
        <boxGeometry args={[0.22, postH, 0.22]} />
      </mesh>

      {isFavorite ? (
        <mesh position={[0, postH * 0.5, 0]} renderOrder={4}>
          <cylinderGeometry args={[size * 0.62, size * 0.62, postH + size * 0.6, 24, 1, true]} />
          <meshBasicMaterial
            ref={auraRef}
            color={PINK}
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      {isNew && !isFavorite ? (
        <mesh position={[0, postH * 0.5, 0]} renderOrder={4}>
          <cylinderGeometry args={[size * 0.62, size * 0.62, postH + size * 0.6, 24, 1, true]} />
          <meshBasicMaterial
            ref={auraRef}
            color={GREEN}
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      {isFavorite ? (
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[size * 0.45, size * 0.95, 32]} />
          <meshBasicMaterial
            color={PINK}
            transparent
            opacity={0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      {isNew ? (
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[greenRadius * 0.5, greenRadius, 32]} />
          <meshBasicMaterial
            ref={greenRingRef}
            color={GREEN}
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}

      <group position={[0, y, 0]} rotation={[lean, 0, 0]}>
        <mesh material={frameMat} renderOrder={6}>
          <boxGeometry args={[size + framePad, size + framePad, panelDepth]} />
        </mesh>
        <mesh renderOrder={5} material={glowMat}>
          <planeGeometry args={[size * 1.24, size * 1.24]} />
        </mesh>
        <mesh position={[0, 0, artZ]} renderOrder={8} material={posterMat}>
          <planeGeometry args={[size, size]} />
        </mesh>
        <mesh position={[0, 0, -artZ]} rotation={[0, Math.PI, 0]} renderOrder={8} material={posterMat}>
          <planeGeometry args={[size, size]} />
        </mesh>
      </group>

      {statsMat ? (
        <group position={[statsX, y, 0]}>
          <mesh position={[0, 0, 0.08]} renderOrder={9} material={statsMat}>
            <planeGeometry args={[boardW, boardH]} />
          </mesh>
          <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]} renderOrder={9} material={statsMat}>
            <planeGeometry args={[boardW, boardH]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
