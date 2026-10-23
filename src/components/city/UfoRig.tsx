import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot, CitySpawn } from '../../lib/citySpiral';

export interface FlightInput {
  forward: number;
  strafe: number;
  up: number;
}

interface UfoRigProps {
  inputRef: MutableRefObject<FlightInput>;
  mode: 'fly' | 'landing' | 'landed';
  landTarget: { x: number; z: number; roofY: number } | null;
  landProgress: number;
  spawn: CitySpawn;
  buildings: CityBuildingSlot[];
  onPosition: (pos: THREE.Vector3, yaw: number) => void;
}

function pushOutOfBuildings(pos: THREE.Vector3, buildings: CityBuildingSlot[], margin: number): void {
  for (const b of buildings) {
    const hr = Math.max(b.width, b.depth) * 0.55 + margin;
    const dx = pos.x - b.x;
    const dz = pos.z - b.z;
    const d2 = dx * dx + dz * dz;
    if (d2 >= hr * hr) continue;
    const d = Math.sqrt(d2) || 0.001;
    const push = hr - d;
    pos.x += (dx / d) * push;
    pos.z += (dz / d) * push;
  }
}

const MOVE_SPEED = 16;
const VERT_SPEED = 11;
const CAM_BACK = 42;
const CAM_UP = 24;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** Horizontal unit vector where the camera is looking (W moves along this). */
function cameraForwardXZ(cam: THREE.PerspectiveCamera, out: THREE.Vector3): THREE.Vector3 {
  cam.getWorldDirection(out);
  out.y = 0;
  if (out.lengthSq() < 1e-6) return out.set(0, 0, -1);
  return out.normalize();
}

function cameraRightXZ(forward: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  return out.crossVectors(WORLD_UP, forward).normalize();
}

export function UfoRig({
  inputRef,
  mode,
  landTarget,
  landProgress,
  spawn,
  buildings,
  onPosition,
}: UfoRigProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const yawRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));
  const flyStart = useRef(new THREE.Vector3());
  const flyEnd = useRef(new THREE.Vector3());
  const bobRef = useRef(0);
  const lookRef = useRef(new THREE.Vector3(spawn.scenicLookX, spawn.scenicLookY, spawn.scenicLookZ));
  const scenicCamRef = useRef(
    new THREE.Vector3(spawn.scenicCamX, spawn.scenicCamY, spawn.scenicCamZ),
  );
  const camSnapped = useRef(false);
  const piloting = useRef(false);
  const viewFwd = useMemo(() => new THREE.Vector3(), []);
  const viewRight = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const camDesired = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    posRef.current.set(spawn.x, spawn.y, spawn.z);
    yawRef.current = spawn.yaw;
    lookRef.current.set(spawn.scenicLookX, spawn.scenicLookY, spawn.scenicLookZ);
    scenicCamRef.current.set(spawn.scenicCamX, spawn.scenicCamY, spawn.scenicCamZ);
    camSnapped.current = false;
    piloting.current = false;
  }, [spawn]);

  const hullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#312e81',
        emissive: '#7c3aed',
        emissiveIntensity: 0.55,
        metalness: 0.72,
        roughness: 0.28,
      }),
    [],
  );
  const domeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        emissive: '#67e8f9',
        emissiveIntensity: 0.85,
        metalness: 0.15,
        roughness: 0.12,
      }),
    [],
  );
  const rimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f472b6',
        emissive: '#f9a8d4',
        emissiveIntensity: 1.6,
        metalness: 0.5,
        roughness: 0.2,
      }),
    [],
  );

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    bobRef.current += delta * 2.2;
    const bob = Math.sin(bobRef.current) * 0.12;
    const cam = state.camera as THREE.PerspectiveCamera;
    const input = inputRef.current;

    if (mode === 'landing' && landTarget) {
      if (landProgress <= 0.01) {
        flyStart.current.copy(posRef.current);
        flyEnd.current.set(landTarget.x, landTarget.roofY + 3.5, landTarget.z);
      }
      const t = THREE.MathUtils.smoothstep(landProgress, 0, 1);
      posRef.current.lerpVectors(flyStart.current, flyEnd.current, t);
      lookTarget.set(landTarget.x, landTarget.roofY + 6, landTarget.z);
      piloting.current = true;
    } else if (mode === 'landed' && landTarget) {
      posRef.current.set(landTarget.x, landTarget.roofY + 3.5, landTarget.z);
      lookTarget.set(landTarget.x, landTarget.roofY + 8, landTarget.z);
    } else if (mode === 'fly') {
      if (input.forward !== 0 || input.strafe !== 0 || input.up !== 0) piloting.current = true;

      cameraForwardXZ(cam, viewFwd);
      cameraRightXZ(viewFwd, viewRight);

      const move = new THREE.Vector3();
      move.addScaledVector(viewFwd, input.forward * MOVE_SPEED * delta);
      move.addScaledVector(viewRight, input.strafe * MOVE_SPEED * delta);
      posRef.current.add(move);
      posRef.current.y += input.up * VERT_SPEED * delta;
      posRef.current.y = THREE.MathUtils.clamp(posRef.current.y, 8, 95);
      pushOutOfBuildings(posRef.current, buildings, 9);

      if (input.forward !== 0 || input.strafe !== 0) {
        const faceX = viewFwd.x * input.forward + viewRight.x * input.strafe;
        const faceZ = viewFwd.z * input.forward + viewRight.z * input.strafe;
        if (faceX * faceX + faceZ * faceZ > 1e-5) {
          yawRef.current = Math.atan2(faceX, faceZ);
        }
      }

      lookTarget.copy(posRef.current).addScaledVector(viewFwd, 48);
      lookTarget.y = THREE.MathUtils.lerp(lookRef.current.y, posRef.current.y + 6, 0.35);
    }

    g.position.copy(posRef.current);
    g.position.y += bob;
    g.rotation.y = yawRef.current;

    if (glowRef.current) {
      glowRef.current.intensity = 2.2 + Math.sin(bobRef.current * 3) * 0.4;
    }

    const ufoWorld = posRef.current.clone();
    ufoWorld.y += bob;

    const snap = !camSnapped.current;
    if (!piloting.current && mode === 'fly') {
      camDesired.copy(scenicCamRef.current);
      pushOutOfBuildings(camDesired, buildings, 18);
      if (snap) cam.position.copy(camDesired);
      else cam.position.lerp(camDesired, 1 - Math.pow(0.00012, delta));
      cam.lookAt(lookRef.current);
    } else {
      cameraForwardXZ(cam, viewFwd);
      camDesired
        .copy(ufoWorld)
        .addScaledVector(viewFwd, -CAM_BACK)
        .addScaledVector(WORLD_UP, CAM_UP);
      pushOutOfBuildings(camDesired, buildings, 16);
      camDesired.y = Math.max(camDesired.y, ufoWorld.y + 10);
      if (snap) cam.position.copy(camDesired);
      else cam.position.lerp(camDesired, 1 - Math.pow(0.00012, delta));
      cam.lookAt(lookTarget);
    }
    if (snap) camSnapped.current = true;

    onPosition(posRef.current.clone(), yawRef.current);
  });

  return (
    <group ref={groupRef} scale={0.72}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} material={hullMat}>
        <cylinderGeometry args={[2.5, 3.1, 0.62, 24]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]} material={rimMat}>
        <torusGeometry args={[2.5, 0.14, 10, 32]} />
      </mesh>
      <mesh position={[0, 0.95, 0]} material={domeMat}>
        <sphereGeometry args={[1.15, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
      <pointLight ref={glowRef} position={[0, -0.8, 0]} color="#c084fc" intensity={2.2} distance={22} />
      <pointLight position={[0, 1.2, 0]} color="#22d3ee" intensity={0.8} distance={12} />
    </group>
  );
}
