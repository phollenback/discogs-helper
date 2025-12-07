import React from 'react';

const ImageSlider = ({ images }) => {
    if (!Array.isArray(images) || images.length === 0) {
        return (
            <div className="image-slider image-slider--empty">
                <i className="fas fa-image fa-2x mb-2"></i>
                <p>No artwork uploaded for this release yet.</p>
            </div>
        );
    }

    const getSource = (image) => image?.uri || image?.resource_url || '';
    const primaryImage = images[0];
    const secondaryImages = images.slice(1, 5);

    return (
        <div className="image-slider">
            <div className="image-slider__primary">
                <img
                    src={getSource(primaryImage)}
                    alt={primaryImage?.type ? `${primaryImage.type} artwork` : 'Release artwork'}
                    loading="lazy"
                />
            </div>

            {secondaryImages.length > 0 && (
                <div className="image-slider__thumbnails">
                    {secondaryImages.map((image, index) => (
                        <a
                            key={`${getSource(image)}-${index}`}
                            href={getSource(image)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="image-slider__thumbnail"
                        >
                            <img src={getSource(image)} alt={`Additional artwork ${index + 1}`} loading="lazy" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageSlider;
