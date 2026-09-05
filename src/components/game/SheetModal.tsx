import { STARMUL } from '../../data/constants';
import { attackLabel, HERO_MAP } from '../../data/heroes';
import { RELIC_MAP } from '../../data/relics';
import { spriteCss } from '../../data/sprites';
import { classCard, classCounts, traitCard, traitCounts } from '../../game/engine';
import type { GameState, SheetState } from '../../game/types';
import { PixelSprite } from '../PixelSprite';

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
      <div className="om-sheet__scrim" onClick={onClose}>
        <div className="om-sheet" onClick={(e) => e.stopPropagation()}>
          <SheetHeader title="SYNERGIES" subtitle={`Board of ${game.board.length}`} onClose={onClose} isTraits />
          <div className="om-sheet__body" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {classNames.length > 0 && (
              <>
                <div className="om-section-label">Classes</div>
                {classNames.map((n) => (
                  <TraitCardBlock key={`class-${n}`} card={classCard(n, classBoard)} showDesc />
                ))}
              </>
            )}
            {traitNames.length > 0 && (
              <>
                <div className="om-section-label" style={{ marginTop: classNames.length ? 8 : 0 }}>
                  Myth traits
                </div>
                {traitNames.map((n) => (
                  <TraitCardBlock key={`trait-${n}`} card={traitCard(n, traitBoard)} showDesc />
                ))}
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
    <div className="om-sheet__scrim" onClick={onClose}>
      <div className="om-sheet" onClick={(e) => e.stopPropagation()}>
        <SheetHeader
          title={`${h.name} ${'★'.repeat(sheet.star)}`}
          subtitle={`${sheet.side === 'foe' ? 'Adversary · ' : ''}${h.origin} · ${h.creature}`}
          onClose={onClose}
          sprite={spriteCss(sheet.hid)}
        />
        <div className="om-sheet__body">
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

          <div className="om-ability-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="slab om-ability-card__name">✦ {h.ability}</span>
              <span className="mono om-ability-card__mana">100 MANA</span>
            </div>
            <div className="om-ability-card__text">{h.abilityText}</div>
            <div className="om-ability-card__note">
              At ★{sheet.star} every number above is multiplied by {m}× · {attackLabel(h)} only · {h.quirk}
            </div>
          </div>

          <div className="om-section-label" style={{ marginTop: 14 }}>
            Class on this creature
          </div>
          <div style={{ marginTop: 7 }}>
            <TraitCardBlock card={classCard(h.heroClass, classBoard)} showDesc />
          </div>

          <div className="om-section-label" style={{ marginTop: 14 }}>
            Myth traits on this creature
          </div>
          <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {h.traits.map((t) => (
              <TraitCardBlock key={t} card={traitCard(t, traitBoard)} />
            ))}
          </div>

          {sheet.relics.length > 0 && (
            <>
              <div className="om-section-label" style={{ marginTop: 14 }}>
                Relics carried
              </div>
              <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sheet.relics.map((r) => {
                  const rel = RELIC_MAP[r];
                  return (
                    <div key={r} className="om-tile" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="om-relic-card__glyph">{rel.glyph}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{rel.name}</span>
                      <span className="om-muted" style={{ flex: 1, fontSize: 12, textAlign: 'right' }}>
                        {rel.desc}
                      </span>
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
    <div className="om-sheet__header">
      <div className="om-sheet__avatar">
        {isTraits ? <span aria-hidden>✦</span> : sprite && <PixelSprite src={sprite} size={48} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="slab om-sheet__title">{title}</div>
        <div className="om-sheet__subtitle">{subtitle}</div>
      </div>
      <button type="button" className="om-sheet__close" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="om-statbox">
      <div className="om-statbox__value">{value}</div>
      <div className="om-statbox__label">{label}</div>
    </div>
  );
}

export function TraitCardBlock({
  card,
  showDesc,
}: {
  card: ReturnType<typeof traitCard>;
  showDesc?: boolean;
}) {
  return (
    <div className="om-trait-card" style={{ background: card.cardBg }}>
      <div className="om-trait-card__head" style={{ background: card.headBg, color: card.headFg }}>
        <span style={{ fontSize: 14 }}>{card.glyph}</span>
        <span className="slab" style={{ flex: 1, fontSize: 14 }}>
          {card.name}
        </span>
        <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>
          {card.countLabel}
        </span>
      </div>
      <div className="om-trait-card__body">
        {showDesc && (
          <div className="om-muted" style={{ fontSize: 12, lineHeight: 1.3, marginBottom: 5 }}>
            {card.desc}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {card.tiers.map((tr) => (
            <div key={tr.n} className="om-trait-card__tier" style={{ color: tr.fg }}>
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
