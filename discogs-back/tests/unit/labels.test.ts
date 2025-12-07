import axios from 'axios';
import { Request, Response } from 'express';
import { readLabelById, readLabelReleases } from '../../src/labels/labels.controller';

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

describe('Labels Controller Proxy Tests (Discogs)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.DISCOGS_TOKEN;
    });

    describe('readLabelById', () => {
        it('should expose a handler that proxies the Discogs label detail endpoint', async () => {
            const req = buildRequest();
            req.params = { labelId: '5' };
            req.query = { curr_abbr: 'USD' };

            const mockLabel = {
                id: 5,
                name: 'Warp Records',
                profile: 'Warp Records is a UK-based label.',
                resource_url: 'https://api.discogs.com/labels/5',
                releases_url: 'https://api.discogs.com/labels/5/releases',
                data_quality: 'Needs Vote'
            };

            mockedAxios.get.mockResolvedValue({
                data: mockLabel,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            const res = buildResponse();

            await readLabelById(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/labels/5',
                expect.objectContaining({
                    params: expect.objectContaining({ curr_abbr: 'USD' })
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLabel);
        });

        it('should append Discogs token when configured', async () => {
            process.env.DISCOGS_TOKEN = 'secret-token';

            const req = buildRequest();
            req.params = { labelId: '10' };

            mockedAxios.get.mockResolvedValue({
                data: { id: 10 },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            const res = buildResponse();

            await readLabelById(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/labels/10',
                expect.objectContaining({
                    params: expect.objectContaining({ token: 'secret-token' })
                })
            );
        });

        it('should return 400 when labelId is not a positive integer', async () => {
            const req = buildRequest();
            req.params = { labelId: 'abc' };
            const res = buildResponse();

            await readLabelById(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Label ID must be a positive integer'
            });
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should surface a 502 when Discogs API returns an error', async () => {
            const req = buildRequest();
            req.params = { labelId: '5' };
            const res = buildResponse();

            mockedAxios.get.mockRejectedValue(new Error('Discogs outage'));

            await readLabelById(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/labels/5',
                expect.objectContaining({
                    params: expect.any(Object)
                })
            );
            expect(res.status).toHaveBeenCalledWith(502);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to fetch label from Discogs'
            });
        });
    });

    describe('readLabelReleases', () => {
        it('should expose a handler that proxies label releases with pagination options', async () => {
            const req = buildRequest();
            req.params = { labelId: '5' };
            req.query = { page: '2', per_page: '25' };

            const mockReleases = {
                pagination: {
                    per_page: 25,
                    items: 75,
                    page: 2,
                    pages: 3,
                    urls: {
                        next: 'https://api.discogs.com/labels/5/releases?page=3&per_page=25',
                        prev: 'https://api.discogs.com/labels/5/releases?page=1&per_page=25'
                    }
                },
                releases: [
                    {
                        id: 1234,
                        artist: 'Aphex Twin',
                        title: 'Selected Ambient Works 85-92',
                        year: 1992,
                        resource_url: 'https://api.discogs.com/releases/1234',
                        status: 'Official',
                        type: 'release'
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

            await readLabelReleases(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/labels/5/releases',
                expect.objectContaining({
                    params: expect.objectContaining({
                        page: 2,
                        per_page: 25
                    })
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockReleases);
        });

        it('should default pagination to page=1 & per_page=50 when query params not provided', async () => {
            const req = buildRequest();
            req.params = { labelId: '5' };
            const res = buildResponse();

            const mockReleases = {
                pagination: { page: 1, per_page: 50, pages: 1, items: 10, urls: {} },
                releases: []
            };

            mockedAxios.get.mockResolvedValue({
                data: mockReleases,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any
            });

            await readLabelReleases(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/labels/5/releases',
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

        it('should return 400 when pagination params are invalid', async () => {
            const req = buildRequest();
            req.params = { labelId: '5' };
            req.query = { page: 'zero', per_page: '25' };
            const res = buildResponse();

            await readLabelReleases(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'page must be a positive integer'
            });
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should return 400 when labelId is invalid', async () => {
            const req = buildRequest();
            req.params = { labelId: '-1' };
            const res = buildResponse();

            await readLabelReleases(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Label ID must be a positive integer'
            });
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should surface a 502 when Discogs releases endpoint fails', async () => {
            const req = buildRequest();
            req.params = { labelId: '5' };
            req.query = { page: '1', per_page: '50' };
            const res = buildResponse();

            mockedAxios.get.mockRejectedValue(new Error('Discogs outage'));

            await readLabelReleases(req, res, jest.fn());

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.discogs.com/labels/5/releases',
                expect.objectContaining({
                    params: expect.objectContaining({
                        page: 1,
                        per_page: 50
                    })
                })
            );
            expect(res.status).toHaveBeenCalledWith(502);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to fetch label releases from Discogs'
            });
        });
    });
});
