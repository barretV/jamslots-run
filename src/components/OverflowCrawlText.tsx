import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

interface OverflowCrawlTextProps {
  children: ReactNode;
  /** When false, crawl animation is paused (e.g. cover not hovered). */
  active: boolean;
  className?: string;
  'aria-hidden'?: boolean;
}

function crawlDurationSec(scrollPx: number): number {
  const scrollSec = scrollPx / 36;
  return Math.min(48, Math.max(10, scrollSec + 5));
}

export function OverflowCrawlText({
  children,
  active,
  className = '',
  'aria-hidden': ariaHidden,
}: OverflowCrawlTextProps) {
  const reducedMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [crawlDistance, setCrawlDistance] = useState(0);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      const viewH = viewport.clientHeight;
      const textH = content.scrollHeight;
      const extra = textH - viewH;
      if (extra > 2) {
        setOverflows(true);
        setCrawlDistance(extra);
      } else {
        setOverflows(false);
        setCrawlDistance(0);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(content);
    return () => ro.disconnect();
  }, [children]);

  const shouldAnimate = overflows && active && !reducedMotion;
  const durationSec = crawlDurationSec(crawlDistance);

  const crawlStyle = overflows
    ? ({
        '--reel-crawl-distance': `${crawlDistance}px`,
        '--reel-crawl-duration': `${durationSec}s`,
      } as CSSProperties)
    : undefined;

  const innerClass = [
    'reel-desc-crawl-inner',
    overflows ? 'reel-desc-crawl-inner--overflow' : '',
    shouldAnimate ? 'reel-desc-crawl-inner--animating' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const viewportClass = [
    'reel-desc-crawl-viewport',
    active ? 'reel-desc-crawl-viewport--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={viewportRef} className={viewportClass} aria-hidden={ariaHidden}>
      <div ref={contentRef} className={innerClass} style={crawlStyle}>
        {children}
      </div>
    </div>
  );
}
