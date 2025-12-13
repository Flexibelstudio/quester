
import React, { useState, useEffect } from 'react';
import { RaceEvent } from '../types';
import { List, MapPin, ShieldAlert, Trophy, Timer, Target, Clock, Trash2, Tag, HelpCircle, Zap, Edit2, CalendarClock, Globe, MousePointer2, CheckCircle2, AlertTriangle, Layers, Eye, X } from 'lucide-react';

interface DataPanelProps {
  raceData: RaceEvent;
  onDeleteCheckpoint: (id: string) => void;
  onEditCheckpoint: (id: string) => void;
  activeTab?: 'overview' | 'content';
  onTabChange?: (tab: 'overview' | 'content') => void;
  onClose?: () => void;
}

export const DataPanel: React.FC<DataPanelProps> = ({ raceData, onDeleteCheckpoint, onEditCheckpoint, activeTab = 'overview', onTabChange, onClose }) => {
  const [internalTab, setInternalTab] = useState<'overview' | 'content'>('overview');
  
  // Allow parent to control tab, but maintain local state if prop not provided/changed
  useEffect(() => {
    if (activeTab) setInternalTab(activeTab);
  }, [activeTab]);

  const handleTabClick = (tab: 'overview' | 'content') => {
      setInternalTab(tab);
      if (onTabChange) onTabChange(tab);
  };

  const [timeDisplay, setTimeDisplay] = useState<{label: string, time: string, status: 'upcoming' | 'active' | 'finished'}>({ 
      label: 'Laddar...', time: '--:--:--', status: 'upcoming' 
  });

  useEffect(() => {
    const updateTimer = () => {
        const now = new Date();
        const start = new Date(raceData.startDateTime);
        const diff = start.getTime() - now.getTime();
        
        // Handle Self Start specific logic
        if (raceData.startMode === 'self_start') {
            if (diff > 0) {
                // Course opens in future
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeDisplay({
                    label: 'BANAN ÖPPNAR OM',
                    time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                    status: 'upcoming'
                });
            } else {
                // Course is open
                setTimeDisplay({
                    label: 'STATUS',
                    time: 'ÖPPEN FÖR START',
                    status: 'active'
                });
            }
        } else {
            // Mass Start Logic
            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeDisplay({
                    label: 'STARTAR OM',
                    time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                    status: 'upcoming'
                });
            } else {
                const elapsed = Math.abs(diff);
                const hours = Math.floor(elapsed / (1000 * 60 * 60));
                const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
                setTimeDisplay({
                    label: 'RACE TID',
                    time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                    status: 'active'
                });
            }
        }
    };

    updateTimer(); // Run immediately
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [raceData.startDateTime, raceData.startMode]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-gray-900 md:bg-transparent">
      
      {/* Tabs Header */}
      <div className="flex border-b border-gray-700 bg-gray-900 shrink-0">
          <button 
            onClick={() => handleTabClick('overview')}
            className={`flex-1 py-4 md:py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${internalTab === 'overview' ? 'text-white border-b-2 border-blue-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <List className="w-4 h-4" /> Översikt
          </button>
          <button 
            onClick={() => handleTabClick('content')}
            className={`flex-1 py-4 md:py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${internalTab === 'content' ? 'text-white border-b-2 border-purple-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <Layers className="w-4 h-4" /> Innehåll
          </button>
          
          {onClose && (
            <button 
                onClick={onClose}
                className="w-12 flex items-center justify-center border-l border-gray-800 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                title="Stäng panel"
            >
                <X className="w-5 h-5" />
            </button>
          )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar bg-gray-800/50 md:bg-gray-800 overscroll-contain pb-24 md:pb-4 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        
        {/* --- OVERVIEW TAB --- */}
        {internalTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Race Timer / Status Display */}
                <div className={`text-center p-4 rounded-xl border-2 shadow-inner ${
                    timeDisplay.status === 'upcoming' 
                    ? 'bg-gray-900 border-gray-700' 
                    : 'bg-green-900/20 border-green-600/50'
                }`}>
                    <div className={`text-[10px] uppercase font-bold tracking-[0.2em] mb-1 ${
                        timeDisplay.status === 'upcoming' ? 'text-gray-500' : 'text-green-400 animate-pulse'
                    }`}>
                        {timeDisplay.label}
                    </div>
                    <div className={`font-mono font-black tracking-tight ${
                        timeDisplay.time === 'ÖPPEN FÖR START' ? 'text-xl md:text-2xl' : 'text-3xl'
                    } ${
                        timeDisplay.status === 'upcoming' ? 'text-white' : 'text-green-400'
                    }`}>
                        {timeDisplay.time}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-2 font-mono">
                        {raceData.startMode === 'self_start' ? 'Banan öppnar:' : 'Start:'} {new Date(raceData.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>

                <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white leading-tight">{raceData.name}</h3>
                        {raceData.category && (
                            <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-[10px] uppercase font-bold tracking-wide rounded border border-gray-600 shrink-0 whitespace-nowrap">
                                {raceData.category}
                            </span>
                        )}
                    </div>
                    <p className="text-gray-400 text-sm whitespace-pre-wrap">{raceData.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-xs text-gray-500 uppercase">Start</div>
                        <div className="font-mono text-sm text-green-400">
                            {raceData.startLocation.lat.toFixed(4)}, {raceData.startLocation.lng.toFixed(4)}
                        </div>
                    </div>
                    <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-xs text-gray-500 uppercase">Mål</div>
                        <div className="font-mono text-sm text-red-400">
                            {raceData.finishLocation.lat.toFixed(4)}, {raceData.finishLocation.lng.toFixed(4)}
                        </div>
                    </div>
                </div>

                {/* Simplified List for Overview */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center justify-between">
                        <span className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-blue-400" /> Checkpoints ({raceData.checkpoints.length})</span>
                        <button onClick={() => handleTabClick('content')} className="text-xs text-blue-400 hover:text-white">Visa Detaljer &rarr;</button>
                    </h4>
                    <ul className="space-y-2">
                        {raceData.checkpoints.map(cp => {
                            const isMandatory = cp.type === 'mandatory';
                            const displayColor = cp.color || (isMandatory ? '#3b82f6' : '#9B59B6');

                            return (
                                <li key={cp.id} className="bg-gray-700/50 p-2 rounded text-sm flex items-center justify-between group">
                                    <div className="flex items-center gap-2">
                                        <span 
                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                                            style={{ backgroundColor: displayColor }}
                                        ></span>
                                        <span className="font-medium text-gray-200 truncate max-w-[150px]">{cp.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {(cp.quiz || cp.challenge) && <Zap className="w-3 h-3 text-yellow-500" />}
                                        <button 
                                            onClick={() => onEditCheckpoint(cp.id)}
                                            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        )}

        {/* --- CONTENT & MISSION TAB --- */}
        {internalTab === 'content' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Uppdrag & Frågor</h3>
                    <span className="text-xs text-gray-500">{raceData.checkpoints.filter(c => c.quiz || c.challenge).length} av {raceData.checkpoints.length} aktiva</span>
                </div>

                {raceData.checkpoints.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-xl">
                        <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Inga checkpoints skapade än.</p>
                    </div>
                )}

                {raceData.checkpoints.map((cp, idx) => {
                    const hasQuiz = !!cp.quiz;
                    const hasChallenge = !!cp.challenge;
                    const isInteraction = hasQuiz || hasChallenge;
                    const displayColor = cp.color || (cp.type === 'mandatory' ? '#3b82f6' : '#9B59B6');

                    return (
                        <div key={cp.id} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-sm group">
                            {/* Header */}
                            <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ backgroundColor: displayColor }}>
                                        {idx + 1}
                                    </div>
                                    <span className="font-bold text-gray-200 text-sm">{cp.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {cp.points && (
                                        <span className="text-[10px] font-bold text-yellow-500 bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-900/50">
                                            {cp.points}p
                                        </span>
                                    )}
                                    <button 
                                        onClick={() => onEditCheckpoint(cp.id)}
                                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                        title="Redigera"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                     <button 
                                        onClick={() => onDeleteCheckpoint(cp.id)}
                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                                        title="Ta bort"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Body Content */}
                            <div className="p-4 bg-gray-800/50">
                                {hasQuiz && cp.quiz && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-purple-300 bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-800 flex items-center gap-1">
                                                <HelpCircle className="w-3 h-3" /> QUIZ
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-white leading-relaxed">
                                            {cp.quiz.question}
                                        </p>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {cp.quiz.options.map((opt, i) => (
                                                <div 
                                                    key={i} 
                                                    className={`px-3 py-2 rounded text-xs flex items-center justify-between border ${
                                                        i === cp.quiz!.correctOptionIndex 
                                                        ? 'bg-green-900/20 border-green-800 text-green-300' 
                                                        : 'bg-gray-800 border-gray-700 text-gray-400'
                                                    }`}
                                                >
                                                    <span>{opt}</span>
                                                    {i === cp.quiz!.correctOptionIndex && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {hasChallenge && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-orange-300 bg-orange-900/30 px-1.5 py-0.5 rounded border border-orange-800 flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> UTMANING
                                            </span>
                                            {cp.requiresPhoto && (
                                                <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-800 flex items-center gap-1">
                                                    <Eye className="w-3 h-3" /> KRÄVER BILD
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-200 italic border-l-2 border-orange-500 pl-3 py-1">
                                            "{cp.challenge}"
                                        </p>
                                    </div>
                                )}

                                {!isInteraction && (
                                    <div className="flex items-center gap-2 text-gray-500 text-xs italic">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>Bara incheckning (Ingen aktivitet)</span>
                                    </div>
                                )}
                                
                                {cp.description && !isInteraction && (
                                     <p className="text-xs text-gray-400 mt-2">{cp.description}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

      </div>
    </div>
  );
};
