import * as THREE from 'three';

export class StartLineFX {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.particles = [];
    this.particleCount = 150;
    this.maxLife = 2; // seconds
  }

  init() {
    // Using small boxes for a chunkier, more explosive look
    const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    for (let i = 0; i < this.particleCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x00ffff), // Bright cyan for the start
        transparent: true,
        opacity: 1.0,
      });
      const particle = new THREE.Mesh(particleGeometry, material);
      
      this.particles.push({
        mesh: particle,
        velocity: new THREE.Vector3(),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ),
        life: 0,
      });
      this.group.add(particle);
    }
  }

  trigger() {
    if (this.particles.length === 0) {
      this.init();
    }
    
    // The starting line is at z = -45
    const startLinePosition = new THREE.Vector3(0, 0.5, -45);

    this.particles.forEach(p => {
      // Spread particles along the start line
      const offsetX = (Math.random() - 0.5) * 20;
      p.mesh.position.copy(startLinePosition).add(new THREE.Vector3(offsetX, 0, 0));
      p.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      p.mesh.visible = true;
      p.mesh.material.opacity = 1.0;
      
      // Explosion velocity
      p.velocity.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 10 + 5, // Upward and forward burst
        (Math.random() - 0.5) * 10
      );
      
      p.life = this.maxLife;
    });
  }

  update(deltaTime) {
    if (this.particles.length === 0) return;
    
    this.particles.forEach(p => {
      if (p.life > 0) {
        p.life -= deltaTime;
        
        p.velocity.y -= 20 * deltaTime; // Gravity
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