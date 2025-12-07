import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import * as ReleasesController from './releases.controller';

const router = Router();

router.get('/api/releases/:releaseId/overview', optionalAuth, ReleasesController.getReleaseOverview);
router.get('/api/releases/:releaseId', optionalAuth, ReleasesController.getReleaseDetail);
router.get('/api/releases/:releaseId/stats', optionalAuth, ReleasesController.getReleaseStatsProxy);
router.get('/api/releases/:releaseId/rating/community', optionalAuth, ReleasesController.getCommunityRating);

router.get('/api/releases/:releaseId/rating', authenticateToken, ReleasesController.getMyReleaseRating);
router.put('/api/releases/:releaseId/rating', authenticateToken, ReleasesController.updateMyReleaseRating);
router.delete('/api/releases/:releaseId/rating', authenticateToken, ReleasesController.deleteMyReleaseRating);

router.post('/api/releases/:releaseId/collection', authenticateToken, ReleasesController.upsertCollection);
router.put('/api/releases/:releaseId/collection', authenticateToken, ReleasesController.upsertCollection);
router.delete('/api/releases/:releaseId/collection', authenticateToken, ReleasesController.deleteCollection);

export default router;

