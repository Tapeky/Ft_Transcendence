import { Database } from 'sqlite';
import { User, UserCreateInput, UserPublic, SecurityLog } from '../types/database';
import bcrypt from 'bcrypt';

export class UserRepository {
  constructor(private db: Database) {}
  
  // Créer un utilisateur
  async create(userData: UserCreateInput): Promise<User> {
    const { password, ...otherData } = userData;
    
    // Hash du mot de passe
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const result = await this.db.run(`
      INSERT INTO users (username, email, password_hash, display_name, google_id, github_id, data_consent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      otherData.username,
      otherData.email,
      password_hash,
      otherData.display_name || otherData.username,
      otherData.google_id,
      otherData.github_id,
      otherData.data_consent || false
    ]);
    
    const user = await this.findById(result.lastID!);
    if (!user) throw new Error('Failed to create user');
    
    return user;
  }
  
  async findById(id: number): Promise<User | null> {
    const result = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
    return result || null;
  }
  
  async findByEmail(email: string): Promise<User | null> {
	const result = await this.db.get('SELECT * FROM users WHERE email = ?', [email]);
    return result || null;
  }
  
  async findByUsername(username: string): Promise<User | null> {
	const result = await this.db.get('SELECT * FROM users WHERE username = ?', [username]);
    return result || null;
  }
  
  async findByGoogleId(googleId: string): Promise<User | null> {
	const result = await this.db.get('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return result || null;
  }
  
  async findByGitHubId(githubId: string): Promise<User | null> {
	const result = await this.db.get('SELECT * FROM users WHERE github_id = ?', [githubId]);
    return result || null;
  }
  
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password_hash);
  }
  
  async updateOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    await this.db.run(`
      UPDATE users 
      SET is_online = ?, last_login = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE last_login END
      WHERE id = ?
    `, [isOnline, isOnline, userId]);
  }
  
  async updateProfile(userId: number, updates: Partial<Pick<User, 'display_name' | 'avatar_url'>>): Promise<User> {
    const setClauses = [];
    const values = [];
    
    if (updates.display_name !== undefined) {
      setClauses.push('display_name = ?');
      values.push(updates.display_name);
    }
    
    if (updates.avatar_url !== undefined) {
      setClauses.push('avatar_url = ?');
      values.push(updates.avatar_url);
    }
    
    if (setClauses.length === 0) {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }
    
    values.push(userId);
    
    await this.db.run(`
      UPDATE users 
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `, values);
    
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found after update');
    return user;
  }
  
  async changePassword(userId: number, newPassword: string): Promise<void> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    await this.db.run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);
  }
  
  async getUserStats(userId: number): Promise<any> {
    const stats = await this.db.get(`
      SELECT 
        total_wins,
        total_losses,
        total_games,
        CASE 
          WHEN total_games > 0 
          THEN ROUND((CAST(total_wins AS FLOAT) / total_games) * 100, 2)
          ELSE 0 
        END as win_rate
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    const recentMatches = await this.db.all(`
      SELECT 
        m.*,
        u1.username as player1_username,
        u1.display_name as player1_display_name,
        u2.username as player2_username,
        u2.display_name as player2_display_name
      FROM matches m
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      WHERE (m.player1_id = ? OR m.player2_id = ?) AND m.status = 'completed'
      ORDER BY m.completed_at DESC
      LIMIT 5
    `, [userId, userId]);
    
    return {
      ...stats,
      recent_matches: recentMatches
    };
  }
  
  async getPublicProfile(userId: number): Promise<UserPublic | null> {
    const user = await this.db.get(`
      SELECT 
        id, username, display_name, avatar_url, is_online,
        total_wins, total_losses, total_games, created_at
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    return user;
  }
  
  async search(query: string, limit: number = 10): Promise<UserPublic[]> {
    return await this.db.all(`
      SELECT 
        id, username, display_name, avatar_url, is_online,
        total_wins, total_losses, total_games, created_at
      FROM users 
      WHERE (username LIKE ? OR display_name LIKE ?)
      ORDER BY total_wins DESC
      LIMIT ?
    `, [`%${query}%`, `%${query}%`, limit]);
  }
  
  async getLeaderboard(limit: number = 10): Promise<UserPublic[]> {
    return await this.db.all(`
      SELECT 
        id, username, display_name, avatar_url, is_online,
        total_wins, total_losses, total_games, created_at,
        CASE 
          WHEN total_games > 0 
          THEN ROUND((CAST(total_wins AS FLOAT) / total_games) * 100, 2)
          ELSE 0 
        END as win_rate
      FROM users 
      WHERE total_games > 0
      ORDER BY total_wins DESC, win_rate DESC
      LIMIT ?
    `, [limit]);
  }
  
  async getOnlineUsers(): Promise<UserPublic[]> {
    return await this.db.all(`
      SELECT 
        id, username, display_name, avatar_url, is_online,
        total_wins, total_losses, total_games, created_at
      FROM users 
      WHERE is_online = true
      ORDER BY last_login DESC
    `);
  }
  
  async deleteUser(userId: number): Promise<void> {
    await this.db.run('DELETE FROM users WHERE id = ?', [userId]);
  }
  
  async anonymizeUser(userId: number): Promise<void> {
    const anonymousData = {
      email: `deleted_user_${userId}@deleted.com`,
      username: `deleted_user_${userId}`,
      display_name: 'Utilisateur supprimé',
      avatar_url: null,
      password_hash: 'DELETED',
      google_id: null
    };
    
    await this.db.run(`
      UPDATE users 
      SET email = ?, username = ?, display_name = ?, avatar_url = ?, password_hash = ?, google_id = ?, github_id = ?
      WHERE id = ?
    `, [
      anonymousData.email,
      anonymousData.username,
      anonymousData.display_name,
      anonymousData.avatar_url,
      anonymousData.password_hash,
      anonymousData.google_id,
      null, // github_id
      userId
    ]);
  }
  
  async logSecurityAction(log: Omit<SecurityLog, 'id' | 'created_at'>): Promise<void> {
    await this.db.run(`
      INSERT INTO security_logs (user_id, action, ip_address, user_agent, success, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [log.user_id, log.action, log.ip_address, log.user_agent, log.success, log.details]);
  }
  
  async updateGitHubId(userId: number, githubId: string): Promise<void> {
    await this.db.run('UPDATE users SET github_id = ? WHERE id = ?', [githubId, userId]);
  }
  
  async updateGoogleId(userId: number, googleId: string): Promise<void> {
    await this.db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleId, userId]);
  }
}