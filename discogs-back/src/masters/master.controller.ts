import { RequestHandler } from 'express';
import axios from 'axios';
import * as DiscogsConnector from '../services/discogs.connector';

const parsePositiveInt = (value: string | undefined) => {
    if (!value) return NaN;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return NaN;
    }
    return parsed;
};

const handleDiscogsError = (error: unknown, res: any, fallbackMessage: string) => {
    if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 404) {
            return res.status(404).json({
                message: error.response.data?.message || 'Master release not found'
            });
        }
        return res.status(status).json({
            message: error.response.data?.message || fallbackMessage
        });
    }
    console.error('[masters.controller][Discogs][Error]', error);
    return res.status(502).json({ message: fallbackMessage });
};

export const getMasterRelease: RequestHandler = async (req, res) => {
    const masterId = parsePositiveInt(req.params.masterId);
    if (Number.isNaN(masterId)) {
        return res.status(400).json({ message: 'Master ID must be a positive integer' });
    }

    try {
        const master = await DiscogsConnector.getMasterRelease(masterId);
        res.status(200).json(master);
    } catch (error) {
        return handleDiscogsError(error, res, 'Failed to fetch master release');
    }
};

export const getMasterReleaseVersions: RequestHandler = async (req, res) => {
    const masterId = parsePositiveInt(req.params.masterId);
    if (Number.isNaN(masterId)) {
        return res.status(400).json({ message: 'Master ID must be a positive integer' });
    }

    const {
        page,
        per_page,
        format,
        label,
        released,
        country,
        sort,
        sort_order
    } = req.query as Record<string, string>;

    try {
        const versions = await DiscogsConnector.getMasterVersions(masterId, {
            page: page ? Number(page) : undefined,
            per_page: per_page ? Number(per_page) : undefined,
            format,
            label,
            released,
            country,
            sort,
            sort_order
        });

        res.status(200).json(versions);
    } catch (error) {
        return handleDiscogsError(error, res, 'Failed to fetch master versions');
    }
};

