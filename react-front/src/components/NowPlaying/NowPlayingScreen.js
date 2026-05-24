import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMeter } from '../../context/MeterContext';
import NowPlayingHero from './NowPlayingHero';
import NowPlayingEmpty from './NowPlayingEmpty';
import TelemetryStrip from './TelemetryStrip';
import Tracklist from './Tracklist';
import SessionHistory from './SessionHistory';
import ListeningToday from './ListeningToday';
import RecordInLibrary from './RecordInLibrary';
import VinylSpinner from '../All/VinylSpinner';

// ── Spin-state config ─────────────────────────────────────────────────────────

const STATE_CFG = {
  playing: {
    barClass: 'spin-bar spin-bar--playing',
    label: 'Spinning',
    icon: 'fas fa-circle',
  },
  stopped: {
    barClass: 'spin-bar spin-bar--stopped',
    label: 'On deck — stopped',
    icon: 'fas fa-circle',
  },
  idle: {
    barClass: 'spin-bar spin-bar--idle',
    label: 'Idle — no record',
    icon: 'far fa-circle',
  },
};

// ── Live camera feed (same MJPEG proxy as MeterScreen) ─────────────────────

function LiveFeedPanel() {
  const [offline, setOffline] = useState(false);
  const [retryDelay, setRetryDelay] = useState(5000);
  const retryTimer = useRef(null);
  const imgRef = useRef(null);

  const handleError = useCallback(() => {
    setOffline(true);
    retryTimer.current = setTimeout(() => {
      if (imgRef.current) imgRef.current.src = `/api/grailmeter/stream?t=${Date.now()}`;
      setOffline(false);
      setRetryDelay(d => Math.min(d * 2, 60000));
    }, retryDelay);
  }, [retryDelay]);

  const handleLoad = useCallback(() => setRetryDelay(5000), []);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  return (
    <div className="live-feed-panel">
      {offline && (
        <div className="live-feed-panel__offline">
          <i className="fas fa-video-slash" style={{ fontSize: '1.5rem' }} />
          <span>Camera offline — retrying in {Math.round(retryDelay / 1000)}s</span>
        </div>
      )}
      <img
        ref={imgRef}
        src="/api/grailmeter/stream"
        alt="Grailmeter live feed"
        onError={handleError}
        onLoad={handleLoad}
        style={{ display: offline ? 'none' : 'block' }}
      />
    </div>
  );
}

// ── Spin state bar with camera toggle ────────────────────────────────────────

const FEED_KEY = 'grailmeter_feed_visible';

function SpinStateBar({ state, record }) {
  const [feedOn, setFeedOn] = useState(() => {
    try { return localStorage.getItem(FEED_KEY) === 'true'; } catch { return false; }
  });

  const cfg = STATE_CFG[state] || STATE_CFG.idle;

  const toggleFeed = () => {
    const next = !feedOn;
    setFeedOn(next);
    try { localStorage.setItem(FEED_KEY, String(next)); } catch { /* ignore */ }
  };

  return (
    <>
      <div className={cfg.barClass}>
        <span className="spin-bar__dot" />
        <span className="spin-bar__label">{cfg.label}</span>
        {state === 'playing' && record && (
          <span className="spin-bar__record">
            {record.artist} — {record.title}
          </span>
        )}
        {state === 'stopped' && record && (
          <span className="spin-bar__record">
            {record.artist} — {record.title}
          </span>
        )}
        <button
          type="button"
          className={`spin-bar__cam-btn${feedOn ? ' is-on' : ''}`}
          onClick={toggleFeed}
          title={feedOn ? 'Hide camera feed' : 'Show camera feed'}
        >
          <i className={`fas fa-${feedOn ? 'eye-slash' : 'camera'}`} />
          {feedOn ? 'Hide feed' : 'Camera'}
        </button>
      </div>
      {feedOn && <LiveFeedPanel />}
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function NowPlayingScreen() {
  const { state, record, historyForUi, loading } = useMeter();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <VinylSpinner label="Loading Now Playing…" />
      </div>
    );
  }

  const isPlaying = state === 'playing' && record;

  return (
    <div className="np-grid">
      <div>
        <SpinStateBar state={state} record={record} />

        {isPlaying ? (
          <>
            <NowPlayingHero record={record} />
            <TelemetryStrip />
            <Tracklist record={record} />
          </>
        ) : (
          <NowPlayingEmpty kind={state} record={record} />
        )}
        <SessionHistory sessions={historyForUi} />
      </div>
      <div>
        {isPlaying && <ListeningToday />}
        {isPlaying && <RecordInLibrary record={record} />}
      </div>
    </div>
  );
}
