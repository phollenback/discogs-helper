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
        res.status(404).json({ message: 'Label not found' });
        return;
    }
    console.error('[labels.controller][Discogs][Error]', error);
    res.status(502).json({ message });
};

export const readLabelById: RequestHandler = async (req, res) => {
    const { labelId } = req.params;

    if (!isPositiveInteger(labelId)) {
        res.status(400).json({ message: 'Label ID must be a positive integer' });
        return;
    }

    const params = buildParams({
        ...(req.query.curr_abbr ? { curr_abbr: req.query.curr_abbr } : {})
    });

    try {
        const response = await axios.get(`${DISCOGS_API_BASE}/labels/${labelId}`, {
            params
        });
        res.status(200).json(response.data);
    } catch (error) {
        sendDiscogsError(res, 'Failed to fetch label from Discogs', error);
    }
};

export const readLabelReleases: RequestHandler = async (req, res) => {
    const { labelId } = req.params;
    const { page, per_page } = req.query;

    if (!isPositiveInteger(labelId)) {
        res.status(400).json({ message: 'Label ID must be a positive integer' });
        return;
    }

    if (page !== undefined && !isPositiveInteger(page as string)) {
        res.status(400).json({ message: 'page must be a positive integer' });
        return;
    }

    if (per_page !== undefined && !isPositiveInteger(per_page as string)) {
        res.status(400).json({ message: 'per_page must be a positive integer' });
        return;
    }

    const params = buildParams({
        page: page !== undefined ? Number(page) : 1,
        per_page: per_page !== undefined ? Number(per_page) : 50
    });

    try {
        const response = await axios.get(`${DISCOGS_API_BASE}/labels/${labelId}/releases`, {
            params
        });
        res.status(200).json(response.data);
    } catch (error) {
        sendDiscogsError(res, 'Failed to fetch label releases from Discogs', error);
    }
};

export const getLabelOverview: RequestHandler = async (req, res) => {
    const { labelId } = req.params;
    const { page = '1', per_page = '25' } = req.query;

    if (!isPositiveInteger(labelId)) {
        res.status(400).json({ message: 'Label ID must be a positive integer' });
        return;
    }

    try {
        // Fetch label details and releases in parallel
        const [labelResponse, releasesResponse] = await Promise.all([
            axios.get(`${DISCOGS_API_BASE}/labels/${labelId}`, {
                params: buildParams({})
            }),
            axios.get(`${DISCOGS_API_BASE}/labels/${labelId}/releases`, {
                params: buildParams({
                    page: Number(page),
                    per_page: Number(per_page)
                })
            })
        ]);

        const label = labelResponse.data;
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
            label,
            releases,
            stats
        });
    } catch (error) {
        sendDiscogsError(res, 'Failed to fetch label overview from Discogs', error);
    }
};

