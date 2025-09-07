#!/usr/bin/env ts-node

import { DatabaseManager } from '../database/DatabaseManager';
import path from 'path';

async function cleanTournaments() {
  try {
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(process.env.DB_PATH || './db', process.env.DB_NAME || 'ft_transcendence.db');
    
    await dbManager.connect(dbPath);
    
    // Supprimer tous les tournois
    const result = await dbManager.execute('DELETE FROM tournaments');
    
    console.log(`✅ ${result.changes} tournoi(s) supprimé(s)`);
    
    // Optionnel: reset les auto-increment
    await dbManager.execute('DELETE FROM sqlite_sequence WHERE name = "tournaments"');
    
    // Vérification
    const remaining = await dbManager.queryOne('SELECT COUNT(*) as count FROM tournaments');
    console.log(`📊 Tournois restants: ${remaining.count}`);
    
    await dbManager.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanTournaments();