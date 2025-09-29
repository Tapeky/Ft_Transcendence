export interface RecordMatchBody {
  player1_id?: number | null;
  player2_id?: number | null;
  player1_guest_name?: string | null;
  player2_guest_name?: string | null;

  player1_score: number;
  player2_score: number;
  winner_id?: number | null;

  game_type?: string;
  max_score?: number;
  tournament_id?: number | null;

  player1_touched_ball?: number;
  player1_missed_ball?: number;
  player1_touched_ball_in_row?: number;
  player1_missed_ball_in_row?: number;
  player2_touched_ball?: number;
  player2_missed_ball?: number;
  player2_touched_ball_in_row?: number;
  player2_missed_ball_in_row?: number;

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
