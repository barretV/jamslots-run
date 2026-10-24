import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot, CityStreet } from '../../lib/citySpiral';
import {
  CYCLE_COLORS,
  attachGlow,
  createCycleMaterial,
  createTrailMaterial,
  paintInstanceColors,
  pushTrail,
  writeTrailMesh,
  type TrailSample,
} from './cycleTrails';

interface CityAirTrafficProps {
  streets: CityStreet[];
  buildings: CityBuildingSlot[];
}

interface AirCar {
  axis: 'x' | 'z';
  coord: number;
  from: number;
  to: number;
  lane: number;
  y: number;
  u: number;
  speed: number;
  dir: 1 | -1;
  color: THREE.Color;
  samples: TrailSample[];
}

const LANES = [36, 58, 82];
const COUNT = 36;
const TRAIL_SEGS = COUNT * 23;

interface Span {
  axis: 'x' | 'z';
  coord: number;
  from: number;
  to: number;
}

function downtownSpans(streets: CityStreet[], buildings: CityBuildingSlot[]): Span[] {
  const tall = buildings.filter((b) => b.height >= 78);
  const spans: Span[] = [];
  for (const street of streets) {
    const len = street.to - street.from;
    if (len < 48) continue;
    let min = Infinity;
    let max = -Infinity;
    for (let d = 0; d <= len; d += 24) {
      const along = street.from + d;
      const x = street.axis === 'x' ? along : street.coord;
      const z = street.axis === 'x' ? street.coord : along;
      let hit = false;
      for (const b of tall) {
        if (Math.abs(b.x - x) < 42 && Math.abs(b.z - z) < 42) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      min = Math.min(min, along);
      max = Math.max(max, along);
    }
    if (max - min >= 64) spans.push({ axis: street.axis, coord: street.coord, from: min, to: max });
  }
  spans.sort((a, b) => b.to - b.from - (a.to - a.from));
  return spans.slice(0, 12);
}

/** Flying neon cycles on three downtown altitude lanes. */
export function CityAirTraffic({ streets, buildings }: CityAirTrafficProps) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lightDummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Matrix4(), []);
  const trailDummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);

  const cars = useMemo(() => {
    const spans = downtownSpans(streets, buildings);
    const list: AirCar[] = [];
    if (spans.length === 0) return list;
    for (let i = 0; i < COUNT; i++) {
      const span = spans[i % spans.length];
      const lane = i % 3;
      const seed = (i * 97 + span.coord * 13) % 1000;
      list.push({
        axis: span.axis,
        coord: span.coord,
        from: span.from,
        to: span.to,
        lane: (lane - 1) * 3.1,
        y: LANES[lane],
        u: (seed % 100) / 100,
        speed: 24 + (seed % 7) * 2.4,
        dir: seed % 2 === 0 ? 1 : -1,
        color: new THREE.Color(CYCLE_COLORS[i % CYCLE_COLORS.length]),
        samples: [],
      });
    }
    return list;
  }, [buildings, streets]);

  const bodyGeo = useMemo(() => new THREE.BoxGeometry(6.2, 1.45, 2.35), []);
  const lightGeo = useMemo(() => attachGlow(new THREE.BoxGeometry(1, 1, 1), cars.map((c) => c.color), 6), [cars]);
  const trailGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bodyMat = useMemo(() => createCycleMaterial(), []);
  const lightMat = useMemo(() => createCycleMaterial(), []);
  const trailMat = useMemo(() => createTrailMaterial(), []);

  useLayoutEffect(() => {
    if (trailRef.current) trailRef.current.count = 0;
    paintInstanceColors(bodyRef.current, cars.map((c) => c.color.clone().multiplyScalar(2.4)));
    paintInstanceColors(lightRef.current, cars.map((c) => c.color.clone().multiplyScalar(3.2)));
  }, [cars]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = state.clock.elapsedTime;
    cars.forEach((car, i) => {
      const len = Math.max(16, car.to - car.from);
      car.u += (car.speed / len) * car.dir * dt;
      if (car.u > 1) car.u -= 1;
      else if (car.u < 0) car.u += 1;
      const along = car.from + car.u * len;
      const x = car.axis === 'x' ? along : car.coord + car.lane;
      const z = car.axis === 'x' ? car.coord + car.lane : along;
      if (car.axis === 'x') dummy.rotation.set(0, car.dir > 0 ? 0 : Math.PI, 0);
      else dummy.rotation.set(0, car.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      dummy.position.set(x, car.y, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bodyRef.current?.setMatrixAt(i, dummy.matrix);
      lightDummy.position.set(1.45, 0.05, 0);
      lightDummy.rotation.set(0, 0, 0);
      lightDummy.scale.set(0.42, 0.24, 0.5);
      lightDummy.updateMatrix();
      scratch.multiplyMatrices(dummy.matrix, lightDummy.matrix);
      lightRef.current?.setMatrixAt(i, scratch);
      pushTrail(car.samples, x, car.y, z, now);
    });
    if (bodyRef.current) {
      bodyRef.current.count = cars.length;
      bodyRef.current.instanceMatrix.needsUpdate = true;
    }
    if (lightRef.current) {
      lightRef.current.count = cars.length;
      lightRef.current.instanceMatrix.needsUpdate = true;
    }
    writeTrailMesh(
      trailRef.current,
      cars.map((car) => ({
        samples: car.samples,
        color: car.color,
        draw: true,
        height: 2.4,
        thick: 0.7,
      })),
      now,
      trailDummy,
      tint,
      TRAIL_SEGS,
    );
  });

  if (cars.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[bodyGeo, bodyMat, cars.length]} frustumCulled={false} />
      <instancedMesh ref={lightRef} args={[lightGeo, lightMat, cars.length]} frustumCulled={false} />
      <instancedMesh ref={trailRef} args={[trailGeo, trailMat, TRAIL_SEGS]} frustumCulled={false} />
    </group>
  );
}
