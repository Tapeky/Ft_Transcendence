import { DatabaseManager } from './DatabaseManager';

interface ColumnInfo {
  name: string;
  type: string;
}

export async function ensureSchema() {
  const db = DatabaseManager.getInstance();

  try {
    const tableInfo = await db.query(`PRAGMA table_info(tournaments)`);
    const hasCreatedBy = (tableInfo as ColumnInfo[]).some(col => col.name === 'created_by');

    if (!hasCreatedBy) {
      console.log('Adding missing created_by column to tournaments...');

      await db.execute(`
        ALTER TABLE tournaments
        ADD COLUMN created_by INTEGER NOT NULL DEFAULT 1
      `);

      console.log('Database schema updated');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      // Column already exists, ignore
    } else {
      console.error('Schema check failed:', error);
    }
  }
}