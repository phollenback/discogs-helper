import React from 'react';
import { Link } from 'react-router-dom';
import { Pill } from '../All/Pill';

export default function RecordInLibrary({ record: r }) {
  if (!r) {
    return (
      <section className="card" style={{ marginTop: 22 }}>
        <div className="card__body">
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No record selected.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ marginTop: 22 }}>
      <div className="card__head">
        <div className="card__title">In your library</div>
      </div>
      <div className="card__body">
        <div className="record-jacket">
          {r.cover_image_url ? (
            <img src={r.cover_image_url} alt={`${r.title} cover`} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `radial-gradient(circle at 50% 50%, ${r.labelColor} 0 35%, #15130F 35%)`,
              }}
            />
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          {r.inCollection && <Pill variant="sage">In collection</Pill>}
          {r.inWantlist && !r.inCollection && <Pill variant="rose">On wantlist</Pill>}
          {!r.inCollection && !r.inWantlist && <Pill variant="muted">Not tracked</Pill>}
        </div>
        {r.discogs_id && (
          <Link to={`/release/${r.discogs_id}`} className="btn btn--ghost">
            View release details
          </Link>
        )}
      </div>
    </section>
  );
}
