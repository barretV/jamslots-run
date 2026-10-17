import { formatPlays } from '../lib/formatPlays';

interface TotalPlaysChipProps {
  totalPlays: number;
  className?: string;
}

export function TotalPlaysChip({ totalPlays, className }: TotalPlaysChipProps) {
  if (totalPlays <= 0) return null;

  const label = `${formatPlays(totalPlays)} plays`;

  return (
    <span
      className={['cover-plays-chip', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      {label}
    </span>
  );
}
