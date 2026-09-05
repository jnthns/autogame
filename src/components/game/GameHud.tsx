import { isRankedMode, isGauntletMode } from '../../game/engine';
import type { GameState } from '../../game/types';

interface GameHudProps {
  game: GameState;
  boardCap: number;
  onQuit: () => void;
}

function modeLabel(g: GameState): string {
  if (g.mode === 'practice') return 'SANDBOX';
  if (isGauntletMode(g.mode)) return `GAUNTLET · R${g.round}`;
  if (g.mode === 'marathon') return `MARATHON ${g.round}/${g.matchRounds}`;
  return `ROUND ${g.round}/${g.matchRounds}`;
}

export function GameHud({ game: g, boardCap, onQuit }: GameHudProps) {
  const gauntlet = isGauntletMode(g.mode);
  return (
    <div className="om-hud screen-header screen-header-game">
      <div className="om-hud__row">
        <button type="button" className="om-hud__back" onClick={onQuit} aria-label="Leave match">
          <span aria-hidden>‹</span>
        </button>
        <div className="om-hud__title">{modeLabel(g)}</div>
        <div style={{ flex: 1 }} />
        <div className="om-hud__gold">
          <span aria-hidden>◈</span>
          <span>{g.mode === 'practice' ? '∞' : g.gold}</span>
        </div>
        <div className="om-hud__stat">
          {g.board.length}/{boardCap}
        </div>
      </div>

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
          </div>
        </div>
      )}
    </div>
  );
}
