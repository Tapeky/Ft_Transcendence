const WebSocket = require('ws');

// Tokens des utilisateurs de test
const token1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInVzZXJuYW1lIjoidGVzdHBsYXllcjEiLCJlbWFpbCI6InRlc3RwbGF5ZXIxQHRlc3QuY29tIiwiaWF0IjoxNzUzODM0Njg5LCJleHAiOjE3NTM5MjEwODl9.qz4Ubuvm1n-dJY7x404U8nRqrqyHe7tw_GN76OXYyGY';
const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTEsInVzZXJuYW1lIjoidGVzdHBsYXllcjIiLCJlbWFpbCI6InRlc3RwbGF5ZXIyQHRlc3QuY29tIiwiaWF0IjoxNzUzODM0Njk2LCJleHAiOjE3NTM5MjEwOTZ9.gPPE7OyE4uzVZMJT3m_iv8mJ_EuYAg7nyRAP2G0KcQ4';

console.log('🧪 Test WebSocket Pong - 2 Joueurs');
console.log('==================================');

// Créer les connexions WebSocket
const ws1 = new WebSocket('ws://localhost:3001/ws');
const ws2 = new WebSocket('ws://localhost:3001/ws');

let player1Authenticated = false;
let player2Authenticated = false;
let gameStarted = false;

// Joueur 1
ws1.on('open', () => {
  console.log('✅ Joueur 1 connecté');
  ws1.send(JSON.stringify({
    type: 'auth',
    token: token1
  }));
});

ws1.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('🎮 Joueur 1 reçu:', message.type);
  
  if (message.type === 'auth_success') {
    console.log('✅ Joueur 1 authentifié:', message.data.username);
    player1Authenticated = true;
    checkReadyToStart();
  } else if (message.type === 'success' && message.data.gameId) {
    console.log('🎯 Partie démarrée! ID:', message.data.gameId);
    gameStarted = true;
    
    // Simuler quelques inputs
    setTimeout(() => {
      console.log('📤 Joueur 1 envoie input UP');
      ws1.send(JSON.stringify({
        type: 'update_input',
        input: { up: true, down: false }
      }));
    }, 1000);
    
    setTimeout(() => {
      console.log('📤 Joueur 1 envoie input STOP');
      ws1.send(JSON.stringify({
        type: 'update_input',
        input: { up: false, down: false }
      }));
    }, 2000);
    
  } else if (message.type === 'game_state') {
    console.log('🎮 État du jeu reçu - Score:', 
      message.data.leftPaddle.hitCount, 'vs', message.data.rightPaddle.hitCount);
  } else if (message.type.startsWith('err_')) {
    console.log('❌ Erreur Joueur 1:', message.message);
  }
});

// Joueur 2
ws2.on('open', () => {
  console.log('✅ Joueur 2 connecté');
  ws2.send(JSON.stringify({
    type: 'auth',
    token: token2
  }));
});

ws2.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('🎮 Joueur 2 reçu:', message.type);
  
  if (message.type === 'auth_success') {
    console.log('✅ Joueur 2 authentifié:', message.data.username);
    player2Authenticated = true;
    checkReadyToStart();
  } else if (message.type === 'game_state') {
    // Simuler quelques inputs du joueur 2 aussi
    if (gameStarted && Math.random() > 0.7) {
      setTimeout(() => {
        console.log('📤 Joueur 2 envoie input DOWN');
        ws2.send(JSON.stringify({
          type: 'update_input',
          input: { up: false, down: true }
        }));
        
        setTimeout(() => {
          ws2.send(JSON.stringify({
            type: 'update_input',
            input: { up: false, down: false }
          }));
        }, 500);
      }, Math.random() * 1000);
    }
  } else if (message.type.startsWith('err_')) {
    console.log('❌ Erreur Joueur 2:', message.message);
  }
});

function checkReadyToStart() {
  if (player1Authenticated && player2Authenticated && !gameStarted) {
    console.log('🚀 Démarrage de la partie...');
    ws1.send(JSON.stringify({
      type: 'start_game',
      opponentId: 11 // ID du joueur 2
    }));
  }
}

// Gestion des erreurs
ws1.on('error', (error) => {
  console.error('❌ Erreur WebSocket Joueur 1:', error.message);
});

ws2.on('error', (error) => {
  console.error('❌ Erreur WebSocket Joueur 2:', error.message);
});

// Nettoyage après 10 secondes
setTimeout(() => {
  console.log('🏁 Test terminé, fermeture des connexions...');
  ws1.close();
  ws2.close();
  process.exit(0);
}, 10000);