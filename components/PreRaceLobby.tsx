
import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Volume2, ShieldCheck, Zap, Users, Radio, Snowflake, Bell, Gift, TriangleAlert } from 'lucide-react';
import { RaceEvent } from '../types';
import { SnowfallOverlay } from './SnowfallOverlay';

interface PreRaceLobbyProps {
    raceData: RaceEvent;
    onReady: () => void; // Called when countdown finishes or manual start
    teamName: string;
}

export const PreRaceLobby: React.FC<PreRaceLobbyProps> = ({ raceData, onReady, teamName }) => {
    const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [checks, setChecks] = useState({ gps: false, audio: false });

    // Tech Check on Mount
    useEffect(() => {
        // Check GPS permissions
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                () => setChecks(prev => ({ ...prev, gps: true })),
                () => setChecks(prev => ({ ...prev, gps: false }))
            );
        }
        // Audio check is user-initiated usually, but we assume true for lobby visual
        setChecks(prev => ({ ...prev, audio: true }));
    }, []);

    // Countdown Timer Logic
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const start = new Date(raceData.startDateTime).getTime();
            const diff = start - now;

            if (diff <= 0) {
                // If manual start is enabled, we wait for the signal (which sets start time to NOW)
                // If it's a fixed time start, we auto-start
                if (raceData.startMode !== 'mass_start' || !raceData.manualStartEnabled) {
                    onReady();
                } else {
                    setTimeLeft("VÄNTAR PÅ START");
                }
            } else {
                setIsCountingDown(true);
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [raceData.startDateTime, onReady]);

    const isZombie = raceData.category === 'Survival Run';
    const isXmas = raceData.category === 'Christmas Hunt';

    // THEME CONFIGURATION
    const theme = isXmas ? {
        bg: 'bg-gradient-to-b from-sky-300 via-sky-100 to-white',
        text: 'text-slate-800',
        subText: 'text-slate-600',
        accent: 'text-red-600',
        timerColor: 'text-sky-700',
        cardBg: 'bg-white/60 border-sky-200',
        iconGps: <Gift className="w-6 h-6 text-red-500" />,
        iconAudio: <Bell className="w-6 h-6 text-yellow-500" />,
        gpsLabel: 'Släden Redo',
        audioLabel: 'Bjällror Hörbara'
    } : isZombie ? {
        bg: 'bg-red-950',
        text: 'text-white',
        subText: 'text-white/60',
        accent: 'text-red-500',
        timerColor: 'text-white',
        cardBg: 'bg-red-900/50 border-red-500',
        iconGps: <MapPin className="w-6 h-6 text-red-400" />,
        iconAudio: <Volume2 className="w-6 h-6 text-gray-300" />,
        gpsLabel: 'GPS Redo',
        audioLabel: 'Ljud På'
    } : {
        bg: 'bg-slate-900',
        text: 'text-white',
        subText: 'text-white/60',
        accent: 'text-blue-500',
        timerColor: 'text-white',
        cardBg: 'bg-gray-800/50 border-gray-700',
        iconGps: <MapPin className="w-6 h-6 text-green-400" />,
        iconAudio: <Volume2 className="w-6 h-6 text-gray-300" />,
        gpsLabel: 'GPS Redo',
        audioLabel: 'Ljud På'
    };

    return (
        <div className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center p-6 text-center overflow-hidden ${theme.bg} ${theme.text}`}>
            
            {/* Background Effects */}
            {isXmas ? (
                <SnowfallOverlay intensity="normal" />
            ) : (
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent opacity-10 animate-pulse"></div>
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-md w-full flex flex-col items-center">
                
                {/* Event Badge */}
                <div className={`mb-8 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] border backdrop-blur-md shadow-lg ${isXmas ? 'bg-white/80 border-sky-300 text-sky-700' : isZombie ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-blue-900/50 border-blue-500 text-blue-200'}`}>
                    {raceData.category.toUpperCase()}
                </div>

                <h1 className={`text-4xl md:text-6xl font-black mb-2 tracking-tighter drop-shadow-sm ${theme.text}`}>
                    {raceData.name}
                </h1>
                
                {isZombie && (
                    <div className="mt-2 mb-4 bg-red-900/30 border border-red-500/30 p-3 rounded-lg max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest mb-1">
                            <TriangleAlert className="w-4 h-4" /> Varning
                        </div>
                        <p className="text-red-200 text-xs leading-relaxed">
                            Detta spel innehåller plötsliga ljud (jump scares) och stressmoment. Spela inte i trafiken.
                        </p>
                    </div>
                )}

                <p className={`${theme.subText} font-medium mb-12`}>
                    Välkommen, <span className={`font-bold ${theme.accent}`}>{teamName}</span>
                </p>

                {/* The Timer */}
                <div className="mb-12 relative">
                    {!isXmas && <div className={`absolute -inset-4 rounded-full blur-2xl opacity-20 ${isZombie ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`}></div>}
                    <div className={`text-7xl md:text-8xl font-mono font-black tabular-nums tracking-tight relative z-10 drop-shadow-md ${theme.timerColor}`}>
                        {timeLeft}
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-widest mt-2 ${theme.subText}`}>
                        {isCountingDown ? 'Tid till start' : 'Status'}
                    </div>
                </div>

                {/* Tech Checks */}
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-colors shadow-sm ${checks.gps ? (isXmas ? 'bg-white/80 border-green-400 text-green-700' : 'bg-green-900/20 border-green-500/30 text-green-400') : theme.cardBg}`}>
                        {theme.iconGps}
                        <span className="text-xs font-bold uppercase">{checks.gps ? theme.gpsLabel : 'Söker GPS...'}</span>
                    </div>
                    <div className={`p-4 rounded-2xl border flex flex-col items-center gap-2 shadow-sm ${theme.cardBg}`}>
                        {theme.iconAudio}
                        <span className="text-xs font-bold uppercase">{theme.audioLabel}</span>
                    </div>
                </div>

                {/* Waiting Animation */}
                <div className={`flex items-center gap-2 text-sm animate-pulse ${theme.subText}`}>
                    {isXmas ? <Snowflake className="w-4 h-4 text-sky-400" /> : <Radio className="w-4 h-4" />}
                    <span>{isXmas ? 'Värmer upp chokladen...' : 'Inväntar startsignal från HQ...'}</span>
                </div>

                {/* Manual Override (For Self-Start modes that haven't triggered yet) */}
                {raceData.startMode === 'self_start' && (
                    <button 
                        onClick={onReady}
                        className={`mt-8 w-full py-4 font-black text-lg rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 ${isXmas ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-white text-black'}`}
                    >
                        <Zap className={`w-5 h-5 ${isXmas ? 'fill-white' : 'fill-black'}`} /> STARTA NU
                    </button>
                )}
            </div>
        </div>
    );
};
