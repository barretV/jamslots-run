import { useEffect } from 'react';

/** Fullscreen library overlays: hide the entire app shell; only portaled UI stays visible. */
export function useLibraryImmersiveOverlay(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.body.classList.add('library-immersive-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('library-immersive-open');
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [active]);
}
