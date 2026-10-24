import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { useLibraryImmersiveOverlay } from '../../lib/useLibraryImmersiveOverlay';
import { buildCityLayout, computeCitySpawn, type CityBuildingSlot } from '../../lib/citySpiral';
import type { JamGame } from '../../types';
import { CityScene, type CityFlightMode } from './CityScene';
import { type FlightInput, type SteerTarget } from './UfoRig';

interface InteractiveCityProps {
  games: JamGame[];
  open: boolean;
  onClose: () => void;
  onOpen: (game: JamGame) => void;
  filterLabel: string;
  isFavorite?: (gameId: string) => boolean;
}

const EMPTY_INPUT: FlightInput = { forward: 0, strafe: 0, up: 0, boost: false };
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const TO_PLAY = new Set(['KeyW', 'KeyA', 'ArrowUp', 'ArrowLeft']);
const TO_TAKEOFF = new Set(['KeyS', 'KeyD', 'ArrowDown', 'ArrowRight']);

export function InteractiveCity({ games, open, onClose, onOpen, filterLabel, isFavorite }: InteractiveCityProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<FlightInput>({ ...EMPTY_INPUT });
  const steerRef = useRef<SteerTarget | null>(null);
  const tickRef = useRef<HTMLSpanElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});

  const [mode, setMode] = useState<CityFlightMode>('fly');
  const [nearBuilding, setNearBuilding] = useState<CityBuildingSlot | null>(null);
  const [steerId, setSteerId] = useState<string | null>(null);
  const [landChoice, setLandChoice] = useState<'play' | 'takeoff'>('play');
  const modeRef = useRef(mode);
  const nearBuildingRef = useRef(nearBuilding);
  const landChoiceRef = useRef(landChoice);
  const landTargetRef = useRef<CityBuildingSlot | null>(null);
  modeRef.current = mode;
  nearBuildingRef.current = nearBuilding;
  landChoiceRef.current = landChoice;
  const [landTarget, setLandTarget] = useState<CityBuildingSlot | null>(null);
  const [landProgress, setLandProgress] = useState(0);
  landTargetRef.current = landTarget;
  const landAnimRef = useRef<number | null>(null);
  const layout = useMemo(() => buildCityLayout(games), [games]);
  const citySpawn = useMemo(() => computeCitySpawn(layout.buildings), [layout]);
  const favSlots = useMemo(
    () => (isFavorite ? layout.buildings.filter((b) => isFavorite(b.game.gameId)) : []),
    [isFavorite, layout],
  );
  const quality = useMemo<'low' | 'high'>(() => {
    if (typeof window === 'undefined') return 'high';
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const fine = window.matchMedia('(any-pointer: fine)').matches;
    return coarse && !fine ? 'low' : 'high';
  }, []);

  const startLanding = useCallback((slot: CityBuildingSlot) => {
    steerRef.current = null;
    setSteerId(null);
    setLandChoice('play');
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
        setLandChoice('play');
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
    setLandChoice('play');
    if (landAnimRef.current != null) {
      cancelAnimationFrame(landAnimRef.current);
      landAnimRef.current = null;
    }
  }, []);

  const activateLanded = useCallback(() => {
    const game = landTargetRef.current?.game;
    if (landChoiceRef.current === 'play' && game) onOpen(game);
    else resetFlight();
  }, [onOpen, resetFlight]);

  useEffect(() => {
    if (!open) {
      resetFlight();
      return;
    }
    canvasWrapRef.current?.focus({ preventScroll: true });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.repeat) return;
      keysRef.current[e.code] = true;
      if (MOVE_KEYS.has(e.code) || e.code === 'Space' || e.code === 'KeyQ' || e.code === 'KeyE') e.preventDefault();
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (modeRef.current === 'landed') {
        if (TO_PLAY.has(e.code)) {
          e.preventDefault();
          setLandChoice('play');
        } else if (TO_TAKEOFF.has(e.code)) {
          e.preventDefault();
          setLandChoice('takeoff');
        } else if (e.code === 'Space') {
          e.preventDefault();
          activateLanded();
        }
        return;
      }
      if (modeRef.current === 'fly' && MOVE_KEYS.has(e.code) && steerRef.current) {
        steerRef.current = null;
        setSteerId(null);
      }
      if (e.code === 'Space' && modeRef.current === 'fly' && nearBuildingRef.current) {
        e.preventDefault();
        startLanding(nearBuildingRef.current);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      keysRef.current = {};
    };
  }, [activateLanded, open, onClose, resetFlight, startLanding]);

  useEffect(() => {
    if (!open || mode !== 'fly') return;
    let raf = 0;
    const tick = () => {
      const k = keysRef.current;
      inputRef.current = {
        forward: (k.KeyW || k.ArrowUp ? 1 : 0) + (k.KeyS || k.ArrowDown ? -1 : 0),
        strafe: (k.KeyD || k.ArrowRight ? 1 : 0) + (k.KeyA || k.ArrowLeft ? -1 : 0),
        up: (k.KeyE ? 1 : 0) + (k.KeyQ ? -1 : 0),
        boost: !!(k.ShiftLeft || k.ShiftRight),
      };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const loop = () => {
      const el = tickRef.current;
      const steer = steerRef.current;
      const w = window as typeof window & { __cityCraft?: { x: number; z: number }; __cityYaw?: number };
      if (el && steer && w.__cityCraft) {
        const dx = steer.x - w.__cityCraft.x;
        const dz = steer.z - w.__cityCraft.z;
        let rel = Math.atan2(dx, dz) - (w.__cityYaw ?? 0);
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        el.style.transform = `translateX(${Math.sin(rel) * 46}px)`;
        el.style.opacity = '1';
      } else if (el) {
        el.style.opacity = '0';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const aimAt = (slot: CityBuildingSlot) => {
    steerRef.current = {
      x: slot.x,
      z: slot.z,
      landRange: Math.max(14, slot.width * 1.8),
    };
    setSteerId(slot.game.gameId);
    canvasWrapRef.current?.focus({ preventScroll: true });
  };

  const bumpVertical = (dir: number) => {
    if (mode !== 'fly') return;
    inputRef.current = { ...inputRef.current, up: dir };
    window.setTimeout(() => {
      inputRef.current = { ...inputRef.current, up: 0 };
    }, 120);
  };

  const onWrapKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (MOVE_KEYS.has(e.code) || e.code === 'Space') e.preventDefault();
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

        <div
          ref={canvasWrapRef}
          className="interactive-city-modal__canvas-wrap"
          tabIndex={-1}
          onPointerDown={() => {
            canvasWrapRef.current?.focus({ preventScroll: true });
          }}
          onKeyDown={onWrapKeyDown}
        >
          <Canvas
            dpr={[1, 1.6]}
            camera={{
              fov: 55,
              near: 1,
              far: 4000,
              position: [citySpawn.scenicCamX, citySpawn.scenicCamY, citySpawn.scenicCamZ],
            }}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.NeutralToneMapping,
              toneMappingExposure: 0.85,
            }}
          >
            <CityScene
              games={games}
              inputRef={inputRef}
              steerRef={steerRef}
              mode={mode}
              landTarget={landTarget}
              landProgress={landProgress}
              quality={quality}
              isFavorite={isFavorite}
              onCraftMove={(pos) => {
                const w = window as typeof window & {
                  __cityCraft?: { x: number; y: number; z: number };
                };
                w.__cityCraft = { x: pos.x, y: pos.y, z: pos.z };
              }}
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

          {favSlots.length > 0 ? (
            <div className="interactive-city-favs">
              <div className="interactive-city-compass" aria-hidden="true">
                <span ref={tickRef} className="interactive-city-compass__tick" />
              </div>
              <p className="interactive-city-favs__label">Favorites</p>
              <div className="interactive-city-favs__list">
                {favSlots.map((slot) => (
                  <button
                    key={slot.game.gameId}
                    type="button"
                    className={steerId === slot.game.gameId ? 'is-active' : undefined}
                    onClick={() => aimAt(slot)}
                  >
                    {slot.game.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
              <button
                type="button"
                className={`interactive-city-landed__play${landChoice === 'play' ? ' is-selected' : ''}`}
                onPointerDown={() => setLandChoice('play')}
                onClick={() => onOpen(activeGame)}
              >
                Play
              </button>
              <button
                type="button"
                className={`interactive-city-landed__takeoff${landChoice === 'takeoff' ? ' is-selected' : ''}`}
                onPointerDown={() => setLandChoice('takeoff')}
                onClick={() => {
                  setLandChoice('takeoff');
                  resetFlight();
                }}
              >
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
