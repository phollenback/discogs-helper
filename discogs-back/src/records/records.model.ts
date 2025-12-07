export interface Record {
    recordId?: number,
    discogsId?: number | null,
    source?: 'discogs' | 'manual',
    title: string,
    artist: string,
    genre: string,
    styles: string,
    releaseYear: string,
    thumbUrl?: string,
    coverImageUrl?: string
}