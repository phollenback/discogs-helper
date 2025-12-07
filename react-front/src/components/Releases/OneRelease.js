import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../../styles/OneRelease.css';
import InfoPanel from './InfoPanel';
import Tracks from './Tracks';
import Stats from './Stats';
import { useApi } from '../../utility/backSource';
import { useAuthContext } from '../../AuthContext';
import VinylSpinner from '../All/VinylSpinner';
import FollowButton from '../All/FollowButton';
import '../../styles/theme.css';

const ratingScale = [1, 2, 3, 4, 5];

const OneRelease = () => {
    const { id } = useParams();
    const { getData, postData, deleteData } = useApi();
    const { isAuthenticated } = useAuthContext();

    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState('success');

    const [manageForm, setManageForm] = useState({
        wishlist: false,
        notes: '',
        priceThreshold: '',
        rating: null
    });

    const resetMessage = () => {
        setMessage(null);
        setMessageType('success');
    };

    const fetchOverview = useCallback(async () => {
        setLoading(true);
        setError(null);
        resetMessage();
        try {
            const data = await getData(
                `/api/releases/${id}/overview?includeMaster=true&curr_abbr=USD&master_per_page=25`
            );
            
            // Log collection status for debugging - ALWAYS log to see what we got
            console.log(`[OneRelease][fetchOverview] 📦 Full overview data:`, data);
            console.log(`[OneRelease][fetchOverview] 📦 Collection entry:`, data?.collectionEntry);
            
            const releaseId = data?.release?.id;
            const releaseTitle = data?.release?.title;
            
            if (data?.collectionEntry) {
                console.log(`[OneRelease][fetchOverview] ✅ COLLECTION ENTRY FOUND for Release ${releaseId} "${releaseTitle}"`);
                console.log(`[OneRelease][fetchOverview]    - wishlist: ${data.collectionEntry.wishlist}`);
                console.log(`[OneRelease][fetchOverview]    - inCollection: ${data.collectionEntry.inCollection}`);
                console.log(`[OneRelease][fetchOverview]    - notes: "${data.collectionEntry.notes}"`);
                console.log(`[OneRelease][fetchOverview]    - rating: ${data.collectionEntry.rating}`);
                
                if (data.collectionEntry.wishlist) {
                    console.log(`[OneRelease][fetchOverview] ⭐⭐ RELEASE IS IN YOUR WANTLIST ⭐⭐`);
                } else if (data.collectionEntry.inCollection) {
                    console.log(`[OneRelease][fetchOverview] ✅✅ RELEASE IS IN YOUR COLLECTION ✅✅`);
                } else {
                    console.log(`[OneRelease][fetchOverview] ⚠️ Collection entry exists but status unclear`);
                }
            } else {
                console.log(`[OneRelease][fetchOverview] ❌❌ RELEASE ${releaseId} "${releaseTitle}" IS NOT IN COLLECTION OR WANTLIST ❌❌`);
                console.log(`[OneRelease][fetchOverview]    - collectionEntry is null/undefined`);
            }
            
            setOverview(data);
            setManageForm({
                wishlist: data.collectionEntry?.wishlist ?? false,
                notes: data.collectionEntry?.notes ?? '',
                priceThreshold: data.collectionEntry?.priceThreshold ?? '',
                rating: data.collectionEntry?.rating ?? data.userRating ?? null
            });
        } catch (err) {
            console.error('[OneRelease][fetchOverview]', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [getData, id]);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    // Memoize derived data before early returns
    const collectionEntry = overview?.collectionEntry || null;
    
    // Log collection status for debugging - runs when overview/collectionEntry changes
    useEffect(() => {
        if (overview && overview.release) {
            const releaseId = overview.release.id;
            const releaseTitle = overview.release.title;
            
            console.log(`[OneRelease][useEffect] 🔍 Checking collection status for Release ${releaseId} "${releaseTitle}"`);
            console.log(`[OneRelease][useEffect]    - collectionEntry:`, collectionEntry);
            
            if (collectionEntry) {
                console.log(`[OneRelease][useEffect] ✅ COLLECTION ENTRY EXISTS`);
                console.log(`[OneRelease][useEffect]    - wishlist: ${collectionEntry.wishlist}`);
                console.log(`[OneRelease][useEffect]    - inCollection: ${collectionEntry.inCollection}`);
                
                if (collectionEntry.wishlist) {
                    console.log(`[OneRelease][useEffect] ⭐⭐ STATUS: IN WANTLIST ⭐⭐`);
                } else if (collectionEntry.inCollection) {
                    console.log(`[OneRelease][useEffect] ✅✅ STATUS: IN COLLECTION ✅✅`);
                } else {
                    console.log(`[OneRelease][useEffect] ⚠️ STATUS: Entry exists but unclear`);
                }
            } else {
                console.log(`[OneRelease][useEffect] ❌❌ STATUS: NOT IN COLLECTION OR WANTLIST ❌❌`);
            }
        } else {
            console.log(`[OneRelease][useEffect] ⏳ Waiting for overview data...`);
        }
    }, [overview, collectionEntry]);

    const masterVersionsSummary = useMemo(() => {
        const versions = overview?.masterVersions?.versions;
        if (!Array.isArray(versions) || versions.length === 0) {
            return [];
        }
        const counts = versions.reduce((acc, version) => {
            const format = Array.isArray(version.format)
                ? version.format.join(', ')
                : version.format || 'Unknown';
            acc[format] = (acc[format] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([format, count]) => ({ format, count }));
    }, [overview]);

    // Filter out current release from master versions and get related releases
    const relatedReleases = useMemo(() => {
        const versions = overview?.masterVersions?.versions || [];
        if (!Array.isArray(versions) || versions.length === 0) return [];
        const currentReleaseId = overview?.release?.id;
        return versions
            .filter((version) => version.id !== currentReleaseId)
            .slice(0, 8); // Show up to 8 related releases
    }, [overview]);

    const requireAuth = () => {
        if (!isAuthenticated) {
            setMessageType('warning');
            setMessage('Please sign in to manage this release.');
            return false;
        }
        return true;
    };

    const showFeedback = (type, text) => {
        setMessageType(type);
        setMessage(text);
    };

    const handleRatingSelect = (value) => {
        if (!requireAuth()) return;
        // Only update form state, don't save immediately
        setManageForm((prev) => ({ ...prev, rating: value }));
    };

    const handleRemove = async () => {
        if (!requireAuth()) return;
        try {
            await deleteData(`/api/releases/${id}/collection`);
            showFeedback('success', 'Removed from your lists.');
            await fetchOverview();
        } catch (err) {
            console.error('[OneRelease][handleRemove]', err);
            showFeedback('danger', 'Unable to remove this release right now.');
        }
    };

    const handleSave = async () => {
        if (!requireAuth()) return;
        setSaving(true);
        try {
            // Use POST for both new entries and updates (the backend handles it)
            await postData(`/api/releases/${id}/collection`, {
                wishlist: manageForm.wishlist,
                notes: manageForm.notes,
                priceThreshold: manageForm.priceThreshold,
                rating: manageForm.rating
            });
            showFeedback('success', 'Changes saved.');
            await fetchOverview();
        } catch (err) {
            console.error('[OneRelease][handleSave]', err);
            showFeedback('danger', 'Unable to save changes right now.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="release-loading text-center py-5">
                <VinylSpinner size={96} label="Cueing up this release..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="grail-alert grail-alert--danger mt-4">
                <h5 className="mb-2 text-uppercase letter-spaced">Unable to load release</h5>
                <p className="mb-0">
                    {error.response?.data?.message || 'An unexpected error occurred. Please try again later.'}
                </p>
            </div>
        );
    }

    if (!overview) {
        return null;
    }

    const release = overview.release;
    const stats = overview.stats;
    const primaryArtist = Array.isArray(release?.artists)
        ? release.artists.map((artist) => artist.name).join(', ')
        : 'Unknown artist';
    const releaseYear = release?.released || release?.year || 'Unknown year';
    const releaseCountry = Array.isArray(release?.country) ? release.country.join(', ') : release?.country || 'Global';
    const genreTags = Array.isArray(release?.genres) ? release.genres.slice(0, 4) : [];
    const styleTags = Array.isArray(release?.styles) ? release.styles.slice(0, 4) : [];
    const feedbackTone =
        {
            success: 'grail-alert--success',
            warning: 'grail-alert--warning',
            danger: 'grail-alert--danger',
        }[messageType] || '';

    return (
        <div className="release-page">
            {message && (
                <div className={`release-feedback grail-alert ${feedbackTone}`} role="alert">
                    {message}
                </div>
            )}

            <div className="release-grid">
                <aside className="release-grid__sidebar">
                    <InfoPanel release={release} communityRating={overview.communityRating} />
                </aside>

                <section className="release-grid__main">
                    <div className="grail-card release-overview">
                        <div className="release-overview__header">
                            <div className="mb-3">
                                <div className="d-flex align-items-start justify-content-between gap-3 mb-2 flex-wrap">
                                    <div className="flex-grow-1">
                                        <h1 className="grail-section-title mb-1" style={{ fontSize: '2rem', fontWeight: '600' }}>
                                            {release?.title || 'Untitled Release'}
                                        </h1>
                                    </div>
                                    {collectionEntry && (
                                        <span className={`grail-pill-badge ${collectionEntry.wishlist ? 'grail-pill-badge--warning' : 'grail-pill-badge--success'}`} style={{ 
                                            fontSize: '0.875rem',
                                            padding: '0.5rem 1rem',
                                            fontWeight: '600'
                                        }}>
                                            {collectionEntry.wishlist ? '⭐ In Wantlist' : '✓ In Collection'}
                                        </span>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                                    <p className="grail-section-subtitle mb-0" style={{ fontSize: '1.1rem', color: '#888' }}>
                                        {primaryArtist}
                                    </p>
                                    {release?.artists && release.artists.length > 0 && release.artists[0]?.id && (
                                        <FollowButton 
                                            entityType="artist" 
                                            entityId={release.artists[0].id} 
                                            entityName={release.artists[0].name}
                                        />
                                    )}
                                </div>
                                <div className="d-flex flex-wrap gap-3 mb-2" style={{ fontSize: '0.9rem' }}>
                                    <div>
                                        <span className="text-muted me-1">Released:</span>
                                        <span className="fw-medium">{releaseYear}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted me-1">Origin:</span>
                                        <span className="fw-medium">{releaseCountry}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted me-1">Rating:</span>
                                        <span className="fw-medium">
                                            {overview.communityRating?.rating?.average
                                                ? overview.communityRating.rating.average.toFixed(2)
                                                : overview.communityRating?.average
                                                    ? overview.communityRating.average.toFixed(2)
                                                    : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                {(genreTags.length > 0 || styleTags.length > 0) && (
                                    <div className="d-flex flex-wrap gap-2">
                                        {[...genreTags, ...styleTags].map((tag) => (
                                            <span key={tag} className="grail-tag">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="grail-section-subtitle mb-0">
                                Key stats and marketplace activity for this pressing.
                            </p>
                        </div>
                        <div className="grail-fade-divider"></div>
                        <Stats release={release} stats={stats} />
                    </div>

                    <div className="grail-card release-manage">
                        <div className="release-manage__header">
                            <div>
                                <h3 className="grail-section-title mb-2">Manage Your Copy</h3>
                                <p className="grail-section-subtitle">
                                    Add to your collection, set targets, and log your notes.
                                </p>
                            </div>
                            <span className="grail-pill-badge">
                                {collectionEntry ? (collectionEntry.wishlist ? 'Wantlist' : 'In collection') : 'Not saved'}
                                </span>
                        </div>

                        <div className="release-manage__actions">
                        {collectionEntry && (
                                <button
                                    className="grail-btn grail-btn--ghost"
                                    onClick={handleRemove}
                                >
                                    Remove from lists
                                </button>
                            )}
                            <Link
                                to={`/price-suggestion/${id}`}
                                className="grail-btn grail-btn--primary"
                                style={{ textDecoration: 'none' }}
                            >
                                <i className="fas fa-dollar-sign me-2"></i>
                                Get Price Suggestion
                            </Link>
                            </div>

                        <div className="release-rating-scale">
                            <span className="grail-section-subtitle">Your rating</span>
                            <div className="release-rating-scale__buttons">
                                    {ratingScale.map((value) => (
                                        <button
                                            key={value}
                                        className={`grail-btn grail-btn--sm ${manageForm.rating === value ? 'grail-btn--accent' : 'grail-btn--ghost'}`}
                                            onClick={() => handleRatingSelect(value)}
                                        >
                                            {value}
                                        </button>
                                    ))}
                                    <button
                                    className="grail-btn grail-btn--sm grail-btn--ghost"
                                        onClick={() => handleRatingSelect(null)}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                        <div className="release-manage__notes">
                            <label className="release-manage__label">Personal notes</label>
                                <textarea
                                className="release-manage__textarea"
                                    rows={3}
                                    value={manageForm.notes}
                                    onChange={(e) => setManageForm((prev) => ({ ...prev, notes: e.target.value }))}
                                placeholder="Add pressing details, where you found it, grading notes…"
                                />
                            </div>

                        <div className="release-manage__footer">
                            <div className="release-manage__field">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label className="release-manage__label">Price target (USD)</label>
                                    <Link
                                        to={`/price-suggestion/${id}`}
                                        style={{ 
                                            fontSize: '0.875rem', 
                                            color: 'var(--grail-accent)',
                                            textDecoration: 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.textDecoration = 'underline';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.textDecoration = 'none';
                                        }}
                                    >
                                        <i className="fas fa-dollar-sign me-1"></i>
                                        Get price suggestion
                                    </Link>
                                </div>
                                    <input
                                        type="number"
                                    className="release-manage__input"
                                        min="0"
                                        step="0.01"
                                        value={manageForm.priceThreshold}
                                        onChange={(e) =>
                                            setManageForm((prev) => ({
                                                ...prev,
                                                priceThreshold: e.target.value
                                            }))
                                        }
                                        placeholder="0.00"
                                    />
                                </div>
                            <div className="release-manage__field">
                                <label className="release-manage__label">List membership</label>
                                    <select
                                        className="release-manage__select"
                                        value={manageForm.wishlist ? 'wantlist' : 'collection'}
                                        onChange={(e) => {
                                            setManageForm((prev) => ({
                                                ...prev,
                                                wishlist: e.target.value === 'wantlist'
                                            }));
                                        }}
                                    >
                                        <option value="collection">Collection</option>
                                        <option value="wantlist">Wantlist</option>
                                    </select>
                                </div>
                            <div className="release-manage__action">
                                    <button
                                    className="grail-btn grail-btn--primary"
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                    {saving ? 'Saving…' : 'Save changes'}
                                    </button>
                            </div>
                        </div>
                    </div>

                    <div className="grail-card release-tracklist">
                        <div className="release-tracklist__header">
                            <h3 className="grail-section-title mb-2">Track list</h3>
                            <p className="grail-section-subtitle">
                                Side by side view of the grooves on this record.
                            </p>
                        </div>
                            <Tracks tracklist={release?.tracklist || []} />
                    </div>

                    <div className="release-secondary-grid">
                        <div className="grail-card release-collection">
                            <h3 className="grail-section-title mb-2">Your entry</h3>
                            <p className="grail-section-subtitle mb-3">
                                Snapshot of how this release lives in your crates.
                            </p>

                            {collectionEntry ? (
                                <ul className="release-collection__list">
                                    <li>
                                        <span>Status</span>
                                        <span>{collectionEntry.wishlist ? 'Wantlist' : 'Collection'}</span>
                                    </li>
                                    <li>
                                        <span>Rating</span>
                                        <span>{collectionEntry.rating ?? 'Not rated'}</span>
                                    </li>
                                    <li>
                                        <span>Notes</span>
                                        <span>{collectionEntry.notes || '—'}</span>
                                    </li>
                                    <li>
                                        <span>Price target</span>
                                        <span>
                                        {collectionEntry.priceThreshold
                                            ? `$${collectionEntry.priceThreshold}`
                                            : '—'}
                                        </span>
                                    </li>
                                </ul>
                            ) : (
                                <p className="release-collection__empty">
                                    This release isn’t yet in your collection or wantlist.
                                </p>
                            )}
                        </div>

                        <div className="grail-card release-versions">
                            <h3 className="grail-section-title mb-2">Related Releases</h3>
                            <p className="grail-section-subtitle mb-3">
                                Other pressings and versions from this master release.
                            </p>

                            {masterVersionsSummary.length > 0 && (
                                <div className="mb-3">
                                    <p className="grail-section-subtitle mb-2" style={{ fontSize: '0.875rem' }}>Format breakdown:</p>
                                    <ul className="release-versions__summary">
                                        {masterVersionsSummary.map(({ format, count }) => (
                                            <li key={format}>
                                                <span>{format}</span>
                                                <span className="grail-pill-badge">{count}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {relatedReleases.length > 0 ? (
                                <div className="related-releases-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '1rem',
                                    marginTop: '1rem'
                                }}>
                                    {relatedReleases.map((version) => {
                                        const versionLabel = Array.isArray(version.label) 
                                            ? version.label.map((l) => l.name || l).join(', ')
                                            : version.label?.name || version.label || 'Unknown label';
                                        const versionCountry = Array.isArray(version.country) 
                                            ? version.country.join(', ')
                                            : version.country || '';
                                        const versionFormat = Array.isArray(version.format)
                                            ? version.format.join(', ')
                                            : version.format || '';
                                        
                                        return (
                                            <Link
                                                key={version.id}
                                                to={`/release/${version.id}`}
                                                className="related-release-card"
                                                style={{
                                                    display: 'block',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    transition: 'all 0.2s ease',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.02)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                                    e.currentTarget.style.borderColor = 'var(--grail-primary)';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                    {version.title || release.title}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: '1.4' }}>
                                                    {versionLabel && (
                                                        <div style={{ marginBottom: '0.25rem' }}>{versionLabel}</div>
                                                    )}
                                                    <div style={{ marginBottom: '0.25rem' }}>
                                                        {version.released || 'Unknown year'}
                                                        {versionCountry && ` · ${versionCountry}`}
                                                    </div>
                                                    {versionFormat && (
                                                        <div style={{ 
                                                            fontSize: '0.75rem',
                                                            color: 'var(--grail-primary)',
                                                            marginTop: '0.5rem'
                                                        }}>
                                                            {versionFormat}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="release-collection__empty">
                                    {relatedReleases.length === 0 && (overview?.masterVersions?.versions || []).length === 0
                                        ? 'No other versions available for this release.'
                                        : 'This is the only version of this release.'}
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default OneRelease;