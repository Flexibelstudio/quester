
import React, { useState, useEffect } from 'react';
import { GlobalScoreEntry, Coordinate } from '../types';
import { api } from '../services/dataService'; // DataService
import { Trophy, MapPin, Users, Globe, Skull, Snowflake, X, Search, Clock, Flag } from 'lucide-react';

interface GlobalLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'zombie_survival' | 'christmas_hunt';
}

// Helper for distance (moved locally or can be imported if shared)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({ isOpen, onClose, defaultMode = 'zombie_survival' }) => {
  const [mode, setMode] = useState<'zombie_survival' | 'christmas_hunt'>(defaultMode);
  const [filterType, setFilterType] = useState<'global' | 'local' | 'group'>('global');
  const [scores, setScores] = useState<GlobalScoreEntry[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [groupFilter, setGroupFilter] = useState('');

  // Get location for local filter
  useEffect(() => {
      if (filterType === 'local' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => alert("Behöver platsåtkomst för lokal lista.")
          );
      }
  }, [filterType]);

  // Load scores
  useEffect(() => {
      const load = async () => {
          let allScores = await api.leaderboard.getAllScores();
          
          // FILTER: Only show entries with score > 0 AND NOT DNF
          // We check specifically for 'dnf' to exclude them. Undefined status is treated as finished for backward compatibility.
          let filtered = allScores.filter(s => s.mode === mode && s.score > 0 && s.status !== 'dnf');

          if (filterType === 'group' && groupFilter) {
              filtered = filtered.filter(s => 
                  s.groupTag && s.groupTag.toLowerCase().includes(groupFilter.toLowerCase())
              );
          } else if (filterType === 'local' && userLocation) {
              filtered = filtered.filter(s => {
                  const dist = getDistanceKm(userLocation.lat, userLocation.lng, s.location.lat, s.location.lng);
                  return dist <= 20; // 20km radius
              });
          }

          setScores(filtered.slice(0, 50));
      };
      
      load();
      // Poll for updates every 10s (reduced frequency for network)
      const interval = setInterval(load, 10000);
      return () => clearInterval(interval);
  }, [mode, filterType, userLocation, groupFilter]);

  if (!isOpen) return null;

  const isZombie = mode === 'zombie_survival';

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${isZombie ? 'bg-gray-900 border-red-900' : 'bg-slate-900 border-blue-900'}`}>
        
        {/* Header */}
        <div className={`p-6 flex justify-between items-center ${isZombie ? 'bg-gradient-to-r from-red-950 to-black' : 'bg-gradient-to-r from-blue-950 to-slate-900'}`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isZombie ? 'bg-red-600' : 'bg-blue-600'} shadow-lg`}>
                    <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Topplistor</h2>
                    <div className="flex gap-2 mt-1">
                        <button 
                            onClick={() => setMode('zombie_survival')}
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${mode === 'zombie_survival' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                            Zombie Run
                        </button>
                        <button 
                            onClick={() => setMode('christmas_hunt')}
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${mode === 'christmas_hunt' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                            Christmas Hunt
                        </button>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-800 bg-gray-900/50">
            <div className="flex bg-gray-800 rounded-lg p-1">
                <button 
                    onClick={() => setFilterType('global')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${filterType === 'global' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <Globe className="w-4 h-4" /> Global
                </button>
                <button 
                    onClick={() => setFilterType('local')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${filterType === 'local' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <MapPin className="w-4 h-4" /> Nära Mig (20km)
                </button>
                <button 
                    onClick={() => setFilterType('group')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${filterType === 'group' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <Users className="w-4 h-4" /> Skola/Grupp
                </button>
            </div>

            {filterType === 'group' && (
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Sök på Skola eller Klassnamn..." 
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
            )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-950">
            {scores.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Inga resultat hittades för detta filter.</p>
                    {filterType === 'local' && !userLocation && <p className="text-xs mt-2">Väntar på GPS...</p>}
                </div>
            ) : (
                <div className="space-y-2">
                    {scores.map((score, index) => (
                        <div 
                            key={score.id}
                            className={`flex items-center p-4 rounded-xl border transition-all hover:scale-[1.01] ${index === 0 ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-gray-900 border-gray-800'}`}
                        >
                            <div className={`w-8 h-8 flex items-center justify-center font-black text-lg mr-4 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                                {index + 1}
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white text-lg">{score.playerName}</h3>
                                    {score.groupTag && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 uppercase font-bold">
                                            {score.groupTag}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span>{new Date(score.timestamp).toLocaleDateString()}</span>
                                    {isZombie && (
                                        <span className='text-green-500'>
                                            • Överlevare
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex items-center gap-4 sm:gap-6">
                                {/* Time display - Secondary metric */}
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold flex items-center justify-end gap-1">
                                        <Clock className="w-3 h-3" /> Tid
                                    </div>
                                    <div className="text-sm font-mono text-gray-400 font-medium">
                                        {score.timeString}
                                    </div>
                                </div>

                                {/* Score display - Primary metric */}
                                <div className="min-w-[60px] text-right">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold">Poäng</div>
                                    <div className={`text-xl font-black ${isZombie ? 'text-red-500' : 'text-blue-400'}`}>
                                        {score.score}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
