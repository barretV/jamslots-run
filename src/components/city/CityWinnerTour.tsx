import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { TOUR_PRIZE_IDS, resolveOctoberPrizes } from '../../lib/octoberWinners';
import type { CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { billboardCenterY } from './CityBuildings';

export interface TourStop {
  slot: CityBuildingSlot;
  prizeId: string;
}

export interface TourStep {
  index: number;
  title: string;
  prizeId: string;
}

const DWELL = 3.25;
const BLEND = 0.55;
/** Establishing shot: high and wide over the city, settling onto the first winner. */
const INTRO = 2.7;

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

/** Moves the camera across a few winner covers, then hands back to flight. */
export function CityWinnerTour({
  stops,
  focusX,
  focusZ,
  active,
  onStep,
  onDone,
  onIntro,
}: {
  stops: TourStop[];
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
    if (stops.length === 0) {
      finished.current = true;
      onDoneRef.current();
      return;
    }
    elapsed.current += Math.min(delta, 0.05);
    if (!introFired.current) {
      introFired.current = true;
      onIntroRef.current?.();
    }
    const span = DWELL + BLEND;
    const t = elapsed.current - INTRO;

    // Opening shot: wide aerial over the skyline, easing down onto the champion's
    // block. The title card plays over this, so the ceremony starts on a frame
    // that establishes the whole city rather than snapping to a single building.
    if (t < 0) {
      const k = Math.min(1, Math.max(0, elapsed.current / INTRO));
      const e = k * k * (3 - 2 * k);
      const first = stops[0];
      pose(first.slot, focusX, focusZ, 0, posB.current, lookB.current);
      wide.current.set(focusX + 250, 250, focusZ + 250);
      cam.position.lerpVectors(wide.current, posB.current, e);
      look.current.set(focusX, 34, focusZ).lerp(lookB.current, e);
      cam.lookAt(look.current);
      cam.fov = 66 - 16 * e;
      cam.updateProjectionMatrix();
      return;
    }

    const total = stops.length * span - BLEND;
    if (t >= total) {
      finished.current = true;
      onDoneRef.current();
      return;
    }
    const cursor = t / span;
    const i = Math.min(stops.length - 1, Math.floor(cursor));
    const local = cursor - i;
    const mix = local < DWELL / span ? 0 : (local - DWELL / span) / (BLEND / span);
    const eased = mix * mix * (3 - 2 * mix);
    const dolly = Math.min(1, (t - i * span) / DWELL);
    const a = stops[i];
    const b = stops[Math.min(stops.length - 1, i + 1)];
    pose(a.slot, focusX, focusZ, dolly, posA.current, lookA.current);
    pose(b.slot, focusX, focusZ, 0, posB.current, lookB.current);
    cam.position.lerpVectors(posA.current, posB.current, eased);
    look.current.lerpVectors(lookA.current, lookB.current, eased);
    cam.lookAt(look.current);
    cam.fov = 50;
    cam.updateProjectionMatrix();
    if (i !== index.current) {
      index.current = i;
      onStepRef.current({ index: i, title: a.slot.game.title, prizeId: a.prizeId });
    }
  });

  return null;
}
