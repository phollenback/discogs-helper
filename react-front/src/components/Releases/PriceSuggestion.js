import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';
import '../../styles/theme.css';

const PriceSuggestion = () => {
    const { releaseId } = useParams();
    const navigate = useNavigate();
    const { authState } = useAuthContext();
    const [priceData, setPriceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [releaseInfo, setReleaseInfo] = useState(null);

    useEffect(() => {
        if (releaseId) {
            fetchPriceSuggestions();
            fetchReleaseInfo();
        }
    }, [releaseId]);

    const fetchPriceSuggestions = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Use relative URL - nginx will proxy to backend
            const response = await fetch(`/api/discogs/marketplace/price_suggestions/${releaseId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch price suggestions: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            setPriceData(data);
        } catch (err) {
            console.error('Error fetching price suggestions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchReleaseInfo = async () => {
        try {
            // Use relative URL - nginx will proxy to backend
            const response = await fetch(`/api/discogs/releases/${releaseId}`);
            
            if (response.ok) {
                const data = await response.json();
                setReleaseInfo(data);
            }
        } catch (err) {
            console.error('Error fetching release info:', err);
        }
    };

    const formatPrice = (price) => {
        if (typeof price === 'number') {
            return `$${price.toFixed(2)}`;
        }
        return 'N/A';
    };

    const getConditionColor = (condition) => {
        const conditionColors = {
            'Mint (M)': 'var(--grail-success)',
            'Near Mint (NM or M-)': 'var(--grail-primary)',
            'Very Good Plus (VG+)': 'var(--grail-highlight)',
            'Very Good (VG)': '#ffa500',
            'Good Plus (G+)': '#ff8c00',
            'Good (G)': '#ff6b6b',
            'Fair (F)': 'var(--grail-danger)',
            'Poor (P)': 'var(--grail-danger)'
        };
        return conditionColors[condition] || 'var(--grail-text-subtle)';
    };

    const getConditionIcon = (condition) => {
        if (condition.includes('Mint')) return 'fas fa-gem';
        if (condition.includes('Very Good Plus')) return 'fas fa-star';
        if (condition.includes('Very Good')) return 'fas fa-star-half-alt';
        if (condition.includes('Good')) return 'fas fa-thumbs-up';
        return 'fas fa-compact-disc';
    };

    if (loading) {
        return (
            <div className="grail-shell">
                <div className="grail-content">
                    <div style={{ textAlign: 'center', padding: 'var(--grail-spacing-lg) 0' }}>
                        <div className="vinyl-spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: 'var(--grail-spacing-md)', color: 'var(--grail-text-subtle)' }}>
                            Fetching price suggestions from Discogs...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="grail-shell">
                <div className="grail-content">
                    <div className="grail-card">
                        <div className="grail-alert grail-alert--danger">
                            <h4 style={{ 
                                marginBottom: 'var(--grail-spacing-sm)', 
                                color: 'var(--grail-text)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--grail-spacing-xs)'
                            }}>
                                <i className="fas fa-exclamation-triangle"></i>
                                Error Loading Price Suggestions
                            </h4>
                            <p style={{ marginBottom: 'var(--grail-spacing-md)' }}>{error}</p>
                            <div style={{ display: 'flex', gap: 'var(--grail-spacing-sm)', flexWrap: 'wrap' }}>
                                <button 
                                    className="grail-btn grail-btn--ghost"
                                    onClick={() => navigate(-1)}
                                >
                                    <i className="fas fa-arrow-left"></i>
                                    Go Back
                                </button>
                                <button 
                                    className="grail-btn grail-btn--primary"
                                    onClick={fetchPriceSuggestions}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grail-shell">
            <div className="grail-content">
                {/* Header */}
                <div style={{ marginBottom: 'var(--grail-spacing-lg)' }}>
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 'var(--grail-spacing-md)',
                        marginBottom: 'var(--grail-spacing-md)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--grail-spacing-md)' }}>
                            <div>
                                <h1 className="grail-section-title" style={{ 
                                    marginBottom: 'var(--grail-spacing-xs)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--grail-spacing-sm)'
                                }}>
                                    <i className="fas fa-dollar-sign" style={{ color: 'var(--grail-success)' }}></i>
                                    Price Suggestions
                                </h1>
                                <p className="grail-section-subtitle">Market pricing data from Discogs marketplace</p>
                            </div>
                            <button 
                                className="grail-btn grail-btn--ghost"
                                onClick={() => navigate(-1)}
                            >
                                <i className="fas fa-arrow-left"></i>
                                Back
                            </button>
                        </div>

                        {/* Release Info */}
                        {releaseInfo && (
                            <div className="grail-card">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--grail-spacing-md)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--grail-spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {releaseInfo.images && releaseInfo.images[0] && (
                                            <img 
                                                src={releaseInfo.images[0].uri} 
                                                alt={releaseInfo.title}
                                                style={{ 
                                                    maxHeight: '120px', 
                                                    width: 'auto',
                                                    borderRadius: 'var(--grail-radius-md)',
                                                    boxShadow: 'var(--grail-shadow)'
                                                }}
                                            />
                                        )}
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h3 style={{ 
                                                marginBottom: 'var(--grail-spacing-xs)',
                                                color: 'var(--grail-text)',
                                                fontSize: '1.25rem',
                                                fontWeight: '700'
                                            }}>
                                                {releaseInfo.title}
                                            </h3>
                                            <p style={{ 
                                                marginBottom: 'var(--grail-spacing-sm)',
                                                color: 'var(--grail-text-subtle)'
                                            }}>
                                                <strong style={{ color: 'var(--grail-text)' }}>{releaseInfo.artists?.[0]?.name}</strong>
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--grail-spacing-xs)' }}>
                                                <span className="grail-pill-badge">
                                                    <i className="fas fa-calendar"></i>
                                                    {releaseInfo.year}
                                                </span>
                                                <span className="grail-pill-badge">
                                                    <i className="fas fa-compact-disc"></i>
                                                    {releaseInfo.formats?.[0]?.name}
                                                </span>
                                                <span className="grail-pill-badge">
                                                    <i className="fas fa-tag"></i>
                                                    Release ID: {releaseId}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Price Suggestions */}
                {priceData ? (
                    <div>
                        <div className="grail-card">
                            <div style={{ 
                                marginBottom: 'var(--grail-spacing-md)',
                                paddingBottom: 'var(--grail-spacing-md)',
                                borderBottom: '1px solid var(--grail-glass-border)'
                            }}>
                                <h2 className="grail-section-title" style={{ 
                                    fontSize: '1.1rem',
                                    marginBottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--grail-spacing-xs)'
                                }}>
                                    <i className="fas fa-chart-line" style={{ color: 'var(--grail-success)' }}></i>
                                    Price Breakdown by Condition
                                </h2>
                            </div>
                            {priceData && Object.keys(priceData).length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="grail-table">
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left' }}>
                                                    <i className="fas fa-star" style={{ marginRight: 'var(--grail-spacing-xs)' }}></i>
                                                    Condition
                                                </th>
                                                <th style={{ textAlign: 'right' }}>
                                                    <i className="fas fa-dollar-sign" style={{ marginRight: 'var(--grail-spacing-xs)' }}></i>
                                                    Suggested Price
                                                </th>
                                                <th style={{ textAlign: 'center' }}>
                                                    <i className="fas fa-info-circle" style={{ marginRight: 'var(--grail-spacing-xs)' }}></i>
                                                    Details
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(priceData).map(([condition, priceInfo]) => (
                                                <tr key={condition}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--grail-spacing-sm)' }}>
                                                            <i 
                                                                className={getConditionIcon(condition)} 
                                                                style={{ color: getConditionColor(condition), fontSize: '1.1rem' }}
                                                            ></i>
                                                            <span style={{ fontWeight: '600', color: 'var(--grail-text)' }}>{condition}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <span className="grail-pill-badge" style={{ 
                                                            backgroundColor: getConditionColor(condition) + '33',
                                                            border: `1px solid ${getConditionColor(condition)}`,
                                                            color: getConditionColor(condition),
                                                            fontSize: '0.9rem',
                                                            fontWeight: '700'
                                                        }}>
                                                            {formatPrice(priceInfo?.value || priceInfo)}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {typeof priceInfo === 'object' && priceInfo.currency && (
                                                            <small style={{ color: 'var(--grail-text-subtle)' }}>
                                                                {priceInfo.currency}
                                                            </small>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 'var(--grail-spacing-lg) 0' }}>
                                    <i className="fas fa-chart-line" style={{ fontSize: '3rem', color: 'var(--grail-muted)', marginBottom: 'var(--grail-spacing-sm)' }}></i>
                                    <h4 style={{ color: 'var(--grail-text-subtle)', marginTop: 'var(--grail-spacing-sm)' }}>No Price Data Available</h4>
                                    <p style={{ color: 'var(--grail-muted)' }}>
                                        Price suggestions are not available for this release at the moment.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Additional Info */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                            gap: 'var(--grail-spacing-md)',
                            marginTop: 'var(--grail-spacing-lg)'
                        }}>
                            <div className="grail-card grail-card--compact">
                                <div style={{ textAlign: 'center' }}>
                                    <i className="fas fa-info-circle" style={{ 
                                        fontSize: '2rem', 
                                        color: 'var(--grail-primary)',
                                        marginBottom: 'var(--grail-spacing-sm)'
                                    }}></i>
                                    <h6 style={{ 
                                        color: 'var(--grail-text)',
                                        marginBottom: 'var(--grail-spacing-xs)',
                                        fontWeight: '700'
                                    }}>
                                        About Price Suggestions
                                    </h6>
                                    <p style={{ 
                                        color: 'var(--grail-text-subtle)',
                                        fontSize: '0.85rem',
                                        margin: 0
                                    }}>
                                        Prices are based on recent marketplace activity and may vary. 
                                        Always check current listings for the most accurate pricing.
                                    </p>
                                </div>
                            </div>
                            <div className="grail-card grail-card--compact">
                                <div style={{ textAlign: 'center' }}>
                                    <i className="fas fa-external-link-alt" style={{ 
                                        fontSize: '2rem', 
                                        color: 'var(--grail-primary)',
                                        marginBottom: 'var(--grail-spacing-sm)'
                                    }}></i>
                                    <h6 style={{ 
                                        color: 'var(--grail-text)',
                                        marginBottom: 'var(--grail-spacing-sm)',
                                        fontWeight: '700'
                                    }}>
                                        View on Discogs
                                    </h6>
                                    <a 
                                        href={`https://www.discogs.com/release/${releaseId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="grail-btn grail-btn--primary grail-btn--sm"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <i className="fas fa-external-link-alt"></i>
                                        Open in Discogs
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: 'var(--grail-spacing-sm)',
                            marginTop: 'var(--grail-spacing-lg)',
                            flexWrap: 'wrap'
                        }}>
                            <button 
                                className="grail-btn grail-btn--primary"
                                onClick={fetchPriceSuggestions}
                            >
                                <i className="fas fa-sync-alt"></i>
                                Refresh Prices
                            </button>
                            <Link 
                                to="/collection"
                                className="grail-btn grail-btn--ghost"
                                style={{ textDecoration: 'none' }}
                            >
                                <i className="fas fa-compact-disc"></i>
                                Back to Collection
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grail-card">
                        <div style={{ textAlign: 'center', padding: 'var(--grail-spacing-lg) 0' }}>
                            <i className="fas fa-exclamation-circle" style={{ 
                                fontSize: '3rem', 
                                color: 'var(--grail-highlight)',
                                marginBottom: 'var(--grail-spacing-sm)'
                            }}></i>
                            <h3 style={{ color: 'var(--grail-text-subtle)', marginTop: 'var(--grail-spacing-md)' }}>No Data Available</h3>
                            <p style={{ color: 'var(--grail-muted)', marginBottom: 'var(--grail-spacing-md)' }}>
                                Unable to load price suggestions for this release.
                            </p>
                            <button 
                                className="grail-btn grail-btn--primary"
                                onClick={fetchPriceSuggestions}
                            >
                                <i className="fas fa-sync-alt"></i>
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceSuggestion;
