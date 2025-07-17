const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static('.'));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state management
let gameState = {
  raceState: 'waiting',
  raceTimer: 0,
  nextRaceTimer: 10,
  spectatorCount: 0,
  racers: [
    { username: 'TROLL', token: 'TROLL', displayToken: 'TROLL', progress: 0, tokenBuys: 55, priceChange: 0, volume: 52000 },
    { username: 'AURA', token: 'AURA', displayToken: 'AURA', progress: 0, tokenBuys: 48, priceChange: 0, volume: 48000 },
    { username: 'FARTCOIN', token: 'FARTCOIN', displayToken: 'FARTCOIN', progress: 0, tokenBuys: 45, priceChange: 0, volume: 45000 },
  ],
  winner: null
};

let clients = new Set();
let playerClients = new Map(); // Map username to WebSocket

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);
  
  // Send current game state to new client
  ws.send(JSON.stringify({
    type: 'gameState',
    payload: gameState
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleClientMessage(ws, data);
    } catch (error) {
      console.error('Invalid message format:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
    
    // Remove player if they were in the race
    for (let [username, client] of playerClients) {
      if (client === ws) {
        playerClients.delete(username);
        gameState.racers = gameState.racers.filter(r => r.username !== username);
        broadcastGameState();
        break;
      }
    }
    
    updateSpectatorCount();
  });
});

function handleClientMessage(ws, data) {
  switch (data.type) {
    case 'join':
      handlePlayerJoin(ws, data.payload);
      break;
    case 'spectate':
      handleSpectate(ws);
      break;
    case 'chat':
      handleChat(ws, data.payload);
      break;
  }
}

function handlePlayerJoin(ws, payload) {
  const { username, token, tokenSymbol } = payload;
  
  // Check if player already exists
  const existingRacerIndex = gameState.racers.findIndex(r => r.username === username);
  
  if (existingRacerIndex !== -1) {
    // Update existing racer
    gameState.racers[existingRacerIndex] = {
      ...gameState.racers[existingRacerIndex],
      token: token.toUpperCase(),
      displayToken: tokenSymbol || token.toUpperCase(),
      progress: 0
    };
  } else {
    // Add new racer
    gameState.racers.push({
      username,
      token: token.toUpperCase(),
      displayToken: tokenSymbol || token.toUpperCase(),
      progress: 0,
      tokenBuys: Math.floor(Math.random() * 50) + 30,
      priceChange: (Math.random() - 0.5) * 20,
      volume: Math.floor(Math.random() * 50000) + 25000
    });
  }
  
  playerClients.set(username, ws);
  updateSpectatorCount();
  broadcastGameState();
}

function handleSpectate(ws) {
  updateSpectatorCount();
  broadcastGameState();
}

function handleChat(ws, payload) {
  const { message } = payload;
  
  // Find username for this WebSocket
  let username = 'Spectator';
  for (let [user, client] of playerClients) {
    if (client === ws) {
      username = user;
      break;
    }
  }
  
  // Broadcast chat message to all clients
  const chatMessage = {
    type: 'chat',
    payload: { username, message }
  };
  
  broadcast(chatMessage);
}

function updateSpectatorCount() {
  const totalClients = clients.size;
  const playerCount = playerClients.size;
  gameState.spectatorCount = Math.max(0, totalClients - playerCount);
}

function broadcastGameState() {
  broadcast({
    type: 'gameState',
    payload: gameState
  });
}

function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Game simulation loop
function startGameLoop() {
  setInterval(() => {
    // Update timers
    if (gameState.raceState === 'waiting') {
      gameState.nextRaceTimer -= 1;
      if (gameState.nextRaceTimer <= 0) {
        gameState.raceState = 'countdown';
        gameState.raceTimer = 3;
        gameState.nextRaceTimer = 10;
      }
    } else if (gameState.raceState === 'countdown') {
      gameState.raceTimer -= 1;
      if (gameState.raceTimer <= 0) {
        gameState.raceState = 'racing';
        // Reset all racer progress
        gameState.racers.forEach(r => r.progress = 0);
      }
    } else if (gameState.raceState === 'racing') {
      // Update racer progress
      const leaderProgress = Math.max(0, ...gameState.racers.map(r => r.progress));
      
      gameState.racers.forEach(racer => {
        // Don't update progress if race is already won
        if (gameState.winner) return;
        
        // Calculate speed based on token data
        const randomFactor = (Math.random() - 0.45) * 0.005;
        let progressIncrement = (racer.tokenBuys / 2500) + randomFactor;
        
        // Apply price change effects
        if (racer.priceChange < 0) {
          const dumpFactor = Math.abs(racer.priceChange) / 100;
          progressIncrement *= (1 - dumpFactor);
        }
        
        // Catch-up mechanic
        const progressDeficit = leaderProgress - racer.progress;
        if (progressDeficit > 0.2) {
          const catchUpBoost = progressDeficit * 0.005;
          progressIncrement += catchUpBoost;
        }
        
        racer.progress += Math.max(0, progressIncrement);
        
        // Check for winner (first to reach 100%)
        if (racer.progress >= 1 && !gameState.winner) {
          racer.progress = 1; // Cap at 100%
          gameState.winner = racer;
          gameState.raceState = 'finished';
          gameState.raceTimer = 2; // 2 second popup display
          console.log(`Race won by ${racer.username} with ${racer.token}!`);
        }
        
        // Occasionally update token stats for realism
        if (Math.random() < 0.1) {
          racer.tokenBuys += Math.floor((Math.random() - 0.5) * 10);
          racer.tokenBuys = Math.max(20, Math.min(100, racer.tokenBuys));
          racer.priceChange += (Math.random() - 0.5) * 5;
          racer.priceChange = Math.max(-50, Math.min(50, racer.priceChange));
        }
      });
    } else if (gameState.raceState === 'finished') {
      gameState.raceTimer -= 1;
      if (gameState.raceTimer <= 0) {
        // Reset for next race
        gameState.raceState = 'waiting';
        gameState.nextRaceTimer = 10;
        gameState.winner = null;
        gameState.racers.forEach(r => r.progress = 0);
        console.log('New race starting in 10 seconds...');
      }
    }
    
    broadcastGameState();
  }, 1000);
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`SLOBBY2 server running on port ${PORT}`);
  console.log(`Game available at: http://localhost:${PORT}`);
  startGameLoop();
});