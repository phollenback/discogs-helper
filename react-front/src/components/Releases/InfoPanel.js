import React from 'react';
import ImageSlider from './ImageSlider';
import FollowButton from '../All/FollowButton';

const InfoPanel = ({ release, communityRating }) => {
    const images = release?.images || [];
    const labelNames = Array.isArray(release?.labels)
        ? release.labels.map((label) => label.name).join(', ')
        : 'Independent';
    const catalogNumbers = Array.isArray(release?.labels)
        ? release.labels
            .map((label) => label.catno)
            .filter(Boolean)
            .join(' • ')
        : null;
    const formats = Array.isArray(release?.formats)
        ? release.formats
            .map((format) => format.name || format.text)
            .filter(Boolean)
            .join(', ')
        : 'Various';
    const barcode = Array.isArray(release?.identifiers)
        ? release.identifiers.find((identifier) => identifier.type === 'Barcode')?.value
        : null;
    const trackCount = Array.isArray(release?.tracklist) ? release.tracklist.length : 0;
    const ratingValue =
        communityRating?.rating?.average ??
        communityRating?.average ??
        null;

    return (
        <div className="info-panel grail-card grail-card--compact">
            <div className="info-panel__media">
                <ImageSlider images={images} />
            </div>

            <div className="info-panel__meta">
                <div className="info-panel__section">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <span className="info-panel__label">Label</span>
                            <span className="info-panel__value">{labelNames}</span>
                            {catalogNumbers && (
                                <span className="info-panel__hint">Cat. {catalogNumbers}</span>
                            )}
                        </div>
                        {release?.labels && release.labels.length > 0 && release.labels[0]?.id && (
                            <FollowButton 
                                entityType="label" 
                                entityId={release.labels[0].id} 
                                entityName={release.labels[0].name}
                            />
                        )}
                    </div>
                </div>

                <div className="info-panel__section">
                    <span className="info-panel__label">Format</span>
                    <span className="info-panel__value">{formats}</span>
                    {trackCount > 0 && (
                        <span className="info-panel__hint">{trackCount} tracks</span>
                    )}
                </div>

                {ratingValue && (
                    <div className="info-panel__rating">
                        <span className="info-panel__label">Community rating</span>
                        <div className="info-panel__rating-value">
                            <span>{Number(ratingValue).toFixed(2)}</span>
                            <small>avg</small>
                        </div>
                    </div>
                )}

                {barcode && (
                    <div className="info-panel__section">
                        <span className="info-panel__label">Barcode</span>
                        <span className="info-panel__value">{barcode}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InfoPanel;
