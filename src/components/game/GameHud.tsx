import { useState } from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import { incomeBreakdown } from '../../data/economy';
import { isRankedMode, isGauntletMode } from '../../game/engine';
import type { GameState } from '../../game/types';
import { recent, type StampedUiEvent } from '../../game/uiEvents';

interface GameHudProps {
  game: GameState;
  boardCap: number;
  uiEvents: StampedUiEvent[];
  /** True while the result modal is held back for the bar drain. */
  pendingResult?: boolean;
  onQuit: () => void;
}

function modeLabel(g: GameState): string {
  if (g.mode === 'practice') return 'SANDBOX';
  if (isGauntletMode(g.mode)) return `GAUNTLET · R${g.round}`;
  if (g.mode === 'marathon') return `MARATHON ${g.round}/${g.matchRounds}`;
  return `ROUND ${g.round}/${g.matchRounds}`;
}

export function GameHud({ game: g, boardCap, uiEvents, pendingResult, onQuit }: GameHudProps) {
  const gauntlet = isGauntletMode(g.mode);
  const [showIncome, setShowIncome] = useState(false);
  // Previewed against the gold held right now, so banking updates it live.
  const income = incomeBreakdown(g.round + 1, g.gold, g.streak, g.lastResult?.win ?? null);
  const showChip = g.mode !== 'practice';
  const goldEvent = recent(uiEvents, 'gold', undefined, 600);
  const goldClass = goldEvent
    ? goldEvent.to > goldEvent.from
      ? ' om-hud__gold--gain'
      : ' om-hud__gold--spend'
    : '';
  const shownGold = useCountUp(g.gold, 300);
  return (
    <div className="om-hud screen-header screen-header-game">
      <div className="om-hud__row">
        <button type="button" className="om-hud__back" onClick={onQuit} aria-label="Leave match">
          <span aria-hidden>‹</span>
        </button>
        <div className="om-hud__title">{modeLabel(g)}</div>
        <div style={{ flex: 1 }} />
        <div className={`om-hud__gold${goldClass}`}>
          <span aria-hidden>◈</span>
          <span>{g.mode === 'practice' ? '∞' : shownGold}</span>
        </div>
        {showChip && (
          <button
            type="button"
            className="om-hud__income"
            onClick={() => setShowIncome((v) => !v)}
            aria-expanded={showIncome}
          >
            +{income.total}
          </button>
        )}
        <div className="om-hud__stat">
          {g.board.length}/{boardCap}
        </div>
      </div>

      {showChip && showIncome && (
        <div className="om-hud__row om-hud__income-detail">
          <span className="om-label">NEXT ROUND</span>
          <span className="mono">
            {income.base} base
            {income.win ? ` · +${income.win} win` : ''}
            {income.interest ? ` · +${income.interest} interest` : ''}
            {income.streak ? ` · +${income.streak} streak` : ''}
          </span>
        </div>
      )}

      {gauntlet && g.gauntletLives != null && (
        <div className="om-hud__row">
          <span className="om-label">LIVES</span>
          <div className="om-hud__lives">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`om-hud__life${i < g.gauntletLives! ? ' om-hud__life--full' : ''}`}
              />
            ))}
          </div>
          <span className="mono om-hud__hp-value">{g.gauntletRoundsCleared ?? 0}</span>
          <span className="om-label">cleared</span>
        </div>
      )}

      {isRankedMode(g.mode) && (
        <div className="om-hud__row">
          <div className="om-hud__hp">
            <span className="om-label">YOU</span>
            <div className="om-bar">
              <div
                className="om-bar__fill om-bar__fill--hp-me"
                style={{ width: `${(g.myHp / g.maxHp) * 100}%` }}
              />
            </div>
            <span className="om-hud__hp-value mono">{g.myHp}</span>
            {pendingResult && g.lastResult && !g.lastResult.win && g.lastResult.dmg > 0 && (
              <span className="om-hud__hit">-{g.lastResult.dmg}</span>
            )}
          </div>
          <div className="om-hud__hp">
            <span className="om-label">FOE</span>
            <div className="om-bar">
              <div
                className="om-bar__fill om-bar__fill--hp-foe"
                style={{ width: `${(g.foeHp / g.maxHp) * 100}%` }}
              />
            </div>
            <span className="om-hud__hp-value mono">{g.foeHp}</span>
            {pendingResult && g.lastResult?.win && g.lastResult.dmg > 0 && (
              <span className="om-hud__hit">-{g.lastResult.dmg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
