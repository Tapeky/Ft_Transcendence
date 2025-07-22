const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'backend', 'db', 'ft_transcendence.db');

console.log('🔍 Connexion à la base de données:', dbPath);

// Ouvrir la base de données
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite');
});

// Requête pour récupérer tous les utilisateurs
const query = `
  SELECT 
    id,
    username,
    email,
    display_name,
    is_online,
    total_wins,
    total_losses,
    total_games,
    created_at,
    last_login,
    CASE 
      WHEN total_games > 0 
      THEN ROUND((CAST(total_wins AS FLOAT) / total_games) * 100, 2)
      ELSE 0 
    END as win_rate
  FROM users 
  ORDER BY created_at DESC
`;

console.log('\n👥 Liste des utilisateurs enregistrés:\n');
console.log('═'.repeat(120));

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', err.message);
    return;
  }

  if (rows.length === 0) {
    console.log('📭 Aucun utilisateur trouvé dans la base de données');
  } else {
    console.log(`📊 Total: ${rows.length} utilisateur(s) enregistré(s)\n`);
    
    // En-tête du tableau
    console.log('│ ID │ Username       │ Email                    │ Display Name     │ Online │ Wins │ Losses │ Games │ Win Rate │ Created At          │');
    console.log('├────┼────────────────┼──────────────────────────┼──────────────────┼────────┼──────┼────────┼───────┼──────────┼─────────────────────┤');
    
    rows.forEach(user => {
      const id = String(user.id).padStart(2, ' ');
      const username = (user.username || 'N/A').substring(0, 14).padEnd(14, ' ');
      const email = (user.email || 'N/A').substring(0, 24).padEnd(24, ' ');
      const displayName = (user.display_name || 'N/A').substring(0, 16).padEnd(16, ' ');
      const online = user.is_online ? '  ✓   ' : '  ✗   ';
      const wins = String(user.total_wins || 0).padStart(4, ' ');
      const losses = String(user.total_losses || 0).padStart(6, ' ');
      const games = String(user.total_games || 0).padStart(5, ' ');
      const winRate = String(user.win_rate || 0).padStart(7, ' ') + '%';
      const createdAt = new Date(user.created_at).toLocaleString('fr-FR').padEnd(19, ' ');
      
      console.log(`│ ${id} │ ${username} │ ${email} │ ${displayName} │ ${online} │ ${wins} │ ${losses} │ ${games} │ ${winRate} │ ${createdAt} │`);
    });
    
    console.log('└────┴────────────────┴──────────────────────────┴──────────────────┴────────┴──────┴────────┴───────┴──────────┴─────────────────────┘');
    
    // Statistiques supplémentaires
    const totalUsers = rows.length;
    const onlineUsers = rows.filter(u => u.is_online).length;
    const usersWithGames = rows.filter(u => u.total_games > 0).length;
    const totalGames = rows.reduce((sum, u) => sum + (u.total_games || 0), 0);
    
    console.log('\n📈 Statistiques:');
    console.log(`   • Total utilisateurs: ${totalUsers}`);
    console.log(`   • Utilisateurs en ligne: ${onlineUsers} (${Math.round(onlineUsers / totalUsers * 100)}%)`);
    console.log(`   • Utilisateurs avec des parties: ${usersWithGames} (${Math.round(usersWithGames / totalUsers * 100)}%)`);
    console.log(`   • Total parties jouées: ${totalGames}`);
    
    if (usersWithGames > 0) {
      const avgGamesPerActiveUser = Math.round(totalGames / usersWithGames * 100) / 100;
      console.log(`   • Moyenne parties par joueur actif: ${avgGamesPerActiveUser}`);
    }
  }
  
  console.log('\n═'.repeat(120));
});

// Fermer la connexion
db.close((err) => {
  if (err) {
    console.error('❌ Erreur lors de la fermeture:', err.message);
  }
});