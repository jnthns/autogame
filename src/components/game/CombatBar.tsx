interface CombatBarProps {
  speed: number;
  hint?: string;
  onToggleSpeed: () => void;
}

export function CombatBar({ speed, hint, onToggleSpeed }: CombatBarProps) {
  return (
    <div className="om-combat-bar">
      <span className="om-combat-bar__pulse">COMBAT</span>
      <span className="om-combat-bar__hint">{hint || 'Creatures act on their own.'}</span>
      <button type="button" className="om-btn om-btn--sm mono" onClick={onToggleSpeed}>
        ×{speed}
      </button>
    </div>
  );
}
