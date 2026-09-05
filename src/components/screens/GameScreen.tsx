import { useEffect, useState } from 'react';
import { MATCH_DEFAULTS } from '../../data/economy';
import {
  activeSynergies,
  applyTraits,
  combatant,
  fitBossToTeam,
  isGauntletMode,
  isRankedMode,
  sellValue,
} from '../../game/engine';
import { getGauntletEncounter, makeGauntletBossUnits } from '../../game/gauntlet';
import { getBossEncounter, isBossRound, makeBossUnits, periodInfo } from '../../game/hyperRoll';
import type { Combatant, CombatFx, Floater, GameState, Unit } from '../../game/types';
import type { StampedUiEvent } from '../../game/uiEvents';
import { Bench } from '../game/Bench';
import { Board } from '../game/Board';
import { CombatBar } from '../game/CombatBar';
import { GameHud } from '../game/GameHud';
import { Shop } from '../game/Shop';
import { SynergyBar } from '../game/SynergyBar';

export { OverlayModal } from '../game/OverlayModal';
export { SheetModal } from '../game/SheetModal';

interface GameScreenProps {
  game: GameState;
  combatants: Combatant[] | null;
  combatFx: CombatFx[];
  floaters: Floater[];
  banner: string;
  uiEvents: StampedUiEvent[];
  intro?: { boss: { name: string; kit: string } | null } | null;
  pendingResult?: boolean;
  onSkipIntro?: () => void;
  boardCap: number;
  battlegroundId: string;
  reduceVfx?: boolean;
  onQuit: () => void;
  onTapCell: (r: number, c: number) => void;
  onTapBench: (u: Unit) => void;
  onTapBoard: (u: Unit) => void;
  onBuy: (i: number) => void;
  onReroll: () => void;
  onStartCombat: () => void;
  onSell: () => void;
  onInfo: () => void;
  onToggleSpeed: () => void;
  onOpenTraits: () => void;
  onOpenSheet: (u: Unit) => void;
}

/** Foe units to preview during the plan phase — the bot board, or the boss. */
function previewFoes(g: GameState): Unit[] {
  if (g.phase === 'combat') return [];
  if (isGauntletMode(g.mode)) return makeGauntletBossUnits(g.round);
  if (!isRankedMode(g.mode)) return [];
  return isBossRound(g.round, g.matchRounds) ? makeBossUnits(g.round, g.matchRounds) : g.foe;
}

function planBannerFor(g: GameState): { text: string; tone: 'boss' | 'final' } | null {
  if (g.phase !== 'plan') return null;
  if (isGauntletMode(g.mode)) {
    return { text: getGauntletEncounter(g.round).name, tone: 'boss' };
  }
  if (g.mode !== 'bot' && g.mode !== 'marathon') return null;
  const period = periodInfo(g.round, g.matchRounds);
  if (period.isBoss) {
    return { text: getBossEncounter(g.round, g.matchRounds)?.name ?? 'BOSS ROUND', tone: 'boss' };
  }
  if (period.isFinal) return { text: 'FINAL VS THE ADVERSARY', tone: 'final' };
  return null;
}

function fightLabelFor(g: GameState): string {
  if (g.mode === 'practice') return 'SPAR';
  if (isGauntletMode(g.mode)) return 'FIGHT BOSS';
  const period = periodInfo(g.round, g.matchRounds);
  if (period.isBoss) return 'FIGHT BOSS';
  return period.isFinal ? 'FINAL FIGHT' : 'FIGHT';
}

export function GameScreen(props: GameScreenProps) {
  const { game: g, combatants, boardCap } = props;
  const plan = g.phase === 'plan';
  const [sellArmed, setSellArmed] = useState(false);
  useEffect(() => {
    setSellArmed(false);
  }, [g.sel?.u]);

  const src: Combatant[] =
    combatants ??
    (() => {
      const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
      const theirs = previewFoes(g).map((u) => combatant(u, 'foe', g.heroHpMul));
      applyTraits(mine);
      applyTraits(theirs);
      if (theirs.some((u) => u.boss)) {
        fitBossToTeam(theirs, g.round, { gauntlet: isGauntletMode(g.mode) });
      }
      return mine.concat(theirs);
    })();

  const selUnit =
    (g.sel ? (g.sel.from === 'bench' ? g.bench : g.board).find((x) => x.u === g.sel!.u) : null) ?? null;
  const rerollCost = MATCH_DEFAULTS.rerollCost;
  const canReroll = g.mode === 'practice' || g.freeRerolls > 0 || g.gold >= rerollCost;
  const rerollLabel =
    g.mode === 'practice'
      ? 'FREE ROLL'
      : g.freeRerolls > 0
        ? `FREE ROLL ×${g.freeRerolls}`
        : `ROLL ◈${rerollCost}`;

  return (
    <div className="game-root" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <GameHud
        game={g}
        boardCap={boardCap}
        uiEvents={props.uiEvents}
        pendingResult={props.pendingResult}
        onQuit={props.onQuit}
      />
      <SynergyBar
        synergies={activeSynergies(g.board.map((u) => u.hid)).filter((t) => t.count >= 1)}
        onOpenTraits={props.onOpenTraits}
      />
      <Board
        game={g}
        src={src}
        combatFx={props.combatFx}
        floaters={props.floaters}
        banner={props.banner}
        uiEvents={props.uiEvents}
        planBanner={planBannerFor(g)}
        battlegroundId={props.battlegroundId}
        reduceVfx={props.reduceVfx}
        intro={props.intro}
        onSkipIntro={props.onSkipIntro}
        onTapCell={props.onTapCell}
        onTapBoard={props.onTapBoard}
        onOpenSheet={props.onOpenSheet}
      />
      <Bench
        game={g}
        selUnit={selUnit}
        sellValue={selUnit ? sellValue(selUnit) : 0}
        sellArmed={sellArmed}
        uiEvents={props.uiEvents}
        onTapBench={props.onTapBench}
        onInfo={props.onInfo}
        onArmSell={() => setSellArmed(true)}
        onSell={() => {
          props.onSell();
          setSellArmed(false);
        }}
      />
      <div className={`om-shop${plan ? '' : ' om-shop--collapse'}`}>
        {plan && (
          <Shop
            game={g}
            rerollLabel={rerollLabel}
            canReroll={canReroll}
            fightLabel={fightLabelFor(g)}
            uiEvents={props.uiEvents}
            onBuy={props.onBuy}
            onReroll={props.onReroll}
            onStartCombat={props.onStartCombat}
          />
        )}
        {g.phase === 'combat' && (
          <div className="om-combat-bar--enter">
            <CombatBar speed={g.speed} onToggleSpeed={props.onToggleSpeed} />
          </div>
        )}
      </div>
    </div>
  );
}
