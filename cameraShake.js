import * as THREE from 'three';

// Manages a camera shake effect that can be triggered with a given intensity and duration.
export class CameraShake {
  constructor() {
    this.intensity = 0;
    this.duration = 0;
    this.decay = 0;
  }

  // Starts a shake effect. Will not override a more intense current shake.
  trigger(intensity = 0.5, duration = 0.5) {
    if (this.intensity < intensity) {
      this.intensity = intensity;
      this.duration = duration;
      this.decay = intensity / duration;
    }
  }

  // Updates the shake effect over time and returns an offset vector.
  update(deltaTime) {
    if (this.intensity > 0) {
      // Calculate the displacement for this frame
      const shakeAmount = this.intensity * 0.1; // Scale down for subtle effect
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * shakeAmount,
        (Math.random() - 0.5) * shakeAmount,
        (Math.random() - 0.5) * shakeAmount
      );

      // Decay intensity
      this.intensity -= this.decay * deltaTime;
      if (this.intensity <= 0) {
        this.intensity = 0;
      }
      
      return shakeOffset;
    }
    return null;
  }
}