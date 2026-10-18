import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { searchPlaces, type SearchResult } from '@/features/location/geocode';
import { userLang } from '@/data/queries';
import { cn } from '@/lib/cn';
import { locationKey } from '@/lib/geo';
import { useApp } from '@/store/app';

interface LocationSearchProps {
  autoFocus?: boolean;
  onPicked?: () => void;
  className?: string;
  placeholder?: string;
}

/** Place search as an ARIA combobox (Photon/OSM, debounced, biased towards the last known area). */
export function LocationSearch({
  autoFocus,
  onPicked,
  className,
  placeholder = 'Search a city, area or landmark',
}: LocationSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const bias = useApp((s) => s.anchor ?? s.lastOrigin);
  const setOrigin = useApp((s) => s.setOrigin);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const {
    data = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['search', debounced, bias && locationKey(bias, 0)],
    queryFn: ({ signal }) => searchPlaces(debounced, { bias, signal, lang: userLang() }),
    enabled: debounced.length >= 3,
    staleTime: 5 * 60_000,
  });

  const pick = (r: SearchResult) => {
    setOrigin({ lat: r.lat, lon: r.lon, source: 'search', label: r.name, at: Date.now() });
    setQuery('');
    setOpen(false);
    onPicked?.();
  };

  const showList = open && debounced.length >= 3;

  return (
    <div className={cn('relative', className)}>
      <div className="flex h-12 items-center gap-2.5 rounded-xl border border-line-strong bg-sunken/80 px-3.5 backdrop-blur transition-colors focus-within:border-accent-ink/60">
        <Search size={18} className="shrink-0 text-subtle" aria-hidden />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && data[active] ? `${listId}-${active}` : undefined}
          aria-label="Search for a place"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, data.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && data[active]) {
              e.preventDefault();
              pick(data[active]!);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
          autoComplete="off"
          spellCheck={false}
        />
        {isFetching ? (
          <LoaderCircle size={16} className="shrink-0 animate-spin text-subtle" aria-label="Searching" />
        ) : (
          query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="text-subtle hover:text-fg"
            >
              <X size={16} />
            </button>
          )
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-line-strong bg-surface p-1 shadow-panel"
        >
          {isError && <li className="px-3 py-3 text-sm text-muted">Search is unavailable right now.</li>}
          {!isError && !isFetching && data.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">No places found for “{debounced}”.</li>
          )}
          {data.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5',
                i === active ? 'bg-raised' : 'hover:bg-raised/60',
              )}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{r.name}</span>
                {r.detail && <span className="block truncate text-xs text-muted">{r.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
