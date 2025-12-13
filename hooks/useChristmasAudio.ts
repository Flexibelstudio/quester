
import { useState, useEffect, useRef } from 'react';
import { Checkpoint } from '../types';

// Helper: Haversine distance
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Global Audio Context Singleton
let globalAudioCtx: AudioContext | null = null;
const getAudioContext = () => {
    if (!globalAudioCtx) {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (Ctx) globalAudioCtx = new Ctx();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }
    return globalAudioCtx;
};

export const useChristmasAudio = (
  userLocation: [number, number] | null,
  checkpoints: Checkpoint[], // Treats checkpoints as sound sources (Grinches/Gifts)
  isChristmasMode: boolean
) => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  
  // Audio Nodes Refs
  const nodesRef = useRef<{
      mainGain: GainNode | null;
      windGain: GainNode | null;
      windSource: AudioBufferSourceNode | null;
  }>({ 
      mainGain: null, windGain: null, windSource: null
  });

  const timerRef = useRef<any>(null);

  // 1. Initialize Audio Graph (Wind / Atmosphere)
  useEffect(() => {
    if (!isChristmasMode) return;
    
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;

        // Master Gain
        const mainGain = ctx.createGain();
        mainGain.gain.value = 0.0; // Start silent
        mainGain.connect(ctx.destination);

        // --- WIND GENERATOR ---
        // Create 2 seconds of white noise
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const windSource = ctx.createBufferSource();
        windSource.buffer = buffer;
        windSource.loop = true;

        // Filter the noise to make it sound like wind (Lowpass)
        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 400; // Base cutoff
        windFilter.Q.value = 1;

        // Modulate the filter to simulate gusts
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // Slow gusts (10 seconds cycle)
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 300; // How much to change the filter freq

        lfo.connect(lfoGain);
        lfoGain.connect(windFilter.frequency); // Modulate cutoff

        const windGain = ctx.createGain();
        windGain.gain.value = 0.15; // Atmosphere volume

        windSource.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(mainGain);

        windSource.start(now);
        lfo.start(now);

        nodesRef.current = { mainGain, windGain, windSource };

    } catch (e) {
        console.warn("Christmas Audio Init Failed", e);
    }

    return () => {
        try {
            if (nodesRef.current.windSource) nodesRef.current.windSource.stop();
            if (nodesRef.current.mainGain) nodesRef.current.mainGain.disconnect();
        } catch(e) {}
    };
  }, [isChristmasMode]);

  // 2. Play Bell Sound (One "Ding")
  const playBell = (intensity: number) => {
      const ctx = getAudioContext();
      if (!ctx || !audioEnabled) return;

      const t = ctx.currentTime;
      const master = nodesRef.current.mainGain;
      if (!master) return;

      // High Sine Wave (Fundamental)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 1500; // C6 approx
      
      // Detuned Overtone (Magical feel)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 3000; // Octave up
      
      const gain = ctx.createGain();
      
      // Envelope: Fast attack, exponential decay (Like hitting metal)
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3 * intensity, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(master);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 1);
      osc2.stop(t + 1);
  };

  // 3. Logic Loop (Distance & Rhythm)
  useEffect(() => {
      if (!isChristmasMode || !userLocation) return;

      // Calculate nearest Grinch/Gift
      const targets = checkpoints.filter(cp => cp.type === 'mandatory' || cp.name.includes('Gift')); // Standard logic for this mode
      
      let minDist = Infinity;
      targets.forEach(cp => {
          const d = getDistanceMeters(userLocation[0], userLocation[1], cp.location.lat, cp.location.lng);
          if (d < minDist) minDist = d;
      });
      setNearestDistance(minDist);

      // Rhythm Logic
      if (timerRef.current) clearTimeout(timerRef.current);

      if (audioEnabled) {
          // Determine interval based on distance
          let interval = 0;
          let intensity = 0;

          if (minDist < 20) {
              interval = 250; // Very fast (Panic/Close)
              intensity = 1.0;
          } else if (minDist < 60) {
              interval = 600; // Medium
              intensity = 0.8;
          } else if (minDist < 120) {
              interval = 1500; // Slow
              intensity = 0.5;
          }

          if (interval > 0) {
              const loop = () => {
                  playBell(intensity);
                  timerRef.current = setTimeout(loop, interval);
              };
              loop();
          }
      }

      return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
      };
  }, [userLocation, checkpoints, isChristmasMode, audioEnabled]);

  // 4. Toggle Volume
  const toggleAudio = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      
      setAudioEnabled(prev => {
          const next = !prev;
          if (nodesRef.current.mainGain) {
              // Fade in/out
              const t = ctx?.currentTime || 0;
              nodesRef.current.mainGain.gain.setTargetAtTime(next ? 1.0 : 0.0, t, 0.5);
          }
          return next;
      });
  };

  return {
      toggleAudio,
      audioEnabled,
      nearestDistance
  };
};
