import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/SearchList.css';
import FollowButton from '../All/FollowButton';

const truncate = (text = '', max = 140) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const SearchList = ({ results, searchType, onAddToWantlist }) => {
  const [hoveredId, setHoveredId] = useState(null);

  const renderReleaseCard = (release) => (
    <article
      key={release.id}
      className={`search-release-card${hoveredId === release.id ? ' is-hovered' : ''}`}
      onMouseEnter={() => setHoveredId(release.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <Link to={`/release/${release.id}`} className="search-release-card__cover-link">
        <img
          src={release.thumb || 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image'}
          className="search-release-card__cover"
          alt={release.title}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image';
          }}
        />
      </Link>
      <div className="search-release-card__body">
        <Link to={`/release/${release.id}`} className="search-release-card__title">
          {release.title}
        </Link>
        <p className="search-release-card__meta">{release.year}</p>
        {release.genre?.length > 0 && (
          <p className="search-release-card__meta search-release-card__meta--truncate">
            {Array.isArray(release.genre) ? release.genre.join(', ') : release.genre}
          </p>
        )}
        <button
          type="button"
          className="btn btn--ghost btn-sm search-release-card__action"
          onClick={() => onAddToWantlist(release)}
        >
          Add to wantlist
        </button>
      </div>
    </article>
  );

  const renderEntityRow = (entity, type) => {
    const detailPath = type === 'artist' ? `/artist/${entity.id}` : `/label/${entity.id}`;
    const name = entity.name;
    const subtitle = type === 'artist' ? entity.realName : entity.country;

    return (
      <article
        key={entity.id}
        className={`search-entity-row${hoveredId === entity.id ? ' is-hovered' : ''}`}
        onMouseEnter={() => setHoveredId(entity.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <Link to={detailPath} className="search-entity-row__thumb-link">
          <img
            src={entity.thumb || `https://via.placeholder.com/120x120/cccccc/666666?text=${type}`}
            alt={name}
            className="search-entity-row__thumb"
            onError={(e) => {
              e.target.src = `https://via.placeholder.com/120x120/cccccc/666666?text=${type}`;
            }}
          />
        </Link>

        <div className="search-entity-row__main">
          <Link to={detailPath} className="search-entity-row__title">
            {name}
          </Link>
          {subtitle && <p className="search-entity-row__meta">{subtitle}</p>}
          {entity.profile && (
            <p className="search-entity-row__bio">{truncate(entity.profile, 140)}</p>
          )}
        </div>

        <div className="search-entity-row__actions">
          <FollowButton
            entityType={type}
            entityId={entity.id}
            entityName={name}
            compact
          />
          <Link to={detailPath} className="btn btn--ghost btn-sm">
            View details
          </Link>
          <a
            href={entity.uri || entity.resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost btn-sm"
          >
            Discogs
          </a>
        </div>
      </article>
    );
  };

  const emptyStateMessage = () => {
    switch (searchType) {
      case 'artist':
        return 'Try refining the artist name or adding more details.';
      case 'label':
        return 'Try refining the label name or adding more details.';
      default:
        return 'Try adjusting your search terms.';
    }
  };

  const typeLabel = searchType === 'artist' ? 'Artists' : searchType === 'label' ? 'Labels' : 'Releases';

  return (
    <div className="search-list">
      {results.length === 0 ? (
        <div className="page-empty">
          <p className="page-empty__title">No results found</p>
          <p>{emptyStateMessage()}</p>
        </div>
      ) : (
        <>
          <div className="search-list__header">
            <h2 className="search-list__title">{typeLabel}</h2>
            <span className="search-list__count">{results.length} results</span>
          </div>

          {searchType === 'release' ? (
            <div className="search-release-grid">
              {results.map(renderReleaseCard)}
            </div>
          ) : (
            <div className="search-entity-list">
              {results.map((item) => renderEntityRow(item, searchType))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchList;
