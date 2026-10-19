import { useCallback, useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button.poster-tile-open, button.poster-tile-meta';

/** Arrow keys move focus between posters; Enter activates the focused open button. */
export function usePosterGridKeyboard(
  containerRef: RefObject<HTMLElement | null>,
  itemCount: number,
  enabled: boolean,
) {
  const colsRef = useRef(2);

  useEffect(() => {
    if (!enabled || itemCount === 0) return;
    const root = containerRef.current;
    if (!root) return;

    const grid = root.querySelector('.poster-grid');
    if (!grid) return;
    const firstTile = grid.querySelector('.poster-tile');
    if (firstTile) {
      const w = firstTile.getBoundingClientRect().width;
      const gridW = grid.getBoundingClientRect().width;
      colsRef.current = Math.max(1, Math.round(gridW / w) || 2);
    }
  }, [containerRef, enabled, itemCount]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;
      const root = containerRef.current;
      if (!root) return;

      const nodes = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.closest('[hidden]'),
      );
      if (nodes.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const idx = active ? nodes.indexOf(active) : -1;

      const cols = colsRef.current;
      let next = idx;

      switch (event.key) {
        case 'ArrowRight':
          next = idx < 0 ? 0 : Math.min(nodes.length - 1, idx + 1);
          break;
        case 'ArrowLeft':
          next = idx < 0 ? 0 : Math.max(0, idx - 1);
          break;
        case 'ArrowDown':
          next = idx < 0 ? 0 : Math.min(nodes.length - 1, idx + cols);
          break;
        case 'ArrowUp':
          next = idx < 0 ? 0 : Math.max(0, idx - cols);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = nodes.length - 1;
          break;
        default:
          return;
      }

      if (next !== idx && next >= 0) {
        event.preventDefault();
        nodes[next]?.focus();
      }
    },
    [containerRef, enabled, itemCount],
  );

  return onKeyDown;
}
