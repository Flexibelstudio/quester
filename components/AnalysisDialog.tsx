import React from 'react';
import { RaceAnalysis } from '../types';
import { X, CheckCircle, AlertTriangle, Lightbulb, Activity, ShieldCheck, PartyPopper } from 'lucide-react';

interface AnalysisDialogProps {
  analysis: RaceAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

const ScoreRing: React.FC<{ score: number; label: string; icon: React.ReactNode; color: string }> = ({ score, label, icon, color }) => {
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-2">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                    <circle 
                        cx="48" cy="48" r="40" 
                        stroke={color} 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={offset} 
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-black text-white">{score}</span>
                    <span className="text-[10px] text-gray-400 uppercase">%</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-300">
                {icon} {label}
            </div>
        </div>
    );
};

export const AnalysisDialog: React.FC<AnalysisDialogProps> = ({ analysis, isOpen, onClose }) => {
  if (!isOpen || !analysis) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-500" /> Race Analysis Report
                </h2>
                <p className="text-gray-400 mt-1">AI-generated quality review</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* Scores */}
            <div className="flex justify-around items-center mb-10 bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
                <ScoreRing score={analysis.overallScore} label="Total Kvalité" icon={<Activity className="w-4 h-4"/>} color="#3b82f6" />
                <ScoreRing score={analysis.safetyScore} label="Säkerhet" icon={<ShieldCheck className="w-4 h-4"/>} color="#10b981" />
                <ScoreRing score={analysis.funFactorScore} label="Fun Factor" icon={<PartyPopper className="w-4 h-4"/>} color="#f59e0b" />
            </div>

            {/* Summary */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Sammanfattning</h3>
                <p className="text-lg text-gray-200 leading-relaxed bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 italic">
                    "{analysis.summary}"
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Strengths */}
                <div className="bg-gray-800/30 rounded-xl p-5 border border-green-900/30">
                    <h3 className="text-green-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Styrkor
                    </h3>
                    <ul className="space-y-3">
                        {analysis.strengths.map((item, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-gray-800/30 rounded-xl p-5 border border-red-900/30">
                    <h3 className="text-red-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Risker & Svagheter
                    </h3>
                    <ul className="space-y-3">
                        {analysis.weaknesses.map((item, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Suggestions */}
                <div className="bg-gray-800/30 rounded-xl p-5 border border-blue-900/30">
                    <h3 className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> Förslag
                    </h3>
                    <ul className="space-y-3">
                        {analysis.suggestions.map((item, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};