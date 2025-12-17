
import React, { useState, useEffect } from 'react';
import { Gift, Snowflake, RefreshCw, TriangleAlert, Home, Trees, Mountain, Trophy } from 'lucide-react';
import { RaceEvent, Checkpoint } from '../types';
import { INITIAL_RACE_STATE } from '../constants';

interface ChristmasHuntButtonProps {
  onGameCreated: (event: RaceEvent) => void;
  userTier: string;
  isGuest?: boolean;
  onAuthRequired?: () => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  onShowLeaderboard?: () => void; // New prop
}

const LOADING_MESSAGES = [
  "Slår in paket...",
  "Kallar på Grinchar...",
  "Tänder brasorna...",
  "Fryser marken...",
  "Gömmer julklapparna..."
];

type GameScale = 'small' | 'medium' | 'large';

export const ChristmasHuntButton: React.FC<ChristmasHuntButtonProps> = ({ 
    onGameCreated, 
    userTier, 
    isGuest, 
    onAuthRequired, 
    autoStart, 
    onAutoStartConsumed,
    onShowLeaderboard
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<GameScale>('medium');

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

  // Handle Auto-Start after login
  useEffect(() => {
      if (autoStart && !loading && !error) {
          handleStart();
          if (onAutoStartConsumed) onAutoStartConsumed();
      }
  }, [autoStart]);

  const handleStart = () => {
    // 1. Auth Gate
    if (isGuest && onAuthRequired) {
        onAuthRequired();
        return;
    }

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
        await generateHunt(latitude, longitude);
      },
      (err) => {
        console.error(err);
        setError("GPS access denied.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const getScaleParams = (s: GameScale) => {
      switch(s) {
          case 'small': return { 
              minDist: 40, maxDist: 100, 
              fireMin: 20, fireMax: 50,
              desc: 'Bakgården (Litet)' 
          };
          case 'large': return { 
              minDist: 300, maxDist: 600, 
              fireMin: 150, fireMax: 300,
              desc: 'Skogen (Stort)' 
          };
          default: return { 
              minDist: 150, maxDist: 300, 
              fireMin: 80, fireMax: 150,
              desc: 'Parken (Medium)' 
          };
      }
  };

  // Helper to create offset coordinate
  const createOffset = (lat: number, lng: number, distanceMeters: number, angleRad: number) => {
      // 1 degree lat ~ 111132 meters
      const dLat = (distanceMeters * Math.cos(angleRad)) / 111132;
      // 1 degree lng ~ 111132 * cos(lat) meters
      const dLng = (distanceMeters * Math.sin(angleRad)) / (111132 * Math.cos(lat * Math.PI / 180));
      
      return {
          lat: lat + dLat,
          lng: lng + dLng
      };
  };

  const generateHunt = async (lat: number, lng: number) => {
    const params = getScaleParams(scale);
    const checkpoints: Checkpoint[] = [];

    // 1. Generate GIFTS (5-7 items)
    const numGifts = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numGifts; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const dist = params.minDist + Math.random() * (params.maxDist - params.minDist);
        const loc = createOffset(lat, lng, dist, angle);

        checkpoints.push({
            id: `gift-${i}-${Date.now()}`,
            name: `Stolen Gift #${i + 1}`,
            location: loc,
            radiusMeters: 20,
            type: 'mandatory',
            points: 500,
            color: '#f87171', // Red
            description: "A Grinch is guarding this gift. Chase them down to reclaim it!"
        });
    }

    // 2. Generate BONFIRES (2 items)
    for (let i = 0; i < 2; i++) {
        // Place bonfires slightly apart (offset angle by at least 90 deg)
        const angle = (i * Math.PI) + (Math.random() * Math.PI / 2); 
        const dist = params.fireMin + Math.random() * (params.fireMax - params.fireMin);
        const loc = createOffset(lat, lng, dist, angle);

        checkpoints.push({
            id: `fire-${i}-${Date.now()}`,
            name: "Eldstad (Värme)",
            location: loc,
            radiusMeters: 20,
            type: 'optional',
            points: 0,
            color: '#f97316', // Orange
            description: "SAFE ZONE. Regenerate warmth here."
        });
    }

    const finalEvent: RaceEvent = {
        ...INITIAL_RACE_STATE,
        id: `xmas-${Date.now()}`,
        name: `The Great Christmas Hunt (${scale.toUpperCase()})`,
        description: `The Grinch's helpers have stolen the presents! Use the map to find gifts. CAUTION: It's freezing! Return to the Sleigh (Start) or find a Bonfire (Eldstad) to warm up.`,
        category: 'Christmas Hunt',
        status: 'active',
        startDateTime: new Date().toISOString(),
        startMode: 'self_start',
        winCondition: 'most_points', 
        startLocation: { lat, lng },
        finishLocation: { lat, lng, radiusMeters: 50 },
        checkpoints: checkpoints,
        isInstantGame: true,
        // Ensure mapStyle is standard so snow overlay works best
        mapStyle: 'standard' 
    } as RaceEvent;

    // Simulate delay for effect
    setTimeout(() => {
        setLoading(false);
        onGameCreated(finalEvent);
    }, 2000);
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-blue-200/50 bg-slate-900 p-6 transition-all shadow-lg`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-950 opacity-80 pointer-events-none"></div>
        
        {loading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center rounded-xl">
                <Snowflake className="w-12 h-12 text-blue-300 animate-[spin_3s_linear_infinite]" />
                <div className="mt-4 font-mono text-blue-300 text-sm font-bold uppercase tracking-widest animate-pulse">
                    {loadingMsg}
                </div>
                </div>
        )}

        <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 bg-blue-950/50 shadow-inner border-blue-800`}>
                    <Gift className={`h-7 w-7 text-blue-400`} />
                </div>
                <div className="text-left">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                        Christmas Hunt
                    </h3>
                    
                    {/* INTENSITY METER */}
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Intensitet:</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_green]"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scale Selector */}
            <div className="mb-6">
                <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2 block">Välj Områdesstorlek</label>
                <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => setScale('small')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${scale === 'small' ? 'bg-blue-600 border-white text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Home className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Bakgård</span>
                    </button>
                    <button 
                        onClick={() => setScale('medium')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${scale === 'medium' ? 'bg-blue-600 border-white text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Trees className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Park</span>
                    </button>
                    <button 
                        onClick={() => setScale('large')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${scale === 'large' ? 'bg-blue-600 border-white text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Mountain className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Skog</span>
                    </button>
                </div>
            </div>
            
            {/* Action Button */}
            <button
                onClick={handleStart}
                disabled={loading}
                className="w-full py-3 rounded-lg border border-blue-400 bg-blue-600 text-sm font-bold text-white shadow-lg hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <Snowflake className="w-4 h-4" /> STARTA SPELET
            </button>
            
            {/* LEADERBOARD BUTTON */}
            {onShowLeaderboard && !loading && (
                <div className="absolute top-2 right-2 z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); onShowLeaderboard(); }}
                        className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full border border-yellow-600/30 transition-colors"
                    >
                        <Trophy className="w-3 h-3" /> Topplista
                    </button>
                </div>
            )}

            {error && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-red-400 bg-red-950/50 p-2 rounded border border-red-900/50">
                    <TriangleAlert className="w-4 h-4" />
                    {error}
                    </div>
            )}
        </div>
    </div>
  );
};
