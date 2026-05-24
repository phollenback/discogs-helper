import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchForm from './SearchForm';
import SearchList from './SearchList';
import axios from 'axios';
import { useDiscogs } from '../../utility/dataSource';
import { useApi } from '../../utility/backSource';
import { useAuthContext } from '../../AuthContext';

const SearchScreen = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [searchType, setSearchType] = useState(searchParams.get('type') || 'release');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { putData: putDiscogsData } = useDiscogs();
    const { updateData } = useApi();
    const { authState } = useAuthContext();

    useEffect(() => {
        const q = searchParams.get('q') || '';
        const type = searchParams.get('type') || 'release';
        setSearchTerm(q);
        setSearchType(type);
    }, [searchParams]);

    useEffect(() => {
        if (searchTerm !== '') {
            loadResults();
        } else {
            setResults([]);
        }
    }, [searchTerm, searchType]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadResults = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = process.env.REACT_APP_DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';
            const response = await axios.get('https://api.discogs.com/database/search', {
                params: {
                    q: searchTerm,
                    token,
                    type: searchType,
                    per_page: 50,
                },
            });

            const mappedResults = response.data.results.map((item) => {
                if (searchType === 'artist') {
                    return {
                        id: item.id,
                        name: item.title || item.name || 'Unknown Artist',
                        realName: item.realname || '',
                        profile: item.profile || '',
                        thumb: item.thumb || item.cover_image || '',
                        uri: item.uri,
                        resourceUrl: item.resource_url,
                        type: item.type
                    };
                }

                if (searchType === 'label') {
                    return {
                        id: item.id,
                        name: item.title || item.name || 'Unknown Label',
                        profile: item.profile || '',
                        country: item.country || '',
                        thumb: item.thumb || item.cover_image || '',
                        uri: item.uri,
                        resourceUrl: item.resource_url,
                        type: item.type
                    };
                }

                return {
                    thumb: item.thumb || item.cover_image || '',
                    year: item.year || 'Unknown',
                    genre: item.genre || [],
                    style: item.style || [],
                    id: item.id,
                    title: item.title || 'Untitled',
                    artists: item.artists || [],
                    resourceUrl: item.resource_url,
                    uri: item.uri,
                    country: item.country || '',
                    format: item.format || []
                };
            });

            let uniqueResults = mappedResults;

            if (searchType === 'release') {
                uniqueResults = mappedResults.filter((release, index, self) =>
                    index === self.findIndex(r =>
                        r.title.toLowerCase() === release.title.toLowerCase() &&
                        r.year === release.year
                    )
                );
            }

            setResults(uniqueResults);
        } catch (err) {
            console.error('[SEARCH] Error fetching search data:', err);
            setError('Failed to fetch search results. Please try again.');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToWantlist = async (release) => {
        if (searchType !== 'release') return;

        if (!authState.username) {
            alert('Please sign in to use this feature.');
            return;
        }

        try {
            await putDiscogsData(`/users/${authState.username}/wants/${release.id}`);
            await updateData(`/api/users/${authState.userId}/collection/${release.id}`, {
                rating: 0,
                notes: '',
                price_threshold: 0,
                wishlist: 1
            });
            alert(`"${release.title}" added to your wantlist!`);
        } catch (err) {
            console.error('[WANTLIST] Failed to add to wantlist:', err);
            alert('Failed to add to wantlist. Please try again.');
        }
    };

    const updateSearchUrl = (term, type) => {
        setSearchParams({ q: term, type: type || searchType });
    };

    const handleTypeChange = (type) => {
        setSearchType(type);
        if (searchTerm) {
            setSearchParams({ q: searchTerm, type });
        }
    };

    return (
        <section className="page search-container search-container--focused">
            <div className="search-hero">
                <h1 className="search-hero__title">Search Discogs</h1>
                <p className="search-hero__subtitle">
                    Releases, artists, and labels — use <kbd className="search-form__kbd">Ctrl</kbd>+<kbd className="search-form__kbd">K</kbd> from anywhere.
                </p>
                <SearchForm
                    variant="hero"
                    autoFocus={!searchTerm}
                    initialTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    searchType={searchType}
                    onSearchTypeChange={handleTypeChange}
                    onSubmit={updateSearchUrl}
                />
            </div>

            <div className="search-results">
                {isLoading && (
                    <div className="page-empty">
                        <div className="spinner-border mb-3" role="status">
                            <span className="visually-hidden">Searching...</span>
                        </div>
                        <p className="page-empty__title">Searching Discogs…</p>
                        <p>Finding results for &ldquo;{searchTerm}&rdquo;</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="grail-alert grail-alert--warning d-flex justify-content-between align-items-center">
                        <span>{error}</span>
                        <button type="button" className="btn btn--ghost btn-sm" onClick={() => setError(null)}>
                            Dismiss
                        </button>
                    </div>
                )}

                {!isLoading && !error && searchTerm && (
                    <SearchList
                        results={results}
                        searchType={searchType}
                        onAddToWantlist={handleAddToWantlist}
                    />
                )}

                {!searchTerm && !isLoading && !error && (
                    <div className="page-empty search-results__idle">
                        <p className="page-empty__title">Results appear here</p>
                        <p>Pick a type above and search the Discogs database.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default SearchScreen;
