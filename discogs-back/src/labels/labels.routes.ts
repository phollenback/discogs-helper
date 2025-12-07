import { Router } from 'express';
import * as LabelsController from './labels.controller';

const labelsRouter = Router();

// More specific routes first
labelsRouter
    .route('/api/labels/:labelId/overview')
    .get(LabelsController.getLabelOverview);

labelsRouter
    .route('/api/labels/:labelId/releases')
    .get(LabelsController.readLabelReleases);

// General route last
labelsRouter
    .route('/api/labels/:labelId')
    .get(LabelsController.readLabelById);

export default labelsRouter;
