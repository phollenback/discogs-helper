import axios from 'axios';
import { gatherUserProfile } from '../../src/services/discogs.connector';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Suggestions Service - User Profile', () => {
    const mockDiscogsUserProfile = {
        id: 20997757,
        resource_url: 'https://api.discogs.com/users/pskills',
        uri: 'https://www.discogs.com/user/pskills',
        username: 'pskills',
        name: '',
        home_page: '',
        location: '',
        profile: '',
        registered: '2024-02-16T13:21:00-08:00',
        rank: 0.0,
        num_pending: 0,
        num_for_sale: 0,
        num_lists: 0,
        releases_contributed: 0,
        releases_rated: 8,
        rating_avg: 4.25,
        inventory_url: 'https://api.discogs.com/users/pskills/inventory',
        collection_folders_url: 'https://api.discogs.com/users/pskills/collection/folders',
        collection_fields_url: 'https://api.discogs.com/users/pskills/collection/fields',
        wantlist_url: 'https://api.discogs.com/users/pskills/wants',
        avatar_url: 'https://gravatar.com/avatar/ccb9e9c1f230a5dd81f90b2988e56c4130631948c94a6625e105a1da8fcf4d58?s=500&r=pg&d=mm',
        curr_abbr: 'USD',
        activated: true,
        marketplace_suspended: false,
        banner_url: '',
        buyer_rating: 0.0,
        buyer_rating_stars: 0.0,
        buyer_num_ratings: 0,
        seller_rating: 0.0,
        seller_rating_stars: 0.0,
        seller_num_ratings: 0,
        is_staff: false,
        num_collection: 6,
        num_wantlist: 34,
        email: 'peyholle@gmail.com',
        num_unread: 0
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('gatherUserProfile', () => {
        it('should fetch user profile from Discogs API successfully', async () => {
            // Arrange
            mockedAxios.get.mockResolvedValue({
                data: mockDiscogsUserProfile,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            // Act
            const result = await gatherUserProfile('pskills');

            // Assert - No token parameter needed for public profiles
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/users/pskills'
            );
            expect(result).toEqual(mockDiscogsUserProfile);
        });

        it('should return complete user profile with all expected fields', async () => {
            // Arrange
            mockedAxios.get.mockResolvedValue({
                data: mockDiscogsUserProfile,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            // Act
            const result = await gatherUserProfile('pskills');

            // Assert - verify all important fields are present
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('username', 'pskills');
            expect(result).toHaveProperty('num_collection', 6);
            expect(result).toHaveProperty('num_wantlist', 34);
            expect(result).toHaveProperty('releases_rated', 8);
            expect(result).toHaveProperty('rating_avg', 4.25);
            expect(result).toHaveProperty('email', 'peyholle@gmail.com');
            expect(result).toHaveProperty('avatar_url');
            expect(result).toHaveProperty('collection_folders_url');
            expect(result).toHaveProperty('wantlist_url');
        });

        it('should handle username with special characters', async () => {
            // Arrange
            const specialUsername = 'user-name_123';
            const specialProfile = { ...mockDiscogsUserProfile, username: specialUsername };
            mockedAxios.get.mockResolvedValue({
                data: specialProfile,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            // Act
            const result = await gatherUserProfile(specialUsername);

            // Assert - No token parameter needed for public profiles
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `https://api.discogs.com/users/${specialUsername}`
            );
            expect(result.username).toBe(specialUsername);
        });

        it('should throw error when Discogs API returns 404', async () => {
            // Arrange
            mockedAxios.get.mockRejectedValue({
                response: {
                    status: 404,
                    data: { message: 'User not found' }
                }
            });

            // Act & Assert
            await expect(gatherUserProfile('nonexistentuser')).rejects.toThrow('Failed to fetch user profile');
        });

        it('should throw error when Discogs API returns 401', async () => {
            // Arrange
            mockedAxios.get.mockRejectedValue({
                response: {
                    status: 401,
                    data: { message: 'Invalid token' }
                }
            });

            // Act & Assert
            await expect(gatherUserProfile('pskills')).rejects.toThrow('Failed to fetch user profile');
        });

        it('should throw error when network fails', async () => {
            // Arrange
            mockedAxios.get.mockRejectedValue(new Error('Network error'));

            // Act & Assert
            await expect(gatherUserProfile('pskills')).rejects.toThrow('Failed to fetch user profile');
        });

        it('should return email field for authenticated requests', async () => {
            // Arrange
            mockedAxios.get.mockResolvedValue({
                data: mockDiscogsUserProfile,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            // Act
            const result = await gatherUserProfile('pskills');

            // Assert - email should be included in response
            expect(result.email).toBe('peyholle@gmail.com');
        });

        it('should handle empty optional fields gracefully', async () => {
            // Arrange
            const profileWithEmptyFields = {
                ...mockDiscogsUserProfile,
                name: '',
                home_page: '',
                location: '',
                profile: '',
                banner_url: ''
            };
            mockedAxios.get.mockResolvedValue({
                data: profileWithEmptyFields,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            // Act
            const result = await gatherUserProfile('pskills');

            // Assert
            expect(result.name).toBe('');
            expect(result.home_page).toBe('');
            expect(result.location).toBe('');
            expect(result.profile).toBe('');
            expect(result.banner_url).toBe('');
        });

        it('should verify collection and wantlist counts are numbers', async () => {
            // Arrange
            mockedAxios.get.mockResolvedValue({
                data: mockDiscogsUserProfile,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            // Act
            const result = await gatherUserProfile('pskills');

            // Assert
            expect(typeof result.num_collection).toBe('number');
            expect(typeof result.num_wantlist).toBe('number');
            expect(result.num_collection).toBeGreaterThanOrEqual(0);
            expect(result.num_wantlist).toBeGreaterThanOrEqual(0);
        });
    });
});

