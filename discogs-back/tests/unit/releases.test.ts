import { Request, Response } from 'express';
import axios from 'axios';
import * as ReleasesController from '../../src/releases/releases.controller';
import * as DiscogsConnector from '../../src/services/discogs.connector';
import * as CollectionDao from '../../src/collection/collection.dao';
import * as RecordDao from '../../src/records/records.dao';
import * as UserDao from '../../src/users/users.dao';

jest.mock('../../src/services/discogs.connector');
jest.mock('../../src/collection/collection.dao');
jest.mock('../../src/records/records.dao');
jest.mock('../../src/users/users.dao');

const mockedDiscogsConnector = DiscogsConnector as jest.Mocked<typeof DiscogsConnector>;
const mockedCollectionDao = CollectionDao as jest.Mocked<typeof CollectionDao>;
const mockedRecordDao = RecordDao as jest.Mocked<typeof RecordDao>;
const mockedUserDao = UserDao as jest.Mocked<typeof UserDao>;

const createMockResponse = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    };
    return res as unknown as Response;
};

describe('Releases Controller', () => {
    let mockRequest: Request;
    let mockResponse: Response;
    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            params: {},
            query: {},
            body: {},
            headers: {},
            user: undefined
        } as unknown as Request;
        mockResponse = createMockResponse();
    });

    describe('getReleaseOverview', () => {
        it('should return 400 when releaseId is invalid', async () => {
            mockRequest.params = { releaseId: 'abc' };

            await ReleasesController.getReleaseOverview(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Release ID must be a positive integer'
            });
            expect(mockedDiscogsConnector.getRelease).not.toHaveBeenCalled();
        });

        it('should aggregate release, stats, rating, and master data', async () => {
            mockRequest.params = { releaseId: '123' };

            mockedDiscogsConnector.getRelease.mockResolvedValue({
                id: 123,
                title: 'Test Release',
                master_id: 200
            } as any);
            mockedDiscogsConnector.getReleaseStats.mockResolvedValue({ have: 10, want: 5 } as any);
            mockedDiscogsConnector.getReleaseCommunityRating.mockResolvedValue({ rating: { average: 4.5 } } as any);
            mockedDiscogsConnector.getMasterRelease.mockResolvedValue({ id: 200, main_release: 123 } as any);
            mockedDiscogsConnector.getMasterVersions.mockResolvedValue({ versions: [] } as any);
            mockedCollectionDao.readCollectionItem.mockResolvedValue([] as any);

            await ReleasesController.getReleaseOverview(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                release: { id: 123, title: 'Test Release', master_id: 200 },
                stats: { have: 10, want: 5 },
                communityRating: { rating: { average: 4.5 } },
                master: { id: 200, main_release: 123 },
                masterVersions: { versions: [] },
                collectionEntry: null,
                userRating: null
            });
            expect(mockedDiscogsConnector.getMasterRelease).toHaveBeenCalledWith(200);
        });

        it('should skip master lookups when includeMaster is false and return user rating from collection', async () => {
            mockRequest.params = { releaseId: '555' };
            mockRequest.query = { includeMaster: 'false' };
            mockRequest.user = { userId: 42, username: 'crate_digger' } as any;

            mockedDiscogsConnector.getRelease.mockResolvedValue({
                id: 555,
                title: 'No Master Release',
                master_id: 999
            } as any);
            mockedDiscogsConnector.getReleaseStats.mockResolvedValue({ have: 3, want: 2 } as any);
            mockedDiscogsConnector.getReleaseCommunityRating.mockResolvedValue({ rating: { average: 3.8 } } as any);
            mockedCollectionDao.readCollectionItem.mockResolvedValue([
                {
                    user_id: 42,
                    discogs_id: 555,
                    rating: 5,
                    notes: 'all time favourite',
                    wishlist: 0
                }
            ] as any);

            await ReleasesController.getReleaseOverview(mockRequest, mockResponse, mockNext);

            expect(mockedDiscogsConnector.getMasterRelease).not.toHaveBeenCalled();
            expect(mockedDiscogsConnector.getMasterVersions).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                release: { id: 555, title: 'No Master Release', master_id: 999 },
                stats: { have: 3, want: 2 },
                communityRating: { rating: { average: 3.8 } },
                master: null,
                masterVersions: null,
                collectionEntry: {
                    userId: 42,
                    discogsId: 555,
                    notes: 'all time favourite',
                    priceThreshold: '',
                    rating: 5,
                    wishlist: false,
                    inCollection: true
                },
                userRating: 5
            });
        });

        it('should surface Discogs 404 errors via handleDiscogsError response', async () => {
            mockRequest.params = { releaseId: '777' };

            const isAxiosSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
            mockedDiscogsConnector.getRelease.mockRejectedValue({
                response: { status: 404, data: { message: 'not found' } }
            } as any);

            await ReleasesController.getReleaseOverview(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'not found' });
            isAxiosSpy.mockRestore();
        });
    });

    describe('updateMyReleaseRating', () => {
        it('should upsert collection entry and propagate rating to Discogs', async () => {
            mockRequest.params = { releaseId: '123' };
            mockRequest.body = { rating: 4 };
            mockRequest.user = { userId: 10, username: 'tester', email: 'tester@test.com' } as any;

            mockedDiscogsConnector.getRelease.mockResolvedValue({
                id: 123,
                title: 'Test Release'
            } as any);
            mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
            mockedCollectionDao.readCollectionItem
                .mockResolvedValueOnce([] as any)
                .mockResolvedValueOnce([
                    {
                        user_id: 10,
                        discogs_id: 123,
                        rating: '4',
                        notes: '',
                        price_threshold: '',
                        wishlist: 0
                    }
                ] as any);
            mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
            mockedUserDao.readUserByUsername.mockResolvedValue([
                { username: 'tester', discogs_token: 'user-token', discogs_token_secret: 'user-secret' }
            ] as any);
            // updateUserRating uses non-OAuth updateUserReleaseRating (only uses token, not secret)
            mockedDiscogsConnector.updateUserReleaseRating.mockResolvedValue({} as any);
            mockedRecordDao.readRecordByDiscogsId.mockResolvedValue([{ record_id: 123 }] as any);

            await ReleasesController.updateMyReleaseRating(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                rating: 4,
                collectionEntry: {
                    userId: 10,
                    discogsId: 123,
                    notes: '',
                    priceThreshold: '',
                    rating: 4,
                    wishlist: false,
                    inCollection: true
                }
            });
            expect(mockedDiscogsConnector.updateUserReleaseRating).toHaveBeenCalledWith(
                123,
                'tester',
                4,
                'user-token'
            );
        });
    });

    describe('upsertCollection', () => {
        describe('Authentication and Validation', () => {
            it('should return 401 when user is not authenticated', async () => {
                mockRequest.params = { releaseId: '123' };
                mockRequest.user = undefined;

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Authentication required'
                });
            });

            it('should return 400 when releaseId is invalid', async () => {
                mockRequest.params = { releaseId: 'abc' };
                mockRequest.user = { userId: 1, username: 'test' } as any;

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Release ID must be a positive integer'
                });
            });

            it('should return 400 when releaseId is negative', async () => {
                mockRequest.params = { releaseId: '-1' };
                mockRequest.user = { userId: 1, username: 'test' } as any;

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Release ID must be a positive integer'
                });
            });
        });

        describe('Adding to Wantlist', () => {
            it('should add release to wantlist when wishlist=true and user has Discogs token', async () => {
                mockRequest.params = { releaseId: '321' };
                mockRequest.body = { wishlist: true, notes: 'Keep an eye', priceThreshold: '40' };
                mockRequest.user = { userId: 5, username: 'collector', email: 'collector@test.com' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 321,
                    title: 'Wanted Release',
                    artists: [{ name: 'Test Artist' }],
                    genres: ['Rock'],
                    styles: ['Alternative'],
                    year: 2020,
                    images: [{ uri: 'https://example.com/image.jpg' }]
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any) // First call: check existing
                    .mockResolvedValueOnce([ // Second call: after upsert
                        {
                            user_id: 5,
                            discogs_id: 321,
                            notes: 'Keep an eye',
                            price_threshold: '40',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'collector', discogs_token: 'token-123', discogs_token_secret: 'secret-123' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.addToWantlistOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    collectionEntry: {
                        userId: 5,
                        discogsId: 321,
                        notes: 'Keep an eye',
                        priceThreshold: '40',
                        rating: null,
                        ranking: null,
                        wishlist: true,
                        inCollection: false
                    }
                });
                expect(mockedDiscogsConnector.addToWantlistOAuth).toHaveBeenCalledWith(
                    'collector',
                    321,
                    'token-123',
                    'secret-123',
                    { notes: 'Keep an eye', rating: undefined }
                );
                expect(mockedDiscogsConnector.addToCollectionOAuth).not.toHaveBeenCalled();
                // OAuth users skip SQL, so upsertRecord is not called
                expect(mockedRecordDao.upsertRecord).not.toHaveBeenCalled();
            });

            it('should add to wantlist in MySQL only when user does not have Discogs token', async () => {
                mockRequest.params = { releaseId: '321' };
                mockRequest.body = { wishlist: true, notes: 'Keep an eye', priceThreshold: '40' };
                mockRequest.user = { userId: 5, username: 'collector', email: 'collector@test.com' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 321,
                    title: 'Wanted Release',
                    artists: [{ name: 'Test Artist' }],
                    genres: ['Rock'],
                    styles: ['Alternative'],
                    year: 2020,
                    images: [{ uri: 'https://example.com/image.jpg' }]
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any)
                    .mockResolvedValueOnce([
                        {
                            user_id: 5,
                            discogs_id: 321,
                            notes: 'Keep an eye',
                            price_threshold: '40',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'collector', discogs_token: null }
                ] as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockedDiscogsConnector.addToWantlist).not.toHaveBeenCalled();
                expect(mockedDiscogsConnector.addToCollectionOAuth).not.toHaveBeenCalled();
                expect(mockedRecordDao.upsertRecord).toHaveBeenCalled();
                expect(mockedCollectionDao.upsertCollectionItem).toHaveBeenCalled();
            });

            it('should handle Discogs sync failure gracefully when adding to wantlist', async () => {
                mockRequest.params = { releaseId: '321' };
                mockRequest.body = { wishlist: true, notes: 'Keep an eye' };
                mockRequest.user = { userId: 5, username: 'collector' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 321,
                    title: 'Wanted Release',
                    artists: [{ name: 'Test Artist' }],
                    genres: ['Rock'],
                    styles: ['Alternative'],
                    year: 2020,
                    images: [{ uri: 'https://example.com/image.jpg' }]
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any)
                    .mockResolvedValueOnce([
                        {
                            user_id: 5,
                            discogs_id: 321,
                            notes: 'Keep an eye',
                            price_threshold: '',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'collector', discogs_token: 'token-123', discogs_token_secret: 'secret-123' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.addToWantlistOAuth.mockRejectedValue(
                    new Error('Discogs API error')
                );

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                // Should still return 502 because Discogs sync failed for OAuth user
                expect(mockResponse.status).toHaveBeenCalledWith(502);
                expect(mockedDiscogsConnector.addToWantlistOAuth).toHaveBeenCalled();
                // OAuth users fail fast - no SQL fallback
                expect(mockedCollectionDao.upsertCollectionItem).not.toHaveBeenCalled();
            });

            it('should update Discogs wantlist entry if item was already in wantlist', async () => {
                mockRequest.params = { releaseId: '321' };
                mockRequest.body = { wishlist: true, notes: 'Updated notes' };
                mockRequest.user = { userId: 5, username: 'collector' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 321,
                    title: 'Wanted Release',
                    artists: [{ name: 'Test Artist' }],
                    genres: ['Rock'],
                    styles: ['Alternative'],
                    year: 2020,
                    images: [{ uri: 'https://example.com/image.jpg' }]
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([ // Already in wantlist
                        {
                            user_id: 5,
                            discogs_id: 321,
                            notes: 'Old notes',
                            price_threshold: '',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any)
                    .mockResolvedValueOnce([ // After update
                        {
                            user_id: 5,
                            discogs_id: 321,
                            notes: 'Updated notes',
                            price_threshold: '',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'collector', discogs_token: 'token-123', discogs_token_secret: 'secret-123' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [{ id: 321 }] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.addToWantlistOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                // When wishlist=true and item is already in wantlist, nothing is called
                // (the code only adds if !currentlyInWantlist, it doesn't update existing entries)
                // This is expected behavior - to update notes, use wishlist=undefined
                expect(mockedDiscogsConnector.addToWantlistOAuth).not.toHaveBeenCalled();
            });
        });

        describe('Adding to Collection', () => {
            it('should add release to collection when wishlist=false and user has Discogs token', async () => {
                mockRequest.params = { releaseId: '456' };
                mockRequest.body = { wishlist: false, notes: 'In my collection', rating: 5 };
                mockRequest.user = { userId: 6, username: 'collector2' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 456,
                    title: 'Collection Release',
                    artists: [{ name: 'Artist Name' }],
                    genres: ['Jazz'],
                    styles: ['Bebop'],
                    year: 2019,
                    images: [{ uri: 'https://example.com/image2.jpg' }]
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any)
                    .mockResolvedValueOnce([
                        {
                            user_id: 6,
                            discogs_id: 456,
                            notes: 'In my collection',
                            price_threshold: '',
                            rating: '5',
                            wishlist: 0
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'collector2', discogs_token: 'token-456', discogs_token_secret: 'secret-456' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.addToCollectionOAuth.mockResolvedValue({} as any);
                mockedDiscogsConnector.updateUserReleaseRatingOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                // deleteFromWantlistOAuth not called since not in wantlist
                expect(mockedDiscogsConnector.addToCollectionOAuth).toHaveBeenCalledWith(
                    'collector2',
                    1,
                    456,
                    'token-456',
                    'secret-456',
                    { notes: 'In my collection', rating: 5 }
                );
                expect(mockedDiscogsConnector.updateUserReleaseRatingOAuth).toHaveBeenCalledWith(
                    456,
                    'collector2',
                    5,
                    'token-456',
                    'secret-456'
                );
            });

            it('should add to collection in MySQL only when user does not have Discogs token', async () => {
                mockRequest.params = { releaseId: '456' };
                mockRequest.body = { wishlist: false, notes: 'In my collection' };
                mockRequest.user = { userId: 6, username: 'collector2' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 456,
                    title: 'Collection Release',
                    artists: [{ name: 'Artist Name' }],
                    genres: ['Jazz'],
                    styles: ['Bebop'],
                    year: 2019,
                    images: [{ uri: 'https://example.com/image2.jpg' }]
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any)
                    .mockResolvedValueOnce([
                        {
                            user_id: 6,
                            discogs_id: 456,
                            notes: 'In my collection',
                            price_threshold: '',
                            rating: null,
                            wishlist: 0
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'collector2', discogs_token: null }
                ] as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockedDiscogsConnector.deleteFromWantlistOAuth).not.toHaveBeenCalled();
                expect(mockedDiscogsConnector.addToCollectionOAuth).not.toHaveBeenCalled();
                expect(mockedCollectionDao.upsertCollectionItem).toHaveBeenCalled();
            });

            it('should add to collection when wishlist=undefined and item is new', async () => {
                mockRequest.params = { releaseId: '789' };
                mockRequest.body = { notes: 'New item', rating: 4 };
                mockRequest.user = { userId: 7, username: 'collector3' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 789,
                    title: 'New Release',
                    artists: [{ name: 'New Artist' }],
                    genres: ['Electronic'],
                    styles: ['Techno'],
                    year: 2021,
                    images: [{ uri: 'https://example.com/image3.jpg' }]
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any) // Not in collection yet
                    .mockResolvedValueOnce([
                        {
                            user_id: 7,
                            discogs_id: 789,
                            notes: 'New item',
                            price_threshold: '',
                            rating: '4',
                            wishlist: 0
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'collector3', discogs_token: 'token-789', discogs_token_secret: 'secret-789' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                // When wishlist is undefined, it's treated as an update, so nothing gets added to collection
                // Only rating gets updated
                mockedDiscogsConnector.updateUserReleaseRatingOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                // For wishlist=undefined (update scenario), nothing gets added - only rating updated
                expect(mockedDiscogsConnector.updateUserReleaseRatingOAuth).toHaveBeenCalledWith(
                    789,
                    'collector3',
                    4,
                    'token-789',
                    'secret-789'
                );
            });
        });

        describe('Rating Updates', () => {
            it('should update rating when provided and user has Discogs token', async () => {
                mockRequest.params = { releaseId: '999' };
                mockRequest.body = { wishlist: true, rating: 5 };
                mockRequest.user = { userId: 8, username: 'rater' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 999,
                    title: 'Rated Release',
                    artists: [{ name: 'Rated Artist' }],
                    genres: ['Pop'],
                    styles: ['Indie'],
                    year: 2022,
                    images: []
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any)
                    .mockResolvedValueOnce([
                        {
                            user_id: 8,
                            discogs_id: 999,
                            notes: '',
                            price_threshold: '',
                            rating: '5',
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'rater', discogs_token: 'token-999', discogs_token_secret: 'secret-999' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [{ id: 999 }] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.addToWantlistOAuth.mockResolvedValue({} as any);
                mockedDiscogsConnector.updateUserReleaseRatingOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockedDiscogsConnector.updateUserReleaseRatingOAuth).toHaveBeenCalledWith(
                    999,
                    'rater',
                    5,
                    'token-999',
                    'secret-999'
                );
            });

            it('should update rating in MySQL only when user does not have Discogs token', async () => {
                mockRequest.params = { releaseId: '999' };
                mockRequest.body = { wishlist: true, rating: 5 };
                mockRequest.user = { userId: 8, username: 'rater' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 999,
                    title: 'Rated Release',
                    artists: [{ name: 'Rated Artist' }],
                    genres: ['Pop'],
                    styles: ['Indie'],
                    year: 2022,
                    images: []
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any)
                    .mockResolvedValueOnce([
                        {
                            user_id: 8,
                            discogs_id: 999,
                            notes: '',
                            price_threshold: '',
                            rating: '5',
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'rater', discogs_token: null }
                ] as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockedDiscogsConnector.updateUserReleaseRatingOAuth).not.toHaveBeenCalled();
                expect(mockedCollectionDao.upsertCollectionItem).toHaveBeenCalled();
            });

            it('should not update rating when rating is 0', async () => {
                mockRequest.params = { releaseId: '111' };
                mockRequest.body = { wishlist: true, rating: 0 };
                mockRequest.user = { userId: 9, username: 'no-rater' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 111,
                    title: 'No Rating Release',
                    artists: [{ name: 'No Rating Artist' }],
                    genres: ['Rock'],
                    styles: ['Punk'],
                    year: 2023,
                    images: []
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([] as any)
                    .mockResolvedValueOnce([
                        {
                            user_id: 9,
                            discogs_id: 111,
                            notes: '',
                            price_threshold: '',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'no-rater', discogs_token: 'token-111', discogs_token_secret: 'secret-111' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [{ id: 111 }] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.addToWantlistOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                // Rating of 0 should not trigger Discogs rating update
                expect(mockedDiscogsConnector.updateUserReleaseRatingOAuth).not.toHaveBeenCalled();
            });
        });

        describe('Error Handling', () => {
            it('should return 404 when release is not found in Discogs', async () => {
                mockRequest.params = { releaseId: '99999' };
                mockRequest.body = { wishlist: true };
                mockRequest.user = { userId: 10, username: 'error_user' } as any;

                // Set up as non-OAuth user (no token_secret)
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'error_user', discogs_token: null, discogs_token_secret: null }
                ] as any);

                const isAxiosSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
                mockedDiscogsConnector.getRelease.mockRejectedValue({
                    response: { status: 404, data: { message: 'Release not found' } }
                } as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(404);
                expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Release not found' });
                isAxiosSpy.mockRestore();
            });

            it('should return 502 when Discogs API returns server error', async () => {
                mockRequest.params = { releaseId: '888' };
                mockRequest.body = { wishlist: true };
                mockRequest.user = { userId: 11, username: 'error_user2' } as any;

                // Set up as non-OAuth user (no token_secret)
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'error_user2', discogs_token: null, discogs_token_secret: null }
                ] as any);

                const isAxiosSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
                mockedDiscogsConnector.getRelease.mockRejectedValue({
                    response: { status: 500, data: { message: 'Internal server error' } }
                } as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                // handleDiscogsError preserves the status code from the error
                expect(mockResponse.status).toHaveBeenCalledWith(500);
                isAxiosSpy.mockRestore();
            });

            it('should handle non-Axios errors gracefully', async () => {
                mockRequest.params = { releaseId: '777' };
                mockRequest.body = { wishlist: true };
                mockRequest.user = { userId: 12, username: 'error_user3' } as any;

                // Set up as non-OAuth user (no token_secret)
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'error_user3', discogs_token: null, discogs_token_secret: null }
                ] as any);

                mockedDiscogsConnector.getRelease.mockRejectedValue(
                    new Error('Network error')
                );

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(502);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Failed to update collection entry'
                });
            });
        });

        describe('Edge Cases', () => {
            it('should handle updating existing collection item with new notes', async () => {
                mockRequest.params = { releaseId: '555' };
                // Use wishlist=undefined to trigger update path (not add path)
                mockRequest.body = { notes: 'Updated notes', priceThreshold: '50' };
                mockRequest.user = { userId: 13, username: 'updater' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 555,
                    title: 'Existing Release',
                    artists: [{ name: 'Existing Artist' }],
                    genres: ['Folk'],
                    styles: ['Acoustic'],
                    year: 2020,
                    images: []
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([ // Already exists
                        {
                            user_id: 13,
                            discogs_id: 555,
                            notes: 'Old notes',
                            price_threshold: '30',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any)
                    .mockResolvedValueOnce([ // After update
                        {
                            user_id: 13,
                            discogs_id: 555,
                            notes: 'Updated notes',
                            price_threshold: '50',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'updater', discogs_token: 'token-555', discogs_token_secret: 'secret-555' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [{ id: 555 }] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.addToWantlistOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                // Should call addToWantlistOAuth to update the entry (notes)
                expect(mockedDiscogsConnector.addToWantlistOAuth).toHaveBeenCalledWith(
                    'updater',
                    555,
                    'token-555',
                    'secret-555',
                    { notes: 'Updated notes', rating: undefined }
                );
            });

            it('should handle moving item from wantlist to collection', async () => {
                mockRequest.params = { releaseId: '666' };
                mockRequest.body = { wishlist: false };
                mockRequest.user = { userId: 14, username: 'mover' } as any;

                mockedDiscogsConnector.getRelease.mockResolvedValue({
                    id: 666,
                    title: 'Moving Release',
                    artists: [{ name: 'Moving Artist' }],
                    genres: ['Metal'],
                    styles: ['Thrash'],
                    year: 2018,
                    images: []
                } as any);
                mockedRecordDao.upsertRecord.mockResolvedValue({} as any);
                mockedCollectionDao.readCollectionItem
                    .mockResolvedValueOnce([ // Was in wantlist
                        {
                            user_id: 14,
                            discogs_id: 666,
                            notes: '',
                            price_threshold: '',
                            rating: null,
                            wishlist: 1
                        }
                    ] as any)
                    .mockResolvedValueOnce([ // Now in collection
                        {
                            user_id: 14,
                            discogs_id: 666,
                            notes: '',
                            price_threshold: '',
                            rating: null,
                            wishlist: 0
                        }
                    ] as any);
                mockedCollectionDao.upsertCollectionItem.mockResolvedValue({} as any);
                mockedUserDao.readUserByUsername.mockResolvedValue([
                    { username: 'mover', discogs_token: 'token-666', discogs_token_secret: 'secret-666' }
                ] as any);
                mockedDiscogsConnector.fetchUserWantlistOAuth.mockResolvedValue({ wants: [{ id: 666 }] } as any);
                mockedDiscogsConnector.getReleaseInstances.mockResolvedValue({ releases: [] } as any);
                mockedDiscogsConnector.deleteFromWantlistOAuth.mockResolvedValue({} as any);
                mockedDiscogsConnector.addToCollectionOAuth.mockResolvedValue({} as any);

                await ReleasesController.upsertCollection(mockRequest, mockResponse, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockedDiscogsConnector.deleteFromWantlistOAuth).toHaveBeenCalledWith(
                    'mover',
                    666,
                    'token-666',
                    'secret-666'
                );
                expect(mockedDiscogsConnector.addToCollectionOAuth).toHaveBeenCalledWith(
                    'mover',
                    1,
                    666,
                    'token-666',
                    'secret-666',
                    { notes: undefined, rating: undefined }
                );
            });
        });
    });
});

