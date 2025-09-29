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
    const dbPath = process.env.DB_PATH
      ? path.join(process.env.DB_PATH, 'ft_transcendence.db')
      : path.join(__dirname, '../../../db/ft_transcendence.db');

    await db.connect(dbPath);
    console.log('Database connected');

    const migrationsPath = path.join(__dirname, '../database/migrations.sql');
    const migrations = fs.readFileSync(migrationsPath, 'utf8');

    const statements = migrations
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
        } else {
          throw error;
        }
      }
    }

    console.log('Migrations completed');

    const tables = await db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('tournaments', 'matches', 'tournament_participants')
    `);

    const matchesInfo = await db.query(`PRAGMA table_info(matches)`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  runMigrations();
}
