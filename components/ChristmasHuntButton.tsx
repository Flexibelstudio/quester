
import React, { useState, useEffect } from 'react';
import { Gift, Snowflake, RefreshCw, TriangleAlert, Home, Trees, Mountain } from 'lucide-react';
import { GeminiService } from '../services/gemini';
import { RaceEvent } from '../types';
import { INITIAL_RACE_STATE } from '../constants';

interface ChristmasHuntButtonProps {
  onGameCreated: (event: RaceEvent) => void;
  userTier: string;
  isGuest?: boolean;
  onAuthRequired?: () => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
}

const LOADING_MESSAGES = [
  "Wrapping Gifts...",
  "Summoning Grinches...",
  "Light up the Bonfires...",
  "Freezing Terrain...",
  "Hiding Presents..."
];

type GameScale = 'small' | 'medium' | 'large';

export const ChristmasHuntButton: React.FC<ChristmasHuntButtonProps> = ({ 
    onGameCreated, 
    userTier, 
    isGuest, 
    onAuthRequired, 
    autoStart, 
    onAutoStartConsumed 
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
              giftRange: '40-100m', 
              fireRange: '20-50m',
              desc: 'Bakgården (Litet)' 
          };
          case 'large': return { 
              giftRange: '300-600m', 
              fireRange: '150-300m',
              desc: 'Skogen (Stort)' 
          };
          default: return { 
              giftRange: '150-300m', 
              fireRange: '80-150m',
              desc: 'Parken (Medium)' 
          };
      }
  };

  const generateHunt = async (lat: number, lng: number) => {
    let generatedData: Partial<RaceEvent> = {};
    const params = getScaleParams(scale);

    const gemini = new GeminiService(
      (data) => { generatedData = { ...generatedData, ...data }; },
      () => {}
    );

    gemini.startNewSession('CREATOR');

    const prompt = `
      ROLE: You are the 'Holiday Architect'.
      TASK: Create a 'Christmas Hunt' (Juljakten) Pursuit Game using update_race_plan.
      CONTEXT: User Start Location: { lat: ${lat}, lng: ${lng} }.
      SCALE: ${params.desc}.
      
      INSTRUCTIONS:
      1. GENERATE GEOGRAPHY:
         - Start/Finish: Use provided coordinates.
         - **CHECKPOINTS (GIFTS):** Create 5-7 checkpoints approx ${params.giftRange} from start. 
           - Name: "Stolen Gift #[1-7]"
           - Color: '#f87171' (Red)
           - Points: 500
           - Type: 'mandatory'
           - Description: "A Grinch is guarding this gift. Chase them down to reclaim it!"
         
         - **CHECKPOINTS (BONFIRES):** Create exactly 2 checkpoints named "Eldstad (Värme)" approx ${params.fireRange} from start, preferably apart from each other.
           - Name: "Eldstad (Värme)"
           - Color: '#f97316' (Orange)
           - Points: 0
           - Type: 'optional'
           - Description: "SAFE ZONE. Regenerate warmth here."
      
      2. GENERATE NARRATIVE:
         - Name: "The Great Christmas Hunt (${scale.toUpperCase()})"
         - Description: "The Grinch's helpers have stolen the presents! Use the map to find gifts within ${params.giftRange}. CAUTION: It's freezing! Return to the Sleigh (Start) or find a Bonfire (Eldstad) to warm up."
         - Category: 'Christmas Hunt'
         - Map Style: 'standard'
      
      EXECUTE update_race_plan NOW.
    `;

    try {
      await gemini.sendMessage(prompt);

      const finalEvent: RaceEvent = {
        ...INITIAL_RACE_STATE,
        ...generatedData,
        id: `xmas-${Date.now()}`,
        category: 'Christmas Hunt', // CRITICAL FIX: Ensure category is set correctly
        status: 'active',
        startDateTime: new Date().toISOString(),
        startMode: 'self_start',
        winCondition: 'most_points', 
        startLocation: generatedData.startLocation || { lat, lng },
        finishLocation: generatedData.finishLocation || { lat, lng, radiusMeters: 50 },
      } as RaceEvent;

      onGameCreated(finalEvent);

    } catch (err) {
      console.error(err);
      setError("Connection lost. Christmas is cancelled.");
      setLoading(false);
    }
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
