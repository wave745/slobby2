import * as THREE from 'three';

// Manages the environmental lighting and sky colors over a smooth cycle.
const CYCLE_DURATION = 120; // 120 seconds for a full day-night cycle

// Define key time points in the cycle (0.0 to 1.0)
const TIME_POINTS = {
  NIGHT: 0,
  SUNRISE: 0.25,
  DAY: 0.5,
  SUNSET: 0.75,
};

// Define color palettes for sky and lights at each key time
const COLORS = {
  SKY: {
    // Dark green, matching the slobby image atmosphere
    NIGHT: new THREE.Color(0x0a140a),
    SUNRISE: new THREE.Color(0x0a140a),
    DAY: new THREE.Color(0x0a140a),
    SUNSET: new THREE.Color(0x0a140a),
  },
  AMBIENT: {
    // Dark cyan ambient light for a moody feel
    NIGHT: new THREE.Color(0x004d40),
    SUNRISE: new THREE.Color(0x004d40),
    DAY: new THREE.Color(0x004d40),
    SUNSET: new THREE.Color(0x004d40),
  },
  DIRECTIONAL: {
    // Bright cyan directional light for highlights
    NIGHT: new THREE.Color(0x4dd0e1),
    SUNRISE: new THREE.Color(0x4dd0e1),
    DAY: new THREE.Color(0x4dd0e1),
    SUNSET: new THREE.Color(0x4dd0e1),
  },
};

export class DayNightCycleManager {
  constructor(scene, ambientLight, directionalLight) {
    this.scene = scene;
    this.ambientLight = ambientLight;
    this.directionalLight = directionalLight;
    this.currentTime = 0; // Current time in the cycle (0.0 to 1.0)
  }

  update(deltaTime) {
    // Advance the time
    this.currentTime = (this.currentTime + deltaTime / CYCLE_DURATION) % 1;

    // Get interpolated colors and intensities for the current time
    const ambientColor = this.getInterpolatedColor(COLORS.AMBIENT);
    const directionalColor = this.getInterpolatedColor(COLORS.DIRECTIONAL);

    const dayIntensity = this.getDayIntensity();

    // Update scene background and fog color
    // this.scene.background is no longer set here

    // Update light colors and intensities
    this.ambientLight.color.copy(ambientColor);
    this.ambientLight.intensity = dayIntensity * 0.4 + 0.2; // Maintain a base light level

    this.directionalLight.color.copy(directionalColor);
    this.directionalLight.intensity = dayIntensity * 0.8 + 0.2; // Main light intensity

    // Animate the "sun" position
    const sunAngle = this.currentTime * Math.PI * 2 - Math.PI / 2;
    this.directionalLight.position.set(
      0, // Keep sun centered for this effect
      Math.sin(sunAngle) * 30,
      Math.cos(sunAngle) * 30
    );
  }

  // Helper to get an interpolated color from a color set based on current time
  getInterpolatedColor(colorSet) {
    let startTime, endTime, startColor, endColor;

    if (this.currentTime >= TIME_POINTS.NIGHT && this.currentTime < TIME_POINTS.SUNRISE) {
      startTime = TIME_POINTS.NIGHT; endTime = TIME_POINTS.SUNRISE;
      startColor = colorSet.NIGHT; endColor = colorSet.SUNRISE;
    } else if (this.currentTime >= TIME_POINTS.SUNRISE && this.currentTime < TIME_POINTS.DAY) {
      startTime = TIME_POINTS.SUNRISE; endTime = TIME_POINTS.DAY;
      startColor = colorSet.SUNRISE; endColor = colorSet.DAY;
    } else if (this.currentTime >= TIME_POINTS.DAY && this.currentTime < TIME_POINTS.SUNSET) {
      startTime = TIME_POINTS.DAY; endTime = TIME_POINTS.SUNSET;
      startColor = colorSet.DAY; endColor = colorSet.SUNSET;
    } else { // Sunset to Night
      startTime = TIME_POINTS.SUNSET; endTime = 1.0;
      startColor = colorSet.SUNSET; endColor = colorSet.NIGHT;
    }

    const t = (this.currentTime - startTime) / (endTime - startTime);
    return new THREE.Color().copy(startColor).lerp(endColor, t);
  }

  // Calculate a 0-1 intensity value based on how "daytime" it is
  getDayIntensity() {
    // This creates a smooth curve peaking at DAY and dipping at NIGHT
    return (Math.sin((this.currentTime - TIME_POINTS.NIGHT) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  }
}