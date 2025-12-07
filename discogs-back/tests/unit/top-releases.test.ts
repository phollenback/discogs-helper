import { readUserTopReleases, updateUserTopReleases } from '../../src/suggestions/suggestions.dao';
import { execute } from '../../src/services/mysql.connector';

// Mock the mysql connector
jest.mock('../../src/services/mysql.connector');
const mockedExecute = execute as jest.MockedFunction<typeof execute>;

describe('Top Releases Management', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('readUserTopReleases', () => {
        it('should fetch top releases for a user', async () => {
            const mockTopReleases = [{
                top_releases: JSON.stringify([
                    { discogsId: 1, title: 'Album 1', artist: 'Artist 1', coverImage: 'url1' },
                    { discogsId: 2, title: 'Album 2', artist: 'Artist 2', coverImage: 'url2' },
                    { discogsId: 3, title: 'Album 3', artist: 'Artist 3', coverImage: 'url3' }
                ])
            }];

            mockedExecute.mockResolvedValue(mockTopReleases as any);

            const result = await readUserTopReleases('pskills');

            expect(mockedExecute).toHaveBeenCalledWith(
                expect.stringContaining('SELECT top_releases'),
                ['pskills']
            );
            expect(result).toEqual(mockTopReleases);
        });

        it('should handle user with no top releases', async () => {
            const mockEmptyResult = [{ top_releases: null }];
            mockedExecute.mockResolvedValue(mockEmptyResult as any);

            const result = await readUserTopReleases('newuser');

            expect(result).toEqual(mockEmptyResult);
        });

        it('should handle non-existent user', async () => {
            mockedExecute.mockResolvedValue([] as any);

            const result = await readUserTopReleases('nonexistent');

            expect(result).toEqual([]);
        });
    });

    describe('updateUserTopReleases', () => {
        it('should update top releases with valid data', async () => {
            const topReleases = [
                { discogsId: 1, title: 'Dark Side of the Moon', artist: 'Pink Floyd', coverImage: 'url1' },
                { discogsId: 2, title: 'Abbey Road', artist: 'The Beatles', coverImage: 'url2' },
                { discogsId: 3, title: 'Thriller', artist: 'Michael Jackson', coverImage: 'url3' }
            ];

            const mockOkPacket = {
                fieldCount: 0,
                affectedRows: 1,
                insertId: 0,
                serverStatus: 2,
                warningCount: 0
            };

            mockedExecute.mockResolvedValue(mockOkPacket as any);

            const result = await updateUserTopReleases('pskills', topReleases);

            expect(mockedExecute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                [JSON.stringify(topReleases), 'pskills']
            );
            expect(result.affectedRows).toBe(1);
        });

        it('should update with empty array to clear top releases', async () => {
            const mockOkPacket = { affectedRows: 1 };
            mockedExecute.mockResolvedValue(mockOkPacket as any);

            const result = await updateUserTopReleases('pskills', []);

            expect(mockedExecute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                ['[]', 'pskills']
            );
        });

        it('should handle complex release objects', async () => {
            const topReleases = [
                { 
                    discogsId: 123, 
                    title: 'Test Album', 
                    artist: 'Test Artist',
                    coverImage: 'https://example.com/image.jpg',
                    year: 2020,
                    genres: ['Rock', 'Alternative']
                }
            ];

            const mockOkPacket = { affectedRows: 1 };
            mockedExecute.mockResolvedValue(mockOkPacket as any);

            await updateUserTopReleases('pskills', topReleases);

            expect(mockedExecute).toHaveBeenCalledWith(
                expect.any(String),
                [JSON.stringify(topReleases), 'pskills']
            );
        });

        it('should properly stringify JSON data', async () => {
            const topReleases = [
                { discogsId: 1, title: 'Album', artist: 'Artist', coverImage: 'url' }
            ];

            const mockOkPacket = { affectedRows: 1 };
            mockedExecute.mockResolvedValue(mockOkPacket as any);

            await updateUserTopReleases('pskills', topReleases);

            const expectedJson = JSON.stringify(topReleases);
            expect(mockedExecute).toHaveBeenCalledWith(
                expect.any(String),
                [expectedJson, 'pskills']
            );
        });
    });
});

