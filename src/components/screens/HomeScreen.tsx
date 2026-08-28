import { BONE, INK, JADE, SAF } from '../../data/constants';

interface HomeScreenProps {
  teamCount: number;
  onPlay: () => void;
  onBuild: () => void;
}

export function HomeScreen({ teamCount, onPlay, onBuild }: HomeScreenProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
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
      <div style={{ padding: '56px 26px 0', position: 'relative' }}>
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
            marginTop: 18,
            display: 'inline-block',
            background: INK,
            padding: '14px 18px 16px',
            animation: 'omStamp 0.5s cubic-bezier(.2,.9,.3,1.2) both',
          }}
        >
          <div className="slab" style={{ fontSize: 46, lineHeight: 0.88, color: BONE }}>
            TWELVE
            <br />
            <span style={{ color: SAF }}>OMENS</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 16,
            lineHeight: 1.35,
            color: '#4a4436',
            maxWidth: 272,
            textWrap: 'pretty',
          }}
        >
          Twelve creatures out of twelve mythologies. Draft six. Roll, merge, and set them on the field.
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 22px 30px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
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
          className="btn-active"
          onClick={onBuild}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: BONE,
            border: '3px solid #14120E',
            boxShadow: '5px 5px 0 #14120E',
            padding: 17,
          }}
        >
          <span style={{ fontSize: 29, lineHeight: 1, color: JADE }}>☷</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span className="slab" style={{ display: 'block', fontSize: 25, lineHeight: 1 }}>
              BUILD TEAM
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 12,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#6b6455',
              }}
            >
              {teamCount} of 6 drafted
            </span>
          </span>
          <span style={{ fontSize: 22, color: JADE }}>›</span>
        </button>
        <div
          className="mono"
          style={{
            display: 'flex',
            gap: 7,
            justifyContent: 'center',
            marginTop: 8,
            fontSize: 11,
            letterSpacing: '0.24em',
            color: '#9c937d',
          }}
        >
          ☰ ☱ ☲ ☳ ☴ ☵ ☶ ☷
        </div>
      </div>
    </div>
  );
}
