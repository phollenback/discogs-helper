import { OkPacket } from 'mysql';
import { execute } from '../services/mysql.connector';
import { Artist } from './artists.model';
import { artistQueries } from './artists.queries';

export const readArtists = async () => {
    return execute<Artist[]>(artistQueries.readArtists, []);
};

export const readArtistById = async (artistId: number) => {
    return execute<Artist[]>(artistQueries.readArtistById, [artistId]);
};

export const createArtist = async (artist: Artist) => {
    return execute<OkPacket>(artistQueries.createArtist, [
        artist.name,
        artist.real_name ?? null,
        artist.profile ?? null,
        artist.discogs_id ?? null,
        artist.resource_url ?? null
    ]);
};

export const updateArtist = async (artistId: number, artist: Artist) => {
    return execute<OkPacket>(artistQueries.updateArtist, [
        artist.name,
        artist.real_name ?? null,
        artist.profile ?? null,
        artist.discogs_id ?? null,
        artist.resource_url ?? null,
        artistId
    ]);
};

export const deleteArtist = async (artistId: number) => {
    return execute<OkPacket>(artistQueries.deleteArtist, [artistId]);
};

