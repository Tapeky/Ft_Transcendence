-- Clear all tournament data
-- Execute this script to delete all tournaments, players, and matches

BEGIN TRANSACTION;

-- Delete in order due to foreign key constraints
DELETE FROM tournament_matches;
DELETE FROM tournament_players;  
DELETE FROM tournaments;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('tournaments', 'tournament_players', 'tournament_matches');

COMMIT;

-- Verify deletion
SELECT 'Tournaments remaining:' as info, COUNT(*) as count FROM tournaments
UNION ALL
SELECT 'Players remaining:' as info, COUNT(*) as count FROM tournament_players  
UNION ALL  
SELECT 'Matches remaining:' as info, COUNT(*) as count FROM tournament_matches;