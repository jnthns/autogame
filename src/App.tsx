import { useGame } from './hooks/useGame';
import { InspectModal } from './components/InspectModal';
import { BuildScreen } from './components/screens/BuildScreen';
import { GameScreen, OverlayModal, SheetModal } from './components/screens/GameScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ModesScreen } from './components/screens/ModesScreen';

export default function App() {
  const game = useGame();

  const handleOverlayAction = () => {
    if (!game.overlay || !game.game) return;
    if (game.overlay.kind === 'result') {
      if (game.overlay.offer) game.offerRelics();
      else game.nextRound();
    } else if (game.overlay.kind === 'spar') {
      game.nextRound();
    } else if (game.overlay.kind === 'over') {
      game.startGame(game.game.mode);
    }
  };

  return (
    <div className="app-shell">
      <div className="phone">
        {game.screen === 'home' && (
          <HomeScreen
            teamCount={game.draft.length}
            onPlay={() => game.setScreen('modes')}
            onBuild={() => game.setScreen('build')}
          />
        )}
        {game.screen === 'modes' && (
          <ModesScreen
            onBack={() => game.setScreen('home')}
            onPractice={() => game.startGame('practice')}
            onBot={() => game.startGame('bot')}
          />
        )}
        {game.screen === 'build' && (
          <BuildScreen
            draft={game.draft}
            onBack={() => game.setScreen('home')}
            onAutoDraft={game.autoDraft}
            onToBattle={() => game.setScreen('modes')}
            onInspect={game.setInspectId}
          />
        )}
        {game.screen === 'game' && game.game && (
          <>
            <GameScreen
              game={game.game}
              combatants={game.combatants}
              floaters={game.floaters}
              banner={game.banner}
              boardCap={game.cap}
              onQuit={game.quitGame}
              onTapCell={game.tapCell}
              onTapBench={(u) => game.tapUnit(u, 'bench')}
              onTapBoard={(u) => game.tapUnit(u, 'board')}
              onBuy={game.buy}
              onReroll={game.reroll}
              onStartCombat={game.startCombat}
              onSell={game.sell}
              onInfo={() => {
                const g = game.game!;
                if (!g.sel) return;
                const list = g.sel.from === 'bench' ? g.bench : g.board;
                const u = list.find((x) => x.u === g.sel!.u);
                if (u) game.setSheet({ kind: 'hero', hid: u.hid, star: u.star, relics: u.relics.slice(), side: 'me' });
              }}
              onToggleSpeed={game.toggleSpeed}
              onOpenTraits={() => game.setSheet({ kind: 'traits' })}
              onOpenSheet={(u) =>
                game.setSheet({ kind: 'hero', hid: u.hid, star: u.star, relics: u.relics.slice(), side: 'me' })
              }
            />
            {game.sheet && <SheetModal sheet={game.sheet} game={game.game} onClose={() => game.setSheet(null)} />}
            {game.overlay && (
              <OverlayModal
                overlay={game.overlay}
                game={game.game}
                onAction={handleOverlayAction}
                onSecondary={game.quitGame}
                onChooseRelic={game.chooseRelic}
                onBindRelic={game.bindRelic}
              />
            )}
          </>
        )}
        {game.inspectId && (
          <InspectModal
            heroId={game.inspectId}
            draft={game.draft}
            onClose={() => game.setInspectId(null)}
            onToggle={() => {
              game.toggleHero(game.inspectId!);
              game.setInspectId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
