import type { ReactNode } from 'react';
import {
  attackGeometry,
  cellCenterPct,
  getFxProfile,
  lungePush,
  type FxProfile,
} from '../game/combatFx';
import type { CombatFx, CombatFxKind } from '../game/types';

interface CombatFxLayerProps {
  fx: CombatFx[];
}

const INK = '#14120E';

function Pos({
  left,
  top,
  children,
  zIndex = 27,
}: {
  left: number;
  top: number;
  children: ReactNode;
  zIndex?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex,
      }}
    >
      {children}
    </div>
  );
}

function RotatedBolt({
  from,
  len,
  angle,
  height,
  color,
  glow,
  anim,
  crit,
}: {
  from: { left: number; top: number };
  len: number;
  angle: number;
  height: number;
  color: string;
  glow?: string;
  anim: string;
  crit?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${from.left}%`,
        top: `${from.top}%`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
        zIndex: 27,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: `${Math.max(len, 8)}%`,
          height,
          background: color,
          boxShadow: `0 0 0 1px ${INK}${glow ? `, 0 0 8px ${glow}` : ''}${crit ? ', 0 0 6px rgba(232,163,23,.8)' : ''}`,
          transformOrigin: '0 50%',
          animation: `${anim} 0.24s ease-out forwards`,
        }}
      />
    </div>
  );
}

function ZigzagBolt({ from, len, angle, profile, crit }: { from: { left: number; top: number }; len: number; angle: number; profile: FxProfile; crit?: boolean }) {
  const segs = 5;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${from.left}%`,
        top: `${from.top}%`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
        zIndex: 27,
        pointerEvents: 'none',
        animation: 'omZigzag 0.28s ease-out forwards',
      }}
    >
      {Array.from({ length: segs }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${(i / segs) * Math.max(len, 8)}%`,
            top: i % 2 ? -4 : 4,
            width: `${Math.max(len, 8) / segs + 2}%`,
            height: crit ? 3 : 2,
            background: profile.bolt,
            boxShadow: `0 0 0 1px ${INK}, 0 0 6px ${profile.glow}`,
            transform: `rotate(${i % 2 ? 35 : -35}deg)`,
            transformOrigin: '0 50%',
          }}
        />
      ))}
    </div>
  );
}

function CoilBolt({ from, len, angle, profile }: { from: { left: number; top: number }; len: number; angle: number; profile: FxProfile }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${from.left}%`,
        top: `${from.top}%`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
        zIndex: 27,
        pointerEvents: 'none',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${i * 3}%`,
            top: i === 1 ? -3 : i === 2 ? 3 : 0,
            width: `${Math.max(len, 8) - i * 2}%`,
            height: 3,
            borderRadius: '50%',
            borderTop: `3px solid ${profile.bolt}`,
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            boxShadow: `0 0 4px ${profile.glow}`,
            animation: `omCoil ${0.22 + i * 0.04}s ease-out forwards`,
            opacity: 0.9 - i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

function WispBolt({ from, target, profile }: { from: { left: number; top: number }; target: { left: number; top: number }; profile: FxProfile }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${from.left + (target.left - from.left) * (0.2 + i * 0.25)}%`,
            top: `${from.top + (target.top - from.top) * (0.2 + i * 0.25) + (i - 1) * 2}%`,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: profile.bolt,
            border: `2px solid ${INK}`,
            boxShadow: `0 0 6px ${profile.glow}`,
            animation: 'omWisp 0.32s ease-out forwards',
            zIndex: 28,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

function HitFlash({ target, profile, size, anim = 'omHitFlash' }: { target: { left: number; top: number }; profile: FxProfile; size: number; anim?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${target.left}%`,
        top: `${target.top}%`,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: profile.flash,
        border: `2px solid ${INK}`,
        animation: `${anim} 0.24s ease-out forwards`,
        zIndex: 26,
        pointerEvents: 'none',
      }}
    />
  );
}

function WebHit({ target, profile, size }: { target: { left: number; top: number }; profile: FxProfile; size: number }) {
  return (
    <Pos left={target.left} top={target.top} zIndex={29}>
      <div style={{ position: 'relative', width: size, height: size, animation: 'omWeb 0.28s ease-out forwards' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: size * 0.45,
              height: 2,
              marginLeft: -(size * 0.45) / 2,
              marginTop: -1,
              background: profile.slash,
              boxShadow: `0 0 0 1px ${INK}`,
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: '100% 50%',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 0.55,
            height: size * 0.55,
            marginLeft: -(size * 0.55) / 2,
            marginTop: -(size * 0.55) / 2,
            borderRadius: '50%',
            border: `2px solid ${profile.bolt}`,
            opacity: 0.7,
          }}
        />
      </div>
    </Pos>
  );
}

function SplashHit({ target, profile }: { target: { left: number; top: number }; profile: FxProfile }) {
  return (
    <Pos left={target.left} top={target.top} zIndex={29}>
      <div style={{ position: 'relative', width: 28, height: 28, animation: 'omSplash 0.26s ease-out forwards' }}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <span
            key={deg}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 6,
              height: 6,
              marginLeft: -3,
              marginTop: -3,
              borderRadius: '50%',
              background: profile.bolt,
              border: `1px solid ${INK}`,
              transform: `rotate(${deg}deg) translateY(-10px)`,
            }}
          />
        ))}
      </div>
    </Pos>
  );
}

function EmberHit({ target, profile, crit }: { target: { left: number; top: number }; profile: FxProfile; crit?: boolean }) {
  return (
    <>
      <HitFlash target={target} profile={profile} size={crit ? 30 : 24} anim="omEmberFlash" />
      <Pos left={target.left} top={target.top} zIndex={29}>
        <div style={{ position: 'relative', width: 22, height: 22, animation: 'omEmber 0.3s ease-out forwards' }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${20 + (i % 2) * 30}%`,
                top: `${10 + i * 18}%`,
                width: 5,
                height: 7,
                background: i % 2 ? profile.glow : profile.bolt,
                border: `1px solid ${INK}`,
                borderRadius: '40% 40% 20% 20%',
              }}
            />
          ))}
        </div>
      </Pos>
    </>
  );
}

function RuneHit({ target, profile, melee }: { target: { left: number; top: number }; profile: FxProfile; melee: boolean }) {
  const sz = melee ? 24 : 20;
  return (
    <Pos left={target.left} top={target.top} zIndex={29}>
      <div
        style={{
          position: 'relative',
          width: sz,
          height: sz,
          animation: 'omRune 0.28s ease-out forwards',
          color: profile.slash,
          fontSize: sz * 0.7,
          lineHeight: 1,
          textAlign: 'center',
          textShadow: `0 0 6px ${profile.glow}`,
        }}
      >
        ☖
      </div>
    </Pos>
  );
}

function SlashHit({ target, profile, melee, crit }: { target: { left: number; top: number }; profile: FxProfile; melee: boolean; crit?: boolean }) {
  const sz = melee ? 22 : 18;
  return (
    <Pos left={target.left} top={target.top} zIndex={29}>
      <div style={{ position: 'relative', width: sz, height: sz, animation: 'omSlash 0.2s ease-out forwards' }}>
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: melee ? 20 : 16,
            height: crit ? 3 : 2,
            marginLeft: melee ? -10 : -8,
            marginTop: crit ? -1.5 : -1,
            background: profile.slash,
            boxShadow: `0 0 0 1px ${INK}${crit ? `, 0 0 4px ${profile.glow}` : ''}`,
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 2,
            height: melee ? 20 : 16,
            marginLeft: -1,
            marginTop: melee ? -10 : -8,
            background: profile.slash,
            boxShadow: `0 0 0 1px ${INK}`,
          }}
        />
      </div>
    </Pos>
  );
}

function AttackFx({
  profile,
  kind,
  from,
  target,
  len,
  angle,
  melee,
}: {
  profile: FxProfile;
  kind: CombatFxKind;
  from: { left: number; top: number };
  target: { left: number; top: number };
  len: number;
  angle: number;
  melee: boolean;
}) {
  const crit = kind === 'crit';
  const showBolt = !melee && kind !== 'cast';
  const boltH = crit ? 4 : kind === 'magic' ? 3 : 2;

  return (
    <>
      {showBolt && profile.attack === 'zigzag' && <ZigzagBolt from={from} len={len} angle={angle} profile={profile} crit={crit} />}
      {showBolt && profile.attack === 'coil' && <CoilBolt from={from} len={len} angle={angle} profile={profile} />}
      {showBolt && profile.attack === 'wisp' && <WispBolt from={from} target={target} profile={profile} />}
      {showBolt &&
        !['zigzag', 'coil', 'wisp'].includes(profile.attack) && (
          <RotatedBolt
            from={from}
            len={len}
            angle={angle}
            height={profile.attack === 'dive' ? boltH + 2 : profile.attack === 'wind' ? 2 : boltH}
            color={profile.bolt}
            glow={profile.glow}
            anim={profile.attack === 'wind' ? 'omWindBolt' : profile.attack === 'dive' ? 'omDiveBolt' : 'omBolt'}
            crit={crit}
          />
        )}
      {melee && profile.attack === 'dive' && (
        <RotatedBolt from={from} len={len} angle={angle} height={4} color={profile.bolt} glow={profile.glow} anim="omDiveBolt" crit={crit} />
      )}
      {profile.attack === 'web' && <WebHit target={target} profile={profile} size={melee ? 24 : 20} />}
      {profile.attack === 'splash' && <SplashHit target={target} profile={profile} />}
      {profile.attack === 'ember' && <EmberHit target={target} profile={profile} crit={crit} />}
      {profile.attack === 'rune' && <RuneHit target={target} profile={profile} melee={melee} />}
      {profile.attack === 'tide' && (
        <>
          <HitFlash target={target} profile={profile} size={22} anim="omTideFlash" />
          <Pos left={target.left} top={target.top} zIndex={28}>
            <div
              style={{
                width: 26,
                height: 8,
                borderRadius: 4,
                background: profile.bolt,
                border: `2px solid ${INK}`,
                animation: 'omTide 0.24s ease-out forwards',
              }}
            />
          </Pos>
        </>
      )}
      {profile.attack === 'storm' && (
        <>
          <HitFlash target={target} profile={profile} size={20} />
          <Pos left={target.left} top={target.top - 3} zIndex={29}>
            <div style={{ fontSize: 14, animation: 'omStorm 0.26s ease-out forwards' }}>⌃</div>
          </Pos>
        </>
      )}
      {!['web', 'splash', 'ember', 'rune', 'tide', 'storm'].includes(profile.attack) && (
        <>
          <SlashHit target={target} profile={profile} melee={melee} crit={crit} />
          <HitFlash target={target} profile={profile} size={crit ? 30 : 22} />
        </>
      )}
      {['web', 'splash', 'tide', 'storm'].includes(profile.attack) && (
        <HitFlash target={target} profile={profile} size={crit ? 28 : 20} />
      )}
      {profile.attack === 'ember' && crit && <HitFlash target={target} profile={profile} size={18} anim="omHitFlash" />}
    </>
  );
}

function CastFx({
  profile,
  from,
  target,
  len,
  angle,
}: {
  profile: FxProfile;
  from: { left: number; top: number };
  target: { left: number; top: number };
  len: number;
  angle: number;
}) {
  const cast = profile.cast;

  return (
    <>
      {/* Caster ring */}
      <div
        style={{
          position: 'absolute',
          left: `${from.left}%`,
          top: `${from.top}%`,
          width: cast === 'ward' ? 40 : 34,
          height: cast === 'ward' ? 40 : 34,
          transform: 'translate(-50%, -50%)',
          border: `3px solid ${profile.ring}`,
          boxShadow: `0 0 0 2px ${INK}${cast === 'foxfire' ? `, 0 0 10px ${profile.glow}` : ''}`,
          animation: cast === 'breath' ? 'omBreathRing 0.5s ease-out forwards' : 'omCastRing 0.45s ease-out forwards',
          zIndex: 28,
          pointerEvents: 'none',
          borderRadius: cast === 'pillar' || cast === 'ward' ? '50%' : undefined,
        }}
      />

      {cast === 'coil-ring' && (
        <Pos left={from.left} top={from.top} zIndex={27}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: `3px dashed ${profile.bolt}`,
              animation: 'omCoilRing 0.5s ease-out forwards',
            }}
          />
        </Pos>
      )}

      {cast === 'gale' && (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${from.left - 10}%`,
                top: `${from.top + (i - 1) * 4}%`,
                width: '120%',
                height: 3,
                background: profile.bolt,
                boxShadow: `0 0 0 1px ${INK}, 0 0 6px ${profile.glow}`,
                animation: `omGale ${0.35 + i * 0.05}s ease-out forwards`,
                zIndex: 27,
                pointerEvents: 'none',
                opacity: 0.85 - i * 0.15,
              }}
            />
          ))}
        </>
      )}

      {cast === 'chain' && (
        <>
          {[0, 1, 2].map((i) => (
            <ZigzagBolt
              key={i}
              from={from}
              len={len * (0.7 + i * 0.15)}
              angle={angle + (i - 1) * 18}
              profile={profile}
            />
          ))}
        </>
      )}

      {cast === 'web-net' && <WebHit target={target} profile={profile} size={32} />}

      {cast === 'drag' && (
        <RotatedBolt
          from={target}
          len={len}
          angle={angle + 180}
          height={3}
          color={profile.bolt}
          glow={profile.glow}
          anim="omDragPull"
        />
      )}

      {(cast === 'sun-dive' || cast === 'steal') && (
        <RotatedBolt from={from} len={len} angle={angle} height={4} color={profile.ring} glow={profile.glow} anim="omDiveBolt" />
      )}

      {cast === 'foxfire' &&
        Array.from({ length: 9 }, (_, i) => {
          const ox = ((i * 17) % 11) - 5;
          const oy = ((i * 13) % 9) - 4;
          return (
            <Pos key={i} left={target.left + ox} top={target.top + oy} zIndex={29}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: profile.bolt,
                  border: `2px solid ${INK}`,
                  boxShadow: `0 0 8px ${profile.glow}`,
                  animation: `omFoxfire ${0.2 + (i % 3) * 0.06}s ease-out forwards`,
                }}
              />
            </Pos>
          );
        })}

      {cast === 'pillar' && (
        <Pos left={target.left} top={target.top} zIndex={29}>
          <div
            style={{
              width: 20,
              height: 36,
              background: `linear-gradient(to top, ${profile.bolt}, ${profile.glow})`,
              border: `2px solid ${INK}`,
              animation: 'omPillar 0.42s ease-out forwards',
            }}
          />
        </Pos>
      )}

      {cast === 'breath' &&
        [0, 1, 2].map((i) => (
          <RotatedBolt
            key={i}
            from={from}
            len={len * (0.55 + i * 0.12)}
            angle={angle + (i - 1) * 22}
            height={5}
            color={profile.bolt}
            glow={profile.glow}
            anim="omBreathCone"
          />
        ))}

      {cast === 'ward' && (
        <Pos left={from.left} top={from.top} zIndex={28}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: `3px solid ${profile.ring}`,
              background: profile.burst,
              animation: 'omWard 0.5s ease-out forwards',
            }}
          />
        </Pos>
      )}

      {cast === 'riddle' && (
        <>
          <RotatedBolt from={from} len={len} angle={angle} height={3} color={profile.bolt} glow={profile.glow} anim="omCastBolt" />
          <RuneHit target={target} profile={profile} melee={false} />
          <Pos left={target.left} top={target.top} zIndex={29}>
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${profile.ring}`,
                background: profile.burst,
                animation: 'omRiddle 0.45s ease-out forwards',
              }}
            />
          </Pos>
        </>
      )}

      {!['foxfire', 'pillar', 'breath', 'ward', 'riddle', 'web-net', 'drag'].includes(cast) && (
        <div
          style={{
            position: 'absolute',
            left: `${target.left}%`,
            top: `${target.top}%`,
            width: 28,
            height: 28,
            transform: 'translate(-50%, -50%)',
            background: profile.burst,
            border: `3px solid ${profile.ring}`,
            boxShadow: `inset 0 0 0 2px ${profile.glow}`,
            animation: 'omCastBurst 0.4s ease-out forwards',
            zIndex: 29,
            pointerEvents: 'none',
          }}
        />
      )}

      {cast === 'steal' && (
        <Pos left={from.left} top={from.top - 4} zIndex={30}>
          <div style={{ fontSize: 12, color: profile.glow, animation: 'omSteal 0.4s ease-out forwards' }}>+SP</div>
        </Pos>
      )}
    </>
  );
}

export function CombatFxLayer({ fx }: CombatFxLayerProps) {
  return (
    <>
      {fx.map((f) => {
        const profile = getFxProfile(f.hid, f.kind);
        const { from, len, angle } = attackGeometry(f.fromR, f.fromC, f.toR, f.toC);
        const target = cellCenterPct(f.toR, f.toC);
        const isCast = f.kind === 'cast';

        return (
          <div key={f.k} style={{ pointerEvents: 'none' }}>
            {isCast ? (
              <CastFx profile={profile} from={from} target={target} len={len} angle={angle} />
            ) : (
              <AttackFx
                profile={profile}
                kind={f.kind}
                from={from}
                target={target}
                len={len}
                angle={angle}
                melee={f.melee}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function getLungeTransform(
  fx: CombatFx[],
  r: number,
  c: number,
  now = Date.now(),
): string | undefined {
  const hit = fx.find(
    (f) => f.melee && f.fromR === r && f.fromC === c && now - f.t < 180 && f.kind !== 'cast',
  );
  if (!hit) return undefined;
  const dr = Math.sign(hit.toR - hit.fromR);
  const dc = Math.sign(hit.toC - hit.fromC);
  const push = lungePush(hit.hid);
  return `translate(${dc * push}px, ${dr * push}px)`;
}
