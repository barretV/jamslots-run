import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPos;
varying float vSeed;
attribute float aSeed;

void main() {
  vUv = uv;
  vSeed = aSeed;
  #ifdef USE_INSTANCING
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    vec4 world = modelMatrix * vec4(position, 1.0);
  #endif
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying vec3 vWorldPos;
varying float vSeed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 grid = vWorldPos.xz * (0.35 + fract(vSeed * 0.013) * 0.15);
  vec2 cell = fract(grid) - 0.5;
  float window = step(0.18, abs(cell.x)) * step(0.22, abs(cell.y));
  float flicker = 0.65 + 0.35 * sin(uTime * (2.0 + fract(vSeed * 0.01) * 3.0) + vSeed);
  vec3 c1 = vec3(0.45, 0.12, 0.95);
  vec3 c2 = vec3(0.05, 0.85, 0.95);
  vec3 c3 = vec3(0.98, 0.55, 0.12);
  float pick = hash(floor(grid) + vSeed);
  vec3 neon = mix(c1, c2, step(0.55, pick));
  neon = mix(neon, c3, step(0.82, pick));
  vec3 base = vec3(0.04, 0.03, 0.08);
  vec3 col = mix(base, neon * flicker, window);
  float fog = smoothstep(uFogNear, uFogFar, length(vWorldPos.xz));
  col = mix(col, uFogColor, fog * 0.85);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createBuildingWindowMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color('#050510') },
      uFogNear: { value: 55 },
      uFogFar: { value: 220 },
    },
    vertexShader,
    fragmentShader,
  });
  mat.defines = { USE_INSTANCING: '' };
  return mat;
}
