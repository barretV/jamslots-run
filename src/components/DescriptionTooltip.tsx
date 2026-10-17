import { useId, useState, type ReactNode } from 'react';
import { descriptionTeaser } from '../lib/descriptionTeaser';

interface DescriptionTooltipProps {
  description: string;
  children: ReactNode;
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
      {children}
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
