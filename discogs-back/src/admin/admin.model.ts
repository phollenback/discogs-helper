export interface AdminUser {
    user_id?: number;
    username: string;
    email: string;
    password?: string;
    is_admin?: boolean;
    discogs_token?: string;
    discogs_token_secret?: string;
    created_at?: string;
    updated_at?: string;
}

