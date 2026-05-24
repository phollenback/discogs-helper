import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../utility/backSource';
import { useAuthContext } from '../../AuthContext';
import { useMeter } from '../../context/MeterContext';
import PageHeader from '../All/PageHeader';
import VinylSpinner from '../All/VinylSpinner';
import '../../styles/theme.css';

const PI_STREAM_URL = process.env.REACT_APP_PI_STREAM_URL || '';

const MeterScreen = () => {
    const { getData, postData } = useApi();
    const { authState } = useAuthContext();
    const {
        nowPlaying: currentlyPlaying,
        sessions: recentlyPlayed,
        loading,
        error,
        pendingId,
        refresh: loadMeterData,
        formatTimeAgo,
        formatDurationMinutes,
    } = useMeter();

    const [sortBy, setSortBy] = useState('recent');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTab, setSearchTab] = useState('collection');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [localError, setLocalError] = useState(null);

    useEffect(() => {
        if (currentlyPlaying?.ocr_keywords?.length) {
            setSearchQuery(currentlyPlaying.ocr_keywords.join(' '));
        }
    }, [currentlyPlaying?.ocr_keywords]);

    const runSearch = async () => {
        setSearchLoading(true);
        try {
            const q = searchQuery.trim();
            if (!q) { setSearchResults([]); return; }

            if (searchTab === 'discogs') {
                const data = await getData(`/api/discogs/database/search?q=${encodeURIComponent(q)}&type=release&per_page=15`);
                setSearchResults((data?.results || []).map(r => ({
                    discogs_id: r.id,
                    title: r.title,
                    artist: (r.artists || []).map(a => a.name || a).join(', '),
                    thumb_url: r.thumb,
                    catalog_number: r.catno
                })));
            } else if (searchTab === 'wantlist') {
                const data = await getData(`/api/users/${authState.username}/wantlist`);
                const items = Array.isArray(data) ? data : [];
                const lower = q.toLowerCase();
                setSearchResults(items.filter(i =>
                    `${i.title} ${i.artist} ${i.catalog_number || ''}`.toLowerCase().includes(lower)
                ).slice(0, 15).map(i => ({
                    discogs_id: i.discogs_id,
                    title: i.title,
                    artist: i.artist,
                    thumb_url: i.thumb_url,
                    catalog_number: i.catalog_number
                })));
            } else {
                const data = await getData(`/api/users/${authState.username}/collection`);
                const items = Array.isArray(data) ? data : [];
                const lower = q.toLowerCase();
                setSearchResults(items.filter(i =>
                    `${i.title} ${i.artist} ${i.catalog_number || ''}`.toLowerCase().includes(lower)
                ).slice(0, 15).map(i => ({
                    discogs_id: i.discogs_id,
                    title: i.title,
                    artist: i.artist,
                    thumb_url: i.thumb_url,
                    catalog_number: i.catalog_number
                })));
            }
        } catch (err) {
            console.error('[MeterScreen] search failed', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const confirmRecord = async (discogsId) => {
        setConfirming(true);
        setLocalError(null);
        try {
            await postData('/api/grailmeter/confirm', { discogs_id: discogsId });
            await loadMeterData();
        } catch (err) {
            console.error('[MeterScreen] confirm failed', err);
            setLocalError('Failed to confirm record');
        } finally {
            setConfirming(false);
        }
    };

    const calculateElapsedTime = (startTime) => {
        if (!startTime) return '0 min';
        const diffMins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
        return formatDurationMinutes(diffMins);
    };

    const sortedRecentlyPlayed = [...recentlyPlayed].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'recent':
                comparison = new Date(b.last_played) - new Date(a.last_played);
                break;
            case 'play_count':
                comparison = b.play_count - a.play_count;
                break;
            case 'total_time':
                comparison = b.total_time_minutes - a.total_time_minutes;
                break;
            default:
                comparison = 0;
        }
        return sortOrder === 'asc' ? -comparison : comparison;
    });

    const displayError = localError || error;

    if (loading) {
        return (
            <section className="page">
                <div className="page-empty">
                    <VinylSpinner label="Loading Grailmeter..." />
                </div>
            </section>
        );
    }

    if (displayError) {
        return (
            <section className="page">
                <div className="grail-alert grail-alert--danger d-flex align-items-center gap-3">
                    <span>{displayError}</span>
                    <button type="button" onClick={loadMeterData} className="btn btn--ghost btn-sm">
                        Try again
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="page">
            <PageHeader
                eyebrow="Hardware"
                title="Grailmeter"
                subtitle={`Live vinyl detection for ${authState.username || 'admin'}`}
            />

            {PI_STREAM_URL && (
                <div className="mb-4">
                    <h2 className="grail-heading--h2 mb-3">Turntable Camera</h2>
                    <div className="grail-card p-2" style={{ background: 'var(--grail-surface)', border: '1px solid var(--grail-glass-border)' }}>
                        <img
                            src={PI_STREAM_URL}
                            alt="Turntable camera"
                            style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '8px' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                </div>
            )}

            {pendingId && (
                <div className="grail-alert mb-4" style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid var(--grail-accent)' }}>
                    <h5 className="mb-2">Identify this record</h5>
                    {currentlyPlaying?.ocr_keywords?.length > 0 && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--grail-text-subtle)' }}>
                            OCR detected: <strong>{currentlyPlaying.ocr_keywords.join(', ')}</strong>
                        </p>
                    )}
                    {currentlyPlaying?.confidence != null && (
                        <p style={{ fontSize: '0.85rem' }}>Confidence: {Math.round(currentlyPlaying.confidence)}%</p>
                    )}
                    <div className="d-flex gap-2 mb-2 flex-wrap">
                        {['collection', 'wantlist', 'discogs'].map(tab => (
                            <button
                                key={tab}
                                type="button"
                                className={`grail-btn grail-btn--sm ${searchTab === tab ? 'grail-btn--primary' : 'grail-btn--ghost'}`}
                                onClick={() => setSearchTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="d-flex gap-2 mb-3">
                        <input
                            className="form-control"
                            style={{ background: 'var(--grail-surface)', color: 'var(--grail-text)', border: '1px solid var(--grail-glass-border)' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, artist, catalog #..."
                        />
                        <button type="button" className="grail-btn grail-btn--primary" onClick={runSearch} disabled={searchLoading}>
                            {searchLoading ? '...' : 'Search'}
                        </button>
                    </div>
                    {currentlyPlaying?.candidates?.length > 0 && (
                        <div className="mb-3">
                            <div style={{ fontSize: '0.85rem', color: 'var(--grail-text-subtle)', marginBottom: '0.5rem' }}>Suggested matches</div>
                            {currentlyPlaying.candidates.map(c => (
                                <button
                                    key={c.discogs_id}
                                    type="button"
                                    className="grail-btn grail-btn--ghost grail-btn--sm me-2 mb-2"
                                    disabled={confirming}
                                    onClick={() => confirmRecord(c.discogs_id)}
                                >
                                    {c.artist} — {c.title} ({Math.round(c.confidence)}%)
                                </button>
                            ))}
                        </div>
                    )}
                    {searchResults.map(r => (
                        <button
                            key={r.discogs_id}
                            type="button"
                            className="d-block w-100 text-start grail-btn grail-btn--ghost mb-2"
                            disabled={confirming}
                            onClick={() => confirmRecord(r.discogs_id)}
                        >
                            {r.artist} — {r.title} {r.catalog_number ? `(${r.catalog_number})` : ''}
                        </button>
                    ))}
                </div>
            )}

            <div className="mb-5">
                <h2 className="grail-heading--h2 mb-3">Currently Playing</h2>

                {currentlyPlaying && currentlyPlaying.status !== 'idle' ? (
                    <div className="grail-card p-4">
                        <div className="d-flex flex-column flex-md-row gap-4 align-items-center">
                            <VinylSpinner size={160} label={null} />
                            <div className="flex-grow-1 text-center text-md-start">
                                {currentlyPlaying.confidence != null && (
                                    <span className="badge mb-2" style={{ background: currentlyPlaying.confidence >= 80 ? 'var(--grail-accent)' : '#f59e0b' }}>
                                        {Math.round(currentlyPlaying.confidence)}% match
                                    </span>
                                )}
                                <Link to={`/release/${currentlyPlaying.discogs_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <h3 className="h4 mb-1">{currentlyPlaying.title}</h3>
                                    <p style={{ color: 'var(--grail-text-subtle)' }}>{currentlyPlaying.artist}</p>
                                </Link>
                                <p style={{ color: 'var(--grail-accent)' }}>Runtime: {calculateElapsedTime(currentlyPlaying.start_time)}</p>
                                {currentlyPlaying.catalog_number && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--grail-text-subtle)' }}>Cat# {currentlyPlaying.catalog_number}</p>
                                )}
                            </div>
                            {currentlyPlaying.label_snapshot_url && (
                                <img
                                    src={currentlyPlaying.label_snapshot_url}
                                    alt="Label snapshot"
                                    style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '50%' }}
                                />
                            )}
                            {(currentlyPlaying.cover_image_url || currentlyPlaying.thumb_url) && (
                                <img
                                    src={currentlyPlaying.cover_image_url || currentlyPlaying.thumb_url}
                                    alt="Cover"
                                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px' }}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grail-card p-5 text-center">
                        <p style={{ color: 'var(--grail-text-subtle)' }}>No record currently playing</p>
                    </div>
                )}
            </div>

            <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="grail-heading--h2 mb-0">Playback History</h2>
                    <div className="d-flex gap-2">
                        <select
                            className="form-select form-select-sm"
                            style={{ background: 'var(--grail-surface)', border: '1px solid var(--grail-glass-border)', color: 'var(--grail-text)', width: 'auto' }}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="recent">Most Recent</option>
                            <option value="play_count">Play Count</option>
                            <option value="total_time">Total Time</option>
                        </select>
                        <button type="button" className="grail-btn grail-btn--ghost grail-btn--sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                {sortedRecentlyPlayed.length > 0 ? (
                    <div className="row g-3">
                        {sortedRecentlyPlayed.map((record) => (
                            <div key={`${record.discogs_id}-${record.last_played}`} className="col-12 col-md-6 col-lg-4">
                                <Link to={`/release/${record.discogs_id}`} style={{ textDecoration: 'none' }}>
                                    <div className="grail-card p-3 h-100" style={{ color: 'var(--grail-text)' }}>
                                        <h6 className="mb-1 text-truncate">{record.title}</h6>
                                        <p className="small mb-2" style={{ color: 'var(--grail-text-subtle)' }}>{record.artist}</p>
                                        <div className="small" style={{ color: 'var(--grail-text-subtle)' }}>
                                            {formatDurationMinutes(record.total_time_minutes)}
                                            {' · '}{formatTimeAgo(record.last_played)}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grail-card p-5 text-center">
                        <p style={{ color: 'var(--grail-text-subtle)' }}>No playback history yet — spin a record on the turntable</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default MeterScreen;
