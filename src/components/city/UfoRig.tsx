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
  boost: boolean;
}

export interface SteerTarget {
  x: number;
  z: number;
  landRange: number;
}

interface UfoRigProps {
  inputRef: MutableRefObject<FlightInput>;
  steerRef: MutableRefObject<SteerTarget | null>;
  mode: 'fly' | 'landing' | 'landed';
  landTarget: { x: number; z: number; roofY: number } | null;
  landProgress: number;
  spawn: CitySpawn;
  buildings: CityBuildingSlot[];
  onPosition: (pos: THREE.Vector3, yaw: number) => void;
}

const CRUISE = 20;
const VERT_SPEED = 14;
const BOOST_MUL = 1.8;
const CAM_BACK = 24;
const CAM_UP = 7.5;
const LOOK_AHEAD = 60;
const MAX_UFO_Y = 260;
const SPARKS = 180;
const BASE_FOV = 55;

function easeYaw(current: number, target: number, dt: number): { yaw: number; rate: number } {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const step = d * Math.min(1, dt * 7);
  return { yaw: current + step, rate: step / Math.max(dt, 1e-4) };
}

export function UfoRig({
  inputRef,
  steerRef,
  mode,
  landTarget,
  landProgress,
  spawn,
  buildings,
  onPosition,
}: UfoRigProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const engineRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const yawRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));
  const velRef = useRef(new THREE.Vector3());
  const bankRef = useRef(0);
  const flyStart = useRef(new THREE.Vector3());
  const flyEnd = useRef(new THREE.Vector3());
  const bobRef = useRef(0);
  const camSnapped = useRef(false);
  const sparkCursor = useRef(0);
  const viewFwd = useMemo(() => new THREE.Vector3(), []);
  const viewRight = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const camDesired = useMemo(() => new THREE.Vector3(), []);
  const ufoWorld = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const sparkPos = useMemo(() => new Float32Array(SPARKS * 3), []);
  const sparkVel = useMemo(() => new Float32Array(SPARKS * 3), []);
  const sparkLife = useMemo(() => new Float32Array(SPARKS), []);

  const sparkGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(sparkLife, 1));
    return geo;
  }, [sparkLife, sparkPos]);

  const sparkMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color('#67e8f9') } },
        vertexShader: /* glsl */ `
          attribute float aLife;
          varying float vLife;
          void main() {
            vLife = aLife;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = max(aLife, 0.0) * 640.0 * (1.0 / max(1.0, -mv.z));
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vLife;
          uniform vec3 uColor;
          void main() {
            if (vLife < 0.03) discard;
            vec2 p = gl_PointCoord * 2.0 - 1.0;
            float d = dot(p, p);
            if (d > 1.0) discard;
            gl_FragColor = vec4(uColor, (1.0 - d) * vLife);
          }
        `,
      }),
    [],
  );

  useEffect(() => {
    posRef.current.set(spawn.x, spawn.y, spawn.z);
    yawRef.current = spawn.yaw;
    velRef.current.set(0, 0, 0);
    bankRef.current = 0;
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
  const trailMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#d8b4fe',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const engineMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e9d5ff',
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
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
    let yawRate = 0;

    if (mode !== 'fly') velRef.current.set(0, 0, 0);

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

      const manual = input.forward !== 0 || input.strafe !== 0;
      if (manual && steerRef.current) steerRef.current = null;
      const steer = steerRef.current;
      const boostMul = input.boost ? BOOST_MUL : 1;
      desired.set(0, 0, 0);

      if (steer && !manual) {
        const dx = steer.x - posRef.current.x;
        const dz = steer.z - posRef.current.z;
        const dist = Math.hypot(dx, dz);
        if (dist > steer.landRange && dist > 0.05) {
          desired.x = (dx / dist) * CRUISE * boostMul;
          desired.z = (dz / dist) * CRUISE * boostMul;
        }
        if (dist > 5) {
          const eased = easeYaw(yawRef.current, Math.atan2(dx, dz), dt);
          yawRef.current = eased.yaw;
          yawRate = eased.rate;
        }
        lookTarget.set(steer.x, Math.max(16, posRef.current.y + 10), steer.z);
      } else {
        desired.addScaledVector(viewFwd, input.forward * CRUISE * boostMul);
        desired.addScaledVector(viewRight, input.strafe * CRUISE * boostMul);
        if (manual) {
          const faceX = viewFwd.x * input.forward + viewRight.x * input.strafe;
          const faceZ = viewFwd.z * input.forward + viewRight.z * input.strafe;
          if (faceX * faceX + faceZ * faceZ > 1e-5) {
            const eased = easeYaw(yawRef.current, Math.atan2(faceX, faceZ), dt);
            yawRef.current = eased.yaw;
            yawRate = eased.rate;
          }
        }
        lookTarget.copy(posRef.current);
        lookTarget.addScaledVector(viewFwd, LOOK_AHEAD);
        lookTarget.y = Math.max(16, posRef.current.y + 10);
      }

      desired.y = input.up * VERT_SPEED;
      const respond = 1 - Math.exp(-1.15 * dt);
      velRef.current.lerp(desired, respond);
      posRef.current.addScaledVector(velRef.current, dt);
      posRef.current.y = THREE.MathUtils.clamp(posRef.current.y, MIN_UFO_Y, MAX_UFO_Y);
      pushOutOfBuildings(posRef.current, buildings, UFO_RADIUS);
      clampUfoAboveGround(posRef.current);
    }

    const bankTarget =
      mode === 'fly'
        ? -input.strafe * 0.32 * (input.boost ? 1.22 : 1) + THREE.MathUtils.clamp(-yawRate * 0.1, -0.28, 0.28)
        : 0;
    bankRef.current += (bankTarget - bankRef.current) * (1 - Math.exp(-7 * dt));

    g.position.copy(posRef.current);
    g.position.y += bob;
    g.rotation.y = yawRef.current;
    g.rotation.z = bankRef.current;
    g.rotation.x = 0;

    const horizSpeed = Math.hypot(velRef.current.x, velRef.current.z);
    const boosting = mode === 'fly' && input.boost;
    const stretch = THREE.MathUtils.clamp(horizSpeed / CRUISE, 0, 1.7);
    if (trailRef.current) {
      const length = 0.9 + stretch * (1.6 + (boosting ? 2.1 : 0));
      trailRef.current.scale.set(0.55 + (boosting ? 0.35 : 0), length, 0.55 + (boosting ? 0.35 : 0));
      trailMat.opacity = stretch * (boosting ? 0.72 : 0.28);
      trailMat.color.set(boosting ? '#f0abfc' : '#c4b5fd');
    }
    if (engineRef.current) {
      const pulse = 0.82 + Math.sin(bobRef.current * 4.2) * 0.14 + (boosting ? 0.28 : 0);
      engineRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      glowRef.current.intensity = 1.7 + Math.sin(bobRef.current * 3) * 0.35 + (boosting ? 1.15 : 0);
    }

    const banking = Math.abs(bankRef.current) > 0.1;
    if (mode === 'fly' && (boosting || banking)) {
      const burst = boosting ? 5 : 2;
      const sColor = sparkMat.uniforms.uColor.value as THREE.Color;
      sColor.set(boosting ? '#67e8f9' : '#f0abfc');
      for (let n = 0; n < burst; n++) {
        const i = sparkCursor.current;
        sparkCursor.current = (i + 1) % SPARKS;
        sparkLife[i] = 0.22 + Math.random() * 0.28;
        sparkPos[i * 3] = (Math.random() - 0.5) * 3.4;
        sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
        sparkPos[i * 3 + 2] = -3.4 - Math.random() * (boosting ? 2.4 : 1);
        sparkVel[i * 3] = (Math.random() - 0.5) * 1.6;
        sparkVel[i * 3 + 1] = (Math.random() - 0.5) * 1.3;
        sparkVel[i * 3 + 2] = -3.5 - Math.random() * (boosting ? 7 : 3);
      }
    }
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      if (sparkLife[i] <= 0) {
        sparkLife[i] = 0;
        continue;
      }
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
    }
    const posAttr = sparkGeo.getAttribute('position') as THREE.BufferAttribute;
    const lifeAttr = sparkGeo.getAttribute('aLife') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;

    const fovTarget = BASE_FOV + (boosting ? 8 : 0);
    cam.fov += (fovTarget - cam.fov) * (1 - Math.exp(-5 * dt));
    cam.updateProjectionMatrix();

    ufoWorld.copy(posRef.current);
    ufoWorld.y += bob;

    const snap = !camSnapped.current;
    chaseCameraFromUfo(ufoWorld, lookTarget, buildings, camDesired, CAM_BACK, CAM_UP);
    if (snap) cam.position.copy(camDesired);
    else cam.position.lerp(camDesired, 1 - Math.pow(0.0025, dt));
    cam.lookAt(lookTarget);
    if (snap) camSnapped.current = true;

    const w = window as typeof window & {
      __cityCam?: { x: number; y: number; z: number };
      __cityYaw?: number;
      __cityFaceYaw?: number;
      __cityFov?: number;
      __citySpeed?: number;
    };
    w.__cityCam = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    w.__cityYaw = yawRef.current;
    w.__cityFaceYaw = Math.atan2(viewFwd.x, viewFwd.z);
    w.__cityFov = cam.fov;
    w.__citySpeed = horizSpeed;

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
      <mesh ref={engineRef} position={[0, -0.42, 0]} material={engineMat}>
        <sphereGeometry args={[0.4, 12, 10]} />
      </mesh>
      <mesh ref={trailRef} position={[0, 0.2, -2.6]} rotation={[-Math.PI / 2, 0, 0]} material={trailMat}>
        <coneGeometry args={[0.55, 2.4, 12, 1, true]} />
      </mesh>
      <points geometry={sparkGeo} material={sparkMat} frustumCulled={false} />
      <pointLight ref={glowRef} position={[0, -0.9, 0]} color="#a78bfa" intensity={1.8} distance={14} decay={2} />
      <pointLight position={[0, 1.3, 0]} color="#22d3ee" intensity={0.9} distance={12} />
      <mesh position={[0, -3.4, 0]}>
        <coneGeometry args={[2.2, 6.6, 22, 1, true]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
