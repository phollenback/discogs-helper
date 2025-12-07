-- Discogs Helper Database Schema
-- This file creates the necessary tables for the Discogs Helper application

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS Discogs;
USE Discogs;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    top_releases json DEFAULT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    discogs_token VARCHAR(255) DEFAULT NULL,
    discogs_token_secret VARCHAR(255) DEFAULT NULL,
    user_image VARCHAR(500) DEFAULT NULL,
    public_resources BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Artists table
CREATE TABLE IF NOT EXISTS artists (
    artist_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    real_name VARCHAR(255),
    profile TEXT,
    discogs_id INT UNIQUE,
    resource_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Records table (stores discogs release information and manual entries)
CREATE TABLE IF NOT EXISTS records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    discogs_id INT UNIQUE DEFAULT NULL,
    source ENUM('discogs', 'manual') DEFAULT 'discogs',
    title VARCHAR(500) NOT NULL,
    artist VARCHAR(500) NOT NULL,
    release_year VARCHAR(10),
    genre TEXT,
    styles TEXT,
    thumb_url TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_discogs_id (discogs_id),
    INDEX idx_source (source)
);

-- User records table (junction table for user collections/wantlists)
CREATE TABLE IF NOT EXISTS user_records (
    user_id INT NOT NULL,
    record_id INT NOT NULL,
    notes TEXT,
    price_threshold DECIMAL(10,2),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    ranking INT,
    wishlist BOOLEAN DEFAULT FALSE,
    discogs_synced_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, record_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (record_id) REFERENCES records(record_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_public_resources ON users(public_resources);
CREATE INDEX idx_records_artist ON records(artist);
CREATE INDEX idx_records_title ON records(title);
CREATE INDEX idx_user_records_user_id ON user_records(user_id);
CREATE INDEX idx_user_records_record_id ON user_records(record_id);
CREATE INDEX idx_user_records_wishlist ON user_records(wishlist);

-- User follows table (asymmetric following like Twitter/Instagram)
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id INT NOT NULL,      -- User who is following
    following_id INT NOT NULL,     -- User being followed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CHECK (follower_id != following_id)  -- Can't follow yourself
);

-- Indexes for performance
CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_id);

-- Follows table for Artists and Labels
CREATE TABLE IF NOT EXISTS user_follows_entities (
    user_id INT NOT NULL,
    entity_type ENUM('artist', 'label') NOT NULL,
    entity_discogs_id INT NOT NULL,
    entity_name VARCHAR(500),  -- Cache name for quick display
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, entity_type, entity_discogs_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_follows_entities_user (user_id),
    INDEX idx_user_follows_entities_entity (entity_type, entity_discogs_id),
    INDEX idx_user_follows_entities_notifications (user_id, notification_enabled)
);

-- ===============================================
-- MOCK DATA
-- ===============================================

-- Insert Users (all production users)
INSERT INTO users (username, email, password, is_admin, discogs_token, discogs_token_secret) VALUES 
    ('pskills', 'pskills@test.com', 'password123', TRUE, 'WflyhtMzjucjjoBRqPyaREsFdthxFmqxpPSGCjaY', 'HCGKUagbgbpqYGicpHiXACNDBZpAMAehPYYkyhqK'),
    ('WillMerritt3', 'will@gmail.com', 'WillMerritt3', FALSE, NULL, NULL),
    ('apskills', 'APKershaw@icloud.com', 'peytonrules123', FALSE, 'dorJsQhtlLBZcoyNwPfxgqYnunDraqpXmkMlKQWN', 'zDGoTzCFbWurVXdlYCrOAKzCiHcArKCkSPrjPGOH'),
    ('phollenbachi', 'peytonholle@icloud.com', 'Supersonics#22', FALSE, 'YMawDldnbhThGJgWMLcZvjmpgCSarsWYroQdBgxy', 'HWiIzRxwzmNwwwXWROYeqtXtGxrzZIgAdolpLVHY');

-- Insert Sample Records (Popular Albums)
INSERT INTO records (discogs_id, source, title, artist, release_year, genre, styles, thumb_url, cover_image_url) VALUES
    (1234567, 'discogs', 'Hyperview', 'Title Fight', '2015', 'Rock', 'Shoegaze, Alternative Rock', 'https://i.discogs.com/thumb.jpg', 'https://i.discogs.com/cover.jpg'),
    (2345678, 'discogs', 'Floral Green', 'Title Fight', '2012', 'Rock', 'Post-Hardcore, Emo', 'https://i.discogs.com/thumb2.jpg', 'https://i.discogs.com/cover2.jpg'),
    (3456789, 'discogs', 'The Shed', 'Title Fight', '2011', 'Rock', 'Hardcore Punk, Melodic Hardcore', 'https://i.discogs.com/thumb3.jpg', 'https://i.discogs.com/cover3.jpg'),
    (4567890, 'discogs', 'Burning Desire', 'Various Artists', '2013', 'Electronic', 'House, Disco', 'https://i.discogs.com/thumb4.jpg', 'https://i.discogs.com/cover4.jpg'),
    (5678901, 'discogs', 'Dookie', 'Green Day', '1994', 'Rock', 'Punk Rock, Pop Punk', 'https://i.discogs.com/thumb5.jpg', 'https://i.discogs.com/cover5.jpg'),
    (6789012, 'discogs', 'In Rainbows', 'Radiohead', '2007', 'Rock', 'Alternative Rock, Art Rock', 'https://i.discogs.com/thumb6.jpg', 'https://i.discogs.com/cover6.jpg');

-- Make ALL users follow each other (mutual following = friends in the app)
-- This creates bidirectional relationships so they appear in each other's friends/followers lists
-- Each user follows all other users for complete connectivity

-- pskills follows everyone else
INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'pskills' AND u2.username = 'WillMerritt3';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'pskills' AND u2.username = 'apskills';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'pskills' AND u2.username = 'phollenbachi';

-- WillMerritt3 follows everyone else
INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'WillMerritt3' AND u2.username = 'pskills';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'WillMerritt3' AND u2.username = 'apskills';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'WillMerritt3' AND u2.username = 'phollenbachi';

-- apskills follows everyone else
INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'apskills' AND u2.username = 'pskills';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'apskills' AND u2.username = 'WillMerritt3';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'apskills' AND u2.username = 'phollenbachi';

-- phollenbachi follows everyone else
INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'phollenbachi' AND u2.username = 'pskills';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'phollenbachi' AND u2.username = 'WillMerritt3';

INSERT INTO user_follows (follower_id, following_id)
SELECT u1.user_id, u2.user_id 
FROM users u1, users u2 
WHERE u1.username = 'phollenbachi' AND u2.username = 'apskills';

-- Add some records to pskills collection
INSERT INTO user_records (user_id, record_id, notes, rating, wishlist)
SELECT u.user_id, r.record_id, 'Amazing shoegaze album!', 5, FALSE 
FROM users u, records r 
WHERE u.username = 'pskills' AND r.discogs_id = 1234567;

INSERT INTO user_records (user_id, record_id, notes, rating, wishlist)
SELECT u.user_id, r.record_id, 'Classic Title Fight', 5, FALSE 
FROM users u, records r 
WHERE u.username = 'pskills' AND r.discogs_id = 2345678;

INSERT INTO user_records (user_id, record_id, notes, rating, wishlist)
SELECT u.user_id, r.record_id, 'Great for parties', 4, FALSE 
FROM users u, records r 
WHERE u.username = 'pskills' AND r.discogs_id = 4567890;

-- Add some records to WillMerritt3 collection
INSERT INTO user_records (user_id, record_id, notes, rating, wishlist)
SELECT u.user_id, r.record_id, 'Hardcore classic', 5, FALSE 
FROM users u, records r 
WHERE u.username = 'WillMerritt3' AND r.discogs_id = 3456789;

INSERT INTO user_records (user_id, record_id, notes, rating, wishlist)
SELECT u.user_id, r.record_id, 'My teenage years!', 5, FALSE 
FROM users u, records r 
WHERE u.username = 'WillMerritt3' AND r.discogs_id = 5678901;

INSERT INTO user_records (user_id, record_id, notes, rating, wishlist)
SELECT u.user_id, r.record_id, 'Masterpiece', 5, FALSE 
FROM users u, records r 
WHERE u.username = 'WillMerritt3' AND r.discogs_id = 6789012;

-- Add some wantlist items for pskills
INSERT INTO user_records (user_id, record_id, notes, price_threshold, wishlist)
SELECT u.user_id, r.record_id, 'Need this on vinyl', 30.00, TRUE 
FROM users u, records r 
WHERE u.username = 'pskills' AND r.discogs_id = 5678901;

-- Add some wantlist items for WillMerritt3
INSERT INTO user_records (user_id, record_id, notes, price_threshold, wishlist)
SELECT u.user_id, r.record_id, 'Want the limited edition', 50.00, TRUE 
FROM users u, records r 
WHERE u.username = 'WillMerritt3' AND r.discogs_id = 1234567;

-- Note: Discogs tokens are already set during user INSERT above
