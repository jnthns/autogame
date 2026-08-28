import { BONE, INK, JADE, SAF } from '../../data/constants';

interface ModesScreenProps {
  onBack: () => void;
  onPractice: () => void;
  onBot: () => void;
}

export function ModesScreen({ onBack, onPractice, onBot }: ModesScreenProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '46px 20px 14px',
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
        <div className="slab" style={{ fontSize: 22, lineHeight: 1 }}>
          CHOOSE A TRIAL
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          type="button"
          className="btn-active"
          onClick={onPractice}
          style={{ textAlign: 'left', border: '3px solid #14120E', boxShadow: '5px 5px 0 #14120E', overflow: 'hidden' }}
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
            <span style={{ fontSize: 25 }}>☴</span>
          </div>
          <div style={{ padding: '14px 16px 16px', fontSize: 15, lineHeight: 1.4, color: '#4a4436' }}>
            Sandbox. Infinite gold, free rerolls, no opponent. Test placements, merges and traits for as long as you like.
          </div>
        </button>
        <button
          type="button"
          className="btn-active"
          onClick={onBot}
          style={{ textAlign: 'left', border: '3px solid #14120E', boxShadow: '5px 5px 0 #14120E', overflow: 'hidden' }}
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
              BOT MATCH
            </span>
            <span style={{ fontSize: 25, color: SAF }}>☳</span>
          </div>
          <div style={{ padding: '14px 16px 12px', fontSize: 15, lineHeight: 1.4, color: '#4a4436' }}>
            Twelve rounds against the Adversary. 100 health each. Round losses compound — three in a row and the field will end you.
          </div>
          <div style={{ display: 'flex', gap: 7, padding: '0 16px 16px', flexWrap: 'wrap' }}>
            {['Hyper roll', 'Relics', '3★ merges'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                  border: '2px solid #14120E',
                  padding: '3px 7px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
        <div
          style={{
            padding: 14,
            border: '2px dashed #b3a98f',
            fontSize: 14,
            lineHeight: 1.4,
            color: '#6b6455',
          }}
        >
          Your shop only rolls the <strong style={{ color: INK }}>six</strong> creatures you drafted. Draft narrow to hit 3★ fast; draft wide for trait depth.
        </div>
      </div>
    </div>
  );
}
