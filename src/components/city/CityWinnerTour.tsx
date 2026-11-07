import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HONOR_WAVE_SIZE, HONORABLE_MENTIONS } from '../../data/honorableMentions';
import { TOUR_PRIZE_IDS, resolveOctoberPrizes } from '../../lib/octoberWinners';
import type { CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { billboardCenterY } from './CityBuildings';

export interface TourStop {
  slot: CityBuildingSlot;
  prizeId: string;
}

export interface HonorStop {
  slot: CityBuildingSlot;
  index: number;
  wave: number;
  waveCount: number;
  indexInWave: number;
}

export interface TourStep {
  index: number;
  kind: 'winner' | 'honor';
  title: string;
  prizeId?: string;
  wave?: number;
  waveCount?: number;
}

const DWELL = 3.25;
const BLEND = 0.55;
/** Honorable mentions are a fast pass: two beats each, then a hard cut. */
const HONOR_DWELL = 2;
const HONOR_BLEND = 0.3;
/** Celebration hold: the camera hangs over the burning skyline before moving. */
const HOLD = 5.2;
/** Fly-in that settles onto the first winner. */
const DESCENT = 2.6;
const INTRO = HOLD + DESCENT;
const HOLD_ORBIT_START = 0.34;
const HOLD_ORBIT_END = HOLD_ORBIT_START + 0.46;

export function pickTourStops(buildings: CityBuildingSlot[], games: JamGame[]): TourStop[] {
  const byPrize = new Map<string, string>();
  for (const row of resolveOctoberPrizes(games)) {
    if (row.game) byPrize.set(row.prize.id, row.game.gameId);
  }
  const stops: TourStop[] = [];
  for (const prizeId of TOUR_PRIZE_IDS) {
    const gameId = byPrize.get(prizeId);
    if (!gameId) continue;
    const slot = buildings.find((b) => b.game.gameId === gameId);
    if (!slot) continue;
    stops.push({ slot, prizeId });
  }
  return stops;
}

/**
 * Honorable mentions in run.world row order, skipping any title that is not a jam
 * game we can place (one entry lives outside the jam feed). Waves are counted after
 * that skip so the caption never promises a fifth game that does not exist.
 */
export function pickHonorStops(buildings: CityBuildingSlot[]): HonorStop[] {
  const byGameId = new Map(buildings.map((b) => [b.game.gameId, b]));
  const slots: CityBuildingSlot[] = [];
  for (const mention of HONORABLE_MENTIONS) {
    const slot = byGameId.get(mention.gameId);
    if (slot) slots.push(slot);
  }
  const waveCount = Math.ceil(slots.length / HONOR_WAVE_SIZE);
  return slots.map((slot, index) => ({
    slot,
    index,
    wave: Math.floor(index / HONOR_WAVE_SIZE) + 1,
    waveCount,
    indexInWave: (index % HONOR_WAVE_SIZE) + 1,
  }));
}

interface Segment {
  slot: CityBuildingSlot;
  kind: 'winner' | 'honor';
  prizeId?: string;
  dwell: number;
  span: number;
  start: number;
  wave?: number;
  waveCount?: number;
}

/** One timeline for both halves so the last winner blends straight into wave one. */
function buildSegments(stops: TourStop[], honorStops: HonorStop[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  const push = (segment: Omit<Segment, 'start'>) => {
    segments.push({ ...segment, start: cursor });
    cursor += segment.span;
  };
  for (const stop of stops) {
    push({ slot: stop.slot, kind: 'winner', prizeId: stop.prizeId, dwell: DWELL, span: DWELL + BLEND });
  }
  for (const stop of honorStops) {
    push({
      slot: stop.slot,
      kind: 'honor',
      dwell: HONOR_DWELL,
      span: HONOR_DWELL + HONOR_BLEND,
      wave: stop.wave,
      waveCount: stop.waveCount,
    });
  }
  return segments;
}

function pose(
  slot: CityBuildingSlot,
  focusX: number,
  focusZ: number,
  dolly: number,
  pos: THREE.Vector3,
  look: THREE.Vector3,
) {
  const y = billboardCenterY(slot);
  const outward = Math.atan2(slot.x - focusX, slot.z - focusZ);
  const dist = 40 - dolly * 3;
  pos.set(slot.x + Math.sin(outward) * dist, y + 26, slot.z + Math.cos(outward) * dist);
  look.set(slot.x, y + 1, slot.z);
}

/** Moves the camera across the winners, then a fast pass of the honorable mentions. */
export function CityWinnerTour({
  stops,
  honorStops = [],
  focusX,
  focusZ,
  active,
  onStep,
  onDone,
  onIntro,
}: {
  stops: TourStop[];
  honorStops?: HonorStop[];
  focusX: number;
  focusZ: number;
  active: boolean;
  onStep: (step: TourStep) => void;
  onDone: () => void;
  onIntro?: () => void;
}) {
  const elapsed = useRef(0);
  const index = useRef(-1);
  const finished = useRef(false);
  const introFired = useRef(false);
  const onStepRef = useRef(onStep);
  const onDoneRef = useRef(onDone);
  const onIntroRef = useRef(onIntro);
  onStepRef.current = onStep;
  onDoneRef.current = onDone;
  onIntroRef.current = onIntro;
  const posA = useRef(new THREE.Vector3());
  const posB = useRef(new THREE.Vector3());
  const lookA = useRef(new THREE.Vector3());
  const lookB = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const wide = useRef(new THREE.Vector3());
  const segments = useMemo(() => buildSegments(stops, honorStops), [stops, honorStops]);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  useFrame((state, delta) => {
    if (!active) {
      elapsed.current = 0;
      index.current = -1;
      finished.current = false;
      introFired.current = false;
      return;
    }
    if (finished.current) return;
    const cam = state.camera as THREE.PerspectiveCamera;
    const list = segmentsRef.current;
    if (list.length === 0) {
      finished.current = true;
      onDoneRef.current();
      return;
    }
    elapsed.current += Math.min(delta, 0.05);
    if (!introFired.current) {
      introFired.current = true;
      onIntroRef.current?.();
    }
    const t = elapsed.current - INTRO;

    // Opening shot: wide aerial over the skyline, easing down onto the champion's
    // block. The title card plays over this, so the ceremony starts on a frame
    // that establishes the whole city rather than snapping to a single building.
    if (t < 0) {
      const flight = elapsed.current;
      const first = list[0];
      pose(first.slot, focusX, focusZ, 0, posB.current, lookB.current);
      const outward = Math.atan2(first.slot.x - focusX, first.slot.z - focusZ);

      // Celebration hold: hang over the skyline and let the whole display play.
      if (flight < HOLD) {
        const k = flight / HOLD;
        const eased = k * k * (3 - 2 * k);
        const orbit = HOLD_ORBIT_START + eased * 0.46;
        const radius = 360 - eased * 50;
        cam.position.set(
          focusX + Math.cos(orbit) * radius,
          280 - eased * 34,
          focusZ + Math.sin(orbit) * radius,
        );
        // Aim above the rooftops so the bursts and the skyline stay in frame; a
        // low aim point turns the hold into a dive down the street grid.
        look.current.set(focusX, 120 + eased * 12, focusZ).lerp(lookB.current, eased * 0.1);
        // A whisper of roll so the hang is not a dead-still tripod.
        cam.up.set(Math.sin(Math.sin(k * Math.PI) * 0.035), 1, 0).normalize();
        cam.lookAt(look.current);
        cam.fov = 68 - eased * 4;
        cam.updateProjectionMatrix();
        return;
      }

      // Fly-in: arc down over the roofline instead of through it.
      const k = Math.min(1, Math.max(0, (flight - HOLD) / DESCENT));
      const e = k * k * (3 - 2 * k);
      wide.current.set(
        focusX + Math.cos(HOLD_ORBIT_END) * 310,
        246,
        focusZ + Math.sin(HOLD_ORBIT_END) * 310,
      );
      posA.current.set(
        posB.current.x + Math.sin(outward) * 85,
        posB.current.y + 120,
        posB.current.z + Math.cos(outward) * 85,
      );
      const w = (1 - e) * (1 - e);
      const m = 2 * (1 - e) * e;
      const n = e * e;
      cam.position.set(
        wide.current.x * w + posA.current.x * m + posB.current.x * n,
        wide.current.y * w + posA.current.y * m + posB.current.y * n,
        wide.current.z * w + posA.current.z * m + posB.current.z * n,
      );
      cam.up.set(0, 1, 0);
      look.current.set(focusX, 34, focusZ).lerp(lookB.current, e * e);
      cam.lookAt(look.current);
      cam.fov = 64 - 14 * e;
      cam.updateProjectionMatrix();
      return;
    }

    const last = list[list.length - 1];
    const total = last.start + last.dwell;
    if (t >= total) {
      finished.current = true;
      onDoneRef.current();
      return;
    }

    let i = 0;
    while (i < list.length - 1 && t >= list[i + 1].start) i += 1;
    const seg = list[i];
    const next = list[Math.min(list.length - 1, i + 1)];
    const local = t - seg.start;
    const blendLen = Math.max(0.0001, seg.span - seg.dwell);
    const mix = Math.min(1, Math.max(0, (local - seg.dwell) / blendLen));
    const eased = mix * mix * (3 - 2 * mix);
    const dolly = Math.min(1, local / seg.dwell);
    pose(seg.slot, focusX, focusZ, dolly, posA.current, lookA.current);
    pose(next.slot, focusX, focusZ, 0, posB.current, lookB.current);
    cam.position.lerpVectors(posA.current, posB.current, eased);
    look.current.lerpVectors(lookA.current, lookB.current, eased);
    cam.lookAt(look.current);
    cam.fov = 50;
    cam.updateProjectionMatrix();
    if (i !== index.current) {
      index.current = i;
      onStepRef.current({
        index: i,
        kind: seg.kind,
        title: seg.slot.game.title,
        prizeId: seg.prizeId,
        wave: seg.wave,
        waveCount: seg.waveCount,
      });
    }
  });

  return null;
}
