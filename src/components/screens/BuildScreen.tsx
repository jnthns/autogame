import { BONE, INK, JADE, SAF, USER_DRAFT_MAX, costTone } from '../../data/constants';
import { HEROES } from '../../data/heroes';
import { heroUnlocked, unlockCurrent, unlockLabel, unlockReq, type ProgressState } from '../../data/progress';
import { spriteCss } from '../../data/sprites';
import { CLASSES } from '../../data/classes';
import { activeSynergies } from '../../game/engine';
import { PixelSprite } from '../PixelSprite';

interface BuildScreenProps {
  draft: string[];
  progress: ProgressState;
  onBack: () => void;
  onAutoDraft: () => void;
  onToBattle: () => void;
  onInspect: (id: string) => void;
}

export function BuildScreen({
  draft,
  progress,
  onBack,
  onAutoDraft,
  onToBattle,
  onInspect,
}: BuildScreenProps) {
  const full = draft.length >= USER_DRAFT_MAX;
  const synergies = activeSynergies(draft).filter((t) => t.lvl > 0);
  const unbound = HEROES.filter((h) => heroUnlocked(h.id, progress));
  const sealed = HEROES.filter((h) => !heroUnlocked(h.id, progress));

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
            border: '2px solid var(--om-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 19,
          }}
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="slab" style={{ fontSize: 21, lineHeight: 1 }}>
            BUILD TEAM
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
            {draft.length} / {USER_DRAFT_MAX} chosen · {unbound.length} / {HEROES.length} unbound
          </div>
        </div>
        <button
          type="button"
          onClick={onAutoDraft}
          style={{
            border: '2px solid var(--om-ink)',
            padding: '6px 10px',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Random
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 5,
          padding: '10px 14px',
          borderBottom: '2px solid var(--om-ink)',
          background: 'var(--om-surface-2)',
          overflowX: 'auto',
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const id = draft[i];
          const h = id ? HEROES.find((x) => x.id === id) : null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => h && onInspect(h.id)}
              style={{
                flex: 1,
                minWidth: 52,
                height: 56,
                border: '2px solid var(--om-ink)',
                background: h ? INK : BONE,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              {h ? (
                <PixelSprite src={spriteCss(h.id)} size={24} />
              ) : (
                <span style={{ fontSize: 20, lineHeight: '24px', color: 'var(--om-muted-2)' }}>+</span>
              )}
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: h ? SAF : 'var(--om-muted-2)',
                }}
              >
                {h ? h.name.slice(0, 7) : 'empty'}
              </span>
            </button>
          );
        })}
      </div>

      {synergies.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '9px 14px',
            borderBottom: '2px solid var(--om-ink)',
            overflowX: 'auto',
            background: 'var(--om-card)',
          }}
        >
          {synergies.map((t) => (
            <div
              key={`${t.kind}-${t.name}`}
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                border: '2px solid var(--om-ink)',
                padding: '3px 7px',
                background: t.lvl > 1 ? (t.kind === 'class' ? 'var(--om-sky)' : SAF) : INK,
              }}
            >
              <span style={{ fontSize: 13, color: t.lvl > 1 ? (t.kind === 'class' ? BONE : INK) : BONE }}>{t.glyph}</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: t.lvl > 1 ? (t.kind === 'class' ? BONE : INK) : BONE,
                }}
              >
                {t.name} {t.count}
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px 100px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoRows: 'max-content',
          gap: 10,
          alignContent: 'start',
        }}
      >
        {unbound.map((h) => {
          const on = draft.includes(h.id);
          const tone = costTone(h.cost);
          return (
            <button
              key={h.id}
              type="button"
              className="btn-active-sm"
              onClick={() => onInspect(h.id)}
              style={{
                textAlign: 'left',
                border: '3px solid var(--om-ink)',
                background: on ? INK : BONE,
                boxShadow: on ? `4px 4px 0 ${SAF}` : '3px 3px 0 rgba(20,18,14,.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 9px',
                  background: on ? SAF : tone,
                  borderBottom: '2px solid var(--om-ink)',
                }}
              >
                <span className="mono" style={{ fontWeight: 700, fontSize: 11, color: on ? INK : BONE }}>
                  ◈ {h.cost}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: on ? INK : BONE,
                  }}
                >
                  {h.origin}
                </span>
              </div>
              <div
                style={{
                  padding: '10px 9px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 62,
                }}
              >
                <PixelSprite src={spriteCss(h.id)} size={48} />
              </div>
              <div style={{ padding: '0 9px 9px' }}>
                <div className="slab" style={{ fontSize: 15, lineHeight: 1.05, color: on ? BONE : INK }}>
                  {h.name}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: on ? 'var(--om-muted-2)' : 'var(--om-muted)',
                  }}
                >
                  {CLASSES[h.heroClass].glyph} {h.heroClass} · {h.traits.join(' · ')}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        height: 5,
                        background:
                          i < Math.round(h.dmg / 25) ? (on ? SAF : INK) : 'rgba(20,18,14,.15)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
        {sealed.length > 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              marginTop: 4,
              padding: '8px 2px 2px',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span className="slab" style={{ fontSize: 16, lineHeight: 1 }}>
              SEALED
            </span>
            <span
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--om-muted)',
              }}
            >
              Win bot matches to unseal
            </span>
          </div>
        )}
        {sealed.map((h) => {
          const req = unlockReq(h.id);
          const have = req ? unlockCurrent(req, progress) : 0;
          const need = req?.n ?? 1;
          return (
            <button
              key={h.id}
              type="button"
              className="btn-active-sm"
              onClick={() => onInspect(h.id)}
              style={{
                textAlign: 'left',
                border: '3px solid var(--om-ink)',
                background: 'var(--om-surface-2)',
                boxShadow: '3px 3px 0 rgba(20,18,14,.18)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                opacity: 0.92,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 9px',
                  background: 'var(--om-muted)',
                  borderBottom: '2px solid var(--om-ink)',
                }}
              >
                <span className="mono" style={{ fontWeight: 700, fontSize: 11, color: BONE }}>
                  ⊘ LOCKED
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: BONE,
                  }}
                >
                  {have}/{need}
                </span>
              </div>
              <div
                style={{
                  padding: '10px 9px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 62,
                  position: 'relative',
                }}
              >
                <PixelSprite src={spriteCss(h.id)} size={48} dimmed />
              </div>
              <div style={{ padding: '0 9px 9px' }}>
                <div className="slab" style={{ fontSize: 15, lineHeight: 1.05, color: 'var(--om-muted)' }}>
                  {h.name}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: 'var(--om-muted)',
                  }}
                >
                  {CLASSES[h.heroClass].glyph} {h.heroClass} · {h.traits.join(' · ')}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    lineHeight: 1.3,
                    color: 'var(--om-muted)',
                    fontWeight: 600,
                  }}
                >
                  {req ? unlockLabel(req) : 'Sealed'}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 3, height: 5 }}>
                  <span
                    style={{
                      width: `${Math.min(100, (have / need) * 100)}%`,
                      background: SAF,
                    }}
                  />
                  <span style={{ flex: 1, background: 'rgba(20,18,14,.15)' }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 14px 18px',
          background: 'var(--om-card)',
          borderTop: '3px solid var(--om-ink)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: '0 0 auto',
            border: '2px solid var(--om-ink)',
            padding: '12px 14px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: 13,
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="btn-active-sm"
          disabled={!full}
          onClick={onToBattle}
          style={{
            flex: 1,
            background: full ? JADE : 'var(--om-disabled)',
            color: full ? BONE : 'var(--om-muted-2)',
            border: '3px solid var(--om-ink)',
            boxShadow: '4px 4px 0 var(--om-ink)',
            padding: 12,
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 19,
          }}
        >
          {full ? 'TO BATTLE' : `PICK ${USER_DRAFT_MAX - draft.length} MORE`}
        </button>
      </div>
    </div>
  );
}
