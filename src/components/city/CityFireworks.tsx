import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface FireworkAnchor {
  x: number;
  y: number;
  z: number;
}

const BURSTS = 18;
const PER = 64;
const COUNT = BURSTS * PER;
const LIFE = 2.7;
const FLASH = 0.45;

const PALETTE = [
  '#ffd76a',
  '#fff7d6',
  '#ff4fa3',
  '#67e8f9',
  '#e08a4f',
  '#c084fc',
  '#f8fafc',
  '#7dd3fc',
];

/**
 * 0 peony, 1 ring, 2 willow, 3 crackle. Four silhouettes read as a real display
 * instead of the same sphere firing over and over.
 */
interface BurstSim {
  age: Float32Array;
  life: Float32Array;
  kind: Uint8Array;
  origin: Float32Array;
  vel: Float32Array;
  grav: Float32Array;
  next: number;
  cursor: number;
  fired: number;
}

function spawnBurst(
  sim: BurstSim,
  index: number,
  anchor: FireworkAnchor,
  positions: Float32Array,
  lives: Float32Array,
  colors: Float32Array,
  flicker: Float32Array,
  flashLife: Float32Array,
) {
  const kind = index % 4;
  sim.origin[index * 3] = anchor.x;
  sim.origin[index * 3 + 1] = anchor.y;
  sim.origin[index * 3 + 2] = anchor.z;
  sim.age[index] = 0;
  sim.life[index] = LIFE * (kind === 2 ? 1.2 : 1);
  sim.kind[index] = kind;
  flashLife[index] = FLASH;
  const tint = new THREE.Color(PALETTE[index % PALETTE.length]);
  const inner = new THREE.Color(PALETTE[(index + 3) % PALETTE.length]);
  const mixed = tint.clone().lerp(inner, 0.35);

  // Ring bursts get a random plane so they never look stamped-on.
  const normal = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() * 0.6 + 0.4,
    Math.random() - 0.5,
  ).normalize();
  const tangent = new THREE.Vector3(1, 0, 0).cross(normal).normalize();
  const bitangent = normal.clone().cross(tangent).normalize();

  for (let p = 0; p < PER; p++) {
    const idx = index * PER + p;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    if (kind === 1) {
      const a = (p / PER) * Math.PI * 2;
      const speed = 26 + Math.random() * 7;
      const dir = tangent.clone().multiplyScalar(Math.cos(a)).addScaledVector(bitangent, Math.sin(a));
      vx = dir.x * speed;
      vy = dir.y * speed + 4;
      vz = dir.z * speed;
    } else {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const base = kind === 2 ? 15 : kind === 3 ? 34 : 20;
      const speed = base + Math.random() * (kind === 3 ? 10 : 22);
      vx = Math.sin(phi) * Math.cos(theta) * speed;
      vy = Math.abs(Math.cos(phi)) * speed * 0.92 + 6;
      vz = Math.sin(phi) * Math.sin(theta) * speed;
    }
    sim.vel[idx * 3] = vx;
    sim.vel[idx * 3 + 1] = vy;
    sim.vel[idx * 3 + 2] = vz;
    sim.grav[idx] = kind === 2 ? 15 : 11;
    positions[idx * 3] = anchor.x;
    positions[idx * 3 + 1] = anchor.y;
    positions[idx * 3 + 2] = anchor.z;
    lives[idx] = 1;
    colors[idx * 3] = mixed.r;
    colors[idx * 3 + 1] = mixed.g;
    colors[idx * 3 + 2] = mixed.b;
    // Crackle shells sparkle; the rest stay steady with a few glints.
    flicker[idx] = kind === 3 ? 0.9 : Math.random() < 0.22 ? 0.45 : 0;
  }
}

function parkBurst(index: number, positions: Float32Array, lives: Float32Array, flashLife: Float32Array) {
  for (let p = 0; p < PER; p++) {
    const idx = index * PER + p;
    positions[idx * 3 + 1] = -800;
    lives[idx] = 0;
  }
  flashLife[index] = 0;
}

function skyAnchor(focusX: number, focusZ: number, salt: number): FireworkAnchor {
  const ang = salt * 2.399 + Math.random() * 0.8;
  const rad = 26 + (salt % 5) * 34 + Math.random() * 36;
  return {
    x: focusX + Math.cos(ang) * rad,
    y: 128 + (salt % 4) * 24 + Math.random() * 30,
    z: focusZ + Math.sin(ang) * rad,
  };
}

/** Repeating sky bursts: four shell types, a hot centre flash and sparkle tails. */
export function CityFireworks({
  focusX,
  focusZ,
  spots,
}: {
  focusX: number;
  focusZ: number;
  spots: FireworkAnchor[];
}) {
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(COUNT * 3), []);
  const lives = useMemo(() => new Float32Array(COUNT), []);
  const flicker = useMemo(() => new Float32Array(COUNT), []);
  const flashPositions = useMemo(() => new Float32Array(BURSTS * 3), []);
  const flashLife = useMemo(() => new Float32Array(BURSTS), []);
  const focusRef = useRef({ x: focusX, z: focusZ });
  const spotsRef = useRef(spots);
  focusRef.current = { x: focusX, z: focusZ };
  spotsRef.current = spots;

  const sim = useRef<BurstSim | null>(null);
  if (!sim.current) {
    const next: BurstSim = {
      age: new Float32Array(BURSTS),
      life: new Float32Array(BURSTS),
      kind: new Uint8Array(BURSTS),
      origin: new Float32Array(BURSTS * 3),
      vel: new Float32Array(COUNT * 3),
      grav: new Float32Array(COUNT),
      next: 0.2,
      cursor: 10,
      fired: 0,
    };
    // Opening volley: ten shells spread across the skyline, all breaking at once
    // so the celebration starts with a full-sky curtain instead of a slow warm-up.
    for (let i = 0; i < 10; i++) {
      const ang = i * 0.628 + 0.4;
      const rad = 60 + (i % 4) * 46;
      spawnBurst(
        next,
        i,
        { x: focusX + Math.cos(ang) * rad, y: 140 + (i % 3) * 34, z: focusZ + Math.sin(ang) * rad },
        positions,
        lives,
        colors,
        flicker,
        flashLife,
      );
      next.age[i] = 0.06 + i * 0.045;
      next.fired += 1;
    }
    for (let i = 10; i < BURSTS; i++) parkBurst(i, positions, lives, flashLife);
    sim.current = next;
  }

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aLife', new THREE.BufferAttribute(lives, 1));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aFlicker', new THREE.BufferAttribute(flicker, 1));
    return g;
  }, [colors, flicker, lives, positions]);

  const flashGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(flashPositions, 3));
    g.setAttribute('aFlash', new THREE.BufferAttribute(flashLife, 1));
    return g;
  }, [flashLife, flashPositions]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms,
        vertexShader: /* glsl */ `
          attribute float aLife;
          attribute float aFlicker;
          attribute vec3 color;
          varying float vLife;
          varying float vFlicker;
          varying vec3 vColor;
          void main() {
            vLife = aLife;
            vFlicker = aFlicker;
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float dist = max(30.0, -mv.z);
            float boost = 1.0 + aFlicker * 0.5;
            gl_PointSize = clamp(aLife * 3000.0 * boost / dist, 14.0, 46.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying float vLife;
          varying float vFlicker;
          varying vec3 vColor;
          void main() {
            if (vLife < 0.03) discard;
            vec2 p = gl_PointCoord * 2.0 - 1.0;
            float d = dot(p, p);
            if (d > 1.0) discard;
            float glow = pow(1.0 - d, 1.4);
            float sparkle = 1.0 - vFlicker * (0.5 + 0.5 * sin(uTime * 38.0 + vColor.r * 47.0));
            gl_FragColor = vec4(vColor * 1.75, glow * vLife * sparkle);
          }
        `,
      }),
    [uniforms],
  );

  const flashMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: /* glsl */ `
          attribute float aFlash;
          varying float vFlash;
          void main() {
            vFlash = aFlash;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float dist = max(30.0, -mv.z);
            gl_PointSize = clamp(aFlash * 14000.0 / dist, 60.0, 460.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vFlash;
          void main() {
            if (vFlash <= 0.01) discard;
            vec2 p = gl_PointCoord * 2.0 - 1.0;
            float d = dot(p, p);
            if (d > 1.0) discard;
            float glow = pow(1.0 - d, 2.2);
            gl_FragColor = vec4(vec3(1.0, 0.94, 0.82) * 2.2, glow * vFlash);
          }
        `,
      }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = sim.current;
    if (!s) return;
    uniforms.uTime.value += dt;
    const focus = focusRef.current;
    const list = spotsRef.current;
    s.next -= dt;
    if (s.next <= 0) {
      const anchor = skyAnchor(focus.x, focus.z, s.fired + list.length + 2);
      spawnBurst(s, s.cursor, anchor, positions, lives, colors, flicker, flashLife);
      s.cursor = (s.cursor + 1) % BURSTS;
      s.fired += 1;
      // The opening minutes of the display run hot; after that it settles into a
      // swell-and-ease cadence instead of ticking like a metronome.
      s.next =
        s.fired < 18
          ? s.fired % 2 === 0
            ? 0.08
            : 0.16 + Math.random() * 0.1
          : s.fired % 3 === 0
            ? 0.1
            : 0.3 + Math.random() * 0.24;
      if (s.fired % 5 === 0 && list.length > 0) {
        const spot = list[s.fired % list.length];
        spawnBurst(
          s,
          s.cursor,
          { x: spot.x + (Math.random() - 0.5) * 6, y: spot.y + 18, z: spot.z + (Math.random() - 0.5) * 6 },
          positions,
          lives,
          colors,
          flicker,
          flashLife,
        );
        s.cursor = (s.cursor + 1) % BURSTS;
      }
    }
    for (let i = 0; i < BURSTS; i++) {
      if (s.life[i] > 0) {
        s.age[i] += dt;
        const t = s.age[i];
        if (t >= s.life[i]) {
          s.life[i] = 0;
          parkBurst(i, positions, lives, flashLife);
        } else {
          const fade = 1 - t / s.life[i];
          const ox = s.origin[i * 3];
          const oy = s.origin[i * 3 + 1];
          const oz = s.origin[i * 3 + 2];
          const kind = s.kind[i];
          for (let p = 0; p < PER; p++) {
            const idx = i * PER + p;
            const drag = 1 - t * (kind === 2 ? 0.1 : 0.24);
            positions[idx * 3] = ox + s.vel[idx * 3] * t * drag;
            positions[idx * 3 + 1] =
              oy + s.vel[idx * 3 + 1] * t * drag - s.grav[idx] * t * t;
            positions[idx * 3 + 2] = oz + s.vel[idx * 3 + 2] * t * drag;
            lives[idx] = fade * fade * 0.5 + fade * 0.5;
          }
        }
      }
      if (flashLife[i] > 0) {
        flashLife[i] = Math.max(0, flashLife[i] - dt / FLASH) * 0.98;
        flashPositions[i * 3] = s.origin[i * 3];
        flashPositions[i * 3 + 1] = s.origin[i * 3 + 1];
        flashPositions[i * 3 + 2] = s.origin[i * 3 + 2];
      }
    }
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aLife') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aFlicker') as THREE.BufferAttribute).needsUpdate = true;
    (flashGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (flashGeo.getAttribute('aFlash') as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      <points geometry={flashGeo} material={flashMat} frustumCulled={false} renderOrder={19} />
      <points geometry={geo} material={mat} frustumCulled={false} renderOrder={20} />
    </>
  );
}
