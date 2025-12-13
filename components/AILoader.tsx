
import React from 'react';
import { Bot, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';

interface AILoaderProps {
  isVisible: boolean;
  message?: string;
}

export const AILoader: React.FC<AILoaderProps> = ({ isVisible, message = "AI Designar Äventyret..." }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="relative">
        {/* Pulsing effects */}
        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -inset-4 bg-purple-500 rounded-full blur-2xl opacity-10 animate-ping" style={{ animationDuration: '3s' }}></div>
        
        <div className="relative w-24 h-24 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50"></div>
          <Bot className="w-10 h-10 text-white relative z-10 animate-bounce" />
          
          {/* Scanning line effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite] opacity-50"></div>
        </div>
        
        <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-1.5 shadow-lg animate-spin-slow">
            <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h2 className="mt-8 text-2xl font-black text-white tracking-tight flex items-center gap-3">
        {message}
        <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
        </span>
      </h2>
      <p className="text-gray-400 mt-2 font-medium text-sm max-w-xs text-center">
        Analyserar terräng, skapar frågor och placerar ut checkpoints.
      </p>

      <div className="mt-8 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-500 border border-gray-800 bg-gray-900/50 px-4 py-2 rounded-full">
         <BrainCircuit className="w-4 h-4 text-purple-500" />
         Bearbetar data
      </div>
    </div>
  );
};
