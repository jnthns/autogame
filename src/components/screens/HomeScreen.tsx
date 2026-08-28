import { BONE, INK, JADE, SAF } from '../../data/constants';
import { HomeSpriteParade } from '../HomeSpriteParade';

interface HomeScreenProps {
  teamCount: number;
  unboundIds: string[];
  totalHeroes: number;
  wins: number;
  onPlay: () => void;
  onBuild: () => void;
  onSettings: () => void;
}

export function HomeScreen({ teamCount, unboundIds, totalHeroes, wins, onPlay, onBuild, onSettings }: HomeScreenProps) {
  const unbound = unboundIds.length;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(135deg,rgba(20,18,14,.045) 0 2px,transparent 2px 7px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -90,
          right: -90,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: JADE,
          opacity: 0.14,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          left: -110,
          width: 230,
          height: 230,
          background: SAF,
          opacity: 0.18,
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          width: 320,
          height: 320,
          marginLeft: -160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,163,23,.12) 0%, transparent 68%)',
          pointerEvents: 'none',
        }}
      />

      <div className="screen-header-home" style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            color: JADE,
          }}
        >
          An auto-battler of world myth
        </div>
        <div
          style={{
            marginTop: 14,
            display: 'inline-block',
            background: INK,
            padding: '12px 16px 14px',
            animation: 'omStamp 0.5s cubic-bezier(.2,.9,.3,1.2) both',
            boxShadow: '4px 4px 0 rgba(27,107,82,.35)',
          }}
        >
          <div className="slab" style={{ fontSize: 42, lineHeight: 0.88, color: BONE }}>
            TWELVE
            <br />
            <span style={{ color: SAF }}>OMENS</span>
          </div>
        </div>
        <div
            className="om-muted"
            style={{
              marginTop: 12,
              fontSize: 15,
              lineHeight: 1.35,
              maxWidth: 272,
              textWrap: 'pretty',
            }}
        >
          Twelve creatures to start. Twelve more wait behind the veil. Draft six. Earn the rest.
        </div>
      </div>

      <HomeSpriteParade unboundIds={unboundIds} />

      <div className="screen-footer" style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
        <button
          type="button"
          className="btn-active"
          onClick={onPlay}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: JADE,
            border: '3px solid #14120E',
            boxShadow: '5px 5px 0 #14120E',
            padding: 17,
          }}
        >
          <span style={{ fontSize: 29, lineHeight: 1, color: SAF }}>☰</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span className="slab" style={{ display: 'block', fontSize: 25, lineHeight: 1, color: BONE }}>
              PLAY
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 12,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(242,233,212,.7)',
              }}
            >
              Practice · Bot match
            </span>
          </span>
          <span style={{ fontSize: 22, color: SAF }}>›</span>
        </button>
        <button
          type="button"
          className="btn-active om-card"
          onClick={onBuild}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '3px solid var(--om-line)',
            boxShadow: '5px 5px 0 var(--om-line)',
            padding: 17,
          }}
        >
          <span style={{ fontSize: 29, lineHeight: 1, color: JADE }}>☷</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span className="slab" style={{ display: 'block', fontSize: 25, lineHeight: 1 }}>
              BUILD TEAM
            </span>
            <span
              className="om-muted"
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 12,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {teamCount} of 6 drafted
            </span>
          </span>
          <span style={{ fontSize: 22, color: JADE }}>›</span>
        </button>
        <button
          type="button"
          className="btn-active om-card"
          onClick={onSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '3px solid var(--om-line)',
            boxShadow: '5px 5px 0 var(--om-line)',
            padding: 17,
          }}
        >
          <span style={{ fontSize: 29, lineHeight: 1, color: JADE }}>⚙</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span className="slab" style={{ display: 'block', fontSize: 25, lineHeight: 1 }}>
              SETTINGS
            </span>
            <span
              className="om-muted"
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 12,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Battlegrounds · theme · trial
            </span>
          </span>
          <span style={{ fontSize: 22, color: JADE }}>›</span>
        </button>
        <div
          className="mono om-muted"
          style={{
            textAlign: 'center',
            marginTop: 4,
            fontSize: 11,
            letterSpacing: '0.16em',
          }}
        >
          {unbound}/{totalHeroes} UNBOUND · {wins} WIN{wins === 1 ? '' : 'S'}
        </div>
      </div>
    </div>
  );
}
