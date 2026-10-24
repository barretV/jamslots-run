import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createNeonMaterial } from '../../lib/cityNeon';
import type { CityStreet } from '../../lib/citySpiral';

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
  light: THREE.Color;
}

const CAR_COLORS = ['#22d3ee', '#f472b6', '#fbbf24', '#a78bfa', '#34d399', '#fb7185', '#f97316'];
const MAX_PER_STREET = 14;
const VEHICLE_Y = 0.74;

function glowGeometry(list: Vehicle[], pick: (v: Vehicle) => THREE.Color): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const n = Math.max(1, list.length);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < list.length; i++) {
    const c = pick(list[i]);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(arr, 3));
  return geo;
}

/**
 * Street traffic. Vehicle counts scale with the lifetime plays of the games on
 * the blocks along each street, so busy games get busy roads.
 */
export function CityTraffic({ streets }: CityTrafficProps) {
  const carRef = useRef<THREE.InstancedMesh>(null);
  const scooterRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);

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
          speed: (isScooter ? 0.055 : 0.034) + (seed % 9) * 0.0035,
          dir,
          lane: dir * (1.4 + (seed % 3) * 0.5),
          isScooter,
          color: new THREE.Color(CAR_COLORS[seed % CAR_COLORS.length]).multiplyScalar(1.05),
          light: new THREE.Color(isScooter ? '#bff7ff' : '#fff2c8').multiplyScalar(2.4),
        });
      }
    });
    return list;
  }, [streets]);

  const cars = useMemo(() => vehicles.filter((v) => !v.isScooter), [vehicles]);
  const scooters = useMemo(() => vehicles.filter((v) => v.isScooter), [vehicles]);

  const carGeo = useMemo(() => glowGeometry(cars, (v) => v.color), [cars]);
  const scooterGeo = useMemo(() => glowGeometry(scooters, (v) => v.color), [scooters]);
  const lightGeo = useMemo(() => glowGeometry(vehicles, (v) => v.light), [vehicles]);

  const carMat = useMemo(() => createNeonMaterial({ color: '#0a0a14', metalness: 0.6, roughness: 0.25 }), []);
  const scooterMat = useMemo(() => createNeonMaterial({ color: '#0a0a14', metalness: 0.5, roughness: 0.3 }), []);
  const lightMat = useMemo(() => createNeonMaterial({ color: '#050505', metalness: 0.1, roughness: 0.5 }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lightDummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Matrix4(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    let carIdx = 0;
    let scIdx = 0;
    let lightIdx = 0;

    for (const v of vehicles) {
      const street = streets[v.street];
      if (!street) continue;
      v.u += v.speed * v.dir * dt;
      if (v.u > 1) v.u -= 1;
      else if (v.u < 0) v.u += 1;

      const len = street.to - street.from;
      const along = street.from + v.u * len;
      const perp = street.coord + v.lane;

      if (street.axis === 'x') {
        dummy.position.set(along, VEHICLE_Y, perp);
        dummy.rotation.set(0, v.dir > 0 ? 0 : Math.PI, 0);
      } else {
        dummy.position.set(perp, VEHICLE_Y, along);
        dummy.rotation.set(0, v.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      }

      if (v.isScooter) {
        dummy.scale.set(1.5, 1.5, 1.5);
        dummy.updateMatrix();
        scooterRef.current?.setMatrixAt(scIdx++, dummy.matrix);
      } else {
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        carRef.current?.setMatrixAt(carIdx++, dummy.matrix);
      }

      lightDummy.position.set(1.35 * (v.isScooter ? 0.8 : 1.35), 0.12, 0);
      lightDummy.rotation.set(0, 0, 0);
      lightDummy.scale.set(0.42, 0.34, v.isScooter ? 0.5 : 1.0);
      lightDummy.updateMatrix();
      scratch.multiplyMatrices(dummy.matrix, lightDummy.matrix);
      lightRef.current?.setMatrixAt(lightIdx++, scratch);
    }

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
      <instancedMesh ref={carRef} args={[carGeo, carMat, Math.max(1, cars.length)]} frustumCulled={false}>
        <boxGeometry args={[3.0, 0.8, 1.45]} />
      </instancedMesh>
      <instancedMesh ref={scooterRef} args={[scooterGeo, scooterMat, Math.max(1, scooters.length)]} frustumCulled={false}>
        <boxGeometry args={[1.6, 0.6, 0.7]} />
      </instancedMesh>
      <instancedMesh ref={lightRef} args={[lightGeo, lightMat, Math.max(1, vehicles.length)]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}
