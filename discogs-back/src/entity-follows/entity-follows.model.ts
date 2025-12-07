export type EntityType = 'artist' | 'label';

export interface EntityFollow {
    user_id: number;
    entity_type: EntityType;
    entity_discogs_id: number;
    entity_name?: string | null;
    notification_enabled: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface EntityFollowStatus {
    is_following: boolean;
    follower_count?: number;
}

