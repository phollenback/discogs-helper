import express from 'express';
import axios from 'axios';
import { readArtistById, readArtistReleases } from '../../src/artists/artists.controller';
import { readLabelById } from '../../src/labels/labels.controller';
import { getReleaseOverview } from '../../src/releases/releases.controller';
import { Server } from 'http';

describe('Discogs API proxy integration', () => {
    let server: Server;
    let baseUrl: string;
    let originalToken: string | undefined;

    beforeAll((done) => {
        originalToken = process.env.DISCOGS_TOKEN;
        process.env.DISCOGS_TOKEN = 'integration-token';

        const app = express();
        app.get('/api/artists/:artistId', readArtistById);
        app.get('/api/artists/:artistId/releases', readArtistReleases);
        app.get('/api/labels/:labelId', readLabelById);
        app.get('/api/releases/:releaseId/overview', getReleaseOverview);

        server = app.listen(0, () => {
            const address = server.address();
            if (typeof address === 'string' || address === null) {
                throw new Error('Failed to bind test server');
            }
            baseUrl = `http://127.0.0.1:${address.port}`;
            done();
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll((done) => {
        process.env.DISCOGS_TOKEN = originalToken;
        server.close(done);
    });

    it('proxies artist lookup with Discogs token and maps payload', async () => {
        const discogsPayload = {
            id: 108713,
            name: 'Boards Of Canada',
            profile: 'Scottish electronic music duo',
            resource_url: 'https://api.discogs.com/artists/108713'
        };

        const axiosSpy = jest.spyOn(axios, 'get').mockResolvedValue({
            data: discogsPayload
        } as any);

        const response = await fetch(`${baseUrl}/api/artists/108713`);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body).toEqual(discogsPayload);
        expect(axiosSpy).toHaveBeenCalledWith(
            'https://api.discogs.com/artists/108713',
            expect.objectContaining({
                params: expect.objectContaining({
                    token: 'integration-token'
                })
            })
        );
    });

    it('forwards Discogs 404 responses for labels', async () => {
        jest.spyOn(axios, 'get').mockRejectedValue(
            Object.assign(new Error('Not found'), {
                isAxiosError: true,
                response: {
                    status: 404,
                    data: { message: 'Resource not found' }
                }
            })
        );

        const response = await fetch(`${baseUrl}/api/labels/9999`);

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body).toEqual({ message: 'Label not found' });
    });

    it('returns validation error before reaching Discogs', async () => {
        const axiosSpy = jest.spyOn(axios, 'get');

        const response = await fetch(`${baseUrl}/api/artists/invalid`);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toEqual({ message: 'Artist ID must be a positive integer' });
        expect(axiosSpy).not.toHaveBeenCalled();
    });

    it('aggregates release overview data from multiple Discogs endpoints', async () => {
        const releasePayload = {
            id: 123,
            title: 'Test Release',
            master_id: 200,
            artists: [{ name: 'Test Artist' }]
        };
        const statsPayload = { have: 100, want: 50 };
        const ratingPayload = { rating: { average: 4.5, count: 20 } };
        const masterPayload = { id: 200, main_release: 123, title: 'Master Title' };
        const versionsPayload = { versions: [{ id: 123, format: 'Vinyl' }] };

        const axiosSpy = jest.spyOn(axios, 'get').mockImplementation(((url: string) => {
            if (url === 'https://api.discogs.com/releases/123') {
                return Promise.resolve({ data: releasePayload });
            }
            if (url === 'https://api.discogs.com/releases/123/stats') {
                return Promise.resolve({ data: statsPayload });
            }
            if (url === 'https://api.discogs.com/releases/123/rating') {
                return Promise.resolve({ data: ratingPayload });
            }
            if (url === 'https://api.discogs.com/masters/200') {
                return Promise.resolve({ data: masterPayload });
            }
            if (url === 'https://api.discogs.com/masters/200/versions') {
                return Promise.resolve({ data: versionsPayload });
            }
            throw new Error(`Unexpected URL: ${url}`);
        }) as any);

        const response = await fetch(`${baseUrl}/api/releases/123/overview`);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.release).toEqual(releasePayload);
        expect(body.stats).toEqual(statsPayload);
        expect(body.communityRating).toEqual(ratingPayload);
        expect(body.master).toEqual(masterPayload);
        expect(body.masterVersions).toEqual(versionsPayload);
        expect(axiosSpy).toHaveBeenCalledTimes(5);
    });
});

