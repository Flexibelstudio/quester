
import React, { useState, useEffect } from 'react';
import { Skull, Radiation, Biohazard, TriangleAlert, Map as MapIcon, Zap } from 'lucide-react';
import { GeminiService } from '../services/gemini';
import { RaceEvent, Checkpoint, NavGraph, NavNode } from '../types';
import { INITIAL_RACE_STATE } from '../constants';

interface ZombieSurvivalButtonProps {
  onGameCreated: (event: RaceEvent) => void;
  userTier: string;
  isGuest?: boolean;
  onAuthRequired?: () => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
}

const LOADING_MESSAGES = [
  "Scanning Satellite Imagery...",
  "Identifying Walkable Paths...",
  "Building Navigation Graph...",
  "Detecting Heat Signatures...",
  "Simulating Infection Spread..."
];

export const ZombieSurvivalButton: React.FC<ZombieSurvivalButtonProps> = ({ 
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

  // Cycling loading text
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
          handleStartZombieRun();
          if (onAutoStartConsumed) onAutoStartConsumed();
      }
  }, [autoStart]);

  const handleStartZombieRun = () => {
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
        await generateZombieRace(latitude, longitude);
      },
      (err) => {
        console.error(err);
        setError("GPS access denied.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // --- OSM / OVERPASS LOGIC ---
  
  interface OsmNode {
      lat: number;
      lon: number;
  }

  // Fetch geometry and build a connected graph
  const fetchRoadGraph = async (lat: number, lng: number, radius: number): Promise<{ nodes: OsmNode[], graph: NavGraph }> => {
      const query = `
        [out:json][timeout:15];
        (
          way["highway"](around:${radius}, ${lat}, ${lng});
        );
        out geom;
      `;
      
      try {
          const response = await fetch('https://overpass-api.de/api/interpreter', {
              method: 'POST',
              body: query
          });
          
          if (!response.ok) throw new Error("OSM Error");
          
          const data = await response.json();
          const nodes: OsmNode[] = []; // Linear list for spawning
          const graph: NavGraph = { nodes: {} };
          
          // Spatial Hash to merge duplicate nodes (intersections)
          // Key: "lat,lng" (fixed precision) -> NodeID
          const spatialMap = new Map<string, string>();
          let nodeIdCounter = 0;

          const getOrCreteNodeId = (pt: { lat: number, lon: number }): string => {
              const key = `${pt.lat.toFixed(5)},${pt.lon.toFixed(5)}`;
              if (spatialMap.has(key)) return spatialMap.get(key)!;
              
              const id = `n${nodeIdCounter++}`;
              spatialMap.set(key, id);
              
              graph.nodes[id] = {
                  id,
                  lat: pt.lat,
                  lng: pt.lon,
                  neighbors: []
              };
              
              // Also add to linear spawning list
              nodes.push({ lat: pt.lat, lon: pt.lon });
              
              return id;
          };

          // Build Graph from Ways
          data.elements.forEach((el: any) => {
              if (el.geometry) {
                  let prevId: string | null = null;
                  
                  el.geometry.forEach((pt: any) => {
                      const currId = getOrCreteNodeId(pt);
                      
                      if (prevId) {
                          // Link Previous <-> Current
                          const prevNode = graph.nodes[prevId];
                          const currNode = graph.nodes[currId];
                          
                          if (!prevNode.neighbors.includes(currId)) prevNode.neighbors.push(currId);
                          if (!currNode.neighbors.includes(prevId)) currNode.neighbors.push(prevId);
                      }
                      prevId = currId;
                  });
              }
          });
          
          console.log(`Graph built: ${Object.keys(graph.nodes).length} nodes.`);
          return { nodes, graph };

      } catch (e) {
          console.warn("Failed to fetch OSM data, falling back to math.", e);
          return { nodes: [], graph: { nodes: {} } };
      }
  };

  // Helper to shuffle array
  const shuffle = <T,>(array: T[]): T[] => {
      return array.sort(() => Math.random() - 0.5);
  };

  // Helper to get distance
  const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; 
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
  };

  // --- GENERATION LOGIC ---

  const generateZombieRace = async (lat: number, lng: number) => {
    let roadNodes: OsmNode[] = [];
    // navGraph removed to prevent Firestore index explosion
    
    // 1. Try to get real road data (Linear nodes only used for spawning)
    try {
        const result = await fetchRoadGraph(lat, lng, 600);
        roadNodes = result.nodes;
    } catch (e) {
        console.warn("OSM Fetch failed");
    }

    const checkpoints: Checkpoint[] = [];
    const usedLocs: OsmNode[] = [];

    // Helper to pick a valid location (either from OSM or Random Fallback)
    const pickLocation = (minDistFromStart: number, maxDistFromStart: number, minDistFromOthers: number): {lat: number, lng: number} => {
        
        // Strategy A: Use OSM Data
        if (roadNodes.length > 0) {
            // Shuffle roads to get random spots
            const shuffled = shuffle(roadNodes);
            
            for (const node of shuffled) {
                const distToStart = getDist(lat, lng, node.lat, node.lon);
                
                // Check distance constraints
                if (distToStart < minDistFromStart || distToStart > maxDistFromStart) continue;
                
                // Check spread constraint
                const tooClose = usedLocs.some(u => getDist(u.lat, u.lon, node.lat, node.lon) < minDistFromOthers);
                if (tooClose) continue;

                usedLocs.push(node);
                return { lat: node.lat, lng: node.lon };
            }
        }

        // Strategy B: Fallback Math (Polar Coordinates)
        let attempts = 0;
        while(attempts < 20) {
            attempts++;
            const r = minDistFromStart + Math.random() * (maxDistFromStart - minDistFromStart);
            const theta = Math.random() * 2 * Math.PI;
            
            const earthRadius = 6378137;
            const dLat = (r * Math.cos(theta)) / earthRadius;
            const dLng = (r * Math.sin(theta)) / (earthRadius * Math.cos(Math.PI * lat / 180));
            
            const newLat = lat + (dLat * 180 / Math.PI);
            const newLng = lng + (dLng * 180 / Math.PI);

            // Simple spread check for fallback
            const tooClose = usedLocs.some(u => getDist(u.lat, u.lon, newLat, newLng) < minDistFromOthers);
            if (!tooClose) {
                usedLocs.push({ lat: newLat, lon: newLng });
                return { lat: newLat, lng: newLng };
            }
        }
        
        // Desperation return
        return { lat: lat + 0.001, lng: lng + 0.001 };
    };

    // --- CREATE CHECKPOINTS ---

    // 1. Radio Parts (Objectives) - Farther away
    for (let i = 0; i < 4; i++) {
        const loc = pickLocation(150, 500, 80);
        checkpoints.push({
            id: `radio-${i}`,
            name: `Radio Part ${['Alpha', 'Beta', 'Gamma', 'Delta'][i]}`,
            location: loc,
            radiusMeters: 25,
            type: 'mandatory',
            points: 50,
            color: '#3b82f6', // Blue
            description: 'Critical component. Find it to fix the transmitter.'
        });
    }

    // 2. Supply Crates (Helpful) - Closer/Mid range
    for (let i = 0; i < 3; i++) {
        const loc = pickLocation(100, 300, 60);
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

    // 3. Zombie Nests (Traps) - Scattered among objectives
    for (let i = 0; i < 5; i++) {
        const loc = pickLocation(100, 450, 50);
        checkpoints.push({
            id: `nest-${i}`,
            name: '⚠️ ZOMBIE NEST',
            location: loc,
            radiusMeters: 35, // Larger threat radius
            type: 'optional',
            points: -50,
            color: '#EF4444', // Red
            description: 'High infection zone. Avoid at all costs.'
        });
    }

    // Narrative generation via Gemini (Optional enhancement)
    // We create the event structure immediately for speed, but could enhance desc later
    const finalEvent: RaceEvent = {
      ...INITIAL_RACE_STATE,
      id: `zombie-${Date.now()}`,
      name: "Outbreak: Sector Zero",
      description: "ANVÄND HÖRLURAR. \n\nSmittan sprider sig snabbt. Du måste hitta 4 radiodelar för att kalla på evakuering. Håll dig borta från de röda zonerna (Nests) och lyssna efter zombies. Hitta Supply Crates för att få nödbloss.",
      category: 'Survival Run',
      mapStyle: 'dark', // Force Dark Mode
      status: 'active',
      startDateTime: new Date().toISOString(),
      startMode: 'self_start',
      winCondition: 'most_points', // IMPORTANT: Score based leaderboard
      startLocation: { lat, lng },
      finishLocation: { lat, lng, radiusMeters: 50 },
      checkpoints: checkpoints,
      results: [],
      // navGraph removed
    } as RaceEvent;

    setLoading(false);
    onGameCreated(finalEvent);
  };

  return (
    <>
        <button
            onClick={handleStartZombieRun}
            disabled={loading}
            className={`group relative w-full overflow-hidden rounded-xl border border-red-900/50 bg-gray-900 p-6 transition-all hover:border-red-600 hover:shadow-[0_0_40px_rgba(220,38,38,0.3)] active:scale-[0.98] ${loading ? 'cursor-not-allowed opacity-80' : ''}`}
        >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/50 to-black opacity-80"></div>
            
            {/* CONTENT WARNING BADGE */}
            <div className="absolute top-2 right-2 z-20 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded border border-red-400 shadow-lg flex items-center gap-1 animate-pulse">
                <TriangleAlert className="w-3 h-3" /> 15+ SKRÄCK
            </div>

            {loading && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center">
                    <MapIcon className="w-12 h-12 text-red-500 animate-pulse mb-4" />
                    <div className="font-mono text-red-500 text-sm font-bold uppercase tracking-widest animate-pulse">
                        {loadingMsg}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Connecting OSM Nodes...</div>
                 </div>
            )}

            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 bg-red-950/50 shadow-inner ${loading ? 'border-red-500 animate-pulse' : 'border-red-800 group-hover:border-red-500'}`}>
                        <Skull className={`h-8 w-8 text-red-500 ${loading ? 'animate-bounce' : ''}`} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-red-500 transition-colors">
                            Zombie Survival
                        </h3>
                        
                        {/* INTENSITY METER */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Intensitet:</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="hidden sm:block">
                     <span className="rounded-lg border border-red-900/30 bg-red-900/10 px-3 py-1 text-xs font-bold text-red-500 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        START OUTBREAK
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
