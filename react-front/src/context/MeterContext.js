import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../utility/backSource';

const MeterContext = createContext(null);

export const GRAILMETER_USER_ID = 1;
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const useMeter = () => {
  const ctx = useContext(MeterContext);
  if (!ctx) throw new Error('useMeter must be used within MeterProvider');
  return ctx;
};

const LABEL_COLORS = ['#E89B4D', '#C45C4A', '#6B8E6B', '#5C7FA3', '#9B6B9E'];

function pickLabelColor(discogsId) {
  if (!discogsId) return '#E89B4D';
  return LABEL_COLORS[discogsId % LABEL_COLORS.length];
}

function parseDurationSec(dur) {
  if (!dur || typeof dur !== 'string') return 0;
  const parts = dur.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function mapNowPlaying(np) {
  if (!np || np.status === 'idle') return null;
  return {
    discogs_id: np.discogs_id,
    title: np.title || 'Unknown',
    artist: np.artist || 'Unknown',
    start_time: np.started_at,
    release_year: np.release_year,
    genre: np.genre || null,
    confidence: np.confidence,
    status: np.status,
    label_snapshot_url: np.label_snapshot_url,
    cover_image_url: np.cover_image_url,
    thumb_url: np.thumb_url,
    catalog_number: np.catalog_number,
    label_name: np.label_name,
    candidates: np.candidates,
    ocr_keywords: np.ocr_keywords,
    match_source: np.match_source,
  };
}

export function mapHistorySession(session) {
  return {
    id: session.session_id || `${session.discogs_id}-${session.started_at}`,
    discogs_id: session.discogs_id,
    title: session.title,
    artist: session.artist,
    last_played: session.started_at,
    duration_sec: session.duration_sec,
    total_time_minutes: session.duration_sec ? Math.max(1, Math.round(session.duration_sec / 60)) : 0,
    play_count: 1,
    thumb_url: session.thumb_url,
    cover_image_url: session.cover_image_url,
    confidence: session.confidence,
    match_source: session.match_source,
    label_name: session.label_name,
    release_year: session.release_year,
  };
}

function matchSourceToStatus(matchSource) {
  if (matchSource === 'collection') return 'collection';
  if (matchSource === 'wantlist') return 'wantlist';
  return 'none';
}

function deriveMeterState(nowPlaying) {
  if (!nowPlaying || nowPlaying.status === 'idle') return 'idle';
  if (nowPlaying.status === 'playing') return 'playing';
  if (nowPlaying.status === 'pending_identification') return 'stopped';
  return 'idle';
}

function buildRecord(nowPlaying, tracks = [], tick = Date.now()) {
  if (!nowPlaying) return null;
  const startMs = nowPlaying.start_time ? new Date(nowPlaying.start_time).getTime() : tick;
  const elapsedSec = Math.max(0, Math.floor((tick - startMs) / 1000));
  const trackDurations = tracks.map((t) => parseDurationSec(t.duration || t.dur));
  const totalSec = trackDurations.reduce((a, b) => a + b, 0) || 42 * 60;

  let currentTrack = 1;
  let trackElapsed = elapsedSec;
  let accumulated = 0;
  for (let i = 0; i < trackDurations.length; i += 1) {
    if (accumulated + trackDurations[i] > elapsedSec) {
      currentTrack = i + 1;
      trackElapsed = elapsedSec - accumulated;
      break;
    }
    accumulated += trackDurations[i];
    if (i === trackDurations.length - 1) {
      currentTrack = tracks.length;
      trackElapsed = trackDurations[i];
    }
  }

  const mappedTracks = tracks.length
    ? tracks.map((t, i) => {
        const isCurrent = i + 1 === currentTrack;
        return {
          n: i + 1,
          name: t.title || t.name || `Track ${i + 1}`,
          dur: t.duration || t.dur || '—',
          current: isCurrent,
          elapsed: isCurrent ? formatClock(trackElapsed) : null,
        };
      })
    : [{ n: 1, name: 'Side A', dur: '—', current: true, elapsed: formatClock(elapsedSec) }];

  const inCollection = nowPlaying.match_source === 'collection';
  const inWantlist = nowPlaying.match_source === 'wantlist';

  return {
    discogs_id: nowPlaying.discogs_id,
    title: nowPlaying.title,
    artist: nowPlaying.artist,
    year: nowPlaying.release_year || '—',
    label: nowPlaying.label_name || '—',
    catalog: nowPlaying.catalog_number || '',
    labelColor: pickLabelColor(nowPlaying.discogs_id),
    format: 'Vinyl',
    genre: nowPlaying.genre || '—',
    inCollection,
    inWantlist,
    rpm: 33.4,
    currentTrack,
    elapsedSec,
    totalSec,
    tracks: mappedTracks,
    confidence: nowPlaying.confidence,
    cover_image_url: nowPlaying.cover_image_url || nowPlaying.thumb_url,
    thumb_url: nowPlaying.thumb_url,
    start_time: nowPlaying.start_time,
  };
}

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimeShort(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function formatDurationMinutes(minutes) {
  if (!minutes) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function MeterProvider({ children }) {
  const { getData } = useApi();
  const [nowPlaying, setNowPlaying] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectionLog, setDetectionLog] = useState([]);
  const [tick, setTick] = useState(Date.now());
  const frameCountRef = useRef(0);

  const pushLog = useCallback((msg, level = 'info') => {
    const t = new Date().toLocaleTimeString([], { hour12: false });
    setDetectionLog((prev) => [{ t, msg, level }, ...prev].slice(0, 20));
  }, []);

  const loadMeterData = useCallback(async () => {
    setError(null);
    try {
      const [np, history] = await Promise.all([
        getData(`/api/nowplaying/${GRAILMETER_USER_ID}`),
        getData(`/api/playback/history/${GRAILMETER_USER_ID}?limit=50`),
      ]);
      const playing = mapNowPlaying(np);
      setNowPlaying(playing);
      setSessions(Array.isArray(history) ? history.map(mapHistorySession) : []);
    } catch (err) {
      console.error('[MeterContext] load failed', err);
      setError('Failed to load playback data');
    } finally {
      setLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    loadMeterData();
  }, [loadMeterData]);

  useEffect(() => {
    if (!nowPlaying?.discogs_id) {
      setTracks([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getData(
          `/api/releases/${nowPlaying.discogs_id}/overview?includeMaster=false&curr_abbr=USD`
        );
        if (!cancelled) {
          setTracks(data?.release?.tracklist || []);
        }
      } catch {
        if (!cancelled) setTracks([]);
      }
    })();
    return () => { cancelled = true; };
  }, [nowPlaying?.discogs_id, getData]);

  useEffect(() => {
    const sseUrl = `${API_BASE_URL}/api/grailmeter/events?userId=${GRAILMETER_USER_ID}`;
    const es = new EventSource(sseUrl);

    const handleNowPlaying = (data) => {
      const playing = mapNowPlaying(data);
      setNowPlaying(playing);
      if (playing?.status === 'playing') {
        pushLog(`Discogs match · ${playing.artist} — ${playing.title}`, 'ok');
      } else if (playing?.status === 'pending_identification') {
        pushLog('Label captured — awaiting identification', 'info');
      }
    };

    es.addEventListener('play_start', (e) => {
      try { handleNowPlaying(JSON.parse(e.data)); } catch (_) { /* ignore */ }
      frameCountRef.current += 1;
      loadMeterData();
    });
    es.addEventListener('needs_identification', (e) => {
      try { handleNowPlaying(JSON.parse(e.data)); } catch (_) { /* ignore */ }
      pushLog('Vinyl detected on platter', 'info');
    });
    es.addEventListener('identification_confirmed', (e) => {
      try { handleNowPlaying(JSON.parse(e.data)); } catch (_) { /* ignore */ }
      pushLog('Identification confirmed', 'ok');
      loadMeterData();
    });
    es.addEventListener('play_stop', () => {
      setNowPlaying(null);
      pushLog('Playback stopped', 'info');
      loadMeterData();
    });

    return () => es.close();
  }, [loadMeterData, pushLog]);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const state = deriveMeterState(nowPlaying);
  const pendingId = nowPlaying?.status === 'pending_identification';
  const record = buildRecord(nowPlaying, tracks, tick);

  const telemetry = useMemo(() => ({
    rpm: state === 'playing' ? '33.4' : '0.0',
    stab: state === 'playing' ? '0.08' : '—',
    conf: nowPlaying?.confidence != null ? String(Math.round(nowPlaying.confidence)) : '—',
    frames: frameCountRef.current * 1200 + 8400,
    startedAt: nowPlaying?.start_time ? formatTimeShort(nowPlaying.start_time) : '—',
    lastFrameMs: state === 'playing' ? 400 : 0,
  }), [state, nowPlaying]);

  const historyForUi = useMemo(() => sessions.map((s) => ({
    id: s.id,
    discogs_id: s.discogs_id,
    title: s.title || 'Unknown',
    artist: s.artist || 'Unknown',
    year: s.release_year || '—',
    label: s.label_name || '—',
    labelColor: pickLabelColor(s.discogs_id),
    artUrl: s.cover_image_url || s.thumb_url,
    status: matchSourceToStatus(s.match_source),
    played: formatTimeAgo(s.last_played),
    duration: formatDurationMinutes(s.total_time_minutes),
  })), [sessions]);

  const listeningToday = useMemo(() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(
      (s) => s.last_played && new Date(s.last_played).toDateString() === today
    );
    const totalMin = todaySessions.reduce((sum, s) => sum + (s.total_time_minutes || 0), 0);
    return {
      sessions: todaySessions.length,
      totalMin,
      records: new Set(todaySessions.map((s) => s.discogs_id).filter(Boolean)).size,
      avgMin: todaySessions.length ? Math.round(totalMin / todaySessions.length) : 0,
    };
  }, [sessions]);

  const value = {
    state,
    record,
    nowPlaying,
    sessions,
    historyForUi,
    listeningToday,
    telemetry,
    detectionLog,
    loading,
    error,
    pendingId,
    refresh: loadMeterData,
    pushLog,
    formatTimeAgo,
    formatDurationMinutes,
  };

  return (
    <MeterContext.Provider value={value}>
      {children}
    </MeterContext.Provider>
  );
}
