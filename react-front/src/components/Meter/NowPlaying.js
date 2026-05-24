import React, { useState, useEffect, useRef, useCallback } from 'react';

// Ticks client-side every second so the display is smooth between polls
const ElapsedClock = ({ spinStartedAt }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!spinStartedAt) { setElapsed(0); return; }
        const start = new Date(spinStartedAt).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [spinStartedAt]);

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const fmt = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;

    return (
        <span style={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: '2.75rem',
            fontWeight: 700,
            color: 'var(--grail-accent)',
            letterSpacing: '0.04em',
        }}>
            {fmt}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const STATE = {
    NO_RECORD:  'no_record',
    STOPPED:    'stopped',
    SPINNING:   'spinning',
};

function deriveState(status) {
    if (!status)                    return STATE.NO_RECORD;
    if (!status.record_present)     return STATE.NO_RECORD;
    if (status.spinning)            return STATE.SPINNING;
    return STATE.STOPPED;
}

const CONFIG = {
    [STATE.NO_RECORD]: {
        border:     'var(--grail-glass-border)',
        accentBar:  false,
        dot:        '#555',
        dotAnim:    false,
        dotGlow:    false,
        label:      'No record on platter',
        labelColor: 'var(--grail-text-subtle)',
        discColor:  'var(--grail-text-subtle)',
        discAnim:   false,
        icon:       'fa-compact-disc',
    },
    [STATE.STOPPED]: {
        border:     '#b8860b',
        accentBar:  true,
        accentGrad: 'linear-gradient(90deg, #7a5700, #c8960b, #7a5700)',
        dot:        '#c8960b',
        dotAnim:    false,
        dotGlow:    true,
        dotGlowCol: '#c8960b',
        label:      'Record on platter — stopped',
        labelColor: '#c8960b',
        discColor:  '#c8960b',
        discAnim:   false,
        icon:       'fa-compact-disc',
    },
    [STATE.SPINNING]: {
        border:     'var(--grail-accent)',
        accentBar:  true,
        accentGrad: 'linear-gradient(90deg, var(--grail-primary), var(--grail-accent), var(--grail-primary))',
        dot:        'var(--grail-accent)',
        dotAnim:    true,
        dotGlow:    true,
        dotGlowCol: 'var(--grail-accent)',
        label:      'Now Playing',
        labelColor: 'var(--grail-accent)',
        discColor:  'var(--grail-accent)',
        discAnim:   true,
        icon:       'fa-compact-disc',
    },
};

// ─────────────────────────────────────────────────────────────────────────────

const NowPlaying = () => {
    const [status, setStatus] = useState(null);
    const pollRef = useRef(null);

    const poll = useCallback(async () => {
        try {
            const res = await fetch('/api/grailmeter/now-playing?user_id=1');
            if (res.ok) setStatus(await res.json());
        } catch (_) {}
    }, []);

    useEffect(() => {
        poll();
        pollRef.current = setInterval(poll, 2000);
        return () => clearInterval(pollRef.current);
    }, [poll]);

    const state = deriveState(status);
    const cfg   = CONFIG[state];

    return (
        <div style={{
            background: 'var(--grail-surface)',
            border: `1px solid ${cfg.border}`,
            borderRadius: 'var(--grail-radius-lg)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            height: '100%',
            minHeight: '260px',
            transition: 'border-color 0.4s ease',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* top accent bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: cfg.accentGrad || 'transparent',
                opacity: cfg.accentBar ? 1 : 0,
                transition: 'opacity 0.4s ease',
            }} />

            {/* status dot + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                    display: 'inline-block',
                    width: '10px', height: '10px',
                    borderRadius: '50%',
                    background: cfg.dot,
                    boxShadow: cfg.dotGlow ? `0 0 8px ${cfg.dotGlowCol}` : 'none',
                    animation: cfg.dotAnim ? 'npPulse 1.2s ease-in-out infinite' : 'none',
                    transition: 'background 0.4s, box-shadow 0.4s',
                }} />
                <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: cfg.labelColor,
                    transition: 'color 0.4s',
                }}>
                    {cfg.label}
                </span>
            </div>

            {/* disc icon */}
            <i className={`fas ${cfg.icon}`} style={{
                fontSize: '4.5rem',
                color: cfg.discColor,
                animation: cfg.discAnim ? 'npSpin 3s linear infinite' : 'none',
                transition: 'color 0.4s ease',
            }} />

            {/* elapsed / sub-label */}
            {state === STATE.SPINNING && (
                <ElapsedClock spinStartedAt={status?.spin_started_at} />
            )}
            {state === STATE.STOPPED && (
                <span style={{ color: '#c8960b', fontSize: '0.9rem' }}>
                    Start the platter to begin
                </span>
            )}
            {state === STATE.NO_RECORD && (
                <span style={{ color: 'var(--grail-text-subtle)', fontSize: '0.9rem' }}>
                    Place a record on the turntable
                </span>
            )}

            <style>{`
                @keyframes npPulse {
                    0%, 100% { opacity: 1;   transform: scale(1); }
                    50%       { opacity: 0.35; transform: scale(0.8); }
                }
                @keyframes npSpin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default NowPlaying;
