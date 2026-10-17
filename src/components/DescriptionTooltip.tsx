import {
  cloneElement,
  useId,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { descriptionPanelTeaser, descriptionTeaser } from '../lib/descriptionTeaser';

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
  placement?: 'above' | 'below' | 'overlay';
}

export function DescriptionTooltip({
  description,
  children,
  disabled = false,
  placement = 'above',
}: DescriptionTooltipProps) {
  const teaser =
    placement === 'overlay'
      ? descriptionPanelTeaser(description)
      : descriptionTeaser(description);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  if (!teaser || disabled) {
    return children;
  }

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  const childHandlers = {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(e);
      show();
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(e);
      hide();
    },
    'aria-describedby': open ? tooltipId : undefined,
  };

  if (placement === 'overlay') {
    return (
      <span className="absolute inset-0 z-[1]">
        {cloneElement(children, childHandlers)}
        {open && (
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end"
          >
            <span
              className="bg-gradient-to-t from-black/92 via-black/65 to-transparent px-2.5 pb-2 pt-10"
            >
              <span className="line-clamp-4 text-[1.05rem] leading-snug text-zinc-100">
                {teaser}
              </span>
            </span>
          </span>
        )}
      </span>
    );
  }

  const positionClass =
    placement === 'above'
      ? 'bottom-full mb-1.5'
      : 'top-full mt-1.5';

  return (
    <span className="relative block h-fit w-full shrink-0">
      {cloneElement(children, childHandlers)}
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
