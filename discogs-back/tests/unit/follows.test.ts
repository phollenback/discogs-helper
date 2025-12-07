import { Request, Response } from 'express';
import * as FollowsController from '../../src/follows/follows.controller';
import * as FollowsDao from '../../src/follows/follows.dao';
import * as UserDao from '../../src/users/users.dao';

// Mock the DAO modules
jest.mock('../../src/follows/follows.dao');
jest.mock('../../src/users/users.dao');

describe('Follows Module Tests', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock response
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };

        // Setup basic mock request
        mockRequest = {
            params: {},
            user: undefined,
        };
    });

    describe('followUser Controller', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockRequest.params = { username: 'targetUser' };
            mockRequest.user = undefined;

            await FollowsController.followUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Authentication required' });
        });

        it('should return 404 if target user not found', async () => {
            mockRequest.params = { username: 'nonexistentUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([]);

            await FollowsController.followUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should return 400 if user tries to follow themselves', async () => {
            mockRequest.params = { username: 'currentUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'currentUser' }
            ]);

            await FollowsController.followUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'You cannot follow yourself' });
        });

        it('should return 400 if already following the user', async () => {
            mockRequest.params = { username: 'targetUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'targetUser' }
            ]);
            (FollowsDao.isFollowing as jest.Mock).mockResolvedValue([{ is_following: 1 }]);

            await FollowsController.followUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'You are already following this user' });
        });

        it('should successfully follow a user', async () => {
            mockRequest.params = { username: 'targetUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'targetUser' }
            ]);
            (FollowsDao.isFollowing as jest.Mock).mockResolvedValue([{ is_following: 0 }]);
            (FollowsDao.followUser as jest.Mock).mockResolvedValue({ affectedRows: 1 });

            await FollowsController.followUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(FollowsDao.followUser).toHaveBeenCalledWith(1, 2);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Successfully followed user',
                following: 'targetUser'
            });
        });

        it('should handle errors gracefully', async () => {
            mockRequest.params = { username: 'targetUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockRejectedValue(new Error('Database error'));

            await FollowsController.followUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error following user' });
        });
    });

    describe('unfollowUser Controller', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockRequest.params = { username: 'targetUser' };
            mockRequest.user = undefined;

            await FollowsController.unfollowUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Authentication required' });
        });

        it('should return 404 if target user not found', async () => {
            mockRequest.params = { username: 'nonexistentUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([]);

            await FollowsController.unfollowUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should successfully unfollow a user', async () => {
            mockRequest.params = { username: 'targetUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'targetUser' }
            ]);
            (FollowsDao.unfollowUser as jest.Mock).mockResolvedValue({ affectedRows: 1 });

            await FollowsController.unfollowUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(FollowsDao.unfollowUser).toHaveBeenCalledWith(1, 2);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Successfully unfollowed user',
                unfollowed: 'targetUser'
            });
        });

        it('should handle errors gracefully', async () => {
            mockRequest.params = { username: 'targetUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockRejectedValue(new Error('Database error'));

            await FollowsController.unfollowUser(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error unfollowing user' });
        });
    });

    describe('getFollowing Controller', () => {
        it('should return 404 if user not found', async () => {
            mockRequest.params = { username: 'nonexistentUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([]);

            await FollowsController.getFollowing(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should return list of users being followed', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getFollowing as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'user2', email: 'user2@test.com', followed_at: '2024-01-01' },
                { user_id: 3, username: 'user3', email: 'user3@test.com', followed_at: '2024-01-02' }
            ]);

            await FollowsController.getFollowing(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith([
                { user_id: 2, username: 'user2', followed_at: '2024-01-01' },
                { user_id: 3, username: 'user3', followed_at: '2024-01-02' }
            ]);
        });

        it('should sanitize sensitive information', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getFollowing as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'user2', email: 'secret@test.com', password: 'secret', followed_at: '2024-01-01' }
            ]);

            await FollowsController.getFollowing(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            const responseData = jsonMock.mock.calls[0][0];
            expect(responseData[0]).not.toHaveProperty('email');
            expect(responseData[0]).not.toHaveProperty('password');
        });

        it('should handle errors gracefully', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockRejectedValue(new Error('Database error'));

            await FollowsController.getFollowing(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error fetching following list' });
        });
    });

    describe('getFollowers Controller', () => {
        it('should return 404 if user not found', async () => {
            mockRequest.params = { username: 'nonexistentUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([]);

            await FollowsController.getFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should return list of followers', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getFollowers as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'follower1', email: 'f1@test.com', followed_at: '2024-01-01' },
                { user_id: 3, username: 'follower2', email: 'f2@test.com', followed_at: '2024-01-02' }
            ]);

            await FollowsController.getFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith([
                { user_id: 2, username: 'follower1', followed_at: '2024-01-01' },
                { user_id: 3, username: 'follower2', followed_at: '2024-01-02' }
            ]);
        });

        it('should handle errors gracefully', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockRejectedValue(new Error('Database error'));

            await FollowsController.getFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error fetching followers list' });
        });
    });

    describe('getFollowStatus Controller', () => {
        it('should return 404 if user not found', async () => {
            mockRequest.params = { username: 'nonexistentUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([]);

            await FollowsController.getFollowStatus(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should return basic follow counts for unauthenticated users', async () => {
            mockRequest.params = { username: 'testUser' };
            mockRequest.user = undefined;

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getFollowCounts as jest.Mock).mockResolvedValue([
                { follower_count: 10, following_count: 5 }
            ]);

            await FollowsController.getFollowStatus(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                username: 'testUser',
                follower_count: 10,
                following_count: 5
            });
        });

        it('should include relationship info for authenticated users viewing others', async () => {
            mockRequest.params = { username: 'otherUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'otherUser' }
            ]);
            (FollowsDao.getFollowCounts as jest.Mock).mockResolvedValue([
                { follower_count: 10, following_count: 5 }
            ]);
            (FollowsDao.isFollowing as jest.Mock)
                .mockResolvedValueOnce([{ is_following: 1 }]) // current user follows other
                .mockResolvedValueOnce([{ is_following: 1 }]); // other follows current user

            await FollowsController.getFollowStatus(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                username: 'otherUser',
                follower_count: 10,
                following_count: 5,
                relationship: {
                    is_following: true,
                    follows_you: true,
                    is_mutual: true
                }
            });
        });

        it('should not include relationship for own profile', async () => {
            mockRequest.params = { username: 'testUser' };
            mockRequest.user = { userId: 1 };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getFollowCounts as jest.Mock).mockResolvedValue([
                { follower_count: 10, following_count: 5 }
            ]);

            await FollowsController.getFollowStatus(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            const responseData = jsonMock.mock.calls[0][0];
            expect(responseData).not.toHaveProperty('relationship');
        });

        it('should handle errors gracefully', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockRejectedValue(new Error('Database error'));

            await FollowsController.getFollowStatus(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error fetching follow status' });
        });
    });

    describe('getMutualFollowers Controller', () => {
        it('should return 404 if user not found', async () => {
            mockRequest.params = { username: 'nonexistentUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([]);

            await FollowsController.getMutualFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should return list of mutual followers (friends)', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getMutualFollowers as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'friend1', email: 'f1@test.com' },
                { user_id: 3, username: 'friend2', email: 'f2@test.com' }
            ]);

            await FollowsController.getMutualFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith([
                { user_id: 2, username: 'friend1' },
                { user_id: 3, username: 'friend2' }
            ]);
        });

        it('should sanitize sensitive information', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getMutualFollowers as jest.Mock).mockResolvedValue([
                { user_id: 2, username: 'friend1', email: 'secret@test.com', password: 'secret' }
            ]);

            await FollowsController.getMutualFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            const responseData = jsonMock.mock.calls[0][0];
            expect(responseData[0]).not.toHaveProperty('email');
            expect(responseData[0]).not.toHaveProperty('password');
        });

        it('should handle errors gracefully', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockRejectedValue(new Error('Database error'));

            await FollowsController.getMutualFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error fetching mutual followers' });
        });
    });

    describe('Edge Cases and Data Integrity', () => {
        it('should handle empty follower lists', async () => {
            mockRequest.params = { username: 'lonelyUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'lonelyUser' }
            ]);
            (FollowsDao.getFollowers as jest.Mock).mockResolvedValue([]);

            await FollowsController.getFollowers(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith([]);
        });

        it('should handle empty following lists', async () => {
            mockRequest.params = { username: 'newUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'newUser' }
            ]);
            (FollowsDao.getFollowing as jest.Mock).mockResolvedValue([]);

            await FollowsController.getFollowing(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith([]);
        });

        it('should handle zero counts in follow status', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getFollowCounts as jest.Mock).mockResolvedValue([
                { follower_count: 0, following_count: 0 }
            ]);

            await FollowsController.getFollowStatus(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(jsonMock).toHaveBeenCalledWith({
                username: 'testUser',
                follower_count: 0,
                following_count: 0
            });
        });

        it('should handle undefined counts gracefully', async () => {
            mockRequest.params = { username: 'testUser' };

            (UserDao.readUserByUsername as jest.Mock).mockResolvedValue([
                { user_id: 1, username: 'testUser' }
            ]);
            (FollowsDao.getFollowCounts as jest.Mock).mockResolvedValue([]);

            await FollowsController.getFollowStatus(
                mockRequest as Request,
                mockResponse as Response,
                jest.fn()
            );

            expect(jsonMock).toHaveBeenCalledWith({
                username: 'testUser',
                follower_count: 0,
                following_count: 0
            });
        });
    });
});

