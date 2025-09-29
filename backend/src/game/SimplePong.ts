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
    this.state = {
      ballX: SimplePong.ARENA_WIDTH / 2,
      ballY: SimplePong.ARENA_HEIGHT / 2,
      ballVX: (Math.random() > 0.5 ? 1 : -1) * SimplePong.BALL_SPEED,
      ballVY: (Math.random() - 0.5) * SimplePong.BALL_SPEED * 0.5,
      leftPaddleY: SimplePong.ARENA_HEIGHT / 2,
      rightPaddleY: SimplePong.ARENA_HEIGHT / 2,
      leftScore: 0,
      rightScore: 0,
      gameOver: false,
    };
  }

  private resetBallPosition(): void {
    this.state.ballX = SimplePong.ARENA_WIDTH / 2;
    this.state.ballY = SimplePong.ARENA_HEIGHT / 2;
    this.state.ballVX = (Math.random() > 0.5 ? 1 : -1) * SimplePong.BALL_SPEED;
    this.state.ballVY = (Math.random() - 0.5) * SimplePong.BALL_SPEED * 0.5;
  }

  public update(
    deltaTime: number,
    leftUp: boolean,
    leftDown: boolean,
    rightUp: boolean,
    rightDown: boolean
  ): void {
    if (this.state.gameOver) return;

    const safeDeltaTime = Math.min(deltaTime, 1 / 30);

    this.updatePaddlePositions(safeDeltaTime, leftUp, leftDown, rightUp, rightDown);
    this.updateBallPosition(safeDeltaTime);
    this.handleWallCollisions();
    this.handlePaddleCollisions();
    this.handleScoring();
    this.checkGameOver();
  }

  private updatePaddlePositions(
    deltaTime: number,
    leftUp: boolean,
    leftDown: boolean,
    rightUp: boolean,
    rightDown: boolean
  ): void {
    if (leftUp) this.state.leftPaddleY -= SimplePong.PADDLE_SPEED * deltaTime;
    if (leftDown) this.state.leftPaddleY += SimplePong.PADDLE_SPEED * deltaTime;
    if (rightUp) this.state.rightPaddleY -= SimplePong.PADDLE_SPEED * deltaTime;
    if (rightDown) this.state.rightPaddleY += SimplePong.PADDLE_SPEED * deltaTime;

    const halfPaddle = SimplePong.PADDLE_HEIGHT / 2;
    this.state.leftPaddleY = this.clampPaddlePosition(this.state.leftPaddleY, halfPaddle);
    this.state.rightPaddleY = this.clampPaddlePosition(this.state.rightPaddleY, halfPaddle);
  }

  private clampPaddlePosition(paddleY: number, halfPaddle: number): number {
    return Math.max(
      halfPaddle,
      Math.min(SimplePong.ARENA_HEIGHT - halfPaddle, paddleY)
    );
  }

  private updateBallPosition(deltaTime: number): void {
    this.state.ballX += this.state.ballVX * deltaTime;
    this.state.ballY += this.state.ballVY * deltaTime;
  }

  private handleWallCollisions(): void {
    if (
      this.state.ballY <= SimplePong.BALL_SIZE ||
      this.state.ballY >= SimplePong.ARENA_HEIGHT - SimplePong.BALL_SIZE
    ) {
      this.state.ballVY = -this.state.ballVY;
    }
  }

  private handlePaddleCollisions(): void {
    const halfPaddle = SimplePong.PADDLE_HEIGHT / 2;

    if (this.isCollidingWithLeftPaddle(halfPaddle)) {
      this.state.ballVX = Math.abs(this.state.ballVX);
      this.state.ballVY = (this.state.ballY - this.state.leftPaddleY) * 5;
    }

    if (this.isCollidingWithRightPaddle(halfPaddle)) {
      this.state.ballVX = -Math.abs(this.state.ballVX);
      this.state.ballVY = (this.state.ballY - this.state.rightPaddleY) * 5;
    }
  }

  private isCollidingWithLeftPaddle(halfPaddle: number): boolean {
    return (
      this.state.ballX <= SimplePong.PADDLE_WIDTH + SimplePong.BALL_SIZE &&
      Math.abs(this.state.ballY - this.state.leftPaddleY) < halfPaddle + SimplePong.BALL_SIZE
    );
  }

  private isCollidingWithRightPaddle(halfPaddle: number): boolean {
    return (
      this.state.ballX >= SimplePong.ARENA_WIDTH - SimplePong.PADDLE_WIDTH - SimplePong.BALL_SIZE &&
      Math.abs(this.state.ballY - this.state.rightPaddleY) < halfPaddle + SimplePong.BALL_SIZE
    );
  }

  private handleScoring(): void {
    if (this.state.ballX < 0) {
      this.state.rightScore++;
      this.resetBallPosition();
    } else if (this.state.ballX > SimplePong.ARENA_WIDTH) {
      this.state.leftScore++;
      this.resetBallPosition();
    }
  }

  private checkGameOver(): void {
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
      gameOver: false,
    };
  }
}
