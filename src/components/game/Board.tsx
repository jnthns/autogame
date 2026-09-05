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
/** Never two shakes inside this window, however many crits land. */
const SHAKE_COOLDOWN_MS = 600;
/** A foe crit only shakes the board if it actually hurt. */
const SHAKE_SHARE = 0.12;
const HIT_AGE_MS = 200;
const CRIT_AGE_MS = 280;
const CAST_AGE_MS = 400;
const HEAL_AGE_MS = 250;
/** How long a dead unit lingers before it is dropped from the board. */
const DYING_MS = 900;

interface Reaction {
  reaction: 'hit' | 'hit-crit' | null;
  flinch?: { dr: number; dc: number };
  casting: boolean;
}

/** Derive a unit's combat reaction from the FX stream — no engine changes. */
function reactionFor(u: Combatant, fx: CombatFx[], now: number): Reaction {
  let reaction: Reaction['reaction'] = null;
  let flinch: Reaction['flinch'];
  let casting = false;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    const age = now - f.t;
    if (f.kind === 'cast' && age < CAST_AGE_MS && f.fromR === u.r && f.fromC === u.c) {
      casting = true;
      continue;
    }
    if (f.kind === 'cast') continue;
    if (Math.round(f.toR) !== Math.round(u.r) || Math.round(f.toC) !== Math.round(u.c)) continue;
    if (f.kind === 'crit' ? age < CRIT_AGE_MS : age < HIT_AGE_MS) {
      if (reaction) continue;
      reaction = f.kind === 'crit' ? 'hit-crit' : 'hit';
      const px = f.kind === 'crit' ? 3 : 2;
      flinch = {
        dr: Math.sign(u.r - f.fromR) * px,
        dc: Math.sign(u.c - f.fromC) * px,
      };
    }
  }
  return { reaction, flinch, casting };
}

function healedAt(floaters: Floater[], r: number, c: number, now: number): boolean {
  return floaters.some(
    (f) =>
      f.variant === 'heal' &&
      now - f.t < HEAL_AGE_MS &&
      Math.round(f.r) === Math.round(r) &&
      Math.round(f.c) === Math.round(c),
  );
}

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
  const lastShake = useRef(0);
  const aliveLast = useRef(new Map<string, Combatant>());
  const dyingRef = useRef(new Map<string, { at: number; unit: Combatant }>());

  useEffect(() => {
    if (!combat || reduceVfx) return;
    // Only a crit shakes, and only one the player threw or one that took a real
    // bite out of its target. Anything else is noise at four hits a second.
    let worth = false;
    for (const f of combatFx) {
      if (seenFx.current.has(f.k)) continue;
      seenFx.current.add(f.k);
      if (f.kind !== 'crit') continue;
      if (f.side === 'me' || f.share >= SHAKE_SHARE) worth = true;
    }
    const now = Date.now();
    if (!worth || now - lastShake.current < SHAKE_COOLDOWN_MS) return;
    lastShake.current = now;
    setShake(true);
    const t = setTimeout(() => setShake(false), SHAKE_MS);
    return () => clearTimeout(t);
  }, [combat, combatFx, reduceVfx]);

  useEffect(() => {
    if (!combat) {
      seenFx.current.clear();
      lastShake.current = 0;
      aliveLast.current.clear();
      dyingRef.current.clear();
    }
  }, [combat]);

  const now = Date.now();
  const merged = recent(uiEvents, 'merge', (e) => e.where === 'board', 700);
  const placed = recent(uiEvents, 'place', undefined, 400);
  const living = src.filter((u) => u.alive !== false);

  // A unit that was on the board last tick and is not alive now keeps its cell
  // for DYING_MS so the death reads as a fall rather than a disappearance.
  const dying = dyingRef.current;
  living.forEach((u) => aliveLast.current.set(u.u, u));
  aliveLast.current.forEach((u, id) => {
    if (living.some((x) => x.u === id)) return;
    if (!dying.has(id)) dying.set(id, { at: now, unit: u });
    aliveLast.current.delete(id);
  });
  dying.forEach((d, id) => {
    if (now - d.at > DYING_MS) dying.delete(id);
  });
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
        const react = combat ? reactionFor(u, combatFx, now) : null;
        return (
          <BoardUnit
            key={u.u}
            unit={u}
            boardUnit={boardUnit}
            selected={selected}
            combat={combat}
            merged={merged?.u === u.u}
            placed={placed?.u === u.u}
            reaction={react?.reaction ?? null}
            flinch={react?.flinch}
            casting={react?.casting}
            healed={combat && healedAt(floaters, u.r, u.c, now)}
            lunge={combat ? getLungeTransform(combatFx, u.r, u.c) : undefined}
            onTap={() => {
              if (!boardUnit) return;
              if (!plan || u.side !== 'me' || selected) onOpenSheet(boardUnit);
              else onTapBoard(boardUnit);
            }}
          />
        );
      })}

      {combat &&
        [...dying.entries()].map(([id, d]) => (
          <div
            key={`dying-${id}`}
            className={`om-unit om-unit--dying${now - d.at > DYING_MS / 3 ? ' om-unit--dead-mark' : ''}`}
            style={{
              width: `calc(${d.unit.footprint ?? 1} * var(--cell-w))`,
              height: `calc(${d.unit.footprint ?? 1} * var(--cell-h))`,
              transform: `translate(${(d.unit.c / (d.unit.footprint ?? 1)) * 100}%, ${
                (d.unit.r / (d.unit.footprint ?? 1)) * 100
              }%)`,
            }}
            aria-hidden
          >
            <span className="om-badge-dead">✕</span>
          </div>
        ))}

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
