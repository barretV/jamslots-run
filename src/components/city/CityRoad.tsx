import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildInstancedMesh, createNeonMaterial, emptyBatch, neonColor } from '../../lib/cityNeon';
import type { CityStreet } from '../../lib/citySpiral';

interface CityRoadProps {
  streets: CityStreet[];
}

const ROAD_WIDTH = 5.0;
const DASH_SPACING = 8;

/** Asphalt decks, centre dashes and glowing kerb strips for the street grid. */
export function CityRoad({ streets }: CityRoadProps) {
  const group = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'city-roads';
    if (streets.length === 0) return g;

    const deck = emptyBatch();
    const dash = emptyBatch();
    const kerb = emptyBatch();

    const dummy = new THREE.Object3D();
    const dashGlow = neonColor(0.12, 0.9, 0.6, 0.7);
    const KERB_HUES = [0.52, 0.88, 0.6, 0.95, 0.45, 0.72, 0.3, 0.8];

    streets.forEach((street, si) => {
      const len = street.to - street.from;
      const mid = (street.from + street.to) / 2;
      const along = street.axis === 'x';

      // Deck
      dummy.position.set(along ? mid : street.coord, 0.06, along ? street.coord : mid);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(along ? len : ROAD_WIDTH, 0.14, along ? ROAD_WIDTH : len);
      dummy.updateMatrix();
      deck.matrices.push(dummy.matrix.clone());
      deck.colors.push(new THREE.Color('#141020'));
      deck.glows.push(new THREE.Color(0.02, 0.01, 0.05));

      // Centre dashes
      const count = Math.max(1, Math.floor(len / DASH_SPACING));
      for (let i = 0; i < count; i++) {
        const p = street.from + ((i + 0.5) / count) * len;
        dummy.position.set(along ? p : street.coord, 0.16, along ? street.coord : p);
        dummy.scale.set(along ? 3.2 : 0.42, 0.08, along ? 0.42 : 3.2);
        dummy.updateMatrix();
        dash.matrices.push(dummy.matrix.clone());
        dash.colors.push(new THREE.Color('#3a2a10'));
        dash.glows.push(dashGlow.clone().multiplyScalar(i % 2 === 0 ? 1 : 0.5));
      }

      // Kerb neon (glowing street edges)
      const glow = neonColor(KERB_HUES[si % KERB_HUES.length], 1.0, 0.55, 0.85);
      for (const side of [-1, 1]) {
        const off = street.coord + side * (ROAD_WIDTH * 0.5 - 0.25);
        dummy.position.set(along ? mid : off, 0.2, along ? off : mid);
        dummy.scale.set(along ? len : 0.34, 0.16, along ? 0.34 : len);
        dummy.updateMatrix();
        kerb.matrices.push(dummy.matrix.clone());
        kerb.colors.push(new THREE.Color('#050510'));
        kerb.glows.push(glow);
      }
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const deckMat = createNeonMaterial({
      color: '#12101f',
      metalness: 0.3,
      roughness: 0.85,
      vertexColors: true,
    });
    const dashMat = createNeonMaterial({ color: '#0a0808', metalness: 0.2, roughness: 0.6 });
    const kerbMat = createNeonMaterial({ color: '#04040c', metalness: 0.4, roughness: 0.35 });

    const meshes = [
      buildInstancedMesh(deck, boxGeo, deckMat),
      buildInstancedMesh(dash, boxGeo, dashMat),
      buildInstancedMesh(kerb, boxGeo, kerbMat),
    ];
    for (const m of meshes) if (m) g.add(m);
    boxGeo.dispose();
    return g;
  }, [streets]);

  useEffect(
    () => () => {
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
    },
    [group],
  );

  return <primitive object={group} />;
}
