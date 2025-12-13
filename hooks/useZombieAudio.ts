
import { useState, useEffect, useRef } from 'react';
import { Checkpoint } from '../types';

// Global singleton to track unlock state
let isAudioUnlocked = false;
let globalAudioCtx: AudioContext | null = null;

// Safe Audio Context Getter
const getAudioContext = () => {
    if (!globalAudioCtx) {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (Ctx) {
                globalAudioCtx = new Ctx();
            }
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }
    return globalAudioCtx;
};

export const unlockAudioEngine = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    
    // Play silent buffer to unlock iOS audio
    try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isAudioUnlocked = true;
        console.log("🔊 Audio Engine Unlocked");
    } catch (e) {
        // Ignore errors during unlock
    }
};

// Haversine distance
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const useZombieAudio = (
  userLocation: [number, number] | null,
  checkpoints: Checkpoint[],
  isZombieMode: boolean
) => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [nearestZombieDistance, setNearestZombieDistance] = useState<number | null>(null);
  
  // Refs for Audio Nodes
  const nodesRef = useRef<{
      mainGain: GainNode | null;
      droneOsc1: OscillatorNode | null;
      droneOsc2: OscillatorNode | null;
      tensionOsc: OscillatorNode | null;
      tensionGain: GainNode | null;
      dangerOsc: OscillatorNode | null;
      dangerGain: GainNode | null;
      lfo: OscillatorNode | null;
  }>({ 
      mainGain: null, droneOsc1: null, droneOsc2: null, 
      tensionOsc: null, tensionGain: null, 
      dangerOsc: null, dangerGain: null, lfo: null
  });

  // 1. Initialize Safe Audio Graph
  useEffect(() => {
    if (!isZombieMode) return;
    
    const ctx = getAudioContext();
    if (!ctx) return; // Fail gracefully if no audio support

    try {
        const now = ctx.currentTime;

        // Master Gain
        const mainGain = ctx.createGain();
        mainGain.gain.value = 0.8;
        mainGain.connect(ctx.destination);

        // A. DARK DRONE (Ambient) - Replaces Noise Buffer (Safer & Spookier)
        // Two low sine waves slightly detuned create a beating "horror" texture
        const droneOsc1 = ctx.createOscillator();
        droneOsc1.type = 'sine';
        droneOsc1.frequency.value = 55; // A1 (Low)
        
        const droneOsc2 = ctx.createOscillator();
        droneOsc2.type = 'triangle';
        droneOsc2.frequency.value = 58; // Detuned
        
        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.15; // Base volume

        droneOsc1.connect(droneGain);
        droneOsc2.connect(droneGain);
        droneGain.connect(mainGain);

        droneOsc1.start(now);
        droneOsc2.start(now);

        // B. TENSION (Proximity)
        const tensionOsc = ctx.createOscillator();
        tensionOsc.type = 'sawtooth';
        tensionOsc.frequency.value = 110; // A2
        const tensionFilter = ctx.createBiquadFilter();
        tensionFilter.type = 'lowpass';
        tensionFilter.frequency.value = 200;
        
        const tensionGain = ctx.createGain();
        tensionGain.gain.value = 0;

        tensionOsc.connect(tensionFilter);
        tensionFilter.connect(tensionGain);
        tensionGain.connect(mainGain);
        tensionOsc.start(now);

        // C. DANGER (Chase)
        const dangerOsc = ctx.createOscillator();
        dangerOsc.type = 'square';
        dangerOsc.frequency.value = 40; 
        
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 4; // Fast pulse
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 500; // Filter modulation depth

        const dangerFilter = ctx.createBiquadFilter();
        dangerFilter.type = 'lowpass';
        dangerFilter.Q.value = 10;

        const dangerGain = ctx.createGain();
        dangerGain.gain.value = 0;

        lfo.connect(lfoGain);
        lfoGain.connect(dangerFilter.frequency);
        dangerOsc.connect(dangerFilter);
        dangerFilter.connect(dangerGain);
        dangerGain.connect(mainGain);

        dangerOsc.start(now);
        lfo.start(now);

        // Save refs
        nodesRef.current = {
            mainGain,
            droneOsc1, droneOsc2,
            tensionOsc, tensionGain,
            dangerOsc, dangerGain, lfo
        };

    } catch (e) {
        console.warn("Audio Graph Init Failed", e);
    }

    // Watchdog
    const watchdog = setInterval(() => {
        if (ctx.state === 'running' && isAudioUnlocked) {
            // Watchdog ensures context stays alive, but we respect manual mute (audioEnabled)
        }
    }, 1000);

    return () => {
        clearInterval(watchdog);
        try {
            const { droneOsc1, droneOsc2, tensionOsc, dangerOsc, lfo } = nodesRef.current;
            // Stop safely
            [droneOsc1, droneOsc2, tensionOsc, dangerOsc, lfo].forEach(node => {
                if (node) {
                    try { node.stop(); } catch(e) {}
                    try { node.disconnect(); } catch(e) {}
                }
            });
        } catch (e) { /* Ignore cleanup errors */ }
    };
  }, [isZombieMode]);

  // 2. Toggle Wrapper
  const toggleAudio = () => {
      if (!audioEnabled) {
          unlockAudioEngine();
      }
      setAudioEnabled(prev => !prev);
  };

  // 3. Mixing Logic
  useEffect(() => {
    if (!isZombieMode) return; 

    // If muted, silence everything instantly
    if (!audioEnabled) {
        const { mainGain } = nodesRef.current;
        if (mainGain) mainGain.gain.setTargetAtTime(0, getAudioContext()?.currentTime || 0, 0.1);
        return;
    } else {
        // Restore master volume
        const { mainGain } = nodesRef.current;
        if (mainGain) mainGain.gain.setTargetAtTime(0.8, getAudioContext()?.currentTime || 0, 0.1);
    }

    // Find nearest threat
    const zombieNests = checkpoints.filter(cp => 
      (cp.points && cp.points < 0) || 
      cp.name.toLowerCase().includes('zombie') ||
      cp.name.toLowerCase().includes('nest') ||
      cp.name === 'STALKER'
    );

    let minDist = Infinity;
    
    if (userLocation && zombieNests.length > 0) {
        zombieNests.forEach(nest => {
        const dist = getDistanceMeters(
            userLocation[0], userLocation[1],
            nest.location.lat, nest.location.lng
        );
        if (dist < minDist) minDist = dist;
        });
        setNearestZombieDistance(minDist);
    } else {
        setNearestZombieDistance(null); 
        minDist = Infinity; 
    }

    // Mix Volumes
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        const rampTime = 0.5;

        const SAFE_THRESHOLD = 150;
        const DANGER_THRESHOLD = 40;

        let targetTension = 0;
        let targetDanger = 0;

        if (minDist < DANGER_THRESHOLD) {
            // RUN!
            const dangerFactor = 1 - (minDist / DANGER_THRESHOLD);
            targetDanger = 0.4 + (dangerFactor * 0.4); 
            targetTension = 0.2;
        } else if (minDist < SAFE_THRESHOLD) {
            // CREEPING
            const tensionFactor = 1 - ((minDist - DANGER_THRESHOLD) / (SAFE_THRESHOLD - DANGER_THRESHOLD));
            targetTension = tensionFactor * 0.6;
            targetDanger = 0;
        }

        const { tensionGain, dangerGain } = nodesRef.current;
        
        if (tensionGain) tensionGain.gain.setTargetAtTime(targetTension, now, rampTime);
        if (dangerGain) dangerGain.gain.setTargetAtTime(targetDanger, now, rampTime);

    } catch (e) {
        // Ignore mixing errors
    }

  }, [userLocation, checkpoints, isZombieMode, audioEnabled, nearestZombieDistance]);

  return { 
      toggleAudio, 
      nearestZombieDistance, 
      audioEnabled 
  };
};
