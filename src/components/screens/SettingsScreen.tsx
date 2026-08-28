import { useState, type ReactNode } from 'react';
import { BONE, INK, JADE } from '../../data/constants';
import {
  BATTLEGROUNDS,
  BATTLEGROUND_MAP,
  battlegroundTileUrl,
  battlegroundUnlockCurrent,
  battlegroundUnlocked,
  battlegroundUnlockLabel,
  battlegroundUnlockNeed,
} from '../../data/battlegrounds';
import type { ProgressState } from '../../data/progress';
import type { SettingsState } from '../../data/settings';
import type { CombatSpeed, Difficulty } from '../../game/types';

interface SettingsScreenProps {
  progress: ProgressState;
  settings: SettingsState;
  onChange: (partial: Partial<SettingsState>) => void;
  onBack: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'normal', label: 'Mortal' },
  { id: 'hard', label: 'Hard' },
  { id: 'mythic', label: 'Mythic' },
];

const SPEEDS: CombatSpeed[] = [1, 2, 4];

function SectionHead({ children }: { children: string }) {
  return (
    <div
      className="slab"
      style={{
        fontSize: 13,
        letterSpacing: '0.08em',
        marginBottom: 10,
        paddingBottom: 6,
        borderBottom: '3px solid var(--om-line)',
      }}
    >
      {children}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="btn-active-sm"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      style={{
        minWidth: 52,
        border: '3px solid var(--om-line)',
        background: on ? JADE : 'var(--om-card)',
        color: on ? BONE : 'var(--om-fg)',
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.12em',
        padding: '6px 10px',
      }}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  );
}

function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="slab" style={{ fontSize: 15, lineHeight: 1.1 }}>
          {title}
        </div>
        {hint && (
          <div
            className="om-muted"
            style={{
              marginTop: 3,
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="btn-active-sm"
      aria-pressed={active}
      onClick={onClick}
      style={{
        flex: 1,
        border: active ? `3px solid ${JADE}` : '3px solid var(--om-line)',
        background: active ? 'rgba(27,107,82,.18)' : 'var(--om-card)',
        color: 'var(--om-fg)',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '8px 4px',
      }}
    >
      {children}
    </button>
  );
}

export function SettingsScreen({ progress, settings, onChange, onBack }: SettingsScreenProps) {
  const unlockedCount = BATTLEGROUNDS.filter((b) => battlegroundUnlocked(b.id, progress)).length;
  const [peekId, setPeekId] = useState<string | null>(null);
  const shownId = peekId ?? settings.battlegroundId;
  const shown = BATTLEGROUND_MAP[shownId] ?? BATTLEGROUND_MAP[settings.battlegroundId];
  const shownOpen = shown ? battlegroundUnlocked(shown.id, progress) : true;
  const shownHave = shown ? battlegroundUnlockCurrent(shown.id, progress) : 0;
  const shownNeed = shown ? battlegroundUnlockNeed(shown) : 0;

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
        <div style={{ flex: 1 }}>
          <div className="slab" style={{ fontSize: 22, lineHeight: 1 }}>
            SETTINGS
          </div>
          <div
            className="om-muted"
            style={{
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 3,
            }}
          >
            Theme · trial · grounds
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
        <section style={{ marginBottom: 22 }}>
          <SectionHead>Appearance</SectionHead>
          <SettingRow title="Dark mode" hint="Ink shell, bone type">
            <Toggle
              label="Dark mode"
              on={settings.darkMode}
              onClick={() => onChange({ darkMode: !settings.darkMode })}
            />
          </SettingRow>
          <SettingRow title="Reduce motion" hint="Still parade, shorter FX">
            <Toggle
              label="Reduce motion"
              on={settings.reduceMotion}
              onClick={() => onChange({ reduceMotion: !settings.reduceMotion })}
            />
          </SettingRow>
        </section>

        <section style={{ marginBottom: 22 }}>
          <SectionHead>Battle</SectionHead>
          <div style={{ marginBottom: 14 }}>
            <div className="slab" style={{ fontSize: 15, lineHeight: 1.1 }}>
              Difficulty
            </div>
            <div
              className="om-muted"
              style={{
                marginTop: 3,
                marginBottom: 8,
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1.3,
              }}
            >
              Bot matches only · practice stays sandbox
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {DIFFICULTIES.map((d) => (
                <SegBtn
                  key={d.id}
                  active={settings.difficulty === d.id}
                  onClick={() => onChange({ difficulty: d.id })}
                >
                  {d.label}
                </SegBtn>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="slab" style={{ fontSize: 15, lineHeight: 1.1 }}>
              Default speed
            </div>
            <div
              className="om-muted"
              style={{
                marginTop: 3,
                marginBottom: 8,
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1.3,
              }}
            >
              Applied when a match starts
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {SPEEDS.map((s) => (
                <SegBtn
                  key={s}
                  active={settings.defaultSpeed === s}
                  onClick={() => onChange({ defaultSpeed: s })}
                >
                  ×{s}
                </SegBtn>
              ))}
            </div>
          </div>
          <SettingRow title="Reduce VFX" hint="Keep damage numbers, skip bolts">
            <Toggle
              label="Reduce VFX"
              on={settings.reduceVfx}
              onClick={() => onChange({ reduceVfx: !settings.reduceVfx })}
            />
          </SettingRow>
        </section>

        <section>
          <SectionHead>Battlegrounds</SectionHead>
          <div className="settings-bg-grid">
            {BATTLEGROUNDS.map((b) => {
              const open = battlegroundUnlocked(b.id, progress);
              const selected = settings.battlegroundId === b.id;
              const tile = battlegroundTileUrl(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  className={open ? 'btn-active-sm settings-bg-tile' : 'settings-bg-tile'}
                  aria-label={open ? b.name : `${b.name}, locked`}
                  aria-pressed={selected}
                  onClick={() => {
                    if (open) {
                      setPeekId(null);
                      onChange({ battlegroundId: b.id });
                    } else {
                      setPeekId(b.id);
                    }
                  }}
                  style={{
                    border: selected ? `3px solid ${JADE}` : '3px solid var(--om-line)',
                    background: 'var(--om-card)',
                    padding: 0,
                    cursor: open ? 'pointer' : 'default',
                  }}
                >
                  <div
                    className={open ? 'pixel' : 'pixel pixel-locked'}
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundImage: tile ? `url(${tile})` : undefined,
                      backgroundSize: '16.66% 16.66%',
                      backgroundRepeat: 'repeat',
                      imageRendering: 'pixelated',
                      position: 'relative',
                    }}
                  >
                    {selected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          background: JADE,
                          color: BONE,
                          border: `2px solid ${INK}`,
                          width: 14,
                          height: 14,
                          fontSize: 10,
                          lineHeight: '11px',
                          textAlign: 'center',
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    )}
                    {!open && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          color: INK,
                        }}
                      >
                        🔒
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {shown && (
            <div style={{ marginTop: 10 }}>
              <div className="slab" style={{ fontSize: 16, lineHeight: 1.15 }}>
                {shown.name}
                {!shownOpen ? ' · locked' : ''}
              </div>
              <div
                className="om-muted"
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1.35,
                }}
              >
                {shownOpen
                  ? `${shown.theme} · ${unlockedCount} / ${BATTLEGROUNDS.length} unsealed`
                  : `${battlegroundUnlockLabel(shown.id)}${
                      shownNeed > 0 ? ` · ${Math.min(shownHave, shownNeed)} / ${shownNeed}` : ''
                    }`}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
