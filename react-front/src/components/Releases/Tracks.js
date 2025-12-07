import React from 'react';

const Tracks = ({ tracklist }) => {
    if (!Array.isArray(tracklist) || tracklist.length === 0) {
        return (
            <div className="release-tracklist__empty">
                <i className="fas fa-music me-2"></i>
                No tracklist available for this release.
            </div>
        );
    }

    return (
        <ul className="release-tracklist__list">
            {tracklist.map((track, index) => (
                <li key={`${track.position || index}-${track.title}`} className="release-tracklist__item">
                    <span className="release-tracklist__position">{track.position || index + 1}</span>
                    <span className="release-tracklist__title">{track.title}</span>
                    {track.duration && <span className="release-tracklist__duration">{track.duration}</span>}
                </li>
            ))}
        </ul>
    );
};

export default Tracks;
