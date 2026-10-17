import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

const SCROLL_TAIL_PX = 20;
const BOTTOM_PAUSE_SEC = 0.25;
const RETURN_PORTION_PCT = 16;
const TOP_PAUSE_PCT = 10;

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

function crawlKeyframesName(rawId: string): string {
  return `reel-desc-crawl-${rawId.replace(/:/g, '')}`;
}

function crawlTransform(translateY: string): string {
  return `perspective(720px) rotateX(9deg) scale(0.98) translate3d(0, ${translateY}, 0)`;
}

function buildCrawlKeyframes(name: string, durationSec: number): string {
  const bottomPausePct = (BOTTOM_PAUSE_SEC / durationSec) * 100;
  const scrollDownEndPct = 100 - RETURN_PORTION_PCT - bottomPausePct;
  const bottomEndPct = scrollDownEndPct + bottomPausePct;

  const top = crawlTransform('0');
  const bottom = crawlTransform('calc(-1 * var(--reel-crawl-distance, 0px))');

  return `@keyframes ${name} {
  0%,
  ${TOP_PAUSE_PCT}% {
    transform: ${top};
  }
  ${scrollDownEndPct}% {
    transform: ${bottom};
  }
  ${bottomEndPct}% {
    transform: ${bottom};
  }
  100% {
    transform: ${top};
  }
}`;
}

export function OverflowCrawlText({
  children,
  active,
  className = '',
  'aria-hidden': ariaHidden,
}: OverflowCrawlTextProps) {
  const reducedMotion = useReducedMotion();
  const reactId = useId();
  const keyframesName = crawlKeyframesName(reactId);
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
        setCrawlDistance(extra + SCROLL_TAIL_PX);
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
        ...(shouldAnimate
          ? {
              animation: `${keyframesName} ${durationSec}s ease-in-out infinite`,
            }
          : {}),
      } as CSSProperties)
    : undefined;

  const innerClass = [
    'reel-desc-crawl-inner',
    overflows ? 'reel-desc-crawl-inner--overflow' : '',
    shouldAnimate ? 'reel-desc-crawl-inner--animating-dynamic' : '',
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

  const keyframesCss =
    overflows && durationSec > 0
      ? buildCrawlKeyframes(keyframesName, durationSec)
      : null;

  return (
    <div ref={viewportRef} className={viewportClass} aria-hidden={ariaHidden}>
      {keyframesCss ? <style>{keyframesCss}</style> : null}
      <div ref={contentRef} className={innerClass} style={crawlStyle}>
        {children}
      </div>
    </div>
  );
}
