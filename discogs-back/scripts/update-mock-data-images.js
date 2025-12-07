const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DISCOGS_API_BASE = 'https://api.discogs.com';
const DEFAULT_TOKEN = process.env.DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';

async function fetchReleaseImages(discogsId) {
    try {
        const response = await axios.get(`${DISCOGS_API_BASE}/releases/${discogsId}`, {
            params: { token: DEFAULT_TOKEN },
            headers: { 'User-Agent': 'Grailtopia/1.0' }
        });
        
        const releaseData = response.data;
        
        // Get best image URL
        let coverImageUrl = '';
        let thumbUrl = '';
        
        if (releaseData.images && releaseData.images.length > 0) {
            const primaryImage = releaseData.images.find(img => img.type === 'primary') || releaseData.images[0];
            coverImageUrl = primaryImage.uri || primaryImage.uri150 || '';
            thumbUrl = primaryImage.uri150 || primaryImage.uri || '';
        } else if (releaseData.thumb) {
            coverImageUrl = releaseData.thumb;
            thumbUrl = releaseData.thumb;
        }
        
        return { coverImageUrl, thumbUrl };
    } catch (error) {
        console.error(`Error fetching release ${discogsId}:`, error.message);
        return { coverImageUrl: '', thumbUrl: '' };
    }
}

async function updateMockData() {
    const mockDataPath = path.join(__dirname, '../src/data/mock-meter-data.json');
    const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
    
    console.log(`Updating ${mockData.length} releases with full image URLs...`);
    
    for (let i = 0; i < mockData.length; i++) {
        const item = mockData[i];
        console.log(`[${i + 1}/${mockData.length}] Fetching images for ${item.artist} - ${item.title} (${item.discogs_id})...`);
        
        const { coverImageUrl, thumbUrl } = await fetchReleaseImages(item.discogs_id);
        
        if (coverImageUrl) {
            item.cover_image_url = coverImageUrl;
            console.log(`  ✅ Updated cover_image_url`);
        }
        if (thumbUrl) {
            item.thumb_url = thumbUrl;
            console.log(`  ✅ Updated thumb_url`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2));
    console.log(`\n✅ Successfully updated mock data with full image URLs!`);
}

updateMockData().catch(console.error);

