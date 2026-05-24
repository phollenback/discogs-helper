import { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { execute } from '../services/mysql.connector';
import { ensureRecordData } from '../releases/releases.dao';
import * as DiscogsConnector from '../services/discogs.connector';

interface IdentifyBody {
    catalog_number?: string | null;
    artist?: string | null;       // optional hint, may be empty — Pi intentionally leaves blank
    title?: string | null;        // optional hint, may be empty
    raw_tokens?: string[];        // primary: raw OCR lines from Pi
    ocr_keywords?: string[];      // supplemental pre-tokenized keywords
    source?: string;              // 'azure' | 'tesseract'
    confidence?: number;
    user_id?: number;
    label_crop_base64?: string;
}

interface RecordRow {
    record_id: number;
    discogs_id: number;
    artist: string;
    title: string;
    tracks: string;   // GROUP_CONCAT of track titles, separator '|||' (from record_tracks)
}

interface SpinEventBody {
    user_id?: number;
    discogs_id?: number | null;
    artist?: string | null;
    title?: string | null;
    duration_sec?: number;
    reason?: string;
    timestamp?: string;
}

// ── SSE push infrastructure ───────────────────────────────────────────────────

const sseClients = new Map<string, Response>();
let sseIdSeq = 0;

function pushSse(event: string, data: object): void {
    if (sseClients.size === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, res] of sseClients) {
        try { res.write(payload); } catch { sseClients.delete(id); }
    }
}

async function buildNowPlayingPayload(userId: number): Promise<object> {
    const rows = await execute<any[]>(
        `SELECT ps.id, ps.discogs_id, ps.artist, ps.title, ps.spin_started_at, ps.status, ps.created_at,
                r.thumb_url, r.cover_image_url, r.release_year, r.genre
         FROM play_sessions ps
         LEFT JOIN records r ON ps.discogs_id = r.discogs_id
         WHERE ps.user_id = ? AND ps.status IN ('present', 'spinning')
         ORDER BY ps.created_at DESC LIMIT 1`,
        [userId]
    );
    const s = rows?.[0];
    if (!s) return { status: 'idle' };
    return {
        status: s.status === 'spinning' ? 'playing' : 'pending_identification',
        discogs_id: s.discogs_id ?? null,
        title: s.title ?? null,
        artist: s.artist ?? null,
        started_at: s.spin_started_at ? new Date(s.spin_started_at).toISOString() : null,
        confidence: null,
        label_snapshot_url: null,
        cover_image_url: s.cover_image_url ?? null,
        thumb_url: s.thumb_url ?? null,
        catalog_number: null,
        label_name: null,
        candidates: null,
        ocr_keywords: null,
        match_source: s.discogs_id ? 'collection' : null,
        release_year: s.release_year ?? null,
        genre: s.genre ?? null,
    };
}

// ── In-memory last-scan store ─────────────────────────────────────────────────
let lastScanData: {
    scanned_at: string;
    source: string | null;
    confidence: number;
    ocr_lines: string[];
    tokens: string[];
    extracted: { catalog: string | null };
    match: { discogs_id: number | null; artist: string | null; title: string | null; confidence: number } | null;
} | null = null;

// ── Tokenizer ─────────────────────────────────────────────────────────────────

const NOISE_WORDS = new Set([
    // articles / prepositions
    'the', 'and', 'but', 'for', 'with', 'into', 'also', 'from', 'that',
    // label boilerplate
    'side', 'inc', 'ltd', 'corp', 'llc', 'records', 'recordings', 'music',
    'manufactured', 'distributed', 'published', 'all', 'rights', 'reserved',
    // track annotation noise
    'feat', 'featuring', 'vocal', 'vocals', 'stereo', 'mono',
    'prod', 'produced', 'arr', 'arranged',
    // ordinals that appear on labels
    'one', 'two', 'three', 'four', 'five', 'six',
]);

function tokenize(lines: string[]): string[] {
    const seen = new Set<string>();
    const words: string[] = [];
    for (const line of lines) {
        if (!line) continue;
        const cleaned = line
            .replace(/\b\d{1,2}:\d{2}\b/g, ' ')          // strip timings: 5:08
            .replace(/\([^)]*\)/g, ' ')                    // strip parentheticals: (Instrumental)
            .replace(/\b(19|20)\d{2}\b/g, ' ')             // strip years: 1990
            .replace(/[+*†#@©®™\[\]{}|\\/<>°]+/g, ' ')    // strip special chars
            .replace(/[^\w\s'-]+/g, ' ')                   // strip remaining punctuation
            .replace(/\s+/g, ' ').trim();
        for (const raw of cleaned.split(/\s+/)) {
            const w = raw.replace(/^['\-]+|['\-]+$/g, '').toLowerCase();
            if (w.length < 3) continue;
            if (/^\d+$/.test(w)) continue;
            if (NOISE_WORDS.has(w)) continue;
            if (!seen.has(w)) { seen.add(w); words.push(w); }
        }
    }
    return words;
}

// Fraction of stored field's words matched by the OCR token set.
// Full match = 1.0; partial match = 0.7.
// Partial: OCR token ≥4 chars that is a leading OR trailing fragment of the stored word,
// handling both left-truncated ("PERVIEW" → "HYPERVIEW") and
// right-truncated ("BLOO" → "BLOOD", "EYES" from "WEYES") OCR reads.
function coverage(ocrSet: Set<string>, ocrWords: string[], storedText: string): number {
    const storedWords = tokenize([storedText]);
    if (storedWords.length === 0) return 0;
    let hits = 0;
    for (const sw of storedWords) {
        if (ocrSet.has(sw)) {
            hits += 1;
        } else if (ocrWords.some(ow => ow.length >= 4 && (sw.endsWith(ow) || sw.startsWith(ow)))) {
            hits += 0.7;
        }
    }
    return hits / storedWords.length;
}

// ── Camera stream proxy ───────────────────────────────────────────────────────

export const streamCam = (req: Request, res: Response): void => {
    const streamUrl = process.env.PICAM_STREAM_URL;
    if (!streamUrl) { res.status(503).json({ error: 'PICAM_STREAM_URL not configured' }); return; }
    let parsed: URL;
    try { parsed = new URL(streamUrl); } catch { res.status(500).json({ error: 'Invalid PICAM_STREAM_URL' }); return; }
    const transport = parsed.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(streamUrl, (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 200, {
            'Content-Type': proxyRes.headers['content-type'] ?? 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
        });
        proxyRes.pipe(res);
    });
    proxyReq.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'Camera offline' }); });
    proxyReq.setTimeout(10000, () => proxyReq.destroy());
    req.on('close', () => proxyReq.destroy());
    proxyReq.end();
};

// Express 4 doesn't catch async errors — wrap every handler
const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response) =>
        fn(req, res).catch(err => {
            console.error('[grailmeter] handler error:', err?.message || err);
            if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
        });

// ── Identify ──────────────────────────────────────────────────────────────────

const _identify = async (req: Request, res: Response): Promise<void> => {
    const body: IdentifyBody = req.body || {};
    const userId: number = body.user_id ?? 1;

    const rows = await execute<RecordRow[]>(
        `SELECT r.record_id, r.discogs_id, r.artist, r.title,
                GROUP_CONCAT(rt.title ORDER BY rt.id SEPARATOR '|||') AS tracks
         FROM records r
         JOIN user_records ur ON r.record_id = ur.record_id
         LEFT JOIN record_tracks rt ON r.record_id = rt.record_id
         WHERE ur.user_id = ? AND ur.wishlist = 0
         GROUP BY r.record_id, r.discogs_id, r.artist, r.title`,
        [userId]
    );

    if (!rows || rows.length === 0) {
        res.status(200).json({ discogs_id: null, artist: null, title: null, confidence: 0, auto_play: false });
        return;
    }

    // Tokenize all OCR text the Pi sent, plus any optional hints.
    const allLines = [
        ...(body.raw_tokens   || []),
        ...(body.ocr_keywords || []),
        body.artist || '',
        body.title  || '',
    ];
    const ocrWords = tokenize(allLines);
    const ocrSet   = new Set(ocrWords);

    let best: RecordRow | null = null;
    let bestScore = 0;

    for (const row of rows) {
        // ── Artist / album-title coverage ─────────────────────────────────────
        const artistCov = coverage(ocrSet, ocrWords, row.artist);
        const titleCov  = coverage(ocrSet, ocrWords, row.title);

        // ── Track-title matching (primary signal) ─────────────────────────────
        const trackTitles = row.tracks ? row.tracks.split('|||') : [];
        let matchedTracks = 0;
        let bestTrackCov = 0;
        for (const track of trackTitles) {
            const trackWords = tokenize([track]);
            if (trackWords.length === 0) continue;
            let hits = 0;
            for (const tw of trackWords) {
                if (ocrSet.has(tw)) {
                    hits += 1;
                } else if (ocrWords.some(ow => ow.length >= 4 && (tw.endsWith(ow) || tw.startsWith(ow)))) {
                    hits += 0.7;
                }
            }
            const cov = hits / trackWords.length;
            if (cov > bestTrackCov) bestTrackCov = cov;
            // A track matches when ≥60% of its words appear in the OCR tokens
            if (cov >= 0.6) matchedTracks++;
        }
        // Breadth: what fraction of all tracks were confirmed
        const trackBreadth = trackTitles.length > 0 ? matchedTracks / trackTitles.length : 0;

        // ── Combined score ────────────────────────────────────────────────────
        // Best track quality:    0–40 pts  (one strong match on a long album still counts)
        // Track breadth:         0–20 pts  (multiple matches add confidence)
        // Artist:                0–30 pts  (weighted higher — artist name on label is key signal)
        // Album title:           0–20 pts
        // Strong artist (≥60%):  +10 bonus (a clear partial read of a unique artist name)
        // Both artist + title:   +10 bonus
        // ≥2 tracks confirmed:   +10 bonus
        let score = bestTrackCov * 40 + trackBreadth * 20 + artistCov * 30 + titleCov * 20;
        if (artistCov >= 0.6)              score += 10;
        if (artistCov > 0 && titleCov > 0) score += 10;
        if (matchedTracks >= 2)            score += 10;

        if (score > bestScore) { bestScore = score; best = row; }
    }

    const MATCH_THRESHOLD = 25;
    const matchResult = (!best || bestScore < MATCH_THRESHOLD) ? null : {
        discogs_id: best.discogs_id,
        artist: best.artist,
        title: best.title,
        confidence: Math.min(Math.round(bestScore), 98),
        score_raw: Math.round(bestScore),
    };

    lastScanData = {
        scanned_at: new Date().toISOString(),
        source: body.source ?? null,
        confidence: body.confidence ?? 0,
        ocr_lines: body.raw_tokens ?? [],
        tokens: ocrWords,
        extracted: {
            catalog: body.catalog_number ?? null,
        },
        match: matchResult,
    };

    if (!matchResult) {
        res.status(200).json({ discogs_id: null, artist: null, title: null, confidence: 0, auto_play: false });
        return;
    }

    // Write the identification back to the active play session so now-playing shows the record.
    await execute(
        `UPDATE play_sessions
         SET discogs_id = ?, artist = ?, title = ?
         WHERE user_id = ? AND status IN ('present', 'spinning')
         ORDER BY created_at DESC LIMIT 1`,
        [matchResult.discogs_id, matchResult.artist, matchResult.title, userId]
    );

    // Push SSE so the top-bar widget updates immediately.
    const ssePayload = await buildNowPlayingPayload(userId);
    pushSse('identification_confirmed', ssePayload);

    res.status(200).json({ ...matchResult, auto_play: false });
};

// ── Last-scan ─────────────────────────────────────────────────────────────────

const _lastScan = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(lastScanData ?? { scanned_at: null });
};

// ── Vinyl-detected (record placed, not yet spinning) ──────────────────────────

const _vinylDetected = async (req: Request, res: Response): Promise<void> => {
    const body: SpinEventBody = req.body || {};
    const userId = body.user_id ?? 1;

    // Close any leftover open sessions
    await execute(
        `UPDATE play_sessions SET status = 'removed', spin_stopped_at = NOW()
         WHERE user_id = ? AND status IN ('present', 'spinning')`,
        [userId]
    );

    await execute(
        `INSERT INTO play_sessions (user_id, discogs_id, artist, title, spin_started_at, status)
         VALUES (?, ?, ?, ?, NULL, 'present')`,
        [userId, body.discogs_id ?? null, body.artist ?? null, body.title ?? null]
    );

    const payload = await buildNowPlayingPayload(userId);
    pushSse('needs_identification', payload);

    res.status(200).json({ ok: true });
};

// ── Platter-start ─────────────────────────────────────────────────────────────

const _platterStart = async (req: Request, res: Response): Promise<void> => {
    const body: SpinEventBody = req.body || {};
    const userId = body.user_id ?? 1;
    const now = body.timestamp ? new Date(body.timestamp) : new Date();

    // Try to promote an existing 'present' session to 'spinning'
    const result = await execute<any>(
        `UPDATE play_sessions SET status = 'spinning', spin_started_at = ?
         WHERE user_id = ? AND status = 'present'
         ORDER BY created_at DESC LIMIT 1`,
        [now, userId]
    );

    // No existing present session — insert fresh spinning session
    if (result.affectedRows === 0) {
        await execute(
            `INSERT INTO play_sessions (user_id, discogs_id, artist, title, spin_started_at, status)
             VALUES (?, ?, ?, ?, ?, 'spinning')`,
            [userId, body.discogs_id ?? null, body.artist ?? null, body.title ?? null, now]
        );
    }

    const playPayload = await buildNowPlayingPayload(userId);
    pushSse('play_start', playPayload);

    res.status(200).json({ ok: true });
};

// ── Platter-stop (record still on platter, just stopped spinning) ─────────────

const _platterStop = async (req: Request, res: Response): Promise<void> => {
    const body: SpinEventBody = req.body || {};
    const userId = body.user_id ?? 1;
    const durationSec = body.duration_sec ?? 0;

    // Revert to 'present' — record is still there, just not spinning
    await execute(
        `UPDATE play_sessions
         SET status = 'present', spin_stopped_at = NOW(), duration_sec = ?
         WHERE user_id = ? AND status = 'spinning'
         ORDER BY spin_started_at DESC LIMIT 1`,
        [durationSec, userId]
    );

    // Record still on platter — push pending_identification so UI shows "stopped" not idle
    const stopPayload = await buildNowPlayingPayload(userId);
    pushSse('needs_identification', stopPayload);

    res.status(200).json({ ok: true });
};

// ── Vinyl-removed ─────────────────────────────────────────────────────────────

const _vinylRemoved = async (req: Request, res: Response): Promise<void> => {
    const body: SpinEventBody = req.body || {};
    const userId = body.user_id ?? 1;

    await execute(
        `UPDATE play_sessions SET status = 'removed', spin_stopped_at = NOW()
         WHERE user_id = ? AND status IN ('present', 'spinning')`,
        [userId]
    );

    pushSse('play_stop', { status: 'idle' });

    res.status(200).json({ ok: true });
};

// ── Now-playing ───────────────────────────────────────────────────────────────

const _nowPlaying = async (req: Request, res: Response): Promise<void> => {
    const userId = parseInt((req.query.user_id as string) || '1', 10);

    const rows = await execute<any[]>(
        `SELECT id, discogs_id, artist, title, spin_started_at, status, created_at
         FROM play_sessions
         WHERE user_id = ? AND status IN ('present', 'spinning')
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );

    const session = rows?.[0] ?? null;

    if (!session) {
        res.status(200).json({ record_present: false, spinning: false, spin_started_at: null, elapsed_sec: 0 });
        return;
    }

    // Auto-expire stale sessions left by a crashed detector process.
    const STALE_SPINNING_MS = 30 * 60 * 1000;
    const STALE_PRESENT_MS  = 60 * 60 * 1000;
    const refTime = session.status === 'spinning' && session.spin_started_at
        ? new Date(session.spin_started_at).getTime()
        : new Date(session.created_at).getTime();
    const staleThreshold = session.status === 'spinning' ? STALE_SPINNING_MS : STALE_PRESENT_MS;
    if (Date.now() - refTime > staleThreshold) {
        await execute(
            `UPDATE play_sessions SET status = 'removed', spin_stopped_at = NOW() WHERE id = ?`,
            [session.id]
        );
        res.status(200).json({ record_present: false, spinning: false, spin_started_at: null, elapsed_sec: 0 });
        return;
    }

    const spinning = session.status === 'spinning';
    const elapsed = spinning && session.spin_started_at
        ? Math.floor((Date.now() - new Date(session.spin_started_at).getTime()) / 1000)
        : 0;

    res.status(200).json({
        record_present: true,
        spinning,
        spin_started_at: spinning && session.spin_started_at
            ? new Date(session.spin_started_at).toISOString()
            : null,
        elapsed_sec: elapsed,
        discogs_id: session.discogs_id,
        artist: session.artist,
        title: session.title,
    });
};

// ── SSE event stream ──────────────────────────────────────────────────────────

// Not wrapped in asyncHandler — this handler keeps the response open intentionally.
export const grailmeterEvents = (req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const id = String(++sseIdSeq);
    sseClients.set(id, res);
    res.write(': connected\n\n');

    const beat = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { /* ignore */ }
    }, 25000);
    req.on('close', () => { clearInterval(beat); sseClients.delete(id); });
};

// ── /api/nowplaying/:userId — MeterContext-compatible endpoint ────────────────

const _nowPlayingCompat = async (req: Request, res: Response): Promise<void> => {
    const userId = parseInt(req.params.userId || '1', 10);
    const payload = await buildNowPlayingPayload(userId);
    res.status(200).json(payload);
};

// ── /api/playback/history/:userId ─────────────────────────────────────────────

const _playbackHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = parseInt(req.params.userId || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);

    const rows = await execute<any[]>(
        `SELECT ps.id AS session_id, ps.discogs_id, ps.artist, ps.title,
                ps.spin_started_at AS started_at, ps.duration_sec, ps.created_at,
                r.thumb_url, r.cover_image_url, r.release_year, r.genre
         FROM play_sessions ps
         LEFT JOIN records r ON ps.discogs_id = r.discogs_id
         WHERE ps.user_id = ?
           AND ps.discogs_id IS NOT NULL
           AND ps.spin_started_at IS NOT NULL
         ORDER BY ps.spin_started_at DESC
         LIMIT ?`,
        [userId, limit]
    );

    const history = (rows ?? []).map(r => ({
        session_id: r.session_id,
        discogs_id: r.discogs_id,
        title: r.title ?? 'Unknown',
        artist: r.artist ?? 'Unknown',
        started_at: r.started_at ? new Date(r.started_at).toISOString() : null,
        duration_sec: r.duration_sec ?? 0,
        thumb_url: r.thumb_url ?? null,
        cover_image_url: r.cover_image_url ?? null,
        confidence: null,
        match_source: 'collection',
        label_name: null,
        release_year: r.release_year ?? null,
        genre: r.genre ?? null,
    }));

    res.status(200).json(history);
};

// ── Collection sync ───────────────────────────────────────────────────────────

interface SyncJob {
    running: boolean;
    total: number;
    synced: number;
    skipped: number;
    errors: number;
    started_at: string;
    finished_at?: string;
}
let syncJob: SyncJob | null = null;

async function _runSync(userId: number): Promise<void> {
    syncJob = { running: true, total: 0, synced: 0, skipped: 0, errors: 0, started_at: new Date().toISOString() };

    try {
        const users = await execute<{ username: string; discogs_token: string; discogs_token_secret: string }[]>(
            'SELECT username, discogs_token, discogs_token_secret FROM users WHERE user_id = ? LIMIT 1',
            [userId]
        );
        const user = users?.[0];
        if (!user?.discogs_token) {
            console.warn('[grailmeter] sync-collection: user has no Discogs token');
            return;
        }

        // Folder 0 = "All Items" in Discogs API — fetches every release regardless of sub-folder
        const allItems: { basic_information: { id: number } }[] = [];
        let page = 1;
        while (true) {
            const data = await DiscogsConnector.fetchUserCollectionOAuth(
                user.username, 0, user.discogs_token, user.discogs_token_secret, page, 100
            );
            const releases: { basic_information: { id: number } }[] = data?.releases ?? [];
            allItems.push(...releases);
            if (page >= (data?.pagination?.pages ?? 1)) break;
            page++;
        }

        syncJob.total = allItems.length;
        console.log(`[grailmeter] sync-collection: ${allItems.length} releases to process`);

        for (const item of allItems) {
            const releaseId = item.basic_information?.id;
            if (!releaseId) { syncJob.errors++; continue; }

            try {
                const existing = await execute<{ c: number }[]>(
                    `SELECT COUNT(rt.id) AS c
                     FROM record_tracks rt
                     JOIN records r ON rt.record_id = r.record_id
                     WHERE r.discogs_id = ?`,
                    [releaseId]
                );
                if ((existing?.[0]?.c ?? 0) > 0) { syncJob.skipped++; continue; }

                const releaseData = await DiscogsConnector.getRelease(releaseId);
                await ensureRecordData(releaseId, releaseData);

                // Ensure user_records row exists (collection, not wishlist)
                await execute(
                    `INSERT IGNORE INTO user_records (user_id, record_id, wishlist)
                     SELECT ?, record_id, 0 FROM records WHERE discogs_id = ?`,
                    [userId, releaseId]
                );

                syncJob.synced++;
            } catch (e: any) {
                console.warn('[grailmeter] sync-collection item error:', releaseId, e?.message);
                syncJob.errors++;
            }

            // ~54 req/min — safely under the 60 req/min Discogs authenticated limit
            await new Promise(r => setTimeout(r, 1100));
        }

        console.log(`[grailmeter] sync-collection done: synced=${syncJob.synced} skipped=${syncJob.skipped} errors=${syncJob.errors}`);
    } finally {
        syncJob = { ...syncJob!, running: false, finished_at: new Date().toISOString() };
    }
}

const _startSyncCollection = async (req: Request, res: Response): Promise<void> => {
    if (syncJob?.running) {
        res.status(409).json({ error: 'Sync already running', job: syncJob });
        return;
    }
    const userId = parseInt((req.body?.user_id as string) || '1', 10);
    _runSync(userId).catch(err =>
        console.error('[grailmeter] sync-collection background error:', err?.message || err)
    );
    res.status(202).json({ ok: true, message: 'Sync started' });
};

const _syncCollectionStatus = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(syncJob ?? { running: false, total: 0, synced: 0, skipped: 0, errors: 0 });
};

// ── Wrapped exports (Express 4 async error safety) ────────────────────────────

export const identify             = asyncHandler(_identify);
export const vinylDetected        = asyncHandler(_vinylDetected);
export const platterStart         = asyncHandler(_platterStart);
export const platterStop          = asyncHandler(_platterStop);
export const vinylRemoved         = asyncHandler(_vinylRemoved);
export const nowPlaying           = asyncHandler(_nowPlaying);
export const lastScan             = asyncHandler(_lastScan);
export const startSyncCollection  = asyncHandler(_startSyncCollection);
export const syncCollectionStatus = asyncHandler(_syncCollectionStatus);
export const nowPlayingCompat     = asyncHandler(_nowPlayingCompat);
export const playbackHistory      = asyncHandler(_playbackHistory);
// grailmeterEvents is already exported above (not asyncHandler — keeps response open)
