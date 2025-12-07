import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import * as MasterController from './master.controller';

const router = Router();

router.get('/api/masters/:masterId', optionalAuth, MasterController.getMasterRelease);
router.get('/api/masters/:masterId/versions', optionalAuth, MasterController.getMasterReleaseVersions);

export default router;

