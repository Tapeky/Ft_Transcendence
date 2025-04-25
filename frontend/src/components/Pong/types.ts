export interface GameState {
	player1Y: number;
	player2Y: number;
	player1Score: number;
	player2Score: number;
	ballX: number;
	ballY: number;
	ballSpeedX: number;
	ballSpeedY: number;
	paddleHeight: number;
	paddleWidth: number;
	ballSize: number;
	gameOver?: boolean;
  }
  
  export interface KeyState {
	w: boolean;
	s: boolean;
	ArrowUp: boolean;
	ArrowDown: boolean;
  }