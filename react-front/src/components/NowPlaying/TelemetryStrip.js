import React from 'react';
import { useMeter } from '../../context/MeterContext';
import { Pill } from '../All/Pill';

function Cell({ l, v, u }) {
  return (
    <div className="telemetry-cell">
      <div className="telemetry-cell__l">{l}</div>
      <div className="telemetry-cell__v mono">
        {v}
        {u && <span className="u">{u}</span>}
      </div>
    </div>
  );
}

export default function TelemetryStrip() {
  const { telemetry, detectionLog } = useMeter();

  return (
    <section className="card" style={{ marginTop: 22 }}>
      <div className="card__head">
        <div>
          <div className="card__title">Grailmeter telemetry</div>
          <div className="card__sub">
            Raspberry Pi · cam-01 · last frame {telemetry.lastFrameMs}ms ago
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Pill variant="accent">LIVE</Pill>
        </div>
      </div>
      <div className="card__body" style={{ padding: '18px 22px' }}>
        <div className="telemetry-row">
          <Cell l="Platter speed" v={telemetry.rpm} u=" RPM" />
          <Cell l="Spin stability" v={`±${telemetry.stab}`} u="%" />
          <Cell l="Label confidence" v={telemetry.conf} u="%" />
          <Cell l="Frames analyzed" v={telemetry.frames.toLocaleString()} />
          <Cell l="Session started" v={telemetry.startedAt} />
        </div>
        <div className="telemetry-log">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Detection log</div>
          {detectionLog.length === 0 && (
            <div className="mono telemetry-log__row" style={{ color: 'var(--muted)' }}>
              <span>—</span>
              <span>Waiting for Pi events…</span>
            </div>
          )}
          {detectionLog.map((l) => (
            <div
              key={`${l.t}-${l.msg}`}
              className="mono telemetry-log__row"
              style={{ color: l.level === 'ok' ? 'var(--sage)' : 'var(--muted)' }}
            >
              <span style={{ color: 'var(--muted-2)' }}>{l.t}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
