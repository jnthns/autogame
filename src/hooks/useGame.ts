import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DRAFT, DRAFT_STORAGE_KEY, JADE, PLAYER_ROW_START, RUST, SAF, USER_DRAFT_MAX } from '../data/constants';
import { BAR_DRAIN_MS, BOSS_INTRO_MS, FIGHT_INTRO_MS, RESULT_DELAY_MS } from '../data/ui';
import { RELIC_PICKS_LOSS, RELIC_PICKS_WIN } from '../data/economy';
import {
  battlegroundUnlocked,
  newlyUnlockedBattlegrounds,
} from '../data/battlegrounds';
import {
  applyGauntletMilestones,
  applyMatchWin,
  heroUnlocked,
  loadProgress,
  saveProgress,
  unlockedHeroIds,
  updateGauntletBest,
  type ProgressState,
} from '../data/progress';
import {
  DEFAULT_BATTLEGROUND_ID,
  loadSettings,
  saveSettings,
  vibrate,
  type SettingsState,
} from '../data/settings';
import {
  applyMerges,
  applyTraits,
  cap,
  CombatEngine,
  combatant,
  combatOpponents,
  countHeroStar,
  createGame,
  fitBossToTeam,
  gameActions,
  isGauntletMode,
  isRankedMode,
  makeFoeBoard,
  mergeUnits,
  pickRelics,
  resetUidCounter,
  rollShop,
  scaleFoeCombatants,
  usesDifficulty,
} from '../game/engine';
import { pickGauntletRelics } from '../game/gauntlet';
import { pruneUiEvents, stamp, type StampedUiEvent, type UiEvent } from '../game/uiEvents';
import { debugRoundFromUrl, debugStateFromUrl } from '../game/debugUrl';
import type {
  Combatant,
  CombatFx,
  CombatFxPayload,
  Floater,
  FloaterVariant,
  GameMode,
  GameState,
  OverlayKind,
  Screen,
  SheetState,
} from '../game/types';

/** How long a floater, an FX streak and the prune interval live. */
const FLOATER_TTL_MS = 1300;
const FX_TTL_MS = 700;
const PRUNE_INTERVAL_MS = 250;
/** Haptics: a tap for a buy or a merge, a thump for felling a boss. */
const HAPTIC_TAP_MS = 10;
const HAPTIC_BOSS_MS = 25;

function loadDraft(unlocked: string[]): string[] {
  const allow = new Set(unlocked);
  try {
    const s = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (s) {
      const d = JSON.parse(s);
      if (Array.isArray(d) && d.length) {
        const kept = d.filter((id: unknown): id is string => typeof id === 'string' && allow.has(id));
        if (kept.length) return kept.slice(0, USER_DRAFT_MAX);
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DRAFT.filter((id) => allow.has(id)).slice(0, USER_DRAFT_MAX);
}

export function useGame() {
  const [screen, setScreen] = useState<Screen>('home');
  const [progress, setProgress] = useState<ProgressState>(loadProgress);
  const [settings, setSettings] = useState<SettingsState>(() => {
    const s = loadSettings();
    const p = loadProgress();
    if (!battlegroundUnlocked(s.battlegroundId, p)) {
      const next = { ...s, battlegroundId: DEFAULT_BATTLEGROUND_ID };
      saveSettings(next);
      return next;
    }
    return s;
  });
  const [draft, setDraftState] = useState<string[]>(() => loadDraft(unlockedHeroIds(loadProgress())));
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [overlay, setOverlay] = useState<OverlayKind | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState('');
  const [combatants, setCombatants] = useState<Combatant[] | null>(null);
  const [combatFx, setCombatFx] = useState<CombatFx[]>([]);
  const [uiEvents, setUiEvents] = useState<StampedUiEvent[]>([]);
  const [intro, setIntro] = useState<{ boss: { name: string; kit: string } | null; until: number } | null>(null);
  const [pendingResult, setPendingResult] = useState(false);
  const [tick, setTick] = useState(0);

  const engineRef = useRef<CombatEngine | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTickingRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const progressRef = useRef(progress);
  const settingsRef = useRef(settings);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /** Append a UI event and prune what has aged out. */
  const emit = useCallback((...events: UiEvent[]) => {
    if (!events.length) return;
    setUiEvents((prev) => [...pruneUiEvents(prev), ...events.map((e) => stamp(e))].slice(-24));
  }, []);

  /**
   * Ids we have already seen on the roster. A star-2-or-3 unit whose id is new
   * was just combined, which is the merge cue for the board and the bench.
   */
  const knownUnits = useRef(new Set<string>());

  const emitMerges = useCallback(
    (g: GameState, landedBenchIndex?: number) => {
      const events: UiEvent[] = [];
      const seen = new Set<string>();
      [...g.board, ...g.bench].forEach((u) => {
        seen.add(u.u);
        if (u.star < 2 || knownUnits.current.has(u.u)) return;
        const onBoard = u.r != null && u.c != null;
        events.push({
          kind: 'merge',
          u: u.u,
          star: u.star as 2 | 3,
          where: onBoard ? 'board' : 'bench',
          r: u.r,
          c: u.c,
          index: onBoard ? undefined : g.bench.findIndex((b) => b.u === u.u),
        });
      });
      knownUnits.current = seen;
      if (!events.length && landedBenchIndex != null) return;
      if (events.length) vibrate(HAPTIC_TAP_MS, settingsRef.current.haptics);
      emit(...events);
    },
    [emit],
  );

  /**
   * Sync React to the mutable game state, emitting a `gold` event when the
   * total moved so the HUD can flash and tween.
   */
  const syncGame = useCallback(
    (g: GameState) => {
      const before = gameRef.current?.gold;
      setGame({ ...g });
      setUiEvents((prev) => pruneUiEvents(prev));
      if (before != null && before !== g.gold) emit({ kind: 'gold', from: before, to: g.gold });
      setTick((t) => t + 1);
    },
    [emit],
  );

  const pop = useCallback(
    (r: number, c: number, text: string, color = SAF, size = 'var(--damage-font)', variant: FloaterVariant = 'damage') => {
      const jitter = (Math.random() - 0.5) * 0.3;
      const f: Floater = {
        k: `f${Date.now()}${Math.random()}`,
        r,
        c,
        text,
        color,
        size,
        variant,
        jitter,
        t: Date.now(),
      };
      setFloaters((prev) => [...prev, f].slice(-14));
    },
    [],
  );

  const spawnFx = useCallback((payload: CombatFxPayload) => {
    if (settingsRef.current.reduceVfx) return;
    const item: CombatFx = { ...payload, k: `fx${Date.now()}${Math.random()}`, t: Date.now() };
    setCombatFx((prev) => [...prev, item].slice(-28));
  }, []);

  const saveDraft = useCallback((d: string[]) => {
    setDraftState(d);
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHero = useCallback(
    (id: string) => {
      if (!heroUnlocked(id, progressRef.current)) return;
      const d = draft.slice();
      const i = d.indexOf(id);
      if (i >= 0) d.splice(i, 1);
      else if (d.length < USER_DRAFT_MAX) d.push(id);
      else return;
      saveDraft(d);
    },
    [draft, saveDraft],
  );

  /**
   * One prune for every transient list, instead of a timer per floater and per
   * FX. Runs on the combat tick, and on a slow interval outside combat only
   * while something is still on screen.
   */
  const pruneTransients = useCallback((now = Date.now()) => {
    setFloaters((prev) => {
      const kept = prev.filter((f) => now - f.t < FLOATER_TTL_MS);
      return kept.length === prev.length ? prev : kept;
    });
    setCombatFx((prev) => {
      const kept = prev.filter((f) => now - f.t < FX_TTL_MS);
      return kept.length === prev.length ? prev : kept;
    });
    setUiEvents((prev) => pruneUiEvents(prev, now));
  }, []);

  useEffect(() => {
    if (!floaters.length && !combatFx.length && !uiEvents.length) return;
    const id = setInterval(() => pruneTransients(), PRUNE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [combatFx.length, floaters.length, pruneTransients, uiEvents.length]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (introTimerRef.current) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  }, []);

  const startGame = useCallback(
    (mode: GameMode) => {
      clearTimer();
      resetUidCounter();
      engineRef.current = null;
      setCombatants(null);
      const g = createGame(mode, {
        speed: settingsRef.current.defaultSpeed,
        startRound: mode === 'bot' ? debugRoundFromUrl() : undefined,
        draft,
      });
      rollShop(g, draft);
      setGame(g);
      setOverlay(null);
      setFloaters([]);
      setCombatFx([]);
      setBanner('');
      setSheet(null);
      setUiEvents([]);
      setIntro(null);
      setPendingResult(false);
      knownUnits.current = new Set();
      setScreen('game');
    },
    [clearTimer, draft],
  );

  const quitGame = useCallback(() => {
    clearTimer();
    engineRef.current = null;
    setCombatants(null);
    setGame(null);
    setOverlay(null);
    setFloaters([]);
    setCombatFx([]);
    setScreen('home');
  }, [clearTimer]);

  const resolveCombat = useCallback(
    (win: boolean, survivors: { me: number; foe: number }) => {
      const g = gameRef.current;
      if (!g) return;
      const result0 = gameActions.resolveRound(g, win, g.matchRounds, survivors);
      let result = result0;
      if (win && result0.kind === 'result' && result0.boss) {
        vibrate(HAPTIC_BOSS_MS, settingsRef.current.haptics);
      }
      if (result.kind === 'over' && isGauntletMode(g.mode)) {
        const before = progressRef.current;
        const peakRound = g.gauntletRoundsCleared ?? Math.max(0, g.round - 1);
        const lives = g.gauntletLives ?? 0;
        let next = updateGauntletBest(before, peakRound, lives);
        const milestone = applyGauntletMilestones(next, peakRound);
        next = milestone.next;
        saveProgress(next);
        progressRef.current = next;
        setProgress(next);
        result = {
          ...result,
          unlocked: milestone.newlyUnlocked,
        };
      } else if (result.kind === 'over' && isRankedMode(g.mode)) {
        const before = progressRef.current;
        let next: ProgressState = { ...before, botMatches: before.botMatches + 1 };
        let newlyUnlocked: string[] = [];
        if (result.win) {
          const r = applyMatchWin(next, g.board.map((u) => u.hid));
          next = r.next;
          newlyUnlocked = r.newlyUnlocked;
        }
        saveProgress(next);
        progressRef.current = next;
        setProgress(next);
        result = {
          ...result,
          unlocked: newlyUnlocked,
          unlockedBattlegrounds: newlyUnlockedBattlegrounds(before, next),
        };
      }
      engineRef.current = null;
      setCombatants(null);
      setCombatFx([]);
      // Resolve first so the HP bar has a new value to animate to, then hold the
      // modal back for one drain so the player sees where the damage landed.
      syncGame(g);
      setPendingResult(true);
      setTimeout(() => {
        setPendingResult(false);
        setOverlay(result);
      }, BAR_DRAIN_MS);
    },
    [syncGame],
  );

  const startCombat = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.phase !== 'plan') return;
    if (!g.board.length) {
      pop(PLAYER_ROW_START + 1, 1, 'PLACE A CREATURE', RUST, '12px');
      return;
    }
    const difficulty = usesDifficulty(g.mode) ? settingsRef.current.difficulty : 'normal';
    if (g.mode === 'practice') makeFoeBoard(g);
    const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
    const theirs = combatOpponents(g).map((u) => combatant(u, 'foe', g.heroHpMul));
    applyTraits(mine);
    applyTraits(theirs);
    if (theirs.some((u) => u.boss)) {
      fitBossToTeam(theirs, g.round, { gauntlet: isGauntletMode(g.mode) });
    }
    if (usesDifficulty(g.mode)) scaleFoeCombatants(theirs, difficulty);
    const engine = new CombatEngine(
      (r, c, text, color, size, variant) => pop(r, c, text, color, size, variant),
      (text) => {
        setBanner(text);
        setTimeout(() => setBanner(''), 1100);
      },
      (fx) => spawnFx(fx),
    );
    const boss = theirs.find((u) => u.boss);
    if (boss) emit({ kind: 'bossIntro', name: boss.name, kit: boss.bossKit ?? 'clay' });
    emit({ kind: 'fight' });
    engine.C = mine.concat(theirs);
    engineRef.current = engine;
    setCombatants(engine.C);
    setCombatFx([]);
    g.phase = 'combat';
    syncGame(g);
    clearTimer();

    // The board is live and the shop has collapsed, but the engine's clock does
    // not start until the intro has played. A tap skips it.
    const introMs = (boss ? BOSS_INTRO_MS : 0) + FIGHT_INTRO_MS;
    setIntro({ boss: boss ? { name: boss.name, kit: boss.bossKit ?? 'clay' } : null, until: Date.now() + introMs });
    const startTicking = () => {
      timerRef.current = setInterval(() => {
        const eng = engineRef.current;
        const current = gameRef.current;
        if (!eng || !current) return;
        eng.tick(current.speed);
        setCombatants([...eng.C]);
        pruneTransients();
        setTick((t) => t + 1);
        if (eng.isDone()) {
          clearTimer();
          const win = eng.getWinner();
          const survivors = {
            me: eng.C.filter((u) => u.alive && u.side === 'me').length,
            foe: eng.C.filter((u) => u.alive && u.side === 'foe').length,
          };
          setTimeout(() => resolveCombat(win, survivors), RESULT_DELAY_MS);
        }
      }, 100);
    };
    startTickingRef.current = startTicking;
    introTimerRef.current = setTimeout(() => {
      setIntro(null);
      startTicking();
    }, introMs);
  }, [clearTimer, emit, pop, pruneTransients, resolveCombat, spawnFx, syncGame]);

  /** Tapping during the intro starts the fight immediately. */
  const skipIntro = useCallback(() => {
    if (!introTimerRef.current) return;
    clearTimeout(introTimerRef.current);
    introTimerRef.current = null;
    setIntro(null);
    startTickingRef.current?.();
  }, []);

  const buy = useCallback(
    (i: number) => {
      const g = gameRef.current;
      if (!g) return;
      const offer = g.shop[i];
      const hid = offer?.hid;
      const twoStarBefore = hid ? countHeroStar(g, hid, 2) : 0;
      const goldBefore = g.gold;
      const benchBefore = g.bench.length;
      gameActions.buy(g, i);
      if (goldBefore === g.gold) {
        emit({ kind: 'blocked', reason: g.bench.length >= 8 ? 'bench' : 'gold', index: i });
        return;
      }
      emit({ kind: 'buy', hid: hid!, benchIndex: benchBefore });
      vibrate(HAPTIC_TAP_MS, settingsRef.current.haptics);
      if (hid) {
        applyMerges(g, { boughtHid: hid, twoStarBeforeBuy: twoStarBefore }, (r, c, text) =>
          pop(r, c, text),
        );
        emitMerges(g, benchBefore);
      }
      syncGame(g);
    },
    [emit, emitMerges, pop, syncGame],
  );

  const sell = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    const benchIndex = g.sel?.from === 'bench' ? g.bench.findIndex((u) => u.u === g.sel!.u) : null;
    const goldBefore = g.gold;
    gameActions.sell(g);
    if (g.gold !== goldBefore) {
      emit({ kind: 'sell', benchIndex, gold: g.gold - goldBefore });
      pop(PLAYER_ROW_START + 1, 2, `+◈${g.gold - goldBefore}`, JADE, 'var(--heal-font)', 'heal');
    }
    syncGame(g);
  }, [emit, pop, syncGame]);

  const reroll = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    const before = g.shop;
    gameActions.reroll(g, draft);
    if (g.shop !== before) emit({ kind: 'roll' });
    syncGame(g);
  }, [draft, emit, syncGame]);

  const tapUnit = useCallback(
    (u: Parameters<typeof gameActions.tapUnit>[1], from: 'bench' | 'board') => {
      const g = gameRef.current;
      if (!g) return;
      gameActions.tapUnit(g, u, from, g.matchRounds);
      mergeUnits(g, (r, c, text) => pop(r, c, text));
      emitMerges(g);
      syncGame(g);
    },
    [emitMerges, pop, syncGame],
  );

  const tapCell = useCallback(
    (r: number, c: number) => {
      const g = gameRef.current;
      if (!g) return;
      const placed = g.sel?.u;
      gameActions.tapCell(g, r, c, g.matchRounds, (text) =>
        pop(PLAYER_ROW_START + 1, 1, text, RUST, '12px'),
      );
      if (placed && g.board.some((u) => u.u === placed)) emit({ kind: 'place', u: placed });
      mergeUnits(g, (r2, c2, text) => pop(r2, c2, text));
      emitMerges(g);
      syncGame(g);
    },
    [emit, emitMerges, pop, syncGame],
  );

  const toggleSpeed = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 4 : 1;
    syncGame(g);
  }, [syncGame]);

  const nextRound = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    const prevRound = g.round;
    gameActions.nextRound(g, draft, settingsRef.current.difficulty);
    if (isGauntletMode(g.mode)) {
      const before = progressRef.current;
      let next = before;
      let newlyUnlocked: string[] = [];
      if (
        (prevRound < 20 && g.round >= 20) ||
        (prevRound < 40 && g.round >= 40)
      ) {
        const milestone = applyGauntletMilestones(before, g.round);
        next = milestone.next;
        newlyUnlocked = milestone.newlyUnlocked;
      }
      if (g.gauntletRoundsCleared != null && g.gauntletLives != null) {
        next = updateGauntletBest(next, g.gauntletRoundsCleared, g.gauntletLives);
      }
      if (next !== before || newlyUnlocked.length) {
        saveProgress(next);
        progressRef.current = next;
        setProgress(next);
      }
    }
    setOverlay(null);
    setFloaters([]);
    setCombatFx([]);
    syncGame(g);
  }, [draft, syncGame]);

  const offerRelics = useCallback(() => {
    const g = gameRef.current;
    const count = g?.lastResult?.win === false ? RELIC_PICKS_LOSS : RELIC_PICKS_WIN;
    const picks =
      g && isGauntletMode(g.mode) ? pickGauntletRelics(g.round, count) : pickRelics(count);
    setOverlay({ kind: 'relic', picks });
  }, []);

  const chooseRelic = useCallback((rid: string) => {
    setOverlay({ kind: 'bind', rid });
  }, []);

  const bindRelic = useCallback(
    (rid: string, unitId: string) => {
      const g = gameRef.current;
      if (!g) return;
      const u = g.board.find((x) => x.u === unitId);
      if (!u) return;
      gameActions.bindRelic(g, rid, u);
      nextRound();
    },
    [nextRound],
  );

  const updateSettings = useCallback((partial: Partial<SettingsState>) => {
    setSettings((prev) => {
      if (partial.battlegroundId && !battlegroundUnlocked(partial.battlegroundId, progressRef.current)) {
        return prev;
      }
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const autoDraft = useCallback(() => {
    const pool = unlockedHeroIds(progressRef.current)
      .sort(() => Math.random() - 0.5)
      .slice(0, USER_DRAFT_MAX);
    saveDraft(pool);
  }, [saveDraft]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  // Dev-only: `?screen=…&mode=…&phase=…&theme=…` drives npm run screens.
  const debugApplied = useRef(false);
  useEffect(() => {
    if (debugApplied.current) return;
    const d = debugStateFromUrl();
    if (!d) return;
    debugApplied.current = true;
    if (d.theme) updateSettings({ darkMode: d.theme === 'dark' });
    if (d.screen === 'game') startGame(d.mode ?? 'bot');
    else if (d.screen) setScreen(d.screen);
    if (d.phase === 'combat') {
      // Let the board mount and the shop settle before the engine starts.
      setTimeout(() => startCombat(), 120);
    }
  }, [startCombat, startGame, updateSettings]);

  return {
    screen,
    setScreen,
    draft,
    progress,
    settings,
    updateSettings,
    inspectId,
    setInspectId,
    game,
    overlay,
    setOverlay,
    sheet,
    setSheet,
    floaters,
    banner,
    combatants,
    combatFx,
    uiEvents,
    intro,
    pendingResult,
    skipIntro,
    tick,
    saveDraft,
    toggleHero,
    startGame,
    quitGame,
    startCombat,
    buy,
    sell,
    reroll,
    tapUnit,
    tapCell,
    toggleSpeed,
    nextRound,
    offerRelics,
    chooseRelic,
    bindRelic,
    autoDraft,
    cap: game ? cap(game.round, game.matchRounds, game.mode) : 3,
  };
}

export type GameContext = ReturnType<typeof useGame>;
