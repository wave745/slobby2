import * as THREE from 'three';
import { SlimeTrail } from './slimeTrail.js';
import { BoostTrail } from './boostTrail.js';
import { PlayerParticleEffect } from './playerParticleEffect.js';
export class SnailRacer {
  constructor(game, username, token, color) {
    this.game = game;
    this.username = username;
    this.token = token;
    this.color = color;
    this.speed = 0;
    this.position = new THREE.Vector3();
    this.group = new THREE.Group();
    this.progress = 0; // Current visual progress (client-side)
    this.serverProgress = 0; // Authoritative progress from server
    this.lastTokenBuys = 0;
    this.tokenBuys = 0; // Will be populated by RaceManager from API
    this.speedBoost = 0; // For visual effect on new buys
    this.dumpPenalty = 0; // For visual slowdown on price dumps
    this.priceChange = 0; // From API
    this.volume = 0;
    this.lastVolume = 0;
    this.volumeSpikeScale = 1;
    this.createSnail();
    this.slimeTrail = new SlimeTrail(this.game.scene, color);
    this.boostTrail = new BoostTrail(this.game.scene);
    this.animationTime = Math.random() * Math.PI * 2; // Random start for animation
    this.isWinner = false;
    this.isPlayer = false;
    this.particleEffect = null;
  }
  createSnail() {
    // Snail body
    const bodyGeometry = new THREE.CapsuleGeometry(0.8, 2, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: this.lightenColor(this.color, 0.3),
      transparent: true,
      opacity: 0.8,
      roughness: 0.2, // Lower roughness for a wet look
      metalness: 0.4  // A bit of metalness to enhance reflections
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    this.group.add(body);

    // Snail shell
    const shellGeometry = new THREE.SphereGeometry(1.2, 12, 8);
    const shellMaterial = new THREE.MeshStandardMaterial({ 
      color: this.color,
      emissive: new THREE.Color(this.color).multiplyScalar(0.1),
      roughness: 0.1, // Very low roughness for a shiny, hard shell
      metalness: 0.7
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.position.set(-0.5, 0.3, 0);
    shell.castShadow = true;
    this.group.add(shell);

    // Shell spiral pattern
    const spiralGeometry = new THREE.TorusGeometry(0.6, 0.1, 4, 12);
    const spiralMaterial = new THREE.MeshStandardMaterial({ 
      color: this.darkenColor(this.color, 0.3),
      roughness: 0.8 // Keep the spiral matte to contrast with the shell
    });
    const spiral = new THREE.Mesh(spiralGeometry, spiralMaterial);
    spiral.position.set(-0.5, 0.3, 0);
    spiral.rotation.y = Math.PI / 4;
    this.group.add(spiral);

    // Eyes (antennae)
    for (let i = 0; i < 2; i++) {
      const eyeStalkGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
      const eyeStalkMaterial = new THREE.MeshStandardMaterial({ color: 0xffdddd, roughness: 0.9 });
      const eyeStalk = new THREE.Mesh(eyeStalkGeometry, eyeStalkMaterial);
      eyeStalk.position.set(1.2, 0.6, i === 0 ? -0.3 : 0.3);
      eyeStalk.rotation.z = (i === 0 ? -1 : 1) * 0.3;
      this.group.add(eyeStalk);

      const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(1.4, 1.1, i === 0 ? -0.3 : 0.3);
      this.group.add(eye);
    }

    // Token indicator (floating above snail)
    const tokenGeometry = new THREE.RingGeometry(0.3, 0.5, 8);
    const tokenMaterial = new THREE.MeshBasicMaterial({ 
      color: this.color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const tokenRing = new THREE.Mesh(tokenGeometry, tokenMaterial);
    tokenRing.position.y = 3;
    tokenRing.rotation.x = Math.PI / 2;
    this.group.add(tokenRing);
    this.tokenRing = tokenRing;
    this.tokenRing = tokenRing;
    
    // Winning Crown (initially hidden)
    const crownGeometry = new THREE.CylinderGeometry(0.4, 0.6, 0.5, 8, 1, false);
    const crownMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700, // Gold
        metalness: 0.9,
        roughness: 0.3,
        emissive: 0xccaa00,
        emissiveIntensity: 0.3
    });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.set(-0.5, 1.6, 0); // Position it on top of the shell
    crown.visible = false;
    this.group.add(crown);
    this.crown = crown;
  }
  lightenColor(color, amount) {
    const c = new THREE.Color(color);
    return c.lerp(new THREE.Color(0xffffff), amount);
  }

  darkenColor(color, amount) {
    const c = new THREE.Color(color);
    return c.lerp(new THREE.Color(0x000000), amount);
  }

  update(deltaTime) {
    // Check for new token buys to trigger floating text
    if (this.tokenBuys > this.lastTokenBuys) {
      // Audio removed
      this.speedBoost = 10; // Add a significant visual speed boost
      this.slimeTrail.triggerGlow();
      this.boostTrail.trigger(this.group.position);
      this.lastTokenBuys = this.tokenBuys;
    }
    // Check for price dumps to trigger slowdown
    if (this.priceChange < -2) { // Use a threshold to avoid minor fluctuations
      this.dumpPenalty = 5; // Apply a visual slowdown
      this.slimeTrail.setColor(0xff0000, 2.0); // Set to red for 2 seconds
    }
    // Check for volume spikes
    const volumeThreshold = 5000; // Minimum volume in USD to consider for a spike
    const spikeFactor = 1.5; // 50% increase
    if (this.volume > this.lastVolume * spikeFactor && this.volume > volumeThreshold && this.lastVolume > 0) {
      this.volumeSpikeScale = 1.5; // Start scale for the burst effect
      // Audio removed
      this.lastVolume = this.volume;
    } else if (this.volume > this.lastVolume) {
      // Update volume even if it's not a spike, so we have a baseline for the next check
      this.lastVolume = this.volume;
    }
    this.animationTime += deltaTime * (2 + this.speedBoost * 0.5); // Boost bobbing animation
    
    // Speed is now used for animations, not for calculating progress.
    this.speed = 2 + (this.tokenBuys / 50) + this.speedBoost - this.dumpPenalty;
    this.speedBoost = Math.max(0, this.speedBoost - deltaTime * 5); // Decay boost over time
    this.dumpPenalty = Math.max(0, this.dumpPenalty - deltaTime * 3); // Decay penalty
    
    // Smoothly interpolate the visual progress towards the server's authoritative progress.
    // This prevents jerky movements from network updates.
    this.progress = THREE.MathUtils.lerp(this.progress, this.serverProgress, 5 * deltaTime);
    // If we're very close, just snap to the final position to avoid tiny lingering interpolation.
    if (Math.abs(this.progress - this.serverProgress) < 0.001) {
      this.progress = this.serverProgress;
    }
    // Apply and decay volume spike effect
    if (this.volumeSpikeScale > 1) {
        this.volumeSpikeScale = THREE.MathUtils.lerp(this.volumeSpikeScale, 1, deltaTime * 5);
        if (this.volumeSpikeScale < 1.01) {
            this.volumeSpikeScale = 1; // Snap back to 1
        }
    }
    this.group.scale.set(this.volumeSpikeScale, this.volumeSpikeScale, this.volumeSpikeScale);
    // Convert interpolated progress to world position
    const trackLength = 90; // From -45 to +45
    const worldZ = -45 + (this.progress * trackLength);
    this.group.position.z = worldZ;
    
    // Bobbing animation
    this.group.position.y = Math.sin(this.animationTime) * 0.2 + 0.5;
    
    // Slight side-to-side motion
    this.group.position.x += Math.sin(this.animationTime * 1.3) * 0.02 * deltaTime;
    
    // Rotate token indicator
    if (this.tokenRing) {
      this.tokenRing.rotation.z = this.animationTime;
    }
    
    // Speed-based shell rotation
    this.group.rotation.y += this.speed * deltaTime * 0.05;
    // Update slime trail position
    this.slimeTrail.update(this.group.position, deltaTime);
    this.boostTrail.update(deltaTime, this.group.position);
    
    if (this.particleEffect) {
      this.particleEffect.update(deltaTime);
    }
  }
  getPosition() {
    return this.group.position.clone();
  }

  isFinished() {
    return this.progress >= 1;
  }
  
  setWinner(isWinner) {
    this.isWinner = isWinner;
    if (this.crown) {
      this.crown.visible = isWinner;
    }
    // Change slime trail color
    if (isWinner) {
        this.slimeTrail.setColor(0xffd700); // Gold
    } else {
        // This assumes originalColor is stored on the trail, which it is
        this.slimeTrail.setColor(this.slimeTrail.originalColor); 
    }
  }
  setAsPlayer() {
    if (this.isPlayer) return; // Already set
    this.isPlayer = true;
    this.particleEffect = new PlayerParticleEffect(this.game.scene, this.group);
  }
  
  destroy() {
    // Clean up geometry and materials to prevent memory leaks
    this.group.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    
    this.game.scene.remove(this.group);
    this.slimeTrail.destroy();
    this.boostTrail.destroy();
    if (this.particleEffect) {
        this.particleEffect.destroy();
    }
    
    // Clear references
    this.group = null;
    this.slimeTrail = null;
    this.boostTrail = null;
    this.particleEffect = null;
  }
}