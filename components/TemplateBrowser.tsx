
import React, { useState } from 'react';
import { RaceEvent, Checkpoint } from '../types';
import { OFFICIAL_TEMPLATES } from '../constants';
import { Compass, Clock, MapPin, Trophy, Users, ArrowRight, Loader2, Target, X } from 'lucide-react';
import { GeminiService } from '../services/gemini';

interface TemplateBrowserProps {
  onUseTemplate: (template: RaceEvent, location: { lat: number, lng: number }) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const TemplateBrowser: React.FC<TemplateBrowserProps> = ({ onUseTemplate, onCancel, isProcessing }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<RaceEvent | null>(null);
  const [locationStep, setLocationStep] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleSelect = (template: RaceEvent) => {
    setSelectedTemplate(template);
    setLocationStep(true);
  };

  const handleGetLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setLoadingLocation(false);
          // Auto-proceed if template selected
          if (selectedTemplate) {
              onUseTemplate(selectedTemplate, loc);
          }
        },
        (err) => {
          console.error(err);
          setLocationError("Kunde inte hämta plats. Kontrollera behörigheter.");
          setLoadingLocation(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
        setLocationError("GPS stöds ej av din webbläsare.");
        setLoadingLocation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-950 p-4 animate-in fade-in duration-300">
        
        {/* Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none"></div>

        {/* Modal Container */}
        <div className="w-full max-w-5xl h-[85vh] bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
            
            {/* Close */}
            <button onClick={onCancel} className="absolute top-6 right-6 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white z-50">
                <X className="w-5 h-5" />
            </button>

            {/* Content */}
            {isProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="relative w-24 h-24 mb-8">
                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                        <div className="absolute inset-2 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Compass className="w-8 h-8 text-blue-400 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">AI-Arkitekten Arbetar</h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Anpassar <span className="text-blue-400 font-bold">{selectedTemplate?.name}</span> efter din omgivning. 
                        Placerar ut checkpoints, anpassar terräng och kalibrerar GPS.
                    </p>
                </div>
            ) : locationStep && selectedTemplate ? (
                /* LOCATION STEP */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in slide-in-from-right-8 duration-300">
                    <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
                        <MapPin className="w-10 h-10 text-blue-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">Var vill du starta?</h2>
                    <p className="text-gray-400 mb-8 max-w-md">
                        För att vi ska kunna rita upp banan behöver vi veta var du befinner dig.
                        AI:n kommer att placera ut checkpoints i närheten av din startposition.
                    </p>

                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button 
                            onClick={handleGetLocation}
                            disabled={loadingLocation}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            {loadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                            {loadingLocation ? 'Söker satelliter...' : 'Använd min GPS'}
                        </button>
                        
                        {locationError && (
                            <div className="text-red-400 text-sm font-bold bg-red-900/20 p-2 rounded border border-red-900/50">
                                {locationError}
                            </div>
                        )}
                        
                        <button onClick={() => setLocationStep(false)} className="text-sm text-gray-500 hover:text-white mt-2">
                            Avbryt och välj annan mall
                        </button>
                    </div>
                </div>
            ) : (
                /* BROWSER STEP */
                <div className="flex flex-col h-full">
                    <div className="p-8 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-10">
                        <h1 className="text-3xl font-black text-white mb-2">Äventyrsbiblioteket</h1>
                        <p className="text-gray-400">Välj en färdig mall och låt AI anpassa den till din plats.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {OFFICIAL_TEMPLATES.map(template => (
                                <div 
                                    key={template.id}
                                    className="group bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                                >
                                    {/* Cover */}
                                    <div className="h-40 bg-gray-700 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-80 z-10"></div>
                                        {template.coverImage ? (
                                            <img src={template.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                                                <Compass className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-3 left-4 z-20">
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-1 rounded shadow">
                                                {template.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                            {template.name}
                                        </h3>
                                        <p className="text-sm text-gray-400 mb-6 line-clamp-3 leading-relaxed">
                                            {template.description}
                                        </p>

                                        <div className="mt-auto grid grid-cols-2 gap-2 text-xs text-gray-300 font-medium mb-6">
                                            <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                                                <MapPin className="w-3.5 h-3.5 text-green-400" />
                                                {template.checkpoints.length} Checkpoints
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                                                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                                                ~45-60 min
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                                                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                                                {template.winCondition === 'most_points' ? 'Poängjakt' : 'Tid'}
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                                                <Users className="w-3.5 h-3.5 text-blue-400" />
                                                Familj / Lag
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleSelect(template)}
                                            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-white hover:text-black text-white font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            Använd Mall <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
