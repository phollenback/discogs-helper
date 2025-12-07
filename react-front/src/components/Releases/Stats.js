import React from 'react';

const Stats = ({ release, stats }) => {
    const formattedArtists = Array.isArray(release?.artists)
        ? release.artists.map((artist) => artist.name).join(', ')
        : '—';

    const formattedFormats = Array.isArray(release?.formats)
        ? release.formats.map((format) => format.name || format.text).filter(Boolean).join(', ')
        : '—';

    const lowestPrice = release?.lowest_price
        ? `$${Number(release.lowest_price).toFixed(2)}`
        : '—';

    const marketplaceLink = release?.uri || release?.resource_url || null;

    const statCards = [
        {
            label: 'For sale',
            value: release?.num_for_sale ?? '—',
            icon: 'fas fa-store',
        },
        {
            label: 'Lowest price',
            value: lowestPrice,
            icon: 'fas fa-tag',
        },
        {
            label: 'Formats',
            value: formattedFormats,
            icon: 'fas fa-compact-disc',
        },
        {
            label: 'Community have',
            value: stats?.have ?? '—',
            icon: 'fas fa-people-carry',
        },
        {
            label: 'Community want',
            value: stats?.want ?? '—',
            icon: 'fas fa-heart',
        },
        {
            label: 'Artists',
            value: formattedArtists,
            icon: 'fas fa-microphone-alt',
        },
    ];

    return (
        <div className="release-stats-grid">
            {statCards.map(({ label, value, icon }) => (
                <div key={label} className="release-stats-card">
                    <span className="release-stats-card__icon">
                        <i className={icon}></i>
                    </span>
                    <span className="release-stats-card__label">{label}</span>
                    <span className="release-stats-card__value">{value || '—'}</span>
                </div>
            ))}

            {marketplaceLink && (
                <a
                    className="release-stats-cta grail-btn grail-btn--ghost"
                    href={marketplaceLink}
                    target="_blank"
                    rel="noreferrer"
                >
                    Explore on Discogs
                </a>
            )}
        </div>
    );
};

export default Stats;