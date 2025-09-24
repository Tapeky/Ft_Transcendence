export interface SimplePongState {
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  leftPaddleY: number;
  rightPaddleY: number;
  leftScore: number;
  rightScore: number;
  gameOver: boolean;
  winner?: 'left' | 'right';
}

export class SimplePong {
  private static readonly ARENA_WIDTH = 800;
  private static readonly ARENA_HEIGHT = 400;
  private static readonly PADDLE_HEIGHT = 80;
  private static readonly PADDLE_WIDTH = 10;
  private static readonly BALL_SIZE = 10;
  private static readonly BALL_SPEED = 300;
  private static readonly PADDLE_SPEED = 350;
  private static readonly WINNING_SCORE = 5;

  private state: SimplePongState;

  constructor() {
    // Initialisation directe dans le constructeur pour éviter l'erreur TS
    this.state = {
      ballX: SimplePong.ARENA_WIDTH / 2,
      ballY: SimplePong.ARENA_HEIGHT / 2,
      ballVX: (Math.random() > 0.5 ? 1 : -1) * SimplePong.BALL_SPEED,
      ballVY: (Math.random() - 0.5) * SimplePong.BALL_SPEED * 0.5,
      leftPaddleY: SimplePong.ARENA_HEIGHT / 2,
      rightPaddleY: SimplePong.ARENA_HEIGHT / 2,
      leftScore: 0,
      rightScore: 0,
      gameOver: false
    };
  }

  private resetBallPosition(): void {
    this.state.ballX = SimplePong.ARENA_WIDTH / 2;
    this.state.ballY = SimplePong.ARENA_HEIGHT / 2;
    this.state.ballVX = (Math.random() > 0.5 ? 1 : -1) * SimplePong.BALL_SPEED;
    this.state.ballVY = (Math.random() - 0.5) * SimplePong.BALL_SPEED * 0.5;
  }

  public update(deltaTime: number, leftUp: boolean, leftDown: boolean, rightUp: boolean, rightDown: boolean): void {
    if (this.state.gameOver) return;

    // Déplacement des paddles
    if (leftUp) this.state.leftPaddleY -= SimplePong.PADDLE_SPEED * deltaTime;
    if (leftDown) this.state.leftPaddleY += SimplePong.PADDLE_SPEED * deltaTime;
    if (rightUp) this.state.rightPaddleY -= SimplePong.PADDLE_SPEED * deltaTime;
    if (rightDown) this.state.rightPaddleY += SimplePong.PADDLE_SPEED * deltaTime;

    // Limites des paddles (utilisation de PADDLE_HEIGHT)
    const halfPaddle = SimplePong.PADDLE_HEIGHT / 2;
    this.state.leftPaddleY = Math.max(halfPaddle, 
                              Math.min(SimplePong.ARENA_HEIGHT - halfPaddle, this.state.leftPaddleY));
    this.state.rightPaddleY = Math.max(halfPaddle,
                               Math.min(SimplePong.ARENA_HEIGHT - halfPaddle, this.state.rightPaddleY));

    // Déplacement de la balle
    this.state.ballX += this.state.ballVX * deltaTime;
    this.state.ballY += this.state.ballVY * deltaTime;

    // Rebond haut/bas
    if (this.state.ballY <= SimplePong.BALL_SIZE || 
        this.state.ballY >= SimplePong.ARENA_HEIGHT - SimplePong.BALL_SIZE) {
      this.state.ballVY = -this.state.ballVY;
    }

    // Collision paddle gauche (utilisation de PADDLE_HEIGHT et PADDLE_WIDTH)
    if (this.state.ballX <= SimplePong.PADDLE_WIDTH + SimplePong.BALL_SIZE &&
        Math.abs(this.state.ballY - this.state.leftPaddleY) < halfPaddle + SimplePong.BALL_SIZE) {
      this.state.ballVX = Math.abs(this.state.ballVX);
      this.state.ballVY = (this.state.ballY - this.state.leftPaddleY) * 5;
    }

    // Collision paddle droit
    if (this.state.ballX >= SimplePong.ARENA_WIDTH - SimplePong.PADDLE_WIDTH - SimplePong.BALL_SIZE &&
        Math.abs(this.state.ballY - this.state.rightPaddleY) < halfPaddle + SimplePong.BALL_SIZE) {
      this.state.ballVX = -Math.abs(this.state.ballVX);
      this.state.ballVY = (this.state.ballY - this.state.rightPaddleY) * 5;
    }

    // Points
    if (this.state.ballX < 0) {
      this.state.rightScore++;
      this.resetBallPosition();
    } else if (this.state.ballX > SimplePong.ARENA_WIDTH) {
      this.state.leftScore++;
      this.resetBallPosition();
    }

    // Vérifier victoire
    if (this.state.leftScore >= SimplePong.WINNING_SCORE) {
      this.state.gameOver = true;
      this.state.winner = 'left';
    } else if (this.state.rightScore >= SimplePong.WINNING_SCORE) {
      this.state.gameOver = true;
      this.state.winner = 'right';
    }
  }

  public getState(): SimplePongState {
    return { ...this.state };
  }

  public reset(): void {
    this.state = {
      ballX: SimplePong.ARENA_WIDTH / 2,
      ballY: SimplePong.ARENA_HEIGHT / 2,
      ballVX: (Math.random() > 0.5 ? 1 : -1) * SimplePong.BALL_SPEED,
      ballVY: (Math.random() - 0.5) * SimplePong.BALL_SPEED * 0.5,
      leftPaddleY: SimplePong.ARENA_HEIGHT / 2,
      rightPaddleY: SimplePong.ARENA_HEIGHT / 2,
      leftScore: 0,
      rightScore: 0,
      gameOver: false
    };
  }
}