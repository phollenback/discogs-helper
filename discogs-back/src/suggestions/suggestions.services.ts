import { suggestionRequest, gatherUserProfile, fetchUserWantlist, getPersonalizedSuggestions } from "../services/discogs.connector";
import { readUserTopReleases, updateUserTopReleases } from "./suggestions.dao";

export const readSuggestions = async (userId: number) => {
    try {
        // Query discogs api for suggestions
        const suggestions = await suggestionRequest("rock", "grunge");
        return suggestions;
    } catch (error) {
        console.error('[suggestions.services][readSuggestions][Error]', error);
        throw new Error('Failed to fetch suggestions');
    }
};

export const getPersonalizedSuggestionsService = async (username: string, token?: string, tokenSecret?: string) => {
    try {
        console.log(`[suggestions.services][getPersonalizedSuggestionsService] Fetching personalized suggestions for: ${username}`);
        
        const suggestions = await getPersonalizedSuggestions(username, token, tokenSecret);
        
        console.log(`[suggestions.services][getPersonalizedSuggestionsService] Successfully fetched ${suggestions.length} suggestions for: ${username}`);
        return suggestions;
    } catch (error) {
        console.error('[suggestions.services][getPersonalizedSuggestionsService][Error]', error);
        throw new Error('Failed to fetch personalized suggestions');
    }
};

export const getUserProfile = async (username: string) => {
    try {
        console.log(`[suggestions.services][getUserProfile] Fetching profile for username: ${username}`);
        
        const userProfile = await gatherUserProfile(username);
        
        console.log(`[suggestions.services][getUserProfile] Successfully fetched profile for: ${username}`);
        return userProfile;
    } catch (error) {
        console.error('[suggestions.services][getUserProfile][Error]', error);
        throw new Error('Failed to fetch user profile');
    }
};

export const getUserTopReleases = async (username: string) => {
    try {
        console.log(`[suggestions.services][getUserTopReleases] Fetching top releases for username: ${username}`);
        
        const result = await readUserTopReleases(username);
        
        // Parse JSON if it exists
        let topReleases = null;
        if (result && result.length > 0 && result[0].top_releases) {
            topReleases = typeof result[0].top_releases === 'string' 
                ? JSON.parse(result[0].top_releases) 
                : result[0].top_releases;
        }
        
        console.log(`[suggestions.services][getUserTopReleases] Successfully fetched top releases for: ${username}`);
        return { topReleases: topReleases || [] };
    } catch (error) {
        console.error('[suggestions.services][getUserTopReleases][Error]', error);
        throw new Error('Failed to fetch top releases');
    }
};

export const updateUserTopReleasesService = async (username: string, topReleases: any[]) => {
    try {
        console.log(`[suggestions.services][updateUserTopReleasesService] Updating top releases for username: ${username}`);
        console.log(`[suggestions.services][updateUserTopReleasesService] Data:`, topReleases);
        
        // Validate that topReleases is an array and has max 3 items
        if (!Array.isArray(topReleases)) {
            throw new Error('topReleases must be an array');
        }
        
        if (topReleases.length > 3) {
            throw new Error('Maximum 3 releases allowed');
        }
        
        // Validate each release has required fields
        for (const release of topReleases) {
            if (!release.discogsId || !release.title || !release.artist) {
                throw new Error('Each release must have discogsId, title, and artist');
            }
        }
        
        const okPacket = await updateUserTopReleases(username, topReleases);
        
        console.log(`[suggestions.services][updateUserTopReleasesService] Successfully updated top releases for: ${username}`);
        return { 
            message: 'Top releases updated successfully',
            affectedRows: okPacket.affectedRows 
        };
    } catch (error) {
        console.error('[suggestions.services][updateUserTopReleasesService][Error]', error);
        throw error; // Re-throw to let controller handle HTTP status codes
    }
};

export const getUserWantlistStyles = async (username: string, token?: string, tokenSecret?: string) => {
    try {
        console.log(`[suggestions.services][getUserWantlistStyles] Fetching wantlist styles for username: ${username}`);
        
        // Fetch user's wantlist from Discogs API (use OAuth if available)
        const wantlistData = await fetchUserWantlist(username, token, tokenSecret);
        
        if (!wantlistData || !wantlistData.wants || !Array.isArray(wantlistData.wants)) {
            console.log(`[suggestions.services][getUserWantlistStyles] No wantlist data found for: ${username}`);
            return {
                genres: [],
                styles: [],
                totalItems: 0
            };
        }
        
        // Extract all unique genres and styles
        const genresSet = new Set<string>();
        const stylesSet = new Set<string>();
        
        wantlistData.wants.forEach((item: any) => {
            if (item.basic_information) {
                // Add genres
                if (item.basic_information.genres && Array.isArray(item.basic_information.genres)) {
                    item.basic_information.genres.forEach((genre: string) => {
                        if (genre && genre.trim()) {
                            genresSet.add(genre.trim());
                        }
                    });
                }
                
                // Add styles
                if (item.basic_information.styles && Array.isArray(item.basic_information.styles)) {
                    item.basic_information.styles.forEach((style: string) => {
                        if (style && style.trim()) {
                            stylesSet.add(style.trim());
                        }
                    });
                }
            }
        });
        
        const genres = Array.from(genresSet).sort();
        const styles = Array.from(stylesSet).sort();
        
        console.log(`[suggestions.services][getUserWantlistStyles] Successfully extracted ${genres.length} genres and ${styles.length} styles for: ${username}`);
        
        return {
            genres,
            styles,
            totalItems: wantlistData.wants.length,
            pagination: wantlistData.pagination
        };
    } catch (error) {
        console.error('[suggestions.services][getUserWantlistStyles][Error]', error);
        throw new Error('Failed to fetch wantlist styles');
    }
};

export const getUserWantlistGenres = async (username: string, token?: string, tokenSecret?: string) => {
    try {
        console.log(`[suggestions.services][getUserGenres] Fetching genres for username: ${username}`);
        
        // Fetch user's wantlist from Discogs API (use OAuth if available)
        const wantlistData = await fetchUserWantlist(username, token, tokenSecret);
        
        if (!wantlistData || !wantlistData.wants || !Array.isArray(wantlistData.wants)) {
            console.log(`[suggestions.services][getUserGenres] No wantlist data found for: ${username}`);
            return [];
        }
        
        // Extract all unique genres
        const genresSet = new Set<string>();
        
        wantlistData.wants.forEach((item: any) => {
            if (item.basic_information) {
                // Add genres
                if (item.basic_information.genres && Array.isArray(item.basic_information.genres)) {
                    item.basic_information.genres.forEach((genre: string) => {
                        if (genre && genre.trim()) {
                            genresSet.add(genre.trim());
                        }
                    });
                }
            }
        });
        
        const genres = Array.from(genresSet).sort();
        
        console.log(`[suggestions.services][getUserGenres] Successfully extracted ${genres.length} genres for: ${username}`);
        return genres;
    } catch (error) {
        console.error('[suggestions.services][getUserGenres][Error]', error);
        throw new Error('Failed to fetch genres');
    }
};