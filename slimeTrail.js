import * as THREE from 'three';

const TRAIL_LENGTH = 50; // Number of points in the trail
const TRAIL_WIDTH = 1.5;

export class SlimeTrail {
    constructor(scene, color) {
        this.scene = scene;
        this.originalColor = new THREE.Color(color);
        this.color = this.originalColor.clone();
        this.points = [];
        this.lastPoint = new THREE.Vector3(0, 0, -1000); // Start off-screen
        this.glowIntensity = 1.0; // 1.0 is normal, > 1.0 is glowing
        this.tempColorDuration = 0;
        this.init();
    }

    init() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(TRAIL_LENGTH * 2 * 3); // 2 vertices per point, 3 coords per vertex
        const colors = new Float32Array(TRAIL_LENGTH * 2 * 3);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Populate initial points
        for (let i = 0; i < TRAIL_LENGTH; i++) {
            this.points.push(new THREE.Vector3());
        }

        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }

    update(newPosition, deltaTime) {
        // Decay glow intensity back to normal
        if (this.glowIntensity > 1.0) {
            this.glowIntensity = Math.max(1.0, this.glowIntensity - deltaTime * 2.0);
        }
        // Handle temporary color change (for dumps)
        if (this.tempColorDuration > 0) {
            this.tempColorDuration -= deltaTime;
            if (this.tempColorDuration <= 0) {
                this.color.copy(this.originalColor);
            }
        }
        // Only add a new point if the snail has moved a certain distance
        if (this.lastPoint.distanceTo(newPosition) < 0.1) {
            // Still need to update colors if glow is changing
            if (this.glowIntensity > 1.0) this.updateColors();
            return;
        }

        // Shift points down the array
        for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
            this.points[i].copy(this.points[i - 1]);
        }
        // Add the new point at the beginning
        this.points[0].copy(newPosition);
        this.lastPoint.copy(newPosition);


        const positions = this.mesh.geometry.attributes.position.array;
        
        for (let i = 0; i < TRAIL_LENGTH; i++) {
            const point = this.points[i];
            const nextPoint = i === TRAIL_LENGTH - 1 ? point : this.points[i + 1];

            const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(TRAIL_WIDTH / 2);
            
            const v1 = new THREE.Vector3().copy(point).add(perpendicular);
            const v2 = new THREE.Vector3().copy(point).sub(perpendicular);

            v1.toArray(positions, i * 6);
            v2.toArray(positions, i * 6 + 3);
        }
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.updateColors();
        this.mesh.geometry.computeBoundingSphere();
    }
    
    updateColors() {
        const colors = this.mesh.geometry.attributes.color.array;
        for (let i = 0; i < TRAIL_LENGTH; i++) {
            const alpha = 1.0 - (i / TRAIL_LENGTH);
            const trailColor = this.color.clone().multiplyScalar(this.glowIntensity);
            colors[i * 6] = trailColor.r;
            colors[i * 6 + 1] = trailColor.g;
            colors[i * 6 + 2] = trailColor.b * alpha;
            colors[i * 6 + 3] = trailColor.r;
            colors[i * 6 + 4] = trailColor.g;
            colors[i * 6 + 5] = trailColor.b * alpha;
        }
        this.mesh.geometry.attributes.color.needsUpdate = true;
    }
    triggerGlow() {
        this.glowIntensity = 2.5; // Set to a high value for a bright flash
    }
    
    setColor(newColor, duration = 0) {
        this.color.set(newColor);
        if (duration > 0) {
            this.tempColorDuration = duration;
        } else {
             // If no duration, it's a permanent change
            this.originalColor.set(newColor);
            this.tempColorDuration = 0;
        }
    }

    destroy() {
        // Properly dispose of geometry and material
        if (this.mesh) {
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.mesh.material) {
                this.mesh.material.dispose();
            }
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        
        // Clear trail history
        this.points = [];
        this.scene = null;
    }
}