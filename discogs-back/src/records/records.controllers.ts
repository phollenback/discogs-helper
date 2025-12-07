import { Request, RequestHandler, Response } from 'express'
import * as RecordDao from './records.dao'
import { OkPacket } from 'mysql';

// Helper function to check if user can access the requested resource
const checkUserAccess = (req: Request): boolean => {
    const requestedUserId = parseInt(req.params.userId as string);
    const authenticatedUserId = req.user?.userId;
    
    // Admins can access any user's data
    if (req.user?.isAdmin) {
        return true;
    }
    
    if (!authenticatedUserId || requestedUserId !== authenticatedUserId) {
        return false;
    }
    
    return true;
};

export const readRecords : RequestHandler = async (req: Request , res: Response) => {
    try {
        let records;

        records = await RecordDao.readRecords();
        
        res.status(200).json(
            records
        );
    } catch (error) {
        console.error('[records.controller][readRecords][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching records'
        })
    }
}

export const createRecord: RequestHandler = async (req: Request, res: Response) => {
    try {
        const recordItem = {
            discogsId: parseInt(req.body.discogsId),
            title: req.body.title || '',
            artist: req.body.artist || '',
            releaseYear: req.body.releaseYear ? (parseInt(req.body.releaseYear) || 0).toString() : '0',
            genre: req.body.genre || '',
            styles: req.body.styles || '',
            thumbUrl: req.body.thumbUrl || req.body.thumb || '',
            coverImageUrl: req.body.coverImageUrl || req.body.cover_image || ''
        };
        
        const okPacket : OkPacket = await RecordDao.upsertRecord(recordItem);

        console.log('req.body', req.body);
        console.log('constructed record', recordItem);
        console.log('record', okPacket);

        res.status(200).json(okPacket);
    } catch (error) {
        console.error('[records.controller][createRecord][Error] ', error);
        res.status(500).json({
            message: 'There was an error when writing records'
        });
    }
}

export const readRecordsByUser : RequestHandler = async (req: Request , res: Response) => {
        try 
        {
            // Check authorization
            if (!checkUserAccess(req)) {
                return res.status(403).json({
                    message: 'Access forbidden: You can only access your own data'
                });
            }

            let records;
            let userId = parseInt(req.params.userId as string)
    
            console.log('userid: ' + userId);

            records = await RecordDao.readRecordsById(userId);
    
            res.status(200).json(
                records
            );
        } catch (error) {
            console.error('[records.controller][readRecords][Error] ', error);
            res.status(500).json({
                message: 'There was an error when fetching records by id'
            })
        }
}

export const updateRecord : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Update the records first
        const okPacket : OkPacket = await RecordDao.updateRecord(req.body);
        
        console.log('req.body', req.body);
        console.log('records', okPacket);

        res.status(200).json(okPacket);
    } catch (error) {
        console.error('[records.controller][updateRecor][Error] ', error);
        res.status(500).json({
            message: 'There was an error when updating records or tracks',
        });
    }
}

export const deleteRecord : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            return res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
        }

        let userId = parseInt(req.params.userId as string)
        let discogsId = parseInt(req.params.discogsId as string)

        console.log('user id: ' + userId)
        console.log('discogs id: ', discogsId);
        
        const response = await RecordDao.deleteRecord(userId, discogsId);

        res.status(200).json(
            response
        );
    } catch (error) {
        console.error('[records.controller[deleteRecord][Error] ', error);
        res.status(500).json({
            message: 'There was an error when deleting records'
        })
    }
}
