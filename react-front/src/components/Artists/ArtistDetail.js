import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../utility/backSource';
import VinylSpinner from '../All/VinylSpinner';
import FollowButton from '../All/FollowButton';

const ArtistDetail = () => {
    const { id: idParam } = useParams();
    const { getData } = useApi();

    // Extract artist ID from URL (handle format like "6365678-MATT-OX" -> "6365678")
    const artistId = idParam?.split('-')[0] || idParam;

    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('year');
    const [sortOrder, setSortOrder] = useState('desc');
    const [perPage] = useState(25);

    const fetchOverview = useCallback(async () => {
        if (!artistId) {
            setError({ message: 'Invalid artist ID' });
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getData(
                `/api/artists/${artistId}/overview?page=${currentPage}&per_page=${perPage}&sort=${sortBy}&sort_order=${sortOrder}`
            );
            setOverview(data);
        } catch (err) {
            console.error('[ArtistDetail][fetchOverview]', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [getData, artistId, currentPage, perPage, sortBy, sortOrder]);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <VinylSpinner />
            </div>
        );
    }

    if (error) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load artist information. Please try again.';
        return (
            <div className="container mt-5">
                <div className="alert alert-danger" role="alert">
                    <h4 className="alert-heading">Error Loading Artist</h4>
                    <p>{errorMessage}</p>
                    <hr />
                    <button className="btn btn-outline-danger" onClick={fetchOverview}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!overview || !overview.artist) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning" role="alert">
                    Artist not found.
                </div>
            </div>
        );
    }

    const { artist, releases, stats } = overview;
    const releasesList = releases?.releases || [];
    const pagination = releases?.pagination || {};

    const handleSortChange = (newSort) => {
        if (newSort === sortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSort);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="container mt-4">
            {/* Artist Header */}
            <div className="row mb-4">
                <div className="col-md-3 text-center mb-3 mb-md-0">
                    <img
                        src={artist.images && artist.images.length > 0 ? artist.images[0].uri : artist.thumb || 'https://via.placeholder.com/300x300/666666/cccccc?text=Artist'}
                        alt={artist.name}
                        className="img-fluid rounded"
                        style={{ maxWidth: '300px', width: '100%' }}
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x300/666666/cccccc?text=Artist';
                        }}
                    />
                </div>
                <div className="col-md-9">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <h1 className="text-light mb-0">{artist.name}</h1>
                        <FollowButton 
                            entityType="artist" 
                            entityId={artistId} 
                            entityName={artist.name}
                        />
                    </div>
                    {artist.realname && (
                        <p className="text-muted mb-2">
                            <i className="fas fa-signature me-2"></i>
                            <strong>Real Name:</strong> {artist.realname}
                        </p>
                    )}
                    {artist.profile && (
                        <div className="mb-3">
                            <p className="text-light" style={{ whiteSpace: 'pre-wrap' }}>
                                {artist.profile}
                            </p>
                        </div>
                    )}
                    {artist.urls && artist.urls.length > 0 && (
                        <div className="mb-3">
                            <strong className="text-light me-2 d-block mb-2">Links:</strong>
                            <div className="d-flex flex-wrap gap-2">
                                {artist.urls.map((url, idx) => {
                                    try {
                                        const urlObj = new URL(url);
                                        return (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-light"
                                                style={{
                                                    textDecoration: 'none',
                                                    borderBottom: '1px solid #888',
                                                    paddingBottom: '1px',
                                                    fontSize: '0.9rem',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.borderBottomColor = '#fff';
                                                    e.target.style.color = '#fff';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.borderBottomColor = '#888';
                                                    e.target.style.color = '#e0e0e0';
                                                }}
                                            >
                                                {urlObj.hostname.replace('www.', '')}
                                                <i className="fas fa-external-link-alt ms-1" style={{ fontSize: '0.75rem' }}></i>
                                            </a>
                                        );
                                    } catch {
                                        return null;
                                    }
                                })}
                            </div>
                        </div>
                    )}
                    <a
                        href={artist.uri || `https://www.discogs.com/artist/${artistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-light"
                        style={{
                            textDecoration: 'none',
                            borderBottom: '1px solid #888',
                            paddingBottom: '2px',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s ease',
                            display: 'inline-block'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.borderBottomColor = '#fff';
                            e.target.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.borderBottomColor = '#888';
                            e.target.style.color = '#e0e0e0';
                        }}
                    >
                        View on Discogs
                        <i className="fas fa-external-link-alt ms-1" style={{ fontSize: '0.75rem' }}></i>
                    </a>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card" style={{ background: '#404040', border: '1px solid #666' }}>
                            <div className="card-body">
                                <h5 className="card-title text-light mb-3">
                                    <i className="fas fa-chart-bar me-2"></i>
                                    Statistics
                                </h5>
                                <div className="row">
                                    <div className="col-md-3 mb-2 mb-md-0">
                                        <div className="text-center">
                                            <h3 className="text-primary">{stats.totalReleases}</h3>
                                            <p className="text-light mb-0">Total Releases</p>
                                        </div>
                                    </div>
                                    {stats.earliestYear && (
                                        <div className="col-md-3 mb-2 mb-md-0">
                                            <div className="text-center">
                                                <h3 className="text-primary">{stats.earliestYear}</h3>
                                                <p className="text-light mb-0">Earliest Release</p>
                                            </div>
                                        </div>
                                    )}
                                    {stats.latestYear && (
                                        <div className="col-md-3 mb-2 mb-md-0">
                                            <div className="text-center">
                                                <h3 className="text-primary">{stats.latestYear}</h3>
                                                <p className="text-light mb-0">Latest Release</p>
                                            </div>
                                        </div>
                                    )}
                                    {stats.yearSpan > 0 && (
                                        <div className="col-md-3 mb-2 mb-md-0">
                                            <div className="text-center">
                                                <h3 className="text-primary">{stats.yearSpan}</h3>
                                                <p className="text-light mb-0">Year Span</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Releases Section */}
            <div className="row">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2 className="text-light mb-0">
                            <i className="fas fa-compact-disc me-2"></i>
                            Releases
                        </h2>
                        <div className="d-flex gap-2">
                            <select
                                className="form-select form-select-sm"
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [sort, order] = e.target.value.split('-');
                                    setSortBy(sort);
                                    setSortOrder(order);
                                    setCurrentPage(1);
                                }}
                                style={{ background: '#404040', color: '#fff', border: '1px solid #666' }}
                            >
                                <option value="year-desc">Year (Newest First)</option>
                                <option value="year-asc">Year (Oldest First)</option>
                                <option value="title-asc">Title (A-Z)</option>
                                <option value="title-desc">Title (Z-A)</option>
                                <option value="format-asc">Format (A-Z)</option>
                                <option value="format-desc">Format (Z-A)</option>
                            </select>
                        </div>
                    </div>

                    {releasesList.length === 0 ? (
                        <div className="alert alert-info" role="alert">
                            No releases found for this artist.
                        </div>
                    ) : (
                        <>
                            <div className="row">
                                {releasesList.map((release) => (
                                    <div key={release.id} className="col-6 col-sm-4 col-md-3 col-lg-2 mb-3">
                                        <Link
                                            to={`/release/${release.id}`}
                                            className="text-decoration-none"
                                        >
                                            <div className="card h-100" style={{
                                                background: '#404040',
                                                border: '1px solid #666',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-5px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                            >
                                                <img
                                                    src={release.thumb || 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image'}
                                                    className="card-img-top"
                                                    alt={release.title}
                                                    style={{
                                                        width: '100%',
                                                        height: '150px',
                                                        objectFit: 'cover'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image';
                                                    }}
                                                />
                                                <div className="card-body p-2">
                                                    <h6 className="card-title text-light mb-1" style={{
                                                        fontSize: '0.85rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {release.title}
                                                    </h6>
                                                    {release.year && (
                                                        <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                                                            {release.year}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <nav aria-label="Releases pagination" className="mt-4">
                                    <ul className="pagination justify-content-center">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                style={{ background: '#404040', color: '#fff', border: '1px solid #666' }}
                                            >
                                                Previous
                                            </button>
                                        </li>
                                        {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.pages <= 10) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= pagination.pages - 4) {
                                                pageNum = pagination.pages - 9 + i;
                                            } else {
                                                pageNum = currentPage - 5 + i;
                                            }
                                            return (
                                                <li
                                                    key={pageNum}
                                                    className={`page-item ${currentPage === pageNum ? 'active' : ''}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        onClick={() => handlePageChange(pageNum)}
                                                        style={{
                                                            background: currentPage === pageNum ? '#007bff' : '#404040',
                                                            color: '#fff',
                                                            border: '1px solid #666'
                                                        }}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                        <li className={`page-item ${currentPage === pagination.pages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === pagination.pages}
                                                style={{ background: '#404040', color: '#fff', border: '1px solid #666' }}
                                            >
                                                Next
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArtistDetail;


