import { DexScreenerAPI } from './dexscreener.js';
export class RaceManager {
  constructor(game) {
    this.game = game;
    this.raceState = 'waiting';
    this.raceTimer = 0;
    this.nextRaceTimer = 0;
    this.participants = [];
    this.winners = [];
    this.spectatorCount = 0;
    this.dexApi = new DexScreenerAPI();
    this.finishFXTriggered = false;
    this.apiUpdateInterval = setInterval(() => this.updateTokenData(), 15000); // Fetch every 15s
    this.lastWinnerDisplayed = null;
  }
  // Update the entire race state from a server message
  updateState(state) {
    const oldState = this.raceState;
    this.raceState = state.raceState;
    this.raceTimer = state.raceTimer;
    this.nextRaceTimer = state.nextRaceTimer;
    this.spectatorCount = state.spectatorCount;
    this.winners = state.winners || [];
    // If the race just finished, trigger the celebration effect
    // The finish effect is no longer needed for the continuous race loop
    // if (this.raceState === 'finished' && oldState !== 'finished' && !this.finishFXTriggered) {
    //   this.triggerFinishEffect(state.winners);
    //   this.finishFXTriggered = true;
    // }
    
    // Trigger swoop cam when race starts
    if (this.raceState === 'racing' && oldState !== 'racing') {
      this.game.cameraManager.startRaceSwoop(() => {
          // After swoop, set to player or spectator view
          if (this.game.playerSnail) {
              this.game.cameraManager.setMode('player');
          } else {
              this.game.cameraManager.setMode('spectator');
          }
      });
    }
    // Reset the trigger flag when a new race is about to start
    if (this.raceState === 'countdown' && oldState !== 'countdown') {
      // this.finishFXTriggered = false; // No longer needed
      this.game.audioManager.playSound('whoosh', 0.5); // Countdown start sound
    }
    // Reset winner visuals when the next race starts
    // Resetting winner visuals is no longer necessary as the race is continuous
    // if (this.raceState === 'waiting' && oldState === 'finished') {
    //     this.game.snailRacers.forEach(snail => {
    //         if (snail.isWinner) {
    //             snail.setWinner(false);
    //         }
    //     });
    //     // After a race finishes, reset the camera to the main spectator view
    //     this.game.cameraManager.setMode('spectator');
    // }
    
    // Update participant data (progress, etc.)
    if (state.racers) {
      this.participants = state.racers;
      this.game.updateRacers(state.racers);
      
      // Check for winner (first snail to reach 100%)
      const winner = state.racers.find(racer => racer.progress >= 1);
      if (winner && this.lastWinnerDisplayed !== winner.username) {
        this.game.ui.showWinnerPopup(winner.username, winner.displayToken || winner.token);
        this.game.audioManager.playSound('fanfare', 0.8);
        this.lastWinnerDisplayed = winner.username;
      }
      
      // Reset winner tracking when no one is at 100% (new race cycle)
      if (!winner) {
        this.lastWinnerDisplayed = null;
      }
    }
  }
  update(deltaTime) {
    // The client-side update loop can be used for client-specific logic,
    // but the primary state is now driven by the server.
    // We can animate the countdown timers smoothly on the client.
    if (this.raceState === 'waiting' || this.raceState === 'finished') {
        if (this.nextRaceTimer > 0) this.nextRaceTimer -= deltaTime;
    } else if (this.raceState === 'countdown') {
        if (this.raceTimer > 0) this.raceTimer -= deltaTime;
    }
    
    // Update the UI with the latest spectator count
    const spectatorElement = document.getElementById('spectatorCount');
    if (spectatorElement) {
      spectatorElement.textContent = `Spectators: ${this.spectatorCount}`;
    }
  }
  // This effect is no longer needed for a continuous race.
  // triggerFinishEffect(winners) { ... }
  
  getRaceStatus() {
    switch (this.raceState) {
      case 'waiting':
        return `Next race in: ${Math.ceil(this.nextRaceTimer)}s`;
      case 'countdown':
        return `Race starts in: ${Math.ceil(this.raceTimer)}s`;
      case 'racing':
        return 'Race is live! 🏁';
      case 'finished':
        return `Next race in: ${Math.ceil(this.raceTimer)}s`;
      default:
        return 'Loading...';
    }
  }
  getLeaderboard() {
    // The leaderboard now just shows the current ranking in the continuous race.
    return [...this.participants].sort((a, b) => b.progress - a.progress);
  }
  async updateTokenData() {
    // We want to fetch data continuously, not just during the 'racing' state
    // if (this.raceState !== 'racing') return;
    
    if (this.participants.length === 0) return;

    try {
      // Use batch request for better performance
      const tokenIdentifiers = this.participants.map(racer => racer.token);
      const batchResults = await this.dexApi.getMultipleTokenData(tokenIdentifiers);

      // Update participant data
      for (const racer of this.participants) {
        const data = batchResults.get(racer.token);
        if (data) {
          racer.tokenBuys = data.buys;
          racer.priceChange = data.priceChange;
          racer.volume = data.volume;

          // Always update token display with symbol if available
          if (data.symbol && data.symbol !== 'UNKNOWN') {
            racer.displayToken = data.symbol;
          } else {
            racer.displayToken = racer.token;
          }
        }
      }

      // Update snail data
      for (const snail of this.game.snailRacers) {
        const match = this.participants.find(p => p.username === snail.username);
        if (match) {
          snail.tokenBuys = match.tokenBuys;
          snail.priceChange = match.priceChange;
          snail.volume = match.volume;

          console.log(`[${snail.username}] Buys: ${snail.tokenBuys}, Δ: ${snail.priceChange}, Volume: ${snail.volume}`);
        }
      }
    } catch (error) {
      console.error('Error updating token data:', error);
    }
  }

}