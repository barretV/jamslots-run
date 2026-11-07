import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  sway: number;
  phase: number;
  color: string;
  shape: 0 | 1 | 2 | 3;
  depth: number;
}

const COLORS = [
  '#ffd76a',
  '#fff3c4',
  '#ff6fb5',
  '#6fe9ff',
  '#b388ff',
  '#ffa45c',
  '#9ef7c7',
  '#ffffff',
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Falling confetti above the winners stage. Pauses for reduced-motion users. */
export function WinnersConfetti({ burstKey }: { burstKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 1;
    let height = 1;
    let pieces: Piece[] = [];
    let frame = 0;
    let last = performance.now();
    let time = 0;

    const makePiece = (initial: boolean): Piece => {
      const depth = rand(0.55, 1.35);
      const shape =
        Math.random() < 0.16
          ? 3
          : (Math.floor(Math.random() * 3) as 0 | 1 | 2);
      const color =
        shape === 3
          ? ['#ffd76a', '#fff3c4', '#ffffff'][Math.floor(Math.random() * 3)]
          : COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: rand(-36, Math.max(260, width + 36)),
        y: initial ? rand(-height * 0.6, height * 0.7) : rand(-height * 0.25, -14),
        vx: rand(-16, 16),
        vy: rand(30, 105),
        rot: rand(0, Math.PI * 2),
        spin: rand(-3.8, 3.8),
        sway: rand(12, 48),
        phase: rand(0, Math.PI * 2),
        color,
        shape,
        depth,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(320, Math.max(130, width / 5)));
      pieces = Array.from({ length: target }, () => makePiece(true));
    };

    const draw = (animate: boolean, dt: number) => {
      if (animate) time += dt;
      ctx.clearRect(0, 0, width, height);

      for (const p of pieces) {
        if (animate) {
          p.vy = Math.min(215 * p.depth, p.vy + 26 * dt);
          p.x += (p.vx + Math.sin(time * 1.1 + p.phase) * p.sway) * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          if (p.y > height + 34) Object.assign(p, makePiece(false));
          if (p.x < -44) p.x = width + 28;
          if (p.x > width + 44) p.x = -28;
        }

        const flutter = Math.cos(time * 2.3 + p.phase);
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.4 + p.depth * 0.52);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + Math.sin(time * 1.4 + p.phase) * 0.38);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        if (p.shape === 0) {
          ctx.scale(1, Math.max(0.22, Math.abs(flutter)));
          ctx.fillRect((-6 * p.depth) / 2, (-19 * p.depth) / 2, 6 * p.depth, 19 * p.depth);
        } else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, 3.8 * p.depth, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 2) {
          ctx.lineWidth = 3 * p.depth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-11 * p.depth, 0);
          ctx.bezierCurveTo(-4 * p.depth, -8 * p.depth, 4 * p.depth, 8 * p.depth, 11 * p.depth, 0);
          ctx.stroke();
        } else {
          const radius = 6.2 * p.depth;
          const inner = radius * 0.34;
          ctx.beginPath();
          for (let point = 0; point < 8; point++) {
            const angle = (point * Math.PI) / 4;
            const r = point % 2 === 0 ? radius : inner;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (point === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    };

    resize();

    if (reduced) {
      draw(false, 0);
      const observer = new ResizeObserver(() => {
        resize();
        draw(false, 0);
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      draw(true, dt);
      frame = requestAnimationFrame(loop);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    last = performance.now();
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [burstKey, reduced]);

  return <canvas className="winners-confetti" ref={canvasRef} aria-hidden="true" />;
}
