
import React, { useRef, useEffect, useState } from 'react';
import { UserTier, TierConfig, RaceEvent, SystemConfig, UserProfile } from '../types';
import { 
  Compass, Map, Zap, Crown, Check, ArrowRight, Star, Users, 
  Trophy, Smartphone, Sparkles, LogIn, ChevronDown, Gamepad2, 
  Mail, User, Loader2, Eye, EyeOff, ShieldAlert, LayoutDashboard, 
  Share2, Play, MousePointer2, Heart, Building2, School, X, PenTool 
} from 'lucide-react';
import { api } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { ZombieSurvivalButton } from './ZombieSurvivalButton';
import { ChristmasHuntButton } from './ChristmasHuntButton';
import { GlobalLeaderboard } from './GlobalLeaderboard';
import { TermsDialog } from './TermsDialog';
import { AboutUsDialog } from './AboutUsDialog';

// Mock Google Icon
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
  onGoToDashboard?: () => void;
}

const TIER_VISUALS: Record<UserTier, {
  icon: React.ElementType;
  color: string;
}> = {
  SCOUT: { icon: Map, color: "from-gray-700 to-gray-900" },
  CREATOR: { icon: Zap, color: "from-blue-600 to-indigo-800" },
  MASTER: { icon: Crown, color: "from-purple-600 to-slate-900" }
};

const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { loginGoogle, loginEmail, registerEmail } = useAuth();
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
            if (mode === 'login') await loginEmail(email, password);
            else await registerEmail(email, password, name);
            onClose();
        } catch (err: any) {
            setError(err.message || "Ett fel uppstod");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                        {mode === 'login' ? 'Logga In' : 'Skapa Konto'}
                    </h2>
                </div>
                <div className="space-y-3">
                    <button onClick={() => loginGoogle().then(onClose)} className="w-full py-3 bg-white text-gray-800 font-bold rounded-xl shadow-lg transition-all hover:bg-gray-100 flex items-center justify-center gap-3">
                        <GoogleIcon />
                        {mode === 'login' ? 'Logga in' : 'Registrera'} med Google
                    </button>
                </div>
                <div className="relative my-6 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                    <div className="relative flex justify-center"><span className="bg-gray-900 px-2 text-xs text-gray-500 uppercase">Eller e-post</span></div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {mode === 'register' && <input type="text" placeholder="Namn" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" required />}
                    <input type="email" placeholder="E-post" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" required />
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder="Lösenord" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-500 hover:text-white">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {error && <div className="text-red-500 text-xs text-center font-bold">{error}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">{isLoading && <Loader2 className="w-4 h-4 animate-spin" />}{mode === 'login' ? 'Logga In' : 'Skapa Konto'}</button>
                </form>
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-4 w-full text-sm text-blue-400 text-center">{mode === 'login' ? 'Inget konto? Registrera dig' : 'Redan konto? Logga in'}</button>
            </div>
        </div>
    );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectTier, onBrowseEvents, tierConfigs, onInstantGame, userProfile, onOpenProfile, onOpenSystemAdmin, onCreateEvent, onGoToDashboard }) => {
  const pricingRef = useRef<HTMLDivElement>(null);
  const explainerRef = useRef<HTMLDivElement>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'zombie_survival' | 'christmas_hunt'>('zombie_survival');
  
  // Dialog State
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState<'terms' | 'privacy'>('terms');
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);

  useEffect(() => {
    api.config.getConfig().then(cfg => {
        setSystemConfig(cfg);
        setLoadingConfig(false);
    });
  }, []);

  const scrollToExplainer = () => explainerRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToPricing = () => pricingRef.current?.scrollIntoView({ behavior: 'smooth' });

  const hasFeaturedModes = systemConfig?.featuredModes?.zombie_survival?.isActive || systemConfig?.featuredModes?.christmas_hunt?.isActive;
  const avatarUrl = userProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.name}`;

  if (loadingConfig) return <div className="h-full w-full bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white font-sans flex flex-col relative overflow-y-auto overflow-x-hidden">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <GlobalLeaderboard isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} defaultMode={leaderboardMode} />
      <TermsDialog isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} initialTab={termsTab} />
      <AboutUsDialog isOpen={isAboutUsOpen} onClose={() => setIsAboutUsOpen(false)} />

      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

      {/* Nav */}
      <nav className="relative z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Compass className="w-6 h-6 text-white" /></div>
              <span className="font-black text-xl tracking-tighter">QUESTER</span>
          </div>
          <div className="flex gap-4">
              {userProfile.id !== 'guest' ? (
                  <div className="flex gap-2">
                    <button onClick={onGoToDashboard} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold border border-white/10 flex items-center gap-2 transition-colors"><LayoutDashboard className="w-4 h-4" /> Mina Event</button>
                    <button onClick={onOpenProfile} className="text-sm font-bold bg-white/10 px-4 py-2 rounded-lg flex items-center gap-2 border border-white/5 hover:bg-white/20 transition-colors"><img src={avatarUrl} className="w-5 h-5 rounded-full object-cover" /> {userProfile.name.split(' ')[0]}</button>
                  </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-bold text-gray-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 transition-colors"><LogIn className="w-4 h-4" /> Logga In</button>
              )}
          </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative z-10 container mx-auto px-4 pt-12 pb-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3 h-3" /> GPS-Äventyr & Digitala Uppdrag
        </div>

        <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 text-white leading-[0.9] max-w-4xl drop-shadow-2xl">
            VERKLIGHETEN ÄR DIN <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">SPELPLAN</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed opacity-80 font-medium">
            Skapa episka skattjakter, svensexor eller företagsevent på 5 minuter. Ingen app krävs – deltagarna kör direkt i mobilen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button onClick={onBrowseEvents} className="flex-1 py-5 px-8 rounded-2xl bg-white text-black font-black text-xl hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 active:scale-95">Hitta Äventyr</button>
            <button onClick={scrollToExplainer} className="flex-1 py-5 px-8 rounded-2xl bg-gray-800/50 backdrop-blur border border-gray-600 text-white font-bold text-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 active:scale-95">Hur det funkar</button>
        </div>

        <div className="mt-12 flex items-center gap-4 text-slate-500">
            <div className="flex items-center gap-2 bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-900/30"><Smartphone className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-widest">Ingen nedladdning</span></div>
            <div className="flex items-center gap-2 bg-green-950/30 px-3 py-1.5 rounded-full border border-green-900/30"><Map className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-widest">Full frihet på kartan</span></div>
        </div>
      </div>

      {/* 1-2-3 EXPLAINER SECTION */}
      <div ref={explainerRef} className="relative z-10 py-24 bg-slate-900/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight mb-4 text-white">Så skapar du ett äventyr</h2>
                  <p className="text-slate-400 text-lg">Från idé till startskott på under 5 minuter.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                  {/* Decorative Line (Desktop only) */}
                  <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

                  <div className="flex flex-col items-center text-center group">
                      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform relative z-10">
                          <span className="absolute -top-4 -left-4 w-10 h-10 bg-slate-900 rounded-full border-2 border-blue-500 flex items-center justify-center font-black text-blue-400">1</span>
                          <PenTool className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-white">Designa din rutt</h3>
                      <p className="text-slate-400 leading-relaxed max-w-[280px]">Välj en färdig mall eller placera ut dina egna checkpoints direkt på kartan.</p>
                  </div>

                  <div className="flex flex-col items-center text-center group">
                      <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform relative z-10">
                          <span className="absolute -top-4 -left-4 w-10 h-10 bg-slate-900 rounded-full border-2 border-indigo-500 flex items-center justify-center font-black text-indigo-400">2</span>
                          <Share2 className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-white">Dela koden</h3>
                      <p className="text-slate-400 leading-relaxed max-w-[280px]">Skicka länken eller koden till deltagarna. De öppnar den direkt i sin webbläsare. Ingen app krävs.</p>
                  </div>

                  <div className="flex flex-col items-center text-center group">
                      <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(22,163,74,0.4)] group-hover:scale-110 transition-transform relative z-10">
                          <span className="absolute -top-4 -left-4 w-10 h-10 bg-slate-900 rounded-full border-2 border-green-500 flex items-center justify-center font-black text-green-400">3</span>
                          <Play className="w-10 h-10 text-white fill-current" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-white">Gå ut och tävla</h3>
                      <p className="text-slate-400 leading-relaxed max-w-[280px]">Följ kartan, checka in via GPS och svara på frågor.</p>
                  </div>
              </div>
          </div>
      </div>

      {/* USE CASE SECTION */}
      <div className="relative z-10 py-24 px-6 bg-slate-950">
          <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-4 text-center md:text-left">
                  <div>
                      <h2 className="text-4xl font-black uppercase tracking-tight text-white">Användningsområden</h2>
                      <p className="text-slate-500 mt-2 font-medium">Quester passar perfekt för alla typer av motion och lek.</p>
                  </div>
                  <button onClick={onCreateEvent} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center gap-2 transition-all active:scale-95 text-white">Starta nu <ArrowRight className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-8 bg-gray-900/50 border border-white/5 rounded-[2.5rem] hover:border-blue-500/30 transition-all group">
                      <div className="w-16 h-16 bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform border border-blue-500/20">
                          <Heart className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white">Svensexa & Fest</h3>
                      <p className="text-slate-400 leading-relaxed">Gör huvudpersonen till hjälte i ett specialskrivet mysterium genom staden. Lägg in personliga frågor och fotouppdrag.</p>
                  </div>

                  <div className="p-8 bg-gray-900/50 border border-white/5 rounded-[2.5rem] hover:border-indigo-500/30 transition-all group">
                      <div className="w-16 h-16 bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform border border-indigo-500/20">
                          <Building2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white">Företag & Teambuilding</h3>
                      <p className="text-slate-400 leading-relaxed">Skapa en modern stadsjakt för hela kontoret. Se resultaten live och analysera lagens insats direkt efter målgång.</p>
                  </div>

                  <div className="p-8 bg-gray-900/50 border border-white/5 rounded-[2.5rem] hover:border-green-500/30 transition-all group">
                      <div className="w-16 h-16 bg-green-900/20 rounded-2xl flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform border border-green-500/20">
                          <School className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white">Skola & Lärande</h3>
                      <p className="text-slate-400 leading-relaxed">Flytta klassrummet utomhus. Skapa historiska quiz eller naturvandringar där eleverna får svara på frågor på rätt plats.</p>
                  </div>
              </div>
          </div>
      </div>

      {/* FEATURED MODES */}
      {hasFeaturedModes && (
        <div className="relative z-10 py-24 bg-slate-900/30 border-t border-white/5">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-black uppercase tracking-widest text-blue-300 mb-4 opacity-70">Spela Direkt</h2>
                <p className="text-slate-400 mb-12 font-medium">Dessa banor genereras unikt där du står just nu. Inget skapande krävs!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {systemConfig?.featuredModes?.zombie_survival?.isActive && (
                        <ZombieSurvivalButton 
                            onGameCreated={onInstantGame || (() => {})} 
                            userTier="SCOUT" 
                            isGuest={userProfile.id === 'guest'} 
                            onAuthRequired={() => setIsAuthModalOpen(true)} 
                            onShowLeaderboard={() => { setLeaderboardMode('zombie_survival'); setIsLeaderboardOpen(true); }} 
                        />
                    )}
                    {systemConfig?.featuredModes?.christmas_hunt?.isActive && (
                        <ChristmasHuntButton 
                            onGameCreated={onInstantGame || (() => {})} 
                            userTier="SCOUT" 
                            isGuest={userProfile.id === 'guest'} 
                            onAuthRequired={() => setIsAuthModalOpen(true)} 
                            onShowLeaderboard={() => { setLeaderboardMode('christmas_hunt'); setIsLeaderboardOpen(true); }} 
                        />
                    )}
                </div>
            </div>
        </div>
      )}

      {/* PRICING */}
      <div ref={pricingRef} className="relative z-10 bg-slate-950 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase italic">Välj din nivå</h2>
                <p className="text-xl text-slate-400 leading-relaxed font-medium">Gratis för familjen, professionella verktyg för eventarrangörer.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['SCOUT', 'CREATOR', 'MASTER'] as UserTier[]).map((tier) => {
                    const config = tierConfigs[tier];
                    const visual = TIER_VISUALS[tier];
                    const Icon = visual.icon;
                    return (
                        <div key={tier} className="relative group rounded-[2.5rem] p-1 transition-all hover:-translate-y-2">
                            <div className={`absolute inset-0 bg-gradient-to-b ${visual.color} rounded-[2.5rem] opacity-20 blur-md group-hover:opacity-40 transition-opacity`}></div>
                            <div className="relative h-full bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[2.4rem] p-8 flex flex-col">
                                {config.isRecommended && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-lg z-20">Populärast</div>}
                                <div className="mb-6 flex items-start justify-between">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${visual.color} flex items-center justify-center shadow-lg`}><Icon className="w-7 h-7 text-white" /></div>
                                    <div className="text-right">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tight text-white">{config.displayName}</h3>
                                        <div className="text-slate-400 font-mono text-sm">{config.priceAmount === 'Offert' ? config.priceAmount : `${config.priceAmount} ${config.priceCurrency}`}</div>
                                    </div>
                                </div>
                                <p className="text-slate-300 text-sm mb-8 leading-relaxed h-16">{config.description}</p>
                                <div className="space-y-4 flex-1 mb-8">
                                    {config.features.map((feat, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm text-slate-400 group-hover:text-slate-200 transition-colors"><div className="w-5 h-5 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-blue-400" /></div><span>{feat}</span></div>
                                    ))}
                                </div>
                                <button onClick={() => onSelectTier(tier)} className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 active:scale-95 ${config.isRecommended ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'}`}>{config.buttonText} <ArrowRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      <footer className="relative z-10 bg-black py-16 border-t border-white/5 pb-24 md:pb-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-8 opacity-50"><Compass className="w-6 h-6" /><span className="font-black text-xl tracking-tighter">QUESTER</span></div>
                <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-sm text-gray-500 mb-10 font-bold uppercase tracking-widest">
                    <button onClick={() => setIsAboutUsOpen(true)} className="hover:text-white transition-colors">Om Oss</button>
                    <button onClick={() => { setTermsTab('privacy'); setIsTermsOpen(true); }} className="hover:text-white transition-colors">Integritet</button>
                    <button onClick={() => { setTermsTab('terms'); setIsTermsOpen(true); }} className="hover:text-white transition-colors">Villkor</button>
                </div>
                <div className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">©2025 SmartStudio. Ett verktyg för rörelse och äventyr.</div>
          </div>
      </footer>
    </div>
  );
};
