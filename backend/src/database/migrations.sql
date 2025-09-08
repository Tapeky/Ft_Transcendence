-- Migration pour Phase 1 - Core Tournament Logic Fixes
-- Ajout des nouvelles colonnes et améliorations du schéma

-- Add round information to matches for better bracket management
ALTER TABLE matches ADD COLUMN round_number INTEGER DEFAULT 1;
ALTER TABLE matches ADD COLUMN match_position INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN next_match_id INTEGER;

-- Add minimum participants to tournaments
ALTER TABLE tournaments ADD COLUMN min_players INTEGER DEFAULT 2;

-- Add tournament progression tracking
ALTER TABLE tournaments ADD COLUMN current_round INTEGER DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN total_rounds INTEGER DEFAULT 1;

-- Add match progression metadata
ALTER TABLE matches ADD COLUMN is_bye BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN parent_match_1 INTEGER; -- For tracking bracket progression
ALTER TABLE matches ADD COLUMN parent_match_2 INTEGER; -- For tracking bracket progression

-- Add foreign key constraints for match progression
-- ALTER TABLE matches ADD FOREIGN KEY (next_match_id) REFERENCES matches(id) ON DELETE SET NULL;
-- ALTER TABLE matches ADD FOREIGN KEY (parent_match_1) REFERENCES matches(id) ON DELETE SET NULL;
-- ALTER TABLE matches ADD FOREIGN KEY (parent_match_2) REFERENCES matches(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_matches_status_round ON matches(status, round_number);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_current_players ON tournaments(current_players, max_players);

-- Add better participant tracking
ALTER TABLE tournament_participants ADD COLUMN eliminated_at DATETIME;
ALTER TABLE tournament_participants ADD COLUMN final_position INTEGER;
ALTER TABLE tournament_participants ADD COLUMN elimination_round INTEGER;

-- Update tournament status values for existing data
UPDATE tournaments SET status = 'waiting' WHERE status = 'open';

-- Add bracket validation function (stored as comment for reference)
/*
PRAGMA foreign_keys = OFF;
-- Update existing data to match new schema
-- This would be run as part of migration
PRAGMA foreign_keys = ON;
*/

-- Tournament state transitions log (optional for debugging)
CREATE TABLE IF NOT EXISTS tournament_state_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tournament_state_log_tournament ON tournament_state_log(tournament_id, created_at);

-- Add tournament events table for real-time updates
CREATE TABLE IF NOT EXISTS tournament_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- match_completed, bracket_updated, tournament_started, etc.
    event_data TEXT, -- JSON data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tournament_events_tournament ON tournament_events(tournament_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tournament_events_type ON tournament_events(event_type, created_at);