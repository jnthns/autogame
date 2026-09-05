import { CLASSES } from '../data/classes';
import { BONE, INK, JADE, RUST, SAF, USER_DRAFT_MAX, costTone } from '../data/constants';
import { attackLabel, HERO_MAP } from '../data/heroes';
import { heroUnlocked, unlockCurrent, unlockLabel, unlockReq, type ProgressState } from '../data/progress';
import { spriteCss } from '../data/sprites';
import { PixelSprite } from './PixelSprite';

interface InspectModalProps {
  heroId: string;
  draft: string[];
  progress: ProgressState;
  onClose: () => void;
  onToggle: () => void;
}

export function InspectModal({ heroId, draft, progress, onClose, onToggle }: InspectModalProps) {
  const h = HERO_MAP[heroId];
  const on = draft.includes(heroId);
  const full = draft.length >= USER_DRAFT_MAX;
  const unlocked = heroUnlocked(heroId, progress);
  const req = unlockReq(heroId);
  const have = req ? unlockCurrent(req, progress) : 0;
  const need = req?.n ?? 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(14,13,10,.62)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          background: 'var(--om-card)',
          borderTop: '3px solid var(--om-ink)',
          padding: '18px 18px 26px',
          animation: 'omRise 0.22s ease both',
          maxHeight: '80%',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 64,
              height: 64,
              flex: '0 0 auto',
              border: '3px solid var(--om-ink)',
              background: costTone(h.cost),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PixelSprite src={spriteCss(h.id)} size={48} dimmed={!unlocked} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="slab" style={{ fontSize: 24, lineHeight: 1 }}>
              {h.name}
            </div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--om-muted)',
                marginTop: 3,
              }}
            >
              {h.origin} · {h.creature}
            </div>
            <div style={{ marginTop: 7, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  border: '2px solid var(--om-ink)',
                  padding: '2px 6px',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'var(--om-sky)',
                  color: BONE,
                }}
              >
                {CLASSES[h.heroClass].glyph} {h.heroClass}
              </span>
              <span
                style={{
                  border: '2px solid var(--om-ink)',
                  padding: '2px 6px',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: h.attack === 'melee' ? RUST : JADE,
                  color: BONE,
                }}
              >
                {attackLabel(h)}
              </span>
              {h.traits.map((t) => (
                <span
                  key={t}
                  style={{
                    border: '2px solid var(--om-ink)',
                    padding: '2px 6px',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {[
            { k: 'HP', v: h.hp },
            { k: 'ATK', v: h.dmg },
            { k: 'SPD', v: h.as.toFixed(2) },
            { k: 'CRIT', v: `${Math.round(h.crit * 100)}%` },
          ].map((st) => (
            <div
              key={st.k}
              style={{ border: '2px solid var(--om-ink)', padding: '6px 4px', textAlign: 'center', background: 'var(--om-surface-2)' }}
            >
              <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>
                {st.v}
              </div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--om-muted)',
                  marginTop: 1,
                }}
              >
                {st.k}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, border: '3px solid var(--om-ink)', background: INK, color: BONE, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 17, color: 'var(--om-saffron)' }}>✦</span>
            <span className="slab" style={{ fontSize: 16, color: 'var(--om-saffron)' }}>
              {h.ability}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.4, color: 'var(--om-disabled)', textWrap: 'pretty' }}>
            {h.abilityText}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--om-muted)',
            }}
          >
            Lore
          </div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45, color: 'var(--om-muted)', textWrap: 'pretty' }}>
            {h.lore}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--om-muted)',
            }}
          >
            {CLASSES[h.heroClass].glyph} {h.heroClass}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45, color: 'var(--om-muted)', textWrap: 'pretty' }}>
            {CLASSES[h.heroClass].desc}
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4, color: 'var(--om-muted)', textWrap: 'pretty' }}>{h.quirk}</div>
        {!unlocked && req && (
          <div style={{ marginTop: 12, border: '3px solid var(--om-ink)', padding: 12, background: 'var(--om-surface-2)' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--om-muted)',
              }}
            >
              Sealed omen
            </div>
            <div className="slab" style={{ fontSize: 16, lineHeight: 1.15, marginTop: 4 }}>
              {unlockLabel(req)}
            </div>
            <div style={{ marginTop: 8, height: 8, background: 'rgba(20,18,14,.15)', border: '2px solid var(--om-ink)' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (have / need) * 100)}%`, background: SAF }} />
            </div>
            <div className="mono" style={{ marginTop: 6, fontSize: 12, fontWeight: 700 }}>
              {have} / {need}
            </div>
          </div>
        )}
        <button
          type="button"
          className="btn-active-sm"
          onClick={unlocked ? onToggle : onClose}
          style={{
            marginTop: 16,
            width: '100%',
            background: !unlocked ? 'var(--om-muted)' : on ? RUST : full ? 'var(--om-disabled)' : JADE,
            color: !unlocked || on || !full ? BONE : 'var(--om-muted-2)',
            border: '3px solid var(--om-ink)',
            boxShadow: '4px 4px 0 var(--om-ink)',
            padding: 13,
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 19,
          }}
        >
          {!unlocked ? 'SEALED' : on ? 'REMOVE FROM ROSTER' : full ? 'ROSTER FULL' : 'ADD TO ROSTER'}
        </button>
      </div>
    </div>
  );
}
