import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  MIN_UFO_Y,
  UFO_RADIUS,
  cameraForwardXZ,
  cameraRightXZ,
  chaseCameraFromUfo,
  clampUfoAboveGround,
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

const MOVE_SPEED = 20;
const VERT_SPEED = 14;
const CAM_BACK = 24;
const CAM_UP = 7.5;
const LOOK_AHEAD = 60;
const MAX_UFO_Y = 260;

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
  const viewFwd = useMemo(() => new THREE.Vector3(), []);
  const viewRight = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const camDesired = useMemo(() => new THREE.Vector3(), []);
  const ufoWorld = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    posRef.current.set(spawn.x, spawn.y, spawn.z);
    yawRef.current = spawn.yaw;
    lookRef.current.set(spawn.scenicLookX, spawn.scenicLookY, spawn.scenicLookZ);
    camSnapped.current = false;
  }, [spawn]);

  const hullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2b2160',
        emissive: '#4c1d95',
        emissiveIntensity: 0.5,
        metalness: 0.85,
        roughness: 0.22,
      }),
    [],
  );
  const domeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        emissive: '#67e8f9',
        emissiveIntensity: 0.9,
        metalness: 0.15,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
      }),
    [],
  );
  const rimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6d28d9',
        emissive: '#a855f7',
        emissiveIntensity: 1.1,
        metalness: 0.5,
        roughness: 0.25,
      }),
    [],
  );
  const lightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0b0b18',
        emissive: '#f0abfc',
        emissiveIntensity: 2.2,
        metalness: 0.2,
        roughness: 0.3,
      }),
    [],
  );

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const dt = Math.min(delta, 0.05);
    bobRef.current += dt * 2.1;
    const bob = Math.sin(bobRef.current) * 0.1;
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
    } else if (mode === 'landed' && landTarget) {
      posRef.current.set(landTarget.x, landTarget.roofY + 3.5, landTarget.z);
      lookTarget.set(landTarget.x, landTarget.roofY + 8, landTarget.z);
    } else if (mode === 'fly') {
      cameraForwardXZ(cam, viewFwd);
      cameraRightXZ(viewFwd, viewRight);

      move.set(0, 0, 0);
      move.addScaledVector(viewFwd, input.forward * MOVE_SPEED * dt);
      move.addScaledVector(viewRight, input.strafe * MOVE_SPEED * dt);
      posRef.current.add(move);
      posRef.current.y += input.up * VERT_SPEED * dt;
      posRef.current.y = THREE.MathUtils.clamp(posRef.current.y, MIN_UFO_Y, MAX_UFO_Y);
      pushOutOfBuildings(posRef.current, buildings, UFO_RADIUS);
      clampUfoAboveGround(posRef.current);

      if (input.forward !== 0 || input.strafe !== 0) {
        const faceX = viewFwd.x * input.forward + viewRight.x * input.strafe;
        const faceZ = viewFwd.z * input.forward + viewRight.z * input.strafe;
        if (faceX * faceX + faceZ * faceZ > 1e-5) {
          const targetYaw = Math.atan2(faceX, faceZ);
          let d = targetYaw - yawRef.current;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          yawRef.current += d * Math.min(1, dt * 7);
        }
      }

      lookTarget.copy(posRef.current);
      lookTarget.addScaledVector(viewFwd, LOOK_AHEAD);
      // Keep the view roughly level so towers rise through the frame instead of
      // being flattened into a rooftop carpet.
      lookTarget.y = Math.max(16, posRef.current.y + 10);
    }

    g.position.copy(posRef.current);
    g.position.y += bob;
    g.rotation.y = yawRef.current;

    if (glowRef.current) {
      glowRef.current.intensity = 2.4 + Math.sin(bobRef.current * 3) * 0.4;
    }

    ufoWorld.copy(posRef.current);
    ufoWorld.y += bob;

    const snap = !camSnapped.current;
    chaseCameraFromUfo(ufoWorld, lookTarget, buildings, camDesired, CAM_BACK, CAM_UP);
    if (snap) cam.position.copy(camDesired);
    else cam.position.lerp(camDesired, 1 - Math.pow(0.0025, dt));
    cam.lookAt(lookTarget);

    if (snap) camSnapped.current = true;

    const w = window as typeof window & { __cityCam?: { x: number; y: number; z: number } };
    w.__cityCam = { x: cam.position.x, y: cam.position.y, z: cam.position.z };

    onPosition(posRef.current.clone(), yawRef.current);
  });

  const portholes = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ x: Math.sin(a) * 2.7, z: Math.cos(a) * 2.7 });
    }
    return out;
  }, []);

  return (
    <group ref={groupRef} scale={1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} material={hullMat}>
        <cylinderGeometry args={[2.5, 3.1, 0.62, 24]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]} material={rimMat}>
        <torusGeometry args={[2.55, 0.14, 12, 36]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} material={domeMat}>
        <sphereGeometry args={[1.15, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
      {portholes.map((p, i) => (
        <mesh key={i} position={[p.x, 0.18, p.z]} material={lightMat}>
          <boxGeometry args={[0.34, 0.18, 0.34]} />
        </mesh>
      ))}
      <pointLight ref={glowRef} position={[0, -0.9, 0]} color="#a78bfa" intensity={2.4} distance={26} decay={1.6} />
      <pointLight position={[0, 1.3, 0]} color="#22d3ee" intensity={0.9} distance={14} />
      {/* Soft under-beam */}
      <mesh position={[0, -3.4, 0]}>
        <coneGeometry args={[2.2, 6.6, 22, 1, true]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
