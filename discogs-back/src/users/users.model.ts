export interface User {
    user_id?: number;
    username : string;
    email : string;
    password : string;
    is_admin?: boolean;
    discogs_token?: string;
    discogs_token_secret?: string;
    user_image?: string;
    public_resources?: boolean;
}