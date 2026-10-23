import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { useLibraryImmersiveOverlay } from '../../lib/useLibraryImmersiveOverlay';
import type { CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { CityScene, type CityFlightMode } from './CityScene';
import type { FlightInput } from './UfoRig';

interface InteractiveCityProps {
  games: JamGame[];
  open: boolean;
  onClose: () => void;
  onOpen: (game: JamGame) => void;
  filterLabel: string;
}

const EMPTY_INPUT: FlightInput = { forward: 0, strafe: 0, up: 0 };

export function InteractiveCity({ games, open, onClose, onOpen, filterLabel }: InteractiveCityProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<FlightInput>({ ...EMPTY_INPUT });
  const keysRef = useRef<Record<string, boolean>>({});

  const [mode, setMode] = useState<CityFlightMode>('fly');
  const [nearBuilding, setNearBuilding] = useState<CityBuildingSlot | null>(null);
  const [landTarget, setLandTarget] = useState<CityBuildingSlot | null>(null);
  const [landProgress, setLandProgress] = useState(0);
  const landAnimRef = useRef<number | null>(null);

  const startLanding = useCallback((slot: CityBuildingSlot) => {
    setLandTarget(slot);
    setMode('landing');
    setLandProgress(0);
    const start = performance.now();
    const duration = 1400;
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      setLandProgress(t);
      if (t < 1) landAnimRef.current = requestAnimationFrame(step);
      else {
        setMode('landed');
        landAnimRef.current = null;
      }
    };
    landAnimRef.current = requestAnimationFrame(step);
  }, []);

  useLibraryImmersiveOverlay(open);

  const resetFlight = useCallback(() => {
    setMode('fly');
    setLandTarget(null);
    setLandProgress(0);
    setNearBuilding(null);
    if (landAnimRef.current != null) {
      cancelAnimationFrame(landAnimRef.current);
      landAnimRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resetFlight();
      return;
    }
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.code === 'Space' && mode === 'fly' && nearBuilding) {
        e.preventDefault();
        startLanding(nearBuilding);
      }
    };
    const onKeyUp = (e: {
      code: string;
    }) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open, onClose, mode, nearBuilding, resetFlight, startLanding]);

  useEffect(() => {
    if (!open || mode !== 'fly') return;
    let raf = 0;
    const tick = () => {
      const k = keysRef.current;
      inputRef.current = {
        forward: (k.KeyW ? 1 : 0) + (k.KeyS ? -1 : 0),
        strafe: (k.KeyD ? 1 : 0) + (k.KeyA ? -1 : 0),
        up: (k.KeyE ? 1 : 0) + (k.KeyQ ? -1 : 0),
      };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, mode]);

  const bumpVertical = (dir: number) => {
    if (mode !== 'fly') return;
    inputRef.current = { ...inputRef.current, up: dir };
    window.setTimeout(() => {
      inputRef.current = { ...inputRef.current, up: 0 };
    }, 120);
  };

  if (!open) return null;

  const canLand = mode === 'fly' && nearBuilding != null;
  const activeGame = mode === 'landed' ? landTarget?.game : null;

  return createPortal(
    <div className="interactive-city-modal" role="presentation">
      <button
        type="button"
        className="interactive-city-modal__backdrop"
        aria-label="Close city"
        onClick={onClose}
      />
      <div className="interactive-city-modal__panel" role="dialog" aria-modal="true" aria-labelledby="interactive-city-title">
        <header className="interactive-city-modal__header">
          <div>
            <h2 id="interactive-city-title" className="interactive-city-modal__title">Interactive City</h2>
            <p className="interactive-city-modal__subtitle">
              {games.length} buildings · {filterLabel}
            </p>
          </div>
          <button ref={closeRef} type="button" className="interactive-city-modal__close" onClick={onClose}>
            Back
          </button>
        </header>

        <div className="interactive-city-modal__canvas-wrap">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ fov: 58, near: 1, far: 420, position: [0, 42, 24] }}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.NeutralToneMapping,
              toneMappingExposure: 1.08,
            }}
          >
            <CityScene
              games={games}
              inputRef={inputRef}
              mode={mode}
              landTarget={landTarget}
              landProgress={landProgress}
              onCraftMove={() => {}}
              onNearBuilding={setNearBuilding}
            />
          </Canvas>

          <div className="interactive-city-hud">
            {mode === 'fly' ? (
              <p className="interactive-city-hud__hint">WASD move · Q down · E up</p>
            ) : mode === 'landed' ? (
              <p className="interactive-city-hud__hint">On the roof. Play or take off.</p>
            ) : (
              <p className="interactive-city-hud__hint">Landing…</p>
            )}
            {canLand ? (
              <p className="interactive-city-hud__land-prompt">Press Space to land on {nearBuilding?.game.title}</p>
            ) : null}
          </div>

          <div className="interactive-city-touch" aria-label="Flight controls">
            <button type="button" className="interactive-city-touch__btn" onPointerDown={() => bumpVertical(1)}>
              Up
            </button>
            <button type="button" className="interactive-city-touch__btn" onPointerDown={() => bumpVertical(-1)}>
              Down
            </button>
            {canLand ? (
              <button
                type="button"
                className="interactive-city-touch__btn interactive-city-touch__btn--land"
                onClick={() => nearBuilding && startLanding(nearBuilding)}
              >
                Land
              </button>
            ) : null}
          </div>

          {activeGame ? (
            <div className="interactive-city-landed">
              <h3 className="interactive-city-landed__title">{activeGame.title}</h3>
              <p className="interactive-city-landed__creator">{activeGame.creatorName}</p>
              <button type="button" className="interactive-city-landed__play" onClick={() => onOpen(activeGame)}>
                Play
              </button>
              <button type="button" className="interactive-city-landed__takeoff" onClick={resetFlight}>
                Take off
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
