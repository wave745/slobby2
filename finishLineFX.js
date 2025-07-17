import * as THREE from 'three';
import TWEEN from 'tween.js';
export class FinishLineFX {
  constructor() {
    this.group = new THREE.Group();
    this.particles = [];
    this.lights = [];
    this.particleCount = 200;
    this.maxLife = 3; // seconds
  }
  init() {
    // Create confetti particles
    const confettiGeometry = new THREE.PlaneGeometry(0.2, 0.4);
    for (let i = 0; i < this.particleCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random(), 1.0, 0.7),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
      });
      const particle = new THREE.Mesh(confettiGeometry, material);
      
      this.particles.push({
        mesh: particle,
        velocity: new THREE.Vector3(),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        life: 0,
      });
      this.group.add(particle);
    }
    // Create celebration lights
    const lightColors = [0xff00ff, 0x00ffff, 0xffff00];
    for (const color of lightColors) {
      const light = new THREE.PointLight(color, 0, 30);
      light.position.y = 5;
      this.lights.push(light);
      this.group.add(light);
    }
  }
  trigger(position) {
    if (this.particles.length === 0) {
      this.init();
    }
    
    // Trigger confetti
    this.particles.forEach(p => {
      p.mesh.position.copy(position).add(new THREE.Vector3(0, 1, 0));
      p.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      p.mesh.visible = true;
      p.mesh.material.opacity = 1.0;
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = Math.random() * 12 + 6;
      
      p.velocity.set(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.cos(phi) * 1.5 + 5, // Extra upward boost
        speed * Math.sin(phi) * Math.sin(theta)
      );
      
      p.life = this.maxLife;
    });
    // Trigger lights
    this.lights.forEach((light, i) => {
        light.position.x = position.x + (i - 1) * 10;
        light.position.z = position.z;
        light.intensity = 5;
        light.distance = 40;
        
        new TWEEN.Tween(light)
            .to({ intensity: 0, distance: 0 }, 1500)
            .easing(TWEEN.Easing.Cubic.In)
            .delay(i * 100)
            .start();
    });
  }
  update(deltaTime) {
    if (this.particles.length === 0) return;
    
    this.particles.forEach(p => {
      if (p.life > 0) {
        p.life -= deltaTime;
        
        p.velocity.y -= 15 * deltaTime; // Gravity
        p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
        p.mesh.rotation.x += p.rotationSpeed.x * deltaTime;
        p.mesh.rotation.y += p.rotationSpeed.y * deltaTime;
        p.mesh.rotation.z += p.rotationSpeed.z * deltaTime;
        p.mesh.material.opacity = Math.max(0, p.life / this.maxLife);
        
        if (p.life <= 0) {
          p.mesh.visible = false;
        }
      }
    });
  }
}