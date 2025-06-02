import { useState, useCallback, useEffect } from 'react';
import { GameState, KeyState } from './types';

// Constantes du jeu
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 0.1;
const INITIAL_BALL_SPEED = 0.02;
const WINNING_SCORE = 3;
const SPEED_MULTIPLIER = 1.1;

const getRandomBallState = () => {
  const randomY = CANVAS_HEIGHT * (0.2 + Math.random() * 0.6);
  const randomDirectionX = Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED;
  const randomDirectionY = (Math.random() - 0.5) * INITIAL_BALL_SPEED;
  
  return {
    ballX: CANVAS_WIDTH / 2,
    ballY: randomY,
    ballSpeedX: randomDirectionX,
    ballSpeedY: randomDirectionY
  };
};

const useGameLogic = () => {
  const initialGameState: GameState = {
    player1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    player2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    player1Score: 0,
    player2Score: 0,
    ...getRandomBallState(),
    paddleHeight: PADDLE_HEIGHT,
    paddleWidth: PADDLE_WIDTH,
    ballSize: BALL_SIZE,
    gameOver: false
  };

  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const [keyState, setKeyState] = useState<KeyState>({
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false
  });

  const resetGame = () => {
    setGameState({
      ...initialGameState,
      ...getRandomBallState()
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setKeyState(prev => ({ ...prev, [e.key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setKeyState(prev => ({ ...prev, [e.key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ligne du milieu
    ctx.strokeStyle = 'white';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Raquettes
    ctx.fillStyle = 'white';
    ctx.fillRect(0, gameState.player1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.player2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Balle
    ctx.beginPath();
    ctx.arc(gameState.ballX, gameState.ballY, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Scores
    ctx.font = '80px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.textAlign = 'center';
    ctx.fillText(
      gameState.player1Score.toString(), 
      CANVAS_WIDTH / 4, 
      CANVAS_HEIGHT / 2 + 30
    );
    ctx.fillText(
      gameState.player2Score.toString(), 
      CANVAS_WIDTH * 3 / 4, 
      CANVAS_HEIGHT / 2 + 30
    );
  }, [gameState]);

  const updateGameState = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameOver || prevState.player1Score >= WINNING_SCORE || prevState.player2Score >= WINNING_SCORE) {
        return {
          ...prevState,
          gameOver: true
        };
      }

      const newState = { ...prevState };

      // Mouvement des raquettes
      if (keyState.w && newState.player1Y > 0) {
        newState.player1Y -= PADDLE_SPEED;
      }
      if (keyState.s && newState.player1Y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        newState.player1Y += PADDLE_SPEED;
      }
      if (keyState.ArrowUp && newState.player2Y > 0) {
        newState.player2Y -= PADDLE_SPEED;
      }
      if (keyState.ArrowDown && newState.player2Y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        newState.player2Y += PADDLE_SPEED;
      }

      // Mouvement de la balle
      newState.ballX += newState.ballSpeedX;
      newState.ballY += newState.ballSpeedY;

      // Rebond haut/bas
      if (newState.ballY <= BALL_SIZE || newState.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
        newState.ballSpeedY = -newState.ballSpeedY;
      }

      // Collision raquette gauche
      if (
        newState.ballX - BALL_SIZE <= PADDLE_WIDTH &&
        newState.ballX > 0 &&
        newState.ballSpeedX < 0 &&
        newState.ballY + BALL_SIZE >= newState.player1Y &&
        newState.ballY - BALL_SIZE <= newState.player1Y + PADDLE_HEIGHT 
      ) {
        newState.ballSpeedX = Math.abs(newState.ballSpeedX) * SPEED_MULTIPLIER;
        newState.ballSpeedY = newState.ballSpeedY * SPEED_MULTIPLIER;
        newState.ballX = PADDLE_WIDTH + BALL_SIZE;
      }

      // Collision raquette droite
      if (
        newState.ballX + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH &&
        newState.ballX < CANVAS_WIDTH &&
        newState.ballSpeedX > 0 &&
        newState.ballY + BALL_SIZE >= newState.player2Y &&
        newState.ballY - BALL_SIZE <= newState.player2Y + PADDLE_HEIGHT
      ) {
        newState.ballSpeedX = -Math.abs(newState.ballSpeedX) * SPEED_MULTIPLIER;
        newState.ballSpeedY = newState.ballSpeedY * SPEED_MULTIPLIER;
        newState.ballX = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
      }

      // Points et reset balle
      if (newState.ballX < 0) {
        newState.player2Score += 1;
        const randomBall = getRandomBallState();
        newState.ballX = randomBall.ballX;
        newState.ballY = randomBall.ballY;
        newState.ballSpeedX = randomBall.ballSpeedX;
        newState.ballSpeedY = randomBall.ballSpeedY;
      } else if (newState.ballX > CANVAS_WIDTH) {
        newState.player1Score += 1;
        const randomBall = getRandomBallState();
        newState.ballX = randomBall.ballX;
        newState.ballY = randomBall.ballY;
        newState.ballSpeedX = randomBall.ballSpeedX;
        newState.ballSpeedY = randomBall.ballSpeedY;
      }

      return newState;
    });
  }, [keyState]);

  const startGameLoop = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    let animationFrameId: number;
    
    const render = () => {
      updateGameState();
      drawGame(ctx);
      animationFrameId = window.requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [drawGame, updateGameState]);

  return { gameState, startGameLoop, resetGame };
};

export default useGameLogic;