import { useEffect, useRef, useState } from 'react';
import {
  BOARD_CELL_HEIGHT_PCT,
  BOARD_CELL_WIDTH_PCT,
  BOARD_COLS,
} from '../../data/constants';
import { occupiesCell } from '../../game/engine';
import type { Combatant, CombatFx, Floater, GameState, Unit } from '../../game/types';
import { recent, type StampedUiEvent } from '../../game/uiEvents';
import { BattlegroundBoardBackground } from '../BattlegroundBoardBackground';
import { CombatFxLayer, getLungeTransform } from '../CombatFxLayer';
import { BoardUnit } from './BoardUnit';
import { CellGrid } from './CellGrid';

interface BoardProps {
  game: GameState;
  src: Combatant[];
  combatFx: CombatFx[];
  floaters: Floater[];
  banner: string;
  uiEvents: StampedUiEvent[];
  /** Plan-phase banner under the top edge: the boss name, the final call, … */
  planBanner: { text: string; tone: 'boss' | 'final' } | null;
  battlegroundId: string;
  reduceVfx?: boolean;
  onTapCell: (r: number, c: number) => void;
  onTapBoard: (u: Unit) => void;
  onOpenSheet: (u: Unit) => void;
}

const SHAKE_MS = 400;

export function Board({
  game: g,
  src,
  combatFx,
  floaters,
  banner,
  uiEvents,
  planBanner,
  battlegroundId,
  reduceVfx,
  onTapCell,
  onTapBoard,
  onOpenSheet,
}: BoardProps) {
  const combat = g.phase === 'combat';
  const plan = g.phase === 'plan';
  const [shake, setShake] = useState(false);
  const seenFx = useRef(new Set<string>());

  useEffect(() => {
    if (!combat || reduceVfx) return;
    let hit = false;
    for (const f of combatFx) {
      if (seenFx.current.has(f.k)) continue;
      seenFx.current.add(f.k);
      if (f.kind === 'crit') hit = true;
    }
    if (!hit) return;
    setShake(true);
    const t = setTimeout(() => setShake(false), SHAKE_MS);
    return () => clearTimeout(t);
  }, [combat, combatFx, reduceVfx]);

  useEffect(() => {
    if (!combat) seenFx.current.clear();
  }, [combat]);

  const merged = recent(uiEvents, 'merge', (e) => e.where === 'board', 700);
  const placed = recent(uiEvents, 'place', undefined, 400);
  const living = src.filter((u) => u.alive !== false);
  const occupiedKey = living
    .flatMap((u) => {
      const cells: number[] = [];
      for (let i = 0; i < 72; i++) {
        const r = Math.floor(i / BOARD_COLS);
        const c = i % BOARD_COLS;
        if (occupiesCell(u, r, c)) cells.push(i);
      }
      return cells;
    })
    .sort((a, b) => a - b)
    .join(',');

  return (
    <div className={`game-board${shake ? ' game-board--shake' : ''}`}>
      <BattlegroundBoardBackground id={battlegroundId} />
      <CellGrid selKey={g.sel?.u ?? ''} occupiedKey={occupiedKey} plan={plan} onTapCell={onTapCell} />
      <div className="om-board__divider" />

      {living.map((u) => {
        const boardUnit = g.board.find((x) => x.u === u.u);
        const selected = !!g.sel && g.sel.u === u.u;
        return (
          <BoardUnit
            key={u.u}
            unit={u}
            boardUnit={boardUnit}
            selected={selected}
            combat={combat}
            merged={merged?.u === u.u}
            placed={placed?.u === u.u}
            lunge={combat ? getLungeTransform(combatFx, u.r, u.c) : undefined}
            onTap={() => {
              if (!boardUnit) return;
              if (!plan || u.side !== 'me' || selected) onOpenSheet(boardUnit);
              else onTapBoard(boardUnit);
            }}
          />
        );
      })}

      {combat && !reduceVfx && <CombatFxLayer fx={combatFx} />}

      {floaters.map((f) => (
        <div
          key={f.k}
          className={`mono damage-floater damage-floater--${f.variant}`}
          style={{
            left: `calc(${f.c * BOARD_CELL_WIDTH_PCT}% + ${f.jitter * BOARD_CELL_WIDTH_PCT}%)`,
            top: `${f.r * BOARD_CELL_HEIGHT_PCT}%`,
            width: `${BOARD_CELL_WIDTH_PCT}%`,
            fontSize: f.size,
            color: f.color,
          }}
        >
          {f.text}
        </div>
      ))}

      {banner && (
        <div className="om-board__banner">
          <span className="om-stamp">{banner}</span>
        </div>
      )}
      {!banner && planBanner && (
        <div className="om-board__banner">
          <span className={`om-stamp om-stamp--${planBanner.tone}`}>{planBanner.text}</span>
        </div>
      )}
    </div>
  );
}
