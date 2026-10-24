import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityStreet } from '../../lib/citySpiral';
import {
  CYCLE_COLORS,
  attachGlow,
  createCycleMaterial,
  createTrailMaterial,
  paintInstanceColors,
  pushTrail,
  writeTrailMesh,
  type TrailDrawItem,
  type TrailSample,
} from './cycleTrails';

interface CityTrafficProps {
  streets: CityStreet[];
}

interface Vehicle {
  street: number;
  u: number;
  speed: number;
  dir: 1 | -1;
  lane: number;
  isScooter: boolean;
  color: THREE.Color;
  samples: TrailSample[];
}

const MAX_PER_STREET = 14;
const VEHICLE_Y = 0.78;
const TRAIL_CAP = 32;
const TRAIL_SEGS = TRAIL_CAP * 23;

function cycleColor(seed: number): THREE.Color {
  return new THREE.Color(CYCLE_COLORS[seed % CYCLE_COLORS.length]);
}

/**
 * Street traffic as neon light cycles. Counts still follow the plays on each
 * street. Trails are drawn for the cycles near the camera.
 */
export function CityTraffic({ streets }: CityTrafficProps) {
  const carRef = useRef<THREE.InstancedMesh>(null);
  const scooterRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lightDummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Matrix4(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const trailDummy = useMemo(() => new THREE.Object3D(), []);

  const vehicles = useMemo(() => {
    const list: Vehicle[] = [];
    if (streets.length === 0) return list;
    const maxPlays = Math.max(1, ...streets.map((s) => s.plays));
    streets.forEach((street, si) => {
      const density = Math.pow(street.plays / maxPlays, 0.55);
      const count = Math.round(2 + density * (MAX_PER_STREET - 2));
      for (let i = 0; i < count; i++) {
        const seed = (si * 131 + i * 977) % 1000;
        const isScooter = seed % 4 === 0;
        const dir: 1 | -1 = seed % 2 === 0 ? 1 : -1;
        list.push({
          street: si,
          u: ((i + 0.5) / count + (seed % 37) / 370) % 1,
          speed: (isScooter ? 96 : 62) + (seed % 8) * (isScooter ? 7 : 5),
          dir,
          lane: dir * (1.35 + (seed % 3) * 0.45),
          isScooter,
          color: cycleColor(seed),
          samples: [],
        });
      }
    });
    return list;
  }, [streets]);

  const cars = useMemo(() => vehicles.filter((v) => !v.isScooter), [vehicles]);
  const scooters = useMemo(() => vehicles.filter((v) => v.isScooter), [vehicles]);

  const carGeo = useMemo(() => attachGlow(new THREE.BoxGeometry(2.45, 0.46, 0.92), cars.map((v) => v.color), 3.1), [cars]);
  const scooterGeo = useMemo(
    () => attachGlow(new THREE.BoxGeometry(1.15, 0.26, 0.42), scooters.map((v) => v.color), 3.3),
    [scooters],
  );
  const lightGeo = useMemo(
    () => attachGlow(new THREE.BoxGeometry(1, 1, 1), vehicles.map((v) => v.color), 5.5),
    [vehicles],
  );
  const trailGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const carMat = useMemo(() => createCycleMaterial(), []);
  const scooterMat = useMemo(() => createCycleMaterial(), []);
  const lightMat = useMemo(() => createCycleMaterial(), []);
  const trailMat = useMemo(() => createTrailMaterial(), []);

  useLayoutEffect(() => {
    if (trailRef.current) trailRef.current.count = 0;
    paintInstanceColors(carRef.current, cars.map((v) => v.color));
    paintInstanceColors(scooterRef.current, scooters.map((v) => v.color));
    paintInstanceColors(lightRef.current, vehicles.map((v) => v.color));
  }, [cars, scooters, vehicles]);

  const near = useMemo(() => [] as { i: number; d: number }[], []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = state.clock.elapsedTime;
    const cam = state.camera.position;
    let carIdx = 0;
    let scIdx = 0;
    let lightIdx = 0;
    near.length = 0;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const street = streets[v.street];
      if (!street) continue;
      const len = Math.max(8, street.to - street.from);
      v.u += (v.speed / len) * v.dir * dt;
      if (v.u > 1) v.u -= 1;
      else if (v.u < 0) v.u += 1;

      const along = street.from + v.u * len;
      const perp = street.coord + v.lane;
      const x = street.axis === 'x' ? along : perp;
      const z = street.axis === 'x' ? perp : along;
      const dx = x - cam.x;
      const dz = z - cam.z;
      const dist = dx * dx + dz * dz;
      if (dist < 110 * 110) near.push({ i, d: dist });

      if (street.axis === 'x') {
        dummy.position.set(x, VEHICLE_Y, z);
        dummy.rotation.set(0, v.dir > 0 ? 0 : Math.PI, 0);
      } else {
        dummy.position.set(x, VEHICLE_Y, z);
        dummy.rotation.set(0, v.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      }
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      if (v.isScooter) scooterRef.current?.setMatrixAt(scIdx++, dummy.matrix);
      else carRef.current?.setMatrixAt(carIdx++, dummy.matrix);

      lightDummy.position.set(v.isScooter ? 0.62 : 1.15, 0.08, 0);
      lightDummy.rotation.set(0, 0, 0);
      lightDummy.scale.set(v.isScooter ? 0.22 : 0.34, v.isScooter ? 0.16 : 0.2, v.isScooter ? 0.28 : 0.42);
      lightDummy.updateMatrix();
      scratch.multiplyMatrices(dummy.matrix, lightDummy.matrix);
      lightRef.current?.setMatrixAt(lightIdx++, scratch);
      pushTrail(v.samples, x, VEHICLE_Y, z, now);
    }

    near.sort((a, b) => a.d - b.d);
    const draw = new Set(near.slice(0, TRAIL_CAP).map((n) => n.i));
    const items: TrailDrawItem[] = vehicles.map((v, i) => ({
      samples: v.samples,
      color: v.color,
      draw: draw.has(i),
      height: v.isScooter ? 0.7 : 1.2,
      thick: v.isScooter ? 0.12 : 0.2,
    }));
    writeTrailMesh(trailRef.current, items, now, trailDummy, tint, TRAIL_SEGS);

    const flag = (m: THREE.InstancedMesh | null, n: number) => {
      if (!m) return;
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    };
    flag(carRef.current, carIdx);
    flag(scooterRef.current, scIdx);
    flag(lightRef.current, lightIdx);
  });

  if (vehicles.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={carRef} args={[carGeo, carMat, Math.max(1, cars.length)]} frustumCulled={false} />
      <instancedMesh ref={scooterRef} args={[scooterGeo, scooterMat, Math.max(1, scooters.length)]} frustumCulled={false} />
      <instancedMesh ref={lightRef} args={[lightGeo, lightMat, Math.max(1, vehicles.length)]} frustumCulled={false} />
      <instancedMesh ref={trailRef} args={[trailGeo, trailMat, TRAIL_SEGS]} frustumCulled={false} />
    </group>
  );
}
