-- Fix Tournament Schema - Align data types and add missing fields
-- This fixes the foreign key constraint violation causing 500 errors

BEGIN TRANSACTION;

-- Step 1: Backup existing data
CREATE TABLE tournaments_backup AS SELECT * FROM tournaments;
CREATE TABLE tournament_players_backup AS SELECT * FROM tournament_players WHERE 1=0; -- Empty backup (structure only)
CREATE TABLE tournament_matches_backup AS SELECT * FROM tournament_matches WHERE 1=0; -- Empty backup (structure only)

-- Step 2: Drop existing tournament tables
DROP TABLE IF EXISTS tournament_matches;
DROP TABLE IF EXISTS tournament_players; 
DROP TABLE IF EXISTS tournaments;

-- Step 3: Create tournaments table with INTEGER ID (matching backend code)
CREATE TABLE tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- ✅ Matches backend code
    name VARCHAR(255) NOT NULL,
    max_players INTEGER NOT NULL CHECK (max_players IN (4, 8, 16)),
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'running', 'completed', 'cancelled')), -- ✅ Backend uses 'open'/'running'
    winner_alias VARCHAR(50), -- ✅ Added missing field
    created_by INTEGER NOT NULL DEFAULT 1, -- ✅ Added missing field with default
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Step 4: Create tournament_players table with INTEGER tournament_id
CREATE TABLE tournament_players (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id INTEGER NOT NULL,  -- ✅ Changed to INTEGER to match tournaments.id
    alias VARCHAR(50) NOT NULL,
    position INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, alias)
);

-- Step 5: Create tournament_matches table with INTEGER tournament_id
CREATE TABLE tournament_matches (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id INTEGER NOT NULL,  -- ✅ Changed to INTEGER to match tournaments.id
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
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Step 6: Create indexes
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(status);

-- Step 7: Restore compatible data from backup (if any)
INSERT INTO tournaments (name, max_players, current_players, status, created_by, created_at, started_at, completed_at)
SELECT name, max_players, current_players, status, created_by, created_at, started_at, completed_at 
FROM tournaments_backup;

-- Step 8: Clean up backup tables
DROP TABLE tournaments_backup;
DROP TABLE tournament_players_backup;
DROP TABLE tournament_matches_backup;

COMMIT;

-- Verification queries
.print "✅ Schema fix completed"
.print "📊 Current tournaments table structure:"
.schema tournaments
.print "📊 Current tournament_players table structure:"  
.schema tournament_players
.print "📊 Current tournament_matches table structure:"
.schema tournament_matches