interface PlayedTabIconProps {
  className?: string;
}

/** Progress / completed-run mark for the Played tab. */
export function PlayedTabIcon({ className }: PlayedTabIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity="0.4"
      />
      <path
        d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8.75 12.25 11 14.5l4.5-4.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
