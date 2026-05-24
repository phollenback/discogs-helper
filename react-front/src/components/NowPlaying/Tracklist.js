import React from 'react';
import { Pill } from '../All/Pill';

export default function Tracklist({ record: r }) {
  if (!r?.tracks?.length) {
    return (
      <section className="card" style={{ marginTop: 22 }}>
        <div className="card__head">
          <div className="card__title">Tracklist</div>
        </div>
        <div className="card__body">
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No tracklist available for this release.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ marginTop: 22 }}>
      <div className="card__head">
        <div>
          <div className="card__title">Tracklist</div>
          <div className="card__sub">Recognized via center-label OCR · auto-advances on band detection</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Pill variant="accent" className="mono">SIDE A</Pill>
        </div>
      </div>
      <div className="card__body" style={{ padding: '10px 12px' }}>
        <div className="tracklist">
          {r.tracks.map((t) => (
            <div key={t.n} className={`tracklist__row ${t.current ? 'is-current' : ''}`}>
              <span className="idx">{String(t.n).padStart(2, '0')}</span>
              <span className="name">{t.name}</span>
              <span className="dur">
                {t.current && (
                  <span className="eq">
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </span>
              <span className="dur">{t.current ? `${t.elapsed} / ${t.dur}` : t.dur}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
