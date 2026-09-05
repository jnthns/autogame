import { BATTLEGROUND_MAP } from '../../data/battlegrounds';
import { HERO_MAP } from '../../data/heroes';
import { RELIC_MAP } from '../../data/relics';
import { spriteCss } from '../../data/sprites';
import { GAUNTLET } from '../../data/constants';
import { rewardLines } from '../../game/hyperRoll';
import type { GameState, OverlayKind } from '../../game/types';
import { BattlegroundPreview } from '../BattlegroundPreview';
import { PixelSprite } from '../PixelSprite';

type BannerTone = 'good' | 'bad' | 'accent' | 'ink' | 'muted';

interface RelicChoice {
  glyph: string;
  name: string;
  desc: string;
  onTap?: () => void;
}

interface OverlayCopy {
  title: string;
  subtitle: string;
  body: string;
  tone: BannerTone;
  actionLabel: string;
  showAction: boolean;
  showSecondary: boolean;
  secondaryLabel: string;
  relics: RelicChoice[];
}

/** `streak` is signed: only a losing run is worth calling out. */
function streakNote(streak: number): string {
  return streak <= -2 ? ` — ${-streak} losses in a row, but the streak pays gold.` : '.';
}

function copyFor(
  overlay: OverlayKind,
  game: GameState,
  onChooseRelic: (id: string) => void,
  onBindRelic: (rid: string, unitId: string) => void,
): OverlayCopy {
  const base: OverlayCopy = {
    title: '',
    subtitle: '',
    body: '',
    tone: 'good',
    actionLabel: 'Continue',
    showAction: true,
    showSecondary: false,
    secondaryLabel: '',
    relics: [],
  };

  if (overlay.kind === 'result' && overlay.boss) {
    const b = overlay.boss;
    const gauntlet = game.mode === 'gauntlet';
    const lives = game.gauntletLives ?? 0;
    let body: string;
    if (gauntlet) {
      body =
        overlay.win && b.reward
          ? `The omen breaks. You claim ${rewardLines(b.reward).join(' · ')}. Choose a relic before the next wave.`
          : `You lose a life (${lives} remaining). Next shop phase starts with −◈${GAUNTLET.goldPenalty} gold from the toll.` +
            (lives <= 0 ? ' Your run ends here.' : ' Rally and fight again.');
    } else if (overlay.win && b.reward) {
      body = `The omen breaks. You claim ${rewardLines(b.reward).join(' · ')}. The Adversary's board is untouched.`;
    } else {
      body = `You take ${overlay.dmg} damage${streakNote(game.streak)} The match continues.`;
    }
    return {
      ...base,
      title: overlay.win ? `${b.name.toUpperCase()} FELLED` : `FELLED BY ${b.name.toUpperCase()}`,
      subtitle: overlay.win ? `Period ${b.period} spoil` : `Period ${b.period} · you still stand`,
      tone: overlay.win ? 'good' : 'bad',
      body,
      actionLabel: overlay.offer
        ? 'CLAIM RELIC'
        : gauntlet
          ? lives > 0
            ? 'NEXT BOSS'
            : 'END RUN'
          : 'NEXT ROUND',
    };
  }

  if (overlay.kind === 'result') {
    const streak = overlay.win ? game.foeStreak : game.streak;
    return {
      ...base,
      title: overlay.win ? 'ROUND WON' : overlay.offer ? 'ROUND LOST · A LESSER SPOIL' : 'ROUND LOST',
      subtitle: overlay.win ? 'The Adversary buckles' : 'The field turns on you',
      tone: overlay.win ? 'good' : 'bad',
      body: `${overlay.win ? 'The Adversary takes ' : 'You take '}${overlay.dmg} damage${streakNote(streak)}`,
      actionLabel: overlay.offer ? 'CLAIM RELIC' : 'NEXT ROUND',
    };
  }

  if (overlay.kind === 'relic') {
    return {
      ...base,
      title: 'SPOILS',
      subtitle: 'Choose one relic',
      tone: 'accent',
      body: 'Relics bind to a creature and persist for the rest of the match. Three per creature.',
      showAction: false,
      relics: overlay.picks.map((id) => {
        const r = RELIC_MAP[id];
        return { glyph: r.glyph, name: r.name, desc: r.desc, onTap: () => onChooseRelic(id) };
      }),
    };
  }

  if (overlay.kind === 'bind') {
    const rel = RELIC_MAP[overlay.rid];
    return {
      ...base,
      title: 'BIND RELIC',
      subtitle: rel.name,
      tone: 'accent',
      body: `${rel.desc} Pick the creature that carries it.`,
      showAction: false,
      relics: game.board
        .filter((u) => u.relics.length < 3)
        .map((u) => ({
          glyph: HERO_MAP[u.hid].glyph,
          name: `${HERO_MAP[u.hid].name} ${'★'.repeat(u.star)}`,
          desc: u.relics.length
            ? `Carrying ${u.relics.map((r) => RELIC_MAP[r].name).join(', ')}`
            : 'No relics yet',
          onTap: () => onBindRelic(overlay.rid, u.u),
        })),
    };
  }

  if (overlay.kind === 'spar') {
    return {
      ...base,
      title: overlay.win ? 'SPAR WON' : 'SPAR LOST',
      subtitle: 'Sandbox — nothing is at stake',
      tone: overlay.win ? 'good' : 'muted',
      body: 'Adjust the board and spar again. Gold and rerolls are free here.',
      actionLabel: 'BACK TO BOARD',
    };
  }

  const gauntlet = game.mode === 'gauntlet';
  return {
    ...base,
    title: gauntlet
      ? overlay.win
        ? 'GAUNTLET CLEARED'
        : 'GAUNTLET OVER'
      : overlay.win
        ? 'VICTORY'
        : 'DEFEAT',
    subtitle: gauntlet
      ? overlay.win
        ? `${game.gauntletRoundsCleared ?? game.round} bosses felled`
        : `${game.gauntletRoundsCleared ?? 0} bosses cleared · ${game.gauntletLives ?? 0} lives left`
      : overlay.win
        ? 'The Adversary is undone'
        : 'Your omens are spent',
    tone: overlay.win ? 'good' : 'ink',
    body: gauntlet
      ? overlay.win
        ? 'Every wave broken. Your omens stood against the endless trial.'
        : 'Three lives spent. The gauntlet claims another challenger — but milestones and best runs persist.'
      : overlay.win
        ? 'Your omens answered louder. Bot victories unseal what waits behind the veil.'
        : 'The Adversary outlasted your board. Redraft and try a different six.',
    actionLabel: 'PLAY AGAIN',
    showSecondary: true,
    secondaryLabel: 'Home',
  };
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
  const c = copyFor(overlay, game, onChooseRelic, onBindRelic);

  return (
    <div className="om-modal__scrim">
      <div className="om-modal">
        <div className={`om-card__banner om-card__banner--${c.tone}`}>
          <div className="slab om-card__banner-title">{c.title}</div>
          <div className="om-card__banner-sub">{c.subtitle}</div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div className="om-body">{c.body}</div>

          {overlay.kind === 'result' && overlay.win && overlay.boss?.reward && (
            <div className="om-tile om-reward-row">
              {rewardLines(overlay.boss.reward).map((line) => (
                <span key={line} className="slab om-reward-chip">
                  {line}
                </span>
              ))}
            </div>
          )}

          {overlay.kind === 'over' && overlay.win && !!overlay.unlocked?.length && (
            <div style={{ marginTop: 12 }}>
              <div className="om-section-label" style={{ marginBottom: 8 }}>
                Unsealed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overlay.unlocked.map((id) => (
                  <div key={id} className="om-tile om-unlock-row">
                    <PixelSprite src={spriteCss(id)} size={28} />
                    <span style={{ flex: 1 }}>
                      <span className="slab om-unlock-row__name">{HERO_MAP[id].name}</span>
                      <span className="om-unlock-row__meta">{HERO_MAP[id].traits.join(' · ')}</span>
                    </span>
                    <span className="om-unlock-row__mark">✦</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overlay.kind === 'over' && !!overlay.unlockedBattlegrounds?.length && (
            <div style={{ marginTop: 12 }}>
              <div className="om-section-label" style={{ marginBottom: 8 }}>
                Battleground unlocked
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overlay.unlockedBattlegrounds.map((id) => {
                  const b = BATTLEGROUND_MAP[id];
                  return (
                    <div key={id} className="om-tile om-unlock-row">
                      <div className="om-unlock-row__thumb">
                        <BattlegroundPreview id={id} />
                      </div>
                      <span style={{ flex: 1 }}>
                        <span className="slab om-unlock-row__name">{b?.name ?? id}</span>
                        <span className="om-unlock-row__meta">{b?.theme}</span>
                      </span>
                      <span className="om-unlock-row__mark">✦</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {c.relics.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.relics.map((r, i) => (
                <button key={i} type="button" className="om-relic-card btn-active-sm" onClick={r.onTap}>
                  <span className="om-relic-card__glyph">{r.glyph}</span>
                  <span style={{ flex: 1 }}>
                    <span className="slab om-unlock-row__name">{r.name}</span>
                    <span className="om-unlock-row__desc">{r.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {c.showAction && (
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
            {c.showSecondary && onSecondary && (
              <button type="button" className="om-btn" style={{ flex: 1 }} onClick={onSecondary}>
                {c.secondaryLabel}
              </button>
            )}
            <button
              type="button"
              className="om-btn om-btn--lg om-btn--primary btn-active-sm"
              style={{ flex: 1.4 }}
              onClick={onAction}
            >
              {c.actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
