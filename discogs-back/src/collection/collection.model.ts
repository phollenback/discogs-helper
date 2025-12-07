export interface CollectionItem {
    userId : number,
    recordId: number;
    discogsId?: number | null;
    source?: 'discogs' | 'manual';
    title: string;
    artist: string;
    genres: string;
    released: string;
    styles: string;
    notes: string;
    rating: string | null;
    ranking: number | null;
    priceThreshold: string;
    wishlist : string;
}