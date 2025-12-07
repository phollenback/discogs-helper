export interface ReleaseCollectionEntry {
    userId: number;
    discogsId: number;
    notes: string;
    priceThreshold: string;
    rating: number | null;
    wishlist: boolean;
    inCollection: boolean;
}

export interface ReleaseOverviewResponse {
    release: any;
    stats: any;
    communityRating: any;
    master: any;
    masterVersions: any;
    collectionEntry: ReleaseCollectionEntry | null;
    userRating: number | null;
}

export interface ReleaseRatingResponse {
    rating: number | null;
    source: 'discogs' | 'local';
}

export interface UpsertCollectionRequest {
    wishlist?: boolean;
    notes?: string;
    priceThreshold?: string;
    rating?: number | null;
}

