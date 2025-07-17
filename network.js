// A placeholder for the actual WebSocket server URL
const WEBSOCKET_URL = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}` 
  : `ws://${window.location.host}`;

const DEFAULT_RACERS = [
    { username: 'TROLL', token: 'TROLL', progress: 0, tokenBuys: 55, priceChange: 0, volume: 52000 },
    { username: 'AURA', token: 'AURA', progress: 0, tokenBuys: 48, priceChange: 0, volume: 48000 },
    { username: 'FARTCOIN', token: 'FARTCOIN', progress: 0, tokenBuys: 45, priceChange: 0, volume: 45000 },
];
class NetworkManager {
  constructor(game, supabase) {
    this.game = game;
    this.supabase = supabase;
    this.ws = null;
    this.intentionallyClosed = false;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.onopen = () => {
      console.log('Connected to Slobby Race server!');
    };

    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => {
      console.log('Disconnected from server. Attempting to reconnect...');
      // Only reconnect if not intentionally closed
      if (!this.intentionallyClosed) {
        setTimeout(() => this.connect(), 3000);
      }
    };
    this.ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      this.ws.close(); // This will trigger the onclose event and reconnection
    };
  }
  handleMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
       // The echo server may send back our original 'join' message as a string.
       // We can use this to simulate the 'gameState' update from a real server.
       if (event.data.includes('"type":"join"')) {
           const sentMessage = JSON.parse(event.data);
           this.simulateGameState(sentMessage.payload); // This can be fire-and-forget
       } else if (event.data.includes('"type":"spectate"')) {
           this.simulateGameState(); // This can be fire-and-forget
       }
      return;
    }
    console.log('Received from server:', message);
    switch (message.type) {
      case 'gameState':
        this.game.raceManager.updateState(message.payload);
        // If we are the player, find our snail and set up the camera
        if (!this.game.isSpectating) {
            this.game.playerSnail = this.game.snailRacers.find(s => s.username === this.lastJoinedUsername);
            if (this.game.playerSnail) {
              // We don't call joinRace here anymore, just set the snail.
              // joinRace is called when the user clicks the button.
            }
        }
        break;
      case 'raceUpdate':
        // This would be a lighter-weight update during a race
        this.game.raceManager.updateState({ racers: message.payload.racers });
        break;
      case 'spectatorUpdate':
        this.game.raceManager.spectatorCount = message.payload.count;
        break;
      // Handle other message types as needed
      case 'chat':
        this.game.ui.addChatMessage(message.payload.username, message.payload.message);
        break;
      // Handle other message types as needed
    }
  }
  // SIMULATION function for the echo server
  async simulateGameState(playerPayload = null) {
    // Start with a fresh copy of default racers and fetch their live data
    const demoRacers = await Promise.all(DEFAULT_RACERS.map(async (racer) => {
        const liveData = await this.game.raceManager.dexApi.getTokenData(racer.token);
        return {
            ...racer,
            tokenBuys: liveData.buys,
            priceChange: liveData.priceChange,
            volume: liveData.volume,
            displayToken: liveData.symbol || racer.token
        };
    }));
    
    // If a player is joining, add them to the list, but avoid duplicates if they use a default token
    if (playerPayload) {
      const playerToken = playerPayload.token.toUpperCase();
      const existingRacerIndex = demoRacers.findIndex(r => r.token === playerToken);
      
      if (existingRacerIndex !== -1) {
        // If player uses a default token, replace the AI with the player
        demoRacers[existingRacerIndex] = { 
          ...playerPayload, 
          progress: 0, 
          tokenBuys: 50, 
          priceChange: 0, 
          volume: 50000,
          displayToken: playerPayload.tokenSymbol || playerPayload.token
        };
      } else {
        // Otherwise, just add the player
        demoRacers.push({ 
          ...playerPayload, 
          progress: 0, 
          tokenBuys: 50, 
          priceChange: 0, 
          volume: 50000,
          displayToken: playerPayload.tokenSymbol || playerPayload.token
        });
      }
    }
    const gameState = {
        raceState: 'waiting',
        raceTimer: 0,
        nextRaceTimer: 45,
        spectatorCount: demoRacers.length,
        racers: demoRacers
    };
    // Call the game's update method directly as if the server sent this state
    this.game.raceManager.updateState(gameState);
    // After initial state, start the simulation loop
    if (!this.simulationInterval) {
        this.startRaceSimulationLoop();
    }
  }
  startRaceSimulationLoop() {
      // Simple state machine simulation
      this.simulationInterval = setInterval(() => {
          const currentState = this.game.raceManager;
          // Create a deep copy of the racers to avoid reference issues.
          const currentRacers = JSON.parse(JSON.stringify(currentState.participants));
          let newState = { ...currentState, racers: currentRacers };
          if (currentState.raceState === 'waiting' && currentState.nextRaceTimer <= 0) {
              newState.raceState = 'countdown';
              newState.raceTimer = 5;
          } else if (currentState.raceState === 'countdown' && currentState.raceTimer <= 0) {
              newState.raceState = 'racing';
              // Reset progress at the start of a new race
              newState.racers.forEach(r => r.progress = 0);
          } else if (currentState.raceState === 'racing') {
            const leaderProgress = Math.max(0, ...newState.racers.map(r => r.progress));
            
            newState.racers.forEach(racer => {
                // If a snail finishes, reset its progress to loop the race
                if (racer.progress >= 1) {
                    racer.progress = 0; 
                }
                
                // Base speed from token buys plus a random factor for variety
                const randomFactor = (Math.random() - 0.45) * 0.005; 
                let progressIncrement = (racer.tokenBuys / 2500) + randomFactor; 
                // Apply a slowdown penalty for price dumps
                if (racer.priceChange < 0) {
                    const dumpFactor = Math.abs(racer.priceChange) / 100;
                    progressIncrement *= (1 - dumpFactor);
                }
                // Apply a catch-up boost if a snail is falling behind
                const progressDeficit = leaderProgress - racer.progress;
                if (progressDeficit > 0.2) { // Only boost if significantly behind
                    const catchUpBoost = progressDeficit * 0.005; // Gentle boost
                    progressIncrement += catchUpBoost;
                }
                // Update progress, ensuring it doesn't go backwards
                racer.progress += Math.max(0, progressIncrement);
            });
            // The race is continuous, so no 'finished' state logic is needed.
          }
          this.game.raceManager.updateState(newState);
      }, 1000); // Update simulation every second
  }
  // SIMULATION END
  sendMessage(type, payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.ws.send(message);
    } else {
      console.warn('WebSocket is not open. Message not sent:', { type, payload });
    }
  }
  sendChatMessage(message) {
    this.sendMessage('chat', { message });
    // Simulate receiving our own message back for the echo server
    if (this.ws.readyState !== WebSocket.OPEN) {
        this.game.ui.addChatMessage(this.game.lastJoinedUsername || 'Spectator', message);
    }
  }

  joinRace(username, token, tokenSymbol) {
    this.lastJoinedUsername = username; 
    this.game.lastJoinedUsername = username; // Let game know who the player is
    this.sendMessage('join', { username, token, tokenSymbol });
    this.game.joinRace(username, token, tokenSymbol);
    
    // In our simulation, joining also triggers the initial game state send
    if(this.ws.readyState !== WebSocket.OPEN) {
        this.simulateGameState({username, token, tokenSymbol}); // This can be fire-and-forget
    }
  }
  spectate() {
    this.sendMessage('spectate', {});
    this.game.spectate();
    
    // In our simulation, spectating also triggers the initial game state send
    if(this.ws.readyState !== WebSocket.OPEN) {
        this.simulateGameState(); // This can be fire-and-forget
    }
  }
}

export { NetworkManager };