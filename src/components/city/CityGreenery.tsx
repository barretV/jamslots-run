import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot } from '../../lib/citySpiral';

const MAX_PROPS = 220;

const FLOWER_HUES = [0.38, 0.55, 0.82, 0.12, 0.68];

function flowerColor(seed: number): THREE.Color {
  const h = FLOWER_HUES[seed % FLOWER_HUES.length];
  const c = new THREE.Color();
  c.setHSL(h, 0.78, 0.58);
  return c;
}

function planterColor(seed: number): THREE.Color {
  const c = new THREE.Color();
  c.setHSL(0.08 + (seed % 5) * 0.02, 0.45, 0.22);
  return c;
}

interface CityGreeneryProps {
  buildings: CityBuildingSlot[];
}

/** Street planters + rooftop garden voxels (MakeitRainonDemGrows-style chunky flora, no imported assets). */
export function CityGreenery({ buildings }: CityGreeneryProps) {
  const planterRef = useRef<THREE.InstancedMesh>(null);
  const bloomRef = useRef<THREE.InstancedMesh>(null);
  const antennaRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const planterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1c1410',
        emissive: '#3d2817',
        emissiveIntensity: 0.35,
        metalness: 0.2,
        roughness: 0.72,
        vertexColors: true,
      }),
    [],
  );
  const bloomMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#a78bfa',
        emissiveIntensity: 0.85,
        metalness: 0.15,
        roughness: 0.4,
        vertexColors: true,
      }),
    [],
  );
  const antennaMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#312e81',
        emissive: '#e879f9',
        emissiveIntensity: 1.4,
        metalness: 0.55,
        roughness: 0.25,
      }),
    [],
  );

  useEffect(() => {
    const planters = planterRef.current;
    const blooms = bloomRef.current;
    const antennas = antennaRef.current;
    if (!planters || !blooms) return;

    let pi = 0;
    let bi = 0;
    let ai = 0;

    for (let i = 0; i < buildings.length && pi < MAX_PROPS; i++) {
      const b = buildings[i];
      const seed = b.seed;
      const cos = Math.cos(b.faceYaw);
      const sin = Math.sin(b.faceYaw);
      const corner = b.width * 0.42;
      const offsets = [
        { lx: corner, lz: b.depth * 0.35 },
        { lx: -corner * 0.7, lz: b.depth * 0.28 },
      ];

      for (let o = 0; o < offsets.length && pi < MAX_PROPS; o++) {
        const { lx, lz } = offsets[o];
        const wx = b.x + lx * cos - lz * sin;
        const wz = b.z + lx * sin + lz * cos;
        dummy.position.set(wx, 0.35, wz);
        dummy.scale.set(0.85, 0.7, 0.85);
        dummy.rotation.y = b.faceYaw + (seed % 4) * 0.2;
        dummy.updateMatrix();
        planters.setMatrixAt(pi, dummy.matrix);
        planters.setColorAt(pi, planterColor(seed + o));
        pi++;

        dummy.position.set(wx, 0.95 + (seed % 3) * 0.12, wz);
        dummy.scale.set(0.55, 0.55, 0.55);
        dummy.updateMatrix();
        blooms.setMatrixAt(bi, dummy.matrix);
        blooms.setColorAt(bi, flowerColor(seed + bi));
        bi++;
        if (bi >= MAX_PROPS) break;
      }

      if (b.topVotes && antennas && ai < 48) {
        dummy.position.set(b.x, b.height + 3.2, b.z);
        dummy.scale.set(0.22, 4.5 + (seed % 5), 0.22);
        dummy.rotation.y = b.faceYaw;
        dummy.updateMatrix();
        antennas.setMatrixAt(ai, dummy.matrix);
        ai++;
      }

      if ((b.topToday || b.topVotes) && bi < MAX_PROPS) {
        dummy.position.set(b.x, b.height + 1.1, b.z);
        dummy.scale.set(
          Math.min(2.2, b.width * 0.42),
          0.38,
          Math.min(2.2, b.depth * 0.42),
        );
        dummy.rotation.y = b.faceYaw;
        dummy.updateMatrix();
        blooms.setMatrixAt(bi, dummy.matrix);
        blooms.setColorAt(bi, flowerColor(seed + 11));
        bi++;
      }
    }

    planters.count = pi;
    planters.instanceMatrix.needsUpdate = true;
    if (planters.instanceColor) planters.instanceColor.needsUpdate = true;
    blooms.count = bi;
    blooms.instanceMatrix.needsUpdate = true;
    if (blooms.instanceColor) blooms.instanceColor.needsUpdate = true;
    if (antennas) {
      antennas.count = ai;
      antennas.instanceMatrix.needsUpdate = true;
    }
  }, [buildings, dummy]);

  return (
    <group>
      <instancedMesh ref={planterRef} args={[undefined, planterMat, MAX_PROPS]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={bloomRef} args={[undefined, bloomMat, MAX_PROPS]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={antennaRef} args={[undefined, antennaMat, 48]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}
