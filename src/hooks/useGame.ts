import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DRAFT, DRAFT_STORAGE_KEY, MATCH_DEFAULTS, RUST, SAF } from '../data/constants';
import { HEROES } from '../data/heroes';
import {
  applyTraits,
  cap,
  CombatEngine,
  combatant,
  createGame,
  gameActions,
  makeFoeBoard,
  mergeUnits,
  pickRelics,
  resetUidCounter,
  rollShop,
} from '../game/engine';
import type {
  Combatant,
  Floater,
  GameMode,
  GameState,
  OverlayKind,
  Screen,
  SheetState,
} from '../game/types';

function loadDraft(): string[] {
  try {
    const s = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (s) {
      const d = JSON.parse(s);
      if (Array.isArray(d) && d.length) return d;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_DRAFT];
}

export function useGame() {
  const [screen, setScreen] = useState<Screen>('home');
  const [draft, setDraftState] = useState<string[]>(loadDraft);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [overlay, setOverlay] = useState<OverlayKind | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState('');
  const [combatants, setCombatants] = useState<Combatant[] | null>(null);
  const [tick, setTick] = useState(0);

  const engineRef = useRef<CombatEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const syncGame = useCallback((g: GameState) => {
    setGame({ ...g });
    setTick((t) => t + 1);
  }, []);

  const pop = useCallback((r: number, c: number, text: string, color = SAF, size = '14px') => {
    const f: Floater = { k: `f${Date.now()}${Math.random()}`, r, c, text, color, size, t: Date.now() };
    setFloaters((prev) => [...prev, f].slice(-14));
    setTimeout(() => setFloaters((prev) => prev.filter((x) => x.k !== f.k)), 900);
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
      const d = draft.slice();
      const i = d.indexOf(id);
      if (i >= 0) d.splice(i, 1);
      else if (d.length < 6) d.push(id);
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
      const g = createGame(mode);
      rollShop(g, draft, true);
      setGame(g);
      setOverlay(null);
      setFloaters([]);
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
    setScreen('home');
  }, [clearTimer]);

  const resolveCombat = useCallback(
    (win: boolean) => {
      const g = gameRef.current;
      if (!g) return;
      const result = gameActions.resolveRound(g, win, MATCH_DEFAULTS.matchRounds);
      engineRef.current = null;
      setCombatants(null);
      setOverlay(result);
      syncGame(g);
    },
    [syncGame],
  );

  const startCombat = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.phase !== 'plan') return;
    if (!g.board.length) {
      pop(6, 1, 'PLACE A CREATURE', RUST, '12px');
      return;
    }
    makeFoeBoard(g);
    const mine = g.board.map((u) => combatant(u, 'me'));
    const theirs = g.foe.map((u) => combatant(u, 'foe'));
    applyTraits(mine);
    applyTraits(theirs);
    const engine = new CombatEngine(
      (r, c, text, color, size) => pop(r, c, text, color, size),
      (text) => {
        setBanner(text);
        setTimeout(() => setBanner(''), 1100);
      },
    );
    engine.C = mine.concat(theirs);
    engineRef.current = engine;
    setCombatants(engine.C);
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
  }, [clearTimer, pop, resolveCombat, syncGame]);

  const buy = useCallback(
    (i: number) => {
      const g = gameRef.current;
      if (!g) return;
      gameActions.buy(g, i);
      mergeUnits(g, (r, c, text) => pop(r, c, text));
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
      gameActions.tapUnit(g, u, from, MATCH_DEFAULTS.matchRounds);
      syncGame(g);
    },
    [syncGame],
  );

  const tapCell = useCallback(
    (r: number, c: number) => {
      const g = gameRef.current;
      if (!g) return;
      gameActions.tapCell(g, r, c, MATCH_DEFAULTS.matchRounds, (text) =>
        pop(6, 1, text, RUST, '12px'),
      );
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
    gameActions.nextRound(g, draft);
    setOverlay(null);
    setFloaters([]);
    syncGame(g);
  }, [draft, syncGame]);

  const offerRelics = useCallback(() => {
    setOverlay({ kind: 'relic', picks: pickRelics() });
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

  const autoDraft = useCallback(() => {
    const p = HEROES.map((h) => h.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
    saveDraft(p);
  }, [saveDraft]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    screen,
    setScreen,
    draft,
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
    cap: game ? cap(game.round) : 3,
  };
}

export type GameContext = ReturnType<typeof useGame>;
