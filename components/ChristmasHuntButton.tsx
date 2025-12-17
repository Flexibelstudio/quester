import React, { useState, useEffect } from 'react';
import { Gift, Snowflake, Home, Trees, Mountain, Trophy, ArrowRight, X } from 'lucide-react';
import { RaceEvent, Checkpoint } from '../types';
import { INITIAL_RACE_STATE } from '../constants';

interface ChristmasHuntButtonProps {
  onGameCreated: (event: RaceEvent) => void;
  userTier: string;
  isGuest?: boolean;
  onAuthRequired?: () => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  onShowLeaderboard?: () => void;
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
  const [viewMode, setViewMode] = useState<'cover' | 'config'>('cover');

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

  useEffect(() => {
      if (autoStart && !loading && !error) {
          handleStart('medium');
          if (onAutoStartConsumed) onAutoStartConsumed();
      }
  }, [autoStart]);

  const handleStart = (selectedScale: GameScale) => {
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
        await generateHunt(latitude, longitude, selectedScale);
      },
      (err) => {
        console.error(err);
        setError("GPS access denied.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const generateHunt = async (lat: number, lng: number, currentScale: GameScale) => {
    const params = currentScale === 'small' ? { minDist: 40, maxDist: 100, fireMin: 20, fireMax: 50 } : 
                  currentScale === 'large' ? { minDist: 300, maxDist: 600, fireMin: 150, fireMax: 300 } : 
                  { minDist: 150, maxDist: 300, fireMin: 80, fireMax: 150 };
    
    const checkpoints: Checkpoint[] = [];
    const createOffset = (lat: number, lng: number, distanceMeters: number, angleRad: number) => ({
        lat: lat + (distanceMeters * Math.cos(angleRad)) / 111132,
        lng: lng + (distanceMeters * Math.sin(angleRad)) / (111132 * Math.cos(lat * Math.PI / 180))
    });

    const numGifts = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numGifts; i++) {
        checkpoints.push({
            id: `gift-${i}-${Date.now()}`,
            name: `Stolen Gift #${i + 1}`,
            location: createOffset(lat, lng, params.minDist + Math.random() * (params.maxDist - params.minDist), Math.random() * 2 * Math.PI),
            radiusMeters: 20,
            type: 'mandatory',
            points: 500,
            color: '#f87171'
        });
    }
    for (let i = 0; i < 2; i++) {
        checkpoints.push({
            id: `fire-${i}-${Date.now()}`,
            name: "Eldstad (Värme)",
            location: createOffset(lat, lng, params.fireMin + Math.random() * (params.fireMax - params.fireMin), (i * Math.PI) + (Math.random() * Math.PI / 2)),
            radiusMeters: 20,
            type: 'optional',
            points: 0,
            color: '#f97316'
        });
    }

    const finalEvent: RaceEvent = {
        ...INITIAL_RACE_STATE,
        id: `xmas-${Date.now()}`,
        name: `The Great Christmas Hunt`,
        description: `Rädda julen!`,
        category: 'Christmas Hunt',
        status: 'active',
        startDateTime: new Date().toISOString(),
        startMode: 'self_start',
        winCondition: 'most_points', 
        startLocation: { lat, lng },
        finishLocation: { lat, lng, radiusMeters: 50 },
        checkpoints: checkpoints,
        isInstantGame: true,
        mapStyle: 'standard' 
    } as RaceEvent;

    setTimeout(() => { setLoading(false); onGameCreated(finalEvent); }, 2000);
  };

  return (
    <div 
        onClick={() => { if (!loading && viewMode === 'cover') setViewMode('config'); }}
        className={`relative w-full overflow-hidden rounded-xl border border-blue-900/50 bg-slate-900 px-6 py-4 min-h-[120px] transition-all shadow-lg flex flex-col justify-center
            ${viewMode === 'cover' ? 'hover:border-blue-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] cursor-pointer group' : 'border-blue-500/50'}
            ${loading ? 'cursor-not-allowed opacity-80' : ''}
        `}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 to-slate-950 opacity-80 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/snow.png')] opacity-10 pointer-events-none"></div>
        
        {loading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center rounded-xl">
                <Snowflake className="w-8 h-8 text-blue-300 animate-[spin_3s_linear_infinite] mb-2" />
                <div className="font-mono text-blue-300 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                    {loadingMsg}
                </div>
            </div>
        )}

        {/* TOP LEFT LEADERBOARD */}
        {onShowLeaderboard && !loading && viewMode === 'cover' && (
            <div className="absolute top-2 left-2 z-20">
                <button
                    onClick={(e) => { e.stopPropagation(); onShowLeaderboard(); }}
                    className="flex items-center gap-1 text-[8px] font-bold text-yellow-500/80 bg-black/40 hover:bg-black/80 hover:text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-900/30 transition-all backdrop-blur-sm"
                >
                    <Trophy className="w-2.5 h-2.5" /> Topplista
                </button>
            </div>
        )}

        {/* CLOSE CONFIG */}
        {viewMode === 'config' && !loading && (
             <div className="absolute top-2 right-2 z-30">
                <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('cover'); }}
                    className="p-1 rounded-full bg-black/40 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        )}

        <div className="relative z-10 w-full">
            {viewMode === 'cover' ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 bg-blue-950/40 shadow-inner border-blue-900 group-hover:border-blue-400 transition-colors`}>
                            <Gift className={`h-7 w-7 text-blue-400 group-hover:text-white transition-colors`} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-black italic uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors leading-none mb-2">
                                Christmas Hunt
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-blue-400/70 uppercase tracking-widest">Intensitet:</span>
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                                    <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700/50"></div>
                                    <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700/50"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                         <span className="inline-block rounded-full border border-blue-400/30 bg-blue-900/10 px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all shadow-lg">
                            STARTA JAKTEN
                         </span>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h4 className="text-center text-white font-black uppercase tracking-widest mb-4 text-[10px] opacity-70">Välj Storlek</h4>
                    <div className="flex gap-2">
                        <button onClick={() => handleStart('small')} className="flex-1 flex flex-col items-center p-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-blue-900/40 hover:border-blue-500 transition-all group">
                            <Home className="w-4 h-4 text-slate-400 group-hover:text-blue-400 mb-1" />
                            <span className="font-bold text-white text-[10px]">LITEN</span>
                        </button>
                        <button onClick={() => handleStart('medium')} className="flex-1 flex flex-col items-center p-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-blue-900/40 hover:border-blue-500 transition-all group">
                            <Trees className="w-4 h-4 text-slate-400 group-hover:text-blue-400 mb-1" />
                            <span className="font-bold text-white text-[10px]">MEDIUM</span>
                        </button>
                        <button onClick={() => handleStart('large')} className="flex-1 flex flex-col items-center p-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-blue-900/40 hover:border-blue-500 transition-all group">
                            <Mountain className="w-4 h-4 text-slate-400 group-hover:text-blue-400 mb-1" />
                            <span className="font-bold text-white text-[10px]">STOR</span>
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-2 text-[10px] font-bold text-red-400 bg-red-950/50 p-2 rounded border border-red-900/50">
                    {error}
                </div>
            )}
        </div>
    </div>
  );
};