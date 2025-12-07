const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DISCOGS_API_BASE = 'https://api.discogs.com';
const DEFAULT_TOKEN = process.env.DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';

// Artists to search for - use more specific queries for better results
// For MIKE, we'll search for specific album titles since artist name is too generic
const ARTISTS = [
    { name: 'Title Fight', query: 'Title Fight' },
    { name: 'MIKE', query: 'MIKE', specificAlbums: ['War In My Pen', 'May God Bless Your Hustle', 'Tears of Joy'] }, // Try specific albums
    { name: 'Weezer', query: 'Weezer' }
];

async function searchArtistReleases(artistConfig) {
    const artistName = artistConfig.name;
    const searchQuery = artistConfig.query;
    const specificAlbums = artistConfig.specificAlbums || [];
    
    try {
        let releases = [];
        
        // If specific albums are provided, search for those first
        if (specificAlbums.length > 0) {
            console.log(`Searching for specific albums by ${artistName}...`);
            for (const album of specificAlbums) {
                try {
                    const response = await axios.get(`${DISCOGS_API_BASE}/database/search`, {
                        params: {
                            q: `${artistName} ${album}`,
                            type: 'release',
                            per_page: 5,
                            token: DEFAULT_TOKEN
                        },
                        headers: {
                            'User-Agent': 'Grailtopia/1.0'
                        }
                    });
                    
                    const albumResults = response.data.results || [];
                    releases.push(...albumResults);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    console.error(`Error searching for ${album}:`, err.message);
                }
            }
        }
        
        // Also do general search
        console.log(`Searching for releases by ${artistName} (query: ${searchQuery})...`);
        const response = await axios.get(`${DISCOGS_API_BASE}/database/search`, {
            params: {
                q: searchQuery,
                type: 'release',
                per_page: 25,
                token: DEFAULT_TOKEN
            },
            headers: {
                'User-Agent': 'Grailtopia/1.0'
            }
        });

        releases.push(...(response.data.results || []));
        console.log(`Found ${releases.length} total results for ${artistName}`);

        // Filter to only releases by the exact artist (case-insensitive)
        // For MIKE, be more strict to avoid Mike + The Mechanics, Mike Oldfield, etc.
        const filteredReleases = releases.filter(result => {
            if (!result.artists || !Array.isArray(result.artists)) {
                // Check title if no artists array
                const titleLower = (result.title || '').toLowerCase();
                const artistNameLower = artistName.toLowerCase();
                return titleLower.includes(artistNameLower) && 
                       !titleLower.includes('mechanics') && 
                       !titleLower.includes('oldfield');
            }
            return result.artists.some(a => {
                const artistNameLower = artistName.toLowerCase();
                const aName = (a.name || '').toLowerCase();
                
                // For MIKE, be strict - must be exactly "MIKE" or "Mike" (not Mike + The Mechanics, etc.)
                if (artistName === 'MIKE') {
                    return aName === 'mike' && !result.title.toLowerCase().includes('mechanics') && 
                           !result.title.toLowerCase().includes('oldfield');
                }
                
                const artistNameLowerNoSpaces = artistNameLower.replace(/\s+/g, '');
                const aNameNoSpaces = aName.replace(/\s+/g, '');
                return aName === artistNameLower || aNameNoSpaces === artistNameLowerNoSpaces;
            });
        });

        // Remove duplicates by discogs_id
        const uniqueReleases = [];
        const seenIds = new Set();
        for (const release of filteredReleases) {
            if (release.id && !seenIds.has(release.id)) {
                seenIds.add(release.id);
                uniqueReleases.push(release);
            }
        }

        console.log(`Filtered to ${uniqueReleases.length} unique releases by ${artistName}`);

        // Get detailed info for each release
        const detailedReleases = [];
        for (const release of uniqueReleases.slice(0, 5)) { // Limit to 5 per artist
            try {
                console.log(`  Fetching details for release ${release.id}: ${release.title}`);
                const releaseResponse = await axios.get(`${DISCOGS_API_BASE}/releases/${release.id}`, {
                    params: { token: DEFAULT_TOKEN },
                    headers: { 'User-Agent': 'Grailtopia/1.0' }
                });
                
                const releaseData = releaseResponse.data;
                
                // Get best image URL
                let coverImageUrl = '';
                let thumbUrl = '';
                
                if (releaseData.images && releaseData.images.length > 0) {
                    const primaryImage = releaseData.images.find(img => img.type === 'primary') || releaseData.images[0];
                    coverImageUrl = primaryImage.uri || primaryImage.uri150 || '';
                    thumbUrl = primaryImage.uri150 || primaryImage.uri || '';
                } else if (release.cover_image) {
                    coverImageUrl = release.cover_image;
                    thumbUrl = release.thumb || release.cover_image;
                }
                
                detailedReleases.push({
                    discogs_id: releaseData.id || release.id,
                    title: releaseData.title || release.title || 'Unknown Title',
                    artist: artistName,
                    release_year: releaseData.year || release.year || '',
                    genre: Array.isArray(releaseData.genres) ? releaseData.genres.join(', ') : (releaseData.genres || ''),
                    styles: Array.isArray(releaseData.styles) ? releaseData.styles.join(', ') : (releaseData.styles || ''),
                    cover_image_url: coverImageUrl,
                    thumb_url: thumbUrl || coverImageUrl,
                    // Mock playback stats
                    play_count: Math.floor(Math.random() * 20) + 1,
                    total_time_minutes: Math.floor(Math.random() * 600) + 60,
                    last_played: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString()
                });
                
                console.log(`    ✅ Added: ${releaseData.title || release.title}`);
                
                // Rate limiting - be nice to Discogs API
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                console.error(`    ❌ Error fetching details for release ${release.id}:`, err.message);
            }
        }

        return detailedReleases;
    } catch (error) {
        console.error(`Error searching for ${artistName}:`, error.message);
        if (error.response) {
            console.error(`  Response status: ${error.response.status}`);
            console.error(`  Response data:`, error.response.data);
        }
        return [];
    }
}

async function fetchAllMockData() {
    const allReleases = [];
    
    for (const artist of ARTISTS) {
        const releases = await searchArtistReleases(artist);
        allReleases.push(...releases);
        // Rate limiting between artists
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Sort by last_played (most recent first)
    allReleases.sort((a, b) => new Date(b.last_played) - new Date(a.last_played));

    return allReleases;
}

async function main() {
    try {
        console.log('Fetching mock meter data from Discogs...');
        const mockData = await fetchAllMockData();
        
        const outputPath = path.join(__dirname, '../src/data/mock-meter-data.json');
        const outputDir = path.dirname(outputPath);
        
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2));
        console.log(`✅ Successfully saved ${mockData.length} releases to ${outputPath}`);
        console.log(`Artists: ${ARTISTS.join(', ')}`);
    } catch (error) {
        console.error('Error fetching mock data:', error);
        process.exit(1);
    }
}

main();

