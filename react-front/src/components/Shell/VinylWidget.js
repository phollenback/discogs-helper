import React from 'react';
import { useNavigate } from 'react-router-dom';
import VinylDisc from './VinylDisc';
import { useMeter } from '../../context/MeterContext';

export default function VinylWidget() {
  const navigate = useNavigate();
  const { state, record } = useMeter();

  const statusText =
    state === 'playing' ? 'Now playing' :
    state === 'stopped' ? 'Stopped' : 'Idle';

  const line =
    state === 'playing' && record
      ? `${record.title} — ${record.artist}`
      : state === 'stopped'
        ? 'Vinyl on deck — paused'
        : 'No vinyl detected';

  return (
    <button
      type="button"
      className={`vwidget vwidget--${state}`}
      onClick={() => navigate('/now')}
      title="View Now Playing"
    >
      <span className={`vwidget__disc ${state === 'playing' ? 'vwidget__disc--spin' : ''}`}>
        <VinylDisc
          labelColor={state === 'idle' ? '#3a3530' : (record?.labelColor || '#E89B4D')}
          labelText={state === 'playing' ? (record?.catalog || '') : ''}
          faded={state === 'idle'}
        />
      </span>
      <span className="vwidget__info">
        <span className="vwidget__status">
          <span className="vwidget__dot" />
          {statusText}
        </span>
        <span className="vwidget__line">{line}</span>
      </span>
    </button>
  );
}
