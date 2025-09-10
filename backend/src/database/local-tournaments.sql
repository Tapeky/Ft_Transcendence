-- Local Tournament System Schema
-- This creates the correct tables for the new tournament system

-- Drop old incompatible tables if they exist
DROP TABLE IF EXISTS local_tournament_matches;
DROP TABLE IF EXISTS local_tournament_players;
DROP TABLE IF EXISTS local_tournaments;

-- Create new tournaments table with correct UUID schema
DROP TABLE IF EXISTS tournaments_new;
CREATE TABLE tournaments_new (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_players INTEGER NOT NULL CHECK (max_players IN (4, 8, 16)),
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'registration' CHECK (status IN ('registration', 'ready', 'in_progress', 'completed', 'cancelled')),
    winner_alias VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

-- Create tournament_players table
CREATE TABLE tournament_players_new (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id VARCHAR(36) NOT NULL,
    alias VARCHAR(50) NOT NULL,
    position INTEGER, -- Final tournament position
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments_new(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, alias) -- Unique alias per tournament
);

-- Create tournament_matches table
CREATE TABLE tournament_matches_new (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id VARCHAR(36) NOT NULL,
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_alias VARCHAR(50) NOT NULL,
    player2_alias VARCHAR(50) NOT NULL,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    winner_alias VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments_new(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_tournaments_new_status ON tournaments_new(status);
CREATE INDEX idx_tournament_players_new_tournament ON tournament_players_new(tournament_id);
CREATE INDEX idx_tournament_matches_new_tournament ON tournament_matches_new(tournament_id);
CREATE INDEX idx_tournament_matches_new_status ON tournament_matches_new(status);

-- Replace old tables with new ones
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS tournament_players;  
DROP TABLE IF EXISTS tournament_matches;

ALTER TABLE tournaments_new RENAME TO tournaments;
ALTER TABLE tournament_players_new RENAME TO tournament_players;
ALTER TABLE tournament_matches_new RENAME TO tournament_matches;

-- Recreate indexes with correct names
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(status);