
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, RaceEvent, ParticipantResult } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { X, Camera, User, LogOut, Loader2, Award, Zap, ShieldCheck, Fingerprint, Calendar, Trophy, History } from 'lucide-react';
import { api } from '../services/dataService';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onOpenSystemAdmin?: () => void;
}

export const ProfileDialog: React.FC<ProfileDialogProps> = ({ isOpen, onClose, user, onOpenSystemAdmin }) => {
  const { logout, updateProfileImage } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [historyEvents, setHistoryEvents] = useState<RaceEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history when tab is switched
  useEffect(() => {
      if (isOpen && activeTab === 'history') {
          setIsLoadingHistory(true);
          api.events.getParticipatedEvents(user.id)
            .then(events => {
                // OPTION B: Filter to only show finished events (Trophy Case logic)
                const finishedEvents = events.filter(event => {
                    const result = event.results?.find(r => r.id === user.id);
                    return result && result.status === 'finished';
                });

                // Sort by date desc
                setHistoryEvents(finishedEvents.sort((a,b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()));
            })
            .finally(() => setIsLoadingHistory(false));
      }
  }, [isOpen, activeTab, user.id]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        await updateProfileImage(file);
      } catch (error: any) {
        console.error("Failed to upload image", error);
        
        if (error.code === 'storage/unauthorized') {
            alert("Uppladdning nekad! Saknas rättigheter i Firebase Storage. Se till att reglerna tillåter skrivning till 'profile-images/{userId}'.");
        } else {
            alert("Uppladdning misslyckades. Kontrollera din anslutning och försök igen.");
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleLogout = async () => {
      await logout();
      onClose();
  };

  // Helper to extract user result from event
  const getMyResult = (event: RaceEvent): ParticipantResult | undefined => {
      return event.results?.find(r => r.id === user.id);
  };

  // Generate DiceBear avatar if no photoURL
  const avatarUrl = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
        
        {/* Header Background */}
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700 relative shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10">
                <X className="w-5 h-5" />
            </button>

            {/* Avatar Section - Absolute positioned to overlap header correctly without clipping */}
            {activeTab === 'profile' && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 group z-20">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-900 bg-gray-800 overflow-hidden shadow-xl">
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Upload Overlay */}
                    <button 
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center cursor-pointer border-4 border-transparent transition-all opacity-0 group-hover:opacity-100"
                    >
                        {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white/90" />}
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                    />
                </div>
            )}
        </div>

        {/* Tabs - Dynamic margin to accommodate avatar */}
        <div className={`flex border-b border-gray-800 bg-gray-950 shrink-0 transition-all duration-300 ${activeTab === 'profile' ? 'mt-14' : 'mt-0'}`}>
            <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <User className="w-4 h-4" /> Profil
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <History className="w-4 h-4" /> Historik (Mål)
            </button>
        </div>

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
            <div className="p-6 flex flex-col items-center overflow-y-auto custom-scrollbar">
                
                <h2 className="text-2xl font-black text-white tracking-tight mt-2">{user.name}</h2>
                <div className="flex flex-col items-center gap-1 mt-1">
                    <p className="text-gray-400 text-sm">{user.email || 'Gästkonto'}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${user.role === 'admin' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                            {user.role === 'admin' ? 'SYSTEM ADMIN' : 'USER ROLE'}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1" title="User ID">
                            <Fingerprint className="w-3 h-3" /> {user.id.substring(0, 6)}...
                        </span>
                    </div>
                </div>

                {/* Stats / Badges */}
                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 text-center">
                        <div className="text-xs text-gray-500 font-bold uppercase mb-1">Nivå</div>
                        <div className="flex items-center justify-center gap-1 text-blue-400 font-bold">
                            {user.tier === 'MASTER' ? <ShieldCheck className="w-4 h-4"/> : user.tier === 'CREATOR' ? <Zap className="w-4 h-4"/> : <Award className="w-4 h-4"/>}
                            {user.tier}
                        </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 text-center">
                        <div className="text-xs text-gray-500 font-bold uppercase mb-1">Skapade Event</div>
                        <div className="text-white font-bold">{user.createdRaceCount || 0}</div>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="w-full mt-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                    <LogOut className="w-4 h-4" /> Logga ut
                </button>
            </div>
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-900">
                {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Laddar historik...</span>
                    </div>
                ) : historyEvents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Du har inte slutfört några äventyr än.</p>
                        <p className="text-xs mt-1 opacity-50">(Endast lopp med målgång visas här)</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {historyEvents.map(event => {
                            const result = getMyResult(event);
                            if (!result) return null;
                            
                            return (
                                <div key={event.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-white font-bold text-sm line-clamp-1">{event.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(event.startDateTime).toLocaleDateString()}
                                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                                <span className="uppercase font-bold text-[10px]">{event.category}</span>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-900/50 rounded text-[10px] font-bold uppercase tracking-wider">
                                            Målgång
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-700/50">
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Poäng</div>
                                            <div className="text-yellow-400 font-mono font-bold">{result.totalPoints}</div>
                                        </div>
                                        <div className="text-center border-l border-gray-700/50">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Tid</div>
                                            <div className="text-blue-300 font-mono font-bold">{result.finishTime}</div>
                                        </div>
                                        <div className="text-center border-l border-gray-700/50">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Checkpoints</div>
                                            <div className="text-white font-mono font-bold">{result.checkpointsVisited}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};
