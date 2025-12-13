

import React, { useState, useMemo } from 'react';
import { RaceEvent, ParticipantResult, CheckpointVisitLog } from '../types';
import { Trophy, Clock, Medal, UserPlus, Trash2, RotateCcw, MonitorPlay, Edit, CheckCircle2, X, Map as MapIcon, Save, Eye, Camera, HelpCircle, XCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface ResultManagerProps {
  raceData: RaceEvent;
  onUpdateResults: (results: ParticipantResult[]) => void;
  onClose: () => void;
}

const userIcon = (profileImage?: string) => L.divIcon({
  className: 'user-location-marker',
  html: `
    <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
       <div style="position:absolute; width:100%; height:100%; background:#3b82f6; opacity:0.3; border-radius:50%; animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;"></div>
       <div style="position:absolute; width:28px; height:28px; background:${profileImage ? `url(${profileImage})` : '#3b82f6'}; background-size: cover; background-position: center; border:2px solid white; border-radius:50%; box-shadow: 0 0 10px rgba(59,130,246,0.5);">
         ${!profileImage ? '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:white; font-size: 8px;">●</div>' : ''}
       </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export const ResultManager: React.FC<ResultManagerProps> = ({ raceData, onUpdateResults, onClose }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'presentation' | 'live_map'>('edit');
  const [newParticipant, setNewParticipant] = useState({ name: '', teamName: '', finishTime: '', points: 0, visited: 0 });
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ points: number, time: string }>({ points: 0, time: '' });

  // Detailed View State
  const [viewingResult, setViewingResult] = useState<ParticipantResult | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Sort logic based on Win Condition
  const sortedResults = useMemo(() => {
    const results = [...(raceData.results || [])];
    return results.sort((a, b) => {
        // Handle DNF/Running
        if (a.status !== 'finished' && b.status === 'finished') return 1;
        if (a.status === 'finished' && b.status !== 'finished') return -1;

        if (raceData.winCondition === 'most_points') {
            // Sort by Points DESC, then Time ASC
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return a.finishTime.localeCompare(b.finishTime);
        } else {
            // Sort by Time ASC, then Points DESC
            if (a.finishTime !== b.finishTime) return a.finishTime.localeCompare(b.finishTime);
            return b.totalPoints - a.totalPoints;
        }
    });
  }, [raceData.results, raceData.winCondition]);

  const handleAddParticipant = () => {
    if (!newParticipant.name) return;
    const result: ParticipantResult = {
        id: Date.now().toString(),
        name: newParticipant.name,
        teamName: newParticipant.teamName,
        finishTime: newParticipant.finishTime || '00:00:00',
        totalPoints: Number(newParticipant.points),
        checkpointsVisited: Number(newParticipant.visited),
        status: 'finished',
        // Auto-assign random avatar for manually added users if needed
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newParticipant.name}`
    };
    onUpdateResults([...(raceData.results || []), result]);
    setNewParticipant({ name: '', teamName: '', finishTime: '', points: 0, visited: 0 });
  };

  const handleDelete = (id: string) => {
    if(confirm('Vill du verkligen ta bort detta resultat?')) {
        onUpdateResults((raceData.results || []).filter(r => r.id !== id));
    }
  };

  const startEdit = (result: ParticipantResult) => {
      setEditingId(result.id);
      setEditValues({ points: result.totalPoints, time: result.finishTime });
  };

  const saveEdit = () => {
      if (!editingId) return;
      const updatedResults = (raceData.results || []).map(r => {
          if (r.id === editingId) {
              return { ...r, totalPoints: editValues.points, finishTime: editValues.time };
          }
          return r;
      });
      onUpdateResults(updatedResults);
      setEditingId(null);
  };

  const generateDummyResults = () => {
    const names = ["Team Bruden", "Möhippa Squad", "Svensexa Lag 1", "Snabba Glasögon", "Vinnarskallarna"];
    const maxPoints = raceData.checkpoints.reduce((sum, cp) => sum + (cp.points || 0), 0);
    const count = raceData.checkpoints.length;

    const dummyData: ParticipantResult[] = names.map((name, i) => {
        const points = Math.floor(Math.random() * maxPoints);
        const hours = Math.floor(1 + Math.random() * 2);
        const mins = Math.floor(Math.random() * 60);
        const secs = Math.floor(Math.random() * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        // Simulate some location data around start point
        const latOffset = (Math.random() - 0.5) * 0.01;
        const lngOffset = (Math.random() - 0.5) * 0.01;

        return {
            id: `dummy-${i}`,
            name: name,
            teamName: '',
            finishTime: timeStr,
            totalPoints: points,
            checkpointsVisited: Math.floor(count * (points/maxPoints)),
            status: 'finished',
            lastPosition: { lat: raceData.startLocation.lat + latOffset, lng: raceData.startLocation.lng + lngOffset },
            profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        };
    });
    onUpdateResults(dummyData);
  };

  // Helper to find CP name by ID
  const getCpName = (id: string) => raceData.checkpoints.find(c => c.id === id)?.name || 'Okänd CP';
  const getCp = (id: string) => raceData.checkpoints.find(c => c.id === id);

  if (activeTab === 'presentation') {
      return (
          <div className="fixed inset-0 z-[3000] bg-gray-950 flex flex-col items-center p-4 md:p-8 overflow-hidden font-sans">
                {/* Background FX */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-gray-900 to-black z-0"></div>

                <div className="relative z-10 w-full max-w-6xl flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6 md:mb-12">
                         <div>
                            <h1 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter uppercase mb-2">
                                Resultat
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <span className="bg-blue-600 px-2 py-0.5 md:px-3 md:py-1 rounded text-xs md:text-sm font-bold text-white uppercase tracking-widest">
                                    {raceData.name}
                                </span>
                                <span className="text-gray-400 font-mono text-xs md:text-lg uppercase">
                                    {raceData.winCondition === 'most_points' ? 'Poängjakt' : 'Snabbast Tid'}
                                </span>
                            </div>
                         </div>
                         <button 
                            onClick={() => setActiveTab('edit')}
                            className="bg-gray-800/50 hover:bg-gray-700 p-2 md:p-3 rounded-full text-gray-400 hover:text-white transition-colors border border-gray-700"
                         >
                             <Edit className="w-5 h-5 md:w-6 md:h-6" />
                         </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 md:pr-4 custom-scrollbar">
                        <div className="space-y-3 md:space-y-4">
                            {sortedResults.map((res, index) => {
                                let rankColor = "text-gray-400 bg-gray-800/50";
                                let rankIcon = null;
                                let borderColor = "border-gray-800";
                                let glow = "";

                                if (res.status === 'finished') {
                                    if (index === 0) {
                                        rankColor = "text-yellow-400 bg-yellow-900/20";
                                        borderColor = "border-yellow-600/50";
                                        glow = "shadow-[0_0_30px_rgba(234,179,8,0.15)]";
                                        rankIcon = <Trophy className="w-5 h-5 md:w-8 md:h-8 text-yellow-400" fill="currentColor" />;
                                    } else if (index === 1) {
                                        rankColor = "text-gray-300 bg-gray-600/20";
                                        borderColor = "border-gray-500/50";
                                        rankIcon = <Medal className="w-5 h-5 md:w-8 md:h-8 text-gray-300" />;
                                    } else if (index === 2) {
                                        rankColor = "text-amber-600 bg-amber-900/20";
                                        borderColor = "border-amber-700/50";
                                        rankIcon = <Medal className="w-5 h-5 md:w-8 md:h-8 text-amber-600" />;
                                    }
                                }

                                return (
                                    <div 
                                        key={res.id}
                                        className={`flex items-center p-3 md:p-6 rounded-2xl border ${borderColor} bg-gray-900/80 backdrop-blur-md ${glow} transform transition-all hover:scale-[1.01]`}
                                    >
                                        <div className="w-8 md:w-16 flex justify-center shrink-0 mr-2 md:mr-0">
                                            {rankIcon ? rankIcon : <span className="text-xl md:text-3xl font-black text-gray-700 italic">#{index + 1}</span>}
                                        </div>
                                        
                                        <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
                                            <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-white/20 overflow-hidden bg-gray-800 shrink-0">
                                                {res.profileImage ? (
                                                    <img src={res.profileImage} alt={res.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm md:text-xl font-bold">
                                                        {res.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-col md:flex-row md:items-end gap-0 md:gap-3">
                                                    <h3 className="text-base md:text-3xl font-bold text-white leading-tight truncate">{res.name}</h3>
                                                    {res.teamName && <span className="text-xs md:text-base text-gray-500 font-medium truncate">{res.teamName}</span>}
                                                </div>
                                                {res.status === 'dnf' && <span className="text-red-500 font-bold uppercase tracking-widest text-[10px] md:text-sm">DNF (Bröt)</span>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-12 text-right shrink-0 ml-2">
                                             <div className="flex flex-col items-end">
                                                <span className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-widest mb-0.5">Poäng</span>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <Trophy className="w-3 h-3 md:w-5 md:h-5 text-yellow-500" />
                                                    <span className="text-lg md:text-4xl font-mono font-bold text-white tracking-tighter">{res.totalPoints}</span>
                                                </div>
                                             </div>
                                             <div className="flex flex-col items-end md:w-32">
                                                <span className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-widest mb-0.5">Tid</span>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <Clock className="w-3 h-3 md:w-5 md:h-5 text-blue-500" />
                                                    <span className="text-sm md:text-3xl font-mono text-gray-300">{res.finishTime}</span>
                                                </div>
                                             </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {sortedResults.length === 0 && (
                                <div className="text-center text-gray-600 mt-20 text-xl">Inga resultat att visa ännu.</div>
                            )}
                        </div>
                    </div>
                </div>
          </div>
      )
  }

  // LIVE MAP MODE (Master feature)
  if (activeTab === 'live_map') {
      const activeRunners = sortedResults.filter(r => r.lastPosition);
      return (
         <div className="fixed inset-0 z-[3000] bg-gray-900 flex flex-col font-sans">
             <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-center px-6 z-10 shadow-lg relative">
                 <div className="flex items-center gap-3">
                     <MonitorPlay className="w-6 h-6 text-green-500 animate-pulse" />
                     <h1 className="text-xl font-bold text-white">Live Tracking</h1>
                     <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Beta</span>
                 </div>
                 <div className="absolute right-6 flex items-center gap-4">
                     <div className="text-sm text-gray-400">
                         <strong>{activeRunners.length}</strong> aktiva på kartan
                     </div>
                     <button onClick={() => setActiveTab('edit')} className="bg-gray-800 p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
                         <X className="w-5 h-5" />
                     </button>
                 </div>
             </div>
             
             <div className="flex-1 relative bg-gray-950">
                 <MapContainer 
                    center={[raceData.startLocation.lat, raceData.startLocation.lng]} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                 >
                     <TileLayer
                        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                        attribution="Google"
                     />
                     {/* Start */}
                     <Marker position={[raceData.startLocation.lat, raceData.startLocation.lng]}>
                         <Popup>Start</Popup>
                     </Marker>
                     
                     {/* Runners */}
                     {activeRunners.map(runner => (
                         <Marker 
                            key={runner.id} 
                            position={[runner.lastPosition!.lat, runner.lastPosition!.lng]}
                            icon={userIcon(runner.profileImage)}
                         >
                             <Popup>
                                 <div className="text-center min-w-[100px]">
                                     <div className="w-10 h-10 mx-auto rounded-full overflow-hidden border-2 border-blue-500 mb-1">
                                         {runner.profileImage && <img src={runner.profileImage} className="w-full h-full object-cover" />}
                                     </div>
                                     <div className="font-bold text-gray-800">{runner.name}</div>
                                     <div className="text-xs text-gray-500">{runner.checkpointsVisited} CPs klara</div>
                                 </div>
                             </Popup>
                         </Marker>
                     ))}
                 </MapContainer>
                 {activeRunners.length === 0 && (
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-4 py-2 rounded-lg text-sm z-[1000] shadow-xl border border-gray-700">
                         Inga aktiva deltagare med GPS-signal just nu.
                     </div>
                 )}
             </div>
         </div>
      );
  }

  // EDIT MODE
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        
        {/* --- DETAILED LOG MODAL --- */}
        {viewingResult && (
            <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
                <div className="bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center overflow-hidden">
                                {viewingResult.profileImage ? <img src={viewingResult.profileImage} className="w-full h-full object-cover"/> : viewingResult.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{viewingResult.name}</h3>
                                <p className="text-xs text-gray-400">Detaljerad logg</p>
                            </div>
                        </div>
                        <button onClick={() => setViewingResult(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="space-y-4">
                            {!viewingResult.log || viewingResult.log.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">Ingen detaljerad data loggad för denna deltagare.</div>
                            ) : (
                                viewingResult.log.map((entry, i) => {
                                    const cp = getCp(entry.checkpointId);
                                    return (
                                        <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-blue-300">{cp?.name || 'Okänd CP'}</div>
                                                <div className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            
                                            {/* Quiz Answer */}
                                            {entry.quizAnswer !== undefined && (
                                                <div className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${entry.isQuizCorrect ? 'bg-green-900/20 text-green-300 border border-green-900/50' : 'bg-red-900/20 text-red-300 border border-red-900/50'}`}>
                                                    {entry.isQuizCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                    <div>
                                                        <div className="text-[10px] uppercase font-bold opacity-70">Svar:</div>
                                                        "{entry.quizAnswer}"
                                                    </div>
                                                </div>
                                            )}

                                            {/* Photo Proof */}
                                            {entry.photoURL && (
                                                <div className="mt-2">
                                                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Camera className="w-3 h-3"/> Bildbevis</div>
                                                    <img 
                                                        src={entry.photoURL} 
                                                        onClick={() => setSelectedPhoto(entry.photoURL || null)}
                                                        className="h-32 rounded-lg border border-gray-600 cursor-zoom-in hover:opacity-90 transition-opacity"
                                                        alt="Proof"
                                                    />
                                                </div>
                                            )}
                                            
                                            {entry.pointsEarned > 0 && (
                                                <div className="mt-2 text-xs font-bold text-yellow-500 flex items-center gap-1 justify-end">
                                                    <Trophy className="w-3 h-3" /> +{entry.pointsEarned} Poäng
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- FULLSCREEN PHOTO VIEWER --- */}
        {selectedPhoto && (
            <div 
                className="fixed inset-0 z-[2200] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
                onClick={() => setSelectedPhoto(null)}
            >
                <img src={selectedPhoto} className="max-w-full max-h-full rounded shadow-2xl" alt="Full size" />
                <button className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full"><X className="w-6 h-6"/></button>
            </div>
        )}

      <div className="bg-gray-800 border border-gray-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* RESPONSIVE HEADER */}
        <div className="px-4 py-4 md:px-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-stretch md:items-center bg-gray-900/50 gap-4">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-600/20 rounded-lg shrink-0">
                     <Trophy className="w-5 h-5 text-blue-400" />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-white leading-tight">Domarpanel</h2>
                    <p className="text-xs text-gray-400 hidden sm:block">Hantera poäng & resultat</p>
                 </div>
              </div>
              <button onClick={onClose} className="md:hidden p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <button 
                onClick={generateDummyResults}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors whitespace-nowrap"
                title="Skapa testdata"
             >
                <RotateCcw className="w-4 h-4" /> Simulera
             </button>
             {/* Master Feature: Live Tracking Button */}
             {raceData.creatorTier === 'MASTER' && (
                <button 
                    onClick={() => setActiveTab('live_map')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 border border-green-800 text-green-400 rounded text-xs font-bold transition-colors whitespace-nowrap"
                >
                    <MapIcon className="w-4 h-4" /> Live
                </button>
             )}
             <button 
                onClick={() => setActiveTab('presentation')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white transition-colors whitespace-nowrap"
             >
                <MonitorPlay className="w-4 h-4" /> Presentera
             </button>
             <button onClick={onClose} className="hidden md:block ml-2 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-900 custom-scrollbar">
             {/* Input Form */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Registrera deltagare
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">Namn</label>
                        <input 
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                            placeholder="Namn..."
                            value={newParticipant.name}
                            onChange={e => setNewParticipant({...newParticipant, name: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-1">
                         <label className="text-xs text-gray-500 block mb-1">Tid (HH:MM:SS)</label>
                         <input 
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono"
                            placeholder="01:30:00"
                            value={newParticipant.finishTime}
                            onChange={e => setNewParticipant({...newParticipant, finishTime: e.target.value})}
                        />
                    </div>
                     <div className="md:col-span-1">
                         <label className="text-xs text-gray-500 block mb-1">Poäng</label>
                         <input 
                            type="number"
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                            value={newParticipant.points}
                            onChange={e => setNewParticipant({...newParticipant, points: parseInt(e.target.value) || 0})}
                        />
                    </div>
                     <div className="md:col-span-1">
                         <label className="text-xs text-gray-500 block mb-1">Antal CP</label>
                         <input 
                            type="number"
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                            value={newParticipant.visited}
                            onChange={e => setNewParticipant({...newParticipant, visited: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <button 
                        onClick={handleAddParticipant}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded shadow-lg transition-colors flex items-center justify-center h-[38px]"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                    </button>
                </div>
             </div>

             {/* Table */}
             <div className="rounded-xl border border-gray-700 overflow-hidden bg-gray-800/50">
                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Namn</th>
                                <th className="px-4 py-3">Tid (Mål)</th>
                                <th className="px-4 py-3">Totala Poäng</th>
                                <th className="px-4 py-3">CPs</th>
                                <th className="px-4 py-3 text-right">Åtgärd</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {sortedResults.map((res, idx) => {
                                const isEditing = editingId === res.id;
                                return (
                                    <tr key={res.id} className={`transition-colors ${isEditing ? 'bg-blue-900/10' : 'hover:bg-gray-800/50'}`}>
                                        <td className="px-4 py-3 font-mono text-gray-500">{idx + 1}</td>
                                        
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 overflow-hidden shrink-0">
                                                    {res.profileImage ? (
                                                        <img src={res.profileImage} alt={res.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                                                            {res.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{res.name}</div>
                                                    {res.teamName && <div className="text-xs text-gray-500">{res.teamName}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 py-3">
                                            {isEditing ? (
                                                <input 
                                                    className="bg-gray-900 border border-blue-500 rounded px-2 py-1 text-white text-xs w-24 font-mono"
                                                    value={editValues.time}
                                                    onChange={e => setEditValues({...editValues, time: e.target.value})}
                                                />
                                            ) : (
                                                <span className="font-mono text-blue-300">{res.finishTime}</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-4 py-3">
                                            {isEditing ? (
                                                <input 
                                                    type="number"
                                                    className="bg-gray-900 border border-blue-500 rounded px-2 py-1 text-white text-xs w-20 font-mono font-bold"
                                                    value={editValues.points}
                                                    onChange={e => setEditValues({...editValues, points: parseInt(e.target.value) || 0})}
                                                />
                                            ) : (
                                                <span className="font-mono text-yellow-500 font-bold text-lg">{res.totalPoints}</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-4 py-3">{res.checkpointsVisited}</td>
                                        
                                        <td className="px-4 py-3 text-right">
                                            {isEditing ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={saveEdit} className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded shadow-sm" title="Spara">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded" title="Avbryt">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => setViewingResult(res)}
                                                        className="p-1.5 bg-gray-700 hover:bg-purple-600 text-purple-300 hover:text-white rounded transition-colors"
                                                        title="Granska Svar & Bilder"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => startEdit(res)}
                                                        className="p-1.5 bg-gray-700 hover:bg-blue-600 text-blue-300 hover:text-white rounded transition-colors"
                                                        title="Redigera poäng/tid (Domare)"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(res.id)}
                                                        className="p-1.5 bg-gray-700 hover:bg-red-900/50 text-red-400 hover:text-red-200 rounded transition-colors"
                                                        title="Ta bort"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                     </table>
                 </div>
                 {sortedResults.length === 0 && (
                     <div className="p-8 text-center text-gray-500 italic">Inga resultat att visa ännu.</div>
                 )}
             </div>
        </div>

      </div>
    </div>
  );
};
