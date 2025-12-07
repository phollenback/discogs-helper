import { execute } from '../services/mysql.connector';
import { suggestionsQueries } from './suggestions.queries';
import { OkPacket } from 'mysql';

export const readUserTopReleases = async (username: string) => {
    console.log(`[suggestions.dao][readUserTopReleases] Fetching top releases for username: ${username}`);
    const result = await execute<any>(suggestionsQueries.readUserTopReleases, [username]);
    console.log(`[suggestions.dao][readUserTopReleases] Successfully fetched top releases for: ${username}`);
    return result;
}

export const updateUserTopReleases = async (username: string, topReleases: any) => {
    console.log(`[suggestions.dao][updateUserTopReleases] Updating top releases for username: ${username}`);
    const jsonString = JSON.stringify(topReleases);
    const result = await execute<OkPacket>(suggestionsQueries.updateUserTopReleases, [jsonString, username]);
    console.log(`[suggestions.dao][updateUserTopReleases] Successfully updated top releases for: ${username}`);
    return result;
}