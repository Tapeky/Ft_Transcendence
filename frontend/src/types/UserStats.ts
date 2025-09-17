export interface UserStats {
  total_games: number;
  total_wins: number;
  avg_score: number;
  highest_score: number;
  avg_game_duration: number;
  win_rate: number;
  total_hits: number;
  total_misses: number;
  hit_rate: number;
}

export interface ScoreHistory {
  match_id: number;
  score: number;
  opponent_score: number;
  date: string;
  won: boolean;
  opponent_username: string;
  duration_seconds: number;
}

export interface ScoreStatsProps {
  stats: UserStats;
  className?: string;
}

export interface ScoreChartData {
  scores: number[];
  wins: boolean[];
  dates: string[];
  opponents: string[];
}

export interface ChartPoint {
  x: number;
  y: number;
  won: boolean;
  score: number;
  opponent: string;
  date: string;
}