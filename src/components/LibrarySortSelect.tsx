import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export type LibrarySortMode =
  | 'title-asc'
  | 'published-desc'
  | 'published-asc'
  | 'plays-desc'
  | 'plays-asc'
  | 'favorites-desc'
  | 'favorites-asc'
  | 'votes-desc'
  | 'votes-asc'
  | 'votes-over-plays-desc'
  | 'plays-over-votes-desc'
  | 'votes-today-desc';

const SORT_OPTIONS: { value: LibrarySortMode; label: string }[] = [
  { value: 'title-asc', label: 'A to Z' },
  { value: 'published-desc', label: 'Newest' },
  { value: 'published-asc', label: 'Oldest' },
  { value: 'plays-desc', label: 'Most plays' },
  { value: 'plays-asc', label: 'Least plays' },
  { value: 'favorites-desc', label: 'Most favorited' },
  { value: 'favorites-asc', label: 'Least favorited' },
  { value: 'votes-desc', label: 'Most votes' },
  { value: 'votes-asc', label: 'Least votes' },
  { value: 'votes-over-plays-desc', label: 'More votes than plays' },
  { value: 'plays-over-votes-desc', label: 'More plays than votes' },
  { value: 'votes-today-desc', label: 'Most new votes today' },
];

const MENU_GAP_PX = 6;
const MENU_MIN_WIDTH_PX = 216;

export function sortHintPhrase(mode: LibrarySortMode): string {
  switch (mode) {
    case 'title-asc':
      return 'A to Z';
    case 'published-desc':
      return 'newest first';
    case 'published-asc':
      return 'oldest first';
    case 'plays-desc':
      return 'most plays';
    case 'plays-asc':
      return 'least plays';
    case 'favorites-desc':
      return 'most favorited';
    case 'favorites-asc':
      return 'least favorited';
    case 'votes-desc':
      return 'most votes';
    case 'votes-asc':
      return 'least votes';
    case 'votes-over-plays-desc':
      return 'votes over plays (biggest gap first)';
    case 'plays-over-votes-desc':
      return 'plays over votes (biggest gap first)';
    case 'votes-today-desc':
      return 'most new votes today (UTC)';
  }
}

function optionLabel(mode: LibrarySortMode): string {
  return SORT_OPTIONS.find((o) => o.value === mode)?.label ?? 'Sort';
}

function menuPosition(trigger: HTMLButtonElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const top = rect.bottom + MENU_GAP_PX;
  const spaceBelow = window.innerHeight - top - 8;
  return {
    position: 'fixed',
    top,
    left: rect.left,
    width: Math.max(rect.width, MENU_MIN_WIDTH_PX),
    maxHeight: Math.max(120, Math.min(256, spaceBelow)),
    zIndex: 2000,
  };
}

interface LibrarySortSelectProps {
  value: LibrarySortMode;
  onChange: (mode: LibrarySortMode) => void;
}

/** Custom sort menu portaled below the trigger (avoids native select flipping upward). */
export function LibrarySortSelect({ value, onChange }: LibrarySortSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const reposition = () => {
    if (!triggerRef.current) return;
    setMenuStyle(menuPosition(triggerRef.current));
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => reposition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            className="library-sort-menu-list library-sort-menu-list--fixed"
            style={menuStyle}
            role="listbox"
            aria-label="Sort library"
          >
            {SORT_OPTIONS.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`library-sort-menu-option ${selected ? 'library-sort-menu-option--on' : ''}`}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="library-sort-menu">
      <button
        ref={triggerRef}
        type="button"
        id="library-sort-select"
        className="library-sort-select library-sort-menu-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((was) => !was)}
      >
        {optionLabel(value)}
      </button>
      {menu}
    </div>
  );
}
