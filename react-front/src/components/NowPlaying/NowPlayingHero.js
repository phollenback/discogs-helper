import React from 'react';
import { Link } from 'react-router-dom';
import VinylDisc from '../Shell/VinylDisc';
import { Pill } from '../All/Pill';

export default function NowPlayingHero({ record: r }) {
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const pct = r.totalSec ? Math.min(100, Math.round((r.elapsedSec / r.totalSec) * 100)) : 0;

  return (
    <section className="np-hero">
      <div className="np-disc is-spinning">
        <VinylDisc labelColor={r.labelColor} labelText={r.catalog} />
      </div>
      <div className="np-hero__body">
        <div className="np-hero__eyebrow">
          <Pill variant="accent">Now playing</Pill>
          {r.inCollection && <Pill variant="sage">In collection</Pill>}
          {r.inWantlist && !r.inCollection && <Pill variant="rose">On wantlist</Pill>}
          <span className="eyebrow">
            Side A · Track {r.currentTrack} of {r.tracks.length}
          </span>
        </div>
        <h1 className="np-hero__title">{r.title}</h1>
        <div className="np-hero__artist">{r.artist}</div>
        <div className="np-hero__meta">
          <span><b>{r.year}</b> · {r.label}</span>
          {r.catalog && (
            <span>
              Cat. <b className="mono">{r.catalog}</b>
            </span>
          )}
          <span>{r.format}</span>
          <span>{r.genre}</span>
        </div>
        <div className="np-hero__progress">
          <div className="np-hero__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="np-hero__times mono">
          <span>{fmt(r.elapsedSec)}</span>
          <span>−{fmt(Math.max(0, r.totalSec - r.elapsedSec))}</span>
        </div>
        <div className="np-hero__actions">
          {r.discogs_id && (
            <Link to={`/release/${r.discogs_id}`} className="btn btn--primary">
              Open release
            </Link>
          )}
          <Link to="/meter" className="btn btn--ghost">
            Meter dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
