import { Request, Response } from 'express';
import * as CollectionController from '../../src/collection/collection.controller';
import * as CollectionDao from '../../src/collection/collection.dao';
import * as RecordDao from '../../src/records/records.dao';
import * as UserDao from '../../src/users/users.dao';
import * as DiscogsConnector from '../../src/services/discogs.connector';
import { OkPacket } from 'mysql';

// Mock dependencies
jest.mock('../../src/collection/collection.dao');
jest.mock('../../src/records/records.dao');
jest.mock('../../src/users/users.dao');
jest.mock('../../src/services/discogs.connector');

const mockedCollectionDao = CollectionDao as jest.Mocked<typeof CollectionDao>;
const mockedRecordDao = RecordDao as jest.Mocked<typeof RecordDao>;
const mockedUserDao = UserDao as jest.Mocked<typeof UserDao>;
const mockedDiscogsConnector = DiscogsConnector as jest.Mocked<typeof DiscogsConnector>;

describe('Collection Controller Tests', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();

        mockRequest = {
            params: {
                userId: '1'
            },
            body: {
                userId: 1
            },
            user: {
                userId: 1,
                username: 'testuser',
                email: 'test@test.com',
                isAdmin: false
            } as any,
            ip: '127.0.0.1'
        } as unknown as Partial<Request>;

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();
    });

    describe('createCollectionItem', () => {
        const mockOkPacket: OkPacket = {
            fieldCount: 0,
            affectedRows: 1,
            insertId: 100,
            serverStatus: 2,
            warningCount: 0,
            message: '',
            protocol41: true,
            changedRows: 0
        };

        const mockRecord = {
            record_id: 50,
            discogs_id: 123456,
            title: 'Test Release',
            artist: 'Test Artist',
            release_year: '2020',
            genre: 'Rock',
            styles: 'Alternative',
            source: 'discogs'
        };

        beforeEach(() => {
            mockRequest.params = { userId: '1' };
            mockRequest.body = {
                userId: 1,
                discogsId: 123456,
                title: 'Test Release',
                artist: 'Test Artist',
                releaseYear: '2020',
                genre: 'Rock',
                styles: 'Alternative',
                rating: '4',
                notes: 'Great album',
                price_threshold: '25.00',
                wishlist: '0'
            };
        });

        it('should create collection item with OAuth sync when user is connected', async () => {
            // Mock user with OAuth tokens
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: 'oauth_token_123',
                discogs_token_secret: 'oauth_secret_123',
                user_image: null
            };

            // Set up request body
            mockRequest.body = {
                userId: 1,
                discogsId: 123456,
                title: 'Test Release',
                artist: 'Test Artist',
                releaseYear: '2020',
                genre: 'Rock',
                styles: 'Alternative',
                rating: '4',
                notes: 'Great album',
                price_threshold: '25.00',
                wishlist: '0'
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            mockedRecordDao.upsertRecord.mockResolvedValue(mockOkPacket as any);
            mockedRecordDao.readRecords.mockResolvedValue([mockRecord] as any);
            mockedCollectionDao.createCollectionItem.mockResolvedValue(mockOkPacket as any);
            mockedDiscogsConnector.addToCollectionOAuth.mockResolvedValue({ id: 123456 } as any);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Verify OAuth sync was called
            expect(mockedDiscogsConnector.addToCollectionOAuth).toHaveBeenCalledWith(
                'testuser',
                1, // Default folder ID
                123456,
                'oauth_token_123',
                'oauth_secret_123',
                expect.objectContaining({
                    rating: 4,
                    notes: 'Great album'
                })
            );

            // Verify MySQL insert was called
            expect(mockedCollectionDao.createCollectionItem).toHaveBeenCalled();

            // Verify response
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    syncedWithDiscogs: true
                })
            );
        });

        it('should create collection item without OAuth sync when user is not connected', async () => {
            // Mock user without OAuth tokens
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: null,
                discogs_token_secret: null,
                user_image: null
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            mockedRecordDao.upsertRecord.mockResolvedValue(mockOkPacket as any);
            mockedRecordDao.readRecords.mockResolvedValue([mockRecord] as any);
            mockedCollectionDao.createCollectionItem.mockResolvedValue(mockOkPacket as any);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Verify OAuth sync was NOT called
            expect(mockedDiscogsConnector.addToCollectionOAuth).not.toHaveBeenCalled();

            // Verify MySQL insert was called
            expect(mockedCollectionDao.createCollectionItem).toHaveBeenCalled();

            // Verify response
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    syncedWithDiscogs: false
                })
            );
        });

        it('should handle Discogs API authentication failure gracefully', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: 'invalid_token',
                discogs_token_secret: 'invalid_secret',
                user_image: null
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            
            // Mock Discogs API returning 401 - connector throws Error with response object
            const discogsError: any = new Error('Authentication failed with Discogs: Invalid token');
            discogsError.response = {
                status: 401,
                data: { message: 'Invalid token' }
            };
            mockedDiscogsConnector.addToCollectionOAuth.mockRejectedValue(discogsError);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Verify error response
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Discogs authentication failed'),
                    error: 'DISCOGS_AUTH_FAILED'
                })
            );
        });

        it('should handle Discogs API rate limit gracefully', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: 'oauth_token_123',
                discogs_token_secret: 'oauth_secret_123',
                user_image: null
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            
            // Mock Discogs API returning 429 - connector throws Error with response object
            const discogsError: any = new Error('Discogs API rate limit exceeded: Rate limit exceeded');
            discogsError.response = {
                status: 429,
                data: { message: 'Rate limit exceeded' }
            };
            mockedDiscogsConnector.addToCollectionOAuth.mockRejectedValue(discogsError);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Verify error response
            expect(mockResponse.status).toHaveBeenCalledWith(429);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('rate limit'),
                    error: 'DISCOGS_RATE_LIMIT'
                })
            );
        });

        it('should continue with MySQL insert when Discogs item already exists (409)', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: 'oauth_token_123',
                discogs_token_secret: 'oauth_secret_123',
                user_image: null
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            mockedRecordDao.upsertRecord.mockResolvedValue(mockOkPacket as any);
            mockedRecordDao.readRecords.mockResolvedValue([mockRecord] as any);
            mockedCollectionDao.createCollectionItem.mockResolvedValue(mockOkPacket as any);
            
            // Mock Discogs API returning 409 (already exists) - connector throws Error with response
            const discogsError: any = new Error('Release 123456 is already in collection');
            discogsError.response = {
                status: 409,
                data: { message: 'Already in collection' }
            };
            mockedDiscogsConnector.addToCollectionOAuth.mockRejectedValue(discogsError);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Verify MySQL insert was still called
            expect(mockedCollectionDao.createCollectionItem).toHaveBeenCalled();

            // Verify success response
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should handle missing discogsId for OAuth users', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: 'oauth_token_123',
                discogs_token_secret: 'oauth_secret_123',
                user_image: null
            };

            mockRequest.body = {
                userId: 1,
                discogsId: null,
                title: 'Manual Release',
                artist: 'Manual Artist',
                rating: '3',
                notes: 'Manual entry',
                price_threshold: '20.00',
                wishlist: '0'
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            mockedRecordDao.upsertRecord.mockResolvedValue(mockOkPacket as any);
            mockedCollectionDao.createCollectionItem.mockResolvedValue(mockOkPacket as any);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Verify OAuth sync was NOT called (no discogsId)
            expect(mockedDiscogsConnector.addToCollectionOAuth).not.toHaveBeenCalled();

            // Verify MySQL insert was called
            expect(mockedCollectionDao.createCollectionItem).toHaveBeenCalled();

            // Verify response
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should return 403 when user tries to access another user\'s data', async () => {
            mockRequest.user = {
                userId: 2, // Different user
                username: 'otheruser',
                email: 'other@test.com',
                isAdmin: false
            } as any;

            mockRequest.body = {
                userId: 1, // Trying to add to user 1's collection
                discogsId: 123456,
                title: 'Test Release'
            };

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('forbidden')
                })
            );
        });

        it('should handle database errors gracefully', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: null,
                discogs_token_secret: null,
                user_image: null
            };

            // Test with no discogsId so error is thrown immediately without readRecords() call
            mockRequest.body = {
                userId: 1,
                discogsId: null,
                title: 'Manual Release',
                artist: 'Manual Artist',
                releaseYear: '2020',
                genre: 'Rock',
                styles: 'Alternative',
                rating: '3',
                notes: 'Test notes',
                price_threshold: '20.00',
                wishlist: '0'
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            // Mock upsertRecord to fail - with no discogsId, error is thrown immediately
            const dbError = new Error('Database connection failed');
            mockedRecordDao.upsertRecord.mockRejectedValue(dbError);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Verify error was handled
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Database connection failed',
                    error: 'DATABASE_ERROR'
                })
            );
        });

        it('should handle network errors from Discogs API gracefully', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed',
                is_admin: false,
                discogs_token: 'oauth_token_123',
                discogs_token_secret: 'oauth_secret_123',
                user_image: null
            };

            mockedUserDao.readUsers.mockResolvedValue([mockUser] as any);
            mockedRecordDao.upsertRecord.mockResolvedValue(mockOkPacket as any);
            mockedRecordDao.readRecords.mockResolvedValue([mockRecord] as any);
            mockedCollectionDao.createCollectionItem.mockResolvedValue(mockOkPacket as any);
            
            // Mock network error (no response object) - controller should continue with MySQL
            const networkError = new Error('Network timeout');
            mockedDiscogsConnector.addToCollectionOAuth.mockRejectedValue(networkError);

            await CollectionController.createCollectionItem(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Should continue with MySQL insert despite network error
            expect(mockedCollectionDao.createCollectionItem).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('readCollectionByUsername', () => {
        const mockCollectionItems = [
            {
                user_id: 1,
                discogs_id: 123456,
                title: 'Test Release 1',
                artist: 'Test Artist',
                release_year: '2020',
                genre: 'Rock',
                styles: 'Alternative',
                thumb_url: 'https://example.com/thumb1.jpg',
                cover_image_url: 'https://example.com/cover1.jpg',
                notes: 'Personal notes',
                price_threshold: '25.00',
                rating: 5,
                ranking: 1,
                wishlist: 0
            },
            {
                user_id: 1,
                discogs_id: 789012,
                title: 'Test Release 2',
                artist: 'Another Artist',
                release_year: '2021',
                genre: 'Electronic',
                styles: 'House',
                thumb_url: 'https://example.com/thumb2.jpg',
                cover_image_url: 'https://example.com/cover2.jpg',
                notes: 'More notes',
                price_threshold: '30.00',
                rating: 4,
                ranking: 2,
                wishlist: 0
            }
        ];

        beforeEach(() => {
            mockRequest.params = { username: 'testuser' };
        });

        it('should return collection for valid username', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com'
            };

            mockedUserDao.readUserByUsername.mockResolvedValue([mockUser] as any);
            mockedCollectionDao.readCollection.mockResolvedValue(mockCollectionItems as any);

            await CollectionController.readCollectionByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockedUserDao.readUserByUsername).toHaveBeenCalledWith('testuser');
            expect(mockedCollectionDao.readCollection).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should filter notes and price_threshold for non-owners', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com'
            };

            mockRequest.user = {
                userId: 2, // Different user (not owner)
                username: 'otheruser',
                email: 'other@test.com',
                isAdmin: false
            } as any;

            mockedUserDao.readUserByUsername.mockResolvedValue([mockUser] as any);
            mockedCollectionDao.readCollection.mockResolvedValue(mockCollectionItems as any);

            await CollectionController.readCollectionByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
            
            // Verify sensitive data is removed
            expect(responseData[0]).not.toHaveProperty('notes');
            expect(responseData[0]).not.toHaveProperty('price_threshold');
            
            // Verify other data is present
            expect(responseData[0]).toHaveProperty('title');
            expect(responseData[0]).toHaveProperty('artist');
            expect(responseData[0]).toHaveProperty('rating');
        });

        it('should include all data for owner', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com'
            };

            mockRequest.user = {
                userId: 1, // Same user (owner)
                username: 'testuser',
                email: 'test@test.com',
                isAdmin: false
            } as any;

            mockedUserDao.readUserByUsername.mockResolvedValue([mockUser] as any);
            mockedCollectionDao.readCollection.mockResolvedValue(mockCollectionItems as any);

            await CollectionController.readCollectionByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
            
            // Verify sensitive data is present for owner
            expect(responseData[0]).toHaveProperty('notes');
            expect(responseData[0]).toHaveProperty('price_threshold');
            expect(responseData[0].notes).toBe('Personal notes');
            expect(responseData[0].price_threshold).toBe('25.00');
        });

        it('should return 404 for invalid username', async () => {
            mockedUserDao.readUserByUsername.mockResolvedValue([]);

            await CollectionController.readCollectionByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockedUserDao.readUserByUsername).toHaveBeenCalledWith('testuser');
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should work without authentication (public access)', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com'
            };

            mockRequest.user = undefined; // No authentication

            mockedUserDao.readUserByUsername.mockResolvedValue([mockUser] as any);
            mockedCollectionDao.readCollection.mockResolvedValue(mockCollectionItems as any);

            await CollectionController.readCollectionByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
            
            // Verify sensitive data is removed for public access
            expect(responseData[0]).not.toHaveProperty('notes');
            expect(responseData[0]).not.toHaveProperty('price_threshold');
        });
    });

    describe('readWantlistByUsername', () => {
        const mockWantlistItems = [
            {
                user_id: 1,
                discogs_id: 345678,
                title: 'Wantlist Release 1',
                artist: 'Wantlist Artist',
                release_year: '2019',
                genre: 'Jazz',
                styles: 'Bebop',
                thumb_url: 'https://example.com/thumb3.jpg',
                cover_image_url: 'https://example.com/cover3.jpg',
                notes: 'Wantlist notes',
                price_threshold: '40.00',
                rating: null,
                ranking: null,
                wishlist: 1
            }
        ];

        beforeEach(() => {
            mockRequest.params = { username: 'testuser' };
        });

        it('should return wantlist for valid username', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com'
            };

            mockedUserDao.readUserByUsername.mockResolvedValue([mockUser] as any);
            mockedCollectionDao.readWantlist.mockResolvedValue(mockWantlistItems as any);

            await CollectionController.readWantlistByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockedUserDao.readUserByUsername).toHaveBeenCalledWith('testuser');
            expect(mockedCollectionDao.readWantlist).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should filter notes and price_threshold for non-owners', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com'
            };

            mockRequest.user = {
                userId: 2, // Different user (not owner)
                username: 'otheruser',
                email: 'other@test.com',
                isAdmin: false
            } as any;

            mockedUserDao.readUserByUsername.mockResolvedValue([mockUser] as any);
            mockedCollectionDao.readWantlist.mockResolvedValue(mockWantlistItems as any);

            await CollectionController.readWantlistByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
            
            // Verify sensitive data is removed
            expect(responseData[0]).not.toHaveProperty('notes');
            expect(responseData[0]).not.toHaveProperty('price_threshold');
            
            // Verify other data is present
            expect(responseData[0]).toHaveProperty('title');
            expect(responseData[0]).toHaveProperty('artist');
        });

        it('should include all data for owner', async () => {
            const mockUser = {
                user_id: 1,
                username: 'testuser',
                email: 'test@test.com'
            };

            mockRequest.user = {
                userId: 1, // Same user (owner)
                username: 'testuser',
                email: 'test@test.com',
                isAdmin: false
            } as any;

            mockedUserDao.readUserByUsername.mockResolvedValue([mockUser] as any);
            mockedCollectionDao.readWantlist.mockResolvedValue(mockWantlistItems as any);

            await CollectionController.readWantlistByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
            
            // Verify sensitive data is present for owner
            expect(responseData[0]).toHaveProperty('notes');
            expect(responseData[0]).toHaveProperty('price_threshold');
            expect(responseData[0].notes).toBe('Wantlist notes');
            expect(responseData[0].price_threshold).toBe('40.00');
        });

        it('should return 404 for invalid username', async () => {
            mockedUserDao.readUserByUsername.mockResolvedValue([]);

            await CollectionController.readWantlistByUsername(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockedUserDao.readUserByUsername).toHaveBeenCalledWith('testuser');
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });
});

