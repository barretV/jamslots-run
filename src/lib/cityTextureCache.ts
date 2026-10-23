import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
const POSTER_PX = 512;

function squareCropDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, size: number): void {
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
}

/** Crisp 512×512 poster textures (NearestFilter, MashKin / Cthulhu-style pixel crispness). */
export function loadGameThumbnail(url: string): Promise<THREE.Texture> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = POSTER_PX;
      canvas.height = POSTER_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas 2d'));
        return;
      }
      squareCropDraw(ctx, img, POSTER_PX);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      cache.set(url, tex);
      resolve(tex);
    };
    img.onerror = () => reject(new Error(`thumbnail: ${url}`));
    img.src = url;
  });
}
