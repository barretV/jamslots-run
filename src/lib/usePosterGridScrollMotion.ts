import { useEffect, useRef } from 'react';

const SCROLL_IDLE_MS = 140;

/** Pauses heavy poster chrome while the grid is scrolling. */
export function usePosterGridScrollMotion() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    let scrollEndTimer = 0;
    const onScroll = () => {
      root.classList.add('poster-grid-scroll--scrolling');
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        root.classList.remove('poster-grid-scroll--scrolling');
      }, SCROLL_IDLE_MS);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      window.clearTimeout(scrollEndTimer);
      root.classList.remove('poster-grid-scroll--scrolling');
    };
  }, []);

  return scrollRef;
}
