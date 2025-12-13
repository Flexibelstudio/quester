
import React, { useMemo } from 'react';
import { RaceEvent, ParticipantResult } from '../types';
import { X, Trophy, Medal, Clock, Star, Crown } from 'lucide-react';

interface EventLeaderboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: RaceEvent | null;
}

export const EventLeaderboardDialog: React.FC<EventLeaderboardDialogProps> = ({ isOpen, onClose, event }) => {
  if (!isOpen || !event) return null;

  const sortedResults = useMemo(() => {
    const results = [...(event.results || [])];
    return results.sort((a, b) => {
        // Handle DNF/Running -> Put them last
        if (a.status !== 'finished' && b.status === 'finished') return 1;
        if (a.status === 'finished' && b.status !== 'finished') return -1;

        if (event.winCondition === 'most_points') {
            // Sort by Points DESC, then Time ASC
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return a.finishTime.localeCompare(b.finishTime);
        } else {
            // Sort by Time ASC, then Points DESC
            if (a.finishTime !== b.finishTime) return a.finishTime.localeCompare(b.finishTime);
            return b.totalPoints - a.totalPoints;
        }
    });
  }, [event]);

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border-t sm:border border-gray-700 w-full max-w-md h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-b from-blue-900/20 to-gray-900 border-b border-gray-800 flex justify-between items-start shrink-0">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Topplista</span>
                </div>
                <h2 className="text-2xl font-black text-white leading-tight">{event.name}</h2>
                <p className="text-sm text-gray-400 mt-1">
                    {event.winCondition === 'most_points' ? 'Sorterat på poäng' : 'Sorterat på tid'}
                </p>
            </div>
            <button 
                onClick={onClose}
                className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {sortedResults.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <Medal className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Inga resultat registrerade ännu.</p>
                </div>
            )}

            {sortedResults.map((res, index) => {
                const isFinished = res.status === 'finished';
                let rankStyle = "bg-gray-800 border-gray-700 text-gray-400";
                let rankIcon = <span className="font-mono font-bold text-lg">{index + 1}</span>;

                if (isFinished) {
                    if (index === 0) {
                        rankStyle = "bg-yellow-900/20 border-yellow-500/50 text-yellow-500";
                        rankIcon = <Crown className="w-6 h-6 fill-yellow-500" />;
                    } else if (index === 1) {
                        rankStyle = "bg-slate-700/30 border-slate-400/50 text-slate-300";
                        rankIcon = <Medal className="w-6 h-6 text-slate-300" />;
                    } else if (index === 2) {
                        rankStyle = "bg-orange-900/20 border-orange-600/50 text-orange-400";
                        rankIcon = <Medal className="w-6 h-6 text-orange-600" />;
                    }
                }

                return (
                    <div 
                        key={res.id} 
                        className={`flex items-center p-3 rounded-xl border ${rankStyle} ${!isFinished ? 'opacity-60' : ''}`}
                    >
                        <div className="w-10 flex justify-center shrink-0">
                            {rankIcon}
                        </div>
                        
                        <div className="flex items-center gap-3 flex-1 min-w-0 px-2">
                            <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden shrink-0">
                                {res.profileImage ? (
                                    <img src={res.profileImage} alt={res.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                        {res.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="truncate">
                                <div className="font-bold text-white text-sm truncate">{res.name}</div>
                                {res.teamName && <div className="text-xs text-gray-500 truncate">{res.teamName}</div>}
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            {isFinished ? (
                                <>
                                    <div className="font-mono font-bold text-white text-lg leading-none">
                                        {event.winCondition === 'most_points' ? res.totalPoints : res.finishTime}
                                    </div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">
                                        {event.winCondition === 'most_points' ? 'Poäng' : 'Tid'}
                                    </div>
                                </>
                            ) : (
                                <span className="text-xs font-bold bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                    {res.status === 'dnf' ? 'DNF' : 'LÖPER'}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};
