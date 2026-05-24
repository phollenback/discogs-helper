import React from 'react';
import { Link } from 'react-router-dom';
import VinylDisc from '../Shell/VinylDisc';
import { Pill } from '../All/Pill';

export default function NowPlayingEmpty({ kind, record }) {
  const isIdle = kind === 'idle';
  const title = isIdle ? 'No vinyl on the deck' : 'Vinyl detected — awaiting playback';
  const copy = isIdle
    ? 'The camera is watching the platter. Drop a record on and Grailmeter will identify it automatically.'
    : 'Center label captured but the platter is not spinning. Start the turntable to begin a session, or confirm the match on the Meter page.';

  const labelColor = isIdle ? '#3a3530' : '#5C544B';
  const heroClass = `np-hero ${isIdle ? 'is-idle' : 'is-stopped'}`;

  return (
    <section className={heroClass}>
      <div className="np-disc">
        <VinylDisc
          labelColor={labelColor}
          labelText={record?.catalog || ''}
          faded
        />
      </div>
      <div className="np-hero__body">
        <div className="np-hero__eyebrow">
          <Pill variant={isIdle ? 'muted' : 'accent'}>
            {isIdle ? 'Idle' : 'Stopped'}
          </Pill>
        </div>
        <h1 className="np-hero__title">{title}</h1>
        <p className="np-empty-copy">{copy}</p>
        {!isIdle && record && (
          <p className="np-hero__artist" style={{ marginTop: 12 }}>
            {record.artist} — {record.title}
          </p>
        )}
        <div className="np-hero__actions">
          <Link to="/meter" className="btn btn--primary">
            Open Meter
          </Link>
        </div>
      </div>
    </section>
  );
}
