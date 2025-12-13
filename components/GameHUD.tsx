
import React, { memo } from 'react';
import { Settings, Volume2, VolumeX, Radar, Flame, Thermometer, ShieldCheck, Snowflake, Heart, HeartCrack, Clock, Gift } from 'lucide-react';

interface GameHUDProps {
    mode: 'normal' | 'zombie' | 'christmas';
    teamName: string;
    profileImage?: string;
    totalPoints: number;
    elapsedString: string;
    hasStarted: boolean;
    // Zombie Props
    lives?: number;
    nearestZombieDistance?: number | null;
    flares?: number;
    radioPartsFound?: number;
    toxicCloud?: any;
    onUseFlare?: () => void;
    // Christmas Props
    warmth?: number;
    isAtHeatSource?: boolean;
    bagCount?: number;
    bagCapacity?: number;
    nearestGrinchDistance?: number | null;
    // Common
    onOpenMenu: () => void;
}

export const GameHUD = memo<GameHUDProps>(({
    mode, teamName, profileImage, totalPoints, elapsedString, hasStarted,
    lives, nearestZombieDistance, flares, radioPartsFound, toxicCloud, onUseFlare,
    warmth = 100, isAtHeatSource, bagCount = 0, bagCapacity = 3, nearestGrinchDistance,
    onOpenMenu
}) => {

    const avatarUrl = profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teamName}`;

    // --- CHRISTMAS HUD ---
    if (mode === 'christmas') {
        return (
            <>
                <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none safe-area-top">
                    <div className="flex justify-between items-start mt-12">
                        <div className="flex flex-col gap-2 pointer-events-auto">
                            <div className="flex items-center gap-3 bg-slate-900/90 border border-green-500/50 rounded-full pr-6 pl-1 py-1 shadow-[0_0_15px_rgba(22,163,74,0.3)]">
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-600">
                                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="text-[10px] font-black text-yellow-400 tracking-wider uppercase">Tomtenisse</div>
                                    <div className="text-sm font-bold text-white font-mono leading-none">{teamName}</div>
                                </div>
                            </div>
                            
                            {/* Warmth Bar */}
                            <div className="pl-1 mt-1">
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
                                        <div 
                                            className={`h-full transition-all duration-500 relative z-10 ${warmth < 20 ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_blue]' : isAtHeatSource ? 'bg-gradient-to-r from-orange-600 via-orange-400 to-yellow-300' : 'bg-orange-500'}`} 
                                            style={{ width: `${warmth}%` }}
                                        ></div>
                                    </div>
                                    {isAtHeatSource && (
                                        <Flame className="w-4 h-4 text-orange-500 animate-bounce drop-shadow-[0_0_5px_rgba(249,115,22,0.8)] absolute -right-5" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 pointer-events-auto">
                            <div className="flex items-start gap-2">
                                <div className="bg-red-900/90 border border-red-500/50 rounded-xl p-2 min-w-[80px] text-center shadow-[0_0_20px_rgba(220,38,38,0.3)] backdrop-blur">
                                    <div className="text-2xl font-black text-yellow-400 leading-none font-mono drop-shadow-md">{totalPoints}</div>
                                    <div className="text-[9px] font-bold text-red-200 uppercase tracking-widest">POÄNG</div>
                                </div>
                                <button onClick={onOpenMenu} className="p-3 bg-slate-900/80 border border-white/10 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg h-[58px] w-[58px] flex items-center justify-center">
                                    <Settings className="w-6 h-6" />
                                </button>
                            </div>
                            
                            {/* Inventory */}
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

                {/* Bottom Radar (Grinch) */}
                {nearestGrinchDistance !== null && (
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
            </>
        );
    }

    // --- ZOMBIE HUD ---
    if (mode === 'zombie') {
        return (
            <>
                <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none safe-area-top">
                    <div className="flex justify-between items-start mt-12">
                        <div className="flex flex-col gap-2 pointer-events-auto">
                            <div className="flex items-center gap-3 bg-black/90 border border-green-500/30 rounded-full pr-6 pl-1 py-1 shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-green-900">
                                    <img src={avatarUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="text-[10px] font-black text-red-500 tracking-wider">QUESTER</div>
                                    <div className="text-sm font-bold text-green-400 font-mono leading-none">{teamName}</div>
                                </div>
                            </div>
                            {hasStarted && (
                                <div className="bg-black/90 border border-green-500/50 text-green-400 font-mono text-sm px-4 py-1 rounded-full w-fit flex items-center gap-2 shadow-lg">
                                    <Clock className="w-3 h-3" />{elapsedString}
                                </div>
                            )}
                            <div className="flex items-center gap-1 pl-1">
                                {Array.from({length: 3}).map((_, i) => (
                                    <div key={i} className="transition-all duration-300">
                                        {i < (lives || 0) ? (
                                            <Heart className="w-6 h-6 text-red-600 fill-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)] animate-pulse" />
                                        ) : (
                                            <HeartCrack className="w-6 h-6 text-gray-800" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-start gap-2 pointer-events-auto">
                            <div className="bg-black/90 border border-red-600/50 rounded-xl p-2 min-w-[80px] text-center shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                                <div className="text-2xl font-black text-red-500 leading-none font-mono">{totalPoints}</div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">POÄNG</div>
                            </div>
                            <button onClick={onOpenMenu} className="p-3 bg-red-950/80 border border-red-900 text-red-500 rounded-xl hover:bg-red-900 transition-colors shadow-lg h-[58px] w-[58px] flex items-center justify-center">
                                <Settings className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Tools (Flare / Radar) */}
                <div className="absolute bottom-24 left-2 right-2 z-[2000] pointer-events-auto flex flex-col items-center">
                    {nearestZombieDistance !== null && (
                        <div className="relative z-20 mb-[-12px] w-[240px] md:w-[300px]">
                            <div className={`backdrop-blur-md px-4 py-3 rounded-t-3xl border-t-2 border-x-2 shadow-[0_-5px_20px_rgba(0,0,0,0.8)] flex flex-col items-center transition-colors relative overflow-hidden bg-black/90 ${nearestZombieDistance < 20 ? 'border-red-600' : nearestZombieDistance < 50 ? 'border-yellow-600' : 'border-green-800'}`}>
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
                    
                    <div className="w-full max-w-md bg-black/95 border-2 border-gray-800 rounded-3xl p-3 shadow-2xl relative z-10 flex items-center justify-between gap-2 backdrop-blur-xl">
                        <button 
                            onClick={onUseFlare} 
                            disabled={(flares || 0) <= 0} 
                            className={`flex flex-col items-center justify-center h-16 w-20 rounded-2xl transition-all border-2 active:scale-95 ${(flares || 0) > 0 ? 'bg-red-900/30 text-white border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:bg-red-900/50' : 'bg-gray-900 border-gray-800 text-gray-700'}`}
                        >
                            <Flame className={`w-6 h-6 mb-1 ${(flares || 0) > 0 ? 'text-orange-500 animate-pulse' : ''}`} />
                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">FLARE</span>
                            <div className="absolute -top-2 -right-2 bg-gray-800 text-orange-500 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-gray-700 shadow-md">
                                {flares || 0}
                            </div>
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // --- NORMAL MODE ---
    return (
        <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none safe-area-top">
            <div className="flex justify-between items-start mt-12">
                <div className="flex flex-col gap-2 pointer-events-auto mt-2">
                    <div className="backdrop-blur-md rounded-full pl-1 pr-4 py-1 flex items-center gap-3 border shadow-lg bg-slate-900/80 border-white/10">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            <img src={avatarUrl} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase text-gray-400">Quester</div>
                            <div className="text-sm font-bold leading-none text-white">{teamName}</div>
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
                    <button onClick={onOpenMenu} className="p-3 rounded-2xl transition-all duration-200 group flex items-center justify-center shadow-lg w-[58px] h-[58px] bg-slate-900/80 text-white border border-white/10 hover:bg-slate-800">
                        <Settings className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
});
