#!/usr/bin/env ts-node

/**
 * Database Migration Script
 * Applies schema changes for tournament system Phase 1
 */

import { DatabaseManager } from '../database/DatabaseManager';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  
  const db = DatabaseManager.getInstance();
  
  try {
    // Connect to database
    const dbPath = process.env.DB_PATH ? 
      path.join(process.env.DB_PATH, 'ft_transcendence.db') : 
      path.join(__dirname, '../../../db/ft_transcendence.db');
    
    await db.connect(dbPath);
    console.log('✅ Connected to database');

    // Read migrations file
    const migrationsPath = path.join(__dirname, '../database/migrations.sql');
    const migrations = fs.readFileSync(migrationsPath, 'utf8');
    
    
    // Split migrations by semicolon and execute each
    const statements = migrations
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await db.execute(statement);
        console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
      } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
          console.log(`⚠️ Column already exists: ${statement.substring(0, 50)}...`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('🎉 All migrations applied successfully!');
    
    // Verify schema
    const tables = await db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('tournaments', 'matches', 'tournament_participants')
    `);
    
    console.log(`📊 Found ${tables.length} tournament tables`);
    
    // Check matches table columns
    const matchesInfo = await db.query(`PRAGMA table_info(matches)`);
    console.log('🔍 Matches table columns:');
    matchesInfo.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  runMigrations();
}