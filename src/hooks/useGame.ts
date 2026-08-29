import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DRAFT, DRAFT_STORAGE_KEY, PLAYER_ROW_START, RUST, SAF, USER_DRAFT_MAX } from '../data/constants';
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
import { DEFAULT_BATTLEGROUND_ID, loadSettings, saveSettings, type SettingsState } from '../data/settings';
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
import { debugRoundFromUrl } from '../game/hyperRoll';
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
  const [tick, setTick] = useState(0);

  const engineRef = useRef<CombatEngine | null>(null);
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

  const syncGame = useCallback((g: GameState) => {
    setGame({ ...g });
    setTick((t) => t + 1);
  }, []);

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
      setTimeout(() => setFloaters((prev) => prev.filter((x) => x.k !== f.k)), 1300);
    },
    [],
  );

  const spawnFx = useCallback((payload: CombatFxPayload) => {
    if (settingsRef.current.reduceVfx) return;
    const item: CombatFx = { ...payload, k: `fx${Date.now()}${Math.random()}`, t: Date.now() };
    setCombatFx((prev) => [...prev, item].slice(-28));
    setTimeout(() => setCombatFx((prev) => prev.filter((x) => x.k !== item.k)), 700);
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

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
      rollShop(g, draft, true);
      setGame(g);
      setOverlay(null);
      setFloaters([]);
      setCombatFx([]);
      setBanner('');
      setSheet(null);
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
    (win: boolean) => {
      const g = gameRef.current;
      if (!g) return;
      let result = gameActions.resolveRound(g, win, g.matchRounds);
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
      setOverlay(result);
      syncGame(g);
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
    if (g.mode === 'practice') makeFoeBoard(g, difficulty);
    const mine = g.board.map((u) => combatant(u, 'me', g.heroHpMul));
    const theirs = combatOpponents(g).map((u) => combatant(u, 'foe', g.heroHpMul));
    applyTraits(mine);
    applyTraits(theirs);
    if (theirs.some((u) => u.boss)) {
      fitBossToTeam(theirs, mine, g.round, {
        difficulty,
        gauntlet: isGauntletMode(g.mode),
      });
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
    engine.C = mine.concat(theirs);
    engineRef.current = engine;
    setCombatants(engine.C);
    setCombatFx([]);
    g.phase = 'combat';
    syncGame(g);
    clearTimer();
    timerRef.current = setInterval(() => {
      const eng = engineRef.current;
      const current = gameRef.current;
      if (!eng || !current) return;
      eng.tick(current.speed);
      setCombatants([...eng.C]);
      setTick((t) => t + 1);
      if (eng.isDone()) {
        clearTimer();
        const win = eng.getWinner();
        setTimeout(() => resolveCombat(win), 500);
      }
    }, 100);
  }, [clearTimer, pop, resolveCombat, spawnFx, syncGame]);

  const buy = useCallback(
    (i: number) => {
      const g = gameRef.current;
      if (!g) return;
      const offer = g.shop[i];
      const hid = offer?.hid;
      const twoStarBefore = hid ? countHeroStar(g, hid, 2) : 0;
      gameActions.buy(g, i);
      if (hid) applyMerges(g, { boughtHid: hid, twoStarBeforeBuy: twoStarBefore }, (r, c, text) => pop(r, c, text));
      syncGame(g);
    },
    [pop, syncGame],
  );

  const sell = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    gameActions.sell(g);
    syncGame(g);
  }, [syncGame]);

  const reroll = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    gameActions.reroll(g, draft);
    syncGame(g);
  }, [draft, syncGame]);

  const tapUnit = useCallback(
    (u: Parameters<typeof gameActions.tapUnit>[1], from: 'bench' | 'board') => {
      const g = gameRef.current;
      if (!g) return;
      gameActions.tapUnit(g, u, from, g.matchRounds);
      mergeUnits(g, (r, c, text) => pop(r, c, text));
      syncGame(g);
    },
    [pop, syncGame],
  );

  const tapCell = useCallback(
    (r: number, c: number) => {
      const g = gameRef.current;
      if (!g) return;
      gameActions.tapCell(g, r, c, g.matchRounds, (text) =>
        pop(PLAYER_ROW_START + 1, 1, text, RUST, '12px'),
      );
      mergeUnits(g, (r2, c2, text) => pop(r2, c2, text));
      syncGame(g);
    },
    [pop, syncGame],
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
    gameActions.nextRound(g, draft);
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
    const picks =
      g && isGauntletMode(g.mode) ? pickGauntletRelics(g.round) : pickRelics();
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
