
import React, { useState } from 'react';
import { RaceEvent, UserTier, TierConfig, EventStatus, UserProfile } from '../types';
import { Plus, Map, Calendar, Users, Trophy, Trash2, ArrowRight, Settings2, PlayCircle, Compass, Star, ShieldAlert, Zap, Share2, Archive, CheckCircle2, User, MapPin, Crown, LayoutTemplate, PenTool } from 'lucide-react';
import { ShareDialog } from './ShareDialog';

interface DashboardProps {
  events: RaceEvent[];
  userTier: UserTier;
  userProfile: UserProfile;
  tierConfigs: Record<UserTier, TierConfig>;
  onSelectEvent: (event: RaceEvent) => void;
  onCreateEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onOpenParticipant: (event?: RaceEvent) => void;
  onOpenSystemAdmin: () => void;
  onUpgradeClick: () => void;
  onDirectRaceCreate?: (event: RaceEvent) => void;
  onOpenProfile: () => void;
  onOpenSettings: (event: RaceEvent) => void; // New prop
}

const RatingDisplay: React.FC<{ ratings?: { score: number }[] }> = ({ ratings }) => {
    if (!ratings || ratings.length === 0) return null;
    const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
    return (
        <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-800/50">
            <Star className="w-3 h-3 fill-yellow-400" />
            {avg.toFixed(1)} ({ratings.length})
        </div>
    );
};

const StatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
    switch (status) {
        case 'archived':
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-gray-800 border-gray-600 text-gray-400 flex items-center gap-1"><Archive className="w-3 h-3" /> Arkiverad</span>;
        case 'completed':
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-purple-900/30 border-purple-800 text-purple-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Avslutad</span>;
        case 'active':
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-blue-900/30 border-blue-500 text-blue-400 animate-pulse">● Pågående</span>;
        case 'published':
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-green-900/30 border-green-800 text-green-400">Publicerad</span>;
        default: // draft
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-yellow-900/20 border-yellow-800 text-yellow-500">Utkast</span>;
    }
};

export const Dashboard: React.FC<DashboardProps> = ({ events, userTier, userProfile, tierConfigs, onSelectEvent, onCreateEvent, onDeleteEvent, onOpenParticipant, onOpenSystemAdmin, onUpgradeClick, onOpenProfile, onOpenSettings }) => {
  const [shareEvent, setShareEvent] = useState<RaceEvent | null>(null);

  // Avatar or generic icon with DiceBear Fallback
  const avatarUrl = userProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.name}`;

  // FILTER: Only show "Organized" events, hide "Instant Games" (played events)
  const organizedEvents = events.filter(e => !e.isInstantGame);

  return (
    <div className="h-full w-full bg-gray-950 text-gray-100 font-sans overflow-y-auto overflow-x-hidden">
      <div className="p-8 max-w-6xl mx-auto">
        <ShareDialog 
            isOpen={!!shareEvent}
            onClose={() => setShareEvent(null)}
            eventName={shareEvent?.name || ''}
            accessCode={shareEvent?.accessCode || ''}
        />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-4 cursor-pointer" onClick={onOpenProfile}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 overflow-hidden bg-gray-800 border-2 border-blue-500/50">
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Välkommen, {userProfile.name.split(' ')[0]}</h1>
              <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-400 font-medium text-xs tracking-wide uppercase">{userProfile.email || 'Gästkonto'}</span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpgradeClick(); }} 
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider transition-colors ${
                        userTier === 'MASTER' 
                        ? 'bg-amber-900/40 text-amber-300 border-amber-600 hover:bg-amber-800 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                        : userTier === 'CREATOR' 
                            ? 'bg-blue-900/40 text-blue-300 border-blue-800 hover:bg-blue-800' 
                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                      {userTier === 'MASTER' ? <Crown className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                      Plan: {tierConfigs[userTier].displayName}
                  </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            {userProfile.role === 'admin' && (
                <button 
                  onClick={onOpenSystemAdmin}
                  className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-300 border border-red-900/50 px-5 py-3 rounded-xl font-bold transition-all"
                  title="System Admin"
                >
                  <ShieldAlert className="w-5 h-5" />
                </button>
            )}
            <button 
              onClick={() => onOpenParticipant()}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-3 rounded-xl font-bold transition-all border border-gray-700"
            >
              <Users className="w-5 h-5" />
              Till Deltagarvy
            </button>
            <button 
              onClick={onCreateEvent}
              className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/30 active:scale-95"
            >
              <div className="bg-white/20 p-1 rounded-full group-hover:rotate-90 transition-transform">
                  <Plus className="w-5 h-5" />
              </div>
              Skapa Ny
            </button>
          </div>
        </div>

        {/* Grid */}
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Mina Event</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizedEvents.map(event => (
            <div key={event.id} className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all hover:shadow-2xl hover:-translate-y-1 group relative ${event.status === 'archived' ? 'opacity-60 hover:opacity-100' : ''}`}>
              
              {/* Card Header/Image */}
              <div className="h-48 bg-slate-800 relative overflow-hidden cursor-pointer" onClick={() => onSelectEvent(event)}>
                {event.coverImage ? (
                    <>
                        <img src={event.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover z-0" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10"></div>
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Map className="w-32 h-32" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10"></div>
                    </>
                )}
                
                <div className="flex justify-between items-start p-6 pb-4 relative z-20">
                    <div className="flex flex-col gap-2">
                         <StatusBadge status={event.status || 'draft'} />
                    </div>
                    <div className="flex gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShareEvent(event); }}
                            className="text-gray-600 hover:text-indigo-400 p-2 bg-gray-900/50 hover:bg-gray-800 rounded backdrop-blur transition-colors"
                            title="Dela event"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                            className="text-gray-600 hover:text-red-500 p-2 bg-gray-900/50 hover:bg-gray-800 rounded backdrop-blur transition-colors"
                            title="Radera event"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-4 left-6 z-20">
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-blue-900/80 border-blue-800 text-blue-300 backdrop-blur-sm">
                        {event.category}
                    </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white mb-2 line-clamp-1 group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => onSelectEvent(event)}>{event.name}</h2>
                    <RatingDisplay ratings={event.ratings} />
                </div>

                <div className="flex flex-col gap-2 text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.startDateTime).toLocaleDateString()} 
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        {new Date(event.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    
                    {event.startCity && (
                        <div className="flex items-center gap-2 text-white/80 font-medium">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            {event.startCity}
                            {event.finishCity && event.finishCity !== event.startCity && (
                                <span className="flex items-center gap-1 text-gray-500">
                                    → {event.finishCity}
                                </span>
                            )}
                        </div>
                    )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="px-6 py-3 bg-gray-950/50 border-y border-gray-800 flex justify-between text-xs font-medium text-gray-400">
                  <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                      <span>{event.checkpoints.length} CP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>{event.results?.length || 0} Deltagare</span>
                  </div>
              </div>

              {/* Actions - UPDATED LAYOUT */}
              <div className="p-4 flex gap-3">
                  <button 
                    onClick={() => onOpenSettings(event)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-gray-700"
                  >
                      <Settings2 className="w-4 h-4" /> Inställningar
                  </button>
                  <button 
                    onClick={() => onSelectEvent(event)}
                    className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                      <Map className="w-4 h-4" /> Designa Bana
                  </button>
              </div>
            </div>
          ))}

          {/* Enhanced Empty State */}
          {organizedEvents.length === 0 && (
              <div className="col-span-full py-24 px-6 text-center border-2 border-dashed border-gray-800/50 rounded-[2rem] bg-gray-900/20 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <LayoutTemplate className="w-10 h-10 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">Din arbetsyta är tom</h3>
                  <p className="text-gray-400 mb-8 max-w-md text-lg leading-relaxed">
                      Det är dags att bygga något episkt! Klicka nedan för att starta guiden och skapa ditt första äventyr.
                  </p>
                  <button 
                    onClick={onCreateEvent}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-3 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <Plus className="w-6 h-6" /> Skapa Nytt Äventyr
                  </button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
