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
    try {
      console.log('Initializing SLOBBY app...');
      
      // Initialize the game first
      console.log('Creating Game instance...');
      this.game = new Game();
      
      // Pass supabase client to the network manager
      console.log('Creating NetworkManager...');
      this.network = new NetworkManager(this.game, this.supabase);
      
      // Setup UI event listeners after game initialization
      console.log('Setting up UI...');
      this.setupUI();
      
      // Start the application
      console.log('Starting game loop...');
      this.start();
      
      console.log('SLOBBY app initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize SLOBBY app:', error);
      // Setup basic UI that works without game
      this.setupBasicUI();
    }
  }

  setupBasicUI() {
    console.log('Setting up basic UI...');
    const enterArenaBtn = document.getElementById('enterArenaBtn');
    
    if (enterArenaBtn) {
      enterArenaBtn.addEventListener('click', () => {
        console.log('Enter Arena button clicked!');
        const landingPage = document.getElementById('landingPage');
        landingPage.style.transition = 'opacity 0.5s ease-out';
        landingPage.style.opacity = '0';
        
        setTimeout(() => {
          landingPage.style.display = 'none';
          document.getElementById('gameContainer').style.display = 'block';
          document.getElementById('ui').style.display = 'block';
        }, 500);
        
        // Audio removed for simplicity
      });
      console.log('Enter Arena button event listener added');
    } else {
      console.error('Enter Arena button not found!');
    }
  }

  setupUI() {
    console.log('Setting up full UI...');
    // Setup basic UI first (Enter Arena button)
    this.setupBasicUI();
    
    // Get UI elements
    const joinBtn = document.getElementById('joinRaceBtn');
    const spectateBtn = document.getElementById('spectateBtn');
    const usernameInput = document.getElementById('usernameInput');
    const tokenInput = document.getElementById('tokenInput');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    
    // Verify critical elements exist
    if (!joinBtn || !spectateBtn) {
      console.error('Critical UI elements not found:', { joinBtn: !!joinBtn, spectateBtn: !!spectateBtn });
      return;
    }
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
    // Enter Arena button is handled in setupBasicUI()
    console.log('Setting up Join Race and Spectate buttons...');
    
    joinBtn.addEventListener('click', async () => {
      console.log('Join Race button clicked!');
      const username = usernameInput.value.trim();
      const token = tokenInput.value.trim();
      const loader = document.getElementById('loader');
      const errorEl = document.getElementById('setupError');
      const actionBtns = document.getElementById('setupActions');
      
      console.log('Join Race inputs:', { username, token });
      
      errorEl.style.display = 'none';
      if (!username || !token) {
        console.log('Missing username or token');
        errorEl.textContent = 'Please enter both a username and a token.';
        errorEl.style.display = 'block';
        return;
      }
      
      // Check if game is initialized
      console.log('Game state check:', {
        game: !!this.game,
        raceManager: this.game ? !!this.game.raceManager : false,
        dexApi: this.game && this.game.raceManager ? !!this.game.raceManager.dexApi : false,
        network: !!this.network
      });
      
      if (!this.game || !this.game.raceManager || !this.game.raceManager.dexApi) {
        console.log('Game not fully initialized');
        errorEl.textContent = 'Game is still loading. Please wait a moment and try again.';
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
        if (this.network) {
          this.network.joinRace(username, token, tokenData.symbol);
          this.hideSetupPanel();
        } else {
          throw new Error('Network manager not available.');
        }
      } catch (err) {
        errorEl.textContent = err.message || 'An error occurred. Please try again.';
        errorEl.style.display = 'block';
        console.error('Join race error:', err);
      } finally {
        loader.style.display = 'none';
        actionBtns.style.display = 'block';
      }
    });

    spectateBtn.addEventListener('click', () => {
      console.log('Spectate button clicked!');
      console.log('Network manager available:', !!this.network);
      if (this.network) {
        console.log('Calling network.spectate()...');
        this.network.spectate();
        this.hideSetupPanel();
      } else {
        console.error('Network manager not available for spectating');
        const errorEl = document.getElementById('setupError');
        errorEl.textContent = 'Game is still loading. Please wait a moment and try again.';
        errorEl.style.display = 'block';
      }
    });
    
    console.log('Join Race and Spectate event listeners added successfully');
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

// Wait for DOM to be ready before starting the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting SLOBBY app...');
    new SlobbyApp();
  });
} else {
  console.log('DOM already loaded, starting SLOBBY app...');
  new SlobbyApp();
}