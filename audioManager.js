import * as THREE from 'three';

const SOUND_POOL_SIZE = 5;

export class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.audioLoader = new THREE.AudioLoader();
        this.soundBuffers = new Map();
        this.soundPool = new Map();
    }

    async loadSounds(soundsToLoad) {
        const promises = soundsToLoad.map(sound => {
            return new Promise((resolve, reject) => {
                this.audioLoader.load(sound.url,
                    (buffer) => {
                        this.soundBuffers.set(sound.name, buffer);
                        
                        // Create a pool of Audio objects for this sound
                        const pool = [];
                        for(let i = 0; i < SOUND_POOL_SIZE; i++) {
                            const audio = new THREE.Audio(this.listener);
                            audio.setBuffer(buffer);
                            pool.push(audio);
                        }
                        this.soundPool.set(sound.name, { pool, nextIndex: 0 });

                        console.log(`Loaded sound: ${sound.name}`);
                        resolve();
                    },
                    () => {}, // onProgress callback, not needed here
                    (error) => {
                        console.warn(`Failed to load sound: ${sound.name}`, error);
                        // Don't reject - just resolve to continue loading other sounds
                        resolve();
                    }
                );
            });
        });
        await Promise.all(promises);
    }

    playSound(name, volume = 0.5) {
        const soundData = this.soundPool.get(name);
        if (!soundData || soundData.pool.length === 0) {
            console.warn(`Sound "${name}" not found or not loaded.`);
            return;
        }
        
        // Get the next available sound from the pool
        const sound = soundData.pool[soundData.nextIndex];
        
        // Cycle through the pool
        soundData.nextIndex = (soundData.nextIndex + 1) % SOUND_POOL_SIZE;

        if (sound.isPlaying) {
            sound.stop();
        }
        
        sound.setVolume(volume);
        sound.play();
    }
}