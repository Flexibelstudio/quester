
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, Popup, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RaceEvent, Checkpoint, ParticipantResult, Rating, UserProfile } from '../types';
import { MapPin, Trophy, Navigation, X, CheckCircle2, Zap, Crown, Route, Timer, Medal, User, Star, Clock, AlertTriangle, Camera, Play, LocateFixed, HelpCircle, ArrowRight, ArrowLeft, Upload, Share2, Image as ImageIcon, Loader2, Flag, Skull, Volume2, VolumeX, Radar, ShieldCheck, Heart, HeartCrack, RotateCcw, Snowflake, Gift, Bug, Ghost, Users, Building2, Ban, Lock, PlayCircle, Settings, LogOut, FileText, PauseCircle, Radio, Flame, Biohazard, Crosshair, ChevronRight, Rocket, Sparkles, Eye, Thermometer, ShoppingBag, Package } from 'lucide-react';
import { ShareDialog } from './ShareDialog';
import { useZombieAudio, unlockAudioEngine } from '../hooks/useZombieAudio';
import { useChristmasAudio } from '../hooks/useChristmasAudio';
import { useGrinchLogic } from '../hooks/useGrinchLogic';
import { useChristmasLogic } from '../hooks/useChristmasLogic';
import { SnowfallOverlay } from './SnowfallOverlay';
import { api } from '../services/dataService'; // DataService

interface ParticipantViewProps {
  raceData: RaceEvent;
  onExit: () => void;
  onUpdateResult?: (result: ParticipantResult) => void;
  onRateEvent?: (rating: Rating) => void;
  initialJoinCode?: string;
  isTestMode?: boolean; 
  userProfile?: UserProfile | null;
}

// --- TILE LAYERS DEFINITION ---
const TILE_LAYERS = {
  standard: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '&copy; OpenStreetMap' },
  dark: { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: '&copy; CARTO' },
  google_standard: { url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", attribution: '&copy; Google' },
};

// --- SAFE SYNTHETIC SFX ENGINE (SINGLETON) ---
let sharedAudioCtx: AudioContext | null = null;
const getSharedAudioContext = () => {
    if (!sharedAudioCtx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) sharedAudioCtx = new Ctx();
    }
    return sharedAudioCtx;
};

const playSynthSound = (type: 'success' | 'damage' | 'gameover' | 'finish' | 'error' | 'flare' | 'alarm' | 'freeze') => {
    try {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;

        if (type === 'success') {
            // High Pitch Ping
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'damage') {
            // Low Sawtooth Crunch
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'freeze') {
            // Glassy shatter sound
            osc.type = 'square';
            osc.frequency.setValueAtTime(2000, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'gameover') {
            // Descending Slide
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 1.5);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);
            osc.start(now);
            osc.stop(now + 1.5);
        } else if (type === 'finish') {
            // Major Chord Arpeggio
            const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major
            freqs.forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.type = 'square';
                o.frequency.value = f;
                g.gain.setValueAtTime(0.05, now + i*0.1);
                g.gain.exponentialRampToValueAtTime(0.01, now + i*0.1 + 0.5);
                o.start(now + i*0.1);
                o.stop(now + i*0.1 + 0.6);
            });
        } else if (type === 'error') {
            // Buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'flare') {
            // Rising whistle + noise (simulated)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 1.0);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);
            osc.start(now);
            osc.stop(now + 1.5);
        } else if (type === 'alarm') {
            // Siren
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.3);
            osc.frequency.linearRampToValueAtTime(600, now + 0.6);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.0);
            osc.start(now);
            osc.stop(now + 1.0);
        }
    } catch (e) {
        console.warn("Audio play failed, ignoring.");
    }
};

const userIcon = (profileImage?: string, isDev?: boolean) => L.divIcon({
  className: 'user-location-marker',
  html: `
    <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
       <div style="position:absolute; width:100%; height:100%; background:${isDev ? '#8b5cf6' : '#3b82f6'}; opacity:0.3; border-radius:50%; animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;"></div>
       <div style="position:absolute; width:34px; height:34px; background:${profileImage ? `url(${profileImage})` : isDev ? '#8b5cf6' : '#3b82f6'}; background-size: cover; background-position: center; border:2px solid white; border-radius:50%; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>
       ${isDev ? '<div style="position:absolute; top:-10px; right:-10px; background:white; color:purple; font-size:10px; font-weight:bold; px:2px; border-radius:4px; padding:0 2px; border:1px solid purple;">DEV</div>' : ''}
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const createCustomIcon = (color: string, isChecked: boolean, hasQuiz: boolean, hasChallenge: boolean, points: number, timeMod: number | undefined, index: number, isLocked: boolean, name?: string) => {
  const size = isChecked ? 24 : 32;
  const isPenalty = points < 0 || (timeMod && timeMod > 0);
  
  // Custom Icons based on Checkpoint Name (Extraction Mode)
  let iconSymbol = index.toString();
  if (name?.includes('Radio')) iconSymbol = '📻';
  else if (name?.includes('Supply')) iconSymbol = '📦';
  else if (name?.includes('Extraction')) iconSymbol = '🚁';
  else if (hasQuiz) iconSymbol = '?';
  else if (hasChallenge) iconSymbol = '!';

  // --- Bonfire Icon (Christmas Mode) ---
  if (name?.toLowerCase().includes('eldstad') || name?.toLowerCase().includes('bonfire') || name?.toLowerCase().includes('värme')) {
      return L.divIcon({
          className: 'bonfire-icon',
          html: `<div style="font-size: ${size}px; filter: drop-shadow(0 0 10px orange); animation: pulse 2s infinite;">🔥</div>`,
          iconSize: [size, size],
          iconAnchor: [size/2, size/2]
      });
  }

  let iconContent = isChecked 
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` 
    : isPenalty 
        ? `<div style="font-size: 20px;">💀</div>`
        : `<span style="font-size:${iconSymbol.length > 2 ? '10px' : '12px'};">${iconSymbol}</span>`;

  return L.divIcon({
    className: '', 
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; opacity: ${isLocked ? 0.6 : 1}; transition: all 0.3s ease;">
        <div class="${!isChecked && !isLocked && isPenalty ? 'animate-pulse' : !isChecked && !isLocked ? 'animate-float' : ''}" style="
          background: ${isChecked ? '#10B981' : isLocked ? '#374151' : isPenalty ? '#EF4444' : color};
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: ${isChecked ? '2px' : '3px'} solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-family: sans-serif;
        ">
          ${iconContent}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

// --- DYNAMIC GRINCH ICON (UPDATED) ---
// Handles states: 'guarding' | 'fleeing' | 'resting' | 'caught'
const createGrinchIcon = (state: 'guarding' | 'fleeing' | 'resting' | 'caught') => {
    let emoji = '🎁';
    let animation = 'float';
    let size = 32;

    if (state === 'fleeing') {
        emoji = '💨👺';
        animation = 'none'; // Moving too fast for css anim
        size = 48;
    } else if (state === 'resting') {
        emoji = '🥵👺';
        animation = 'pulse'; // Visual cue to catch him
        size = 48;
    } else if (state === 'guarding') {
        emoji = '🎁';
        animation = 'float';
    }

    return L.divIcon({
        className: 'grinch-icon',
        html: `<div style="font-size: ${size}px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); display:flex; justify-content:center; align-items:center; animation: ${animation} 2s infinite ease-in-out;">${emoji}</div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
};

const startIcon = (isSleigh: boolean) => L.divIcon({
  className: '',
  html: isSleigh 
    ? `<div style="font-size:36px; filter:drop-shadow(0 0 10px rgba(234,179,8,0.8)); transform:translate(-50%, -50%); animation: bounce 2s infinite;">🛷</div>`
    : `<div style="font-size:28px; filter:drop-shadow(0 2px 2px rgba(0,0,0,0.5)); transform:translate(-50%, -50%);">🚩</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const finishIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:32px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform:translate(-50%, -50%); animation: bounce 2s infinite;">🏁</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createRoamingZombieIcon = (rotation: number, isStunned: boolean) => L.divIcon({
  className: 'zombie-roamer-icon',
  html: `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; opacity: ${isStunned ? 0.6 : 1}; transition: opacity 0.3s;">
       <div style="font-size: 36px; filter: ${isStunned ? 'grayscale(1)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}; z-index: 10;">🧟</div>
       ${!isStunned ? `<div style="position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; transform: translate(-50%, -50%) rotate(${rotation}deg); pointer-events: none; z-index: 5;"><div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 16px solid #ef4444; filter: drop-shadow(0 0 2px black);"></div></div>` : ''}
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

const MissionBriefingDialog: React.FC<{
    raceData: RaceEvent;
    onDeploy: () => void;
    isOpen: boolean;
}> = ({ raceData, onDeploy, isOpen }) => {
    const [step, setStep] = useState(0);
    const isChristmas = raceData.category === 'Christmas Hunt';
    
    if (!isOpen) return null;

    // Define content for Zombie/Default Mode
    const zombieSteps = [
        {
            title: "SITUATION REPORT",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed text-sm md:text-base border-l-2 border-red-600 pl-4">
                        {raceData.description || "Inkommande data... Ingen beskrivning tillgänglig."}
                    </p>
                    <div className="bg-red-900/20 p-3 rounded border border-red-800/50 flex items-start gap-3">
                        <Radio className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-bold text-red-400 uppercase">Incoming Transmission</div>
                            <div className="text-xs text-gray-400">"Håll dig borta från zoner markerade med rött. Hitta Safe Houses."</div>
                        </div>
                    </div>
                </div>
            ),
            icon: <FileText className="w-6 h-6 text-red-500" />
        },
        {
            title: "OBJECTIVES",
            content: (
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 bg-gray-800/50 p-3 rounded border border-gray-700">
                        <div className="w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 border border-blue-500/30">1</div>
                        <span className="text-sm text-gray-200">Hitta de 4 radiodelarna <span className="text-blue-400 font-bold">(BLÅ)</span></span>
                    </li>
                    <li className="flex items-center gap-3 bg-gray-800/50 p-3 rounded border border-gray-700">
                        <div className="w-6 h-6 rounded-full bg-yellow-900/50 flex items-center justify-center text-yellow-400 border border-yellow-500/30">2</div>
                        <span className="text-sm text-gray-200">Samla förnödenheter (Flares & Medkits) <span className="text-yellow-400 font-bold">(GUL)</span></span>
                    </li>
                    <li className="flex items-center gap-3 bg-gray-800/50 p-3 rounded border border-gray-700">
                        <div className="w-6 h-6 rounded-full bg-green-900/50 flex items-center justify-center text-green-400 border border-green-500/30">3</div>
                        <span className="text-sm text-gray-200">Ta dig till extraktionspunkten när radion är lagad.</span>
                    </li>
                </ul>
            ),
            icon: <Crosshair className="w-6 h-6 text-blue-500" />
        },
        {
            title: "SURVIVAL GUIDE",
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800 p-3 rounded text-center">
                            <Volume2 className="w-6 h-6 text-white mx-auto mb-2" />
                            <div className="text-xs font-bold text-gray-400 uppercase">LJUD PÅ</div>
                            <div className="text-[10px] text-gray-500">Radarn använder ljud</div>
                        </div>
                        <div className="bg-gray-800 p-3 rounded text-center">
                            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                            <div className="text-xs font-bold text-gray-400 uppercase">ANVÄND FLARES</div>
                            <div className="text-[10px] text-gray-500">Stunner zombies i 30s</div>
                        </div>
                    </div>
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded flex gap-3 items-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                        <span className="text-xs text-yellow-200">Rör dig försiktigt i verkligheten. Trafikregler gäller alltid.</span>
                    </div>
                </div>
            ),
            icon: <ShieldCheck className="w-6 h-6 text-green-500" />
        }
    ];

    // Define content for Christmas Mode (UPDATED for Yo-Yo)
    const christmasSteps = [
        {
            title: "NÖDMEDDELANDE",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-700 leading-relaxed text-sm md:text-base border-l-4 border-red-500 pl-4 italic">
                        {raceData.description || "Grinchen har stulit julklapparna! Hela julen är i fara. Vi behöver din hjälp!"}
                    </p>
                    <div className="bg-white/80 p-4 rounded-xl border-2 border-red-200 shadow-sm flex items-start gap-3">
                        <div className="bg-red-100 rounded-full p-2">
                            <Snowflake className="w-5 h-5 text-red-500 shrink-0 animate-spin-slow" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-red-500 uppercase tracking-wider mb-1">Från Tomteverkstaden</div>
                            <div className="text-sm text-slate-700 font-bold">"Spring ut, fånga tjuven, ta paketet!"</div>
                        </div>
                    </div>
                </div>
            ),
            icon: <Gift className="w-6 h-6 text-red-500" />
        },
        {
            title: "SÄCK & SLÄDE",
            content: (
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 bg-white/70 p-3 rounded-xl border border-sky-100 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold border-2 border-red-300 shadow-sm">1</div>
                        <span className="text-sm text-slate-700 font-bold">Du kan max bära <span className="text-red-500 font-black">3 PAKET</span> åt gången.</span>
                    </li>
                    <li className="flex items-center gap-3 bg-white/70 p-3 rounded-xl border border-sky-100 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold border-2 border-green-300 shadow-sm">2</div>
                        <span className="text-sm text-slate-700 font-bold">Spring tillbaka till <span className="text-green-600">SLÄDEN</span> (Start) för att lämna paketen och få poäng!</span>
                    </li>
                </ul>
            ),
            icon: <ShoppingBag className="w-6 h-6 text-red-500" />
        },
        {
            title: "HÅLL VÄRMEN",
            content: (
                <div className="space-y-4">
                    <div className="bg-sky-50/80 p-4 rounded-xl border border-sky-200 text-center">
                        <Thermometer className="w-8 h-8 text-sky-500 mx-auto mb-2" />
                        <div className="text-xs font-black text-sky-700 uppercase tracking-widest">Frys inte ihjäl!</div>
                        <div className="text-[10px] text-sky-600 mt-1">Stå vid en <span className="text-orange-500 font-bold">ELDSTAD 🔥</span> eller släden för att tina upp.</div>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-center">
                        <ShieldCheck className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="text-xs text-red-700">Tomten ser allt. Spring inte ut i gatan och var snäll mot andra nissar.</span>
                    </div>
                </div>
            ),
            icon: <Sparkles className="w-6 h-6 text-sky-500" />
        }
    ];

    const steps = isChristmas ? christmasSteps : zombieSteps;
    const current = steps[step];
    
    // Theme colors
    const theme = isChristmas ? {
        bg: 'bg-white/95 border-sky-300 shadow-sky-900/20',
        headerBg: 'bg-gradient-to-r from-sky-100 to-white border-sky-200',
        titleText: 'text-slate-800',
        subText: 'text-slate-500',
        contentBg: 'bg-sky-50/30',
        footerBg: 'bg-white border-sky-100',
        btnNext: 'bg-red-500 hover:bg-red-600 text-white border-red-400 shadow-red-200',
        progressBar: 'bg-sky-200',
        progressActive: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
        snow: true
    } : {
        bg: 'bg-gray-900 border-gray-700 shadow-2xl',
        headerBg: 'bg-gray-950 border-gray-800',
        titleText: 'text-white',
        subText: 'text-gray-600',
        contentBg: 'bg-black/20',
        footerBg: 'bg-gray-950 border-gray-800',
        btnNext: 'bg-red-600 hover:bg-red-500 text-white border-red-800',
        progressBar: 'bg-gray-800',
        progressActive: 'bg-red-600',
        snow: false
    };

    return (
        <div className="fixed inset-0 z-[5000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            {theme.snow && <SnowfallOverlay intensity="normal" />}
            
            <div className={`w-full max-w-md border-2 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col h-[75vh] md:h-auto animate-in zoom-in duration-300 ${theme.bg}`}>
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center relative overflow-hidden ${theme.headerBg}`}>
                    {theme.snow && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/snow.png')] opacity-10"></div>}
                    <div className="relative z-10">
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isChristmas ? 'text-red-500' : 'text-gray-500'}`}>{isChristmas ? 'SANTA PROTOCOL V.24' : 'MISSION BRIEFING'}</div>
                        <h2 className={`text-2xl font-black uppercase tracking-tighter flex items-center gap-2 ${theme.titleText}`}>
                            {current.icon} {current.title}
                        </h2>
                    </div>
                    <div className={`font-mono font-bold text-xl relative z-10 ${theme.subText}`}>
                        0{step + 1}<span className="opacity-50">/03</span>
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 p-6 overflow-y-auto ${theme.contentBg}`}>
                    {current.content}
                </div>

                {/* Footer Controls */}
                <div className={`p-6 border-t ${theme.footerBg}`}>
                    <div className="flex gap-2 mb-4">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? theme.progressActive : theme.progressBar}`}></div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => {
                            if (step < steps.length - 1) setStep(s => s + 1);
                            else onDeploy();
                        }}
                        className={`w-full py-4 font-black text-lg uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border ${theme.btnNext}`}
                    >
                        {step < steps.length - 1 ? (
                            <>NÄSTA <ChevronRight className="w-5 h-5" /></>
                        ) : (
                            <>{isChristmas ? 'RÄDDA JULEN NU' : 'DEPLOY MISSION'} <Rocket className="w-5 h-5" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const FinishDialog: React.FC<{
    isOpen: boolean;
    totalPoints: number;
    elapsedTime: string;
    onRate: (score: number, comment: string) => void;
    isChristmas?: boolean; // Added isChristmas prop
}> = ({ isOpen, totalPoints, elapsedTime, onRate, isChristmas }) => {
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState('');
    if (!isOpen) return null;

    // Theme Config
    const theme = isChristmas ? {
        bg: 'bg-white border-sky-300 shadow-sky-900/20',
        headerText: 'text-slate-800',
        subText: 'text-slate-500',
        cardBg: 'bg-sky-50 border-sky-100',
        accentText: 'text-red-500',
        button: 'bg-red-500 hover:bg-red-600 text-white shadow-red-200',
        inputBg: 'bg-white border-sky-200 text-slate-800',
        star: 'fill-yellow-400 text-yellow-400'
    } : {
        bg: 'bg-slate-900 border-slate-700',
        headerText: 'text-white',
        subText: 'text-slate-400',
        cardBg: 'bg-slate-800',
        accentText: 'text-yellow-400',
        button: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40',
        inputBg: 'bg-slate-950 border-slate-700 text-white',
        star: 'fill-yellow-400 text-yellow-400'
    };

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className={`${theme.bg} border w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 right-0 h-2 ${isChristmas ? 'bg-gradient-to-r from-red-500 via-white to-red-500' : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'}`}></div>
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 animate-bounce border-2 ${isChristmas ? 'bg-red-100 text-red-500 border-red-200' : 'bg-green-500/20 text-green-400 border-green-500/50'}`}>
                        {isChristmas ? <Gift className="w-10 h-10" /> : <Flag className="w-10 h-10" />}
                    </div>
                    <h2 className={`text-3xl font-black italic uppercase ${theme.headerText}`}>{isChristmas ? 'GOD JUL!' : 'MÅLGÅNG!'}</h2>
                    <p className={`${theme.subText} text-sm`}>{isChristmas ? 'Snyggt jobbat, alla klappar är räddade!' : 'Bra jobbat, du har slutfört loppet.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className={`${theme.cardBg} p-4 rounded-xl text-center`}>
                         <div className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme.subText}`}>Total Tid</div>
                         <div className={`text-2xl font-mono font-bold ${theme.headerText}`}>{elapsedTime}</div>
                    </div>
                    <div className={`${theme.cardBg} p-4 rounded-xl text-center`}>
                         <div className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme.subText}`}>Poäng</div>
                         <div className={`text-2xl font-mono font-bold ${theme.accentText}`}>{totalPoints}</div>
                    </div>
                </div>
                <div className={`border-t pt-6 ${isChristmas ? 'border-sky-100' : 'border-slate-800'}`}>
                    <h3 className={`text-center text-sm font-bold uppercase tracking-wider mb-4 ${theme.headerText}`}>Vad tyckte du om loppet?</h3>
                    <div className="flex justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setScore(s)} className="p-2 transition-transform hover:scale-110 focus:outline-none">
                                <Star className={`w-8 h-8 ${s <= score ? theme.star : 'text-slate-300'}`} />
                            </button>
                        ))}
                    </div>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Skriv en kommentar..." className={`w-full rounded-xl p-3 text-sm mb-6 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 border ${theme.inputBg}`}/>
                    <button onClick={() => onRate(score || 5, comment)} className={`w-full font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest ${theme.button}`}>Spara & Avsluta</button>
                </div>
            </div>
        </div>
    );
};

const GameMenu: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onPause: () => void;
    onGiveUpRequest: () => void;
    raceDescription: string;
    audioEnabled: boolean;
    onToggleAudio: () => void;
    raceCategory: string;
}> = ({ isOpen, onClose, onPause, onGiveUpRequest, raceDescription, audioEnabled, onToggleAudio, raceCategory }) => {
    if (!isOpen) return null;

    // Logic to prevent pausing instant games
    const isSystemEvent = ['Survival Run', 'Christmas Hunt'].includes(raceCategory);
    const isChristmas = raceCategory === 'Christmas Hunt';

    // Theme Config
    const theme = isChristmas ? {
        bg: 'bg-white border-sky-300 shadow-sky-900/20',
        text: 'text-slate-800',
        subText: 'text-slate-500',
        cardBg: 'bg-sky-50 border-sky-100',
        button: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
        closeBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
        activeToggle: 'bg-green-500 text-white',
        inactiveToggle: 'bg-slate-200 text-slate-500',
        giveUpBtn: 'bg-red-50 text-red-500 hover:bg-red-100 border-red-100'
    } : {
        bg: 'bg-slate-900 border-slate-700',
        text: 'text-white',
        subText: 'text-gray-400',
        cardBg: 'bg-slate-800/50 border-slate-700',
        button: 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600',
        closeBtn: 'bg-slate-800 hover:bg-slate-700 text-white',
        activeToggle: 'bg-green-600 text-white',
        inactiveToggle: 'bg-slate-700 text-slate-400',
        giveUpBtn: 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border-red-900/50'
    };

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`${theme.bg} border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-xl font-black uppercase tracking-wider ${theme.text}`}>Meny</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${theme.closeBtn}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Settings */}
                    <div className={`${theme.cardBg} p-4 rounded-2xl border`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${audioEnabled ? 'bg-green-500/20 text-green-400' : `${theme.inactiveToggle}`}`}>
                                    {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                                </div>
                                <span className={`font-bold ${theme.text}`}>Ljud</span>
                            </div>
                            <button 
                                onClick={onToggleAudio} 
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${audioEnabled ? theme.activeToggle : theme.inactiveToggle}`}
                            >
                                {audioEnabled ? 'PÅ' : 'AV'}
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className={`${theme.cardBg} p-4 rounded-2xl border`}>
                        <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest ${theme.subText}`}>
                            <FileText className="w-3 h-3" /> Uppdraget
                        </div>
                        <p className={`text-sm leading-relaxed max-h-32 overflow-y-auto pr-2 ${isChristmas ? 'text-slate-600' : 'text-slate-300'}`}>
                            {raceDescription || "Ingen beskrivning tillgänglig."}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className={`space-y-3 pt-4 border-t ${isChristmas ? 'border-sky-100' : 'border-slate-800'}`}>
                        {!isSystemEvent && (
                            <button 
                                onClick={onPause}
                                className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-colors border ${theme.button}`}
                            >
                                <PauseCircle className="w-5 h-5" />
                                Pausa / Gå till Lobbyn
                            </button>
                        )}
                        
                        <button 
                            onClick={onGiveUpRequest}
                            className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-colors border ${theme.giveUpBtn}`}
                        >
                            <Flag className="w-5 h-5" />
                            Ge Upp (DNF)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MapController: React.FC<{ centerPos: [number, number] | null, doCenter: boolean, setDoCenter: (b: boolean) => void }> = ({ centerPos, doCenter, setDoCenter }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (centerPos && centerPos[0] && centerPos[1] && doCenter) {
      map.flyTo(centerPos, 16, { duration: 1.5, easeLinearity: 0.25 });
      setDoCenter(false);
    }
  }, [centerPos, doCenter, map, setDoCenter]);
  return null;
};

const DevMapClickTeleport = ({ onTeleport }: { onTeleport: (lat: number, lng: number) => void }) => {
    useMapEvents({ click(e) { onTeleport(e.latlng.lat, e.latlng.lng); }, });
    return null;
};

// Helper for distance
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// --- MAIN COMPONENT ---
export const ParticipantView: React.FC<ParticipantViewProps> = ({ raceData, onExit, onUpdateResult, onRateEvent, initialJoinCode, isTestMode, userProfile }) => {
  // If user is already logged in (via LandingPage/Dashboard), skip login step
  const [authStep, setAuthStep] = useState<'login' | 'profile' | 'lobby' | 'race' | 'full'>(
      isTestMode ? 'race' : (userProfile && userProfile.id !== 'guest' ? 'lobby' : 'login')
  );
  
  // Data State
  const [participantId, setParticipantId] = useState<string>(isTestMode ? 'test-user' : userProfile?.id || '');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [teamNameInput, setTeamNameInput] = useState(isTestMode ? 'Test Runner' : userProfile?.name || '');
  const [orgInput, setOrgInput] = useState('');
  const [subGroupInput, setSubGroupInput] = useState('');
  
  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasSeenBriefing, setHasSeenBriefing] = useState(false); // Controls Mission Briefing
  const [showGiveUpDialog, setShowGiveUpDialog] = useState(false);

  // Profile Image State with Live DiceBear Fallback
  const [profileImage, setProfileImage] = useState<string | undefined>(userProfile?.photoURL);
  
  // Sync profile image if user updates it elsewhere (e.g. ProfileDialog) or types name
  useEffect(() => {
      if (userProfile?.photoURL) {
          setProfileImage(userProfile.photoURL);
      } else if (teamNameInput) {
          // Generate live preview if no real photo exists
          setProfileImage(`https://api.dicebear.com/7.x/avataaars/svg?seed=${teamNameInput}`);
      }
  }, [userProfile, teamNameInput]);

  const [authProvider, setAuthProvider] = useState<'guest' | 'google' | 'facebook'>('guest');
  const [loginError, setLoginError] = useState(false);
  
  // DEV MODE STATE
  const [isDevMode, setIsDevMode] = useState(isTestMode || false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  // Timer & Race Status
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(isTestMode ? true : false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // App State
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);

  // Photo / Camera State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Game State
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(0);
  const [shouldCenterMap, setShouldCenterMap] = useState(false);
  
  const [notificationToast, setNotificationToast] = useState<{title: string, message: string, type: 'success' | 'danger' | 'info'} | null>(null);

  // GAME MODES
  const isZombieMode = raceData.category === 'Survival Run' || raceData.mapStyle === 'dark';
  const isChristmasMode = raceData.category === 'Christmas Hunt';
  
  // Filter out drafts for game logic
  const activeCheckpoints = useMemo(() => {
      return (raceData.checkpoints || []).filter(cp => cp.location !== null);
  }, [raceData.checkpoints]);

  // --- CHRISTMAS GAME STATE (WARMTH & BAG) ---
  const { 
      warmth, 
      bagCount, 
      isFrozen, 
      isWhiteout, 
      isAtSleigh,
      isAtHeatSource, // New hook return value
      addToBag, 
      depositBag, 
      bagCapacity,
      timePenalty // New time penalty
  } = useChristmasLogic(
      userLocation, 
      raceData.startLocation,
      activeCheckpoints, // Pass filtered CPs
      isChristmasMode, 
      (t) => {
          setNotificationToast(t);
          if (t.type === 'danger' && t.message.includes('paket')) {
              playSynthSound('error');
          } else if (t.type === 'success') {
              playSynthSound('success');
          } else if (t.title.includes('IS')) {
              playSynthSound('freeze');
          }
      }
  );

  const lastCheckInRef = useRef<{time: number, coords: [number, number]} | null>(null);
  
  // --- ZOMBIE & EXTRACTION STATE ---
  const [lives, setLives] = useState(3);
  const [isImmune, setIsImmune] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  
  // EXTRACTION INVENTORY & STATUS (INTEGRATED)
  const [flares, setFlares] = useState(0);
  const [radioPartsFound, setRadioPartsFound] = useState(0);
  const [toxicCloud, setToxicCloud] = useState<{ center: [number, number], expiresAt: number } | null>(null);
  const [flashEffect, setFlashEffect] = useState(false);
  const [extractionPoint, setExtractionPoint] = useState<Checkpoint | null>(null);

  // --- REFS ---
  const userLocationRef = useRef<[number, number] | null>(null);
  const livesRef = useRef(3);
  const isImmuneRef = useRef(false);
  const isGameOverRef = useRef(false);

  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { isImmuneRef.current = isImmune; }, [isImmune]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);

  const elapsedString = useMemo(() => {
     if (!startTime || isGameOver) return '00:00:00';
     // Calculate diff plus any penalties (Christmas Freeze)
     const penaltyMs = isChristmasMode ? (timePenalty * 1000) : 0;
     const diff = Math.max(0, (currentTime - startTime) + penaltyMs);
     return new Date(diff).toISOString().slice(11, 19);
  }, [currentTime, startTime, isGameOver, timePenalty, isChristmasMode]);

  // --- HELPERS (Defined before use in hooks) ---
  
  const performCheckIn = async (cp: Checkpoint) => {
     if (isChristmasMode && isFrozen) return; // Can't interact if frozen
     if (checkedInIds.has(cp.id)) return;
     if (isZombieCheckpoint(cp) && !isChristmasMode) return; 
     
     // CHRISTMAS MODE: YO-YO LOGIC
     if (isChristmasMode) {
         // Special case: Bonfire check-in doesn't take space in bag, just regenerates warmth (handled by proximity logic mostly, but good for feedback)
         const nameLower = cp.name.toLowerCase();
         if (nameLower.includes('eldstad') || nameLower.includes('bonfire') || nameLower.includes('värme')) {
             setNotificationToast({ title: "VÄRME!", message: "Du värmer dig vid elden.", type: 'info' });
             return;
         }

         if (bagCount >= bagCapacity) {
             setNotificationToast({ title: "SÄCKEN ÄR FULL!", message: "Spring tillbaka till släden för att tömma!", type: 'danger' });
             playSynthSound('error');
             return;
         }
         
         const added = addToBag();
         if (added) {
             // We mark it as checked visually, but points are only secured at Sleigh
             const newSet = new Set(checkedInIds); newSet.add(cp.id); setCheckedInIds(newSet);
             setNotificationToast({ title: "PAKET TAGET!", message: "Lämna det i släden!", type: 'success' });
             playSynthSound('success');
         }
         return; // Skip standard check-in flow
     }

     const now = Date.now();
     const currentLocation = userLocationRef.current;
     if (lastCheckInRef.current && currentLocation) {
         const distance = getDistanceMeters(lastCheckInRef.current.coords[0], lastCheckInRef.current.coords[1], currentLocation[0], currentLocation[1]);
         const timeDiffHours = (now - lastCheckInRef.current.time) / (1000 * 60 * 60);
         if (timeDiffHours > 0) {
             const speedKmh = (distance / 1000) / timeDiffHours;
             if (speedKmh > 30) {
                 setNotificationToast({ title: "SUSPICIOUS ACTIVITY", message: "Speed limit exceeded! Check-in blocked.", type: 'danger' });
                 playSynthSound('error');
                 return;
             }
         }
     }
     if (currentLocation) { lastCheckInRef.current = { time: now, coords: currentLocation }; }

     const newSet = new Set(checkedInIds); newSet.add(cp.id); setCheckedInIds(newSet);
     playSynthSound('success');
     
     // EXTRACTION MODE LOGIC (Active inside Survival Run)
     if (isZombieMode) {
         if (cp.name.includes('Radio')) {
             const newRadioCount = radioPartsFound + 1;
             setRadioPartsFound(newRadioCount);
             setNotificationToast({ title: "RADIO PART SECURED", message: `${newRadioCount}/4 Collected!`, type: 'success' });
             
             // Spawn Helicopter if all 4 found
             if (newRadioCount === 4 && !extractionPoint) {
                 // We need location for extraction point, based on current CP
                 if (cp.location) {
                    const extractionLoc = {
                        lat: cp.location.lat + 0.003, // Roughly 300m away
                        lng: cp.location.lng + 0.003
                    };
                    setExtractionPoint({
                        id: 'extraction-heli',
                        name: 'EXTRACTION POINT',
                        location: extractionLoc,
                        radiusMeters: 50,
                        type: 'mandatory',
                        color: '#10B981',
                        description: 'Get to the chopper!'
                    });
                    playSynthSound('alarm');
                    setNotificationToast({ title: "EXTRACTION INBOUND", message: "Go to the LZ!", type: 'success' });
                 }
             }
         } else if (cp.name.includes('Supply')) {
             // 50% chance for Flare or Medkit
             if (Math.random() > 0.5) {
                 setLives(prev => Math.min(prev + 1, 3));
                 setNotificationToast({ title: "SUPPLY CRATE", message: "Medkit found! +1 Life", type: 'success' });
             } else {
                 setFlares(prev => prev + 1);
                 setNotificationToast({ title: "SUPPLY CRATE", message: "Flare found! +1 Flare", type: 'success' });
             }
         } else if (cp.id === 'extraction-heli') {
             handleFinishRace();
             return;
         }
     } else {
         setNotificationToast({ title: "CHECKPOINT SECURED", message: `${cp.name} - Poäng säkrade!`, type: 'success' });
     }
     
     // --- AUTO-SAVE (RESUME FEATURE) ---
     const currentPoints = Array.from(newSet).reduce((sum, id) => sum + ((activeCheckpoints.find(c => c.id === id)?.points || 0)), 0);
     
     if (onUpdateResult && !isTestMode) {
         const finalGroupTag = orgInput && subGroupInput ? `${orgInput} - ${subGroupInput}` : orgInput || subGroupInput;
         onUpdateResult({
              id: participantId,
              name: teamNameInput,
              teamName: finalGroupTag,
              finishTime: elapsedString,
              totalPoints: currentPoints,
              checkpointsVisited: newSet.size,
              visitedCheckpointIds: Array.from(newSet),
              status: 'running',
              authProvider: authProvider,
              profileImage: profileImage
         });
     }

     setTimeout(() => setNotificationToast(null), 4000);
  };

  // --- CHRISTMAS HUNT STATE (Depends on performCheckIn) ---
  const { grinches, statusMessage: grinchStatus } = useGrinchLogic(userLocation, activeCheckpoints, isChristmasMode, (cp, success) => {
      if (success) { performCheckIn(cp); } 
  });

  useEffect(() => {
    if (grinchStatus) {
        setNotificationToast({ title: "CHRISTMAS HUNT", message: grinchStatus, type: grinchStatus.includes('escaped') ? 'danger' : 'success' });
        setTimeout(() => setNotificationToast(null), 3000);
    }
  }, [grinchStatus]);

  // Monitor Sleigh deposits in Christmas Mode
  const [christmasScore, setChristmasScore] = useState(0);
  
  useEffect(() => {
      if (isAtSleigh && bagCount > 0 && !isFrozen) {
          const deposited = depositBag();
          if (deposited > 0) {
              const cpPoints = 500; // Standard gift points
              const totalNewPoints = deposited * cpPoints;
              setChristmasScore(prev => prev + totalNewPoints);
              // Save progress handled implicitly via re-render of HUD later? 
              // We should save to DB here actually
          }
      }
  }, [isAtSleigh, bagCount, isFrozen]);

  // --- RESTORE LOGIC (RESUME RACE) ---
  useEffect(() => {
      // Check if we have an existing "running" result for this user
      if (participantId && raceData.results) {
          const existingResult = raceData.results.find(r => r.id === participantId && r.status === 'running');
          if (existingResult) {
              console.log("Resuming race for:", participantId);
              
              if (existingResult.visitedCheckpointIds) {
                  setCheckedInIds(new Set(existingResult.visitedCheckpointIds));
              } else {
                  console.warn("Resuming with count only (legacy data). IDs lost.");
              }

              if (raceData.startMode === 'mass_start') {
                  const massStart = new Date(raceData.startDateTime).getTime();
                  setStartTime(massStart);
                  if (Date.now() > massStart) setHasStarted(true);
              } else {
                  setHasStarted(true);
                  setStartTime(Date.now()); // Fallback reset timer visual, but allow continue.
              }

              setAuthStep('race');
              setShouldCenterMap(true);
              // Assume they have seen briefing if resuming
              setHasSeenBriefing(true);
              setNotificationToast({ title: "VÄLKOMMEN TILLBAKA", message: "Återupptar sessionen.", type: 'success' });
          }
      }
  }, [participantId, raceData.id]); 

  useEffect(() => {
      if (lives <= 0 && !isGameOver && isZombieMode) {
          setIsGameOver(true);
          playSynthSound('gameover');
      }
  }, [lives, isGameOver, isZombieMode]);

  const handleRestart = () => {
      setLives(3); setIsGameOver(false); setIsImmune(false); unlockAudioEngine(); setRoamingZombies([]);
      if (isZombieMode) { setFlares(0); setRadioPartsFound(0); setExtractionPoint(null); }
  };

  const handleDamage = () => {
      if (isImmuneRef.current || isGameOverRef.current) return;
      if (navigator.vibrate) navigator.vibrate([200, 100, 500]);
      
      playSynthSound('damage');
      
      setLives(prev => prev - 1); setIsImmune(true);
      setNotificationToast({ title: "DAMAGE TAKEN!", message: "You lost a life! Run!", type: 'danger' });
      setTimeout(() => { setIsImmune(false); }, 10000);
  };

  // --- CHAOS ENGINE (ZOMBIE MODE) ---
  useEffect(() => {
      if (!isZombieMode || !hasStarted || isGameOver) return;

      const chaosInterval = setInterval(() => {
          if (!userLocationRef.current) return;
          const roll = Math.random();
          
          // 30% Chance of Event every minute
          if (roll < 0.3) {
              const eventType = Math.random() > 0.5 ? 'AMBUSH' : 'CLOUD';
              
              if (eventType === 'AMBUSH') {
                  // Spawn zombies closer (40m)
                  const [uLat, uLng] = userLocationRef.current;
                  const zombies = Array.from({ length: 3 }).map((_, i) => {
                      const angle = Math.random() * 2 * Math.PI;
                      const dist = 0.0004; // approx 40m
                      return { 
                          id: `ambush-${Date.now()}-${i}`, 
                          lat: uLat + (Math.cos(angle) * dist), 
                          lng: uLng + (Math.sin(angle) * dist), 
                          angle: 0, 
                          lastAttackTime: 0 
                      };
                  });
                  setRoamingZombies(prev => [...prev, ...zombies]);
                  playSynthSound('alarm');
                  setNotificationToast({ title: "AMBUSH!", message: "Horde detected nearby!", type: 'danger' });
              } else {
                  // Toxic Cloud
                  setToxicCloud({ 
                      center: userLocationRef.current, 
                      expiresAt: Date.now() + 10000 
                  });
                  playSynthSound('error'); // Gas sound sim
                  setNotificationToast({ title: "TOXIC CLOUD", message: "Move out of the green zone!", type: 'danger' });
              }
          }
      }, 60000);

      // Cloud Damage Check Loop (runs often)
      const cloudCheck = setInterval(() => {
          if (toxicCloud && userLocationRef.current) {
              if (Date.now() > toxicCloud.expiresAt) {
                  setToxicCloud(null);
                  return;
              }
              const dist = getDistanceMeters(userLocationRef.current[0], userLocationRef.current[1], toxicCloud.center[0], toxicCloud.center[1]);
              if (dist < 30) {
                  // Damage logic triggers in separate effect
              }
          }
      }, 1000);
      
      return () => { clearInterval(chaosInterval); clearInterval(cloudCheck); };
  }, [isZombieMode, hasStarted, isGameOver, toxicCloud]);

  // Cloud Damage Trigger
  useEffect(() => {
      if (toxicCloud) {
          const timer = setTimeout(() => {
              if (userLocationRef.current) {
                  const dist = getDistanceMeters(userLocationRef.current[0], userLocationRef.current[1], toxicCloud.center[0], toxicCloud.center[1]);
                  if (dist < 30) {
                      handleDamage();
                      setNotificationToast({ title: "TOXIC DAMAGE", message: "You stayed in the cloud too long!", type: 'danger' });
                  }
              }
              setToxicCloud(null);
          }, 10000);
          return () => clearTimeout(timer);
      }
  }, [toxicCloud]);

  const handleUseFlare = () => {
      if (flares > 0) {
          setFlares(prev => prev - 1);
          setFlashEffect(true);
          playSynthSound('flare');
          
          // Stun zombies
          setRoamingZombies(prev => prev.map(z => ({ ...z, lastAttackTime: Date.now() + 25000 }))); // Future timestamp = stunned
          setNotificationToast({ title: "FLARE DEPLOYED", message: "Zombies stunned for 30s!", type: 'success' });
          
          setTimeout(() => setFlashEffect(false), 500); // Visual flash duration
      }
  };

  const [roamingZombies, setRoamingZombies] = useState<Array<{id: string, lat: number, lng: number, angle: number, lastAttackTime: number}>>([]);

  useEffect(() => {
    if (isZombieMode && activeCheckpoints.length > 0 && roamingZombies.length === 0 && !isGameOver) { 
        const nests = activeCheckpoints.filter(cp => (cp.points && cp.points < 0) || cp.name.toLowerCase().includes('nest'));
        const spawns = nests.length > 0 ? nests : activeCheckpoints;
        const zombies = Array.from({ length: 3 }).map((_, i) => {
            const spawn = spawns[i % spawns.length];
            // Safe since we filtered activeCheckpoints
            if (spawn.location) {
                return { id: `hunter-${i}-${Date.now()}`, lat: spawn.location.lat, lng: spawn.location.lng, angle: 0, lastAttackTime: 0 };
            }
            return null;
        }).filter(z => z !== null) as any[];
        setRoamingZombies(zombies);
    }
  }, [isZombieMode, activeCheckpoints, isGameOver, roamingZombies.length]);

  useEffect(() => {
    if (!isZombieMode || isGameOver) return;
    const interval = setInterval(() => {
        const target = userLocationRef.current;
        if (!target) return;
        const now = Date.now();
        setRoamingZombies(prev => {
            const nextZombies: Array<{id: string, lat: number, lng: number, angle: number, lastAttackTime: number}> = [];
            let damageDealt = false;
            prev.forEach(z => {
                const dist = getDistanceMeters(z.lat, z.lng, target[0], target[1]);
                const timeSinceAttack = now - z.lastAttackTime;
                
                // If lastAttackTime is in future (flare stun), it's "stunned"
                const isStunned = z.lastAttackTime > now || timeSinceAttack < 5000; 
                
                if (dist < 5 && !isImmuneRef.current && !isStunned) {
                    damageDealt = true;
                     nextZombies.push({ ...z, lastAttackTime: now });
                } else {
                    if (isStunned) { nextZombies.push(z); } else {
                        const speed = 1.8; 
                        const dLat = target[0] - z.lat;
                        const dLng = target[1] - z.lng;
                        const angle = Math.atan2(dLat, dLng);
                        const bearing = Math.atan2(dLng, dLat) * (180 / Math.PI);
                        const metersPerDegLat = 111132;
                        const metersPerDegLng = 111132 * Math.cos(z.lat * (Math.PI / 180));
                        nextZombies.push({
                            ...z,
                            lat: z.lat + (Math.sin(angle) * speed) / metersPerDegLat,
                            lng: z.lng + (Math.cos(angle) * speed) / metersPerDegLng,
                            angle: bearing
                        });
                    }
                }
            });
            if (damageDealt) { setTimeout(handleDamage, 0); }
            return nextZombies;
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [isZombieMode, isGameOver]);

  const allZombieThreats = useMemo(() => {
    const staticThreats = activeCheckpoints.filter(cp => (cp.points && cp.points < 0));
    const dynamicThreats = roamingZombies.map(z => ({
        id: z.id, name: 'STALKER', location: { lat: z.lat, lng: z.lng }, radiusMeters: 10, type: 'optional' as const, points: -100
    }));
    return [...activeCheckpoints, ...dynamicThreats] as Checkpoint[];
  }, [activeCheckpoints, roamingZombies]);

  // --- AUDIO LOGIC HOOKS ---
  const { toggleAudio: toggleZombieAudio, nearestZombieDistance, audioEnabled: zombieAudioEnabled } = useZombieAudio(userLocation, allZombieThreats, isZombieMode);
  const { toggleAudio: toggleXmasAudio, nearestDistance: nearestGrinchDistance, audioEnabled: xmasAudioEnabled } = useChristmasAudio(userLocation, activeCheckpoints, isChristmasMode);

  // UNIFIED AUDIO CONTROLS
  const audioEnabled = isZombieMode ? zombieAudioEnabled : isChristmasMode ? xmasAudioEnabled : false;
  const toggleAudio = isZombieMode ? toggleZombieAudio : isChristmasMode ? toggleXmasAudio : () => {};

  const isZombieCheckpoint = (cp: Checkpoint) => {
    return (cp.points && cp.points < 0) || cp.name.toLowerCase().includes('zombie') || cp.name.toLowerCase().includes('nest');
  };

  useEffect(() => {
    if (isZombieMode && nearestZombieDistance !== null && nearestZombieDistance < 20) {
       if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    }
  }, [nearestZombieDistance, isZombieMode]);

  const totalPoints = useMemo(() => {
      if (isChristmasMode) return christmasScore;
      return Array.from(checkedInIds).reduce((sum, id) => sum + (activeCheckpoints.find(c => c.id === id)?.points || 0), 0);
  }, [checkedInIds, activeCheckpoints, christmasScore, isChristmasMode]);
  
  useEffect(() => { if (initialJoinCode && !isTestMode) setAccessCodeInput(initialJoinCode); }, [initialJoinCode, isTestMode]);
  
  useEffect(() => {
      if (isTestMode && !startTime) {
          unlockAudioEngine();
          setStartTime(Date.now());
          setHasStarted(true);
          setShouldCenterMap(true);
          setHasSeenBriefing(true); // Skip briefing in test mode
      }
  }, [isTestMode]);

  // Main Timer & Auto-Start Logic
  useEffect(() => { 
      const timer = setInterval(() => {
          const now = Date.now();
          setCurrentTime(now);
          // Check for auto-start (Mass Start logic)
          if (!hasStarted && startTime && now >= startTime) {
              setHasStarted(true);
              setNotificationToast({ title: "GO GO GO!", message: "Loppet har startat!", type: 'success' });
              playSynthSound('success');
          }
      }, 1000);
      return () => clearInterval(timer); 
  }, [hasStarted, startTime]);
  
  useEffect(() => {
    setPhotoPreview(null);
    setIsUploadingPhoto(false);
  }, [selectedCheckpoint]);

  const validateCode = () => {
       const correctCode = (raceData.accessCode || '').toUpperCase();
      const enteredCode = accessCodeInput.toUpperCase();
      if (enteredCode === 'DEV' || enteredCode === 'TEST' || enteredCode === 'JUL') { setIsDevMode(true); setLoginError(false); return true; }
      if (!correctCode || enteredCode === correctCode) { setLoginError(false); return true; } else { setLoginError(true); return false; }
  };
  const handleAuthStart = (provider: any) => { if(validateCode()) { setAuthProvider(provider); setAuthStep('profile'); } };
  
  const handleProfileComplete = (e: any) => { 
      e.preventDefault(); 
      if(!teamNameInput.trim()) return; 
      setParticipantId(userProfile?.id && userProfile.id !== 'guest' ? userProfile.id : Date.now().toString()); 
      setAuthStep('lobby'); 
  };
  
  // Helper to save initial state so "Resume" works immediately
  const saveInitialProgress = () => {
      if (onUpdateResult && !isTestMode) {
         const finalGroupTag = orgInput && subGroupInput ? `${orgInput} - ${subGroupInput}` : orgInput || subGroupInput;
         onUpdateResult({
              id: participantId,
              name: teamNameInput,
              teamName: finalGroupTag,
              finishTime: '00:00:00', // Indicates running/start
              totalPoints: 0,
              checkpointsVisited: 0,
              visitedCheckpointIds: [],
              status: 'running',
              authProvider: authProvider,
              profileImage: profileImage
         });
     }
  };

  const handleEnterRace = () => {
      unlockAudioEngine();
      setAuthStep('race'); 
      setShouldCenterMap(true); 
      
      // Initialize Start Time for Mass Start
      if(raceData.startMode === 'mass_start') { 
          const start = new Date(raceData.startDateTime).getTime(); 
          setStartTime(start); 
          if(Date.now() >= start) setHasStarted(true); 
      }
      
      // Create the record immediately so "Resume" works
      saveInitialProgress();
  };
  
  const handleSelfStart = () => { 
      unlockAudioEngine();
      setStartTime(Date.now()); 
      setHasStarted(true); 
      setShouldCenterMap(true); 
      
      // Create the record immediately
      saveInitialProgress();
  };

  // --- GIVE UP / DNF HANDLER ---
  const handleGiveUpRequest = () => {
      setIsMenuOpen(false);
      setShowGiveUpDialog(true);
  };

  const confirmGiveUp = async () => {
      const finalGroupTag = orgInput && subGroupInput ? `${orgInput} - ${subGroupInput}` : orgInput || subGroupInput;
      if (onUpdateResult) {
          await onUpdateResult({
              id: participantId,
              name: teamNameInput,
              teamName: finalGroupTag,
              finishTime: elapsedString,
              totalPoints: totalPoints,
              checkpointsVisited: checkedInIds.size,
              visitedCheckpointIds: Array.from(checkedInIds),
              status: 'dnf', // SET TO DNF
              authProvider: authProvider,
              profileImage: profileImage
          });
      }
      setShowGiveUpDialog(false);
      onExit(); // Exit back to main
  };
  
  // --- REAL IMAGE UPLOAD HANDLER ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && selectedCheckpoint) {
          setIsUploadingPhoto(true);
          
          // Preview
          const reader = new FileReader();
          reader.onloadend = () => setPhotoPreview(reader.result as string);
          reader.readAsDataURL(file);

          try {
              const path = `race-photos/${raceData.id}/${participantId}/${selectedCheckpoint.id}.jpg`;
              await api.storage.uploadBlob(path, file); // Real Upload
              
              setNotificationToast({
                  title: "UPLOAD COMPLETE",
                  message: "Evidence secured in cloud storage.",
                  type: 'success'
              });
              
              // Automatically check in after upload if it was a requirement
              performCheckIn(selectedCheckpoint);
              
          } catch (error) {
              console.error("Upload failed", error);
              setNotificationToast({
                  title: "UPLOAD FAILED",
                  message: "Check your connection.",
                  type: 'danger'
              });
          } finally {
              setIsUploadingPhoto(false);
              setTimeout(() => setNotificationToast(null), 2000);
          }
      }
  };

  const triggerCamera = () => { fileInputRef.current?.click(); };

  const handleFinishRace = async () => {
      // Prevent multiple triggers
      if (isFinishDialogOpen) return;
      
      const finalGroupTag = orgInput && subGroupInput ? `${orgInput} - ${subGroupInput}` : orgInput || subGroupInput;

      // Play sound
      playSynthSound('finish');

      if ((isZombieMode || isChristmasMode) && startTime) {
          const modeKey = isZombieMode ? 'zombie_survival' : 'christmas_hunt';
          // Calculate time with penalty
          const penaltyMs = isChristmasMode ? (timePenalty * 1000) : 0;
          const timeSec = ((Date.now() - startTime) + penaltyMs) / 1000;
          
          await api.leaderboard.saveScore({
              id: participantId,
              playerName: teamNameInput,
              groupTag: finalGroupTag,
              score: totalPoints,
              timeSeconds: timeSec,
              timeString: elapsedString,
              timestamp: new Date().toISOString(),
              location: userLocation ? { lat: userLocation[0], lng: userLocation[1] } : { lat: 0, lng: 0 },
              mode: modeKey
          });
      }

      if (onUpdateResult) {
          onUpdateResult({
              id: participantId,
              name: teamNameInput,
              teamName: finalGroupTag,
              finishTime: elapsedString,
              totalPoints: totalPoints,
              checkpointsVisited: checkedInIds.size,
              visitedCheckpointIds: Array.from(checkedInIds),
              status: 'finished', // Final status
              authProvider: authProvider,
              profileImage: profileImage 
          });
      }
      setIsFinishDialogOpen(true);
  };

  const handleRateAndExit = (score: number, comment: string) => {
      if (onRateEvent) {
          onRateEvent({ score, comment, timestamp: new Date().toISOString(), authorName: teamNameInput });
      }
      onExit();
  };

  const lastPosRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (authStep !== 'race' || !navigator.geolocation || isGameOver) return;
    const handlePosUpdate = (lat: number, lng: number, acc: number) => {
        const newPos: [number, number] = [lat, lng];
        setUserLocation(newPos); setGpsAccuracy(acc);
        if (hasStarted) {
            
            // 1. Check Standard Checkpoints
            const targets = [...activeCheckpoints];
            if (extractionPoint && extractionPoint.location) targets.push(extractionPoint);

            targets.forEach(cp => {
                // Safeguard: Checkpoint must have location
                if (!cp.location) return;

                if (checkedInIds.has(cp.id)) return;
                // For Zombie mode, threats are handled by roaming logic mostly
                // For Christmas mode, Grinches are handled by useGrinchLogic, but static checkpoints can still be fallback
                if (isZombieCheckpoint(cp) && !isChristmasMode && !isZombieMode) return;
                
                // For standard races, check distance
                const dist = getDistanceMeters(lat, lng, cp.location.lat, cp.location.lng);
                
                // Allow a larger hit area than default (min 20m, or cp radius)
                const hitRadius = Math.max(cp.radiusMeters || 20, 30); // Increased min radius to 30m
                
                if (dist <= hitRadius && !cp.requiresPhoto) { 
                    performCheckIn(cp); 
                }
            });

            // 2. CHECK FINISH LINE PROXIMITY (Automatic Finish) - Disabled in Extraction Mode (uses heli)
            if (checkedInIds.size > 0 && !isFinishDialogOpen && !isZombieMode && !isChristmasMode) {
                const distToFinish = getDistanceMeters(lat, lng, raceData.finishLocation.lat, raceData.finishLocation.lng);
                const finishRadius = raceData.finishLocation.radiusMeters || 50;
                
                if (distToFinish <= finishRadius) {
                    handleFinishRace();
                }
            }
        }
    };
    const watchId = navigator.geolocation.watchPosition((p) => { handlePosUpdate(p.coords.latitude, p.coords.longitude, p.coords.accuracy); }, err => console.error(err), { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [authStep, hasStarted, checkedInIds, activeCheckpoints, isGameOver, isChristmasMode, isFinishDialogOpen, extractionPoint, isFrozen]); // Added isFrozen dependency to stop updates if frozen? No, location updates still happen, but checkin is blocked.

  // --- DIALOG THEMES ---
  const dialogTheme = isChristmasMode ? {
      bg: 'bg-white border-sky-100',
      title: 'text-slate-900',
      text: 'text-slate-600',
      iconBg: 'bg-red-50 border-red-100',
      iconColor: 'text-red-500',
      cancelBtn: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
      confirmBtn: 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-200'
  } : {
      bg: 'bg-gray-900 border-red-900/50',
      title: 'text-white',
      text: 'text-gray-400',
      iconBg: 'bg-red-900/20 border-red-500/20',
      iconColor: 'text-red-500',
      cancelBtn: 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700',
      confirmBtn: 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/30'
  };

  if (authStep === 'login' || authStep === 'profile' || authStep === 'lobby') {
      return (
        <div className={`h-full w-full flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans ${isZombieMode ? 'bg-black text-green-500 font-mono' : isChristmasMode ? 'bg-sky-200 text-slate-800' : 'bg-slate-950'}`}>
             <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${isChristmasMode ? 'from-white via-sky-100 to-sky-200' : 'from-blue-900/20 via-slate-950 to-slate-950'} pointer-events-none`}></div>
             {isZombieMode && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>}
             {isChristmasMode && <SnowfallOverlay intensity="normal" />}

             {/* EXIT BUTTON */}
             <button 
                onClick={onExit}
                className={`absolute top-6 left-6 z-50 p-3 rounded-full transition-all duration-200 group ${
                    isZombieMode 
                    ? 'bg-red-950/30 text-red-500 border border-red-900/50 hover:bg-red-900/50 hover:scale-110' 
                    : isChristmasMode 
                        ? 'bg-white/50 text-slate-600 border border-white hover:bg-white hover:text-slate-900 hover:scale-110 shadow-sm'
                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white hover:scale-110'
                }`}
                title="Gå tillbaka"
             >
                <ArrowLeft className="w-6 h-6" />
             </button>

             {authStep === 'login' && (
                 <div className="relative z-10 w-full max-w-sm">
                     <h1 className={`text-4xl font-black text-center mb-8 ${isZombieMode ? 'text-red-600 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] tracking-widest' : isChristmasMode ? 'text-slate-900 drop-shadow-sm' : 'text-white'}`}>{raceData.name}</h1>
                     <input value={accessCodeInput} onChange={e => setAccessCodeInput(e.target.value)} className={`w-full border rounded-xl py-4 text-center text-xl tracking-[0.5em] font-mono uppercase mb-4 ${isZombieMode ? 'bg-black border-red-900 text-red-500 placeholder-red-900 focus:border-red-500' : isChristmasMode ? 'bg-white border-sky-300 text-slate-800 placeholder-slate-400 focus:border-sky-500 shadow-sm' : 'bg-slate-900/80 border-slate-700 text-white'}`} placeholder="KOD" />
                     {loginError && <p className="text-red-500 text-center text-sm mb-4">Fel kod</p>}
                     <button onClick={() => handleAuthStart('guest')} className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all ${isZombieMode ? 'bg-red-900/50 hover:bg-red-800 text-red-100 border border-red-600 animate-pulse' : isChristmasMode ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-200' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{isZombieMode ? 'ENTER SURVIVAL MODE' : isChristmasMode ? 'HJÄLP TOMTEN NU' : 'GÅ MED'}</button>
                     <div className="mt-8 text-center opacity-50 hover:opacity-100 transition-opacity"><p className={`text-[10px] uppercase tracking-widest mb-1 ${isChristmasMode ? 'text-slate-500' : 'text-gray-400'}`}>Developer Access</p><div className={`text-xs font-mono rounded p-2 inline-block border ${isChristmasMode ? 'bg-white/50 text-slate-600 border-sky-200' : 'bg-black/20 text-gray-500 border-white/5'}`}>Code: <span className={`${isChristmasMode ? 'text-slate-900' : 'text-white'} font-bold select-all`}>{raceData.accessCode || 'QUEST123'}</span><span className="mx-2">|</span>Magic: <span className="text-blue-400 font-bold" title="Use DEV, TEST or JUL">DEV</span></div></div>
                 </div>
             )}
             {authStep === 'profile' && (
                 <div className="relative z-10 w-full max-w-sm">
                     <h2 className={`text-2xl font-bold text-center mb-6 ${isChristmasMode ? 'text-slate-800' : 'text-white'}`}>Vem är du?</h2>
                     <div className="space-y-4">
                         <input value={teamNameInput} onChange={e => setTeamNameInput(e.target.value)} className={`w-full border rounded-xl py-4 px-4 ${isChristmasMode ? 'bg-white text-slate-800 border-sky-300 placeholder-slate-400' : 'bg-slate-900/80 border-slate-700 text-white'}`} placeholder="Ditt Namn" />
                         {(isZombieMode || isChristmasMode) && (<div><label className={`block text-xs font-bold uppercase mb-2 pl-1 ${isChristmasMode ? 'text-slate-500' : 'text-gray-400'}`}>För Topplistan (Frivilligt)</label><div className="grid grid-cols-2 gap-3"><div className="relative"><Building2 className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" /><input value={orgInput} onChange={e => setOrgInput(e.target.value)} className={`w-full border rounded-xl py-4 pl-10 pr-4 text-sm ${isChristmasMode ? 'bg-white text-slate-800 border-sky-300' : 'bg-slate-900/80 border-slate-700 text-white'}`} placeholder="Skola/Org" /></div><div className="relative"><Users className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" /><input value={subGroupInput} onChange={e => setSubGroupInput(e.target.value)} className={`w-full border rounded-xl py-4 pl-10 pr-4 text-sm ${isChristmasMode ? 'bg-white text-slate-800 border-sky-300' : 'bg-slate-900/80 border-slate-700 text-white'}`} placeholder="Klass/Lag" /></div></div><p className="text-[10px] text-gray-500 mt-1 pl-1">Ex: "Centralskolan" och "9B" för att synas unikt i listan.</p></div>)}
                     </div>
                     <button onClick={handleProfileComplete} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-6">KLAR</button>
                 </div>
             )}
             {authStep === 'lobby' && (
                 <div className="relative z-10 w-full max-w-sm text-center">
                     <h2 className={`text-xl mb-2 ${isChristmasMode ? 'text-slate-600' : 'text-gray-400'}`}>Välkommen</h2>
                     <div className="flex justify-center mb-4">
                         <div className={`w-24 h-24 rounded-full border-4 overflow-hidden shadow-2xl relative ${isChristmasMode ? 'border-white bg-sky-100' : 'border-white/20 bg-gray-800'}`}>
                             {profileImage ? (
                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                             ) : (
                                <User className={`w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isChristmasMode ? 'text-slate-400' : 'text-gray-500'}`} />
                             )}
                         </div>
                     </div>
                     <h1 className={`text-4xl font-black mb-8 ${isZombieMode ? 'text-red-500' : isChristmasMode ? 'text-slate-900' : 'text-white'}`}>{teamNameInput}</h1>
                     <button onClick={handleEnterRace} className={`w-full font-black py-4 rounded-xl shadow-lg hover:scale-105 transition-transform ${isZombieMode ? 'text-black bg-red-600 border border-red-400' : isChristmasMode ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-200' : 'bg-white text-black'}`}>{isZombieMode ? 'START SURVIVAL' : isChristmasMode ? 'STARTA JAKTEN' : 'ÖPPNA KARTAN'}</button>
                 </div>
             )}
        </div>
      )
  }

  const currentLayer = isZombieMode ? TILE_LAYERS['dark'] : TILE_LAYERS['google_standard'];
  
  // Safe default coordinates to prevent white map crashes if data is missing
  const defaultPos: [number, number] = [59.3293, 18.0686]; // Stockholm fallback
  const startPos: [number, number] = (raceData.startLocation && raceData.startLocation.lat) 
      ? [raceData.startLocation.lat, raceData.startLocation.lng] 
      : defaultPos;
      
  const finishPos: [number, number] = (raceData.finishLocation && raceData.finishLocation.lat)
      ? [raceData.finishLocation.lat, raceData.finishLocation.lng]
      : defaultPos;

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden font-sans ${isZombieMode ? 'bg-black' : isChristmasMode ? 'bg-[#0f172a]' : 'bg-slate-900'}`}>
        
        {/* Flash Effect for Flare */}
        {flashEffect && <div className="absolute inset-0 bg-white z-[9999] pointer-events-none animate-pulse"></div>}

        <MissionBriefingDialog 
            raceData={raceData}
            isOpen={authStep === 'race' && !hasSeenBriefing && !isDevMode}
            onDeploy={() => setHasSeenBriefing(true)}
        />

        {/* RED HORROR VIGNETTE & SCANLINES (ZOMBIE MODE ONLY) */}
        {isZombieMode && (
            <>
                <div className="absolute inset-0 pointer-events-none z-[100] bg-[radial-gradient(circle_at_center,transparent_50%,rgba(50,0,0,0.6)_90%,rgba(0,0,0,0.9)_100%)]"></div>
                <div className="absolute inset-0 pointer-events-none z-[90] opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </>
        )}

        {isGameOver && (
            <div className="absolute inset-0 z-[6000] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
                <Skull className="w-32 h-32 text-red-600 mb-6 animate-pulse" />
                <h1 className="text-6xl font-black text-red-600 tracking-tighter mb-4 text-center">YOU DIED</h1>
                <p className="text-gray-400 text-center mb-8 max-w-md">The infection has taken over. You survived for <span className="text-white font-mono">{elapsedString}</span>.</p>
                <div className="flex gap-4">
                    <button onClick={handleRestart} className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-red-900/40 uppercase tracking-widest flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Try Again</button>
                    <button onClick={onExit} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 px-8 rounded-xl border border-gray-700 uppercase tracking-widest">Exit</button>
                </div>
            </div>
        )}

        <FinishDialog isOpen={isFinishDialogOpen} totalPoints={totalPoints} elapsedTime={elapsedString} onRate={handleRateAndExit} isChristmas={isChristmasMode} />
        
        <GameMenu 
            isOpen={isMenuOpen} 
            onClose={() => setIsMenuOpen(false)} 
            onPause={onExit} 
            onGiveUpRequest={handleGiveUpRequest} 
            raceDescription={raceData.description} 
            audioEnabled={audioEnabled} 
            onToggleAudio={toggleAudio} 
            raceCategory={raceData.category}
        />

        {/* --- CUSTOM GIVE UP DIALOG (Replaces Browser Confirm) --- */}
        {showGiveUpDialog && (
            <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl relative overflow-hidden border ${dialogTheme.bg}`}>
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${dialogTheme.iconBg}`}>
                            <Flag className={`w-8 h-8 ${dialogTheme.iconColor}`} />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${dialogTheme.title}`}>Ge upp loppet?</h3>
                        <p className={`text-sm mb-6 leading-relaxed ${dialogTheme.text}`}>
                            Är du säker? Ditt resultat kommer att registreras som <span className="text-red-500 font-bold">DNF</span> (Did Not Finish).
                        </p>
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setShowGiveUpDialog(false)} 
                                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${dialogTheme.cancelBtn}`}
                            >
                                Avbryt
                            </button>
                            <button 
                                onClick={confirmGiveUp} 
                                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${dialogTheme.confirmBtn}`}
                            >
                                Ge Upp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {isDevMode && (
            <>
                <div className="absolute top-2 left-2 z-[2000] flex gap-2"><div className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-purple-400 pointer-events-none flex items-center gap-1"><Zap className="w-3 h-3" /> DEV MODE</div>{isZombieMode && (<button onClick={() => handleDamage()} className="bg-red-900 text-red-200 text-xs font-bold px-3 py-1 rounded-full border border-red-500 hover:bg-red-800">Hurt Me</button>)}</div>
                <div className="absolute bottom-36 left-4 z-[2000]">
                    <button onClick={() => setIsDevToolsOpen(!isDevToolsOpen)} className={`p-3 rounded-full shadow-xl transition-all ${isDevToolsOpen ? 'bg-purple-600 text-white' : 'bg-gray-900 text-purple-400 border border-purple-500/50'}`}><Bug className="w-6 h-6" /></button>
                    {isDevToolsOpen && (<div className="absolute bottom-16 left-0 w-48 bg-gray-900/95 border border-purple-500/30 rounded-2xl shadow-2xl p-3 backdrop-blur animate-in slide-in-from-bottom-2 fade-in duration-200"><h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 border-b border-purple-500/20 pb-1">Dev Tools</h4><div className="space-y-2"><button onClick={() => { setCheckedInIds(new Set()); setLives(3); setStartTime(Date.now()); }} className="w-full text-left text-xs font-bold text-white hover:text-purple-300 py-1 flex items-center gap-2"><RotateCcw className="w-3 h-3" /> Reset Game</button>{isZombieMode && (<><button onClick={() => setLives(0)} className="w-full text-left text-xs font-bold text-red-400 hover:text-red-300 py-1 flex items-center gap-2"><Skull className="w-3 h-3" /> Force Game Over</button><button onClick={() => setLives(999)} className="w-full text-left text-xs font-bold text-green-400 hover:text-green-300 py-1 flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> God Mode</button></>)}<div className="text-[10px] text-gray-500 pt-2 italic border-t border-white/5 mt-1">Click map to teleport</div></div></div>)}
                </div>
            </>
        )}

        {!hasStarted && hasSeenBriefing && (
            <div className="absolute inset-0 z-[4000] flex flex-col items-center justify-center pointer-events-none">
                <div className={`backdrop-blur-md border shadow-2xl rounded-3xl p-8 max-w-sm w-full mx-4 text-center pointer-events-auto animate-in zoom-in duration-300 ${isChristmasMode ? 'bg-white/95 border-sky-300 text-slate-800' : 'bg-slate-900/95 border-slate-700 text-white'}`}>
                    {raceData.startMode === 'self_start' ? (
                        <>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse border-4 ${isChristmasMode ? 'bg-green-500 text-white border-green-300 shadow-green-200' : 'bg-green-600 text-white border-green-400 shadow-[0_0_30px_rgba(22,163,74,0.5)]'}`}>
                                <PlayCircle className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Redo för start?</h2>
                            <p className="text-sm mb-8 leading-relaxed opacity-80">
                                Ta dig till startpunkten och starta klockan när du är redo. Tiden börjar ticka direkt.
                            </p>
                            <button 
                                onClick={handleSelfStart}
                                className={`w-full py-4 font-black text-lg uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${isChristmasMode ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-green-600 text-white hover:bg-green-500'}`}
                            >
                                <Play className="w-6 h-6 fill-white" /> STARTA LOPPET
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-yellow-600/30 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-500">
                                <Clock className="w-10 h-10 text-yellow-500" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-widest mb-2">Inväntar Start</h3>
                            <p className="text-sm opacity-70 mb-6">
                                Du kan inte ta kontroller förrän startskottet går. Gör dig redo vid startlinjen!
                            </p>
                            {startTime && startTime > Date.now() && (
                                <div className={`rounded-xl p-4 border ${isChristmasMode ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-white/10'}`}>
                                    <div className="text-xs font-bold uppercase mb-1 opacity-60">Starttid</div>
                                    <div className="text-4xl font-mono font-black text-yellow-400 tracking-tight">
                                        {new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

        {(isZombieMode || isChristmasMode) && !audioEnabled && hasSeenBriefing && (
            <div className="absolute inset-0 z-[4000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                <div className={`text-center max-w-sm animate-in zoom-in duration-300 p-8 rounded-3xl shadow-2xl border-2 ${isChristmasMode ? 'bg-white text-slate-800 border-sky-300' : 'bg-slate-900 text-white border-red-500'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 animate-pulse ${isChristmasMode ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 'bg-red-900/30 border-red-500 text-red-500'}`}>
                        <Volume2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
                        {isChristmasMode ? 'AKTIVERA MAGISK HÖRSEL' : 'AUDIO REQUIRED'}
                    </h2>
                    <p className={`mb-8 font-mono text-sm opacity-80 ${isChristmasMode ? 'text-slate-600' : 'text-gray-400'}`}>
                        {isChristmasMode ? 'För att höra tomtens bjällror och hitta paketen måste du slå på ljudet.' : 'Tap to activate survival audio systems.'}
                    </p>
                    <button onClick={toggleAudio} className={`w-full py-4 font-black uppercase tracking-[0.2em] rounded-xl active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg ${isChristmasMode ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-red-600 hover:bg-red-500 text-black'}`}>
                        <Play className="w-5 h-5 fill-current" /> {isChristmasMode ? 'STARTA RADAR' : 'ENGAGE'}
                    </button>
                </div>
            </div>
        )}

        {isZombieMode && nearestZombieDistance !== null && nearestZombieDistance < 100 && (
            <div className="absolute inset-0 z-[2500] pointer-events-none transition-all duration-300" style={{ background: `radial-gradient(circle, transparent 50%, rgba(220, 38, 38, ${Math.min(0.9, (100 - nearestZombieDistance) / 100)}))` }}>{nearestZombieDistance < 20 && (<div className="absolute inset-0 bg-red-600/30 animate-pulse"></div>)}</div>
        )}

        {isImmune && (
            <div className="absolute inset-0 z-[5000] flex flex-col items-center justify-center pointer-events-none"><div className="bg-red-900/90 border-4 border-red-600 p-8 rounded-2xl transform rotate-2 animate-bounce shadow-[0_0_50px_rgba(220,38,38,0.8)] text-center"><HeartCrack className="w-24 h-24 text-white mx-auto mb-4 animate-pulse" /><h1 className="text-5xl font-black text-white tracking-tighter mb-2">DAMAGE!</h1><div className="text-2xl font-mono text-red-100 font-bold">RUN! IMMUNITY ACTIVE</div></div></div>
        )}

        {/* CHRISTMAS FROZEN STATE */}
        {isFrozen && isChristmasMode && (
            <div className="absolute inset-0 z-[5000] flex flex-col items-center justify-center pointer-events-none bg-blue-900/30 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-blue-900/90 border-4 border-blue-400 p-8 rounded-2xl text-center shadow-[0_0_50px_rgba(59,130,246,0.8)]">
                    <Snowflake className="w-24 h-24 text-white mx-auto mb-4 animate-spin-slow" />
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2">ISIGT!</h1>
                    <div className="text-3xl font-black text-red-400 uppercase tracking-widest animate-pulse mb-2">+30s STRAFFTID</div>
                    <p className="text-blue-200 text-lg font-bold">Värmer upp...</p>
                </div>
            </div>
        )}

        {/* CHRISTMAS COLD VIGNETTE (Dynamic based on warmth) - NEW: Frost Effect around edges */}
        {isChristmasMode && warmth < 100 && (
            <div 
                className="absolute inset-0 z-[2500] pointer-events-none transition-all duration-1000"
                style={{ 
                    // Radial gradient that gets tighter and more opaque white/blue as warmth drops
                    background: `radial-gradient(circle at center, transparent 30%, rgba(200, 230, 255, ${Math.min(0.9, (100 - warmth) / 100 * 0.8)}) 100%)`, 
                    boxShadow: warmth < 30 ? 'inset 0 0 100px rgba(59,130,246,0.5)' : 'none', // Add blue glow at edges when critical
                    filter: warmth < 20 ? 'blur(1px)' : 'none' // Blur vision slightly when freezing
                }}
            />
        )}

        {/* WHITEOUT EFFECT */}
        {isWhiteout && isChristmasMode && (
            <div className="absolute inset-0 z-[2900] pointer-events-none bg-white/90 backdrop-blur-[8px] animate-in fade-in duration-1000 flex items-center justify-center">
                <div className="text-center opacity-50">
                    <h2 className="text-4xl font-black text-gray-400 tracking-[1em] uppercase">WHITEOUT</h2>
                </div>
            </div>
        )}

        {/* --- CHRISTMAS HUD (UPDATED to match Zombie Layout) --- */}
        {isChristmasMode ? (
            <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none safe-area-top">
                <div className="flex justify-between items-start">
                    
                    {/* Left Side: Profile + Warmth */}
                    <div className="flex flex-col gap-2 pointer-events-auto">
                        
                        {/* Profile Pill - Christmas Colors */}
                        <div className="flex items-center gap-3 bg-slate-900/90 border border-green-500/50 rounded-full pr-6 pl-1 py-1 shadow-[0_0_15px_rgba(22,163,74,0.3)]">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-600">
                                <img src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teamNameInput}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                                <div className="text-[10px] font-black text-yellow-400 tracking-wider uppercase">Tomtenisse</div>
                                <div className="text-sm font-bold text-white font-mono leading-none">{teamNameInput}</div>
                            </div>
                        </div>

                        {/* Warmth Meter (Replaces Hearts) */}
                        <div className="pl-1 mt-1">
                            {/* NEW: Safe Zone Indicator */}
                            {isAtHeatSource && (
                                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-green-400 flex items-center gap-1 animate-pulse">
                                    <ShieldCheck className="w-3 h-3" /> SAFE ZONE (WARMING)
                                </div>
                            )}
                            {!isAtHeatSource && warmth < 30 && (
                                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1 animate-pulse">
                                    <Snowflake className="w-3 h-3" /> FREEZING...
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-1">
                                <Thermometer className={`w-4 h-4 ${warmth < 30 ? 'text-blue-400 animate-pulse' : 'text-orange-400'}`} />
                                <div className="w-32 h-4 bg-blue-950 rounded-full overflow-hidden border border-blue-800 relative shadow-inner">
                                    {/* The Warmth Bar - Changes color based on state */}
                                    <div 
                                        className={`h-full transition-all duration-500 relative z-10 ${
                                            warmth < 20 
                                            ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_blue]' 
                                            : isAtHeatSource
                                                ? 'bg-gradient-to-r from-orange-600 via-orange-400 to-yellow-300' 
                                                : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${warmth}%` }}
                                    ></div>
                                </div>
                                {isAtHeatSource && (
                                    <Flame className="w-4 h-4 text-orange-500 animate-bounce drop-shadow-[0_0_5px_rgba(249,115,22,0.8)] absolute -right-5" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Score, Settings, Bag */}
                    <div className="flex flex-col items-end gap-2 pointer-events-auto">
                        <div className="flex items-start gap-2">
                            {/* Score Box */}
                            <div className="bg-red-900/90 border border-red-500/50 rounded-xl p-2 min-w-[80px] text-center shadow-[0_0_20px_rgba(220,38,38,0.3)] backdrop-blur">
                                <div className="text-2xl font-black text-yellow-400 leading-none font-mono drop-shadow-md">{totalPoints}</div>
                                <div className="text-[9px] font-bold text-red-200 uppercase tracking-widest">POÄNG</div>
                            </div>
                            
                            {/* Settings Button */}
                            <button 
                                onClick={() => setIsMenuOpen(true)}
                                className="p-3 bg-slate-900/80 border border-white/10 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg h-[58px] w-[58px] flex items-center justify-center"
                            >
                                <Settings className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Bag Inventory (Under Score) */}
                        <div className="bg-slate-900/80 backdrop-blur border border-green-500/30 rounded-xl p-2 flex flex-col items-center shadow-lg mt-1 w-fit">
                            <div className="flex gap-1">
                                {Array.from({length: bagCapacity}).map((_, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${i < bagCount ? 'bg-yellow-500 border-yellow-300 shadow-md scale-105' : 'bg-gray-800 border-gray-600 opacity-50'}`}>
                                        {i < bagCount ? <Gift className="w-5 h-5 text-red-700" /> : <div className="w-2 h-2 rounded-full bg-gray-600"></div>}
                                    </div>
                                ))}
                            </div>
                            <div className="text-[9px] font-bold text-green-400 uppercase tracking-wider mt-1">Säcken {bagCount}/{bagCapacity}</div>
                        </div>
                    </div>
                </div>
            </div>
        ) : isZombieMode ? (
            /* ZOMBIE HUD (Existing) */
            <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none safe-area-top">
                <div className="flex justify-between items-start">
                    
                    {/* Left Side: Profile, Timer, Hearts */}
                    <div className="flex flex-col gap-2 pointer-events-auto">
                        {/* Profile Pill - Darker, Green/Red accents */}
                        <div className="flex items-center gap-3 bg-black/90 border border-green-500/30 rounded-full pr-6 pl-1 py-1 shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-green-900">
                                <img src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teamNameInput}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                                <div className="text-[10px] font-black text-red-500 tracking-wider">QUESTER</div>
                                <div className="text-sm font-bold text-green-400 font-mono leading-none">{teamNameInput}</div>
                            </div>
                        </div>

                        {/* Timer - Dark pill */}
                        {hasStarted && (
                            <div className="bg-black/90 border border-green-500/50 text-green-400 font-mono text-sm px-4 py-1 rounded-full w-fit flex items-center gap-2 shadow-lg">
                                <Clock className="w-3 h-3" />
                                {elapsedString}
                            </div>
                        )}

                        {/* Hearts - Below timer */}
                        <div className="flex items-center gap-1 pl-1">
                            {Array.from({length: 3}).map((_, i) => (
                                <div key={i} className="transition-all duration-300">
                                    {i < lives ? (<Heart className="w-6 h-6 text-red-600 fill-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)] animate-pulse" />) : (<HeartCrack className="w-6 h-6 text-gray-800" />)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Big Red Points Box & Settings - Side by side */}
                    <div className="flex items-start gap-2 pointer-events-auto">
                        <div className="bg-black/90 border border-red-600/50 rounded-xl p-2 min-w-[80px] text-center shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                            <div className="text-2xl font-black text-red-500 leading-none font-mono">{totalPoints}</div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">POÄNG</div>
                        </div>
                        
                        <button 
                            onClick={() => setIsMenuOpen(true)}
                            className="p-3 bg-red-950/80 border border-red-900 text-red-500 rounded-xl hover:bg-red-900 transition-colors shadow-lg h-[58px] w-[58px] flex items-center justify-center"
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            /* DEFAULT HUD FOR OTHER MODES */
            <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none safe-area-top">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2 pointer-events-auto mt-2">
                        <div className="backdrop-blur-md rounded-full pl-1 pr-4 py-1 flex items-center gap-3 border shadow-lg bg-slate-900/80 border-white/10">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {profileImage ? (<img src={profileImage} className="w-full h-full object-cover" />) : (teamNameInput.charAt(0))}
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase text-gray-400">Quester</div>
                                <div className="text-sm font-bold leading-none text-white">{teamNameInput}</div>
                            </div>
                        </div>
                        {hasStarted && (
                            <div className="backdrop-blur-md px-4 py-1 rounded-full border w-fit shadow-lg bg-slate-900/80 border-white/10 text-white font-mono">
                                <span className="font-bold flex items-center gap-2"><Clock className="w-3 h-3" />{elapsedString}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto mt-2">
                        <div className="backdrop-blur-md rounded-2xl px-4 py-2 text-right border shadow-lg bg-slate-900/80 border-white/10">
                            <div className="text-2xl font-black leading-none text-yellow-400">{totalPoints}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Poäng</div>
                        </div>
                        <button onClick={() => setIsMenuOpen(true)} className="p-3 rounded-2xl transition-all duration-200 group flex items-center justify-center shadow-lg w-[58px] h-[58px] bg-slate-900/80 text-white border border-white/10 hover:bg-slate-800">
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- SURVIVAL DECK (Consolidated Bottom UI) --- */}
        {isZombieMode && (
            <div className="absolute bottom-24 left-2 right-2 z-[2000] pointer-events-auto flex flex-col items-center">
                
                {/* 1. RADAR MODULE (Sitting on top of deck) */}
                {nearestZombieDistance !== null && (
                    <div className="relative z-20 mb-[-12px] w-[240px] md:w-[300px]">
                        <div className={`backdrop-blur-md px-4 py-3 rounded-t-3xl border-t-2 border-x-2 shadow-[0_-5px_20px_rgba(0,0,0,0.8)] flex flex-col items-center transition-colors relative overflow-hidden bg-black/90 ${nearestZombieDistance < 20 ? 'border-red-600' : nearestZombieDistance < 50 ? 'border-yellow-600' : 'border-green-800'}`}>
                            {/* Scanning Line */}
                            <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(0,255,0,0.1)_50%,transparent_100%)] w-full h-[200%] animate-[scan_2s_linear_infinite] pointer-events-none"></div>

                            <div className="flex items-center gap-2 mb-1 relative z-10">
                                <Radar className={`w-3 h-3 ${nearestZombieDistance < 50 ? 'text-red-500 animate-spin' : 'text-green-500'}`} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Threat Radar</span>
                            </div>
                            
                            <div className={`text-3xl font-mono font-black relative z-10 tracking-tighter leading-none ${nearestZombieDistance < 20 ? 'text-red-500 animate-pulse' : nearestZombieDistance < 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                                {nearestZombieDistance.toFixed(0)}<span className="text-sm ml-1 text-gray-600">M</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CONTROL PANEL (The Deck) */}
                <div className="w-full max-w-md bg-black/95 border-2 border-gray-800 rounded-3xl p-3 shadow-2xl relative z-10 flex items-center justify-between gap-2 backdrop-blur-xl">
                    
                    {/* Decorative Rivets */}
                    <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full border border-black"></div>
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full border border-black"></div>
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full border border-black"></div>
                    <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full border border-black"></div>

                    {/* Flare Button (Tactical) */}
                    <button 
                        onClick={handleUseFlare}
                        disabled={flares <= 0}
                        className={`flex flex-col items-center justify-center h-16 w-20 rounded-2xl transition-all border-2 active:scale-95 ${flares > 0 ? 'bg-red-900/30 text-white border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:bg-red-900/50' : 'bg-gray-900 border-gray-800 text-gray-700'}`}
                    >
                        <Flame className={`w-6 h-6 mb-1 ${flares > 0 ? 'text-orange-500 animate-pulse' : ''}`} />
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">FLARE</span>
                        <div className="absolute -top-2 -right-2 bg-gray-800 text-orange-500 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-gray-700 shadow-md">
                            {flares}
                        </div>
                    </button>

                    {/* Center Display (Signal Strength) */}
                    <div className="flex-1 bg-gray-900/80 rounded-xl border border-gray-800 p-2 flex flex-col items-center justify-center h-16">
                        <div className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1">SIGNAL UPLINK</div>
                        <div className="flex items-center gap-2">
                            <Radio className={`w-4 h-4 ${radioPartsFound >= 4 ? 'text-green-500 animate-pulse' : 'text-gray-600'}`} />
                            <div className="flex gap-1">
                                {Array.from({length: 4}).map((_, i) => (
                                    <div key={i} className={`h-2 w-3 rounded-sm transition-all duration-500 ${i < radioPartsFound ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-gray-800'}`}></div>
                                ))}
                            </div>
                            <span className="text-xs font-mono text-gray-400">{radioPartsFound}/4</span>
                        </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className={`flex flex-col items-center justify-center h-16 w-20 rounded-2xl border-2 transition-all ${toxicCloud ? 'bg-yellow-900/20 border-yellow-500/50 animate-pulse' : 'bg-gray-900 border-gray-800'}`}>
                        <Biohazard className={`w-6 h-6 mb-1 ${toxicCloud ? 'text-yellow-500' : 'text-gray-700'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-wider ${toxicCloud ? 'text-yellow-500' : 'text-gray-600'}`}>
                            {toxicCloud ? 'TOXIC' : 'SAFE'}
                        </span>
                    </div>
                </div>
            </div>
        )}

        {/* CHRISTMAS RADAR (UNCHANGED) */}
        {isChristmasMode && nearestGrinchDistance !== null && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none">
                <div className={`backdrop-blur-md border px-6 py-3 rounded-full shadow-2xl flex flex-col items-center min-w-[200px] transition-colors ${nearestGrinchDistance < 20 ? 'bg-red-900/90 border-white animate-pulse shadow-[0_0_15px_red]' : 'bg-red-950/80 border-red-400'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Snowflake className={`w-4 h-4 ${nearestGrinchDistance < 50 ? 'text-white animate-spin' : 'text-yellow-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200">Rudolfs Mule</span>
                    </div>
                    <div className={`text-3xl font-mono font-black ${nearestGrinchDistance < 20 ? 'text-white' : 'text-yellow-400'}`}>
                        {nearestGrinchDistance.toFixed(0)}<span className="text-sm ml-1">M</span>
                    </div>
                    <div className="text-xs font-bold mt-1 text-yellow-200 uppercase tracking-widest">
                        {nearestGrinchDistance < 20 ? 'NÄRA! TA DEN!' : 'NOSAR...'}
                    </div>
                </div>
            </div>
        )}

        {notificationToast && (
          <div 
            className="absolute top-20 inset-x-4 z-[5000] flex justify-center animate-in slide-in-from-top-10 duration-500 cursor-pointer pointer-events-auto"
            onClick={() => setNotificationToast(null)}
          >
            <div className={`backdrop-blur-md border px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm w-full ${notificationToast.type === 'success' ? 'bg-green-900/90 border-green-500' : notificationToast.type === 'danger' ? 'bg-red-900/90 border-red-500' : 'bg-blue-900/90 border-blue-500'}`}>
                <div className={`p-2 rounded-full ${notificationToast.type === 'success' ? 'bg-green-500 text-black' : notificationToast.type === 'danger' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {notificationToast.type === 'success' ? <ShieldCheck className="w-6 h-6" /> : <Skull className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                    <div className={`text-xs font-black uppercase tracking-widest ${notificationToast.type === 'success' ? 'text-green-400' : notificationToast.type === 'danger' ? 'text-red-400' : 'text-blue-300'}`}>{notificationToast.title}</div>
                    <div className="text-white font-bold text-sm">{notificationToast.message}</div>
                </div>
                <div className="text-white/30"><X className="w-4 h-4" /></div>
            </div>
          </div>
        )}

        <div className={`absolute inset-0 z-0 ${isZombieMode ? 'bg-black' : isChristmasMode ? 'bg-[#0f172a]' : 'bg-slate-900'}`}>
            <MapContainer center={startPos} zoom={15} zoomControl={false} style={{ height: "100%", width: "100%" }} className={`h-full w-full ${isChristmasMode ? 'winter-mode' : ''}`}>
                <TileLayer url={currentLayer.url} />
                <MapController centerPos={userLocation} doCenter={shouldCenterMap} setDoCenter={setShouldCenterMap} />
                {(isDevMode) && (<DevMapClickTeleport onTeleport={(lat, lng) => setUserLocation([lat, lng])} />)}
                <Marker position={startPos} icon={startIcon(isChristmasMode)} />
                
                {/* Visual Finish Zone */}
                {(!isZombieMode) && (
                    <Circle 
                        center={finishPos} 
                        radius={raceData.finishLocation?.radiusMeters || 50} 
                        pathOptions={{ 
                            color: 'red', 
                            fillColor: 'red', 
                            fillOpacity: 0.15, 
                            dashArray: '10, 5', 
                            weight: 2 
                        }} 
                    />
                )}
                
                {/* Helicopter Extraction Zone (Zombie Mode) */}
                {isZombieMode && extractionPoint && extractionPoint.location && (
                    <Marker position={[extractionPoint.location.lat, extractionPoint.location.lng]} icon={createCustomIcon('#10B981', false, false, false, 0, 0, 0, false, 'Extraction')} />
                )}
                
                {(!isZombieMode) && <Marker position={finishPos} icon={finishIcon} />}

                {userLocation && (<><Marker position={userLocation} icon={userIcon(profileImage, isDevMode)} />{isZombieMode && <Circle center={userLocation} radius={50} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }} />}</>)}
                
                {/* TOXIC CLOUD RENDER */}
                {toxicCloud && (
                    <Circle 
                        center={toxicCloud.center} 
                        radius={30} 
                        pathOptions={{ 
                            color: '#84cc16', 
                            fillColor: '#84cc16', 
                            fillOpacity: 0.4, 
                            className: 'animate-pulse' 
                        }} 
                    >
                        <Popup autoClose={false} closeButton={false}>
                            <div className="text-center font-bold text-red-600 flex items-center gap-1">
                                <Biohazard className="w-4 h-4"/> TOXIC GAS
                            </div>
                        </Popup>
                    </Circle>
                )}

                {/* --- RENDER GRINCHES (Christmas Mode Only) --- */}
                {isChristmasMode ? (
                     <>
                        {grinches.map(grinch => {
                            const isFleeing = grinch.state === 'fleeing';
                            
                            // We do not render if caught (maybe show loot bag later)
                            if (grinch.state === 'caught') return null;

                            return (
                                <React.Fragment key={grinch.id}>
                                    {/* Grinch Marker (Dynamic Position) */}
                                    <Marker 
                                        position={[grinch.lat, grinch.lng]} 
                                        icon={createGrinchIcon(grinch.state)}
                                    >
                                        {isFleeing && (
                                            <Tooltip permanent direction="top" offset={[0, -20]} className="bg-transparent border-0 shadow-none">
                                                <div className="px-2 py-1 rounded-md text-xs font-bold text-white shadow-md bg-red-600 whitespace-nowrap">
                                                    🏃 STOPPA TJUVEN!
                                                </div>
                                            </Tooltip>
                                        )}
                                    </Marker>
                                    
                                    {/* Movement Trail (Debug/Visual Aid) */}
                                    {isFleeing && userLocation && (
                                        <Polyline 
                                            positions={[[grinch.lat, grinch.lng], [userLocation[0], userLocation[1]]]} 
                                            pathOptions={{ color: 'red', weight: 2, dashArray: '5, 5', opacity: 0.3 }} 
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {/* RENDER STATIC BONFIRES SEPARATELY */}
                        {(activeCheckpoints || [])
                            .filter(cp => cp.name.toLowerCase().includes('eldstad') || cp.name.toLowerCase().includes('bonfire') || cp.name.toLowerCase().includes('värme'))
                            .map(cp => {
                                if (!cp.location) return null;
                                return (
                                <Marker 
                                    key={cp.id}
                                    position={[cp.location.lat, cp.location.lng]}
                                    icon={createCustomIcon(cp.color || '#F97316', false, false, false, 0, 0, 0, false, cp.name)}
                                >
                                    <Tooltip direction="top" offset={[0, -20]} className="bg-transparent border-0 shadow-none">
                                        <div className="px-2 py-1 rounded-md text-xs font-bold text-white shadow-md bg-orange-600 whitespace-nowrap">
                                            🔥 VÄRME
                                        </div>
                                    </Tooltip>
                                </Marker>
                            )})
                        }
                     </>
                ) : (
                    /* Standard Checkpoints rendering */
                    (activeCheckpoints || []).map((cp, index) => {
                        if (cp.id === 'extraction-heli') return null; // Handled separately
                        // Double check location is not null (though activeCheckpoints should guarantee)
                        if (!cp.location) return null;

                        const isChecked = checkedInIds.has(cp.id);
                        const isZombieCP = isZombieCheckpoint(cp);
                        // Default radius logic fallback to visualize zone
                        const displayRadius = cp.radiusMeters || 20;
                        const cpColor = cp.color || '#3b82f6';

                        return (
                            <React.Fragment key={cp.id}>
                                {/* Visual Circle for Check-in Zone (Always visible now) */}
                                {!isChecked && (
                                    <Circle 
                                        center={[cp.location.lat, cp.location.lng]} 
                                        radius={displayRadius} 
                                        pathOptions={{ 
                                            color: isZombieCP ? '#ef4444' : cpColor, 
                                            fillColor: isZombieCP ? '#ef4444' : cpColor, 
                                            fillOpacity: isZombieCP ? 0.2 : 0.1, 
                                            dashArray: isZombieCP ? '5, 5' : undefined,
                                            weight: 1
                                        }} 
                                        interactive={false}
                                    />
                                )}
                                <Marker position={[cp.location.lat, cp.location.lng]} icon={createCustomIcon(cp.color || '#3b82f6', isChecked, !!cp.quiz, !!cp.challenge, cp.points || 0, cp.timeModifierSeconds, index + 1, false, cp.name)} eventHandlers={{ click: () => { if (!isZombieCP) { setSelectedCheckpoint(cp); } } }} />
                            </React.Fragment>
                        )
                    })
                )}
                {roamingZombies.map(z => (<React.Fragment key={z.id}><Circle center={[z.lat, z.lng]} radius={50} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 1, className: 'animate-pulse' }} interactive={false} /><Marker position={[z.lat, z.lng]} icon={createRoamingZombieIcon(z.angle || 0, (Date.now() - (z.lastAttackTime || 0)) < 5000)}/></React.Fragment>))}
            </MapContainer>
        </div>
        
        {selectedCheckpoint && (
            <div className="absolute bottom-0 left-0 right-0 z-[2000] p-4 animate-in slide-in-from-bottom duration-300">
                <div className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl pb-24 overflow-hidden max-h-[80vh] overflow-y-auto ${isZombieMode ? 'bg-black/95 border-red-900 text-green-500 font-mono' : 'bg-slate-900/95 border-white/10 text-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div><h2 className={`text-2xl font-bold leading-tight ${isZombieMode ? 'text-red-500 uppercase tracking-widest' : 'text-white'}`}>{selectedCheckpoint.name}</h2>{checkedInIds.has(selectedCheckpoint.id) ? (<span className={`inline-flex items-center gap-1 text-xs font-bold mt-1 px-2 py-0.5 rounded-full border ${isZombieMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}><CheckCircle2 className="w-3 h-3" /> SECURED</span>) : (<span className="inline-flex items-center gap-1 text-xs font-bold mt-1 px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700"><Navigation className="w-3 h-3" /> DISTANCE: {(userLocation && selectedCheckpoint.location ? getDistanceMeters(userLocation[0], userLocation[1], selectedCheckpoint.location.lat, selectedCheckpoint.location.lng).toFixed(0) : '?')} M</span>)}</div>
                        <button onClick={() => setSelectedCheckpoint(null)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
                    </div>
                    <div className={`rounded-xl p-4 mb-6 border ${isZombieMode ? 'bg-gray-900/50 border-red-900/30 text-green-400' : 'bg-gray-800/50 border-white/5 text-gray-300'}`}><p className="text-sm leading-relaxed">{selectedCheckpoint.description || "Ingen beskrivning."}</p>{selectedCheckpoint.points && selectedCheckpoint.points < 0 && (<div className="mt-4 pt-4 border-t border-red-900/30 flex gap-3"><div className="p-2 bg-red-900/20 rounded-lg text-red-500 h-fit"><Skull className="w-5 h-5 animate-pulse" /></div><div><div className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">HAZARD ZONE</div><p className="text-sm text-red-300 italic">This area is heavily infected. Keep your distance!</p></div></div>)}</div>

                    {/* UPLOAD & ACTION AREA */}
                    {selectedCheckpoint.requiresPhoto && !checkedInIds.has(selectedCheckpoint.id) && (
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl mb-4">
                            <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Camera className="w-4 h-4" /> Photo Proof Required
                            </h3>
                            
                            {isUploadingPhoto ? (
                                <div className="flex flex-col items-center justify-center py-6">
                                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
                                    <span className="text-xs font-bold text-blue-300">UPLOADING TO CLOUD...</span>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-500/50 rounded-lg cursor-pointer hover:bg-blue-900/30 transition-colors">
                                    <Upload className="w-8 h-8 text-blue-400 mb-2" />
                                    <span className="text-xs font-bold text-blue-300">TAP TO UPLOAD EVIDENCE</span>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        className="hidden" 
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            )}
                        </div>
                    )}

                    {!checkedInIds.has(selectedCheckpoint.id) && !(selectedCheckpoint.points && selectedCheckpoint.points < 0) && !isChristmasMode && !selectedCheckpoint.requiresPhoto && (
                        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                             <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-500/20 rounded-full animate-pulse"><Radar className="w-6 h-6 text-blue-400" /></div>
                                <div>
                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Auto-Link Active</div>
                                    <p className="text-xs text-blue-200">
                                        Move within {selectedCheckpoint.radiusMeters || 20}m to check in.
                                    </p>
                                </div>
                             </div>
                             
                             {/* MANUAL OVERRIDE BUTTON - Now shown if < 80m and started (GPS Drift Fallback) */}
                             {userLocation && selectedCheckpoint.location && getDistanceMeters(userLocation[0], userLocation[1], selectedCheckpoint.location.lat, selectedCheckpoint.location.lng) < 80 && hasStarted && (
                                 <button 
                                    onClick={() => performCheckIn(selectedCheckpoint)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                                 >
                                     <CheckCircle2 className="w-5 h-5" /> 
                                     Checka In Manuellt (Nära)
                                 </button>
                             )}
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};