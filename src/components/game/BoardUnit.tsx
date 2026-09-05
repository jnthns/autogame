import {
  BOARD_CELL_HEIGHT_PCT,
  BOARD_CELL_WIDTH_PCT,
  BOSS_FOOTPRINT,
} from '../../data/constants';
import { RELIC_MAP } from '../../data/relics';
import { spriteCss } from '../../data/sprites';
import type { Combatant, Unit } from '../../game/types';
import { PixelSprite } from '../PixelSprite';

interface BoardUnitProps {
  unit: Combatant;
  /** The roster entry behind this combatant, when it is one of the player's. */
  boardUnit?: Unit;
  selected: boolean;
  combat: boolean;
  /** Just combined into this star, or just dropped onto the board. */
  merged?: boolean;
  placed?: boolean;
  /** Lunge transform from the FX layer, when this unit is swinging. */
  lunge?: string;
  onTap: () => void;
}

export function BoardUnit({
  unit: u,
  boardUnit,
  selected,
  combat,
  merged,
  placed,
  lunge,
  onTap,
}: BoardUnitProps) {
  const fp = u.footprint ?? (u.boss ? BOSS_FOOTPRINT : 1);
  const isBoss = fp > 1;
  const hpPct = Math.max(0, Math.min(1, u.hp / u.maxHp));
  const stunned = u.stun > 0 && !selected;

  const wrapClass = [
    'om-unit',
    isBoss ? 'om-unit--boss' : '',
    selected ? 'om-unit--sel' : '',
    merged ? 'om-unit--merge' : '',
    placed ? 'om-unit--placed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const bodyClass = [
    'om-unit__body',
    'board-unit',
    isBoss ? 'om-unit__body--boss' : '',
    stunned ? 'om-unit__body--stunned' : '',
    selected ? 'board-unit--sel' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={wrapClass}
      style={{
        width: `${fp * BOARD_CELL_WIDTH_PCT}%`,
        height: `${fp * BOARD_CELL_HEIGHT_PCT}%`,
        left: `${u.c * BOARD_CELL_WIDTH_PCT}%`,
        top: `${u.r * BOARD_CELL_HEIGHT_PCT}%`,
      }}
    >
      <button type="button" className={bodyClass} onClick={onTap} style={{ transform: lunge }}>
        <PixelSprite src={spriteCss(u.hid)} size={isBoss ? 132 : undefined} />
        {boardUnit && boardUnit.relics.length > 0 && (
          <span className="om-relic-strip" aria-hidden>
            {boardUnit.relics.slice(0, 3).map((rid) => {
              const rel = RELIC_MAP[rid];
              return (
                <span key={rid} className="relic-glyph" style={{ color: rel.color }}>
                  {rel.glyph}
                </span>
              );
            })}
          </span>
        )}
        <span
          className={`om-badge-star om-badge-star--${u.star}${merged ? ' om-badge-star--pop' : ''}`}
        >
          {'★'.repeat(u.star)}
        </span>
        <span className="om-bar om-bar--unit">
          <span
            className={`om-bar__fill om-bar__fill--unit-${u.side === 'me' ? 'me' : 'foe'}`}
            style={{ width: `${hpPct * 100}%` }}
          />
        </span>
        {combat && (
          <span className="om-bar om-bar--unit om-bar--unit-mana">
            <span className="om-bar__fill om-bar__fill--mana" style={{ width: `${u.mana || 0}%` }} />
          </span>
        )}
        {u.boss && <span className="om-badge-boss">BOSS</span>}
        {selected && <span className="om-badge-info">i</span>}
      </button>
    </div>
  );
}
