import React, { useState, useEffect } from 'react';
import { Skull, Map as MapIcon, TriangleAlert, Trophy } from 'lucide-react';
import { RaceEvent, Checkpoint, NavGraph } from '../types';
import { INITIAL_RACE_STATE } from '../constants';

interface ZombieSurvivalButtonProps {
  onGameCreated: (event: RaceEvent) => void;
  userTier: string;
  isGuest?: boolean;
  onAuthRequired?: () => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  onShowLeaderboard?: () => void;
}

const LOADING_MESSAGES = [
  "Skannar satellitbilder...",
  "Identifierar flyktvägar...",
  "Bygger navigationsnät...",
  "Söker värmesignaturer...",
  "Simulerar smittspridning..."
];

export const ZombieSurvivalButton: React.FC<ZombieSurvivalButtonProps> = ({ 
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
          handleStartZombieRun();
          if (onAutoStartConsumed) onAutoStartConsumed();
      }
  }, [autoStart]);

  const handleStartZombieRun = () => {
    if (isGuest && onAuthRequired) {
        onAuthRequired();
        return;
    }

    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("GPS ej tillgänglig.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await generateZombieRace(latitude, longitude);
      },
      (err) => {
        console.error(err);
        setError("Åtkomst till plats nekad.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const fetchRoadGraph = async (lat: number, lng: number, radius: number): Promise<{ nodes: {lat: number, lon: number}[], graph: NavGraph }> => {
      const query = `[out:json][timeout:15];(way["highway"](around:${radius}, ${lat}, ${lng}););out geom;`;
      try {
          const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
          if (!response.ok) throw new Error("OSM Error");
          const data = await response.json();
          const nodes: {lat: number, lon: number}[] = [];
          const graph: NavGraph = { nodes: {} };
          let nodeIdCounter = 0;
          const spatialMap = new Map<string, string>();

          const getOrCreteNodeId = (pt: { lat: number, lon: number }): string => {
              const key = `${pt.lat.toFixed(5)},${pt.lon.toFixed(5)}`;
              if (spatialMap.has(key)) return spatialMap.get(key)!;
              const id = `n${nodeIdCounter++}`;
              spatialMap.set(key, id);
              graph.nodes[id] = { id, lat: pt.lat, lng: pt.lon, neighbors: [] };
              nodes.push({ lat: pt.lat, lon: pt.lon });
              return id;
          };

          data.elements.forEach((el: any) => {
              if (el.geometry) {
                  let prevId: string | null = null;
                  el.geometry.forEach((pt: any) => {
                      const currId = getOrCreteNodeId(pt);
                      if (prevId) {
                          if (!graph.nodes[prevId].neighbors.includes(currId)) graph.nodes[prevId].neighbors.push(currId);
                          if (!graph.nodes[currId].neighbors.includes(prevId)) graph.nodes[currId].neighbors.push(prevId);
                      }
                      prevId = currId;
                  });
              }
          });
          return { nodes, graph };
      } catch (e) {
          return { nodes: [], graph: { nodes: {} } };
      }
  };

  const generateZombieRace = async (lat: number, lng: number) => {
    let roadNodes: {lat: number, lon: number}[] = [];
    try {
        const result = await fetchRoadGraph(lat, lng, 600);
        roadNodes = result.nodes;
    } catch (e) {}

    const checkpoints: Checkpoint[] = [];
    const usedLocs: {lat: number, lon: number}[] = [];
    const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const pickLocation = (minDistFromStart: number, maxDistFromStart: number, minDistFromOthers: number): {lat: number, lng: number} => {
        if (roadNodes.length > 0) {
            const shuffled = [...roadNodes].sort(() => Math.random() - 0.5);
            for (const node of shuffled) {
                const distToStart = getDist(lat, lng, node.lat, node.lon);
                if (distToStart < minDistFromStart || distToStart > maxDistFromStart) continue;
                if (usedLocs.some(u => getDist(u.lat, u.lon, node.lat, node.lon) < minDistFromOthers)) continue;
                usedLocs.push(node);
                return { lat: node.lat, lng: node.lon };
            }
        }
        const r = minDistFromStart + Math.random() * (maxDistFromStart - minDistFromStart);
        const theta = Math.random() * 2 * Math.PI;
        const earthRadius = 6378137;
        const newLat = lat + ((r * Math.cos(theta)) / earthRadius) * (180 / Math.PI);
        const newLng = lng + ((r * Math.sin(theta)) / (earthRadius * Math.cos(Math.PI * lat / 180))) * (180 / Math.PI);
        usedLocs.push({ lat: newLat, lon: newLng });
        return { lat: newLat, lng: newLng };
    };

    for (let i = 0; i < 4; i++) {
        checkpoints.push({
            id: `radio-${i}`,
            name: `Radio Part ${['Alpha', 'Beta', 'Gamma', 'Delta'][i]}`,
            location: pickLocation(150, 500, 80),
            radiusMeters: 25,
            type: 'mandatory',
            points: 50,
            color: '#3b82f6',
            description: 'Critical component.'
        });
    }
    for (let i = 0; i < 3; i++) {
        checkpoints.push({
            id: `supply-${i}`,
            name: 'Supply Crate',
            location: pickLocation(100, 300, 60),
            radiusMeters: 20,
            type: 'optional',
            points: 10,
            color: '#F59E0B'
        });
    }
    for (let i = 0; i < 5; i++) {
        checkpoints.push({
            id: `nest-${i}`,
            name: '⚠️ ZOMBIE NEST',
            location: pickLocation(100, 450, 50),
            radiusMeters: 35,
            type: 'optional',
            points: -50,
            color: '#EF4444'
        });
    }

    const finalEvent: RaceEvent = {
      ...INITIAL_RACE_STATE,
      id: `zombie-${Date.now()}`,
      name: "Outbreak: Sector Zero",
      description: "ANVÄND HÖRLURAR. \n\nSmittan sprider sig snabbt. Du måste hitta 4 radiodelar för att kalla på evakuering.",
      category: 'Survival Run',
      mapStyle: 'dark',
      status: 'active',
      startDateTime: new Date().toISOString(),
      startMode: 'self_start',
      winCondition: 'most_points',
      startLocation: { lat, lng },
      finishLocation: { lat, lng, radiusMeters: 50 },
      checkpoints: checkpoints,
      results: [],
      isInstantGame: true,
    } as RaceEvent;

    setLoading(false);
    onGameCreated(finalEvent);
  };

  return (
    <div className="relative w-full group">
        <button
            onClick={handleStartZombieRun}
            disabled={loading}
            className={`relative w-full overflow-hidden rounded-xl border border-red-900/50 bg-gray-900 px-6 py-4 min-h-[120px] transition-all hover:border-red-600 hover:shadow-[0_0_40px_rgba(220,38,38,0.2)] active:scale-[0.99] flex items-center justify-between ${loading ? 'cursor-not-allowed opacity-80' : ''}`}
        >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 to-black opacity-80"></div>
            
            {/* CONTENT WARNING BADGE */}
            <div className="absolute top-2 right-2 z-20 bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded border border-red-400/50 flex items-center gap-1">
                <TriangleAlert className="w-2 h-2" /> 15+ SKRÄCK
            </div>

            {loading && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 text-center">
                    <MapIcon className="w-8 h-8 text-red-500 animate-pulse mb-2" />
                    <div className="font-mono text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                        {loadingMsg}
                    </div>
                 </div>
            )}

            {/* LEFT: ICON & TITLE */}
            <div className="relative z-10 flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 bg-red-950/40 shadow-inner transition-colors ${loading ? 'border-red-500 animate-pulse' : 'border-red-900 group-hover:border-red-600'}`}>
                    <Skull className={`h-7 w-7 text-red-600 ${loading ? 'animate-bounce' : ''}`} />
                </div>
                <div className="text-left">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-white group-hover:text-red-500 transition-colors leading-none mb-2">
                        Zombie Survival
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-red-500/70 uppercase tracking-widest">Intensitet:</span>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
                            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
                            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: ACTION BADGE (PILL SHAPE) */}
            <div className="relative z-10">
                <span className="inline-block rounded-full border border-red-500/50 bg-red-950/40 px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-red-400 group-hover:bg-red-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all shadow-lg">
                    START OUTBREAK
                </span>
            </div>
        </button>
        
        {/* LEADERBOARD BUTTON */}
        {onShowLeaderboard && !loading && (
            <div className="absolute top-2 left-2 z-20">
                <button
                    onClick={(e) => { e.stopPropagation(); onShowLeaderboard(); }}
                    className="flex items-center gap-1 text-[8px] font-bold text-yellow-500/80 bg-black/40 hover:bg-black/80 hover:text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-900/30 transition-all backdrop-blur-sm"
                >
                    <Trophy className="w-2.5 h-2.5" /> Topplista
                </button>
            </div>
        )}
        
        {error && (
             <div className="mt-2 text-[10px] font-bold text-red-500 bg-red-950/30 p-2 rounded border border-red-900/50">
                 {error}
             </div>
        )}
    </div>
  );
};