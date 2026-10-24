import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loadGameThumbnail } from '../../lib/cityTextureCache';
import {
  buildInstancedMesh,
  createNeonMaterial,
  createVoxelTowerMaterial,
  emptyBatch,
  neonColor,
} from '../../lib/cityNeon';
import type { CityBuildingSlot, CitySpawn } from '../../lib/citySpiral';

interface CityBuildingsProps {
  buildings: CityBuildingSlot[];
  craftPos: THREE.Vector3;
  spawn: CitySpawn;
  isFavorite?: (gameId: string) => boolean;
}

const BODY_SEGMENTS = 3;

/** Neon palettes: body tint, window glow, accent strips. */
interface CityTheme {
  body: THREE.Color;
  bodyGlow: THREE.Color;
  window: THREE.Color;
  accent: THREE.Color;
}

function buildThemes(): CityTheme[] {
  const t = (bodyH: number, bodyL: number, winH: number, accH: number): CityTheme => ({
    body: neonColor(bodyH, 0.42, bodyL),
    bodyGlow: neonColor(bodyH, 0.75, 0.4, 0.1),
    // Windows: warm and bright so a tower reads as a lit mass rather than a
    // rainbow speckle, with the theme only tinting them.
    window: neonColor(winH, 0.42, 0.64, 1.15),
    accent: neonColor(accH, 1.0, 0.56, 1.75),
  });
  return [
    t(0.72, 0.09, 0.1, 0.86), // indigo / amber / magenta
    t(0.76, 0.1, 0.12, 0.9), // violet / gold / pink
    t(0.68, 0.08, 0.09, 0.82), // purple / amber / magenta
    t(0.8, 0.1, 0.08, 0.72), // purple / amber / pink
    t(0.64, 0.08, 0.13, 0.95), // blue-violet / cream / magenta
    t(0.7, 0.09, 0.12, 0.88), // navy / warm gold / pink
  ];
}

export function pickCityPosterIds(buildings: CityBuildingSlot[]): Set<string> {
  const ids = new Set<string>();
  for (const b of buildings) ids.add(b.game.gameId);
  return ids;
}

function pickPosterSlots(buildings: CityBuildingSlot[]): Set<string> {
  const ids = new Set<string>();
  for (const b of buildings) ids.add(b.game.gameId);
  return ids;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function roofSignWorldSize(slot: CityBuildingSlot): number {
  const footprint = Math.min(slot.width, slot.depth);
  const boost = slot.topVotes ? 1.3 : slot.topToday ? 1.15 : 1.0;
  const byFoot = footprint * 1.1 * boost;
  const byHeight = slot.height * 0.075 * boost;
  return Math.min(19, Math.max(slot.posterSize * boost, byFoot, byHeight));
}

/** Instanced city shell: tower bodies, setbacks, corner neon strips, crowns. */
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
    const crownBatch = emptyBatch();

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (const b of buildings) {
      const theme = themes[b.theme % themes.length];
      const seed = b.seed;

      // Short, peripheral blocks glow much less, so the eye reads the tall
      // downtown instead of a uniform carpet of dots.
      const litScale = 0.38 + Math.min(1, b.height / 130) * 0.66;
      const shimmer = 0.85 + (((seed >> 13) % 40) / 40) * 0.3;
      const winGlow = tint.clone().copy(theme.window).multiplyScalar(litScale * shimmer);

      for (let s = 0; s < BODY_SEGMENTS; s++) {
        const t0 = s / BODY_SEGMENTS;
        const t1 = (s + 1) / BODY_SEGMENTS;
        const segH = b.height * (t1 - t0);
        const y = b.height * t0 + segH / 2;
        const taper = 1 - s * 0.085;
        dummy.position.set(b.x, y, b.z);
        dummy.scale.set(b.width * taper, segH, b.depth * taper);
        dummy.rotation.set(0, b.faceYaw, 0);
        dummy.updateMatrix();
        bodyBatch.matrices.push(dummy.matrix.clone());
        const v = 0.75 + (((seed >> 5) % 40) / 40) * 0.45;
        bodyBatch.colors.push(tint.clone().copy(theme.body).multiplyScalar(v));
        bodyBatch.glows.push(winGlow);

        if (s < BODY_SEGMENTS - 1) {
          dummy.position.set(b.x, b.height * t1 - 0.1, b.z);
          dummy.scale.set(b.width * taper * 1.15, 0.8, b.depth * taper * 1.15);
          dummy.rotation.set(0, b.faceYaw, 0);
          dummy.updateMatrix();
          slabBatch.matrices.push(dummy.matrix.clone());
          slabBatch.colors.push(tint.clone().copy(theme.body).multiplyScalar(0.6));
          slabBatch.glows.push(tint.clone().copy(theme.accent).multiplyScalar(0.15 * litScale));
        }
      }

      // Glowing roofline cap: the single most important skyline cue, so every
      // tower above the suburbs gets one in its accent colour.
      if (b.height > 24) {
        const bandH = Math.min(1.6, 0.5 + b.height * 0.008);
        dummy.position.set(b.x, b.height - bandH * 0.5 - 0.1, b.z);
        dummy.scale.set(b.width * 0.94, bandH, b.depth * 0.94);
        dummy.rotation.set(0, b.faceYaw, 0);
        dummy.updateMatrix();
        capBatch.matrices.push(dummy.matrix.clone());
        capBatch.colors.push(tint.clone().copy(theme.body).multiplyScalar(0.35));
        capBatch.glows.push(tint.clone().copy(theme.accent).multiplyScalar(0.55 + litScale * 0.4));
      }

      // Neon corner strips on taller towers.
      if (b.height > 52) {
        for (let k = 0; k < 2; k++) {
          const sx = k === 0 ? 1 : -1;
          const sz = k === 0 ? 1 : -1;
          dummy.position.set(
            b.x + sx * b.width * 0.26,
            b.height * 0.5,
            b.z + sz * b.depth * 0.26,
          );
          dummy.scale.set(0.22, b.height * 0.985, 0.22);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          stripBatch.matrices.push(dummy.matrix.clone());
          stripBatch.colors.push(tint.clone().copy(theme.body).multiplyScalar(0.4));
          stripBatch.glows.push(tint.clone().copy(theme.accent));
        }
      }

      // Rooftop crown for the top-voted towers.
      if (b.topVotes) {
        dummy.position.set(b.x, b.height + 0.9, b.z);
        dummy.scale.set(b.width * 1.08, 1.8, b.depth * 1.08);
        dummy.rotation.set(0, b.faceYaw, 0);
        dummy.updateMatrix();
        crownBatch.matrices.push(dummy.matrix.clone());
        crownBatch.colors.push(tint.clone().copy(theme.body).multiplyScalar(0.4));
        crownBatch.glows.push(tint.clone().copy(theme.accent).multiplyScalar(0.95));
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
    const slabMat = createNeonMaterial({
      color: '#050510',
      metalness: 0.2,
      roughness: 0.5,
      vertexColors: true,
    });
    const stripMat = createNeonMaterial({
      color: '#050512',
      metalness: 0.5,
      roughness: 0.35,
      vertexColors: true,
    });

    const meshes = [
      buildInstancedMesh(bodyBatch, boxGeo, bodyMat),
      buildInstancedMesh(slabBatch, boxGeo, slabMat),
      buildInstancedMesh(stripBatch, boxGeo, stripMat),
      buildInstancedMesh(capBatch, boxGeo, stripMat),
      buildInstancedMesh(crownBatch, boxGeo, stripMat),
    ];
    for (const m of meshes) if (m) group.add(m);
    boxGeo.dispose();

    return group;
  }, [buildings]);
}

export function CityBuildings({ buildings, spawn, craftPos, isFavorite }: CityBuildingsProps) {
  const shell = useCityShell(buildings);

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

  const posterIds = useMemo(() => pickPosterSlots(buildings), [buildings]);
  const posters = useMemo(
    () => buildings.filter((b) => posterIds.has(b.game.gameId)),
    [buildings, posterIds],
  );

  return (
    <group>
      <primitive object={shell} />
      {posters.map((b) => (
        <GameBillboard key={b.game.gameId} slot={b} spawn={spawn} craftPos={craftPos} isFavorite={isFavorite?.(b.game.gameId) ?? false} />
      ))}
    </group>
  );
}

/**
 * Neon rooftop sign carrying game art. A thin double-sided panel: the art is
 * mounted on *both* faces so the sign reads from any approach angle, with a
 * slim neon rim frame around it standing on a single pylon.
 */
function GameBillboard({ slot, spawn, craftPos, isFavorite }: { slot: CityBuildingSlot; spawn: CitySpawn; craftPos: THREE.Vector3; isFavorite?: boolean }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [visible, setVisible] = useState(false);
  const [statsTex, setStatsTex] = useState<THREE.Texture | null>(null);
  const triedRef = useRef(false);
  const auraRef = useRef<THREE.MeshBasicMaterial>(null);
  const size = roofSignWorldSize(slot);
  const y = slot.roofY + size * 0.5 + 0.5;
  const lean = slot.topVotes ? 0.16 : 0.11;
  const framePad = 0.7;
  const panelDepth = 0.26;
  const halfDepth = panelDepth * 0.5;
  const artZ = halfDepth + 0.02;

  // Splay the sign outward from downtown so the approaching craft flies toward the art.
  const yaw = Math.atan2(slot.x - spawn.focusX, slot.z - spawn.focusZ);

  // LOD: only load/render this sign when the craft is close. Keeps all 874 games
  // explorable without paying texture/GPU cost for the whole city at once.
  const LOAD_DISTANCE = 260;
  const RENDER_DISTANCE = 230;
  useFrame((state) => {
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
    // Lazy-create the stats canvas texture once when close.
    if (shouldRender && !statsTex) {
      const canvas = document.createElement('canvas');
      canvas.width = 768;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const W = canvas.width;
        const H = canvas.height;
        const accent = isFavorite ? '#f472b6' : '#22d3ee';
        const accent2 = isFavorite ? '#f0abfc' : '#67e8f9';

        // Holographic background: deep translucent panel with scanlines.
        ctx.fillStyle = 'rgba(4, 2, 16, 0.78)';
        ctx.roundRect(0, 0, W, H, 24);
        ctx.fill();

        // Subtle grid.
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // Scanlines.
        for (let y = 0; y < H; y += 3) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.fillRect(0, y, W, 1);
        }

        // Neon border with corner brackets (holographic frame).
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 18;
        ctx.roundRect(2, 2, W - 4, H - 4, 22);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Corner brackets.
        const br = 22;
        ctx.strokeStyle = accent2;
        ctx.lineWidth = 4;
        ctx.shadowColor = accent2;
        ctx.shadowBlur = 14;
        // top-left
        ctx.beginPath();
        ctx.moveTo(18, 18 + br);
        ctx.lineTo(18, 18);
        ctx.lineTo(18 + br, 18);
        ctx.stroke();
        // top-right
        ctx.beginPath();
        ctx.moveTo(W - 18 - br, 18);
        ctx.lineTo(W - 18, 18);
        ctx.lineTo(W - 18, 18 + br);
        ctx.stroke();
        // bottom-left
        ctx.beginPath();
        ctx.moveTo(18, H - 18 - br);
        ctx.lineTo(18, H - 18);
        ctx.lineTo(18 + br, H - 18);
        ctx.stroke();
        // bottom-right
        ctx.beginPath();
        ctx.moveTo(W - 18 - br, H - 18);
        ctx.lineTo(W - 18, H - 18);
        ctx.lineTo(W - 18, H - 18 - br);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Title with glow.
        ctx.shadowColor = accent;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px sans-serif';
        ctx.textBaseline = 'top';
        const title = slot.game.title.length > 26 ? slot.game.title.slice(0, 24) + '…' : slot.game.title;
        ctx.fillText(title, 28, 20);
        ctx.shadowBlur = 0;

        // Divider line.
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(28, 66);
        ctx.lineTo(W - 28, 66);
        ctx.stroke();
        ctx.globalAlpha = 1;

        const stats = [
          { label: 'PLAYS', value: slot.game.totalPlays, color: '#22d3ee' },
          { label: 'VOTES', value: slot.game.votes, color: '#f472b6' },
          { label: 'NEW TODAY', value: slot.game.votesToday ?? 0, color: '#fbbf24' },
        ];
        const colW = (W - 60) / stats.length;
        stats.forEach((s, i) => {
          const cx = 30 + i * colW;
          const cy = 84;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = s.color;
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(s.label, cx, cy);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 52px sans-serif';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.fillText(formatCount(s.value), cx, cy + 26);
          ctx.shadowBlur = 0;
        });

        // Favorite tag.
        if (isFavorite) {
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#f472b6';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('FAVORITE', W - 150, 22);
          ctx.shadowBlur = 0;
        }
      }

const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setStatsTex(tex);
      }
    // Pulse the favorite aura.
    if (auraRef.current) {
      auraRef.current.opacity = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.4));
    }
  });

  const posterMat = useMemo(() => {
    if (!tex) return null;
    return new THREE.MeshBasicMaterial({
      map: tex,
      toneMapped: false,
      side: THREE.FrontSide,
    });
  }, [tex]);

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#080512',
        metalness: 0.5,
        roughness: 0.4,
        emissive: new THREE.Color(slot.topVotes ? '#e879f9' : '#22d3ee'),
        emissiveIntensity: slot.topVotes ? 0.4 : 0.26,
      }),
    [slot.topVotes],
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: slot.topVotes ? '#f0abfc' : '#67e8f9',
        transparent: true,
        opacity: 0.09,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [slot.topVotes],
  );

  const statsMat = useMemo(() => {
    if (!statsTex) return null;
    return new THREE.MeshBasicMaterial({ map: statsTex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
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


  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, yaw, 0]}>
      {/* support pylon */}
      <mesh position={[0, postH * 0.5, 0]} material={frameMat}>
        <boxGeometry args={[0.22, postH, 0.22]} />
      </mesh>

      {/* Pink favorite aura: a rising glow so favorites are easy to spot. */}
      {isFavorite ? (
        <>
          <mesh position={[0, postH * 0.5, 0]} renderOrder={4}>
            <cylinderGeometry args={[size * 0.62, size * 0.62, postH + size * 0.6, 24, 1, true]} />
            <meshBasicMaterial
              ref={auraRef}
              color="#f472b6"
              transparent
              opacity={0.16}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[size * 0.45, size * 0.95, 32]} />
            <meshBasicMaterial
              color="#f472b6"
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      ) : null}

      <group position={[0, y, 0]} rotation={[lean, 0, 0]}>
        {/* neon rim (behind the art on both faces) */}
        <mesh material={frameMat} renderOrder={6}>
          <boxGeometry args={[size + framePad, size + framePad, panelDepth]} />
        </mesh>
        {/* soft halo */}
        <mesh renderOrder={5} material={glowMat}>
          <planeGeometry args={[size * 1.24, size * 1.24]} />
        </mesh>
        {/* front + back art */}
        <mesh position={[0, 0, artZ]} renderOrder={8} material={posterMat}>
          <planeGeometry args={[size, size]} />
        </mesh>
        <mesh position={[0, 0, -artZ]} rotation={[0, Math.PI, 0]} renderOrder={8} material={posterMat}>
          <planeGeometry args={[size, size]} />
        </mesh>
      </group>

      {/* Juicy stats panel above the sign, shown when close. */}
      {statsTex ? (
        <mesh position={[0, y + size * 0.5 + 2.0, 0]} renderOrder={9} material={statsMat ?? undefined}>
          <planeGeometry args={[Math.max(size + framePad + 1.2, 6.0), 2.6]} />
        </mesh>
      ) : null}
    </group>
  );
}
