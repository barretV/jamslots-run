import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Sparkles } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadGameThumbnail } from '../lib/cityTextureCache';
import { formatPrizeMoney, type ResolvedPrize } from '../lib/octoberWinners';
import { useReducedMotion } from '../lib/useReducedMotion';
import type { JamGame } from '../types';

type StageMode = 'ranked' | 'special' | 'story';

interface WinnerStage3DProps {
  rows: ResolvedPrize[];
  onOpen: (game: JamGame) => void;
  mode?: StageMode;
}

interface TierPalette {
  face: string;
  faceLight: string;
  faceDeep: string;
  ink: string;
  body: string;
  glow: string;
  label: string;
}

const TIERS: Record<'gold' | 'silver' | 'bronze' | 'place' | 'special', TierPalette> = {
  gold: {
    face: '#ffc93a',
    faceLight: '#fff4b8',
    faceDeep: '#a86707',
    ink: '#2b1903',
    body: '#332713',
    glow: '#ffd76a',
    label: 'Champion',
  },
  silver: {
    face: '#c9d6e8',
    faceLight: '#ffffff',
    faceDeep: '#66748a',
    ink: '#1c2632',
    body: '#232a38',
    glow: '#dfe9f7',
    label: 'Runner-up',
  },
  bronze: {
    face: '#e08a4f',
    faceLight: '#ffe0c4',
    faceDeep: '#7d3a12',
    ink: '#2a1208',
    body: '#2d1d15',
    glow: '#eaa06a',
    label: 'Third place',
  },
  place: {
    face: '#67e8f9',
    faceLight: '#e6fdff',
    faceDeep: '#0e7490',
    ink: '#062b33',
    body: '#172631',
    glow: '#8ff0ff',
    label: 'Finalist',
  },
  special: {
    face: '#f472b6',
    faceLight: '#ffe4f1',
    faceDeep: '#9d174d',
    ink: '#3b0620',
    body: '#2b1624',
    glow: '#f9a8d4',
    label: 'Special pick',
  },
};

interface PodiumProfile {
  w: number;
  h: number;
  d: number;
  art: number;
}

/* Desktop is wide and shallow: the five cards share the full width instead of
 * stacking into a narrow central tower. Mobile keeps more height and depth. */
const WIDE_PROFILES: Record<number, PodiumProfile> = {
  1: { w: 3.9, h: 1.45, d: 2.25, art: 3.95 },
  2: { w: 3.55, h: 1.15, d: 2.0, art: 3.55 },
  3: { w: 3.45, h: 1.05, d: 1.95, art: 3.45 },
  4: { w: 3.35, h: 0.9, d: 1.85, art: 3.35 },
  5: { w: 3.25, h: 0.8, d: 1.8, art: 3.25 },
};

const NARROW_PROFILES: Record<number, PodiumProfile> = {
  1: { w: 3.0, h: 2.4, d: 2.0, art: 3.3 },
  2: { w: 2.6, h: 1.8, d: 1.8, art: 2.8 },
  3: { w: 2.5, h: 1.65, d: 1.7, art: 2.7 },
  4: { w: 2.35, h: 1.3, d: 1.55, art: 2.5 },
  5: { w: 2.25, h: 1.2, d: 1.5, art: 2.4 },
};

const PLAQUE_ASPECT = 2.05;

/* Ceremony timing. The drop is deliberately long enough to read as a fall and
 * the stagger is wide enough that the impacts travel left-to-right as a wave. */
/* MashKin-style ceremony beats: each winner is held off-stage, then slams in on
 * its own cue with a hard drop, a squash, a shockwave and a camera punch. */
const SLAM_START = 0.5;
const SLAM_STAGGER = 0.42;
const DROP_SECONDS = 0.52;
const DROP_HEIGHT = 7.6;

function specialProfile(narrow: boolean): PodiumProfile {
  return narrow
    ? { w: 2.7, h: 1.5, d: 1.65, art: 2.75 }
    : { w: 3.4, h: 1.1, d: 2.0, art: 3.4 };
}

interface PodiumSlot {
  row: ResolvedPrize;
  place: number;
  mode: StageMode;
  kicker: string;
  tier: TierPalette;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  art: number;
  plaqueH: number;
  cardBase: number;
  cardTop: number;
  delay: number;
}

interface StageBounds {
  width: number;
  height: number;
  depth: number;
  centerY: number;
  centerZ: number;
}

function ordinal(place: number): string {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  switch (place % 10) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}

function tierFor(place: number, mode: StageMode): TierPalette {
  if (mode === 'special') return TIERS.special;
  if (place === 1) return TIERS.gold;
  if (place === 2) return TIERS.silver;
  if (place === 3) return TIERS.bronze;
  return TIERS.place;
}

function buildSlots(rows: ResolvedPrize[], narrow: boolean, mode: StageMode): PodiumSlot[] {
  const ranked = [...rows].sort((a, b) => (a.prize.place ?? 99) - (b.prize.place ?? 99));
  const count = ranked.length;
  const positions: Record<number, { x: number; z: number }> =
    mode === 'special'
      ? narrow
        ? {
            1: { x: -2.8, z: -1.6 },
            2: { x: 2.8, z: -1.6 },
            3: { x: -2.8, z: 1.8 },
            4: { x: 2.8, z: 1.8 },
          }
        : {
            1: { x: -6.6, z: 0.5 },
            2: { x: -2.2, z: 0.15 },
            3: { x: 2.2, z: 0.15 },
            4: { x: 6.6, z: 0.5 },
          }
      : narrow
        ? count >= 5
          ? {
              1: { x: 0, z: -2.6 },
              2: { x: -3.1, z: -0.8 },
              3: { x: 3.1, z: -0.8 },
              4: { x: -3.55, z: 2.4 },
              5: { x: 3.55, z: 2.4 },
            }
          : { 1: { x: 0, z: -1.4 }, 2: { x: -3.0, z: 0.8 }, 3: { x: 3.0, z: 0.8 } }
        : count >= 5
          ? {
              1: { x: 0, z: 0 },
              2: { x: -4.0, z: 0.28 },
              3: { x: 4.0, z: 0.28 },
              4: { x: -8.15, z: 0.8 },
              5: { x: 8.15, z: 0.8 },
            }
          : { 1: { x: 0, z: 0 }, 2: { x: -5.6, z: 0.3 }, 3: { x: 5.6, z: 0.3 } };

  const profiles = narrow ? NARROW_PROFILES : WIDE_PROFILES;
  const slots = ranked.map((row, index) => {
    const place = row.prize.place ?? index + 1;
    const profile = mode === 'special' ? specialProfile(narrow) : profiles[place] ?? profiles[5];
    const position = positions[place] ?? { x: 0, z: 0 };
    const plaqueH = profile.art / PLAQUE_ASPECT;
    // Leaves room for the angled nameplate on the podium top so it never bites
    // into the info plaque above it.
    const cardBase = profile.h + 0.78;
    const cardTop = cardBase + profile.art + plaqueH + 0.16;
    const kicker =
      mode === 'special'
        ? `Special category · ${row.prize.category}`
        : `${ordinal(place)} place · ${row.prize.category}`;
    return {
      row,
      place,
      mode,
      kicker,
      tier: tierFor(place, mode),
      x: position.x,
      z: position.z,
      w: profile.w,
      h: profile.h,
      d: profile.d,
      art: profile.art,
      plaqueH,
      cardBase,
      cardTop,
      delay: 0,
    };
  });

  // Physical left-to-right order, so the impacts travel across the stage like a wave.
  return slots
    .sort((a, b) => a.x - b.x || a.z - b.z)
    .map((slot, index) => ({ ...slot, delay: SLAM_START + index * SLAM_STAGGER }));
}

function measureSlots(slots: PodiumSlot[]): StageBounds {
  if (slots.length === 0) {
    return { width: 12, height: 7, depth: 3, centerY: 3.4, centerZ: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxY = 0;
  for (const slot of slots) {
    const half = Math.max(slot.w / 2, slot.art / 2 + 0.08);
    minX = Math.min(minX, slot.x - half);
    maxX = Math.max(maxX, slot.x + half);
    minZ = Math.min(minZ, slot.z - slot.d / 2);
    maxZ = Math.max(maxZ, slot.z + slot.d / 2);
    maxY = Math.max(
      maxY,
      slot.cardTop + (slot.mode !== 'special' && slot.place === 1 ? 0.55 : 0.08),
    );
  }
  return {
    width: maxX - minX,
    height: maxY,
    depth: maxZ - minZ,
    centerY: maxY / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

function StageCamera({
  bounds,
  narrow,
  shake,
}: {
  bounds: StageBounds;
  narrow: boolean;
  shake: { current: StageShake };
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const basePos = useRef(new THREE.Vector3());
  const aim = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    const base = basePos.current;
    if (base.lengthSq() === 0) return;
    const state = shake.current;
    const dt = Math.min(delta, 0.05);
    state.strength *= Math.exp(-5.5 * dt);
    state.punch *= Math.exp(-3.2 * dt);
    const jitter = state.strength > 0.003 ? state.strength : 0;
    // Jitter decays from the impact outwards, like a camera taking the hit, and
    // the punch dollies the whole stage toward the viewer on each slam.
    camera.position.set(
      base.x + (Math.random() - 0.5) * jitter,
      base.y + (Math.random() - 0.5) * jitter,
      base.z - state.punch + (Math.random() - 0.5) * jitter * 0.6,
    );
    camera.lookAt(aim.current);
  });

  useEffect(() => {
    const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
    const fov = THREE.MathUtils.degToRad(34);
    const margin = narrow ? 1.12 : 1.06;
    const vertical = (bounds.height * margin * 0.5) / Math.tan(fov / 2);
    const horizontal = (bounds.width * margin * 0.5) / (Math.tan(fov / 2) * aspect);
    const distance = Math.max(vertical, horizontal) + bounds.depth * 0.4;
    const elevation = narrow ? 0.42 : 0.22;
    camera.position.set(
      0,
      bounds.centerY + Math.sin(elevation) * distance,
      Math.cos(elevation) * distance + bounds.centerZ,
    );
    basePos.current.copy(camera.position);
    aim.current.set(0, bounds.centerY, bounds.centerZ);
    camera.lookAt(aim.current);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.fov = 34;
      perspective.near = 0.1;
      perspective.far = Math.max(80, distance * 3);
      perspective.updateProjectionMatrix();
    }
  }, [bounds, camera, narrow, size.height, size.width]);

  return null;
}

function StudioEnvironment() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.95;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      room.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
    };
  }, [gl, scene]);

  return null;
}

function paintRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Creates a canvas texture and repaints it once webfonts have finished loading. */
function useCanvasTexture(
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  width: number,
  height: number,
  deps: unknown[],
): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) paint(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return texture;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let alive = true;
    const redraw = () => {
      if (!alive) return;
      const canvas = texture.image as HTMLCanvasElement | undefined;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      paint(ctx, width, height);
      texture.needsUpdate = true;
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(redraw).catch(() => {});
    }
    return () => {
      alive = false;
      texture.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture]);

  return texture;
}

function paintInfoPlaque(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  row: ResolvedPrize,
  accent: string,
  kicker: string,
) {
  const { prize, game } = row;
  const pad = Math.round(width * 0.04);
  const radius = Math.round(width * 0.018);
  ctx.clearRect(0, 0, width, height);

  // Opaque, high-contrast panel. No translucent wash over the type.
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#171027');
  background.addColorStop(0.52, '#0b0714');
  background.addColorStop(1, '#06040c');
  paintRoundedRect(ctx, 4, 4, width - 8, height - 8, radius);
  ctx.fillStyle = background;
  ctx.fill();

  ctx.save();
  paintRoundedRect(ctx, 4, 4, width - 8, height - 8, radius);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, Math.round(height * 0.012));
  const glow = ctx.createRadialGradient(width * 0.16, 0, 0, width * 0.16, 0, width * 0.44);
  glow.addColorStop(0, `${accent}1f`);
  glow.addColorStop(1, `${accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  paintRoundedRect(ctx, 4, 4, width - 8, height - 8, radius);
  ctx.strokeStyle = `${accent}4a`;
  ctx.lineWidth = 2;
  ctx.stroke();

  const maxWidth = width - pad * 2;

  // Prize moves up beside the category label so the whole bottom of the card is
  // free for the creator, who is the reason any of this exists.
  ctx.textBaseline = 'alphabetic';
  const money = formatPrizeMoney(prize.amount);
  const moneySize = Math.round(width * 0.056);
  ctx.textAlign = 'right';
  ctx.font = `900 ${moneySize}px Unbounded, Outfit, system-ui, sans-serif`;
  const moneyWidth = ctx.measureText(money).width;
  const topBaseline = Math.round(height * 0.15);
  ctx.fillStyle = accent;
  ctx.fillText(money, width - pad, topBaseline);

  const kickerSpace = maxWidth - moneyWidth - Math.round(width * 0.035);
  ctx.textAlign = 'left';
  let kickerSize = Math.round(width * 0.05);
  let kickerText = kicker.toUpperCase();
  ctx.font = `800 ${kickerSize}px Outfit, system-ui, sans-serif`;
  while (kickerSize > Math.round(width * 0.028) && ctx.measureText(kickerText).width > kickerSpace) {
    kickerSize -= 1;
    ctx.font = `800 ${kickerSize}px Outfit, system-ui, sans-serif`;
  }
  while (kickerText.length > 8 && ctx.measureText(kickerText).width > kickerSpace) {
    kickerText = kickerText.slice(0, -1);
  }
  ctx.fillStyle = accent;
  ctx.fillText(kickerText, pad, topBaseline);
  let fontSize = Math.round(width * 0.105);
  let lines: string[] = [];
  while (fontSize >= Math.round(width * 0.06)) {
    ctx.font = `800 ${fontSize}px Outfit, system-ui, sans-serif`;
    const words = prize.title.split(/\s+/);
    const next: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        next.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) next.push(line);
    lines = next;
    if (lines.length <= 2) break;
    fontSize -= 4;
  }

  ctx.font = `800 ${fontSize}px Outfit, system-ui, sans-serif`;
  ctx.fillStyle = '#fffaf0';
  const lineHeight = fontSize * 1.08;
  const firstBaseline = lines.length > 1 ? Math.round(height * 0.42) : Math.round(height * 0.53);
  lines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, pad, firstBaseline + index * lineHeight);
  });

  // Credit band across the foot of the card.
  const bandTop = Math.round(height * 0.755);
  ctx.fillStyle = `${accent}16`;
  ctx.fillRect(0, bandTop, width, height - bandTop);
  ctx.fillStyle = `${accent}40`;
  ctx.fillRect(0, bandTop, width, 2);

  const footerCenter = Math.round((bandTop + height) / 2) + Math.round(height * 0.012);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const author = game?.creatorName ?? prize.creatorName;
  const name = author || 'Creator to be announced';
  const bySize = Math.round(width * 0.045);
  ctx.font = `800 ${bySize}px Outfit, system-ui, sans-serif`;
  ctx.fillStyle = accent;
  ctx.fillText('BY', pad, footerCenter);
  const byWidth = ctx.measureText('BY').width;
  const nameLeft = pad + byWidth + Math.round(width * 0.02);
  const nameSpace = width - pad - nameLeft;

  // Full-width credit, sized like a nameplate rather than a footnote.
  let nameSize = Math.round(width * 0.092);
  let fitted = name;
  ctx.font = `800 ${nameSize}px Outfit, system-ui, sans-serif`;
  while (nameSize > Math.round(width * 0.06) && ctx.measureText(fitted).width > nameSpace) {
    nameSize -= 2;
    ctx.font = `800 ${nameSize}px Outfit, system-ui, sans-serif`;
  }
  while (fitted.length > 4 && ctx.measureText(fitted).width > nameSpace) {
    fitted = fitted.slice(0, -1);
  }
  ctx.fillStyle = '#fff6e2';
  ctx.fillText(fitted, nameLeft, footerCenter);
  ctx.textBaseline = 'alphabetic';
}


function paintCoin(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  place: number,
  tier: TierPalette,
) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.472;
  ctx.clearRect(0, 0, width, height);

  const face = ctx.createRadialGradient(cx - radius * 0.34, cy - radius * 0.36, radius * 0.1, cx, cy, radius);
  face.addColorStop(0, tier.faceLight);
  face.addColorStop(0.34, tier.face);
  face.addColorStop(0.78, tier.faceDeep);
  face.addColorStop(1, '#1a1206');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = width * 0.018;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(20,10,0,0.22)';
  ctx.lineWidth = width * 0.012;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,255,255,0.28)';
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = tier.ink;
  if (place > 0) {
    ctx.font = `900 ${Math.round(width * 0.58)}px Unbounded, Outfit, system-ui, sans-serif`;
    ctx.fillText(String(place), cx, cy + width * 0.035);
  } else {
    const outer = width * 0.22;
    const inner = width * 0.095;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = 'transparent';

  // A little laurel of dots under the numeral.
  ctx.fillStyle = 'rgba(30,16,2,0.38)';
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * 0.18 + (i / 6) * Math.PI * 0.64;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * radius * 0.58, cy + Math.sin(angle) * radius * 0.58, width * 0.009, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintPodiumLabel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  accent: string,
) {
  ctx.clearRect(0, 0, width, height);
  paintRoundedRect(ctx, 5, 5, width - 10, height - 10, 16);
  ctx.fillStyle = 'rgba(7, 5, 14, 0.9)';
  ctx.fill();
  ctx.strokeStyle = `${accent}99`;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = text.toUpperCase();
  const maxWidth = width - 36;
  let fontSize = 72;
  ctx.font = `800 ${fontSize}px Outfit, system-ui, sans-serif`;
  while (fontSize > 26 && ctx.measureText(label).width > maxWidth) {
    fontSize -= 2;
    ctx.font = `800 ${fontSize}px Outfit, system-ui, sans-serif`;
  }
  ctx.fillStyle = '#fff8e8';
  ctx.fillText(label, width / 2, height / 2 + 2);
}

function paintStoryCover(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prize: ResolvedPrize['prize'],
  place: number,
  tier: TierPalette,
  mode: StageMode,
) {
  const cx = width / 2;
  const pad = width * 0.075;
  let seed = 1789 + place * 101;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#120a26');
  sky.addColorStop(0.46, '#070410');
  sky.addColorStop(1, '#030207');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const haze = ctx.createRadialGradient(cx, height * 0.38, 0, cx, height * 0.38, width * 0.58);
  haze.addColorStop(0, `${tier.face}55`);
  haze.addColorStop(0.42, `${tier.faceDeep}24`);
  haze.addColorStop(1, 'rgba(3,2,7,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(cx, height * 0.42);
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + 0.15;
    ctx.rotate(angle);
    const ray = ctx.createLinearGradient(0, 0, width * 0.52, 0);
    ray.addColorStop(0, `${tier.glow}18`);
    ray.addColorStop(1, `${tier.glow}00`);
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.52, -width * 0.005);
    ctx.lineTo(width * 0.52, width * 0.005);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-angle);
  }
  ctx.restore();

  for (let i = 0; i < 150; i++) {
    const x = rand() * width;
    const y = rand() * height * 0.64;
    const radius = rand() < 0.1 ? 2.2 : rand() < 0.5 ? 1.2 : 0.7;
    ctx.fillStyle = `rgba(255, ${230 + Math.floor(rand() * 25)}, 235, ${0.25 + rand() * 0.55})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const moonX = cx;
  const moonY = height * 0.33;
  const moonR = width * 0.145;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 2.4);
  moonGlow.addColorStop(0, `${tier.glow}55`);
  moonGlow.addColorStop(1, `${tier.glow}00`);
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 2.4, 0, Math.PI * 2);
  ctx.fill();
  const moon = ctx.createLinearGradient(moonX - moonR, moonY - moonR, moonX + moonR, moonY + moonR);
  moon.addColorStop(0, tier.faceLight);
  moon.addColorStop(0.62, tier.face);
  moon.addColorStop(1, tier.faceDeep);
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  const horizon = height * 0.64;
  ctx.fillStyle = '#08040f';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, horizon + height * 0.04);
  for (let i = 0; i <= 7; i++) {
    const x = (i / 7) * width;
    const y = horizon + Math.sin(i * 1.4 + place) * height * 0.035 - (i % 3 === 0 ? height * 0.04 : 0);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#040209';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, horizon + height * 0.11);
  ctx.quadraticCurveTo(width * 0.28, horizon + height * 0.03, width * 0.5, horizon + height * 0.1);
  ctx.quadraticCurveTo(width * 0.74, horizon + height * 0.17, width, horizon + height * 0.07);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  const reflection = ctx.createLinearGradient(0, horizon, 0, height);
  reflection.addColorStop(0, `${tier.glow}22`);
  reflection.addColorStop(1, `${tier.glow}00`);
  ctx.fillStyle = reflection;
  ctx.fillRect(cx - width * 0.18, horizon, width * 0.36, height - horizon);

  const vignette = ctx.createRadialGradient(cx, height * 0.46, height * 0.2, cx, height * 0.46, height * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${Math.round(width * 0.034)}px Outfit, system-ui, sans-serif`;
  ctx.fillStyle = tier.glow;
  const eyebrow =
    mode === 'story' ? 'STORY & VIDEO' : mode === 'special' ? 'SPECIAL CATEGORY' : prize.category.toUpperCase();
  ctx.fillText(eyebrow, pad, pad + 18);

  const badgeX = width - pad - width * 0.06;
  const badgeY = pad + width * 0.055;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, width * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = tier.face;
  ctx.fill();
  ctx.strokeStyle = `${tier.faceLight}bb`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tier.ink;
  if (mode === 'special') {
    const outer = width * 0.032;
    const inner = width * 0.014;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = badgeX + Math.cos(angle) * radius;
      const py = badgeY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.font = `900 ${Math.round(width * 0.062)}px Unbounded, Outfit, system-ui, sans-serif`;
    ctx.fillText(String(place), badgeX, badgeY + width * 0.004);
  }

  const shade = ctx.createLinearGradient(0, height * 0.62, 0, height);
  shade.addColorStop(0, 'rgba(3,2,7,0)');
  shade.addColorStop(0.55, 'rgba(3,2,7,0.72)');
  shade.addColorStop(1, 'rgba(3,2,7,0.96)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, height * 0.6, width, height * 0.4);

  // No title here: the info plaque directly below already carries it, and a
  // poster that repeats it reads as a placeholder rather than artwork.
  const spark = ctx.createLinearGradient(0, height * 0.86, 0, height);
  spark.addColorStop(0, `${tier.glow}00`);
  spark.addColorStop(1, `${tier.glow}33`);
  ctx.fillStyle = spark;
  ctx.fillRect(0, height * 0.86, width, height * 0.14);
}

function paintArena(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#140c2a');
  sky.addColorStop(0.48, '#080411');
  sky.addColorStop(1, '#030208');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width / 2, height * 0.72, 20, width / 2, height * 0.72, width * 0.46);
  glow.addColorStop(0, 'rgba(255,196,70,0.17)');
  glow.addColorStop(0.42, 'rgba(126,72,220,0.09)');
  glow.addColorStop(1, 'rgba(5,4,12,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height * 0.78);
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2;
    ctx.rotate(angle);
    const ray = ctx.createLinearGradient(0, 0, width * 0.4, 0);
    ray.addColorStop(0, 'rgba(255,225,160,0.035)');
    ray.addColorStop(1, 'rgba(255,225,160,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.42, -width * 0.007);
    ctx.lineTo(width * 0.42, width * 0.007);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-angle);
  }
  ctx.restore();

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.72;
    const radius = Math.random() < 0.12 ? 2.6 : Math.random() < 0.5 ? 1.4 : 0.8;
    ctx.fillStyle = `rgba(255, ${220 + Math.floor(Math.random() * 30)}, 210, ${0.25 + Math.random() * 0.55})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

const glowCache = new Map<string, THREE.CanvasTexture>();

function glowTexture(color: string): THREE.CanvasTexture {
  const cached = glowCache.get(color);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, `${color}aa`);
    gradient.addColorStop(0.32, `${color}55`);
    gradient.addColorStop(0.68, `${color}16`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  glowCache.set(color, texture);
  return texture;
}

function usePosterTexture(url: string | undefined): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    let alive = true;
    let timer = 0;
    let attempt = 0;
    const load = () => {
      loadGameThumbnail(url)
        .then((next) => {
          if (alive) setTexture(next);
        })
        .catch(() => {
          // The jam grid fires thousands of poster requests at once, which can make
          // a thumbnail fail outright. Back off and retry until the queue drains.
          if (!alive || attempt >= 7) return;
          attempt += 1;
          timer = window.setTimeout(load, Math.min(9000, 700 * 1.9 ** (attempt - 1)));
        });
    };
    load();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [url]);
  return texture;
}

/** Story/video winners have no jam game, so their art comes from the prize itself. */
function coverUrl(row: ResolvedPrize): string | undefined {
  return row.game?.thumbnailUrl || row.prize.thumbnailUrl || undefined;
}

function GameCover({ slot, art }: { slot: PodiumSlot; art: number }) {
  const texture = usePosterTexture(coverUrl(slot.row));
  // Never show an empty panel if a thumbnail is still in flight: the generated
  // poster keeps the slam looking finished, then swaps to the real art.
  if (!texture) return <GeneratedCover slot={slot} art={art} />;
  return (
    <mesh position={[0, 0, 0.061]}>
      <planeGeometry args={[art, art]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function GeneratedCover({ slot, art }: { slot: PodiumSlot; art: number }) {
  const { row } = slot;
  const texture = useCanvasTexture(
    (ctx, width, height) =>
      paintStoryCover(ctx, width, height, row.prize, slot.place, slot.tier, slot.mode),
    768,
    768,
    [row.prize.id, row.prize.title, row.prize.category, slot.place, slot.mode, slot.tier.face],
  );
  return (
    <mesh position={[0, 0, 0.061]}>
      <planeGeometry args={[art, art]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function CardCover({ slot, art }: { slot: PodiumSlot; art: number }) {
  return coverUrl(slot.row) ? (
    <GameCover slot={slot} art={art} />
  ) : (
    <GeneratedCover slot={slot} art={art} />
  );
}

function Arena() {
  const backdrop = useCanvasTexture(
    (ctx, width, height) => paintArena(ctx, width, height),
    2048,
    1024,
    [],
  );
  const raysRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (raysRef.current) raysRef.current.rotation.z += Math.min(delta, 0.05) * 0.012;
  });

  return (
    <>
      <color attach="background" args={['#06040d']} />
      <fog attach="fog" args={['#06040d', 30, 70]} />
      <mesh position={[0, 7.5, -20]} frustumCulled={false}>
        <planeGeometry args={[62, 36]} />
        <meshBasicMaterial map={backdrop} toneMapped={false} depthWrite={false} />
      </mesh>
      <group ref={raysRef} position={[0, 7, -18]}>
        <mesh>
          <planeGeometry args={[46, 30]} />
          <meshBasicMaterial
            map={glowTexture('#8b5cf6')}
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh position={[0, 3.8, -12]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial
          map={glowTexture('#ffc45a')}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

function StageFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <circleGeometry args={[30, 96]} />
        <meshStandardMaterial color="#090615" metalness={0.55} roughness={0.34} envMapIntensity={1.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[36, 36]} />
        <meshBasicMaterial
          map={glowTexture('#6d4ad8')}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[25, 25]} />
        <meshBasicMaterial
          map={glowTexture('#ffc45a')}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {[4.7, 7.8, 10.8, 13.8].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024 + index * 0.002, 0]}>
          <ringGeometry args={[radius, radius + 0.035, 128]} />
          <meshBasicMaterial
            color={index === 0 ? '#ffd76a' : '#8f74e8'}
            transparent
            opacity={index === 0 ? 0.28 : 0.10}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function StageLights() {
  return (
    <>
      <hemisphereLight args={['#d9c7ff', '#0b0714', 0.5]} />
      <ambientLight intensity={0.22} color="#4a3870" />
      <directionalLight position={[8, 14, 9]} intensity={1.15} color="#fff1d5" />
      <directionalLight position={[-9, 9, -7]} intensity={0.4} color="#9a7bff" />
      <directionalLight position={[0, 5, 14]} intensity={0.25} color="#ffd9a0" />
    </>
  );
}

function PodiumBase({ slot }: { slot: PodiumSlot }) {
  const { w, h, d, tier, place } = slot;
  const coinRadius = Math.min(w * 0.26, h * 0.3, 0.55);
  const coinY = h * 0.55;
  const coinZ = d / 2 + 0.09;
  // Special categories have no ranking, so they get the star medal instead of a numeral.
  const medal = slot.mode === 'special' ? 0 : place;
  const coin = useCanvasTexture(
    (ctx, width, height) => paintCoin(ctx, width, height, medal, tier),
    512,
    512,
    [medal, tier],
  );
  const label = useCanvasTexture(
    (ctx, width, height) => paintPodiumLabel(ctx, width, height, tier.label, tier.glow),
    512,
    144,
    [tier.label, tier.glow],
  );

  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.07} smoothness={4} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color={tier.body}
          metalness={0.78}
          roughness={0.3}
          envMapIntensity={1.15}
          emissive={tier.faceDeep}
          emissiveIntensity={0.08}
        />
      </RoundedBox>

      <mesh position={[0, 0.055, 0]}>
        <boxGeometry args={[w + 0.16, 0.11, d + 0.16]} />
        <meshStandardMaterial color="#100b1c" metalness={0.75} roughness={0.26} />
      </mesh>

      <mesh position={[0, h + 0.045, 0]}>
        <boxGeometry args={[w + 0.14, 0.09, d + 0.14]} />
        <meshStandardMaterial
          color={tier.face}
          metalness={0.98}
          roughness={0.16}
          emissive={tier.glow}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, h + 0.1, 0]}>
        <boxGeometry args={[w - 0.12, 0.06, d - 0.12]} />
        <meshStandardMaterial color="#0d0918" metalness={0.8} roughness={0.22} />
      </mesh>

      <mesh position={[0, 0.14, d / 2 + 0.012]}>
        <boxGeometry args={[w * 0.82, 0.055, 0.035]} />
        <meshBasicMaterial color={tier.glow} toneMapped={false} />
      </mesh>

      <mesh position={[0, coinY, d / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[coinRadius + 0.04, coinRadius + 0.04, 0.1, 48]} />
        <meshStandardMaterial
          color={tier.faceDeep}
          metalness={0.96}
          roughness={0.2}
          emissive={tier.face}
          emissiveIntensity={0.15}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, coinY, coinZ]} rotation={[0, 0, 0]}>
        <circleGeometry args={[coinRadius, 64]} />
        <meshBasicMaterial map={coin} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, coinY, coinZ + 0.008]}>
        <torusGeometry args={[coinRadius * 0.98, 0.024, 12, 64]} />
        <meshStandardMaterial color={tier.faceLight} metalness={0.9} roughness={0.2} emissive={tier.glow} emissiveIntensity={0.25} />
      </mesh>

      {/* Rank nameplate sits on the open top surface, angled toward the camera. */}
      <mesh position={[0, h + 0.18, d / 2 - 0.5]} rotation={[-Math.PI / 2 + 0.3, 0, 0]}>
        <planeGeometry args={[w * 0.8, w * 0.24]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[w * 2.9, d * 2.9]} />
        <meshBasicMaterial
          map={glowTexture(tier.glow)}
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

    </group>
  );
}

interface StageShake {
  strength: number;
  punch: number;
}

function SlamCard({
  slot,
  onOpen,
  reduced,
  launch,
  shake,
}: {
  slot: PodiumSlot;
  onOpen: (game: JamGame) => void;
  reduced: boolean;
  launch: boolean;
  shake: { current: StageShake };
}) {
  const cardRef = useRef<THREE.Group>(null);
  const hoverRef = useRef<THREE.Group>(null);
  const clockStart = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const { art, plaqueH, cardBase, place, tier, row } = slot;
  const game = row.game;
  const canOpen = slot.mode !== 'story' && Boolean(game);
  const targetY = cardBase;
  const startY = cardBase + DROP_HEIGHT;
  const landed = useRef(false);
  const tilt = slot.place % 2 === 0 ? 0.07 : -0.07;
  const glow = useMemo(() => glowTexture(tier.glow), [tier.glow]);
  const info = useCanvasTexture(
    (ctx, width, height) => paintInfoPlaque(ctx, width, height, row, tier.face, slot.kicker),
    1536,
    640,
    [row.prize.id, row.prize.title, row.prize.amount, game?.gameId, game?.creatorName, tier.face, slot.kicker],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  useFrame((state, delta) => {
    const group = cardRef.current;
    if (!group) return;
    const elapsed = state.clock.elapsedTime;

    if (!launch) {
      clockStart.current = null;
      landed.current = false;
      group.position.y = startY;
      group.scale.set(1, 1, 1);
      group.rotation.z = 0;
      return;
    }

    if (clockStart.current === null) clockStart.current = elapsed;

    if (reduced) {
      group.position.y = targetY;
      group.scale.set(1, 1, 1);
      group.rotation.z = 0;
    } else {
      const local = elapsed - clockStart.current - slot.delay;
      const progress = Math.min(1, Math.max(0, local / DROP_SECONDS));
      let y = startY;
      if (local >= 0) {
        // Gravity slam from off-stage, then a bounce and a slow idle float.
        y = startY + (targetY - startY) * Math.pow(progress, 1.6);
        if (progress >= 1) {
          const since = local - DROP_SECONDS;
          y = targetY + Math.abs(Math.sin(since * 12)) * 0.3 * Math.exp(-since * 5.5);
          y += Math.sin(since * 0.9 + place) * 0.018;
        }
      }
      group.position.y = y;

      // Stretch on the way down, hard squash on contact, then settle.
      const falling = local >= 0 && progress < 1;
      group.rotation.z = falling ? tilt * (1 - progress) : 0;
      if (!reduced && !landed.current && local >= DROP_SECONDS * 0.97) {
        landed.current = true;
        shake.current.strength = Math.max(shake.current.strength, place === 1 ? 0.5 : 0.34);
        shake.current.punch = Math.max(shake.current.punch, place === 1 ? 1.15 : 0.55);
      }
      const sinceLanding = local - DROP_SECONDS;
      const squash = sinceLanding >= 0 ? Math.exp(-sinceLanding * 9) : 0;
      const stretch = falling ? 0.1 * progress * progress : 0;
      group.scale.set(1 - squash * 0.16, 1 + stretch - squash * 0.3, 1 - squash * 0.16);
    }

    const hover = hoverRef.current;
    if (hover) {
      const want = hovered ? 1.035 : 1;
      const blend = 1 - Math.exp(-10 * Math.min(delta, 0.05));
      hover.scale.x += (want - hover.scale.x) * blend;
      hover.scale.y += (want - hover.scale.y) * blend;
      hover.scale.z += (want - hover.scale.z) * blend;
    }
  });

  const activate = () => {
    if (canOpen && game) onOpen(game);
  };

  return (
    <group ref={cardRef} position={[0, startY, 0]}>
      <group
        ref={hoverRef}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          if (canOpen) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
          document.body.style.cursor = '';
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (canOpen) activate();
        }}
      >
        <group position={[0, plaqueH / 2, 0]}>
          <mesh position={[0, 0, -0.025]}>
            <boxGeometry args={[art * 1.035, plaqueH + 0.05, 0.06]} />
            <meshStandardMaterial
              color="#0b0716"
              metalness={0.6}
              roughness={0.3}
              emissive={tier.faceDeep}
              emissiveIntensity={0.18}
            />
          </mesh>
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[art, plaqueH]} />
            <meshBasicMaterial map={info} transparent toneMapped={false} />
          </mesh>
        </group>

        <group position={[0, plaqueH + 0.16 + art / 2, 0]}>
          <mesh position={[0, 0, -0.18]}>
            <planeGeometry args={[art * 1.55, art * 1.55]} />
            <meshBasicMaterial
              map={glow}
              transparent
              opacity={hovered ? 0.55 : 0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <RoundedBox args={[art + 0.13, art + 0.13, 0.11]} radius={0.055} smoothness={4} position={[0, 0, 0]}>
            <meshStandardMaterial
              color="#0a0614"
              metalness={0.8}
              roughness={0.25}
              emissive={tier.faceDeep}
              emissiveIntensity={hovered ? 0.5 : 0.22}
              envMapIntensity={1.2}
            />
          </RoundedBox>
          <CardCover slot={slot} art={art} />
          <mesh position={[0, (art + 0.13) / 2 + 0.012, 0.07]}>
            <boxGeometry args={[art * 0.72, 0.035, 0.03]} />
            <meshBasicMaterial color={tier.glow} toneMapped={false} />
          </mesh>
        </group>

        {slot.mode !== 'special' && place === 1 ? <Crown art={art} cardTop={art + plaqueH + 0.16} /> : null}
      </group>
    </group>
  );
}

function Crown({ art, cardTop }: { art: number; cardTop: number }) {
  const scale = art * 0.14;
  return (
    <group position={[0, cardTop + 0.42, 0]} scale={scale}>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.66, 0.09, 12, 48]} />
        <meshStandardMaterial color="#ffd76a" metalness={0.95} roughness={0.16} emissive="#ffb020" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.17, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.2, 32, 1, true]} />
        <meshStandardMaterial color="#9a5a08" metalness={0.85} roughness={0.28} side={THREE.DoubleSide} />
      </mesh>
      {[-0.48, -0.24, 0, 0.24, 0.48].map((x, index) => (
        <group key={x} position={[x, 0.34, 0]} rotation={[0, 0, index === 2 ? 0 : x > 0 ? -0.16 : 0.16]}>
          <mesh>
            <coneGeometry args={[0.11, index === 2 ? 0.48 : index === 1 || index === 3 ? 0.42 : 0.34, 10]} />
            <meshStandardMaterial
              color="#ffe08a"
              metalness={0.9}
              roughness={0.2}
              emissive="#ffb020"
              emissiveIntensity={0.55}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, (index === 2 ? 0.48 : index === 1 || index === 3 ? 0.42 : 0.34) / 2 + 0.04, 0]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshBasicMaterial color="#fff8d8" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial
          map={glowTexture('#ffd76a')}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function ImpactRing({ slot, reduced, launch }: { slot: PodiumSlot; reduced: boolean; launch: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const flashMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const startRef = useRef<number | null>(null);

  useFrame((state) => {
    const ring = ringRef.current;
    const material = materialRef.current;
    const flash = flashRef.current;
    const flashMaterial = flashMaterialRef.current;
    if (!ring || !material || !flash || !flashMaterial) return;
    if (!launch || reduced) {
      ring.visible = false;
      flash.visible = false;
      startRef.current = null;
      return;
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const local = state.clock.elapsedTime - startRef.current - slot.delay - DROP_SECONDS * 0.9;
    if (local < 0 || local > 1) {
      ring.visible = false;
      flash.visible = false;
      return;
    }
    ring.visible = true;
    const progress = local / 1;
    const scale = 0.35 + progress * 3.6;
    ring.scale.set(scale, scale, scale);
    material.opacity = (1 - progress) * 0.85;

    if (local < 0.34) {
      const flare = local / 0.34;
      flash.visible = true;
      flash.scale.setScalar(0.85 + flare * 2.5);
      flashMaterial.opacity = (1 - flare) * 0.8;
    } else {
      flash.visible = false;
    }
  });

  return (
    <>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, slot.h + 0.11, 0]} visible={false}>
        <ringGeometry args={[0.62, 0.72, 64]} />
        <meshBasicMaterial
          ref={materialRef}
          color={slot.tier.glow}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={flashRef} position={[0, slot.h + 0.55, 0.34]} visible={false} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={flashMaterialRef}
          map={glowTexture(slot.tier.glow)}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

function ImpactBurst({ slot, reduced, launch }: { slot: PodiumSlot; reduced: boolean; launch: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startRef = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 24;
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.3;
        const reach = 0.7 + Math.random() * 1.6;
        return {
          dx: Math.cos(angle) * reach,
          dz: Math.sin(angle) * reach,
          lift: 1.5 + Math.random() * 2.4,
          size: 0.035 + Math.random() * 0.055,
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          ),
        };
      }),
    [count, slot.place],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!launch || reduced) {
      mesh.visible = false;
      startRef.current = null;
      return;
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const local = state.clock.elapsedTime - startRef.current - slot.delay - DROP_SECONDS * 0.9;
    if (local < 0 || local > 1.1) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const progress = local / 1.1;
    const fade = 1 - progress;
    sparks.forEach((spark, index) => {
      dummy.position.set(
        spark.dx * progress * 2.3,
        slot.h + 0.14 + spark.lift * local - 7.5 * local * local,
        spark.dz * progress * 2.3,
      );
      dummy.rotation.set(spark.spin.x * local, spark.spin.y * local, spark.spin.z * local);
      dummy.scale.setScalar(spark.size * fade);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
      visible={false}
      frustumCulled={false}
      renderOrder={4}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={slot.tier.glow}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/** Dust kicked off the podium lip on impact — soft and heavy, so it reads separate from the sparks. */
function DustBurst({ slot, reduced, launch }: { slot: PodiumSlot; reduced: boolean; launch: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startRef = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 34;
  const puffs = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.9;
        const reach = 0.7 + Math.random() * 1.7;
        return {
          dx: Math.cos(angle) * reach,
          dz: Math.sin(angle) * reach,
          lift: 0.7 + Math.random() * 1.4,
          size: 0.1 + Math.random() * 0.16,
        };
      }),
    [count],
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!launch || reduced) {
      mesh.visible = false;
      startRef.current = null;
      return;
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const local = state.clock.elapsedTime - startRef.current - slot.delay - DROP_SECONDS * 0.98;
    if (local < 0 || local > 1.25) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const progress = local / 1.25;
    puffs.forEach((puff, index) => {
      dummy.position.set(
        puff.dx * progress * 1.9,
        slot.h + 0.1 + puff.lift * progress - 0.9 * progress * progress,
        puff.dz * progress * 1.9,
      );
      dummy.rotation.z = index * 0.9 + progress * 1.6;
      dummy.scale.setScalar(puff.size * (0.5 + progress * 1.9));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - progress);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
      visible={false}
      frustumCulled={false}
      renderOrder={3}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={slot.tier.faceLight}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/** Stage key light that flares as the card lands, the cheap stand-in for a bloom pop. */
function PodiumLight({ slot, reduced, launch }: { slot: PodiumSlot; reduced: boolean; launch: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  const startRef = useRef<number | null>(null);
  const base = slot.place === 1 ? 24 : 15;
  useFrame((state) => {
    const light = ref.current;
    if (!light) return;
    if (!launch) {
      startRef.current = null;
      light.intensity = base;
      return;
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const local = state.clock.elapsedTime - startRef.current - slot.delay - DROP_SECONDS;
    if (local < 0) {
      light.intensity = base * 0.78;
      return;
    }
    light.intensity = base + Math.exp(-local * 5.5) * (slot.place === 1 ? 46 : 30) * (reduced ? 0.3 : 1);
  });
  return (
    <pointLight
      ref={ref}
      position={[0, slot.h + 3.4, 3.2]}
      intensity={base}
      distance={13}
      decay={2}
      color={slot.tier.glow}
    />
  );
}

function Podium({
  slot,
  onOpen,
  reduced,
  launch,
  shake,
}: {
  slot: PodiumSlot;
  onOpen: (game: JamGame) => void;
  reduced: boolean;
  launch: boolean;
  shake: { current: StageShake };
}) {
  return (
    <group position={[slot.x, 0, slot.z]}>
      <PodiumBase slot={slot} />
      <SlamCard slot={slot} onOpen={onOpen} reduced={reduced} launch={launch} shake={shake} />
      <ImpactRing slot={slot} reduced={reduced} launch={launch} />
      <ImpactBurst slot={slot} reduced={reduced} launch={launch} />
      <DustBurst slot={slot} reduced={reduced} launch={launch} />
      <PodiumLight slot={slot} reduced={reduced} launch={launch} />
      <pointLight
        position={[0, slot.h * 0.5, slot.d / 2 + 2.4]}
        intensity={5}
        distance={6}
        decay={2}
        color={slot.tier.face}
      />
    </group>
  );
}

const CONFETTI_COLORS = ['#ffd76a', '#fff3c4', '#ff6fb5', '#6fe9ff', '#b388ff', '#ffa45c', '#9ef7c7', '#ffffff'];

interface ConfettiPiece {
  x: number;
  y: number;
  z: number;
  fall: number;
  sway: number;
  drift: number;
  phase: number;
  flutter: number;
  rx: number;
  ry: number;
  rz: number;
  spin: THREE.Vector3;
  size: number;
  color: THREE.Color;
}

/** The confetti field sits well behind the podiums so the cards stay the focus. */
const CONFETTI_BACK_Z = -17.5;
const CONFETTI_DEPTH = 12.5;
const CONFETTI_TOP = 14.5;

function spawnConfettiPiece(spread = false): ConfettiPiece {
  return {
    x: -17 + Math.random() * 34,
    y: spread ? -1 + Math.random() * CONFETTI_TOP : CONFETTI_TOP + Math.random() * 3,
    z: CONFETTI_BACK_Z + Math.random() * CONFETTI_DEPTH,
    fall: 0.5 + Math.random() * 1.35,
    sway: 0.4 + Math.random() * 1.9,
    drift: 0.25 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    flutter: 1.4 + Math.random() * 3.2,
    rx: Math.random() * 6,
    ry: Math.random() * 6,
    rz: Math.random() * 6,
    spin: new THREE.Vector3(
      (Math.random() - 0.5) * 3.4,
      (Math.random() - 0.5) * 3.4,
      (Math.random() - 0.5) * 3.4,
    ),
    size: 0.2 + Math.random() * 0.34,
    color: new THREE.Color(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]),
  };
}

function WinnerConfetti({ reduced }: { reduced: boolean }) {
  const size = useThree((state) => state.size);
  const count = size.width < 720 ? 240 : 460;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pieces = useMemo<ConfettiPiece[]>(
    () => Array.from({ length: count }, () => spawnConfettiPiece(true)),
    [count],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    pieces.forEach((piece, index) => mesh.setColorAt(index, piece.color));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pieces]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    // Slow gusts so the whole field ebbs and flows instead of falling straight down.
    const gust = Math.sin(time * 0.23) * 1.6 + Math.sin(time * 0.61 + 1.2) * 0.5;

    pieces.forEach((piece, index) => {
      if (!reduced) {
        piece.y -= piece.fall * dt;
        piece.rx += piece.spin.x * dt;
        piece.ry += piece.spin.y * dt;
        piece.rz += piece.spin.z * dt;
        if (piece.y < -1.4) {
          piece.y = CONFETTI_TOP + Math.random() * 3;
          piece.x = -17 + Math.random() * 34;
          piece.z = CONFETTI_BACK_Z + Math.random() * CONFETTI_DEPTH;
        }
      }
      dummy.position.set(
        piece.x +
          Math.sin(time * 0.75 + piece.phase) * piece.sway +
          Math.sin(time * 0.31 + piece.phase * 1.7) * 0.6 +
          gust * piece.drift,
        piece.y,
        piece.z + Math.cos(time * 0.58 + piece.phase) * 0.75,
      );
      dummy.rotation.set(piece.rx, piece.ry, piece.rz);
      // Squash on one axis so each piece reads as a tumbling paper flake.
      const flip = reduced ? 1 : 0.22 + Math.abs(Math.sin(time * piece.flutter + piece.phase)) * 0.78;
      dummy.scale.set(piece.size * flip, piece.size * 2.3, piece.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
      frustumCulled={false}
      renderOrder={1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        side={THREE.DoubleSide}
        toneMapped={false}
        transparent
        opacity={0.94}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function StageContent({
  rows,
  onOpen,
  mode,
  launch,
  shake,
}: {
  rows: ResolvedPrize[];
  onOpen: (game: JamGame) => void;
  mode: StageMode;
  launch: boolean;
  shake: { current: StageShake };
}) {
  const size = useThree((state) => state.size);
  const reduced = useReducedMotion();
  const narrow = size.width / Math.max(1, size.height) < 1.05;
  const slots = useMemo(() => buildSlots(rows, narrow, mode), [rows, narrow, mode]);
  const bounds = useMemo(() => measureSlots(slots), [slots]);

  return (
    <>
      <StageCamera bounds={bounds} narrow={narrow} shake={shake} />
      <Arena />
      <StudioEnvironment />
      <StageLights />
      <StageFloor />
      {slots.map((slot) => (
        <Podium
          key={slot.row.prize.id}
          slot={slot}
          onOpen={onOpen}
          reduced={reduced}
          launch={launch}
          shake={shake}
        />
      ))}
      <WinnerConfetti reduced={reduced} />
      <Sparkles
        count={90}
        scale={[16, 9, 7]}
        position={[0, 5.5, 0]}
        size={2.2}
        speed={reduced ? 0 : 0.24}
        opacity={0.5}
        color="#ffe7a8"
      />
    </>
  );
}

const MIN_LOADER_MS = 900;
/* Posters are the whole show, so the curtain waits for them; the progress bar
 * makes the wait part of the ceremony instead of a placeholder slam. */
const MAX_LOADER_MS = 14000;
const LOADER_FADE_MS = 700;

/**
 * Full-bleed 3D award ceremony: podiums plus covers slam down left-to-right.
 *
 * Every cover is downloaded before the wave starts, so the cards never appear
 * half-painted mid-slam. A short minimum loader time gives the ceremony a
 * deliberate beat instead of popping in instantly; a hard timeout keeps a slow
 * network from trapping the screen behind the loader.
 */
export function WinnerStage3D({ rows, onOpen, mode = 'ranked' }: WinnerStage3DProps) {
  const ranked = useMemo(
    () => [...rows].sort((a, b) => (a.prize.place ?? 99) - (b.prize.place ?? 99)),
    [rows],
  );
  const covers = useMemo(
    () => ranked.map(coverUrl).filter((url): url is string => Boolean(url)),
    [ranked],
  );
  const [progress, setProgress] = useState(0);
  const [launch, setLaunch] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [fading, setFading] = useState(false);
  const shake = useRef<StageShake>({ strength: 0, punch: 0 });

  useEffect(() => {
    let alive = true;
    let startTimer = 0;
    let hideTimer = 0;
    let maxTimer = 0;
    let done = 0;
    const startedAt = performance.now();

    setProgress(0);
    setLaunch(false);
    setFading(false);
    setShowLoader(true);

    const coversDone = covers.map((url) =>
      loadGameThumbnail(url)
        .catch(() => null)
        .then(() => {
          done += 1;
          if (alive) setProgress(done / covers.length);
        }),
    );
    const fontsDone = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve();
    const artwork = Promise.all([...coversDone, fontsDone]).then(() => undefined);
    const deadline = new Promise<void>((resolve) => {
      maxTimer = window.setTimeout(resolve, MAX_LOADER_MS);
    });

    Promise.race([artwork, deadline]).then(() => {
      if (!alive) return;
      const remaining = Math.max(0, MIN_LOADER_MS - (performance.now() - startedAt));
      startTimer = window.setTimeout(() => {
        if (!alive) return;
        setProgress(1);
        // Fade the curtain first, then drop the cards into a clear frame.
        setFading(true);
        hideTimer = window.setTimeout(() => {
          if (!alive) return;
          setLaunch(true);
          setShowLoader(false);
        }, LOADER_FADE_MS);
      }, remaining);
    });

    return () => {
      alive = false;
      window.clearTimeout(startTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(maxTimer);
    };
  }, [covers]);

  const percent = Math.round(Math.min(1, Math.max(0.08, progress)) * 100);
  const playable = useMemo(() => ranked.filter((row) => Boolean(row.game)), [ranked]);

  return (
    <div className="winner-stage3d" role="group" aria-label="October Jam winners on a 3D podium stage">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 34, near: 0.1, far: 120, position: [0, 8, 16] }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1,
        }}
      >
        <Suspense fallback={null}>
          <StageContent rows={ranked} onOpen={onOpen} mode={mode} launch={launch} shake={shake} />
        </Suspense>
      </Canvas>

      {showLoader ? (
        <div
          className={`winner-stage3d__loader${fading ? ' is-done' : ''}`}
          role="status"
          aria-live="polite"
          aria-label={launch ? 'Ceremony starting' : `Loading winners artwork ${percent} percent`}
        >
          <div className="winner-stage3d__loader-panel">
            <p className="winner-stage3d__loader-kicker">October Jam · Hall of Fame</p>
            <p className="winner-stage3d__loader-title">Rolling out the red carpet</p>
            <div className="winner-stage3d__loader-track">
              <div className="winner-stage3d__loader-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="winner-stage3d__loader-meta">
              <span>{launch ? 'Places, everyone' : 'Summoning the champions'}</span>
              <span>{launch ? '100%' : `${percent}%`}</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="winner-stage3d__a11y">
        {mode === 'story'
          ? null
          : playable.map(({ prize, game }) =>
              game ? (
                <button key={prize.id} type="button" onClick={() => onOpen(game)}>
                  Play {prize.title} by {game.creatorName}
                </button>
              ) : null,
            )}
      </div>
    </div>
  );
}
