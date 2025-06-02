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

const useGameLogic = () => {
  const initialGameState: GameState = {
    player1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    player2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    player1Score: 0,
    player2Score: 0,
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballSpeedX: INITIAL_BALL_SPEED,
    ballSpeedY: INITIAL_BALL_SPEED / 2,
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

  // Fonction pour réinitialiser le jeu
  const resetGame = () => {
    setGameState(initialGameState);
  };

  // Gestionnaire d'événements pour les touches
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

  // Fonction pour dessiner le jeu
  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    // Effacer le canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dessiner la ligne du milieu
    ctx.strokeStyle = 'white';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dessiner les raquettes
    ctx.fillStyle = 'white';
    // Raquette du joueur 1 (gauche)
    ctx.fillRect(0, gameState.player1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    // Raquette du joueur 2 (droite)
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.player2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Dessiner la balle
    ctx.beginPath();
    ctx.arc(gameState.ballX, gameState.ballY, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Afficher les scores sur le terrain avec une opacité réduite
    ctx.font = '80px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    
    // Score du joueur 1 (côté gauche)
    ctx.textAlign = 'center';
    ctx.fillText(
      gameState.player1Score.toString(), 
      CANVAS_WIDTH / 4, 
      CANVAS_HEIGHT / 2 + 30
    );
    
    // Score du joueur 2 (côté droit)
    ctx.fillText(
      gameState.player2Score.toString(), 
      CANVAS_WIDTH * 3 / 4, 
      CANVAS_HEIGHT / 2 + 30
    );
    
  }, [gameState]);

  // Fonction pour mettre à jour l'état du jeu
  const updateGameState = useCallback(() => {
    setGameState(prevState => {
      // Si le jeu est terminé, ne pas mettre à jour
      if (prevState.gameOver || prevState.player1Score >= WINNING_SCORE || prevState.player2Score >= WINNING_SCORE) {
        return {
          ...prevState,
          gameOver: true
        };
      }

      // Copie de l'état précédent
      const newState = { ...prevState };

      // Mouvement des raquettes basé sur les touches pressées
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

      // Rebond sur les bords supérieur et inférieur
      if (newState.ballY <= BALL_SIZE || newState.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
        newState.ballSpeedY = -newState.ballSpeedY;
      }

      // Collision avec les raquettes
      // Raquette gauche (joueur 1)
      if (
		newState.ballX - BALL_SIZE <= PADDLE_WIDTH && // L’extrémité gauche de la balle touche la raquette
		newState.ballX >= 0 &&                        // Le centre est encore à l'écran
		newState.ballY + BALL_SIZE >= newState.player1Y && // Bas de la balle >= haut de la raquette
		newState.ballY - BALL_SIZE <= newState.player1Y + PADDLE_HEIGHT 
      ) {
        newState.ballSpeedX = -Math.abs(newState.ballSpeedX) * SPEED_MULTIPLIER;
		newState.ballSpeedY = newState.ballSpeedY * SPEED_MULTIPLIER;
        // Ajuster légèrement la position pour éviter de rester "collé" à la raquette
        newState.ballX = PADDLE_WIDTH + BALL_SIZE;
      }

      // Raquette droite (joueur 2)
      if (
        newState.ballX + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH &&
        newState.ballY >= newState.player2Y &&
        newState.ballY <= newState.player2Y + PADDLE_HEIGHT
      ) {
        newState.ballSpeedX = Math.abs(newState.ballSpeedX) * SPEED_MULTIPLIER * -1;
		newState.ballSpeedY = newState.ballSpeedY * SPEED_MULTIPLIER;
        // Ajuster légèrement la position pour éviter de rester "collé" à la raquette
        newState.ballX = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
      }

      // Marquer des points et réinitialiser la balle
      if (newState.ballX < 0) {
        // Point pour le joueur 2
        newState.player2Score += 1;
        newState.ballX = CANVAS_WIDTH / 2;
        newState.ballY = CANVAS_HEIGHT / 2;
        newState.ballSpeedX = INITIAL_BALL_SPEED;
        newState.ballSpeedY = INITIAL_BALL_SPEED / 2 * (Math.random() > 0.5 ? 1 : -1);
      } else if (newState.ballX > CANVAS_WIDTH) {
        // Point pour le joueur 1
        newState.player1Score += 1;
        newState.ballX = CANVAS_WIDTH / 2;
        newState.ballY = CANVAS_HEIGHT / 2;
        newState.ballSpeedX = -INITIAL_BALL_SPEED;
        newState.ballSpeedY = INITIAL_BALL_SPEED / 2 * (Math.random() > 0.5 ? 1 : -1);
      }

      return newState;
    });
  }, [keyState]);

  // Fonction pour démarrer la boucle de jeu
  const startGameLoop = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    let animationFrameId: number;
    
    const render = () => {
      updateGameState();
      drawGame(ctx);
      animationFrameId = window.requestAnimationFrame(render);
    };
    
    render();
    
    // Retourne une fonction pour arrêter la boucle de jeu
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [drawGame, updateGameState]);

  return { gameState, startGameLoop, resetGame };
};

export default useGameLogic;