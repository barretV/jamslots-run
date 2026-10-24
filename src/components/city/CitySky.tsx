import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
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

    // Drifting nebula wisps (magenta + cyan + a rose band near the base).
    vec2 drift = vec2(uTime * 0.0045, -uTime * 0.0035);
    float n1 = fbm(d.xz * 3.1 + d.y * 2.0 + drift);
    float n2 = fbm(d.xz * 5.8 - d.y * 1.4 - drift * 0.7);
    float n3 = fbm(d.xz * 1.7 + 4.0);
    col += vec3(0.42, 0.09, 0.72) * pow(n1, 2.8) * 0.42 * smoothstep(-0.2, 0.7, h);
    col += vec3(0.05, 0.28, 0.66) * pow(n2, 3.2) * 0.24;
    col += vec3(0.62, 0.15, 0.46) * pow(n3, 3.8) * 0.20 * smoothstep(0.32, -0.05, h);

    // Warm violet city-glow bloom hugging the horizon line.
    col += vec3(0.20, 0.07, 0.30) * smoothstep(0.12, -0.06, h) * 0.32;

    // Star field: round points with a soft disc falloff and gentle twinkle,
    // faded in above the horizon.
    float up = smoothstep(-0.02, 0.42, h);
    col += vec3(0.95, 0.92, 1.0) * stars(d, 240.0, 0.988, 1.6, 0.0) * up;
    col += vec3(0.86, 0.84, 1.0) * stars(d, 420.0, 0.9955, 1.4, 17.0) * up;
    col += vec3(0.80, 0.86, 1.0) * stars(d, 620.0, 0.9975, 1.2, 41.0) * up;

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

  useFrame((_, delta) => {
    uniforms.uTime.value += Math.min(delta, 0.1);
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
    </>
  );
}
