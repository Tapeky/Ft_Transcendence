export interface RecordMatchBody {
  // Players (maximum flexibility)
  player1_id?: number | null;
  player2_id?: number | null;
  player1_guest_name?: string | null;
  player2_guest_name?: string | null;
  
  // Scores (required)
  player1_score: number;
  player2_score: number;
  winner_id?: number | null;
  
  // Game metadata
  game_type?: string;
  max_score?: number;
  tournament_id?: number | null;
  
  // Detailed gameplay statistics
  player1_touched_ball?: number;
  player1_missed_ball?: number;
  player1_touched_ball_in_row?: number;
  player1_missed_ball_in_row?: number;
  player2_touched_ball?: number;
  player2_missed_ball?: number;
  player2_touched_ball_in_row?: number;
  player2_missed_ball_in_row?: number;
  
  // Duration
  duration_seconds?: number;
}

export interface MatchStatsRequest {
  user_id?: number;
  limit?: number;
  offset?: number;
}

export interface MatchRecord {
  id: number;
  player1_id?: number;
  player2_id?: number;
  player1_username?: string;
  player2_username?: string;
  player1_guest_name?: string;
  player2_guest_name?: string;
  player1_score: number;
  player2_score: number;
  winner_id?: number;
  game_type: string;
  max_score: number;
  tournament_id?: number;
  created_at: string;
  duration_seconds?: number;
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  averageScore: number;
  bestWinStreak: number;
  currentWinStreak: number;
}