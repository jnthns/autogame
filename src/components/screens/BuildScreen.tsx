import { BONE, INK, JADE, SAF, costTone } from '../../data/constants';
import { HEROES } from '../../data/heroes';
import { spriteCss } from '../../data/sprites';
import { activeTraits } from '../../game/engine';
import { PixelSprite } from '../PixelSprite';

interface BuildScreenProps {
  draft: string[];
  onBack: () => void;
  onAutoDraft: () => void;
  onToBattle: () => void;
  onInspect: (id: string) => void;
}

export function BuildScreen({ draft, onBack, onAutoDraft, onToBattle, onInspect }: BuildScreenProps) {
  const full = draft.length >= 6;
  const traits = activeTraits(draft).filter((t) => t.lvl > 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '46px 16px 12px',
          borderBottom: '3px solid #14120E',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 34,
            height: 34,
            border: '2px solid #14120E',
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
              color: '#6b6455',
              marginTop: 3,
            }}
          >
            {draft.length} / 6 chosen
          </div>
        </div>
        <button
          type="button"
          onClick={onAutoDraft}
          style={{
            border: '2px solid #14120E',
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
          borderBottom: '2px solid #14120E',
          background: '#e7dcc2',
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
                border: '2px solid #14120E',
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
                <span style={{ fontSize: 20, lineHeight: '24px', color: '#a99f86' }}>+</span>
              )}
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: h ? SAF : '#a99f86',
                }}
              >
                {h ? h.name.slice(0, 7) : 'empty'}
              </span>
            </button>
          );
        })}
      </div>

      {traits.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '9px 14px',
            borderBottom: '2px solid #14120E',
            overflowX: 'auto',
            background: BONE,
          }}
        >
          {traits.map((t) => (
            <div
              key={t.name}
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                border: '2px solid #14120E',
                padding: '3px 7px',
                background: t.lvl > 1 ? SAF : INK,
              }}
            >
              <span style={{ fontSize: 13, color: t.lvl > 1 ? INK : BONE }}>{t.glyph}</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: t.lvl > 1 ? INK : BONE,
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
        {HEROES.map((h) => {
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
                border: '3px solid #14120E',
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
                  borderBottom: '2px solid #14120E',
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
                    color: on ? '#a99f86' : '#6b6455',
                  }}
                >
                  {h.traits.join(' · ')}
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
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 14px 18px',
          background: BONE,
          borderTop: '3px solid #14120E',
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
            border: '2px solid #14120E',
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
            background: full ? JADE : '#cfc3a6',
            color: full ? BONE : '#8a8271',
            border: '3px solid #14120E',
            boxShadow: '4px 4px 0 #14120E',
            padding: 12,
            fontFamily: "'Alfa Slab One', serif",
            fontSize: 19,
          }}
        >
          {full ? 'TO BATTLE' : `PICK ${6 - draft.length} MORE`}
        </button>
      </div>
    </div>
  );
}
