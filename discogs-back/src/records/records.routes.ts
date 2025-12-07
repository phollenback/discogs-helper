import { Request, Response, Router } from 'express'
import * as RecordsController from './records.controllers'
import { authenticateToken } from '../middleware/auth'

const router = Router();
router // 
    .route('/api/records')
    .get(authenticateToken, RecordsController.readRecords)
   
router // 
    .route('/api/records')
    .post(authenticateToken, RecordsController.createRecord)

router // 
    .route('/api/records/:userId')    
    .get(authenticateToken, RecordsController.readRecordsByUser)

router
    .route('/api/records/:discogsId')
    .put(authenticateToken, RecordsController.updateRecord)

router //
    .route('/api/records/:userId/:discogsId')
    .delete(authenticateToken, RecordsController.deleteRecord)

export default router;