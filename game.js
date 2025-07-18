import * as THREE from 'three';
import { RaceTrack } from './raceTrack.js';
import { SnailRacer } from './snailRacer.js';
import { RaceManager } from './raceManager.js';
import { UI } from './ui.js';
import { FinishLineFX } from './finishLineFX.js';
import { SlimeTrail } from './slimeTrail.js';
import { CameraManager } from './cameraManager.js';
import { DayNightCycleManager } from './dayNightCycle.js';
import { WeatherManager } from './weather.js';
import { PlayerParticleEffect } from './playerParticleEffect.js';
export class Game {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raceTrack = null;
    this.snailRacers = [];
    this.raceManager = null;
    this.ui = null;
    this.cameraManager = null;
    this.finishLineFX = null;
    this.playerSnail = null;
    this.dayNightCycleManager = null;
    this.weatherManager = null;
    this.ambientLight = null;
    this.directionalLight = null;
    this.init();
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    // Create camera with wider FOV for mobile
    const isMobile = window.innerWidth <= 768;
    const fov = isMobile ? 85 : 75; // Wider field of view for mobile
    this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Create renderer with optimization
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0); // Transparent background
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Performance optimizations
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    document.getElementById('gameContainer').appendChild(this.renderer.domElement);

    // Create race track
    this.raceTrack = new RaceTrack();
    this.scene.add(this.raceTrack.group);

    // Setup lighting and audio
    this.setupLighting();
    
    // Initialize managers
    this.raceManager = new RaceManager(this);
    this.finishLineFX = new FinishLineFX();
    this.scene.add(this.finishLineFX.group);
    
    // Initialize UI
    this.ui = new UI(this);
    // Initialize Managers
    this.cameraManager = new CameraManager(this, this.camera, this.renderer.domElement);
    this.weatherManager = new WeatherManager(this);
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Setup texture loading optimization
    this.setupTextureOptimization();
  }
  setupLighting() {
    // Ambient light
    // A darker, moodier ambient light to make neons pop
    this.ambientLight = new THREE.AmbientLight(0x100030, 0.5);
    this.scene.add(this.ambientLight);
    // Main directional light - reduced to act more as a subtle fill light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
    this.directionalLight.position.set(10, 20, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);
    // Initialize the day/night cycle manager
    this.dayNightCycleManager = new DayNightCycleManager(this.scene, this.ambientLight, this.directionalLight);

    // Neon accent lights
    // Stronger neon accent lights
    const neonLight1 = new THREE.PointLight(0xff00ff, 3, 40, 1.5);
    neonLight1.position.set(-12, 6, 15);
    this.scene.add(neonLight1);
    
    const neonLight2 = new THREE.PointLight(0x00ffff, 3, 40, 1.5);
    neonLight2.position.set(12, 6, -20);
    this.scene.add(neonLight2);
    
    // Track lighting - more vibrant
    for (let i = 0; i < 5; i++) {
      const trackLight = new THREE.PointLight(0xf020a0, 2.5, 25, 2);
      trackLight.position.set(0, 8, i * 20 - 40);
      this.scene.add(trackLight);
    }
  }

  // The server will now be responsible for telling us which snails are in the race.
  // We will create/update them based on server messages.
  updateRacers(racerData) {
    // Remove snails that are no longer in the race
    this.snailRacers = this.snailRacers.filter(snail => {
      if (!racerData.find(r => r.username === snail.username)) {
        snail.destroy(); // This will handle removing the model and trail
        return false;
      }
      return true;
    });
    // Add new snails or update existing ones
    racerData.forEach((data, index) => {
      let snail = this.snailRacers.find(s => s.username === data.username);
      if (!snail) {
        // Add new snail
        const color = this.getTokenColor(data.token);
        snail = new SnailRacer(this, data.username, data.token, color);
        this.snailRacers.push(snail);
        this.scene.add(snail.group);
      }
      
      // Update snail properties from server data
      snail.serverProgress = data.progress; // This is the authoritative state from the server
      snail.tokenBuys = data.tokenBuys;
      snail.priceChange = data.priceChange || 0;
      snail.volume = data.volume || 0;
      if (!snail.lastVolume) { // Set initial baseline for volume
        snail.lastVolume = snail.volume;
      }
      
      // Set initial position based on lane (updated for 10 lanes with 2 unit spacing)
      snail.group.position.x = (index - (racerData.length - 1) / 2) * 2;
    });
  }

  joinRace(username, token, tokenSymbol) {
    console.log(`Joining race as ${username} with ${token} (${tokenSymbol})`);
    
    // Store the token symbol for later use
    this.playerTokenSymbol = tokenSymbol;
    
    // We don't create the snail immediately. We wait for the server's gameState update.
    // The server will confirm our entry and provide the full list of racers.
    
    // When our snail is created via `updateRacers`, we'll set up the camera.
    this.playerSnail = this.snailRacers.find(s => s.username === username);
    if (this.playerSnail) {
        this.cameraManager.setTarget(this.playerSnail);
        this.playerSnail.setAsPlayer();
    }
    this.cameraManager.setMode('player');
  }
  spectate() {
    console.log('Spectating race...');
    this.cameraManager.setMode('spectator');
  }
  focusOnSnail(username) {
      const snailToFocus = this.snailRacers.find(s => s.username === username);
      if (snailToFocus) {
          // Focus on the target for 3 seconds, then return to previous state
          this.cameraManager.focusOnTarget(snailToFocus, 3000);
      }
  }

  getTokenColor(token) {
    // Simple hashing function to get a color from a string
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        hash = token.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();
    return parseInt("0x" + ("000000" + color).slice(-6));
  }

  start() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    const deltaTime = 0.016; // Approximate 60fps
    
    // Update race manager with server-driven state
    this.raceManager.update(deltaTime);
    
    // Update snails (their progress is now set by the server)
    this.snailRacers.forEach(snail => snail.update(deltaTime));
    
    // Update effects and environment
    this.finishLineFX.update(deltaTime);
    this.raceTrack.update(deltaTime);
    // Check if we need to assign the camera controller to a newly joined player snail
    if (!this.playerSnail && this.cameraManager.mode === 'player') {
        const player = this.snailRacers.find(s => s.username === this.lastJoinedUsername);
        if (player) {
            this.playerSnail = player;
            this.cameraManager.setTarget(this.playerSnail);
            this.playerSnail.setAsPlayer();
        }
    }
    
    // Update camera
    this.cameraManager.update(deltaTime);
    // Update day/night cycle
    // this.dayNightCycleManager.update(deltaTime); // Paused for consistent neon look
    // Update weather
    this.weatherManager.update(deltaTime);
    
    // Update UI
    this.ui.update(this.raceManager, this.snailRacers);
    
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Update pixel ratio on resize
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  
  setupTextureOptimization() {
    // Global texture loading manager with compression
    THREE.DefaultLoadingManager.onLoad = () => {
      console.log('All textures loaded and optimized');
    };
    
    // Create a helper function for optimized texture loading instead of modifying THREE.TextureLoader
    this.createOptimizedTextureLoader = () => {
      const loader = new THREE.TextureLoader();
      const originalLoad = loader.load.bind(loader);
      
      loader.load = function(url, onLoad, onProgress, onError) {
        return originalLoad(url, (texture) => {
          // Optimize texture settings
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.format = THREE.RGBAFormat;
          texture.flipY = false;
          
          if (onLoad) onLoad(texture);
        }, onProgress, onError);
      };
      
      return loader;
    };
  }
}