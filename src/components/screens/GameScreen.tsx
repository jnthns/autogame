import { useEffect, useRef, useState } from 'react';
import { BONE, INK, JADE, MATCH_DEFAULTS, RUST, SAF, STARMUL, BOARD_CELL_COUNT, BOARD_CELL_HEIGHT_PCT, BOARD_CELL_WIDTH_PCT, BOARD_COLS, BOARD_ROWS, BOSS_FOOTPRINT, PLAYER_ROW_START } from '../../data/constants';
import { BATTLEGROUND_MAP } from '../../data/battlegrounds';
import { attackLabel, HERO_MAP } from '../../data/heroes';
import { RELIC_MAP } from '../../data/relics';
import { spriteCss } from '../../data/sprites';
import { activeSynergies, applyTraits, classCard, classCounts, combatant, fitBossToTeam, isGauntletMode, isRankedMode, occupiesCell, sellValue, traitCard, traitCounts } from '../../game/engine';
import { getGauntletEncounter, makeGauntletBossUnits, boardPower } from '../../game/gauntlet';
import { getBossEncounter, isBossRound, makeBossUnits, periodInfo, rewardLines, shopPrice } from '../../game/hyperRoll';
import type { Combatant, CombatFx, Floater, GameState, OverlayKind, SheetState } from '../../game/types';
import { BattlegroundBoardBackground } from '../BattlegroundBoardBackground';
import { BattlegroundPreview } from '../BattlegroundPreview';
import { CombatFxLayer, getLungeTransform } from '../CombatFxLayer';
import { PixelSprite } from '../PixelSprite';

interface GameScreenProps {
  game: GameState;
  combatants: Combatant[] | null;
  combatFx: CombatFx[];
  floaters: Floater[];
  banner: string;
  boardCap: number;
  battlegroundId: string;
  reduceVfx?: boolean;
  onQuit: () => void;
  onTapCell: (r: number, c: number) => void;
  onTapBench: (u: GameState['bench'][0]) => void;
  onTapBoard: (u: GameState['board'][0]) => void;
  onBuy: (i: number) => void;
  onReroll: () => void;
  onStartCombat: () => void;
  onSell: () => void;
  onInfo: () => void;
  onToggleSpeed: () => void;
  onOpenTraits: () => void;
  onOpenSheet: (u: GameState['board'][0]) => void;
}

export function GameScreen({
  game: g,
  combatants,
  combatFx,
  floaters,
  banner,
  boardCap,
  battlegroundId,
  reduceVfx,
  onQuit,
  onTapCell,
  onTapBench,
  onTapBoard,
  onBuy,
  onReroll,
  onStartCombat,
  onSell,
  onInfo,
  onToggleSpeed,
  onOpenTraits,
  onOpenSheet,
}: GameScreenProps) {
  const plan = g.phase === 'plan';
  const combat = g.phase === 'combat';
  const gauntlet = isGauntletMode(g.mode);
  const period = periodInfo(g.round, g.matchRounds);
  const foePreview =
    !combat && (isRankedMode(g.mode) || gauntlet)
      ? gauntlet
        ? makeGauntletBossUnits(g.round, boardPower(g.board))
        : (g.mode === 'bot' || g.mode === 'marathon') && isBossRound(g.round, g.matchRounds)
          ? makeBossUnits(g.round, g.matchRounds)
          : g.foe
      : [];
  const src: Combatant[] =
    combatants ??
    (() => {
      const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
      const theirs = foePreview.map((u) => combatant(u, 'foe', g.heroHpMul));
      applyTraits(mine);
      applyTraits(theirs);
      if (theirs.some((u) => u.boss)) {
        fitBossToTeam(theirs, mine, g.round, { gauntlet });
      }
      return mine.concat(theirs);
    })();

  const [sellArmed, setSellArmed] = useState(false);
  const [boardShake, setBoardShake] = useState(false);
  const seenFx = useRef(new Set<string>());
  useEffect(() => {
    setSellArmed(false);
  }, [g.sel?.u]);

  useEffect(() => {
    if (!combat || reduceVfx) return;
    let shake = false;
    for (const f of combatFx) {
      if (seenFx.current.has(f.k)) continue;
      seenFx.current.add(f.k);
      if (f.kind === 'crit') shake = true;
    }
    if (!shake) return;
    setBoardShake(true);
    const t = setTimeout(() => setBoardShake(false), 400);
    return () => clearTimeout(t);
  }, [combat, combatFx, reduceVfx]);

  useEffect(() => {
    if (!combat) seenFx.current.clear();
  }, [combat]);

  const selUnit = g.sel
    ? (g.sel.from === 'bench' ? g.bench : g.board).find((x) => x.u === g.sel!.u)
    : null;
  const sv = selUnit ? sellValue(selUnit) : 0;
  const shown = activeSynergies(g.board.map((u) => u.hid)).filter((t) => t.count >= 1);
  const rerollCost = MATCH_DEFAULTS.rerollCost;
  const canReroll = g.mode === 'practice' || g.freeRerolls > 0 || g.gold >= rerollCost;
  const rerollLabel =
    g.mode === 'practice' ? 'FREE ROLL' : g.freeRerolls > 0 ? `FREE ROLL ×${g.freeRerolls}` : `ROLL ◈${rerollCost}`;
  const fightLabel =
    g.mode === 'practice'
      ? 'SPAR'
        : gauntlet
        ? 'FIGHT BOSS'
        : period.isBoss
          ? 'FIGHT BOSS'
          : period.isFinal
            ? 'FINAL FIGHT'
            : 'FIGHT';

  return (
    <div className="game-root" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="screen-header screen-header-game" style={{ borderBottom: '3px solid var(--om-ink)', background: INK, color: BONE }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={onQuit}
            style={{
              width: 24,
              height: 24,
              border: '2px solid var(--om-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: BONE,
              flexShrink: 0,
            }}
          >
            ‹
          </button>
          <div className="slab" style={{ fontSize: 13, letterSpacing: '0.02em', color: SAF, whiteSpace: 'nowrap' }}>
            {g.mode === 'practice'
              ? 'SANDBOX'
              : gauntlet
                ? `GAUNTLET · R${g.round}`
                : g.mode === 'marathon'
                  ? `MARATHON ${g.round}/${g.matchRounds}`
                  : `ROUND ${g.round}/${g.matchRounds}`}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '2px solid var(--om-saffron)', padding: '1px 6px' }}>
            <span style={{ color: SAF, fontSize: 11 }}>◈</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: SAF }}>
              {g.mode === 'practice' ? '∞' : g.gold}
            </span>
          </div>
          <div className="mono" style={{ border: '2px solid var(--om-muted)', padding: '1px 6px', fontWeight: 700, fontSize: 11 }}>
            {g.board.length}/{boardCap}
          </div>
        </div>
        {gauntlet && g.gauntletLives != null && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--om-muted-2)' }}>
              LIVES
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid var(--om-saffron)',
                    background: i < g.gauntletLives! ? JADE : 'var(--om-hud-line)',
                  }}
                />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 10, marginLeft: 4 }}>
              {g.gauntletRoundsCleared ?? 0} cleared
            </span>
          </div>
        )}
        {isRankedMode(g.mode) && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--om-muted-2)', flexShrink: 0 }}>
                YOU
              </span>
              <div style={{ flex: 1, height: 8, border: `1px solid ${BONE}`, background: 'var(--om-hud-line)', position: 'relative', minWidth: 0 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${(g.myHp / g.maxHp) * 100}%`,
                    background: JADE,
                    transition: 'width 0.4s',
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: 10, width: 22, textAlign: 'right', flexShrink: 0 }}>
                {g.myHp}
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--om-muted-2)', flexShrink: 0 }}>
                FOE
              </span>
              <div style={{ flex: 1, height: 8, border: `1px solid ${BONE}`, background: 'var(--om-hud-line)', position: 'relative', minWidth: 0 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${(g.foeHp / g.maxHp) * 100}%`,
                    background: RUST,
                    transition: 'width 0.4s',
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: 10, width: 22, textAlign: 'right', flexShrink: 0 }}>
                {g.foeHp}
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        className="synergy-bar"
        style={{
          display: 'flex',
          gap: 4,
          padding: '4px 10px',
          borderBottom: '2px solid var(--om-ink)',
          overflowX: 'auto',
          minHeight: 28,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {shown.map((t) => (
          <button
            key={`${t.kind}-${t.name}`}
            type="button"
            onClick={onOpenTraits}
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: '2px solid var(--om-ink)',
              padding: '2px 6px',
              background: t.lvl > 1 ? (t.kind === 'class' ? 'var(--om-sky)' : SAF) : t.lvl ? INK : 'var(--om-card)',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: t.lvl ? (t.lvl > 1 ? (t.kind === 'class' ? BONE : INK) : BONE) : 'var(--om-muted-2)',
              }}
            >
              {t.glyph}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: t.lvl ? (t.lvl > 1 ? (t.kind === 'class' ? BONE : INK) : BONE) : 'var(--om-muted-2)',
              }}
            >
              {t.name} {t.count}
            </span>
          </button>
        ))}
        {shown.length === 0 && (
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--om-muted-2)' }}>
            No synergies active
          </span>
        )}
      </div>

      <div className={`game-board${boardShake ? ' game-board--shake' : ''}`}>
        <BattlegroundBoardBackground id={battlegroundId} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${BOARD_COLS},1fr)`,
            gridTemplateRows: `repeat(${BOARD_ROWS},1fr)`,
          }}
        >
          {Array.from({ length: BOARD_CELL_COUNT }, (_, i) => {
            const r = Math.floor(i / BOARD_COLS);
            const c = i % BOARD_COLS;
            const mine = r >= PLAYER_ROW_START;
            const occupied = src.some((u) => u.alive !== false && occupiesCell(u, r, c));
            return (
              <button
                key={i}
                type="button"
                onClick={() => onTapCell(r, c)}
                style={{
                  borderRight: '1px solid rgba(20,18,14,.22)',
                  borderBottom: '1px solid rgba(20,18,14,.22)',
                  background: mine
                    ? g.sel && !occupied
                      ? 'rgba(232,163,23,.24)'
                      : 'rgba(27,107,82,.12)'
                    : 'rgba(180,68,43,.12)',
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 3,
            background: INK,
            opacity: 0.55,
            pointerEvents: 'none',
          }}
        />
        {src
          .filter((u) => u.alive !== false)
          .map((u) => {
            const me = u.side === 'me';
            const sel = g.sel && g.sel.u === u.u;
            const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
            const boardUnit = g.board.find((x) => x.u === u.u);
            const lunge = combat ? getLungeTransform(combatFx, u.r, u.c) : undefined;
            const fp = u.footprint ?? (u.boss ? BOSS_FOOTPRINT : 1);
            const isBoss = fp > 1;
            return (
              <div
                key={u.u}
                style={{
                  position: 'absolute',
                  width: `${fp * BOARD_CELL_WIDTH_PCT}%`,
                  height: `${fp * BOARD_CELL_HEIGHT_PCT}%`,
                  left: `${u.c * BOARD_CELL_WIDTH_PCT}%`,
                  top: `${u.r * BOARD_CELL_HEIGHT_PCT}%`,
                  transition: 'left 0.3s, top 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: sel ? 20 : isBoss ? 15 : 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!plan || !me) {
                      if (boardUnit) onOpenSheet(boardUnit);
                      return;
                    }
                    if (boardUnit) {
                      if (sel) onOpenSheet(boardUnit);
                      else onTapBoard(boardUnit);
                    }
                  }}
                  className={`board-unit${sel ? ' board-unit--sel' : ''}`}
                  style={{
                    position: 'relative',
                    width: isBoss ? '100%' : undefined,
                    height: isBoss ? '100%' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                    transform: lunge,
                    transition: lunge ? 'transform 0.07s ease-out' : undefined,
                    boxShadow: u.stun > 0 && !sel ? '0 0 0 2px var(--om-sky)' : undefined,
                  }}
                >
                  <PixelSprite src={spriteCss(u.hid)} size={isBoss ? 132 : undefined} />
                  {boardUnit && boardUnit.relics.length > 0 && (
                    <span className="relic-strip" aria-hidden>
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
                    style={{
                      position: 'absolute',
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: '-0.5px',
                      color: INK,
                      background: u.star === 3 ? SAF : u.star === 2 ? BONE : 'var(--om-disabled)',
                      border: '1px solid var(--om-ink)',
                      padding: '0 3px',
                      lineHeight: '11px',
                    }}
                  >
                    {'★'.repeat(u.star)}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      left: -2,
                      right: -2,
                      bottom: -7,
                      height: 5,
                      background: INK,
                      border: '1px solid var(--om-ink)',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${pct * 100}%`,
                        background: me ? JADE : 'var(--om-ember)',
                      }}
                    />
                  </span>
                  {combat && (
                    <span
                      style={{
                        position: 'absolute',
                        left: -2,
                        right: -2,
                        bottom: -13,
                        height: 4,
                        background: INK,
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          height: '100%',
                          width: `${u.mana || 0}%`,
                          background: 'var(--om-sky)',
                        }}
                      />
                    </span>
                  )}
                  {u.boss && (
                    <span
                      className="slab"
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: 7,
                        letterSpacing: '0.08em',
                        background: SAF,
                        color: INK,
                        border: '1px solid var(--om-ink)',
                        padding: '0 3px',
                        lineHeight: '10px',
                      }}
                    >
                      BOSS
                    </span>
                  )}
                  {sel && (
                    <span
                      className="slab"
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: -12,
                        background: SAF,
                        border: '2px solid var(--om-ink)',
                        width: 19,
                        height: 19,
                        fontWeight: 700,
                        fontSize: 12,
                        lineHeight: '15px',
                        textAlign: 'center',
                      }}
                    >
                      i
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        {combat && !reduceVfx && <CombatFxLayer fx={combatFx} />}
        {floaters.map((f) => {
          const anim =
            f.variant === 'crit'
              ? 'omCritFloat 1.3s ease-out forwards'
              : f.variant === 'heal'
                ? 'omFloatUp 1.3s ease-out forwards'
                : 'omFloatUp 1.3s ease-out forwards';
          return (
            <div
              key={f.k}
              className="mono damage-floater"
              style={{
                position: 'absolute',
                left: `calc(${f.c * BOARD_CELL_WIDTH_PCT}% + ${f.jitter * BOARD_CELL_WIDTH_PCT}%)`,
                top: `${f.r * BOARD_CELL_HEIGHT_PCT}%`,
                width: `${BOARD_CELL_WIDTH_PCT}%`,
                textAlign: 'center',
                pointerEvents: 'none',
                animation: anim,
                fontWeight: 700,
                fontSize: f.size,
                color: f.color,
                textShadow: '0 1px 0 var(--om-ink)',
              }}
            >
              {f.text}
            </div>
          );
        })}
        {banner && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 8, textAlign: 'center', pointerEvents: 'none', zIndex: 31 }}>
            <span
              className="slab"
              style={{
                display: 'inline-block',
                background: INK,
                color: SAF,
                border: '2px solid var(--om-saffron)',
                padding: '3px 10px',
                fontSize: 13,
                animation: 'omStamp 0.3s both',
              }}
            >
              {banner}
            </span>
          </div>
        )}
        {plan && gauntlet && !banner && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 8, textAlign: 'center', pointerEvents: 'none', zIndex: 31 }}>
            <span
              className="slab"
              style={{
                display: 'inline-block',
                background: RUST,
                color: BONE,
                border: `2px solid ${INK}`,
                padding: '3px 10px',
                fontSize: 13,
              }}
            >
              {getGauntletEncounter(g.round, boardPower(g.board)).name}
            </span>
          </div>
        )}
        {plan && (g.mode === 'bot' || g.mode === 'marathon') && (period.isBoss || period.isFinal) && !banner && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 8, textAlign: 'center', pointerEvents: 'none', zIndex: 31 }}>
            <span
              className="slab"
              style={{
                display: 'inline-block',
                background: period.isBoss ? RUST : INK,
                color: period.isBoss ? BONE : SAF,
                border: `2px solid ${period.isBoss ? INK : SAF}`,
                padding: '3px 10px',
                fontSize: 13,
              }}
            >
              {period.isBoss ? getBossEncounter(g.round, g.matchRounds)?.name ?? 'BOSS ROUND' : 'FINAL VS THE ADVERSARY'}
            </span>
          </div>
        )}
      </div>

      <div
        className="synergy-bar"
        style={{
          display: 'flex',
          gap: 4,
          padding: '5px 10px',
          borderBottom: '2px solid var(--om-ink)',
          overflowX: 'auto',
          minHeight: 44,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const u = g.bench[i];
          if (!u) {
            return (
              <div
                key={i}
                className="bench-slot"
                style={{
                  border: '2px solid var(--om-ink)',
                  background: 'var(--om-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 16, color: 'var(--om-muted-2)' }}>·</span>
              </div>
            );
          }
          const sel = g.sel && g.sel.u === u.u;
          return (
            <button
              key={u.u}
              type="button"
              onClick={() => onTapBench(u)}
              className={`bench-slot bench-slot--filled${sel ? ' board-unit--sel' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: sel ? `0 0 0 2px ${SAF}` : undefined,
              }}
            >
              <PixelSprite src={spriteCss(u.hid)} />
              <span
                style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  background: u.star === 3 ? SAF : 'var(--om-card)',
                  border: '1px solid var(--om-ink)',
                  padding: '0 3px',
                  lineHeight: '11px',
                }}
              >
                {'★'.repeat(u.star)}
              </span>
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {selUnit && plan && (
          <>
            <button
              type="button"
              onClick={onInfo}
              style={{
                flex: '0 0 auto',
                border: '2px solid var(--om-ink)',
                padding: '8px 9px',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ⓘ Info
            </button>
            <button
              type="button"
              onClick={() => {
                if (!sellArmed) {
                  setSellArmed(true);
                  return;
                }
                onSell();
                setSellArmed(false);
              }}
              style={{
                flex: '0 0 auto',
                border: '2px solid var(--om-ink)',
                background: sellArmed ? RUST : 'var(--om-card)',
                color: sellArmed ? BONE : RUST,
                padding: '8px 10px',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: sellArmed ? '3px 3px 0 var(--om-ink)' : undefined,
              }}
            >
              {sellArmed ? `Confirm ◈${sv}` : `Sell ◈${sv}`}
            </button>
          </>
        )}
      </div>

      <div style={{ flex: '0 0 auto', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--om-card)' }}>
        {plan && (
          <>
            <div style={{ display: 'flex', gap: 5, padding: '8px 10px 6px', alignItems: 'stretch' }}>
              {g.shop.map((offer, i) => {
                if (!offer) {
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: '2px solid var(--om-ink)',
                        background: 'var(--om-disabled)',
                        padding: '5px 3px 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        opacity: 0.5,
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: '30px', color: 'var(--om-muted-2)' }}>·</span>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--om-muted-2)' }}>sold</span>
                    </div>
                  );
                }
                const h = HERO_MAP[offer.hid];
                const price = shopPrice(offer);
                const afford = g.gold >= price && g.bench.length < 8;
                return (
                  <button
                    key={i}
                    type="button"
                    className="btn-active-sm"
                    onClick={() => onBuy(i)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: '2px solid var(--om-ink)',
                      background: 'var(--om-card)',
                      padding: '5px 3px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      opacity: afford ? 1 : 0.55,
                    }}
                  >
                    <PixelSprite src={spriteCss(offer.hid)} />
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        color: INK,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {h.name.split(' ')[0]}
                      {offer.star > 1 ? ` ${'★'.repeat(offer.star)}` : ''}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: INK,
                        background: afford ? SAF : 'var(--om-disabled)',
                        padding: '0 4px',
                      }}
                    >
                      ◈{price}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '2px 10px calc(var(--safe-bottom) + 8px)' }}>
              <button
                type="button"
                className="btn-active-sm"
                onClick={onReroll}
                style={{
                  flex: 1,
                  border: '3px solid var(--om-ink)',
                  background: canReroll ? 'var(--om-card)' : 'var(--om-disabled)',
                  boxShadow: '3px 3px 0 var(--om-ink)',
                  padding: '8px 6px',
                  fontFamily: "'Alfa Slab One', serif",
                  fontSize: 13,
                  color: canReroll ? INK : 'var(--om-muted-2)',
                }}
              >
                ↻ {rerollLabel}
              </button>
              <button
                type="button"
                className="btn-active-sm"
                onClick={onStartCombat}
                style={{
                  flex: 1.2,
                  border: '3px solid var(--om-ink)',
                  background: g.board.length ? RUST : 'var(--om-disabled)',
                  boxShadow: '3px 3px 0 var(--om-ink)',
                  padding: '8px 6px',
                  fontFamily: "'Alfa Slab One', serif",
                  fontSize: 13,
                  color: g.board.length ? BONE : 'var(--om-muted-2)',
                }}
              >
                {fightLabel}
              </button>
            </div>
          </>
        )}
        {combat && (
          <div style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="slab" style={{ fontSize: 17, color: RUST, animation: 'omPulse 1s infinite' }}>
              COMBAT
            </span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--om-muted)', lineHeight: 1.3 }}>
              {g.log || 'Creatures act on their own.'}
            </span>
            <button
              type="button"
              onClick={onToggleSpeed}
              className="mono"
              style={{ border: '2px solid var(--om-ink)', padding: '6px 9px', fontWeight: 700, fontSize: 12 }}
            >
              ×{g.speed}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SheetModal({
  sheet,
  game,
  onClose,
}: {
  sheet: SheetState;
  game: GameState;
  onClose: () => void;
}) {
  if (!sheet) return null;
  const traitBoard = traitCounts(game.board.map((u) => u.hid));
  const classBoard = classCounts(game.board.map((u) => u.hid));

  if (sheet.kind === 'traits') {
    const traitNames = Object.keys(traitBoard).sort((a, b) => (traitBoard[b] || 0) - (traitBoard[a] || 0));
    const classNames = Object.keys(classBoard).sort((a, b) => (classBoard[b] || 0) - (classBoard[a] || 0));
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(14,13,10,.66)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 45,
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxHeight: '86%',
            overflowY: 'auto',
            background: 'var(--om-card)',
            borderTop: '3px solid var(--om-ink)',
            animation: 'omRise 0.2s ease both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetHeader title="SYNERGIES" subtitle={`Board of ${game.board.length}`} onClose={onClose} isTraits />
          <div style={{ padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {classNames.length > 0 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--om-muted)' }}>
                  Classes
                </div>
                {classNames.map((n) => {
                  const t = classCard(n, classBoard);
                  return <TraitCardBlock key={`class-${n}`} card={t} showDesc />;
                })}
              </>
            )}
            {traitNames.length > 0 && (
              <>
                <div
                  style={{
                    marginTop: classNames.length ? 8 : 0,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--om-muted)',
                  }}
                >
                  Myth traits
                </div>
                {traitNames.map((n) => {
                  const t = traitCard(n, traitBoard);
                  return <TraitCardBlock key={`trait-${n}`} card={t} showDesc />;
                })}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const h = HERO_MAP[sheet.hid];
  const m = STARMUL[sheet.star as 1 | 2 | 3];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(14,13,10,.66)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 45,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '86%',
          overflowY: 'auto',
          background: 'var(--om-card)',
          borderTop: '3px solid var(--om-ink)',
          animation: 'omRise 0.2s ease both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHeader
          title={`${h.name} ${'★'.repeat(sheet.star)}`}
          subtitle={`${sheet.side === 'foe' ? 'Adversary · ' : ''}${h.origin} · ${h.creature}`}
          onClose={onClose}
          sprite={spriteCss(sheet.hid)}
        />
        <div style={{ padding: '14px 16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {[
              { k: 'HP', v: Math.round(h.hp * m * game.heroHpMul) },
              { k: 'ATK', v: Math.round(h.dmg * m) },
              { k: 'SPD', v: h.as.toFixed(2) },
              { k: 'CRIT', v: `${Math.round(h.crit * 100)}%` },
            ].map((st) => (
              <StatBox key={st.k} label={st.k} value={String(st.v)} />
            ))}
          </div>
          <div style={{ marginTop: 12, border: '3px solid var(--om-ink)', background: INK, color: BONE, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="slab" style={{ fontSize: 16, color: SAF }}>
                ✦ {h.ability}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--om-sky)', border: '1px solid var(--om-sky)', padding: '1px 5px' }}>
                100 MANA
              </span>
            </div>
            <div style={{ marginTop: 7, fontSize: 14, lineHeight: 1.4, color: 'var(--om-disabled)', textWrap: 'pretty' }}>{h.abilityText}</div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--om-hud-line)', fontSize: 13, lineHeight: 1.35, color: SAF }}>
              At ★{sheet.star} every number above is multiplied by {m}× · {attackLabel(h)} only · {h.quirk}
            </div>
          </div>
          <div style={{ marginTop: 14, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--om-muted)' }}>
            Class on this creature
          </div>
          <div style={{ marginTop: 7 }}>
            <TraitCardBlock card={classCard(h.heroClass, classBoard)} showDesc />
          </div>
          <div style={{ marginTop: 14, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--om-muted)' }}>
            Myth traits on this creature
          </div>
          <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {h.traits.map((t) => (
              <TraitCardBlock key={t} card={traitCard(t, traitBoard)} />
            ))}
          </div>
          {sheet.relics.length > 0 && (
            <>
              <div style={{ marginTop: 14, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--om-muted)' }}>
                Relics carried
              </div>
              <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sheet.relics.map((r) => {
                  const rel = RELIC_MAP[r];
                  return (
                    <div
                      key={r}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        border: '2px solid var(--om-ink)',
                        padding: '6px 9px',
                        background: 'var(--om-surface-2)',
                      }}
                    >
                      <span style={{ fontSize: 16, color: JADE }}>{rel.glyph}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{rel.name}</span>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--om-muted)', textAlign: 'right' }}>{rel.desc}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetHeader({
  title,
  subtitle,
  onClose,
  sprite,
  isTraits,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  sprite?: string;
  isTraits?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 16px 12px', background: INK }}>
      <div
        style={{
          width: 60,
          height: 60,
          flex: '0 0 auto',
          border: '2px solid var(--om-saffron)',
          background: 'var(--om-hud-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isTraits ? (
          <span style={{ fontSize: 26, color: SAF }}>✦</span>
        ) : (
          sprite && <PixelSprite src={sprite} size={48} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="slab" style={{ fontSize: 21, lineHeight: 1.05, color: BONE }}>
          {title}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--om-muted-2)' }}>
          {subtitle}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          width: 28,
          height: 28,
          border: '2px solid var(--om-muted)',
          color: BONE,
          fontSize: 15,
          flex: '0 0 auto',
        }}
      >
        ✕
      </button>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '2px solid var(--om-ink)', padding: '6px 4px', textAlign: 'center', background: 'var(--om-surface-2)' }}>
      <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--om-muted)', marginTop: 1 }}>
        {label}
      </div>
    </div>
  );
}

function TraitCardBlock({
  card,
  showDesc,
}: {
  card: ReturnType<typeof traitCard>;
  showDesc?: boolean;
}) {
  return (
    <div style={{ border: '2px solid var(--om-ink)', background: card.cardBg }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 9px',
          background: card.headBg,
        }}
      >
        <span style={{ fontSize: 14, color: card.headFg }}>{card.glyph}</span>
        <span className="slab" style={{ flex: 1, fontSize: 14, color: card.headFg }}>
          {card.name}
        </span>
        <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: card.headFg }}>
          {card.countLabel}
        </span>
      </div>
      <div style={{ padding: '7px 9px 8px' }}>
        {showDesc && <div style={{ fontSize: 12, color: 'var(--om-muted)', lineHeight: 1.3, marginBottom: 5 }}>{card.desc}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {card.tiers.map((tr) => (
            <div key={tr.n} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.3, color: tr.fg }}>
              <span className="mono" style={{ fontWeight: 700, minWidth: 16 }}>
                {tr.n}
              </span>
              <span style={{ flex: 1 }}>{tr.text}</span>
              <span style={{ fontSize: 12 }}>{tr.mark}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverlayModal({
  overlay,
  game,
  onAction,
  onSecondary,
  onChooseRelic,
  onBindRelic,
}: {
  overlay: OverlayKind;
  game: GameState;
  onAction: () => void;
  onSecondary?: () => void;
  onChooseRelic: (id: string) => void;
  onBindRelic: (rid: string, unitId: string) => void;
}) {
  let title = '';
  let subtitle = '';
  let body = '';
  let bannerBg = JADE;
  let bannerFg = BONE;
  let showAction = true;
  let actionLabel = 'Continue';
  let showSecondary = false;
  let secondaryLabel = '';
  let showRelics = false;
  let relics: { glyph: string; name: string; desc: string; onTap?: () => void }[] = [];

  if (overlay.kind === 'result') {
    if (overlay.boss) {
      title = overlay.win ? `${overlay.boss.name.toUpperCase()} FELLED` : `FELLED BY ${overlay.boss.name.toUpperCase()}`;
      subtitle = overlay.win ? `Period ${overlay.boss.period} spoil` : `Period ${overlay.boss.period} · you still stand`;
      bannerBg = overlay.win ? JADE : RUST;
      if (game.mode === 'gauntlet') {
        const lives = game.gauntletLives ?? 0;
        if (overlay.win && overlay.boss.reward) {
          body = `The omen breaks. You claim ${rewardLines(overlay.boss.reward).join(' · ')}. Choose a relic before the next wave.`;
        } else {
          body =
            `You lose a life (${lives} remaining). Next shop phase starts with −◈${2} gold from the toll.` +
            (lives <= 0 ? ' Your run ends here.' : ' Rally and fight again.');
        }
        actionLabel = overlay.offer ? 'CLAIM RELIC' : lives > 0 ? 'NEXT BOSS' : 'END RUN';
      } else if (overlay.win && overlay.boss.reward) {
        body =
          `The omen breaks. You claim ${rewardLines(overlay.boss.reward).join(' · ')}. The Adversary's board is untouched.`;
      } else {
        body =
          `You take ${overlay.dmg} damage` +
          (game.lossStreak > 1 ? ` — ${game.lossStreak} losses in a row, and it compounds.` : '.') +
          ' The match continues.';
      }
      if (game.mode !== 'gauntlet') {
        actionLabel = overlay.offer ? 'CLAIM RELIC' : 'NEXT ROUND';
      }
    } else {
      title = overlay.win ? 'ROUND WON' : 'ROUND LOST';
      subtitle = overlay.win ? 'The Adversary buckles' : 'The field turns on you';
      bannerBg = overlay.win ? JADE : RUST;
      body =
        (overlay.win ? 'The Adversary takes ' : 'You take ') +
        overlay.dmg +
        ' damage' +
        ((overlay.win ? game.foeLossStreak : game.lossStreak) > 1
          ? ` — ${overlay.win ? game.foeLossStreak : game.lossStreak} losses in a row, and it compounds.`
          : '.');
      actionLabel = overlay.offer ? 'CLAIM RELIC' : 'NEXT ROUND';
    }
  } else if (overlay.kind === 'relic') {
    title = 'SPOILS';
    subtitle = 'Choose one relic';
    bannerBg = SAF;
    bannerFg = INK;
    body = 'Relics bind to a creature and persist for the rest of the match. Three per creature.';
    showAction = false;
    showRelics = true;
    relics = overlay.picks.map((id) => {
      const r = RELIC_MAP[id];
      return { glyph: r.glyph, name: r.name, desc: r.desc, onTap: () => onChooseRelic(id) };
    });
  } else if (overlay.kind === 'bind') {
    title = 'BIND RELIC';
    subtitle = RELIC_MAP[overlay.rid].name;
    bannerBg = SAF;
    bannerFg = INK;
    body = `${RELIC_MAP[overlay.rid].desc} Pick the creature that carries it.`;
    showAction = false;
    showRelics = true;
    relics = game.board
      .filter((u) => u.relics.length < 3)
      .map((u) => ({
        glyph: HERO_MAP[u.hid].glyph,
        name: `${HERO_MAP[u.hid].name} ${'★'.repeat(u.star)}`,
        desc: u.relics.length ? `Carrying ${u.relics.map((r) => RELIC_MAP[r].name).join(', ')}` : 'No relics yet',
        onTap: () => onBindRelic(overlay.rid, u.u),
      }));
  } else if (overlay.kind === 'spar') {
    title = overlay.win ? 'SPAR WON' : 'SPAR LOST';
    subtitle = 'Sandbox — nothing is at stake';
    bannerBg = overlay.win ? JADE : 'var(--om-muted)';
    body = 'Adjust the board and spar again. Gold and rerolls are free here.';
    actionLabel = 'BACK TO BOARD';
  } else {
    if (game.mode === 'gauntlet') {
      title = overlay.win ? 'GAUNTLET CLEARED' : 'GAUNTLET OVER';
      subtitle = overlay.win
        ? `${game.gauntletRoundsCleared ?? game.round} bosses felled`
        : `${game.gauntletRoundsCleared ?? 0} bosses cleared · ${game.gauntletLives ?? 0} lives left`;
      bannerBg = overlay.win ? JADE : INK;
      bannerFg = overlay.win ? BONE : SAF;
      body = overlay.win
        ? 'Every wave broken. Your omens stood against the endless trial.'
        : 'Three lives spent. The gauntlet claims another challenger — but milestones and best runs persist.';
    } else {
      title = overlay.win ? 'VICTORY' : 'DEFEAT';
      subtitle = overlay.win ? 'The Adversary is undone' : 'Your omens are spent';
      bannerBg = overlay.win ? JADE : INK;
      bannerFg = overlay.win ? BONE : SAF;
      body = overlay.win
        ? 'Your omens answered louder. Bot victories unseal what waits behind the veil.'
        : 'The Adversary outlasted your board. Redraft and try a different six.';
    }
    actionLabel = 'PLAY AGAIN';
    showSecondary = true;
    secondaryLabel = 'Home';
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(14,13,10,.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: '100%',
          background: 'var(--om-card)',
          border: '3px solid var(--om-ink)',
          boxShadow: '7px 7px 0 var(--om-saffron)',
          animation: 'omStamp 0.3s both',
          overflow: 'hidden',
        }}
      >
        <div style={{ background: bannerBg, borderBottom: '3px solid var(--om-ink)', padding: '14px 16px' }}>
          <div className="slab" style={{ fontSize: 26, lineHeight: 1, color: bannerFg }}>
            {title}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: bannerFg,
              opacity: 0.8,
            }}
          >
            {subtitle}
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 15, lineHeight: 1.4, color: 'var(--om-muted)', textWrap: 'pretty' }}>{body}</div>
          {overlay.kind === 'result' && overlay.win && overlay.boss?.reward && (
            <div
              style={{
                marginTop: 12,
                border: '2px solid var(--om-ink)',
                background: 'var(--om-surface-2)',
                padding: '9px 10px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {rewardLines(overlay.boss.reward).map((line) => (
                <span
                  key={line}
                  className="slab"
                  style={{
                    fontSize: 13,
                    background: SAF,
                    color: INK,
                    border: '2px solid var(--om-ink)',
                    padding: '3px 8px',
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          )}
          {overlay.kind === 'over' && overlay.win && overlay.unlocked && overlay.unlocked.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--om-muted)',
                  marginBottom: 8,
                }}
              >
                Unsealed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overlay.unlocked.map((id) => {
                  const h = HERO_MAP[id];
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: '2px solid var(--om-ink)',
                        background: 'var(--om-surface-2)',
                        padding: '7px 9px',
                      }}
                    >
                      <PixelSprite src={spriteCss(id)} size={28} />
                      <span style={{ flex: 1 }}>
                        <span className="slab" style={{ display: 'block', fontSize: 15, lineHeight: 1.1 }}>
                          {h.name}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            marginTop: 2,
                            fontSize: 11,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--om-muted)',
                          }}
                        >
                          {h.traits.join(' · ')}
                        </span>
                      </span>
                      <span style={{ color: JADE, fontWeight: 700, fontSize: 16 }}>✦</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {overlay.kind === 'over' && overlay.unlockedBattlegrounds && overlay.unlockedBattlegrounds.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--om-muted)',
                  marginBottom: 8,
                }}
              >
                Battleground unlocked
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overlay.unlockedBattlegrounds.map((id) => {
                  const b = BATTLEGROUND_MAP[id];
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: '2px solid var(--om-ink)',
                        background: 'var(--om-surface-2)',
                        padding: '7px 9px',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          border: '2px solid var(--om-ink)',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        <BattlegroundPreview id={id} />
                      </div>
                      <span style={{ flex: 1 }}>
                        <span className="slab" style={{ display: 'block', fontSize: 15, lineHeight: 1.1 }}>
                          {b?.name ?? id}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            marginTop: 2,
                            fontSize: 11,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--om-muted)',
                          }}
                        >
                          {b?.theme}
                        </span>
                      </span>
                      <span style={{ color: JADE, fontWeight: 700, fontSize: 16 }}>✦</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {showRelics && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {relics.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn-active-sm"
                  onClick={r.onTap}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    textAlign: 'left',
                    border: '2px solid var(--om-ink)',
                    padding: '9px 10px',
                    background: 'var(--om-surface-2)',
                  }}
                >
                  <span style={{ fontSize: 22, color: JADE }}>{r.glyph}</span>
                  <span style={{ flex: 1 }}>
                    <span className="slab" style={{ display: 'block', fontSize: 15, lineHeight: 1.1 }}>
                      {r.name}
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--om-muted)', lineHeight: 1.3 }}>
                      {r.desc}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {showAction && (
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
            {showSecondary && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                style={{
                  flex: 1,
                  border: '2px solid var(--om-ink)',
                  padding: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontSize: 13,
                }}
              >
                {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              className="btn-active-sm"
              onClick={onAction}
              style={{
                flex: 1.4,
                background: JADE,
                color: BONE,
                border: '3px solid var(--om-ink)',
                boxShadow: '4px 4px 0 var(--om-ink)',
                padding: 12,
                fontFamily: "'Alfa Slab One', serif",
                fontSize: 17,
              }}
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
