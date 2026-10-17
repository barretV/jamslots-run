import {
  cloneElement,
  useId,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { descriptionTeaser } from '../lib/descriptionTeaser';

interface DescriptionTooltipProps {
  description: string;
  children: ReactElement<{
    onFocus?: (e: FocusEvent<HTMLElement>) => void;
    onBlur?: (e: FocusEvent<HTMLElement>) => void;
    onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
    'aria-describedby'?: string;
  }>;
  disabled?: boolean;
  placement?: 'above' | 'below';
}

export function DescriptionTooltip({
  description,
  children,
  disabled = false,
  placement = 'below',
}: DescriptionTooltipProps) {
  const teaser = descriptionTeaser(description);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  if (!teaser || disabled) {
    return children;
  }

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  const positionClass =
    placement === 'above'
      ? 'bottom-full mb-1.5'
      : 'top-full mt-1.5';

  return (
    <span
      className="relative block min-w-0"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {cloneElement(children, {
        onFocus: (e: FocusEvent<HTMLElement>) => {
          children.props.onFocus?.(e);
          show();
        },
        onBlur: (e: FocusEvent<HTMLElement>) => {
          children.props.onBlur?.(e);
          hide();
        },
        'aria-describedby': open ? tooltipId : undefined,
      })}
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute left-0 right-0 z-30 ${positionClass} rounded-lg border border-violet-400/35 bg-zinc-900/95 px-3 py-2 text-[1.1rem] leading-snug text-zinc-100 shadow-lg backdrop-blur-sm`}
        >
          {teaser}
        </span>
      )}
    </span>
  );
}
