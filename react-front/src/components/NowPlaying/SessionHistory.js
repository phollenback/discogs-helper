import React from 'react';
import { Link } from 'react-router-dom';
import { Pill } from '../All/Pill';

function StatusPill({ status }) {
  if (status === 'collection') return <Pill variant="sage">In collection</Pill>;
  if (status === 'wantlist') return <Pill variant="rose">On wantlist</Pill>;
  return <Pill variant="muted">Not tracked</Pill>;
}

export default function SessionHistory({ sessions }) {
  return (
    <section className="card" style={{ marginTop: 22 }}>
      <div className="card__head">
        <div>
          <div className="card__title">Previously played</div>
          <div className="card__sub">{sessions.length} sessions in the last 48 hours</div>
        </div>
      </div>
      <div className="card__body" style={{ padding: '4px 22px' }}>
        {sessions.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>
            No playback history yet — spin a record on the turntable.
          </p>
        ) : (
          <div className="history">
            {sessions.map((h) => (
              <Link
                key={h.id}
                to={h.discogs_id ? `/release/${h.discogs_id}` : '#'}
                className="history__row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="history__art">
                  {h.artUrl ? (
                    <img src={h.artUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: `radial-gradient(circle at 50% 50%, ${h.labelColor} 0 28%, #15130F 28%)`,
                      }}
                    />
                  )}
                </div>
                <div className="history__body">
                  <div className="history__title">{h.title}</div>
                  <div className="history__artist">
                    {h.artist} · {h.year} · {h.label}
                  </div>
                </div>
                <div><StatusPill status={h.status} /></div>
                <div className="history__meta">
                  <div>{h.played}</div>
                  <div className="sub">{h.duration}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
