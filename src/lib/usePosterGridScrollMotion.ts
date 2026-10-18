import { useEffect, useRef } from 'react';

const SCROLL_IDLE_MS = 140;

/** Pauses badge motion while scrolling; only tiles in view animate. */
export function usePosterGridScrollMotion(itemKeys: string[]) {
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

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('poster-tile--in-view', entry.isIntersecting);
        }
      },
      { root, rootMargin: '40px 0px', threshold: 0.06 },
    );

    const tiles = root.querySelectorAll('[data-poster-tile]');
    tiles.forEach((el) => {
      el.classList.remove('poster-tile--in-view');
      io.observe(el);
    });

    return () => io.disconnect();
  }, [itemKeys]);

  return scrollRef;
}
