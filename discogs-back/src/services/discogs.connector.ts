import axios from 'axios';
import requests from '../suggestions/suggestions.requests';
import * as OAuthUtils from '../utils/oauth';

const DISCOGS_API_BASE = 'https://api.discogs.com';
const DEFAULT_DISCOGS_TOKEN = process.env.DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';

const buildParamsWithToken = (params: Record<string, unknown> = {}, tokenOverride?: string) => {
    const token = tokenOverride || DEFAULT_DISCOGS_TOKEN;
    if (!token) {
        return { ...params };
    }
    return {
        ...params,
        token
    };
};

const buildUserAuthHeaders = (token?: string) => {
    if (!token) return {};
    return {
        Authorization: `Discogs token=${token}`
    };
};

export const suggestionRequest = async (genre: string, style: string) => {
    try {
        const response = await axios.get(requests.readSuggestion, {
            params: {
                type : 'release',
                genre: genre,
                style: style,
                token: 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            },
        });

        // Map the response to extract title, cover_image, year, artists, and resource_url
        const extractedData = response.data.results.map((result: any) => ({
            title: result.title,
            cover_image: result.cover_image,
            year: result.year,
            artists: result.artists || [],
            resource_url: result.resource_url,
            discogs_id: result.id,
            uri: result.uri
        }));

        // return array of suggestion items
        return extractedData;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to fetch suggestions');
    }
};

export const getPersonalizedSuggestions = async (username: string, token?: string, tokenSecret?: string) => {
    try {
        console.log(`[discogs.connector][getPersonalizedSuggestions] Fetching personalized suggestions for: ${username}`);
        
        // First, get the user's wantlist styles and genres (use OAuth if available)
        const wantlistData = await fetchUserWantlist(username, token, tokenSecret);
        
        if (!wantlistData || !wantlistData.wants || !Array.isArray(wantlistData.wants)) {
            console.log(`[discogs.connector][getPersonalizedSuggestions] No wantlist data found for: ${username}`);
            return [];
        }
        
        // Extract unique genres and styles
        const genresSet = new Set<string>();
        const stylesSet = new Set<string>();
        
        wantlistData.wants.forEach((item: any) => {
            if (item.basic_information) {
                if (item.basic_information.genres && Array.isArray(item.basic_information.genres)) {
                    item.basic_information.genres.forEach((genre: string) => {
                        if (genre && genre.trim()) {
                            genresSet.add(genre.trim());
                        }
                    });
                }
                
                if (item.basic_information.styles && Array.isArray(item.basic_information.styles)) {
                    item.basic_information.styles.forEach((style: string) => {
                        if (style && style.trim()) {
                            stylesSet.add(style.trim());
                        }
                    });
                }
            }
        });
        
        const genres = Array.from(genresSet);
        const styles = Array.from(stylesSet);
        
        console.log(`[discogs.connector][getPersonalizedSuggestions] Found ${genres.length} genres and ${styles.length} styles for: ${username}`);
        
        // Get suggestions for each genre-style combination (limit to avoid too many API calls)
        const suggestions = [];
        const maxCombinations = 5; // Limit to prevent too many API calls
        let combinationCount = 0;
        
        for (const genre of genres.slice(0, 3)) { // Limit to top 3 genres
            for (const style of styles.slice(0, 3)) { // Limit to top 3 styles per genre
                if (combinationCount >= maxCombinations) break;
                
                try {
                    const genreStyleSuggestions = await suggestionRequest(genre, style);
                    suggestions.push(...genreStyleSuggestions.slice(0, 3)); // Limit to 3 per combination
                    combinationCount++;
                } catch (error) {
                    console.warn(`[discogs.connector][getPersonalizedSuggestions] Failed to get suggestions for ${genre}/${style}:`, error);
                }
            }
            if (combinationCount >= maxCombinations) break;
        }
        
        // Remove duplicates based on title and year
        const uniqueSuggestions = suggestions.filter((item, index, self) => 
            index === self.findIndex(t => t.title === item.title && t.year === item.year)
        );
        
        console.log(`[discogs.connector][getPersonalizedSuggestions] Returning ${uniqueSuggestions.length} unique suggestions for: ${username}`);
        return uniqueSuggestions.slice(0, 12); // Return max 12 suggestions
        
    } catch (error) {
        console.error('[discogs.connector][getPersonalizedSuggestions][Error]', error);
        throw new Error('Failed to fetch personalized suggestions');
    }
};

export const gatherUserProfile = async (username: string) => {
    const url = requests.readUserProfile.replace('{username}', username);
    try {
        console.log(`[discogs.connector][gatherUserProfile] Fetching public profile for: ${username}`);
        
        // Public user profiles don't require authentication according to Discogs API
        // See: https://api.discogs.com/users/WillMerritt3 (works without token)
        const response = await axios.get(url);

        console.log(`[discogs.connector][gatherUserProfile] Successfully fetched profile for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][gatherUserProfile][Error]', error);
        throw new Error('Failed to fetch user profile');
    }
}

export const fetchUserWantlist = async (username: string, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/wants`;
    try {
        console.log(`[discogs.connector][fetchUserWantlist] Fetching wantlist for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('GET', url, token, tokenSecret);
            console.log(`[discogs.connector][fetchUserWantlist] Successfully fetched wantlist for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.get(url, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][fetchUserWantlist] Successfully fetched wantlist for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][fetchUserWantlist][Error]', error);
        throw new Error('Failed to fetch user wantlist');
    }
}

export const fetchUserGenres = async (username: string) => {
    const url = `https://api.discogs.com/users/${username}/genres`;
    try {
        console.log(`[discogs.connector][fetchUserGenres] Fetching genres for: ${username}`);
        
        const response = await axios.get(url, {
            params: {
                token: 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][fetchUserGenres] Successfully fetched genres for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][fetchUserGenres][Error]', error);
        throw new Error('Failed to fetch user genres');
    }
}

// ===============================================
// FOLDER MANAGEMENT FUNCTIONS
// ===============================================

export const getUserCollectionFolders = async (username: string, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders`;
    try {
        console.log(`[discogs.connector][getUserCollectionFolders] Fetching folders for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('GET', url, token, tokenSecret);
            console.log(`[discogs.connector][getUserCollectionFolders] Successfully fetched ${response.data.folders?.length || 0} folders for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.get(url, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][getUserCollectionFolders] Successfully fetched ${response.data.folders?.length || 0} folders for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getUserCollectionFolders][Error]', error);
        throw new Error('Failed to fetch user collection folders');
    }
};

export const createUserCollectionFolder = async (username: string, folderName: string, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders`;
    try {
        console.log(`[discogs.connector][createUserCollectionFolder] Creating folder "${folderName}" for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('POST', url, token, tokenSecret, { name: folderName });
            console.log(`[discogs.connector][createUserCollectionFolder] Successfully created folder "${folderName}" for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.post(url, 
            { name: folderName },
            {
                params: {
                    token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[discogs.connector][createUserCollectionFolder] Successfully created folder "${folderName}" for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][createUserCollectionFolder][Error]', error);
        throw new Error('Failed to create collection folder');
    }
};

export const updateUserCollectionFolder = async (username: string, folderId: number, folderName: string, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}`;
    try {
        console.log(`[discogs.connector][updateUserCollectionFolder] Updating folder ${folderId} to "${folderName}" for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('POST', url, token, tokenSecret, { name: folderName });
            console.log(`[discogs.connector][updateUserCollectionFolder] Successfully updated folder ${folderId} for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.post(url, 
            { name: folderName },
            {
                params: {
                    token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[discogs.connector][updateUserCollectionFolder] Successfully updated folder ${folderId} for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][updateUserCollectionFolder][Error]', error);
        throw new Error('Failed to update collection folder');
    }
};

export const deleteUserCollectionFolder = async (username: string, folderId: number, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}`;
    try {
        console.log(`[discogs.connector][deleteUserCollectionFolder] Deleting folder ${folderId} for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('DELETE', url, token, tokenSecret);
            console.log(`[discogs.connector][deleteUserCollectionFolder] Successfully deleted folder ${folderId} for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.delete(url, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][deleteUserCollectionFolder] Successfully deleted folder ${folderId} for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][deleteUserCollectionFolder][Error]', error);
        throw new Error('Failed to delete collection folder');
    }
};

export const addReleaseToFolder = async (username: string, folderId: number, releaseId: number, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases/${releaseId}`;
    try {
        console.log(`[discogs.connector][addReleaseToFolder] Adding release ${releaseId} to folder ${folderId} for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('POST', url, token, tokenSecret, {});
            console.log(`[discogs.connector][addReleaseToFolder] Successfully added release ${releaseId} to folder ${folderId} for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.post(url, {}, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][addReleaseToFolder] Successfully added release ${releaseId} to folder ${folderId} for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][addReleaseToFolder][Error]', error);
        throw new Error('Failed to add release to folder');
    }
};

export const moveReleaseBetweenFolders = async (username: string, releaseId: number, fromFolderId: number, toFolderId: number, token?: string, tokenSecret?: string, instanceId?: number) => {
    // According to Discogs API docs, we use the instance endpoint to move/update
    // POST /users/{username}/collection/folders/{folder_id}/releases/{release_id}/instances/{instance_id}
    // with folder_id in body to move to another folder
    if (!instanceId) {
        // If no instanceId provided, we need to get it first
        // For now, throw error - caller should provide instanceId
        throw new Error('Instance ID is required to move a release between folders');
    }
    
    const url = `https://api.discogs.com/users/${username}/collection/folders/${fromFolderId}/releases/${releaseId}/instances/${instanceId}`;
    try {
        console.log(`[discogs.connector][moveReleaseBetweenFolders] Moving release ${releaseId} instance ${instanceId} from folder ${fromFolderId} to ${toFolderId} for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('POST', url, token, tokenSecret, { folder_id: toFolderId });
            console.log(`[discogs.connector][moveReleaseBetweenFolders] Successfully moved release ${releaseId} for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.post(url, 
            { folder_id: toFolderId },
            {
                params: {
                    token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[discogs.connector][moveReleaseBetweenFolders] Successfully moved release ${releaseId} for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][moveReleaseBetweenFolders][Error]', error);
        throw new Error('Failed to move release between folders');
    }
};

// ===============================================
// ADDITIONAL COLLECTION MANAGEMENT FUNCTIONS
// ===============================================

export const getFolderMetadata = async (username: string, folderId: number, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}`;
    try {
        console.log(`[discogs.connector][getFolderMetadata] Fetching folder ${folderId} metadata for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('GET', url, token, tokenSecret);
            console.log(`[discogs.connector][getFolderMetadata] Successfully fetched folder ${folderId} metadata for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.get(url, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][getFolderMetadata] Successfully fetched folder ${folderId} metadata for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getFolderMetadata][Error]', error);
        throw new Error('Failed to fetch folder metadata');
    }
};

export const getFolderItems = async (username: string, folderId: number, options: any = {}, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases`;
    try {
        console.log(`[discogs.connector][getFolderItems] Fetching items from folder ${folderId} for: ${username}`);
        
        // Build query string for optional parameters
        const queryParams: string[] = [];
        if (options.sort) queryParams.push(`sort=${options.sort}`);
        if (options.sort_order) queryParams.push(`sort_order=${options.sort_order}`);
        if (options.page) queryParams.push(`page=${options.page}`);
        if (options.per_page) queryParams.push(`per_page=${options.per_page}`);
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        const fullUrl = url + queryString;
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('GET', fullUrl, token, tokenSecret);
            console.log(`[discogs.connector][getFolderItems] Successfully fetched ${response.data.releases?.length || 0} items from folder ${folderId} for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const params: any = {
            token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
        };
        
        // Add optional parameters
        if (options.sort) params.sort = options.sort;
        if (options.sort_order) params.sort_order = options.sort_order;
        if (options.page) params.page = options.page;
        if (options.per_page) params.per_page = options.per_page;
        
        const response = await axios.get(url, { params });

        console.log(`[discogs.connector][getFolderItems] Successfully fetched ${response.data.releases?.length || 0} items from folder ${folderId} for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getFolderItems][Error]', error);
        throw new Error('Failed to fetch folder items');
    }
};

export const getReleaseInstances = async (username: string, releaseId: number, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/releases/${releaseId}`;
    try {
        console.log(`[discogs.connector][getReleaseInstances] Fetching release ${releaseId} instances for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('GET', url, token, tokenSecret);
            console.log(`[discogs.connector][getReleaseInstances] Successfully fetched release ${releaseId} instances for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.get(url, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][getReleaseInstances] Successfully fetched release ${releaseId} instances for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getReleaseInstances][Error]', error);
        throw new Error('Failed to fetch release instances');
    }
};

export const updateReleaseInstance = async (username: string, folderId: number, releaseId: number, instanceId: number, updates: any, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases/${releaseId}/instances/${instanceId}`;
    try {
        console.log(`[discogs.connector][updateReleaseInstance] Updating instance ${instanceId} of release ${releaseId} for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('POST', url, token, tokenSecret, updates);
            console.log(`[discogs.connector][updateReleaseInstance] Successfully updated instance ${instanceId} for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.post(url, updates, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`[discogs.connector][updateReleaseInstance] Successfully updated instance ${instanceId} for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][updateReleaseInstance][Error]', error);
        throw new Error('Failed to update release instance');
    }
};

export const deleteReleaseInstance = async (username: string, folderId: number, releaseId: number, instanceId: number, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases/${releaseId}/instances/${instanceId}`;
    try {
        console.log(`[discogs.connector][deleteReleaseInstance] Deleting instance ${instanceId} of release ${releaseId} from folder ${folderId} for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('DELETE', url, token, tokenSecret);
            console.log(`[discogs.connector][deleteReleaseInstance] Successfully deleted instance ${instanceId} for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.delete(url, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][deleteReleaseInstance] Successfully deleted instance ${instanceId} for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][deleteReleaseInstance][Error]', error);
        throw new Error('Failed to delete release instance');
    }
};

export const getRelease = async (releaseId: number, options: { curr_abbr?: string } = {}) => {
    const url = `${DISCOGS_API_BASE}/releases/${releaseId}`;
    try {
        const response = await axios.get(url, {
            params: buildParamsWithToken(options)
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getRelease][Error]', error);
        throw new Error('Failed to fetch release details');
    }
};

export const getReleaseCommunityRating = async (releaseId: number) => {
    const url = `${DISCOGS_API_BASE}/releases/${releaseId}/rating`;
    try {
        const response = await axios.get(url, {
            params: buildParamsWithToken()
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getReleaseCommunityRating][Error]', error);
        throw new Error('Failed to fetch release rating');
    }
};

export const getReleaseStats = async (releaseId: number) => {
    const url = `${DISCOGS_API_BASE}/releases/${releaseId}/stats`;
    try {
        const response = await axios.get(url, {
            params: buildParamsWithToken()
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getReleaseStats][Error]', error);
        throw new Error('Failed to fetch release stats');
    }
};

export const getUserReleaseRating = async (releaseId: number, username: string, token: string) => {
    const url = `${DISCOGS_API_BASE}/releases/${releaseId}/rating/${encodeURIComponent(username)}`;
    try {
        const response = await axios.get(url, {
            headers: buildUserAuthHeaders(token)
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getUserReleaseRating][Error]', error);
        throw error;
    }
};

export const updateUserReleaseRating = async (releaseId: number, username: string, rating: number, token: string) => {
    const url = `${DISCOGS_API_BASE}/releases/${releaseId}/rating/${encodeURIComponent(username)}`;
    try {
        const response = await axios.put(
            url,
            { rating },
            {
                headers: {
                    ...buildUserAuthHeaders(token),
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][updateUserReleaseRating][Error]', error);
        throw error;
    }
};

/**
 * Update user's release rating using OAuth
 */
export const updateUserReleaseRatingOAuth = async (
    releaseId: number,
    username: string,
    rating: number,
    accessToken: string,
    accessTokenSecret: string
) => {
    const url = `https://api.discogs.com/releases/${releaseId}/rating/${encodeURIComponent(username)}`;
    try {
        console.log(`[discogs.connector][updateUserReleaseRatingOAuth] Updating rating to ${rating} for release ${releaseId}, user: ${username}`);
        const response = await makeOAuthRequest('PUT', url, accessToken, accessTokenSecret, { rating });
        console.log(`[discogs.connector][updateUserReleaseRatingOAuth] Successfully updated rating for release ${releaseId}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][updateUserReleaseRatingOAuth][Error]', error);
        throw new Error('Failed to update release rating');
    }
};

export const deleteUserReleaseRating = async (releaseId: number, username: string, token: string) => {
    const url = `${DISCOGS_API_BASE}/releases/${releaseId}/rating/${encodeURIComponent(username)}`;
    try {
        const response = await axios.delete(url, {
            headers: buildUserAuthHeaders(token)
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][deleteUserReleaseRating][Error]', error);
        throw error;
    }
};

/**
 * Delete user's release rating using OAuth
 */
export const deleteUserReleaseRatingOAuth = async (
    releaseId: number,
    username: string,
    accessToken: string,
    accessTokenSecret: string
) => {
    const url = `https://api.discogs.com/releases/${releaseId}/rating/${encodeURIComponent(username)}`;
    try {
        console.log(`[discogs.connector][deleteUserReleaseRatingOAuth] Deleting rating for release ${releaseId}, user: ${username}`);
        const response = await makeOAuthRequest('DELETE', url, accessToken, accessTokenSecret);
        console.log(`[discogs.connector][deleteUserReleaseRatingOAuth] Successfully deleted rating for release ${releaseId}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][deleteUserReleaseRatingOAuth][Error]', error);
        throw new Error('Failed to delete release rating');
    }
};

export const getMasterRelease = async (masterId: number) => {
    const url = `${DISCOGS_API_BASE}/masters/${masterId}`;
    try {
        const response = await axios.get(url, {
            params: buildParamsWithToken()
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getMasterRelease][Error]', error);
        throw new Error('Failed to fetch master release');
    }
};

export const getMasterVersions = async (
    masterId: number,
    options: {
        page?: number;
        per_page?: number;
        format?: string;
        label?: string;
        released?: string;
        country?: string;
        sort?: string;
        sort_order?: string;
    } = {}
) => {
    const url = `${DISCOGS_API_BASE}/masters/${masterId}/versions`;
    try {
        const response = await axios.get(url, {
            params: buildParamsWithToken(options)
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getMasterVersions][Error]', error);
        throw new Error('Failed to fetch master versions');
    }
};

export const addToWantlist = async (username: string, releaseId: number, token: string) => {
    const url = `${DISCOGS_API_BASE}/users/${encodeURIComponent(username)}/wants/${releaseId}`;
    try {
        const response = await axios.put(
            url,
            {},
            {
                headers: buildUserAuthHeaders(token)
            }
        );
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][addToWantlist][Error]', error);
        throw error;
    }
};

export const removeFromWantlist = async (username: string, releaseId: number, token: string) => {
    const url = `${DISCOGS_API_BASE}/users/${encodeURIComponent(username)}/wants/${releaseId}`;
    try {
        const response = await axios.delete(url, {
            headers: buildUserAuthHeaders(token)
        });
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][removeFromWantlist][Error]', error);
        throw error;
    }
};

export const getCollectionValue = async (username: string, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/value`;
    try {
        console.log(`[discogs.connector][getCollectionValue] Fetching collection value for: ${username}`);
        
        let rawData: any;
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('GET', url, token, tokenSecret);
            console.log(`[discogs.connector][getCollectionValue] Successfully fetched collection value for: ${username} (OAuth)`);
            rawData = response.data;
        } else {
            // Otherwise use simple token auth
            const response = await axios.get(url, {
                params: {
                    token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
                }
            });
            console.log(`[discogs.connector][getCollectionValue] Successfully fetched collection value for: ${username} (token)`);
            rawData = response.data;
        }
        
        // Parse dollar string values to numbers (Discogs returns "$250.00" format)
        const parseDollarValue = (value: string | number | null | undefined): number => {
            if (value == null) return 0;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                // Remove $ and any whitespace, then parse as float
                const cleaned = value.replace(/[$,\s]/g, '');
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? 0 : parsed;
            }
            return 0;
        };
        
        return {
            minimum: parseDollarValue(rawData.minimum),
            median: parseDollarValue(rawData.median),
            maximum: parseDollarValue(rawData.maximum)
        };
    } catch (error: any) {
        console.error('[discogs.connector][getCollectionValue][Error]', error);
        
        // Provide more detailed error information
        if (error.response) {
            // Discogs API returned an error response
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText || 'Unknown error';
            
            if (status === 401 || status === 403) {
                throw new Error('Discogs authentication failed. Please reconnect your Discogs account.');
            } else if (status === 404) {
                throw new Error('Collection not found. Please ensure your Discogs username is correct.');
            } else {
                throw new Error(`Discogs API error (${status}): ${message}`);
            }
        } else if (error.request) {
            // Request was made but no response received
            throw new Error('Unable to reach Discogs API. Please check your internet connection.');
        } else {
            // Error setting up the request
            throw new Error(`Failed to fetch collection value: ${error.message || 'Unknown error'}`);
        }
    }
};

export const getCollectionFields = async (username: string, token?: string, tokenSecret?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/fields`;
    try {
        console.log(`[discogs.connector][getCollectionFields] Fetching collection fields for: ${username}`);
        
        // If both token and tokenSecret are provided, use OAuth 1.0a
        if (token && tokenSecret) {
            const response = await makeOAuthRequest('GET', url, token, tokenSecret);
            console.log(`[discogs.connector][getCollectionFields] Successfully fetched collection fields for: ${username} (OAuth)`);
            return response.data;
        }
        
        // Otherwise use simple token auth
        const response = await axios.get(url, {
            params: {
                token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
            }
        });

        console.log(`[discogs.connector][getCollectionFields] Successfully fetched collection fields for: ${username} (token)`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][getCollectionFields][Error]', error);
        throw new Error('Failed to fetch collection fields');
    }
};

export const updateInstanceField = async (username: string, folderId: number, releaseId: number, instanceId: number, fieldId: number, value: string, token?: string) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases/${releaseId}/instances/${instanceId}/fields/${fieldId}`;
    try {
        console.log(`[discogs.connector][updateInstanceField] Updating field ${fieldId} for instance ${instanceId} of release ${releaseId} for: ${username}`);
        
        const response = await axios.post(url, 
            { value },
            {
                params: {
                    token: token || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[discogs.connector][updateInstanceField] Successfully updated field ${fieldId} for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][updateInstanceField][Error]', error);
        throw new Error('Failed to update instance field');
    }
};

// ===============================================
// OAUTH IDENTITY ENDPOINT
// ===============================================

export const verifyOAuthIdentity = async (accessToken: string, accessTokenSecret: string) => {
    const url = 'https://api.discogs.com/oauth/identity';
    try {
        console.log('[discogs.connector][verifyOAuthIdentity] Verifying OAuth identity');
        
        // Get Discogs consumer key and secret from environment
        const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
        const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
        
        if (!consumerKey || !consumerSecret) {
            throw new Error('OAuth configuration missing');
        }
        
        // Generate OAuth parameters
        const oauthParams: Record<string, string> = {
            oauth_consumer_key: consumerKey,
            oauth_token: accessToken,
            oauth_nonce: OAuthUtils.generateNonce(),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: OAuthUtils.generateTimestamp(),
            oauth_version: '1.0'
        };
        
        // Generate signature
        oauthParams.oauth_signature = OAuthUtils.generateOAuthSignature(
            'GET',
            url,
            oauthParams,
            consumerSecret,
            accessTokenSecret
        );
        
        // Make request to Discogs
        const authHeader = OAuthUtils.generateOAuthHeader(oauthParams);
        
        console.log('[discogs.connector][verifyOAuthIdentity] Making OAuth request to verify identity');
        const response = await axios.get(url, {
            headers: {
                'Authorization': authHeader
            }
        });
        
        console.log('[discogs.connector][verifyOAuthIdentity] OAuth identity verified successfully');
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][verifyOAuthIdentity][Error]', error);
        throw new Error('Failed to verify OAuth identity');
    }
};

// ===============================================
// OAUTH-PROTECTED DISCOGS API FUNCTIONS
// ===============================================

/**
 * Helper function to make OAuth-signed requests to Discogs API
 */
export const makeOAuthRequest = async (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    accessToken: string,
    accessTokenSecret: string,
    data?: any
) => {
    const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
    const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
        throw new Error('OAuth configuration missing');
    }
    
    const oauthParams: Record<string, string> = {
        oauth_consumer_key: consumerKey,
        oauth_token: accessToken,
        oauth_nonce: OAuthUtils.generateNonce(),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: OAuthUtils.generateTimestamp(),
        oauth_version: '1.0'
    };
    
    oauthParams.oauth_signature = OAuthUtils.generateOAuthSignature(
        method,
        url,
        oauthParams,
        consumerSecret,
        accessTokenSecret
    );
    
    const authHeader = OAuthUtils.generateOAuthHeader(oauthParams);
    const config: any = {
        method,
        url,
        headers: { 'Authorization': authHeader }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
    }
    
    return await axios(config);
};

/**
 * Fetch user's Discogs collection using OAuth
 */
export const fetchUserCollectionOAuth = async (
    username: string,
    folderId: number,
    accessToken: string,
    accessTokenSecret: string
) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases`;
    try {
        console.log(`[discogs.connector][fetchUserCollectionOAuth] Fetching collection for: ${username} (folder ${folderId})`);
        const response = await makeOAuthRequest('GET', url, accessToken, accessTokenSecret);
        console.log(`[discogs.connector][fetchUserCollectionOAuth] Successfully fetched collection for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][fetchUserCollectionOAuth][Error]', error);
        throw new Error('Failed to fetch user collection');
    }
};

/**
 * Fetch user's Discogs wantlist using OAuth
 */
export const fetchUserWantlistOAuth = async (
    username: string,
    accessToken: string,
    accessTokenSecret: string
) => {
    const url = `https://api.discogs.com/users/${username}/wants`;
    try {
        console.log(`[discogs.connector][fetchUserWantlistOAuth] Fetching wantlist for: ${username}`);
        const response = await makeOAuthRequest('GET', url, accessToken, accessTokenSecret);
        console.log(`[discogs.connector][fetchUserWantlistOAuth] Successfully fetched wantlist for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][fetchUserWantlistOAuth][Error]', error);
        throw new Error('Failed to fetch user wantlist');
    }
};

/**
 * Add item to user's Discogs wantlist using OAuth
 */
export const addToWantlistOAuth = async (
    username: string,
    releaseId: number,
    accessToken: string,
    accessTokenSecret: string,
    data: { notes?: string; rating?: number } = {}
) => {
    const url = `https://api.discogs.com/users/${username}/wants/${releaseId}`;
    try {
        console.log(`[discogs.connector][addToWantlistOAuth] Adding to wantlist for: ${username}, release: ${releaseId}`);
        const response = await makeOAuthRequest('PUT', url, accessToken, accessTokenSecret, data);
        console.log(`[discogs.connector][addToWantlistOAuth] Successfully added to wantlist for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][addToWantlistOAuth][Error]', error);
        throw new Error('Failed to add to wantlist');
    }
};

/**
 * Delete item from user's Discogs wantlist using OAuth
 */
export const deleteFromWantlistOAuth = async (
    username: string,
    releaseId: number,
    accessToken: string,
    accessTokenSecret: string
) => {
    const url = `https://api.discogs.com/users/${username}/wants/${releaseId}`;
    try {
        console.log(`[discogs.connector][deleteFromWantlistOAuth] Deleting from wantlist for: ${username}, release: ${releaseId}`);
        const response = await makeOAuthRequest('DELETE', url, accessToken, accessTokenSecret);
        console.log(`[discogs.connector][deleteFromWantlistOAuth] Successfully deleted from wantlist for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][deleteFromWantlistOAuth][Error]', error);
        throw new Error('Failed to delete from wantlist');
    }
};

/**
 * Add item to user's Discogs collection using OAuth
 */
export const addToCollectionOAuth = async (
    username: string,
    folderId: number,
    releaseId: number,
    accessToken: string,
    accessTokenSecret: string,
    data: { instance_id?: number; rating?: number; folder_id?: number; notes?: string } = {}
) => {
    const url = `https://api.discogs.com/users/${username}/collection/folders/${folderId}/releases/${releaseId}`;
    try {
        console.log(`[discogs.connector][addToCollectionOAuth] Adding to collection for: ${username}, release: ${releaseId}, folder: ${folderId}`);
        const response = await makeOAuthRequest('POST', url, accessToken, accessTokenSecret, data);
        console.log(`[discogs.connector][addToCollectionOAuth] Successfully added to collection for: ${username}`);
        return response.data;
    } catch (error) {
        console.error('[discogs.connector][addToCollectionOAuth][Error]', error);
        
        // Provide more specific error messages based on Discogs API response
        if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.message || 'Failed to add to collection';
            
            // Preserve response object for all error cases so controller can handle them properly
            const enhancedError: any = new Error(`Discogs API error (${status}): ${message}`);
            enhancedError.status = status;
            enhancedError.response = error.response;
            
            if (status === 401 || status === 403) {
                enhancedError.message = `Authentication failed with Discogs: ${message}`;
            } else if (status === 404) {
                enhancedError.message = `Release ${releaseId} not found in Discogs: ${message}`;
            } else if (status === 409) {
                // Item already in collection - this is not necessarily an error
                enhancedError.message = `Release ${releaseId} is already in collection`;
            } else if (status === 429) {
                enhancedError.message = `Discogs API rate limit exceeded: ${message}`;
            } else {
                enhancedError.message = `Discogs API error (${status}): ${message}`;
            }
            
            throw enhancedError;
        }
        
        // Network or other errors
        throw new Error(`Network error or unexpected Discogs API response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};