
import React, { useState, useEffect } from 'react';
import { Skull, Radio, Crosshair, TriangleAlert, Box } from 'lucide-react';
import { GeminiService } from '../services/gemini';
import { RaceEvent, Checkpoint } from '../types';
import { INITIAL_RACE_STATE } from '../constants';

interface ExtractionGameButtonProps {
  onGameCreated: (event: RaceEvent) => void;
  userTier: string;
}

const LOADING_MESSAGES = [
  "Intercepting Radio Signals...",
  "Dropping Supply Crates...",
  "Deploying Zombie Hordes...",
  "Calibrating Flares...",
  "Marking Extraction Zones..."
];

export const ExtractionGameButton: React.FC<ExtractionGameButtonProps> = ({ onGameCreated, userTier }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsg(prev => {
        const idx = LOADING_MESSAGES.indexOf(prev);
        return LOADING_MESSAGES[(idx + 1) % LOADING_MESSAGES.length];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleStart = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("GPS unavailable.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await generateExtraction(latitude, longitude);
      },
      (err) => {
        console.error(err);
        setError("Kunde inte hitta din plats (GPS Timeout).");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000 } // Timeout added
    );
  };

  // Helper to create offsets
  const createOffset = (lat: number, lng: number, latOffsetMeters: number, lngOffsetMeters: number) => {
      const earthRadius = 6378137;
      const dLat = latOffsetMeters / earthRadius;
      const dLng = lngOffsetMeters / (earthRadius * Math.cos(Math.PI * lat / 180));
      return {
          lat: lat + (dLat * 180 / Math.PI),
          lng: lng + (dLng * 180 / Math.PI)
      };
  };

  const generateExtraction = async (lat: number, lng: number) => {
      // Procedural Generation (Faster than AI for this specific structured mode)
      const checkpoints: Checkpoint[] = [];
      
      // 1. Create 4 Radio Parts (Random scatter ~100-300m)
      for (let i = 0; i < 4; i++) {
          const r = 100 + Math.random() * 200;
          const theta = Math.random() * 2 * Math.PI;
          const zLat = r * Math.cos(theta);
          const zLng = r * Math.sin(theta);
          const loc = createOffset(lat, lng, zLat, zLng);

          checkpoints.push({
              id: `radio-${i}`,
              name: `Radio Part ${['Alpha', 'Beta', 'Gamma', 'Delta'][i]}`,
              location: loc,
              radiusMeters: 25,
              type: 'mandatory',
              points: 50,
              color: '#3b82f6', // Blue
              description: 'Collect this part to enable extraction.'
          });
      }

      // 2. Create 3 Supply Crates (Closer, ~50-150m)
      for (let i = 0; i < 3; i++) {
          const r = 50 + Math.random() * 100;
          const theta = Math.random() * 2 * Math.PI;
          const zLat = r * Math.cos(theta);
          const zLng = r * Math.sin(theta);
          const loc = createOffset(lat, lng, zLat, zLng);

          checkpoints.push({
              id: `supply-${i}`,
              name: 'Supply Crate',
              location: loc,
              radiusMeters: 20,
              type: 'optional',
              points: 10,
              color: '#F59E0B', // Orange
              description: 'Contains Survival Gear (Medkit or Flare).'
          });
      }

      const finalEvent: RaceEvent = {
        ...INITIAL_RACE_STATE,
        name: "Operation: Extraction",
        description: "Hitta 4 radiodelar för att kalla på helikoptern. Akta dig för giftmoln och bakhåll. Använd Flares för att överleva.",
        checkpoints: checkpoints,
        category: 'Extraction',
        mapStyle: 'dark',
        id: `extraction-${Date.now()}`,
        status: 'active', // Auto-activate
        startDateTime: new Date().toISOString(), // Start now
        startMode: 'self_start',
        winCondition: 'most_points', // Score based
        startLocation: { lat, lng },
        finishLocation: { lat, lng, radiusMeters: 50 }, // Placeholder, updated later
      } as RaceEvent;

      setLoading(false);
      onGameCreated(finalEvent);
  };

  return (
    <>
        <button
            onClick={handleStart}
            disabled={loading}
            className={`group relative w-full overflow-hidden rounded-xl border border-yellow-600/50 bg-gray-900 p-6 transition-all hover:border-yellow-500 hover:shadow-[0_0_40px_rgba(234,179,8,0.3)] active:scale-[0.98] ${loading ? 'cursor-not-allowed opacity-80' : ''}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/50 to-black opacity-80"></div>
            
            {loading && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                    <Radio className="w-12 h-12 text-yellow-500 animate-[pulse_1s_linear_infinite]" />
                    <div className="mt-4 font-mono text-yellow-500 text-sm font-bold uppercase tracking-widest animate-pulse">
                        {loadingMsg}
                    </div>
                 </div>
            )}

            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 bg-yellow-900/30 shadow-inner ${loading ? 'border-yellow-500 animate-pulse' : 'border-yellow-700 group-hover:border-yellow-500'}`}>
                        <Crosshair className={`h-8 w-8 text-yellow-500 ${loading ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-yellow-500 transition-colors">
                            Operation Extraction
                        </h3>
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-400/80">
                            <Box className="h-3 w-3" />
                            Park Mode • Chaos Engine
                        </p>
                    </div>
                </div>
                
                <div className="hidden sm:block">
                     <span className="rounded-lg border border-yellow-900/30 bg-yellow-900/10 px-3 py-1 text-xs font-bold text-yellow-500 group-hover:bg-yellow-600 group-hover:text-black transition-colors">
                        INFILTRATE
                     </span>
                </div>
            </div>
        </button>
        
        {error && (
             <div className="mt-2 flex items-center gap-2 text-xs font-bold text-red-500 bg-red-950/30 p-2 rounded border border-red-900">
                 <TriangleAlert className="w-4 h-4" />
                 {error}
             </div>
        )}
    </>
  );
};
