interface PongState {
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

interface PlayerNames {
  left: string;
  right: string;
}

export class PongGameRenderer {
  private readonly arenaWidth = 800;
  private readonly arenaHeight = 500;
  private readonly serverArenaHeight = 400;
  private readonly paddleWidth = 10;
  private readonly paddleHeight = 80;
  private readonly ballRadius = 10;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {}

  render(
    state: PongState | null,
    playerNames: PlayerNames,
    isCountingDown: boolean = false,
    countdownValue: number = 0,
    countdownStartTime: number = 0
  ): void {
    if (!this.ctx) return;

    this.clearCanvas();
    this.drawCenterLine();
    this.drawPaddles(state);
    this.drawBall(state);
    this.drawScores(state, playerNames);

    if (isCountingDown) {
      this.renderCountdownOverlay(countdownValue, countdownStartTime);
    }
  }

  private clearCanvas(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawCenterLine(): void {
    const { width, height } = this.canvas;

    this.ctx.setLineDash([8, 8]);
    this.ctx.beginPath();
    this.ctx.moveTo(width / 2, 0);
    this.ctx.lineTo(width / 2, height);
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawPaddles(state: PongState | null): void {
    const yScale = this.canvas.height / this.serverArenaHeight;
    const defaultCenter = this.serverArenaHeight / 2;
    const paddleHalfScaled = (this.paddleHeight / 2) * yScale;
    const paddleHeightScaled = this.paddleHeight * yScale;

    const leftPaddleCenter = (state?.leftPaddleY ?? defaultCenter) * yScale;
    const rightPaddleCenter = (state?.rightPaddleY ?? defaultCenter) * yScale;

    this.ctx.fillStyle = '#fff';

    // Left paddle
    this.ctx.fillRect(
      10,
      leftPaddleCenter - paddleHalfScaled,
      this.paddleWidth,
      paddleHeightScaled
    );

    // Right paddle
    this.ctx.fillRect(
      this.canvas.width - this.paddleWidth - 10,
      rightPaddleCenter - paddleHalfScaled,
      this.paddleWidth,
      paddleHeightScaled
    );
  }

  private drawBall(state: PongState | null): void {
    const yScale = this.canvas.height / this.serverArenaHeight;
    const defaultCenter = this.serverArenaHeight / 2;

    const ballX = state?.ballX ?? this.canvas.width / 2;
    const ballY = (state?.ballY ?? defaultCenter) * yScale;

    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(ballX, ballY, this.ballRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawScores(state: PongState | null, playerNames: PlayerNames): void {
    const { width } = this.canvas;
    const leftScore = state?.leftScore ?? 0;
    const rightScore = state?.rightScore ?? 0;
    const leftDisplayName = playerNames.left || 'Player 1';
    const rightDisplayName = playerNames.right || 'Player 2';

    // Scores
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.font = '48px Iceland, monospace';
    this.ctx.fillText(leftScore.toString(), width / 4, 80);
    this.ctx.fillText(rightScore.toString(), (3 * width) / 4, 80);

    // Player names
    this.ctx.fillStyle = '#ADD8E6';
    this.ctx.font = '24px Iceland, monospace';
    this.ctx.fillText(leftDisplayName, width / 4, 120);
    this.ctx.fillText(rightDisplayName, (3 * width) / 4, 120);
  }

  private renderCountdownOverlay(countdownValue: number, countdownStartTime: number): void {
    const { width, height } = this.canvas;

    // Dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, width, height);

    // Animated countdown text
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.font = '120px Iceland, monospace';

    const displayText = countdownValue > 0 ? countdownValue.toString() : 'GO!';
    const textY = height / 2 + 40;

    const elapsed = performance.now() - countdownStartTime;
    const cycleTime = elapsed % 1000;
    const scale = 1 + Math.sin((cycleTime / 1000) * Math.PI * 2) * 0.1;

    this.ctx.save();
    this.ctx.translate(width / 2, textY);
    this.ctx.scale(scale, scale);
    this.ctx.fillText(displayText, 0, 0);
    this.ctx.restore();
  }

  getCanvasWidth(): number {
    return this.canvas.width;
  }

  getCanvasHeight(): number {
    return this.canvas.height;
  }
}