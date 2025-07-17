import * as THREE from 'three';

export class PlayerParticleEffect {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.particleCount = 100;
    this.particles = [];
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.3,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: Math.random() * 2,
        maxLife: 2
      });
      this.resetParticle(this.particles[i]);
    }
  }

  resetParticle(particle) {
    particle.position.copy(this.target.position);
    particle.position.y += 1.5; // Start above the snail

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.5 + 0.2;
    particle.velocity.set(
      Math.cos(angle) * speed,
      Math.random() * 1.5 + 0.5, // Move upwards
      Math.sin(angle) * speed
    );
    particle.life = particle.maxLife;
  }

  update(deltaTime) {
    const positions = this.points.geometry.attributes.position.array;
    
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.resetParticle(particle);
      }
      
      particle.position.addScaledVector(particle.velocity, deltaTime);
      
      // Follow the target loosely
      const targetPos = this.target.position.clone();
      targetPos.y += 1.5;
      particle.velocity.add(targetPos.sub(particle.position).multiplyScalar(deltaTime * 0.5));
      
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;
    }
    
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  destroy() {
    // Properly dispose of geometry and material
    if (this.points) {
      if (this.points.geometry) {
        this.points.geometry.dispose();
      }
      if (this.points.material) {
        this.points.material.dispose();
      }
      this.scene.remove(this.points);
      this.points = null;
    }
    
    // Clear references
    this.scene = null;
    this.target = null;
    this.particles = [];
  }
}