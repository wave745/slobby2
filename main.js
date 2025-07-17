import { Game } from './game.js';
import { NetworkManager } from './network.js';
import TWEEN from 'tween.js';
import { supabase } from './supabaseClient.js';
class SlobbyApp {
  constructor() {
    this.game = null;
    this.network = null;
    this.supabase = supabase;
    this.init();
  }

  init() {
    // Initialize the game
    this.game = new Game();
    // Pass supabase client to the network manager
    this.network = new NetworkManager(this.game, this.supabase);
    // Setup UI event listeners
    this.setupUI();
    
    // Start the application
    this.start();
  }

  setupUI() {
    const enterArenaBtn = document.getElementById('enterArenaBtn');
    const joinBtn = document.getElementById('joinRaceBtn');
    const spectateBtn = document.getElementById('spectateBtn');
    const usernameInput = document.getElementById('usernameInput');
    const tokenInput = document.getElementById('tokenInput');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const sendMessage = () => {
        const message = chatInput.value.trim();
        if (message) {
            this.network.sendChatMessage(message);
            chatInput.value = '';
        }
    };
    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    // Handle quick select buttons
    const quickSelectContainer = document.getElementById('quickSelectTokens');
    quickSelectContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-select-btn')) {
            tokenInput.value = e.target.dataset.token;
        }
    });
    enterArenaBtn.addEventListener('click', () => {
      const landingPage = document.getElementById('landingPage');
      landingPage.style.transition = 'opacity 0.5s ease-out';
      landingPage.style.opacity = '0';
      
      setTimeout(() => {
        landingPage.style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        document.getElementById('ui').style.display = 'block';
      }, 500);
      
      this.game.startAudio();
    });
    
    joinBtn.addEventListener('click', async () => {
      const username = usernameInput.value.trim();
      const token = tokenInput.value.trim();
      const loader = document.getElementById('loader');
      const errorEl = document.getElementById('setupError');
      const actionBtns = document.getElementById('setupActions');
      
      errorEl.style.display = 'none';
      if (!username || !token) {
        errorEl.textContent = 'Please enter both a username and a token.';
        errorEl.style.display = 'block';
        return;
      }
      loader.style.display = 'block';
      actionBtns.style.display = 'none';
      
      try {
        const tokenData = await this.game.raceManager.dexApi.getTokenData(token);
        
        if (tokenData.symbol === 'UNKNOWN' || tokenData.buys === undefined) {
          throw new Error('Invalid or unsupported token address.');
        }
        // Token is valid, proceed to join with both original token and symbol
        this.network.joinRace(username, token, tokenData.symbol);
        this.hideSetupPanel();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      } finally {
        loader.style.display = 'none';
        actionBtns.style.display = 'block';
      }
    });

    spectateBtn.addEventListener('click', () => {
      this.network.spectate();
      this.hideSetupPanel();
    });
  }
  hideSetupPanel() {
    document.getElementById('setupPanel').style.display = 'none';
    document.getElementById('raceUI').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'block';
    document.getElementById('chatBox').style.display = 'flex'; // Show chatbox
    // Audio is now started when entering the arena, not here.
  }

  start() {
    this.game.start();
    // Start the TWEEN animation loop
    function animate() {
      requestAnimationFrame(animate);
      // TWEEN is now updated inside cameraManager to ensure correct timing with camera movements
    }
    requestAnimationFrame(animate);
  }
}

// Start the application
new SlobbyApp();