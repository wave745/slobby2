import * as THREE from 'three';

const RAIN_COUNT = 10000;
const RAIN_AREA_SIZE = 150;
const RAIN_HEIGHT = 50;

class RainEffect {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.velocities = [];

        this.init();
    }

    init() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < RAIN_COUNT; i++) {
            positions.push(
                (Math.random() - 0.5) * RAIN_AREA_SIZE, // x
                Math.random() * RAIN_HEIGHT,                 // y
                (Math.random() - 0.5) * RAIN_AREA_SIZE  // z
            );
            // Each droplet gets a slightly different falling speed
            this.velocities.push(new THREE.Vector3(0, -Math.random() * 20 - 20, 0));
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x00ffff, // Neon cyan
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    update(deltaTime) {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        
        for (let i = 0; i < RAIN_COUNT; i++) {
            // Update y position based on velocity and deltaTime
            positions[i * 3 + 1] += this.velocities[i].y * deltaTime;

            // If a particle falls below the ground, reset it to the top at a random x/z position
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3] = (Math.random() - 0.5) * RAIN_AREA_SIZE;
                positions[i * 3 + 1] = RAIN_HEIGHT;
                positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA_SIZE;
            }
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    destroy() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
    }
}

export class WeatherManager {
    constructor(game) {
        this.game = game;
        this.currentEffect = null;
        this.init();
    }

    init() {
        // Start with rain effect by default
        this.currentEffect = new RainEffect(this.game.scene);
    }

    update(deltaTime) {
        if (this.currentEffect) {
            this.currentEffect.update(deltaTime);
        }
    }
    
    destroy() {
        if (this.currentEffect) {
            this.currentEffect.destroy();
        }
    }
}