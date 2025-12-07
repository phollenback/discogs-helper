import axios from 'axios';
import { RequestHandler } from 'express';

const DISCOGS_API_BASE = 'https://api.discogs.com';

const isPositiveInteger = (value?: string) => {
    if (!value) return false;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0;
};

const buildParams = (query: Record<string, unknown>) => {
    const params: Record<string, unknown> = {};
    const token = process.env.DISCOGS_TOKEN;
    if (token) {
        params.token = token;
    }
    Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined) {
            params[key] = val;
        }
    });
    return params;
};

const sendDiscogsError = (res: Parameters<RequestHandler>[1], message: string, error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
        res.status(404).json({ message: 'Artist not found' });
        return;
    }
    console.error('[artists.controller][Discogs][Error]', error);
    res.status(502).json({ message });
};

export const readArtistById: RequestHandler = async (req, res) => {
    const { artistId } = req.params;

    if (!isPositiveInteger(artistId)) {
        res.status(400).json({ message: 'Artist ID must be a positive integer' });
        return;
    }

    try {
        const response = await axios.get(`${DISCOGS_API_BASE}/artists/${artistId}`, {
            params: buildParams({})
        });

        res.status(200).json(response.data);
    } catch (error) {
        sendDiscogsError(res, 'Failed to fetch artist from Discogs', error);
    }
};

export const readArtistReleases: RequestHandler = async (req, res) => {
    const { artistId } = req.params;
    const { page, per_page, sort, sort_order } = req.query;

    if (!isPositiveInteger(artistId)) {
        res.status(400).json({ message: 'Artist ID must be a positive integer' });
        return;
    }

    if (page !== undefined && (!isPositiveInteger(page as string))) {
        res.status(400).json({ message: 'page must be a positive integer' });
        return;
    }

    if (per_page !== undefined && (!isPositiveInteger(per_page as string))) {
        res.status(400).json({ message: 'per_page must be a positive integer' });
        return;
    }

    if (sort !== undefined) {
        const allowedSort = ['year', 'title', 'format'];
        if (!allowedSort.includes(String(sort))) {
            res.status(400).json({ message: 'sort must be one of: year, title, format' });
            return;
        }
    }

    if (sort_order !== undefined) {
        const allowedOrder = ['asc', 'desc'];
        if (!allowedOrder.includes(String(sort_order))) {
            res.status(400).json({ message: 'sort_order must be one of: asc, desc' });
            return;
        }
    }

    const params = buildParams({
        page: page !== undefined ? Number(page) : 1,
        per_page: per_page !== undefined ? Number(per_page) : 50,
        sort,
        sort_order
    });

    try {
        const response = await axios.get(`${DISCOGS_API_BASE}/artists/${artistId}/releases`, {
            params
        });
        res.status(200).json(response.data);
    } catch (error) {
        sendDiscogsError(res, 'Failed to fetch artist releases from Discogs', error);
    }
};

export const getArtistOverview: RequestHandler = async (req, res) => {
    const { artistId } = req.params;
    const { page = '1', per_page = '25', sort = 'year', sort_order = 'desc' } = req.query;

    if (!isPositiveInteger(artistId)) {
        res.status(400).json({ message: 'Artist ID must be a positive integer' });
        return;
    }

    try {
        // Fetch artist details and releases in parallel
        const [artistResponse, releasesResponse] = await Promise.all([
            axios.get(`${DISCOGS_API_BASE}/artists/${artistId}`, {
                params: buildParams({})
            }),
            axios.get(`${DISCOGS_API_BASE}/artists/${artistId}/releases`, {
                params: buildParams({
                    page: Number(page),
                    per_page: Number(per_page),
                    sort: String(sort),
                    sort_order: String(sort_order)
                })
            })
        ]);

        const artist = artistResponse.data;
        const releases = releasesResponse.data;

        // Calculate stats
        const allReleases = releases.releases || [];
        const years = allReleases
            .map((r: any) => r.year)
            .filter((y: any) => y && y > 0)
            .sort((a: number, b: number) => a - b);
        
        const stats = {
            totalReleases: releases.pagination?.items || 0,
            earliestYear: years.length > 0 ? years[0] : null,
            latestYear: years.length > 0 ? years[years.length - 1] : null,
            yearSpan: years.length > 0 ? years[years.length - 1] - years[0] : 0
        };

        res.status(200).json({
            artist,
            releases,
            stats
        });
    } catch (error) {
        sendDiscogsError(res, 'Failed to fetch artist overview from Discogs', error);
    }
};
