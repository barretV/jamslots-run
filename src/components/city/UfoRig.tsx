import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  MIN_FOCUS_DIST_XZ,
  MIN_UFO_Y,
  cameraForwardXZ,
  cameraRightXZ,
  chaseCameraFromUfo,
  clampUfoAboveGround,
  clampUfoMinFocusDist,
  pushOutOfBuildings,
} from '../../lib/cityCamera';
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

const MOVE_SPEED = 14;
const VERT_SPEED = 10;
const CAM_BACK = 50;
const CAM_UP = 16;
const OPENING_FLIGHT_SEC = 3.2;

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
  const camSnapped = useRef(false);
  const piloting = useRef(false);
  const pilotStartRef = useRef(0);
  const viewFwd = useMemo(() => new THREE.Vector3(), []);
  const viewRight = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const camDesired = useMemo(() => new THREE.Vector3(), []);
  const ufoWorld = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    posRef.current.set(spawn.x, spawn.y, spawn.z);
    yawRef.current = spawn.yaw;
    lookRef.current.set(spawn.scenicLookX, spawn.scenicLookY, spawn.scenicLookZ);
    camSnapped.current = false;
    piloting.current = false;
    pilotStartRef.current = 0;
  }, [spawn]);

  const hullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#312e81',
        emissive: '#5b21b6',
        emissiveIntensity: 0.45,
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
        emissiveIntensity: 0.75,
        metalness: 0.15,
        roughness: 0.12,
      }),
    [],
  );
  const rimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6d28d9',
        emissive: '#8b5cf6',
        emissiveIntensity: 0.65,
        metalness: 0.5,
        roughness: 0.25,
      }),
    [],
  );

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    bobRef.current += delta * 2.2;
    const bob = Math.sin(bobRef.current) * 0.08;
    const cam = state.camera as THREE.PerspectiveCamera;
    const input = inputRef.current;
    const now = state.clock.elapsedTime;

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
      if (input.forward !== 0 || input.strafe !== 0 || input.up !== 0) {
        if (!piloting.current) pilotStartRef.current = now;
        piloting.current = true;
      }

      cameraForwardXZ(cam, viewFwd);
      cameraRightXZ(viewFwd, viewRight);

      const move = new THREE.Vector3();
      move.addScaledVector(viewFwd, input.forward * MOVE_SPEED * delta);
      move.addScaledVector(viewRight, input.strafe * MOVE_SPEED * delta);
      posRef.current.add(move);
      posRef.current.y += input.up * VERT_SPEED * delta;
      posRef.current.y = THREE.MathUtils.clamp(posRef.current.y, MIN_UFO_Y, 95);
      pushOutOfBuildings(posRef.current, buildings, 10);
      clampUfoAboveGround(posRef.current);

      const opening =
        piloting.current && pilotStartRef.current > 0 && now - pilotStartRef.current < OPENING_FLIGHT_SEC;
      if (opening) {
        clampUfoMinFocusDist(posRef.current, spawn.focusX, spawn.focusZ, MIN_FOCUS_DIST_XZ);
      }

      if (input.forward !== 0 || input.strafe !== 0) {
        const faceX = viewFwd.x * input.forward + viewRight.x * input.strafe;
        const faceZ = viewFwd.z * input.forward + viewRight.z * input.strafe;
        if (faceX * faceX + faceZ * faceZ > 1e-5) {
          yawRef.current = Math.atan2(faceX, faceZ);
        }
      }

      lookTarget.copy(lookRef.current);
    }

    g.position.copy(posRef.current);
    g.position.y += bob;
    g.rotation.y = yawRef.current;

    if (glowRef.current) {
      glowRef.current.intensity = 1.6 + Math.sin(bobRef.current * 3) * 0.25;
    }

    ufoWorld.copy(posRef.current);
    ufoWorld.y += bob;

    const snap = !camSnapped.current;
    chaseCameraFromUfo(ufoWorld, lookTarget, buildings, camDesired, CAM_BACK, CAM_UP);
    if (snap) cam.position.copy(camDesired);
    else cam.position.lerp(camDesired, 1 - Math.pow(0.00012, delta));
    cam.lookAt(lookTarget);

    if (snap) camSnapped.current = true;

    const w = window as typeof window & { __cityCam?: { x: number; y: number; z: number } };
    w.__cityCam = { x: cam.position.x, y: cam.position.y, z: cam.position.z };

    onPosition(posRef.current.clone(), yawRef.current);
  });

  return (
    <group ref={groupRef} scale={0.52}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} material={hullMat}>
        <cylinderGeometry args={[2.5, 3.1, 0.62, 24]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]} material={rimMat}>
        <torusGeometry args={[2.5, 0.12, 10, 32]} />
      </mesh>
      <mesh position={[0, 0.95, 0]} material={domeMat}>
        <sphereGeometry args={[1.15, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
      <pointLight ref={glowRef} position={[0, -0.8, 0]} color="#a78bfa" intensity={1.4} distance={18} />
      <pointLight position={[0, 1.2, 0]} color="#22d3ee" intensity={0.55} distance={10} />
    </group>
  );
}
