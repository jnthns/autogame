import { spriteCss } from '../../data/sprites';
import type { GameState, Unit } from '../../game/types';
import { PixelSprite } from '../PixelSprite';

interface BenchProps {
  game: GameState;
  selUnit: Unit | null;
  sellValue: number;
  sellArmed: boolean;
  onTapBench: (u: Unit) => void;
  onInfo: () => void;
  onArmSell: () => void;
  onSell: () => void;
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7];

export function Bench({
  game: g,
  selUnit,
  sellValue,
  sellArmed,
  onTapBench,
  onInfo,
  onArmSell,
  onSell,
}: BenchProps) {
  const plan = g.phase === 'plan';
  return (
    <div className="om-bench">
      {SLOTS.map((i) => {
        const u = g.bench[i];
        if (!u) {
          return (
            <div key={i} className="om-slot om-slot--empty bench-slot">
              <span aria-hidden>·</span>
            </div>
          );
        }
        const sel = !!g.sel && g.sel.u === u.u;
        return (
          <button
            key={u.u}
            type="button"
            onClick={() => onTapBench(u)}
            className={`om-slot bench-slot bench-slot--filled${sel ? ' om-slot--sel board-unit--sel' : ''}`}
          >
            <PixelSprite src={spriteCss(u.hid)} />
            <span className={`om-badge-star om-badge-star--${u.star}`}>{'★'.repeat(u.star)}</span>
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      {selUnit && plan && (
        <>
          <button type="button" className="om-btn om-btn--ghost" onClick={onInfo}>
            ⓘ Info
          </button>
          <button
            type="button"
            className={`om-btn${sellArmed ? ' om-btn--danger' : ''}`}
            onClick={sellArmed ? onSell : onArmSell}
          >
            {sellArmed ? `Confirm ◈${sellValue}` : `Sell ◈${sellValue}`}
          </button>
        </>
      )}
    </div>
  );
}
