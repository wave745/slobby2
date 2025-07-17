import * as THREE from 'three';

export class BoostTrail {
    constructor(scene) {
        this.scene = scene;
        this.particleCount = 150;
        this.particles = [];
        this.isActive = false;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.4,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(geometry, material);
        this.points.visible = false;
        this.scene.add(this.points);

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: Math.random() * 0.5 + 0.3 // Short life for a trailing effect
            });
        }
    }

    trigger(targetPosition) {
        this.isActive = true;
        this.points.visible = true;
        this.points.position.copy(targetPosition);

        this.particles.forEach(p => this.resetParticle(p));

        // Automatically disable after a short duration
        setTimeout(() => {
            this.isActive = false;
            this.points.visible = false;
        }, 1500); // Effect lasts for 1.5 seconds
    }

    resetParticle(particle) {
        particle.position.set(0, 0, 0); // Relative to the points group
        
        particle.velocity.set(
             (Math.random() - 0.5) * 0.5,
             (Math.random() - 0.5) * 0.5,
             Math.random() * 3 + 1 // Eject backwards
        );
        particle.life = particle.maxLife;
    }

    update(deltaTime, targetPosition) {
        if (!this.isActive) return;

        this.points.position.copy(targetPosition);
        
        const positions = this.points.geometry.attributes.position.array;
        const colors = this.points.geometry.attributes.color.array;

        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.particles[i];

            if (particle.life > 0) {
                particle.life -= deltaTime;

                particle.position.addScaledVector(particle.velocity, deltaTime);

                const lifeRatio = particle.life / particle.maxLife;
                
                positions[i * 3] = particle.position.x;
                positions[i * 3 + 1] = particle.position.y;
                positions[i * 3 + 2] = particle.position.z;

                // Green to yellow fade
                const color = new THREE.Color().setHSL(0.3, 1.0, 0.5 + (1 - lifeRatio) * 0.5);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;

            } else {
                 // Hide dead particles
                positions[i * 3] = 0;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = 0;
            }
        }
        
        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.color.needsUpdate = true;
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
        this.particles = [];
    }
}