import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

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
  spawn: { x: number; y: number; z: number; yaw?: number };
  onPosition: (pos: THREE.Vector3, yaw: number) => void;
}

const MOVE_SPEED = 16;
const VERT_SPEED = 11;
const YAW_SPEED = 1.65;

export function UfoRig({ inputRef, mode, landTarget, landProgress, spawn, onPosition }: UfoRigProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const yawRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));
  const flyStart = useRef(new THREE.Vector3());
  const flyEnd = useRef(new THREE.Vector3());
  const bobRef = useRef(0);

  useEffect(() => {
    posRef.current.set(spawn.x, spawn.y, spawn.z);
    if (spawn.yaw != null) yawRef.current = spawn.yaw;
  }, [spawn.x, spawn.y, spawn.z, spawn.yaw]);

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
        transparent: true,
        opacity: 0.88,
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
    const bob = Math.sin(bobRef.current) * 0.15;

    const input = inputRef.current;
    if (mode === 'landing' && landTarget) {
      if (landProgress <= 0.01) {
        flyStart.current.copy(posRef.current);
        flyEnd.current.set(landTarget.x, landTarget.roofY + 3.5, landTarget.z);
      }
      const t = THREE.MathUtils.smoothstep(landProgress, 0, 1);
      posRef.current.lerpVectors(flyStart.current, flyEnd.current, t);
    } else if (mode === 'landed' && landTarget) {
      posRef.current.set(landTarget.x, landTarget.roofY + 3.5, landTarget.z);
    } else if (mode === 'fly') {
      if (input.strafe !== 0) yawRef.current -= input.strafe * YAW_SPEED * delta;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
      const move = new THREE.Vector3();
      move.addScaledVector(forward, input.forward * MOVE_SPEED * delta);
      move.addScaledVector(right, input.strafe * MOVE_SPEED * delta * 0.35);
      posRef.current.add(move);
      posRef.current.y += input.up * VERT_SPEED * delta;
      posRef.current.y = THREE.MathUtils.clamp(posRef.current.y, 8, 95);
    }

    g.position.copy(posRef.current);
    g.position.y += bob;
    g.rotation.y = yawRef.current;

    if (glowRef.current) {
      glowRef.current.intensity = 2.2 + Math.sin(bobRef.current * 3) * 0.4;
    }

    const cam = state.camera;
    const camOffset = new THREE.Vector3(0, 11, 24).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
    const desired = posRef.current.clone().add(camOffset);
    cam.position.lerp(desired, 1 - Math.pow(0.00015, delta));
    const lookAt = posRef.current.clone().add(new THREE.Vector3(0, 1.5, 0));
    cam.lookAt(lookAt);

    onPosition(posRef.current.clone(), yawRef.current);
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} material={hullMat}>
        <cylinderGeometry args={[2.5, 3.1, 0.62, 24]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]} material={rimMat}>
        <torusGeometry args={[2.5, 0.14, 10, 32]} />
      </mesh>
      <mesh position={[0, 0.95, 0]} material={domeMat}>
        <sphereGeometry args={[1.15, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.6, 1.1, 16, 1, true]} />
        <meshStandardMaterial
          color="#4c1d95"
          emissive="#a855f7"
          emissiveIntensity={1.2}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight ref={glowRef} position={[0, -0.8, 0]} color="#c084fc" intensity={2.2} distance={22} />
      <pointLight position={[0, 1.2, 0]} color="#22d3ee" intensity={0.8} distance={12} />
    </group>
  );
}
