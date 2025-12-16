
import React, { useRef, useEffect, useState } from 'react';
import { UserTier, TierConfig, RaceEvent, SystemConfig, UserProfile } from '../types';
import { Compass, Map, Zap, Crown, Check, ArrowRight, Star, Users, Trophy, Smartphone, Sparkles, LogIn, ChevronDown, Gamepad2, Mail, User, Loader2, Eye, EyeOff, ShieldAlert, LayoutDashboard } from 'lucide-react';
import { api } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { ZombieSurvivalButton } from './ZombieSurvivalButton';
import { ChristmasHuntButton } from './ChristmasHuntButton';
import { GlobalLeaderboard } from './GlobalLeaderboard';

// Mock Google Icon since lucide doesn't have it standard
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
    <path d="M12 4.6c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
  </svg>
);

interface LandingPageProps {
  onSelectTier: (tier: UserTier) => void;
  onBrowseEvents: () => void;
  tierConfigs: Record<UserTier, TierConfig>;
  onInstantGame?: (event: RaceEvent) => void;
  userProfile: UserProfile;
  onRegisterUser: (name: string, email: string) => void;
  onOpenProfile?: () => void;
  onOpenSystemAdmin?: () => void;
  onCreateEvent?: () => void;
  onGoToDashboard?: () => void; // New Prop
}

const TIER_VISUALS: Record<UserTier, {
  icon: React.ElementType;
  color: string;
}> = {
  SCOUT: {
    icon: Map,
    color: "from-gray-700 to-gray-900",
  },
  CREATOR: {
    icon: Zap,
    color: "from-blue-600 to-indigo-800",
  },
  MASTER: {
    icon: Crown,
    color: "from-purple-600 to-slate-900",
  }
};

// --- AUTH MODAL COMPONENT ---
const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { loginGoogle, loginEmail, registerEmail, loginAsGuest } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            if (mode === 'login') {
                await loginEmail(email, password);
            } else {
                if (!name) throw new Error("Namn krävs");
                await registerEmail(email, password, name);
            }
            onClose();
        } catch (err: any) {
            console.error("Auth Error:", err);
            if (err.code === 'auth/unauthorized-domain') {
                setError("Domänen är inte godkänd i Firebase (Authorized Domains).");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("E-postadressen används redan.");
            } else if (err.code === 'auth/invalid-credential') {
                setError("Fel e-post eller lösenord.");
            } else {
                setError(err.message || "Ett fel uppstod");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setError(null);
        loginGoogle()
            .then(onClose)
            .catch((e: any) => {
                console.error("Google Auth Error:", e);
                if (e.code === 'auth/unauthorized-domain') {
                    setError("Domänen är inte godkänd i Firebase Console.");
                } else if (e.code === 'auth/popup-closed-by-user') {
                    // User closed popup, no error needed
                    setError(null);
                } else {
                    setError("Google-inloggning misslyckades.");
                }
            });
    };

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                        {mode === 'login' ? 'Logga In' : 'Skapa Konto'}
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">Spara dina äventyr och resultat.</p>
                </div>
                
                <div className="space-y-3">
                    <button 
                        onClick={handleGoogleLogin}
                        className="w-full py-3 bg-white text-gray-800 font-bold rounded-xl shadow-lg transition-all hover:bg-gray-100 flex items-center justify-center gap-3"
                    >
                        <GoogleIcon />
                        {mode === 'login' ? 'Logga in' : 'Registrera'} med Google
                    </button>
                </div>

                <div className="relative my-6 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                    <div className="relative flex justify-center"><span className="bg-gray-900 px-2 text-xs text-gray-500 uppercase">Eller med e-post</span></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {mode === 'register' && (
                        <input 
                            type="text" 
                            placeholder="Ditt Namn"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                            required
                        />
                    )}
                    <input 
                        type="email" 
                        placeholder="E-postadress"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        required
                    />
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Lösenord"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                            required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-500 hover:text-white">
                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>

                    {error && <p className="text-red-400 text-xs text-center font-bold bg-red-900/20 p-2 rounded border border-red-900/50">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {mode === 'login' ? 'Logga In' : 'Skapa Konto'}
                    </button>
                </form>

                <div className="mt-4 flex flex-col gap-2 items-center">
                    <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-blue-400 hover:text-white">
                        {mode === 'login' ? 'Har du inget konto? Skapa här' : 'Har du redan ett konto? Logga in'}
                    </button>
                    
                    {api.isOffline && (
                        <button onClick={() => loginAsGuest().then(onClose)} className="text-xs text-gray-500 hover:text-gray-300 uppercase tracking-wider font-bold mt-2">
                            Fortsätt som Gäst (Preview Mode)
                        </button>
                    )}
                </div>
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
            </div>
        </div>
    );
};

const MockEventCard: React.FC<{ name: string, type: string, players: number, rating: number, image: string }> = ({ name, type, players, rating, image }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all hover:-translate-y-1 hover:shadow-xl group">
        <div className="h-32 bg-gray-800 relative">
             <div className={`absolute inset-0 bg-gradient-to-br ${image} opacity-60`}></div>
             <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur rounded text-[10px] font-bold uppercase text-white tracking-wider border border-white/10">
                 {type}
             </div>
        </div>
        <div className="p-4">
            <h3 className="font-bold text-white text-lg mb-1 group-hover:text-blue-400 transition-colors">{name}</h3>
            <div className="flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {players} deltagare
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-3 h-3 fill-yellow-500" /> {rating}
                </div>
            </div>
        </div>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectTier, onBrowseEvents, tierConfigs, onInstantGame, userProfile, onOpenProfile, onOpenSystemAdmin, onCreateEvent, onGoToDashboard }) => {
  const pricingRef = useRef<HTMLDivElement>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // Auth Flow State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Pending Game Logic (Login-before-play)
  const [pendingGameType, setPendingGameType] = useState<'zombie' | 'christmas' | null>(null);

  // Leaderboard State
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'zombie_survival' | 'christmas_hunt'>('zombie_survival');

  useEffect(() => {
    const load = async () => {
        try {
            const config = await api.config.getConfig();
            setSystemConfig(config);
        } catch (e) {
            console.error("Failed to load config", e);
        } finally {
            setLoadingConfig(false);
        }
    };
    load();
  }, []);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGameCreated = (event: RaceEvent) => {
      // Logic moved to button components via autoStart, this is just for final safety
      if (onInstantGame) onInstantGame(event);
  };

  const handleHeroCreateClick = () => {
      if (userProfile.id !== 'guest' && onCreateEvent) {
          onCreateEvent();
      } else {
          scrollToPricing();
      }
  };

  const openLeaderboard = (mode: 'zombie_survival' | 'christmas_hunt') => {
      setLeaderboardMode(mode);
      setIsLeaderboardOpen(true);
  };

  const hasFeaturedModes = systemConfig?.featuredModes?.zombie_survival?.isActive || systemConfig?.featuredModes?.christmas_hunt?.isActive;
  const avatarUrl = userProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.name}`;
  const isGuest = userProfile.id === 'guest';

  if (loadingConfig) {
      return (
          <div className="h-full w-full bg-slate-950 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
      );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white font-sans flex flex-col relative overflow-y-auto overflow-x-hidden">
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      <GlobalLeaderboard 
        isOpen={isLeaderboardOpen} 
        onClose={() => setIsLeaderboardOpen(false)} 
        defaultMode={leaderboardMode}
      />

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => window.location.href = '/'}
            title="Startsidan"
          >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter text-white">QUESTER</span>
          </div>
          <div className="flex gap-4">
              {userProfile.role === 'admin' && onOpenSystemAdmin && (
                  <button onClick={onOpenSystemAdmin} className="text-xs font-bold text-red-500 border border-red-900/50 bg-red-900/20 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-900/40 transition-colors uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4" />
                      System
                  </button>
              )}

              {/* NEW DASHBOARD BUTTON */}
              {userProfile.id !== 'guest' && onGoToDashboard && (
                  <button
                      onClick={onGoToDashboard}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold border border-white/10 transition-all shadow-sm"
                  >
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="hidden sm:inline">Mina Event</span>
                  </button>
              )}

              {userProfile.id !== 'guest' ? (
                  <button onClick={onOpenProfile} className="text-sm font-bold text-white bg-white/10 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-colors">
                      <img src={avatarUrl} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
                      {userProfile.name}
                  </button>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Logga In</span>
                </button>
              )}
          </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative z-10 container mx-auto px-4 pt-10 pb-20 flex flex-col items-center flex-1 text-center">
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3 h-3" /> Upplev Sveriges nya äventyrsplattform
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 text-white drop-shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 leading-[0.9]">
            ÄVENTYRET <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">VÄNTAR PÅ DIG</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Quester samlar lopp, tipspromenader och utmaningar på ett ställe. 
            Hitta ditt nästa äventyr eller skapa ett eget med hjälp av AI.
        </p>

        {/* Dual CTA */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <button 
                onClick={onBrowseEvents}
                className="flex-1 py-4 px-8 rounded-2xl bg-white text-black font-black text-lg hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 flex items-center justify-center gap-2"
            >
                <Compass className="w-5 h-5" /> Hitta Äventyr
            </button>
            <button 
                onClick={handleHeroCreateClick}
                className="flex-1 py-4 px-8 rounded-2xl bg-gray-800/50 backdrop-blur border border-gray-600 text-white font-bold text-lg hover:bg-gray-800 transition-all hover:border-gray-400 flex items-center justify-center gap-2"
            >
                <Zap className="w-5 h-5 text-yellow-400" /> Skapa Event
            </button>
        </div>

        {/* ACTIVE GAMES SECTION */}
        {hasFeaturedModes && (
            <div className="mt-16 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
                <div className="flex items-center justify-center gap-2 mb-6 opacity-70">
                    <div className="h-px w-12 bg-white/20"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Live Events & Instant Games</span>
                    <div className="h-px w-12 bg-white/20"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {systemConfig?.featuredModes?.zombie_survival?.isActive && (
                        <ZombieSurvivalButton 
                            onGameCreated={handleGameCreated} 
                            userTier="SCOUT"
                            isGuest={isGuest}
                            onAuthRequired={() => {
                                setPendingGameType('zombie');
                                setIsAuthModalOpen(true);
                            }}
                            autoStart={pendingGameType === 'zombie' && !isGuest}
                            onAutoStartConsumed={() => setPendingGameType(null)}
                            onShowLeaderboard={() => openLeaderboard('zombie_survival')}
                        />
                    )}
                    {systemConfig?.featuredModes?.christmas_hunt?.isActive && (
                        <ChristmasHuntButton 
                            onGameCreated={handleGameCreated} 
                            userTier="SCOUT" 
                            isGuest={isGuest}
                            onAuthRequired={() => {
                                setPendingGameType('christmas');
                                setIsAuthModalOpen(true);
                            }}
                            autoStart={pendingGameType === 'christmas' && !isGuest}
                            onAutoStartConsumed={() => setPendingGameType(null)}
                            onShowLeaderboard={() => openLeaderboard('christmas_hunt')}
                        />
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Participant Features Section */}
      <div className="relative z-10 bg-slate-900/50 border-y border-white/5 py-20">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-black uppercase italic tracking-tight mb-4">För Äventyrare & Lag</h2>
                  <p className="text-gray-400 max-w-xl mx-auto">Upptäck en värld av interaktiva lopp. Oavsett om du gillar löpning, cykling eller kluriga gåtor.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="text-center">
                      <div className="w-16 h-16 bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-400 border border-blue-500/20">
                          <Map className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Interaktiva Kartor</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">Navigera i realtid, hitta dolda checkpoints och lös uppdrag direkt i mobilen.</p>
                  </div>
                  <div className="text-center">
                      <div className="w-16 h-16 bg-purple-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-purple-400 border border-purple-500/20">
                          <Trophy className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Topplistor & Resultat</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">Tävla mot vänner eller hela Sverige. Se poäng och tider live under loppets gång.</p>
                  </div>
                  <div className="text-center">
                      <div className="w-16 h-16 bg-green-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-green-400 border border-green-500/20">
                          <Smartphone className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Ingen App Krävs</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">Allt körs direkt i webbläsaren. Klicka på en länk och du är igång på sekunder.</p>
                  </div>
              </div>
          </div>
      </div>

      {/* Popular Events Teaser - Always visible now */}
      <div className="relative z-10 py-20 max-w-7xl mx-auto px-6 w-full">
          <div className="flex justify-between items-end mb-10">
              <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">Populära Just Nu</h2>
                  <p className="text-gray-400 text-sm mt-2">Äventyr som trendar i communityt</p>
              </div>
              <button onClick={onBrowseEvents} className="hidden sm:flex items-center gap-2 text-blue-400 font-bold hover:text-white transition-colors">
                  Visa Alla <ArrowRight className="w-4 h-4" />
              </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <MockEventCard name="Stadjakten Sthlm" type="Tipspromenad" players={1240} rating={4.8} image="from-blue-800 to-slate-900" />
                  <MockEventCard name="Zombie Run 2025" type="Äventyr" players={856} rating={4.9} image="from-red-900 to-black" />
                  <MockEventCard name="Höstvandringen" type="Natur" players={342} rating={4.5} image="from-green-800 to-emerald-900" />
                  <MockEventCard name="Företagskampen" type="Teambuilding" players={150} rating={4.7} image="from-purple-800 to-indigo-900" />
          </div>

          <button onClick={onBrowseEvents} className="sm:hidden w-full mt-8 py-3 bg-gray-800 rounded-xl font-bold text-white">Visa Alla Event</button>
      </div>

      {/* Organizer / Pricing Section */}
      <div ref={pricingRef} className="relative z-10 bg-slate-950 py-24 border-t border-white/10">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-4 border border-indigo-500/30">
                    För Arrangörer
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6">SKAPA DITT EGET ÄVENTYR</h2>
                <p className="text-lg text-slate-400 leading-relaxed">
                    Använd våra kraftfulla verktyg för att designa banor, generera frågor med AI och hantera deltagare. 
                    Välj nivån som passar dig bäst.
                </p>
            </div>

            {/* Tier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['SCOUT', 'CREATOR', 'MASTER'] as UserTier[]).map((tier, index) => {
                    const config = tierConfigs[tier];
                    const visual = TIER_VISUALS[tier];
                    const Icon = visual.icon;
                    const isRecommended = config.isRecommended;
                    
                    return (
                        <div 
                            key={tier}
                            className={`relative group rounded-[2rem] p-1 transition-all duration-300 hover:-translate-y-2`}
                        >
                            {/* Border Gradient & Glow */}
                            <div className={`absolute inset-0 bg-gradient-to-b ${visual.color} rounded-[2rem] opacity-20 blur-md group-hover:opacity-50 transition-opacity`}></div>
                            
                            <div className="relative h-full bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[1.9rem] p-8 flex flex-col overflow-hidden">
                                {isRecommended && (
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-lg z-20">
                                        Populärast
                                    </div>
                                )}

                                <div className="mb-6 flex items-start justify-between">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${visual.color} flex items-center justify-center shadow-lg`}>
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tight">{config.displayName}</h3>
                                        <div className="text-slate-400 font-mono text-sm">
                                            {config.priceAmount === 'Offert' ? config.priceAmount : `${config.priceAmount} ${config.priceCurrency}`}
                                            {config.priceFrequency && <span className="text-xs block text-slate-500">{config.priceFrequency}</span>}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-slate-300 text-sm mb-8 leading-relaxed h-16 border-b border-white/5 pb-4">
                                    {config.description}
                                </p>

                                <div className="space-y-4 flex-1 mb-8">
                                    {config.features.map((feat, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                                            <div className="w-5 h-5 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0">
                                                <Check className="w-3 h-3 text-blue-400" />
                                            </div>
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => onSelectTier(tier)}
                                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group-hover:gap-4 ${
                                        isRecommended 
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/30' 
                                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    {config.buttonText} <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-black py-12 border-t border-white/10 pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto px-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-6 opacity-50">
                    <Compass className="w-6 h-6" />
                    <span className="font-black text-xl tracking-tighter">QUESTER</span>
                </div>
                <div className="flex justify-center gap-8 text-sm text-gray-500 mb-8">
                    <a href="#" className="hover:text-white transition-colors">Om Oss</a>
                    <a href="#" className="hover:text-white transition-colors">Support</a>
                    <a href="#" className="hover:text-white transition-colors">Integritet</a>
                    <a href="#" className="hover:text-white transition-colors">Villkor</a>
                </div>
                <div className="text-gray-600 text-xs">
                    © 2025 Quester AI. All rights reserved.
                </div>
          </div>
      </footer>
    </div>
  );
};
