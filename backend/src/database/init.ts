import { DatabaseManager } from './DatabaseManager';
import fs from 'fs';
import path from 'path';

export async function ensureSchema() {
  const db = DatabaseManager.getInstance();

  try {
    const tableInfo = await db.query(`PRAGMA table_info(tournaments)`);
    const hasCreatedBy = tableInfo.some((col: any) => col.name === 'created_by');

    if (!hasCreatedBy) {
      console.log('Adding missing created_by column to tournaments...');

      await db.execute(`
        ALTER TABLE tournaments
        ADD COLUMN created_by INTEGER NOT NULL DEFAULT 1
      `);

      console.log('Database schema updated');
    }
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {

    } else {
      console.error('Schema check failed:', error);
    }
  }
}