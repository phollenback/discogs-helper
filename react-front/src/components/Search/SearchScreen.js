import React, { useState, useEffect } from 'react';
import '../../styles/SearchScreen.css';
import SearchForm from './SearchForm';
import SearchList from './SearchList';
import SearchSuggestions from './SearchSuggestions';
import axios from 'axios';
// import { getData } from '../../utility/dataSource';
import { useDiscogs } from '../../utility/dataSource';
import { useApi } from '../../utility/backSource';
import { useAuthContext } from '../../AuthContext';

const SearchScreen = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchType, setSearchType] = useState("release");
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchCount, setSearchCount] = useState(0);
    const { putData: putDiscogsData } = useDiscogs();
    const { updateData } = useApi();
    const { authState } = useAuthContext();

    useEffect(() => {
        if (searchTerm !== "") {
            loadResults();
        }
    }, [searchTerm, searchType]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadResults = async () => {
        setIsLoading(true);
        setError(null);
        setSearchCount(prev => prev + 1);
        
        try {
            console.log(`[SEARCH] Loading results for: "${searchTerm}"`);
            const token = process.env.REACT_APP_DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';
            const response = await axios.get('https://api.discogs.com/database/search', {
                params: {
                    q: searchTerm,
                    token,
                    type: searchType,
                    per_page: 50, // Limit results for better performance
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

                // Default to release mapping
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
            console.log(`[SEARCH] Found ${mappedResults.length} results for: "${searchTerm}" (${searchType})`);
        } catch (error) {
            console.error('[SEARCH] Error fetching search data:', error);
            setError('Failed to fetch search results. Please try again.');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToWantlist = async (release) => {
        if (searchType !== 'release') {
            return;
        }

        if (!authState.username) {
            alert('🚫 Please sign in to use this feature.');
            return;
        }

        try {
            console.log(`[WANTLIST] Adding ${release.title} (ID: ${release.id}) to wantlist`);
            
            // Add to Discogs wantlist
            await putDiscogsData(`/users/${authState.username}/wants/${release.id}`);
            
            // Upsert to backend for custom fields
            await updateData(`/api/users/${authState.userId}/collection/${release.id}`, {
                rating: 0,
                notes: '',
                price_threshold: 0,
                wishlist: 1
            });
            
            console.log(`[WANTLIST] Successfully added ${release.title} to wantlist`);
            alert(`✅ "${release.title}" added to your wantlist!`);
        } catch (err) {
            console.error(`[WANTLIST] Failed to add ${release.title} to wantlist:`, err);
            alert('❌ Failed to add to wantlist. Please try again.');
        }
    };

    const handleSearchTermChange = (newSearchTerm) => {
        setSearchTerm(newSearchTerm);
        setError(null);
    };

    return (
        <div className="search-container" style={{ background: '#1a1a1a', minHeight: '100vh' }}>
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="search-header text-center py-4">
                            <div className="search-stats">
                                <small className="text-light">
                                    <i className="fas fa-chart-line me-1"></i>
                                    Searches performed: {searchCount}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Form Section */}
                <div className="row justify-content-center mb-5">
                    <div className="col-12 col-lg-10">
                        <SearchForm 
                            setSearchTerm={handleSearchTermChange}
                            searchType={searchType}
                            onSearchTypeChange={setSearchType}
                        />
                    </div>
                </div>

                {/* Results Section */}
                <div className="row">
                    {/* Suggestions Sidebar */}
                    <div className="col-lg-3 col-md-4 mb-4">
                        <SearchSuggestions 
                            searchTerm={searchTerm}
                            onSuggestionClick={handleSearchTermChange}
                        />
                    </div>

                    {/* Search Results */}
                    <div className="col-lg-9 col-md-8">
                        {/* Loading State */}
                        {isLoading && (
                            <div className="text-center py-5">
                                <div className="spinner-border text-light mb-3" role="status" style={{width: '3rem', height: '3rem'}}>
                                    <span className="visually-hidden">Searching...</span>
                                </div>
                                <h5 className="text-light">Searching Discogs database...</h5>
                                <p className="text-light">Finding releases for "{searchTerm}"</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !isLoading && (
                            <div className="alert alert-warning text-center" role="alert" style={{ 
                                background: '#404040', 
                                border: '1px solid #666', 
                                color: 'white' 
                            }}>
                                <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
                                <h5>Search Error</h5>
                                <p className="mb-0">{error}</p>
                                <button 
                                    className="btn btn-outline-light mt-3"
                                    onClick={() => setError(null)}
                                >
                                    <i className="fas fa-times me-2"></i>
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {/* Results */}
                        {!isLoading && !error && searchTerm && (
                            <SearchList 
                                results={results} 
                                searchType={searchType}
                                onAddToWantlist={handleAddToWantlist}
                            />
                        )}

                        {/* No Search State */}
                        {!searchTerm && !isLoading && !error && (
                            <div className="text-center py-5">
                                <i className="fas fa-search fa-4x text-light mb-4"></i>
                                <h3 className="text-light mb-3">Start Your Search</h3>
                                <p className="text-light lead">
                                    Choose a search type and enter a keyword to look up releases, artists, or labels on Discogs
                                </p>
                                <div className="search-examples mt-4">
                                    <h6 className="text-light mb-3">Try searching for:</h6>
                                    <div className="d-flex flex-wrap justify-content-center gap-2">
                                        {['The Beatles', 'Pink Floyd', 'Miles Davis', 'Radiohead', 'Nirvana'].map((example, index) => (
                                            <button
                                                key={index}
                                                className="btn btn-outline-light btn-sm"
                                                onClick={() => handleSearchTermChange(example)}
                                            >
                                                {example}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchScreen;