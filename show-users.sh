#!/bin/bash

DB_PATH="/home/tapeky/Ft_Transcendence/backend/db/ft_transcendence.db"

echo "🔍 Liste des utilisateurs enregistrés dans Ft_Transcendence"
echo "════════════════════════════════════════════════════════════════════════════════════"

# Compter le total d'utilisateurs
TOTAL_USERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;")
echo "📊 Total: $TOTAL_USERS utilisateur(s) enregistré(s)"
echo ""

# Affichage formaté des utilisateurs
echo "┌────┬───────────────┬──────────────────────────┬─────────────────┬────────┬──────┬────────┬───────┬─────────────────────┐"
echo "│ ID │ Username      │ Email                    │ Display Name    │ Online │ Wins │ Losses │ Games │ Created At          │"
echo "├────┼───────────────┼──────────────────────────┼─────────────────┼────────┼──────┼────────┼───────┼─────────────────────┤"

sqlite3 -separator $'\t' "$DB_PATH" "
SELECT 
  printf('│ %2d │ %-13s │ %-24s │ %-15s │ %6s │ %4d │ %6d │ %5d │ %-19s │',
    id,
    CASE WHEN length(username) > 13 THEN substr(username, 1, 10) || '...' ELSE username END,
    CASE WHEN length(email) > 24 THEN substr(email, 1, 21) || '...' ELSE email END,
    CASE WHEN length(display_name) > 15 THEN substr(display_name, 1, 12) || '...' ELSE display_name END,
    CASE WHEN is_online = 1 THEN '✓' ELSE '✗' END,
    total_wins,
    total_losses, 
    total_games,
    datetime(created_at, 'localtime')
  ) as formatted_row
FROM users 
ORDER BY created_at DESC;
"

echo "└────┴───────────────┴──────────────────────────┴─────────────────┴────────┴──────┴────────┴───────┴─────────────────────┘"

# Statistiques additionnelles
echo ""
echo "📈 Statistiques supplémentaires:"

ONLINE_USERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE is_online = 1;")
USERS_WITH_GAMES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE total_games > 0;")
TOTAL_GAMES=$(sqlite3 "$DB_PATH" "SELECT SUM(total_games) FROM users;")

echo "   • Utilisateurs en ligne: $ONLINE_USERS"
echo "   • Utilisateurs avec des parties: $USERS_WITH_GAMES"
echo "   • Total parties jouées: $TOTAL_GAMES"

if [ "$USERS_WITH_GAMES" -gt 0 ]; then
    AVG_GAMES=$(sqlite3 "$DB_PATH" "SELECT ROUND(CAST(SUM(total_games) AS FLOAT) / COUNT(*), 2) FROM users WHERE total_games > 0;")
    echo "   • Moyenne parties par joueur actif: $AVG_GAMES"
fi

# Utilisateur le plus actif
MOST_ACTIVE=$(sqlite3 "$DB_PATH" "SELECT username, total_games FROM users WHERE total_games = (SELECT MAX(total_games) FROM users) LIMIT 1;")
if [ -n "$MOST_ACTIVE" ]; then
    echo "   • Joueur le plus actif: $MOST_ACTIVE"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════════════════"