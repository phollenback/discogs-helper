import axios from 'axios';
import { Request, Response } from 'express';
import { readArtistById, readArtistReleases } from '../../src/artists/artists.controller';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const buildResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const buildRequest = () => {
    const req = {} as Request;
    req.params = {};
    req.query = {};
    req.body = {};
    return req;
};

describe('Artists Controller Proxy Tests (Discogs)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.DISCOGS_TOKEN;
    });

    describe('readArtistById', () => {
        it('should fetch artist details from Discogs', async () => {
            const req = buildRequest();
            req.params = { artistId: '108713' };

            const mockArtist = {
                id: 108713,
                name: 'Boards Of Canada',
                profile: 'Scottish electronic music duo.',
                resource_url: 'https://api.discogs.com/artists/108713'
            };

            mockedAxios.get.mockResolvedValue({
                data: mockArtist,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            const res = buildResponse();

            await readArtistById(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/artists/108713',
                expect.objectContaining({
                    params: expect.any(Object)
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockArtist);
        });

        it('should include Discogs token when configured', async () => {
            process.env.DISCOGS_TOKEN = 'artist-token';

            const req = buildRequest();
            req.params = { artistId: '12' };
            const res = buildResponse();

            mockedAxios.get.mockResolvedValue({
                data: { id: 12 },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            await readArtistById(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/artists/12',
                expect.objectContaining({
                    params: expect.objectContaining({ token: 'artist-token' })
                })
            );
        });

        it('should return 400 for invalid artistId input', async () => {
            const req = buildRequest();
            req.params = { artistId: 'abc' };
            const res = buildResponse();

            await readArtistById(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Artist ID must be a positive integer'
            });
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should map Discogs errors to 502', async () => {
            const req = buildRequest();
            req.params = { artistId: '108713' };
            const res = buildResponse();

            mockedAxios.get.mockRejectedValue(new Error('Discogs outage'));

            await readArtistById(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(502);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to fetch artist from Discogs'
            });
        });
    });

    describe('readArtistReleases', () => {
        it('should proxy artist releases with optional sort params', async () => {
            const req = buildRequest();
            req.params = { artistId: '108713' };
            req.query = { page: '3', per_page: '25', sort: 'year', sort_order: 'desc' };

            const mockReleases = {
                pagination: {
                    page: 3,
                    per_page: 25,
                    pages: 10,
                    items: 250,
                    urls: {}
                },
                releases: [
                    {
                        id: 1,
                        title: 'Music Has The Right To Children',
                        year: 1998
                    }
                ]
            };

            mockedAxios.get.mockResolvedValue({
                data: mockReleases,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            const res = buildResponse();

            await readArtistReleases(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/artists/108713/releases',
                expect.objectContaining({
                    params: expect.objectContaining({
                        page: 3,
                        per_page: 25,
                        sort: 'year',
                        sort_order: 'desc'
                    })
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockReleases);
        });

        it('should default pagination when not supplied', async () => {
            const req = buildRequest();
            req.params = { artistId: '108713' };
            const res = buildResponse();

            const mockReleases = { pagination: { page: 1, per_page: 50, pages: 1, items: 0, urls: {} }, releases: [] };

            mockedAxios.get.mockResolvedValue({
                data: mockReleases,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            await readArtistReleases(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/artists/108713/releases',
                expect.objectContaining({
                    params: expect.objectContaining({
                        page: 1,
                        per_page: 50
                    })
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockReleases);
        });

        it('should validate sort and sort_order inputs', async () => {
            const req = buildRequest();
            req.params = { artistId: '108713' };
            req.query = { sort: 'invalid', sort_order: 'asc' };
            const res = buildResponse();

            await readArtistReleases(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'sort must be one of: year, title, format'
            });
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should reject non-positive pagination inputs', async () => {
            const req = buildRequest();
            req.params = { artistId: '108713' };
            req.query = { page: '0', per_page: '-5' };
            const res = buildResponse();

            await readArtistReleases(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'page must be a positive integer'
            });
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should return 400 when artistId is invalid', async () => {
            const req = buildRequest();
            req.params = { artistId: '-1' };
            const res = buildResponse();

            await readArtistReleases(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Artist ID must be a positive integer'
            });
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should surface Discogs failures as 502', async () => {
            const req = buildRequest();
            req.params = { artistId: '108713' };
            req.query = { page: '1', per_page: '50' };
            const res = buildResponse();

            mockedAxios.get.mockRejectedValue(new Error('Discogs outage'));

            await readArtistReleases(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(502);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to fetch artist releases from Discogs'
            });
        });
    });
});