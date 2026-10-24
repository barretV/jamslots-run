import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform float uTime;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(13.7, 7.1);
      a *= 0.5;
    }
    return v;
  }
  float hash13(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float shootStar(vec3 dir) {
    float period = 7.4;
    float slot = floor(uTime / period);
    float t = fract(uTime / period);
    float window = smoothstep(0.02, 0.045, t) * (1.0 - smoothstep(0.15, 0.3, t));
    float h1 = hash13(vec3(slot, 1.7, 3.0));
    float h2 = hash13(vec3(slot, 8.2, 2.0));
    vec3 a = normalize(vec3(h1 * 2.0 - 1.0, 0.28 + h2 * 0.5, h2 * 2.0 - 1.0));
    vec3 flight = normalize(vec3(0.62, -0.2, 0.12 + h1 * 0.25));
    float travel = clamp(t / 0.28, 0.0, 1.0);
    vec3 head = normalize(a + flight * travel * 0.9);
    vec3 tail = normalize(a + flight * max(travel - 0.16, 0.0) * 0.9);
    vec3 ab = tail - head;
    float u = clamp(dot(dir - head, ab) / (dot(ab, ab) + 1e-4), 0.0, 1.0);
    float d = length(dir - normalize(head + ab * u));
    return smoothstep(0.018, 0.0, d) * window;
  }

  // A round star: one per cell, softened to a disc, with a slow twinkle.
  float stars(vec3 dir, float cellSize, float density, float speed, float phase) {
    vec3 p = dir * cellSize;
    vec3 id = floor(p);
    vec3 f = fract(p) - 0.5;
    float h = hash13(id + phase);
    float on = step(density, h);
    float disc = smoothstep(0.16, 0.0, dot(f, f));
    float tw = 0.6 + 0.4 * sin(uTime * speed + h * 60.0);
    return on * disc * tw * (0.5 + h * 0.9);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    // Deep cosmic night: dusky violet zenith falling to a magenta horizon,
    // bright enough that the top of frame never reads as a black bar.
    vec3 zenith = vec3(0.020, 0.012, 0.062);
    vec3 mid = vec3(0.055, 0.024, 0.125);
    vec3 horizon = vec3(0.078, 0.030, 0.155);
    // Matches the scene fog colour exactly, so there is no horizon seam.
    vec3 base = vec3(0.042, 0.014, 0.095);

    vec3 col = mix(mid, zenith, smoothstep(0.04, 0.78, h));
    col = mix(col, horizon, smoothstep(0.28, -0.02, h));

    // Curling nebula bands. Domain warp keeps them from reading as a flat gradient.
    vec2 drift = vec2(uTime * 0.012, -uTime * 0.009);
    vec2 curl = vec2(
      fbm(d.xz * 1.7 + d.y + drift),
      fbm(d.zy * 1.7 - drift.yx)
    );
    float n1 = fbm(d.xz * 3.1 + d.y * 2.0 + curl * 1.35 + drift);
    float n2 = fbm(d.xz * 5.2 - d.y * 1.4 + curl.yx * 1.1 - drift * 0.7);
    float n3 = fbm(d.xz * 1.6 + curl * 0.8 + 4.0);
    float breathe = 0.5 + 0.5 * sin(uTime * 0.09);
    col += vec3(0.85, 0.12, 0.55) * pow(n1, 2.4) * (0.28 + breathe * 0.16) * smoothstep(-0.15, 0.7, h);
    col += vec3(0.05, 0.72, 0.85) * pow(n2, 2.8) * (0.18 + (1.0 - breathe) * 0.12);
    col += vec3(1.0, 0.55, 0.12) * pow(n3, 3.2) * 0.2 * smoothstep(0.4, -0.02, h);

    float ribbonY = 0.22 + 0.1 * sin(d.x * 2.6 + curl.x * 2.0 + uTime * 0.11);
    float ribbon = exp(-pow((d.y - ribbonY) * 8.0, 2.0));
    vec3 ribbonCol = mix(vec3(0.1, 0.9, 0.95), vec3(1.0, 0.62, 0.12), 0.5 + 0.5 * sin(d.x * 1.8 + uTime * 0.07));
    col += ribbonCol * ribbon * 0.62 * smoothstep(-0.05, 0.2, h);

    // Warm violet city-glow bloom hugging the horizon line.
    col += vec3(0.20, 0.07, 0.30) * smoothstep(0.12, -0.06, h) * 0.32;

    // Star field: round points with a soft disc falloff and gentle twinkle,
    // faded in above the horizon.
    float up = smoothstep(-0.02, 0.42, h);
    col += vec3(0.95, 0.92, 1.0) * stars(d, 240.0, 0.988, 1.6, 0.0) * up;
    col += vec3(0.86, 0.84, 1.0) * stars(d, 420.0, 0.9955, 1.4, 17.0) * up;
    col += vec3(0.80, 0.86, 1.0) * stars(d, 620.0, 0.9975, 1.2, 41.0) * up;
    col += vec3(1.0, 0.96, 0.9) * shootStar(d) * smoothstep(0.05, 0.3, h);
    col *= mix(vec3(0.9, 0.96, 1.08), vec3(1.08, 0.98, 0.88), breathe);

    // Fade the very base of the dome into the fog colour so the skyline has no
    // hard seam where the city ends.
    float baseMix = smoothstep(0.10, -0.14, h);
    col = mix(col, base, baseMix * 0.96);

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface CitySkyProps {
  radius?: number;
}

/** Procedural purple cosmic skybox (no external textures). */
export function CitySky({ radius = 1700 }: CitySkyProps) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const moonRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    uniforms.uTime.value += dt;
    const t = uniforms.uTime.value;
    if (moonRef.current) {
      moonRef.current.position.set(Math.sin(t * 0.02) * 220 + 280, 900, Math.cos(t * 0.02) * 160 - 740);
    }
    if (ringRef.current) ringRef.current.rotation.z += dt * 0.05;
  });

  return (
    <>
      <mesh renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[radius, 48, 32]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={moonRef} position={[280, 900, -740]} renderOrder={-900}>
        <sphereGeometry args={[42, 24, 20]} />
        <meshBasicMaterial color="#f8fafc" fog={false} toneMapped={false} />
      </mesh>
      <group position={[-620, 230, -980]} renderOrder={-900}>
        <mesh>
          <sphereGeometry args={[64, 24, 20]} />
          <meshBasicMaterial color="#ddd6fe" fog={false} toneMapped={false} />
        </mesh>
        <mesh ref={ringRef} rotation={[1.15, 0.2, 0.15]}>
          <torusGeometry args={[102, 5.5, 10, 48]} />
          <meshBasicMaterial color="#67e8f9" fog={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
