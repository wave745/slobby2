import * as THREE from 'three';
import TWEEN from 'tween.js';
import { ThirdPersonCameraController } from './rosieControls.js';
import { CameraShake } from './cameraShake.js';
export class CameraManager {
  constructor(game, camera, domElement) {
    this.game = game;
    this.camera = camera;
    this.domElement = domElement;
    this.mode = 'initial'; // initial, spectator, player, swoop, winner
    this.thirdPersonController = null;
    this.playerTarget = null;
    this.swoopTween = null;
    this.winnerOrbitAngle = 0;
    this.cameraShake = new CameraShake();
    this.previousMode = 'initial'; // To store state before a temporary focus
    this.focusTimeout = null;      // To manage the temporary focus duration
    this.setMode('initial');
  }
  setMode(mode, target = null) {
    // Stop any ongoing animation when changing modes
    if (this.swoopTween) {
      this.swoopTween.stop();
      this.swoopTween = null;
    }
    // Clear any pending focus timeout when changing modes
    if (this.focusTimeout) {
        clearTimeout(this.focusTimeout);
        this.focusTimeout = null;
    }
    this.mode = mode;
    if (this.thirdPersonController) {
        this.thirdPersonController.disable();
    }
    switch (mode) {
      case 'initial':
        this.camera.position.set(0, 15, -30);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'spectator':
        // Spectator logic is handled in update()
        break;
      case 'player':
        if (this.playerTarget) {
            this.createThirdPersonController(this.playerTarget);
            this.thirdPersonController.enable();
        }
        break;
      case 'swoop':
        if (this.thirdPersonController) this.thirdPersonController.disable();
        break;
      case 'winner':
        if (this.thirdPersonController) this.thirdPersonController.disable();
        if (target) {
            this.playerTarget = target;
        }
        this.winnerOrbitAngle = this.camera.rotation.y; // Start orbit from current angle
        break;
        break;
      case 'focus':
        // The logic for 'focus' is handled in the focusOnTarget method
        break;
    }
  }

  setTarget(snail) {
    this.playerTarget = snail;
    // If we are already in player mode, create the controller immediately.
    if (this.mode === 'player') {
      this.createThirdPersonController(snail);
      this.thirdPersonController.enable();
    }
  }

  createThirdPersonController(target) {
    if (this.thirdPersonController) {
        // We might just be updating the target
        this.thirdPersonController.target = target;
    } else {
        this.thirdPersonController = new ThirdPersonCameraController(
            this.camera, 
            target, 
            this.domElement,
            { distance: 12, height: 8, rotationSpeed: 0.002 }
        );
    }
  }
  
  focusOnTarget(target, duration) {
      if (this.mode === 'focus') return; // Already focusing
      this.previousMode = this.mode; // Save current mode
      this.setMode('focus');
      // Smoothly move the camera to the new target
      const startPosition = this.camera.position.clone();
      const endPosition = new THREE.Vector3();
      const lookAtStart = new THREE.Vector3();
      this.camera.getWorldDirection(lookAtStart).add(this.camera.position);
      const lookAtEnd = new THREE.Vector3();
      const tween = new TWEEN.Tween({ t: 0 })
          .to({ t: 1 }, 500) // 0.5 second transition
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(({ t }) => {
              // Calculate target position for focus view
              const targetPos = target.getPosition();
              endPosition.set(targetPos.x, targetPos.y + 8, targetPos.z + 12);
              lookAtEnd.set(targetPos.x, targetPos.y + 1, targetPos.z);
              this.camera.position.lerpVectors(startPosition, endPosition, t);
              this.camera.lookAt(lookAtStart.clone().lerp(lookAtEnd, t));
          })
          .start();
      // Set a timeout to return to the previous camera mode
      this.focusTimeout = setTimeout(() => {
          this.setMode(this.previousMode, this.playerTarget);
          this.focusTimeout = null;
      }, duration);
  }
  startRaceSwoop(onCompleteCallback) {
    this.setMode('swoop');
    const fromPos = this.camera.position.clone();
    // A temporary object to tween the lookAt target
    const lookAtCurrent = new THREE.Vector3(0, 0, 0); // Assuming initial lookAt is the origin
    this.camera.lookAt(lookAtCurrent);
    // Define path for the camera position
    const path = new THREE.CatmullRomCurve3([
        fromPos,
        new THREE.Vector3(0, 25, -45), // High above start line
        new THREE.Vector3(15, 8, -10), // Swooping down the side
        new THREE.Vector3(-10, 10, 30), // Crossing over track towards finish
        new THREE.Vector3(0, 25, 65) // Ending point matching spectator view
    ]);
    
    // Define path for the lookAt point
    const lookAtPath = new THREE.CatmullRomCurve3([
        lookAtCurrent,
        new THREE.Vector3(0, 2, -30), // Look at start line
        new THREE.Vector3(0, 2, 0),    // Look at middle of track
        new THREE.Vector3(0, 2, 45),    // Look towards finish line
        new THREE.Vector3(0, 0, 0)     // Hold look at center of track
    ]);
    this.game.audioManager.playSound('whoosh', 0.8);
    this.swoopTween = new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 4000) // 4-second animation
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(({ t }) => {
        const camPos = path.getPointAt(t);
        const lookAtPos = lookAtPath.getPointAt(t);
        this.camera.position.copy(camPos);
        this.camera.lookAt(lookAtPos);
      })
      .onComplete(() => {
        this.swoopTween = null;
        if (onCompleteCallback) {
          onCompleteCallback(); // This will set the final camera mode (player/spectator)
        }
      })
      .start();
  }
  
  update(deltaTime) {
    TWEEN.update(); // The TWEEN loop needs to be called every frame
    // Only run default camera logic if not in a swoop animation
    if (this.mode === 'spectator') {
      // Position camera behind the finish line for a full track view
      this.camera.position.set(0, 25, 65);
      this.camera.lookAt(0, 0, 0); // Look at the center of the track
    } else if (this.mode === 'player' && this.thirdPersonController) {
      this.thirdPersonController.update();
    } else if (this.mode === 'focus') {
      // While focusing, the camera is managed by the TWEEN animation.
      // No extra updates are needed here unless we want continuous tracking,
      // but a static focus shot is fine for this feature.
    } else if (this.mode === 'winner' && this.playerTarget) {
      this.winnerOrbitAngle += deltaTime * 0.4; // Orbit speed
      const orbitDistance = 10;
      const orbitHeight = 5;
      const targetPosition = this.playerTarget.getPosition();
      
      this.camera.position.x = targetPosition.x + Math.sin(this.winnerOrbitAngle) * orbitDistance;
      this.camera.position.y = targetPosition.y + orbitHeight;
      this.camera.position.z = targetPosition.z + Math.cos(this.winnerOrbitAngle) * orbitDistance;
      
      this.camera.lookAt(targetPosition.x, targetPosition.y + 1, targetPosition.z);
    }
    const shakeOffset = this.cameraShake.update(deltaTime);
    if (shakeOffset) {
      this.camera.position.add(shakeOffset);
    }
  }
}