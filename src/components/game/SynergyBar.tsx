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
  return (
    <div className="om-synergy">
      {synergies.map((t) => (
        <button key={`${t.kind}-${t.name}`} type="button" className={chipClass(t)} onClick={onOpenTraits}>
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
