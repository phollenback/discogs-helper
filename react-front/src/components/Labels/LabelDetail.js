import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../utility/backSource';
import VinylSpinner from '../All/VinylSpinner';
import FollowButton from '../All/FollowButton';

const LabelDetail = () => {
    const { id: idParam } = useParams();
    const { getData } = useApi();

    // Extract label ID from URL (handle format like "1-ATLANTIC" -> "1")
    const labelId = idParam?.split('-')[0] || idParam;

    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(25);

    const fetchOverview = useCallback(async () => {
        if (!labelId) {
            setError({ message: 'Invalid label ID' });
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getData(
                `/api/labels/${labelId}/overview?page=${currentPage}&per_page=${perPage}`
            );
            setOverview(data);
        } catch (err) {
            console.error('[LabelDetail][fetchOverview]', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [getData, labelId, currentPage, perPage]);

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
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load label information. Please try again.';
        return (
            <div className="container mt-5">
                <div className="alert alert-danger" role="alert">
                    <h4 className="alert-heading">Error Loading Label</h4>
                    <p>{errorMessage}</p>
                    <hr />
                    <button className="btn btn-outline-danger" onClick={fetchOverview}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!overview || !overview.label) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning" role="alert">
                    Label not found.
                </div>
            </div>
        );
    }

    const { label, releases, stats } = overview;
    const releasesList = releases?.releases || [];
    const pagination = releases?.pagination || {};

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="container mt-4">
            {/* Label Header */}
            <div className="row mb-4">
                <div className="col-md-3 text-center mb-3 mb-md-0">
                    <img
                        src={label.images && label.images.length > 0 ? label.images[0].uri : label.thumb || 'https://via.placeholder.com/300x300/666666/cccccc?text=Label'}
                        alt={label.name}
                        className="img-fluid rounded"
                        style={{ maxWidth: '300px', width: '100%' }}
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x300/666666/cccccc?text=Label';
                        }}
                    />
                </div>
                <div className="col-md-9">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <h1 className="text-light mb-0">{label.name}</h1>
                        <FollowButton 
                            entityType="label" 
                            entityId={labelId} 
                            entityName={label.name}
                        />
                    </div>
                    {label.profile && (
                        <div className="mb-3">
                            <p className="text-light" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                {label.profile}
                            </p>
                        </div>
                    )}
                    <div className="mb-3">
                        {label.contact_info && (
                            <div className="mb-3">
                                <strong className="text-light me-2">Contact:</strong>
                                <p className="text-light mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                    {label.contact_info}
                                </p>
                            </div>
                        )}
                        {label.parent_label && (
                            <div className="mb-3">
                                <strong className="text-light me-2">Parent Label:</strong>
                                <span className="text-light">{label.parent_label.name}</span>
                            </div>
                        )}
                        {label.sublabels && label.sublabels.length > 0 && (
                            <div className="mb-3">
                                <strong className="text-light me-2 d-block mb-1">Sublabels:</strong>
                                <div className="text-light" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
                                    {label.sublabels.map((sublabel: any, idx: number) => (
                                        <span key={idx}>
                                            {sublabel.name}
                                            {idx < label.sublabels.length - 1 && ', '}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {label.urls && label.urls.length > 0 && (
                            <div className="mb-3">
                                <strong className="text-light me-2 d-block mb-2">Links:</strong>
                                <div className="d-flex flex-wrap gap-2">
                                    {label.urls.map((url: string, idx: number) => {
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
                    </div>
                    <a
                        href={label.uri || `https://www.discogs.com/label/${labelId}`}
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
                    </div>

                    {releasesList.length === 0 ? (
                        <div className="alert alert-info" role="alert">
                            No releases found for this label.
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
                                                    {release.artist && (
                                                        <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
                                                            {release.artist}
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

export default LabelDetail;

