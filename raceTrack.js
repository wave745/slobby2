import * as THREE from 'three';

export class RaceTrack {
  constructor() {
    this.group = new THREE.Group();
    this.floatingSpheres = [];
    this.finishLineParticles = null;
    this.finishLineGlow = {
        active: false,
        intensity: 0,
        duration: 3, // 3 seconds for the effect
        elapsed: 0,
        startColor: new THREE.Color(0x00ffff),
        winnerColor: new THREE.Color(0xffd700),
    };
    this.originalParticleSize = 0.2;
    this.createTrack();
    this.createEnvironment();
  }

  createTrack() {
    // Main track surface with purple gradient (widened for 10 lanes)
    const trackGeometry = new THREE.PlaneGeometry(24, 100);
    const trackMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x0a1e24, // Darker base to make neons pop
      transparent: true,
      opacity: 0.9
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;
    track.receiveShadow = true;
    this.group.add(track);

    // Lane markings - Updated for 10 lanes
    for (let i = -4; i <= 4; i++) {
        if (i === 0) continue; // Skip the center line, which is dashed
        const lineGeometry = new THREE.CylinderGeometry(0.05, 0.05, 100);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(i * 2, 0.05, 0); // Spacing of 2 units per lane (reduced from 4)
        this.group.add(line);
    }

    // Center dashed line
    for (let z = -45; z < 45; z += 8) {
      const dashGeometry = new THREE.BoxGeometry(0.2, 0.1, 3);
      const dashMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Changed to cyan
      const dash = new THREE.Mesh(dashGeometry, dashMaterial);
      dash.position.set(0, 0.05, z);
      this.group.add(dash);
    }

    // Side barriers with neon glow
    this.createBarriers();
    this.createFinishGate();
  }

  createBarriers() {
    for (let side = -1; side <= 1; side += 2) {
      for (let z = -50; z < 50; z += 10) {
        const barrierGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3);
        const barrierMaterial = new THREE.MeshLambertMaterial({ 
          color: side === -1 ? 0x39ff14 : 0x00ffff, // Neon green and cyan
          emissive: side === -1 ? 0x114405 : 0x005566, // Brighter emissive colors
        });
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        barrier.position.set(side * 14, 1.5, z);
        barrier.castShadow = true;
        this.group.add(barrier);
      }
    }
  }

  createEnvironment() {
    // Colorful background spheres with LOD optimization
    const colors = [0x00ffff, 0x39ff14, 0xff00ff, 0x4dd0e1]; 
    
    // Create different LOD levels for spheres
    const highDetailGeometry = new THREE.SphereGeometry(2, 16, 16);
    const mediumDetailGeometry = new THREE.SphereGeometry(2, 12, 12);
    const lowDetailGeometry = new THREE.SphereGeometry(2, 8, 8);
    
    for (let i = 0; i < 30; i++) {
      const sphereMaterial = new THREE.MeshLambertMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
        emissive: 0x111111
      });
      
      // Create LOD object
      const lod = new THREE.LOD();
      
      // Add different detail levels
      const highDetail = new THREE.Mesh(highDetailGeometry, sphereMaterial);
      const mediumDetail = new THREE.Mesh(mediumDetailGeometry, sphereMaterial.clone());
      const lowDetail = new THREE.Mesh(lowDetailGeometry, sphereMaterial.clone());
      
      lod.addLevel(highDetail, 0);    // 0-20 units
      lod.addLevel(mediumDetail, 20); // 20-40 units
      lod.addLevel(lowDetail, 40);    // 40+ units
      
      const side = Math.random() > 0.5 ? 1 : -1;
      lod.position.set(
        side * (15 + Math.random() * 10), 
        Math.random() * 8 + 2, 
        (Math.random() - 0.5) * 100
      );
      
      highDetail.castShadow = true;
      mediumDetail.castShadow = true;
      // Low detail doesn't cast shadows for performance
      
      this.group.add(lod);
      
      // Store for animation
      this.floatingSpheres.push({
        mesh: lod,
        initialY: lod.position.y,
        animationOffset: Math.random() * Math.PI * 2
      });
    }
    // Tunnel-like ceiling with lights (widened for 10 lanes)
    const ceilingGeometry = new THREE.PlaneGeometry(34, 100);
    const ceilingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x051a2e, // Darker cyan ceiling
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = 15;
    ceiling.rotation.x = Math.PI / 2;
    this.group.add(ceiling);
  }
  createFinishGate() {
    const finishZ = 45;
    // Gate posts
    const postGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 8);
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.4,
    });
    const post1 = new THREE.Mesh(postGeometry, postMaterial);
    post1.position.set(-13, 5, finishZ);
    this.group.add(post1);
    const post2 = post1.clone();
    post2.position.x = 13;
    this.group.add(post2);
    // Crossbar
    const crossbarGeometry = new THREE.BoxGeometry(27, 1, 1);
    const crossbar = new THREE.Mesh(crossbarGeometry, postMaterial);
    crossbar.position.set(0, 10, finishZ);
    this.group.add(crossbar);
    // Light curtain particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = Math.random() * 24 - 12; // x (widened for 10 lanes)
      positions[i * 3 + 1] = Math.random() * 10;     // y
      positions[i * 3 + 2] = finishZ;               // z
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: this.finishLineGlow.startColor,
      size: this.originalParticleSize,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.finishLineParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.group.add(this.finishLineParticles);
  }
  triggerFinishGlow() {
    this.finishLineGlow.active = true;
    this.finishLineGlow.elapsed = 0;
  }
  update(deltaTime) {
    // Animate floating environment spheres
    const time = Date.now() * 0.0005;
    this.floatingSpheres.forEach(sphereData => {
      const { mesh, initialY, animationOffset } = sphereData;
      mesh.position.y = initialY + Math.sin(time + animationOffset) * 1.5;
    });
    // Animate finish line particles
    if (this.finishLineParticles) {
      const positions = this.finishLineParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        // Move particle down
        positions[i + 1] -= 5 * deltaTime;
        // Reset particle to the top if it falls below the track
        if (positions[i + 1] < 0) {
          positions[i + 1] = 10; // Reset to top of the gate
        }
      }
      this.finishLineParticles.geometry.attributes.position.needsUpdate = true;
    }
    // Update finish line glow effect
    if (this.finishLineGlow.active) {
      this.finishLineGlow.elapsed += deltaTime;
      const { elapsed, duration, startColor, winnerColor } = this.finishLineGlow;
      const progress = Math.min(elapsed / duration, 1.0);
      if (progress >= 1) {
        this.finishLineGlow.active = false;
        this.finishLineParticles.material.color.copy(startColor);
        this.finishLineParticles.material.size = this.originalParticleSize;
      } else {
        // Fade from winner color back to start color
        const glowIntensity = 1 - progress;
        this.finishLineParticles.material.color.lerpColors(winnerColor, startColor, progress);
        
        // Pulsing size effect
        const pulse = (Math.sin(elapsed * 15) + 1) / 2; // Fast pulse
        this.finishLineParticles.material.size = this.originalParticleSize + (pulse * 2.0 * glowIntensity);
      }
    }
  }
}