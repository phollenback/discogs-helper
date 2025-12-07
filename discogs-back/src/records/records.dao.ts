import { OkPacket } from "mysql";
import { execute } from '../services/mysql.connector';
import { Record } from './records.model'
import { recordQueries } from './records.queries'

export const readRecords = async ()  => {
    console.log('in readAlbums')
    return execute<Record[]>(recordQueries.readRecords, []);
};

export const readRecordsById = async (userId : number) => {
    console.log('in read by id. ID: ' + userId);
    return execute<Record[]>(recordQueries.readRecordsByUser, [userId]);
}

export const readRecordByDiscogsId = async (discogsId : number) => {
    console.log(`[records.dao][readRecordByDiscogsId] Looking up record with discogs_id: ${discogsId}`);
    const records = await execute<Record[]>(recordQueries.readRecordByDiscogsId, [discogsId]);
    return records.length > 0 ? records[0] : null;
}

export const deleteRecord = async (userId : number, recordId : number) => {
    console.log('in delete record. record ID: ' + recordId)
    return execute<Record[]>(recordQueries.deleteRecord, [userId, recordId])
}

export const createRecord = async (record : Record) => {
    console.log('in create record.');
    return execute<OkPacket>(recordQueries.createRecord, 
            [record.discogsId || null, record.title, record.artist, record.releaseYear, record.genre, record.styles, record.thumbUrl, record.coverImageUrl])
}

export const upsertRecord = async (record : Record) => {
    console.log('in upsert record.');
    return execute<OkPacket>(recordQueries.upsertRecord, 
            [record.discogsId || null, record.title, record.artist, record.releaseYear, record.genre, record.styles, record.thumbUrl, record.coverImageUrl])
}

export const createManualRecord = async (record : Record) => {
    console.log('in create manual record.');
    return execute<OkPacket>(recordQueries.createManualRecord, 
            [record.title, record.artist, record.releaseYear, record.genre, record.styles, record.thumbUrl, record.coverImageUrl])
}

export const updateRecord = async (record : Record) => {
    console.log('in update record.');
    if (!record.recordId) {
        throw new Error('recordId is required for update');
    }
    return execute<OkPacket>(recordQueries.updateRecord, 
            [record.title, record.artist, record.releaseYear, record.genre, record.styles, record.recordId])
}