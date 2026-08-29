import { BONE, INK, JADE, RUST, SAF } from '../../data/constants';
import type { GauntletBestRun } from '../../game/gauntlet';
import type { Difficulty } from '../../game/types';

interface ModesScreenProps {
  onBack: () => void;
  onPractice: () => void;
  onBot: () => void;
  onMarathon: () => void;
  onGauntlet: () => void;
  difficulty: Difficulty;
  gauntletBest?: GauntletBestRun;
}
const DIFFICULTY_TAG: Record<Difficulty, string> = {
  normal: 'Mortal',
  hard: 'Hard',
  mythic: 'Mythic',
};

export function ModesScreen({
  onBack,
  onPractice,
  onBot,
  onMarathon,
  onGauntlet,
  difficulty,
  gauntletBest,
}: ModesScreenProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        className="screen-header-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '3px solid var(--om-line)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 34,
            height: 34,
            border: '2px solid var(--om-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 19,
          }}
        >
          ‹
        </button>
        <div className="slab" style={{ fontSize: 22, lineHeight: 1 }}>
          CHOOSE A TRIAL
        </div>
      </div>
      <div className="modes-list" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>
        <button
          type="button"
          className="btn-active om-card"
          onClick={onPractice}
          style={{ textAlign: 'left', border: '3px solid var(--om-line)', boxShadow: '5px 5px 0 var(--om-line)', overflow: 'hidden' }}
        >
          <div
            style={{
              background: SAF,
              borderBottom: '3px solid #14120E',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span className="slab" style={{ fontSize: 24, lineHeight: 1 }}>
              PRACTICE
            </span>
            <span style={{ fontSize: 25 }}>◇</span>
          </div>
          <div className="om-muted" style={{ padding: '14px 16px 12px', fontSize: 15, lineHeight: 1.4 }}>
            Sandbox. Infinite gold, free rerolls, no opponent. Test placements, merges and traits for as long as you like.
          </div>
        </button>
        <button
          type="button"
          className="btn-active om-card"
          onClick={onBot}
          style={{ textAlign: 'left', border: '3px solid var(--om-line)', boxShadow: '5px 5px 0 var(--om-line)', overflow: 'hidden' }}
        >
          <div
            style={{
              background: JADE,
              borderBottom: '3px solid #14120E',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span className="slab" style={{ fontSize: 24, lineHeight: 1, color: BONE }}>
              HYPER ROLL
            </span>
            <span style={{ fontSize: 25, color: SAF }}>◈</span>
          </div>
          <div className="om-muted" style={{ padding: '14px 16px 12px', fontSize: 15, lineHeight: 1.4 }}>
            Thirteen rounds against the Adversary. Period bosses on 4, 8 and 12; round 13 is the final fight. Wins unseal sealed omens — some ask for a synergy, not just a count.
          </div>
          <div style={{ display: 'flex', gap: 7, padding: '0 16px 16px', flexWrap: 'wrap' }}>
            {['Hyper roll', 'Period bosses', 'Relics', 'Unseals', DIFFICULTY_TAG[difficulty]].map((tag) => (
              <span
                key={tag}
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                  border: '2px solid var(--om-line)',
                  padding: '3px 7px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
        <button
          type="button"
          className="btn-active om-card"
          onClick={onMarathon}
          style={{ textAlign: 'left', border: '3px solid var(--om-line)', boxShadow: '5px 5px 0 var(--om-line)', overflow: 'hidden' }}
        >
          <div
            style={{
              background: RUST,
              borderBottom: '3px solid #14120E',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span className="slab" style={{ fontSize: 24, lineHeight: 1, color: BONE }}>
              MARATHON
            </span>
            <span style={{ fontSize: 25, color: SAF }}>∞</span>
          </div>
          <div className="om-muted" style={{ padding: '14px 16px 12px', fontSize: 15, lineHeight: 1.4 }}>
            Eighteen rounds against the Adversary. Creatures hold 50% more health. No period bosses — pure endurance. Wins still unseal omens.
          </div>
          <div style={{ display: 'flex', gap: 7, padding: '0 16px 16px', flexWrap: 'wrap' }}>
            {['18 rounds', '+50% HP', 'Unseals', DIFFICULTY_TAG[difficulty]].map((tag) => (
              <span
                key={tag}
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                  border: '2px solid var(--om-line)',
                  padding: '3px 7px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
        <button
          type="button"
          className="btn-active om-card"
          onClick={onGauntlet}
          style={{ textAlign: 'left', border: '3px solid var(--om-line)', boxShadow: '5px 5px 0 var(--om-line)', overflow: 'hidden' }}
        >
          <div
            style={{
              background: INK,
              borderBottom: '3px solid #14120E',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span className="slab" style={{ fontSize: 24, lineHeight: 1, color: BONE }}>
              THE GAUNTLET
            </span>
            <span style={{ fontSize: 25, color: SAF }}>☠</span>
          </div>
          <div className="om-muted" style={{ padding: '14px 16px 12px', fontSize: 15, lineHeight: 1.4 }}>
            Endless boss waves. Three lives, full shop between fights, a relic after every win. Reach round 20 or 40 to unseal cost-4 and cost-5 omens forever.
          </div>
          <div style={{ display: 'flex', gap: 7, padding: '0 16px 16px', flexWrap: 'wrap' }}>
            {[
              'Endless',
              '3 lives',
              'Boss scaling',
              gauntletBest ? `Best R${gauntletBest.round}` : 'No best yet',
              DIFFICULTY_TAG[difficulty],
            ].map((tag) => (
              <span
                key={tag}
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                  border: '2px solid var(--om-line)',
                  padding: '3px 7px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
        <div
          className="modes-list-note om-muted"
          style={{
            padding: 14,
            border: '2px dashed var(--om-muted)',
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          Your shop only rolls the <strong style={{ color: 'var(--om-fg)' }}>six</strong> creatures you drafted. Two of the same star on the board or bench merge into the next star. Draft narrow to hit 3★ fast; draft wide for trait depth.
        </div>
      </div>
    </div>
  );
}
