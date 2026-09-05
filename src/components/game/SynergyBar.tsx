import { useEffect, useRef } from 'react';
import type { ActiveTrait } from '../../game/types';

interface SynergyBarProps {
  synergies: ActiveTrait[];
  onOpenTraits: () => void;
}

function chipClass(t: ActiveTrait): string {
  if (t.lvl > 1) return t.kind === 'class' ? 'om-chip om-chip--class-tier2' : 'om-chip om-chip--tier2';
  if (t.lvl) return 'om-chip om-chip--active';
  return 'om-chip';
}

export function SynergyBar({ synergies, onOpenTraits }: SynergyBarProps) {
  // A tier that just went up gets the pop; the ref is the previous render's levels.
  const prev = useRef<Record<string, number>>({});
  const activated = new Set<string>();
  synergies.forEach((t) => {
    const key = `${t.kind}-${t.name}`;
    if (t.lvl > (prev.current[key] ?? 0)) activated.add(key);
  });
  useEffect(() => {
    const next: Record<string, number> = {};
    synergies.forEach((t) => {
      next[`${t.kind}-${t.name}`] = t.lvl;
    });
    prev.current = next;
  });

  return (
    <div className="om-synergy">
      {synergies.map((t) => (
        <button
          key={`${t.kind}-${t.name}`}
          type="button"
          className={`${chipClass(t)}${activated.has(`${t.kind}-${t.name}`) ? ' om-chip--activated' : ''}`}
          onClick={onOpenTraits}
        >
          <span className="om-chip__glyph">{t.glyph}</span>
          <span>
            {t.name} {t.count}
          </span>
        </button>
      ))}
      {synergies.length === 0 && <span className="om-label">No synergies active</span>}
    </div>
  );
}
