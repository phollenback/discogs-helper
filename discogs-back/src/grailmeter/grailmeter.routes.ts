import { Router } from 'express';
import {
    identify, streamCam, vinylDetected, platterStart, platterStop, vinylRemoved,
    nowPlaying, lastScan, startSyncCollection, syncCollectionStatus,
    grailmeterEvents, nowPlayingCompat, playbackHistory,
} from './grailmeter.controller';

const router = Router();

// Grailmeter-specific routes
router.get('/api/grailmeter/stream', streamCam);
router.get('/api/grailmeter/now-playing', nowPlaying);
router.get('/api/grailmeter/last-scan', lastScan);
router.get('/api/grailmeter/events', grailmeterEvents);
router.get('/api/grailmeter/sync-collection/status', syncCollectionStatus);
router.post('/api/grailmeter/identify', identify);
router.post('/api/grailmeter/vinyl-detected', vinylDetected);
router.post('/api/grailmeter/platter-start', platterStart);
router.post('/api/grailmeter/platter-stop', platterStop);
router.post('/api/grailmeter/play-stop', platterStop);
router.post('/api/grailmeter/vinyl-removed', vinylRemoved);
router.post('/api/grailmeter/sync-collection', startSyncCollection);

// MeterContext-compatible routes (used by VinylWidget topbar + NowPlayingScreen)
router.get('/api/nowplaying/:userId', nowPlayingCompat);
router.get('/api/playback/history/:userId', playbackHistory);

export default router;
