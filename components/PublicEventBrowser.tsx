
// ... existing imports ...
import React, { useState, useMemo, useEffect } from 'react';
import { RaceEvent, UserTier, SystemConfig, UserProfile, ParticipantResult } from '../types';
import { Search, MapPin, Calendar, ArrowRight, Key, Filter, Compass, ChevronRight, Star, ShieldAlert, Sparkles, Zap, ArrowLeft, Gamepad2, Trophy, Loader2, PlayCircle, Clock, Crown, XCircle, Flag, User, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { api } from '../services/dataService';
import { ZombieSurvivalButton } from './ZombieSurvivalButton';
import { ChristmasHuntButton } from './ChristmasHuntButton';
import { GlobalLeaderboard } from './GlobalLeaderboard';
import { EventLeaderboardDialog } from './EventLeaderboardDialog';

interface PublicEventBrowserProps {
  events: RaceEvent[];
  onJoinRace: (event: RaceEvent) => void;
  onBackToAdmin: () => void;
  onOpenSystemAdmin: () => void;
  initialJoinCode?: string;
  onBack?: () => void;
  onGoHome?: () => void; // New Prop
  onDirectRaceCreate?: (event: RaceEvent) => void;
  userProfile?: UserProfile;
  onOpenProfile?: () => void; // New Prop
}

const RatingDisplay: React.FC<{ ratings?: { score: number }[] }> = ({ ratings }) => {
    const hasRatings = ratings && ratings.length > 0;
    const avg = hasRatings ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;
    
    return (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full backdrop-blur-md border shadow-lg ${hasRatings ? 'bg-black/40 text-yellow-400 border-yellow-500/30' : 'bg-black/20 text-gray-400 border-gray-500/30'}`}>
            <Star className={`w-3 h-3 ${hasRatings ? 'fill-yellow-400' : 'text-gray-500'}`} />
            {hasRatings ? `${avg.toFixed(1)} (${ratings.length})` : 'Nytt'}
        </div>
    );
};

export const PublicEventBrowser: React.FC<PublicEventBrowserProps> = ({ events, onJoinRace, onBackToAdmin, onOpenSystemAdmin, initialJoinCode, onBack, onGoHome, onDirectRaceCreate, userProfile, onOpenProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alla');
  const [directCode, setDirectCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  
  // Local state to hide forfeited events instantly before backend sync
  const [hiddenEventIds, setHiddenEventIds] = useState<Set<string>>(new Set());
  
  // Leaderboard State
  const [isGlobalLeaderboardOpen, setIsGlobalLeaderboardOpen] = useState(false);
  const [selectedLeaderboardEvent, setSelectedLeaderboardEvent] = useState<RaceEvent | null>(null);

  // Load System Config Async
  useEffect(() => {
      const loadConfig = async () => {
          try {
              const cfg = await api.config.getConfig();
              setSystemConfig(cfg);
          } catch(e) {
              console.warn("Failed to load config", e);
          }
      };
      loadConfig();
  }, []);

  // Auto-fill from deep link
  useEffect(() => {
      if (initialJoinCode) {
          setDirectCode(initialJoinCode);
      }
  }, [initialJoinCode]);

  // Extract unique categories from public events
  const categories = useMemo(() => {
    // Also filter categories based on visibility to avoid showing categories for hidden drafts
    const cats = new Set(events.filter(e => e.isPublic && ['published', 'active', 'completed'].includes(e.status || 'draft')).map(e => e.category));
    return ['Alla', ...Array.from(cats)];
  }, [events]);

  // Find ongoing events for this user (Resume Feature)
  const ongoingEvents = useMemo(() => {
      if (!userProfile) return [];
      return events.filter(e => {
          if (hiddenEventIds.has(e.id)) return false;
          const result = e.results?.find(r => r.id === userProfile.id);
          return result && result.status === 'running';
      });
  }, [events, userProfile, hiddenEventIds]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Admin locked events are never public
      if (event.isLockedByAdmin) return false;
      if (!event.isPublic) return false;

      // Filter out Drafts and Archived events
      // Only show Published, Active or Completed
      const validStatuses = ['published', 'active', 'completed'];
      if (!validStatuses.includes(event.status || 'draft')) {
          return false;
      }

      const matchesCategory = selectedCategory === 'Alla' || event.category === selectedCategory;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        event.name.toLowerCase().includes(searchLower) || 
        event.description.toLowerCase().includes(searchLower) ||
        (event.startCity && event.startCity.toLowerCase().includes(searchLower));

      return matchesCategory && matchesSearch;
    });
  }, [events, searchTerm, selectedCategory]);

  // Helper to sort results for teaser
  const getSortedPodium = (event: RaceEvent): ParticipantResult[] => {
      if (!event.results || event.results.length === 0) return [];
      const finished = event.results.filter(r => r.status === 'finished');
      return finished.sort((a, b) => {
          if (event.winCondition === 'most_points') {
              if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
              return a.finishTime.localeCompare(b.finishTime);
          } else {
              if (a.finishTime !== b.finishTime) return a.finishTime.localeCompare(b.finishTime);
              return b.totalPoints - a.totalPoints;
          }
      }).slice(0, 3);
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const event = events.find(e => e.accessCode?.toUpperCase() === directCode.toUpperCase());
    if (event) {
      if (event.isLockedByAdmin) {
          setCodeError(true);
      } else {
          onJoinRace(event);
          setCodeError(false);
      }
    } else {
      setCodeError(true);
    }
  };

  const handleForfeit = async (event: RaceEvent) => {
      if (confirm(`Vill du ge upp loppet "${event.name}"? Du kommer markeras som DNF (Did Not Finish).`)) {
          const result = event.results?.find(r => r.id === userProfile?.id);
          if (result && userProfile) {
              // Optimistically hide
              const newHidden = new Set(hiddenEventIds);
              newHidden.add(event.id);
              setHiddenEventIds(newHidden);

              // Update backend
              await api.events.saveResult(event.id, {
                  ...result,
                  status: 'dnf'
              });
          }
      }
  };

  // Safe Navigation for Config
  const activeZombie = systemConfig?.featuredModes?.zombie_survival?.isActive;
  const activeChristmas = systemConfig?.featuredModes?.christmas_hunt?.isActive;
  const hasActiveModes = activeZombie || activeChristmas; // Also considering Extraction always active for now
  const userTier = userProfile?.tier || 'SCOUT';
  const isLoggedIn = userProfile && userProfile.id !== 'guest';
  const avatarUrl = userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name}`;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-gray-100 font-sans flex flex-col relative overflow-y-auto overflow-x-hidden">
      
      <GlobalLeaderboard isOpen={isGlobalLeaderboardOpen} onClose={() => setIsGlobalLeaderboardOpen(false)} />
      <EventLeaderboardDialog isOpen={!!selectedLeaderboardEvent} onClose={() => setSelectedLeaderboardEvent(null)} event={selectedLeaderboardEvent} />

      {/* Background Ambience - Fixed */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Navbar */}
      <nav className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              {onBack && (
                  <button onClick={onBack} className="mr-2 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                  </button>
              )}
              {/* Clickable Logo to Go Home */}
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onGoHome}
                title="Gå till startsidan"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <Compass className="text-white w-5 h-5" />
                </div>
                <span className="font-black text-xl tracking-tight text-white">QUESTER</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
                 {userProfile?.role === 'admin' && (
                    <button 
                      onClick={onOpenSystemAdmin}
                      className="hidden md:flex text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors items-center gap-1 uppercase tracking-widest border border-red-900/50 px-3 py-1 rounded-full bg-red-900/20"
                    >
                      <ShieldAlert className="w-3 h-3" /> System
                    </button>
                 )}

                 {isLoggedIn ? (
                    <>
                        <button
                            onClick={onBackToAdmin}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold border border-white/10 transition-all shadow-sm"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="hidden sm:inline">Mina Event</span>
                        </button>

                        <button 
                            onClick={onOpenProfile}
                            className="text-sm font-bold text-white bg-white/10 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-colors"
                        >
                            <img src={avatarUrl} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
                            {userProfile?.name}
                        </button>
                    </>
                 ) : (
                    <>
                        <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                        <button 
                          onClick={onBackToAdmin}
                          className="text-xs font-bold px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-all text-gray-300 hover:text-white"
                        >
                          Arrangörslogin
                        </button>
                    </>
                 )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- ONGOING ADVENTURES (RESUME) --- */}
      {ongoingEvents.length > 0 && (
          <div className="relative z-10 py-8 bg-indigo-900/20 border-b border-indigo-500/20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                          <Clock className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h2 className="text-lg font-black text-white uppercase tracking-widest">Pågående Äventyr</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {ongoingEvents.map(event => {
                          const result = event.results?.find(r => r.id === userProfile?.id);
                          return (
                              <div key={event.id} className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-lg hover:border-indigo-400 transition-colors">
                                  <div className="flex justify-between items-start mb-4">
                                      <div>
                                          <h3 className="font-bold text-white text-lg">{event.name}</h3>
                                          <div className="flex items-center gap-3 mt-1 text-sm text-indigo-200">
                                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {result?.checkpointsVisited || 0} CPs</span>
                                              <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {result?.totalPoints || 0}p</span>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex gap-3">
                                      <button 
                                        onClick={() => onJoinRace(event)}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                                      >
                                          <PlayCircle className="w-4 h-4" /> Fortsätt
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleForfeit(event)}
                                        className="px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-transparent hover:border-red-900/50 transition-colors flex items-center justify-center gap-1"
                                        title="Ge Upp (DNF)"
                                      >
                                          <Flag className="w-3 h-3" /> Ge Upp
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* FEATURED INSTANT GAMES (Conditional) */}
      {onDirectRaceCreate && (
          <div className="relative z-10 py-10 border-b border-white/5 bg-slate-900/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                          <Gamepad2 className="w-5 h-5 text-green-400" />
                          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Live Events & Instant Games</h2>
                      </div>
                      
                      <button 
                        onClick={() => setIsGlobalLeaderboardOpen(true)}
                        className="flex items-center gap-2 text-xs font-bold text-yellow-400 bg-yellow-900/20 px-3 py-1.5 rounded-full border border-yellow-600/30 hover:bg-yellow-900/40 transition-colors"
                      >
                          <Trophy className="w-3 h-3" /> Topplistor
                      </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {activeZombie && <ZombieSurvivalButton onGameCreated={onDirectRaceCreate} userTier={userTier} />}
                      {activeChristmas && <ChristmasHuntButton onGameCreated={onDirectRaceCreate} userTier={userTier} />}
                  </div>
              </div>
          </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 pt-12 pb-16 px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-2xl">
            HITTA DITT <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ÄVENTYR</span>
        </h1>
        <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Delta i spännande lopp, lös kluriga uppdrag och tävla mot andra. 
            Ange din startkod nedan eller utforska öppna event.
        </p>

        {/* Code Entry - Floating Card */}
        <div className="max-w-md mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-75 transition duration-500 animate-shine bg-[length:200%_100%]"></div>
            <form onSubmit={handleCodeSubmit} className="relative flex bg-slate-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <div className="pl-4 py-4 flex items-center justify-center text-slate-500">
                    <Key className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={directCode}
                    onChange={(e) => { setDirectCode(e.target.value); setCodeError(false); }}
                    placeholder="ANGE EVENTKOD"
                    className="w-full bg-transparent border-none text-white px-4 py-5 focus:ring-0 placeholder-slate-600 font-mono text-lg font-bold uppercase tracking-widest"
                />
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 font-bold transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                >
                    GÅ MED
                </button>
            </form>
            {codeError && (
                <div className="absolute -bottom-10 left-0 right-0 text-center animate-bounce">
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold">
                        Ogiltig kod eller låst event
                    </span>
                </div>
            )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-16 z-40 bg-slate-950/80 backdrop-blur-md border-y border-white/5 py-4 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
             <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                 <Sparkles className="w-4 h-4 text-purple-400" />
                 {filteredEvents.length} Tillgängliga Event
             </div>
             
             <div className="flex gap-2 w-full sm:w-auto">
                 <div className="relative flex-1 sm:flex-none">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                     <input 
                        type="text"
                        placeholder="Sök event..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                     />
                 </div>
                 <div className="relative">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg pl-4 pr-8 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                        {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3 pointer-events-none" />
                 </div>
             </div>
          </div>
      </div>

      {/* Event Grid */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 w-full z-10 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map(event => {
            const podium = getSortedPodium(event);
            const hasResults = podium.length > 0;
            const isOfficial = event.ownerId === 'QUESTER_SYSTEM';

            return (
                <div 
                key={event.id}
                className={`group relative bg-slate-900 rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-2 flex flex-col h-full ${
                    isOfficial 
                    ? 'border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:border-indigo-400' 
                    : 'border-white/5 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                }`}
                >
                {/* Card Image Area */}
                <div className="h-48 bg-slate-800 relative overflow-hidden cursor-pointer" onClick={() => onJoinRace(event)}>
                    
                    {event.coverImage ? (
                        <>
                            <img src={event.coverImage} alt="Event Cover" className="absolute inset-0 w-full h-full object-cover z-0" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10"></div>
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10"></div>
                            
                            {/* Dynamic Abstract Pattern */}
                            <div className="absolute inset-0 opacity-30 group-hover:scale-110 transition-transform duration-700">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-slate-900"></div>
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0 100 Q 50 50 100 100 T 200 100" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
                                    <circle cx="80" cy="20" r="30" fill="rgba(59,130,246,0.1)" />
                                </svg>
                            </div>
                        </>
                    )}

                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                        <RatingDisplay ratings={event.ratings} />
                    </div>
                    
                    <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur rounded-lg text-[10px] font-bold uppercase tracking-wider text-white border border-white/20">
                            {event.eventType || 'Lopp'}
                        </span>
                        <span className="px-3 py-1 bg-blue-600/90 backdrop-blur rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                            {event.category}
                        </span>
                    </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-auto cursor-pointer" onClick={() => onJoinRace(event)}>
                        <h3 className="text-2xl font-black text-white mb-2 group-hover:text-blue-400 transition-colors leading-tight">{event.name}</h3>
                        
                        <div className="flex flex-col gap-2 text-xs font-bold text-slate-500 mb-4 uppercase tracking-wide">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(event.startDateTime).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {event.checkpoints.length} CP
                                </div>
                            </div>
                            
                            {/* NEW: City Display */}
                            {event.startCity && (
                                <div className="flex items-center gap-1.5 text-blue-400/80">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{event.startCity}</span>
                                    {event.finishCity && event.finishCity !== event.startCity && (
                                        <span className="text-slate-500"> → {event.finishCity}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                            {event.description}
                        </p>
                    </div>

                    {/* NEW: Creator Info Display */}
                    {event.ownerName && (
                        <div className="flex items-center justify-between mt-auto mb-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full overflow-hidden border flex items-center justify-center ${isOfficial ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-white/10'}`}>
                                    {isOfficial ? (
                                        <Compass className="w-3.5 h-3.5 text-white" />
                                    ) : event.ownerPhotoURL ? (
                                        <img src={event.ownerPhotoURL} alt={event.ownerName} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-3 h-3 text-slate-500" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold leading-none mb-0.5">Arrangör</span>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-bold leading-none ${isOfficial ? 'text-indigo-300' : 'text-slate-300'}`}>{event.ownerName}</span>
                                        {isOfficial && <ShieldCheck className="w-3 h-3 text-indigo-400" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NEW PODIUM SECTION */}
                    <div className={`pt-2 ${!event.ownerName ? 'mt-4 border-t border-white/5' : ''}`}>
                        {hasResults ? (
                            <div className="flex justify-between items-center mb-3">
                                {/* Facepile Podium */}
                                <button 
                                    onClick={() => setSelectedLeaderboardEvent(event)}
                                    className="flex -space-x-3 items-center group/podium hover:scale-105 transition-transform"
                                >
                                    {podium.map((p, i) => {
                                        let borderClass = 'border-slate-700 z-0';
                                        if (i === 0) borderClass = 'border-yellow-500 z-30 ring-2 ring-yellow-500/20';
                                        if (i === 1) borderClass = 'border-slate-300 z-20';
                                        if (i === 2) borderClass = 'border-amber-700 z-10';

                                        return (
                                            <div key={p.id} className={`w-8 h-8 rounded-full bg-slate-800 border-2 ${borderClass} flex items-center justify-center text-[10px] font-bold text-white overflow-hidden relative shadow-lg`}>
                                                {p.profileImage ? (
                                                    <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    p.name.charAt(0)
                                                )}
                                                {i === 0 && <div className="absolute inset-0 bg-yellow-500/20"></div>}
                                            </div>
                                        );
                                    })}
                                    {(event.results?.length || 0) > 3 && (
                                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[8px] text-gray-400 ml-1 z-40">
                                            +{(event.results?.length || 0) - 3}
                                        </div>
                                    )}
                                </button>
                                
                                {/* Link to Leaderboard */}
                                <button 
                                    onClick={() => setSelectedLeaderboardEvent(event)}
                                    className="text-xs font-bold text-gray-400 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                                >
                                    <Trophy className="w-3 h-3" />
                                    Se Topplista
                                </button>
                            </div>
                        ) : (
                            // Empty State
                            <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 italic">
                                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                                Inga resultat registrerade än. Bli först!
                            </div>
                        )}

                        {/* Main CTA */}
                        <button 
                            onClick={() => onJoinRace(event)}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            GÅ MED <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                </div>
            );
          })}

          {/* Empty State */}
          {filteredEvents.length === 0 && (
            <div className="col-span-full py-32 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border border-slate-800 mb-6 shadow-2xl">
                  <Compass className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Inga äventyr hittades</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                  Det verkar inte finnas några publika event som matchar din sökning just nu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
