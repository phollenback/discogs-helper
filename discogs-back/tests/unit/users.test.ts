import { Request, Response } from 'express';
import * as UserDao from '../../src/users/users.dao';
import * as UserController from '../../src/users/users.controller';
import { execute } from '../../src/services/mysql.connector';
import { generateToken } from '../../src/utils/jwt';
import { OkPacket } from 'mysql';

// Mock dependencies
jest.mock('../../src/services/mysql.connector');
jest.mock('../../src/utils/jwt');
jest.mock('../../src/services/discogs.connector', () => ({
    makeOAuthRequest: jest.fn().mockResolvedValue({ data: { releases: [], wants: [] } }),
    verifyOAuthIdentity: jest.fn().mockResolvedValue({ username: 'testuser' })
}));

const mockedExecute = execute as jest.MockedFunction<typeof execute>;
const mockedGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;

describe('Users Module Tests', () => {
    const mockRequest = {} as Request;
    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn(); // Mock console.log to avoid test output noise
        console.error = jest.fn(); // Mock console.error to avoid test output noise
        
        // Reset request object
        mockRequest.params = {};
        mockRequest.body = {};
        mockRequest.headers = {};
        mockRequest.user = undefined;
        mockRequest.ip = '127.0.0.1';
    });

    describe('UserDao Tests', () => {
        describe('readUsers', () => {
            it('should return all users from database', async () => {
                const mockUsers = [
                    { user_id: 1, username: 'user1', email: 'user1@test.com', password: 'pass1', is_admin: false },
                    { user_id: 2, username: 'user2', email: 'user2@test.com', password: 'pass2', is_admin: true },
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                const result = await UserDao.readUsers();

                expect(mockedExecute).toHaveBeenCalledWith(
                    expect.stringContaining('SELECT'),
                    []
                );
                expect(result).toEqual(mockUsers);
            });

            it('should return empty array when no users exist', async () => {
                mockedExecute.mockResolvedValue([] as any);

                const result = await UserDao.readUsers();

                expect(result).toEqual([]);
            });

            it('should handle database errors', async () => {
                const dbError = new Error('Database connection failed');
                mockedExecute.mockRejectedValue(dbError);

                await expect(UserDao.readUsers()).rejects.toThrow('Database connection failed');
            });
        });

        describe('createUser', () => {
            it('should create a new user successfully', async () => {
                const mockUser = {
                    username: 'newuser',
                    email: 'newuser@test.com',
                    password: 'password123'
                };

                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 10,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.createUser(mockUser);

                expect(mockedExecute).toHaveBeenCalledWith(
                    expect.stringContaining('INSERT INTO users'),
                    ['newuser', 'newuser@test.com', 'password123', null]
                );
                expect(result.insertId).toBe(10);
                expect(result.affectedRows).toBe(1);
            });

            it('should handle duplicate user creation', async () => {
                const mockUser = {
                    username: 'existinguser',
                    email: 'existing@test.com',
                    password: 'password123'
                };

                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 0,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 1,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.createUser(mockUser);

                expect(result.affectedRows).toBe(0);
            });
        });

        describe('readUserByUsername', () => {
            it('should return user by username', async () => {
                const mockUser = [{
                    user_id: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    password: 'password123',
                    is_admin: false
                }];

                mockedExecute.mockResolvedValue(mockUser as any);

                const result = await UserDao.readUserByUsername('testuser');

                expect(mockedExecute).toHaveBeenCalledWith(
                    expect.stringContaining('WHERE users.username'),
                    ['testuser']
                );
                expect(result).toEqual(mockUser);
            });

            it('should return empty array for non-existent user', async () => {
                mockedExecute.mockResolvedValue([] as any);

                const result = await UserDao.readUserByUsername('nonexistent');

                expect(result).toEqual([]);
            });
        });

        describe('updateUser', () => {
            it('should update user successfully', async () => {
                const mockUser = {
                    username: 'updateduser',
                    email: 'updated@test.com',
                    password: 'newpassword'
                };

                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 1
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.updateUser(mockUser, 'olduser');

                expect(mockedExecute).toHaveBeenCalledWith(
                    expect.stringContaining('UPDATE users'),
                    ['updateduser', 'updated@test.com', 'newpassword', 'olduser']
                );
                expect(result.affectedRows).toBe(1);
            });

            it('should return 0 affected rows for non-existent user', async () => {
                const mockUser = {
                    username: 'updateduser',
                    email: 'updated@test.com',
                    password: 'newpassword'
                };

                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 0,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.updateUser(mockUser, 'nonexistent');

                expect(result.affectedRows).toBe(0);
            });
        });

        describe('deleteUser', () => {
            it('should delete user successfully', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.deleteUser('testuser');

                expect(mockedExecute).toHaveBeenCalledWith(
                    expect.stringContaining('DELETE FROM'),
                    ['testuser']
                );
                expect(result.affectedRows).toBe(1);
            });

            it('should return 0 affected rows for non-existent user', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 0,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.deleteUser('nonexistent');

                expect(result.affectedRows).toBe(0);
            });
        });

        describe('updateDiscogsToken', () => {
            it('should update Discogs token and secret successfully', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 1
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.updateDiscogsToken(1, 'token123', 'secret123');

                expect(mockedExecute).toHaveBeenCalledWith(
                    expect.stringContaining('UPDATE users'),
                    ['token123', 'secret123', 1]
                );
                expect(result.affectedRows).toBe(1);
            });

            it('should update with null secret when not provided', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 1
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                const result = await UserDao.updateDiscogsToken(2, 'token456', null);

                expect(mockedExecute).toHaveBeenCalledWith(
                    expect.stringContaining('UPDATE users'),
                    ['token456', null, 2]
                );
                expect(result.affectedRows).toBe(1);
            });
        });
    });

    describe('UserController Tests', () => {
        describe('readUsers', () => {
            it('should return all users with sanitized data', async () => {
                const mockUsers = [
                    { user_id: 1, username: 'user1', email: 'user1@test.com', password: 'pass1', is_admin: false },
                    { user_id: 2, username: 'user2', email: 'user2@test.com', password: 'pass2', is_admin: true },
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.readUsers(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith([
                    { user_id: 1, username: 'user1', email: 'user1@test.com', user_image: null },
                    { user_id: 2, username: 'user2', email: 'user2@test.com', user_image: null }
                ]);
            });

            it('should handle database errors', async () => {
                mockedExecute.mockRejectedValue(new Error('Database error'));

                await UserController.readUsers(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'There was an error when fetching records'
                });
            });
        });

        describe('createUser', () => {
            it('should create a new user successfully', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 5,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockRequest.body = {
                    username: 'newuser',
                    email: 'newuser@test.com',
                    password: 'password123'
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                await UserController.createUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'User created successfully',
                    userId: mockOkPacket.insertId,
                    username: 'newuser',
                    email: 'newuser@test.com'
                });
            });

            it('should handle database errors', async () => {
                mockRequest.body = {
                    username: 'newuser',
                    email: 'newuser@test.com',
                    password: 'password123'
                };

                mockedExecute.mockRejectedValue(new Error('Database error'));

                await UserController.createUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'There was an error when creating user'
                });
            });
        });

        describe('readUserByUsername', () => {
            it('should return user by username with sanitized data', async () => {
                const mockUser = [{
                    user_id: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    password: 'password123',
                    is_admin: false
                }];

                mockRequest.params = { username: 'testuser' };
                mockedExecute.mockResolvedValue(mockUser as any);

                await UserController.readUserByUsername(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    username: 'testuser',
                    email: 'test@test.com'
                });
            });

            it('should return 404 for non-existent user', async () => {
                mockRequest.params = { username: 'nonexistent' };
                mockedExecute.mockResolvedValue([] as any);

                await UserController.readUserByUsername(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(404);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'User not found'
                });
            });

            it('should handle database errors', async () => {
                mockRequest.params = { username: 'testuser' };
                mockedExecute.mockRejectedValue(new Error('Database error'));

                await UserController.readUserByUsername(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'There was an error when fetching user'
                });
            });
        });

        describe('updateUser', () => {
            it('should update user when authorized', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 1
                };

                mockRequest.params = { username: 'testuser' };
                mockRequest.body = {
                    username: 'updateduser',
                    email: 'updated@test.com',
                    password: 'newpassword'
                };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                await UserController.updateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith(mockOkPacket);
            });

            it('should allow admin to update any user', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 1
                };

                mockRequest.params = { username: 'testuser' };
                mockRequest.body = {
                    username: 'updateduser',
                    email: 'updated@test.com',
                    password: 'newpassword'
                };
                mockRequest.user = {
                    userId: 99,
                    username: 'admin',
                    email: 'admin@test.com',
                    isAdmin: true
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                await UserController.updateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith(mockOkPacket);
            });

            it('should return 403 when user tries to update another user', async () => {
                mockRequest.params = { username: 'otheruser' };
                mockRequest.body = {
                    username: 'updateduser',
                    email: 'updated@test.com',
                    password: 'newpassword'
                };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                await UserController.updateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(403);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Access forbidden: You can only update your own account'
                });
            });

            it('should handle database errors', async () => {
                mockRequest.params = { username: 'testuser' };
                mockRequest.body = {
                    username: 'updateduser',
                    email: 'updated@test.com',
                    password: 'newpassword'
                };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                mockedExecute.mockRejectedValue(new Error('Database error'));

                await UserController.updateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'There was an error when fetching records'
                });
            });
        });

        describe('deleteUser', () => {
            it('should delete user when authorized', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockRequest.params = { username: 'testuser' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                await UserController.deleteUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith(mockOkPacket);
            });

            it('should allow admin to delete any user', async () => {
                const mockOkPacket: OkPacket = {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningCount: 0,
                    message: '',
                    protocol41: true,
                    changedRows: 0
                };

                mockRequest.params = { username: 'testuser' };
                mockRequest.user = {
                    userId: 99,
                    username: 'admin',
                    email: 'admin@test.com',
                    isAdmin: true
                };

                mockedExecute.mockResolvedValue(mockOkPacket as any);

                await UserController.deleteUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith(mockOkPacket);
            });

            it('should return 403 when user tries to delete another user', async () => {
                mockRequest.params = { username: 'otheruser' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                await UserController.deleteUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(403);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Access forbidden: You can only delete your own account'
                });
            });

            it('should handle database errors', async () => {
                mockRequest.params = { username: 'testuser' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                mockedExecute.mockRejectedValue(new Error('Database error'));

                await UserController.deleteUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'There was an error when fetching records'
                });
            });
        });

        describe('authenticateUser', () => {
            it('should authenticate user with valid credentials', async () => {
                const mockUsers = [
                    {
                        user_id: 1,
                        username: 'testuser',
                        email: 'test@test.com',
                        password: 'password123',
                        is_admin: false
                    }
                ];

                mockRequest.body = {
                    email: 'test@test.com',
                    password: 'password123'
                };
                mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0');

                mockedExecute.mockResolvedValue(mockUsers as any);
                mockedGenerateToken.mockReturnValue('mock-jwt-token');

                await UserController.authenticateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Login successful',
                    user: {
                        userId: 1,
                        username: 'testuser',
                        email: 'test@test.com',
                        isAdmin: false
                    },
                    token: 'mock-jwt-token'
                });
            });

            it('should authenticate admin user correctly', async () => {
                const mockUsers = [
                    {
                        user_id: 1,
                        username: 'admin',
                        email: 'admin@test.com',
                        password: 'password123',
                        is_admin: true
                    }
                ];

                mockRequest.body = {
                    email: 'admin@test.com',
                    password: 'password123'
                };
                mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0');

                mockedExecute.mockResolvedValue(mockUsers as any);
                mockedGenerateToken.mockReturnValue('mock-jwt-token');

                await UserController.authenticateUser(mockRequest, mockResponse);

                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        user: expect.objectContaining({
                            isAdmin: true
                        })
                    })
                );
            });

            it('should return 400 when email is missing', async () => {
                mockRequest.body = {
                    password: 'password123'
                };

                await UserController.authenticateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Email and password required.'
                });
            });

            it('should return 400 when password is missing', async () => {
                mockRequest.body = {
                    email: 'test@test.com'
                };

                await UserController.authenticateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Email and password required.'
                });
            });

            it('should return 401 when user is not found', async () => {
                mockRequest.body = {
                    email: 'nonexistent@test.com',
                    password: 'password123'
                };

                mockedExecute.mockResolvedValue([] as any);

                await UserController.authenticateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Invalid credentials.'
                });
            });

            it('should return 401 when password is incorrect', async () => {
                const mockUsers = [
                    {
                        user_id: 1,
                        username: 'testuser',
                        email: 'test@test.com',
                        password: 'password123',
                        is_admin: false
                    }
                ];

                mockRequest.body = {
                    email: 'test@test.com',
                    password: 'wrongpassword'
                };

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.authenticateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Invalid credentials.'
                });
            });

            it('should handle database errors', async () => {
                mockRequest.body = {
                    email: 'test@test.com',
                    password: 'password123'
                };

                mockedExecute.mockRejectedValue(new Error('Database error'));

                await UserController.authenticateUser(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Server error'
                });
            });
        });

        describe('syncWantlist', () => {
            it('should sync wantlist when authorized', async () => {
                const mockWantlist = [
                    { discogs_id: 1, rating: 5, notes: 'Great album', price_threshold: 50 },
                    { discogs_id: 2, rating: 4, notes: 'Good album', price_threshold: 30 }
                ];

                mockRequest.params = { userId: '1' };
                mockRequest.body = mockWantlist;
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                // Mock for DELETE and INSERT operations
                mockedExecute.mockResolvedValue({ affectedRows: 1 } as any);

                await UserController.syncWantlist(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Wantlist synced!'
                });
            });

            it('should allow admin to sync any user wantlist', async () => {
                const mockWantlist = [
                    { discogs_id: 1, rating: 5, notes: 'Great album', price_threshold: 50 }
                ];

                mockRequest.params = { userId: '5' };
                mockRequest.body = mockWantlist;
                mockRequest.user = {
                    userId: 99,
                    username: 'admin',
                    email: 'admin@test.com',
                    isAdmin: true
                };

                mockedExecute.mockResolvedValue({ affectedRows: 1 } as any);

                await UserController.syncWantlist(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Wantlist synced!'
                });
            });

            it('should return 403 when user tries to sync another user wantlist', async () => {
                mockRequest.params = { userId: '5' };
                mockRequest.body = [];
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                await UserController.syncWantlist(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(403);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Access forbidden: You can only sync your own wantlist'
                });
            });

            it('should handle empty wantlist', async () => {
                mockRequest.params = { userId: '1' };
                mockRequest.body = [];
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                mockedExecute.mockResolvedValue({ affectedRows: 0 } as any);

                await UserController.syncWantlist(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Wantlist synced!'
                });
            });

            it('should handle database errors', async () => {
                mockRequest.params = { userId: '1' };
                mockRequest.body = [];
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                mockedExecute.mockRejectedValue(new Error('Database error'));

                await UserController.syncWantlist(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: 'Failed to sync wantlist.'
                });
            });
        });

        describe('proxyDiscogsGET', () => {
            it('should proxy GET collection request', async () => {
                mockRequest.params = { userId: '1', folderId: '1', username: 'testuser' };
                mockRequest.url = '/api/users/1/discogs/proxy/collection/folders/1/releases';
                mockRequest.query = { username: 'testuser', per_page: '50' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: 'test_token',
                        discogs_token_secret: 'test_secret'
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);
                
                await UserController.proxyDiscogsGET(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({ releases: [], wants: [] });
            });

            it('should proxy GET wantlist request', async () => {
                mockRequest.params = { userId: '1', username: 'testuser' };
                mockRequest.url = '/api/users/1/discogs/proxy/wants';
                mockRequest.query = { username: 'testuser' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: 'test_token',
                        discogs_token_secret: 'test_secret'
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.proxyDiscogsGET(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({ releases: [], wants: [] });
            });

            it('should handle OAuth tokens not found', async () => {
                mockRequest.params = { userId: '1' };
                mockRequest.url = '/api/users/1/discogs/proxy/wants';
                mockRequest.query = { username: 'testuser' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: null,
                        discogs_token_secret: null
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.proxyDiscogsGET(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
            });

            it('should return 400 when username cannot be resolved', async () => {
                mockRequest.params = { userId: '1' };
                mockRequest.url = '/api/users/1/discogs/proxy/wants';
                mockRequest.query = {}; // missing username
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: null, 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: 'test_token',
                        discogs_token_secret: 'test_secret'
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.proxyDiscogsGET(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Discogs username is required' });
            });

            it('should handle invalid path', async () => {
                mockRequest.params = { userId: '1' };
                mockRequest.url = '/api/users/1/discogs/proxy/invalid';
                mockRequest.query = { username: 'testuser' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: 'test_token',
                        discogs_token_secret: 'test_secret'
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.proxyDiscogsGET(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
            });
        });

        describe('proxyDiscogsWrite', () => {
            it('should proxy PUT wantlist request', async () => {
                mockRequest.params = { userId: '1', releaseId: '123' };
                mockRequest.url = '/api/users/1/discogs/proxy/wants/123';
                mockRequest.method = 'PUT';
                mockRequest.body = { notes: 'Test', rating: 4 };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: 'test_token',
                        discogs_token_secret: 'test_secret'
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);
                
                await UserController.proxyDiscogsWrite(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
            });

            it('should proxy POST collection request', async () => {
                mockRequest.params = { userId: '1', folderId: '1', releaseId: '123' };
                mockRequest.url = '/api/users/1/discogs/proxy/collection/folders/1/releases/123';
                mockRequest.method = 'POST';
                mockRequest.body = { notes: 'Test' };
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: 'test_token',
                        discogs_token_secret: 'test_secret'
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.proxyDiscogsWrite(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
            });

            it('should handle OAuth tokens not found', async () => {
                mockRequest.params = { userId: '1', releaseId: '123' };
                mockRequest.url = '/api/users/1/discogs/proxy/wants/123';
                mockRequest.method = 'PUT';
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: null,
                        discogs_token_secret: null
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.proxyDiscogsWrite(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
            });

            it('should handle invalid path', async () => {
                mockRequest.params = { userId: '1' };
                mockRequest.url = '/api/users/1/discogs/proxy/invalid';
                mockRequest.method = 'DELETE';
                mockRequest.user = {
                    userId: 1,
                    username: 'testuser',
                    email: 'test@test.com',
                    isAdmin: false
                };

                const mockUsers = [
                    { 
                        user_id: 1, 
                        username: 'testuser', 
                        email: 'test@test.com', 
                        password: 'pass1', 
                        is_admin: false,
                        discogs_token: 'test_token',
                        discogs_token_secret: 'test_secret'
                    }
                ];

                mockedExecute.mockResolvedValue(mockUsers as any);

                await UserController.proxyDiscogsWrite(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
            });
        });
    });
});

