
import React, { useState, useEffect } from 'react';
import { RaceEvent, WinCondition, CheckpointOrder, TerrainType, StartMode, UserProfile } from '../types';
import { RACE_CATEGORIES, EVENT_TYPES, DEFAULT_COORDINATES } from '../constants';
import { X, ArrowRight, ArrowLeft, Check, Trophy, Timer, Route, Shuffle, Key, FileText, Tag, Flag, Mountain, Trees, Clock, MousePointer2, Languages, PenTool, MapPin, ShieldCheck, Compass } from 'lucide-react';

interface RaceCreationWizardProps {
  onCancel: () => void;
  onComplete: (raceData: Partial<RaceEvent>) => void;
  user?: UserProfile;
}

export const RaceCreationWizard: React.FC<RaceCreationWizardProps> = ({ onCancel, onComplete, user }) => {
  const [step, setStep] = useState(1);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    eventType: 'Lopp',
    language: 'sv',
    winCondition: 'fastest_time' as WinCondition,
    checkpointOrder: 'free' as CheckpointOrder,
    terrainType: 'trail' as TerrainType,
    startMode: 'mass_start' as StartMode,
    manualStartEnabled: true,
    // Default to 24 hours from now to indicate planning mode, user changes this in settings or via "Start Now" button
    startDateTime: new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 16),
    accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    isPublic: false,
    createAsOfficial: false // New field for admin override
  });

  // Attempt to get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.warn("Could not retrieve location for wizard default:", error);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }
  }, []);

  const isStep1Valid = formData.name.length > 0 && formData.description.length > 0;
  const isStep2Valid = formData.category.length > 0;

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  
  const handleFinish = () => {
    // Use detected location or fallback to Stockholm default
    const startLoc = userLocation || DEFAULT_COORDINATES;

    // Prepare Base Data
    const partialData: Partial<RaceEvent> = {
        ...formData,
        id: `race-${Date.now()}`,
        startDateTime: new Date(formData.startDateTime).toISOString(),
        startLocation: startLoc, 
        finishLocation: { ...startLoc, radiusMeters: 50 },
        checkpoints: [],
        results: [],
        rules: [],
        safetyInstructions: [],
        mapStyle: 'google_standard',
        leaderboardMetric: formData.winCondition === 'fastest_time' ? 'Snabbast tid' : 'Flest poäng'
    };

    // If creating as official, override owner props here so App.tsx respects them
    if (formData.createAsOfficial && user?.role === 'admin') {
        partialData.ownerId = 'QUESTER_SYSTEM';
        partialData.ownerName = 'Quester Original';
        partialData.ownerPhotoURL = ''; // Empty string triggers the Compass Icon fallback in UI
        partialData.isPublic = true; // Force public for official events usually
    }

    onComplete(partialData);
  };

  // Helper to determine if the "Annat" input should be shown/active
  const isCustomCategory = formData.category === 'Annat' || (formData.category !== '' && !RACE_CATEGORIES.includes(formData.category));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-950 p-4 animate-in fade-in duration-300">
      {/* Background Graphic */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
         {/* Close Button */}
         <button onClick={onCancel} className="absolute top-6 right-6 text-gray-500 hover:text-white z-20">
            <X className="w-6 h-6" />
         </button>

         {/* Progress Bar */}
         <div className="w-full h-1.5 bg-gray-800 absolute top-0 left-0">
             <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                style={{ width: `${(step / 3) * 100}%` }}
             ></div>
         </div>

         {/* Header */}
         <div className="pt-10 px-8 pb-4 text-center">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-900/30 text-blue-400 font-bold border border-blue-800 mb-4 text-xl shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                 {step}
             </div>
             <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                 {step === 1 ? 'Starta ditt Äventyr' : step === 2 ? 'Regler & Format' : 'Startmetod & Åtkomst'}
             </h2>
             <p className="text-gray-400 text-sm mt-1">
                 {step === 1 ? 'Namn och typ av aktivitet' : step === 2 ? 'Hur vinner man?' : 'Bestäm datum senare i inställningarna'}
             </p>
         </div>

         {/* Body Content */}
         <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
             
             {/* STEP 1: BASICS */}
             {step === 1 && (
                 <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 sm:col-span-1">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vad ska aktiviteten heta?</label>
                             <div className="relative">
                                <Flag className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                                <input 
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="T.ex. Sommarjakten 2025"
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    autoFocus
                                />
                             </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Typ av aktivitet</label>
                             <div className="relative">
                                <Tag className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                                <select 
                                    value={formData.eventType}
                                    onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                >
                                    {EVENT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                             </div>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Språk (AI & Innehåll)</label>
                            <div className="relative">
                                <Languages className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                                <select 
                                    value={formData.language}
                                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="sv">Svenska</option>
                                    <option value="en">English</option>
                                    <option value="de">Deutsch</option>
                                    <option value="es">Español</option>
                                    <option value="fr">Français</option>
                                </select>
                             </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            {/* Location Feedback */}
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Startplats</label>
                            <div className={`w-full border rounded-xl py-3 px-4 flex items-center gap-2 ${userLocation ? 'bg-blue-900/20 border-blue-500/50 text-blue-300' : 'bg-gray-950 border-gray-700 text-gray-500'}`}>
                                <MapPin className="w-5 h-5" />
                                <span className="text-sm">
                                    {userLocation ? 'GPS-position hittad' : 'Hämtar plats... (Standard: Sthlm)'}
                                </span>
                            </div>
                        </div>
                     </div>

                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Beskrivning</label>
                         <div className="relative">
                            <FileText className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                            <textarea 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Beskriv området, syftet och vad deltagarna kan förvänta sig..."
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px] resize-none transition-all"
                            />
                         </div>
                     </div>
                 </div>
             )}

             {/* STEP 2: RULES */}
             {step === 2 && (
                 <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                     {/* Category */}
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Välj Kategori</label>
                        <div className="grid grid-cols-2 gap-3">
                            {RACE_CATEGORIES.map(cat => {
                                // Determine if this specific button should look selected
                                const isSelected = formData.category === cat || (cat === 'Annat' && isCustomCategory);
                                
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setFormData({...formData, category: cat})}
                                        className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${
                                            isSelected
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:border-gray-600'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Custom Category Input */}
                        {isCustomCategory && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Specificera din kategori</label>
                                <div className="relative">
                                    <PenTool className="absolute left-3 top-3.5 text-gray-500 w-4 h-4" />
                                    <input 
                                        type="text"
                                        value={formData.category === 'Annat' ? '' : formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        placeholder="Skriv vad du vill..."
                                        className="w-full bg-gray-950 border border-blue-500/50 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                     </div>

                     {/* Terrain Preference */}
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Terrängtyp</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setFormData({...formData, terrainType: 'trail'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.terrainType === 'trail'
                                    ? 'bg-green-900/30 border-green-500 text-white'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                            >
                                <Route className={`w-6 h-6 mb-2 ${formData.terrainType === 'trail' ? 'text-green-400' : 'text-gray-600'}`} />
                                <span className="text-xs font-bold">Stig / Väg</span>
                                <span className="text-[10px] opacity-70 mt-1">Lättåtkomligt</span>
                            </button>

                            <button
                                onClick={() => setFormData({...formData, terrainType: 'mixed'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.terrainType === 'mixed'
                                    ? 'bg-yellow-900/30 border-yellow-500 text-white'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                            >
                                <Trees className={`w-6 h-6 mb-2 ${formData.terrainType === 'mixed' ? 'text-yellow-400' : 'text-gray-600'}`} />
                                <span className="text-xs font-bold">Blandat</span>
                                <span className="text-[10px] opacity-70 mt-1">Stig & Terräng</span>
                            </button>

                            <button
                                onClick={() => setFormData({...formData, terrainType: 'off_road'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.terrainType === 'off_road'
                                    ? 'bg-red-900/30 border-red-500 text-white'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                            >
                                <Mountain className={`w-6 h-6 mb-2 ${formData.terrainType === 'off_road' ? 'text-red-400' : 'text-gray-600'}`} />
                                <span className="text-xs font-bold">Obanat</span>
                                <span className="text-[10px] opacity-70 mt-1">Djup skog</span>
                            </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        {/* Win Condition */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vinstvillkor</label>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setFormData({...formData, winCondition: 'fastest_time'})}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                        formData.winCondition === 'fastest_time'
                                        ? 'bg-blue-900/20 border-blue-500 text-white'
                                        : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                    }`}
                                >
                                    <Timer className={`w-5 h-5 ${formData.winCondition === 'fastest_time' ? 'text-blue-400' : 'text-gray-600'}`} />
                                    <span className="text-xs font-bold">Snabbast Tid</span>
                                </button>
                                
                                <button
                                    onClick={() => setFormData({...formData, winCondition: 'most_points'})}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                        formData.winCondition === 'most_points'
                                        ? 'bg-yellow-900/20 border-yellow-500 text-white'
                                        : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                    }`}
                                >
                                    <Trophy className={`w-5 h-5 ${formData.winCondition === 'most_points' ? 'text-yellow-400' : 'text-gray-600'}`} />
                                    <span className="text-xs font-bold">Poängjakt</span>
                                </button>
                            </div>
                        </div>

                         {/* Checkpoint Order */}
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Banläggning</label>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => setFormData({...formData, checkpointOrder: 'free'})} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                    formData.checkpointOrder === 'free'
                                    ? 'bg-gray-800 border-gray-600 text-white'
                                    : 'bg-gray-950 border-gray-800 text-gray-500'
                                }`}>
                                    <Shuffle className="w-5 h-5" />
                                    <span className="text-xs font-bold">Fri Ordning</span>
                                </button>

                                <button onClick={() => setFormData({...formData, checkpointOrder: 'sequential'})} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                    formData.checkpointOrder === 'sequential'
                                    ? 'bg-gray-800 border-gray-600 text-white'
                                    : 'bg-gray-950 border-gray-800 text-gray-500'
                                }`}>
                                    <Route className="w-5 h-5" />
                                    <span className="text-xs font-bold">Sekventiell (1-2-3)</span>
                                </button>
                            </div>
                         </div>
                     </div>
                 </div>
             )}

             {/* STEP 3: SETTINGS (Date removed) */}
             {step === 3 && (
                 <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                      
                      {/* START MODE SELECTION */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Hur ska aktiviteten starta?</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setFormData({...formData, startMode: 'mass_start'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.startMode === 'mass_start'
                                    ? 'bg-blue-900/30 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                            >
                                <Clock className={`w-8 h-8 mb-2 ${formData.startMode === 'mass_start' ? 'text-blue-400' : 'text-gray-600'}`} />
                                <span className="text-sm font-bold">Gemensam Start</span>
                                <span className="text-[10px] opacity-70 mt-1 text-center">Alla startar samtidigt från samma plats.</span>
                            </button>

                            <button
                                onClick={() => setFormData({...formData, startMode: 'self_start'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.startMode === 'self_start'
                                    ? 'bg-green-900/30 border-green-500 text-white shadow-lg shadow-green-900/20'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                            >
                                <MousePointer2 className={`w-8 h-8 mb-2 ${formData.startMode === 'self_start' ? 'text-green-400' : 'text-gray-600'}`} />
                                <span className="text-sm font-bold">Fri Start (GPS)</span>
                                <span className="text-[10px] opacity-70 mt-1 text-center">Deltagaren startar själv sin tid vid startpunkten.</span>
                            </button>
                        </div>
                      </div>

                      {/* Manual Start Toggle */}
                      {formData.startMode === 'mass_start' && (
                          <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.manualStartEnabled}
                                            onChange={(e) => setFormData({...formData, manualStartEnabled: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">Tillåt manuell startknapp</div>
                                        <div className="text-xs text-gray-500">Arrangören kan starta loppet när som helst via en knapp</div>
                                    </div>
                                </label>
                          </div>
                      )}

                      <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Accesskod (för deltagare)</label>
                         <div className="relative">
                            <Key className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                value={formData.accessCode}
                                onChange={(e) => setFormData({...formData, accessCode: e.target.value.toUpperCase()})}
                                maxLength={8}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white font-mono uppercase tracking-widest text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                         </div>
                      </div>

                      <div className="pt-4 border-t border-gray-800 space-y-4">
                          <label className="flex items-center justify-between cursor-pointer p-4 bg-gray-950 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
                              <div>
                                  <div className="font-bold text-white mb-1">Publikt Event</div>
                                  <div className="text-xs text-gray-500">Synligt för alla i "Utforska"-vyn</div>
                              </div>
                              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.isPublic ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${formData.isPublic ? 'translate-x-5' : 'translate-x-0'}`}></div>
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={formData.isPublic}
                                onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                              />
                          </label>

                          {/* ADMIN ONLY: OFFICIAL QUESTER EVENT TOGGLE */}
                          {user?.role === 'admin' && (
                              <label className="flex items-center justify-between cursor-pointer p-4 bg-indigo-900/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-900/20 transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-indigo-600 rounded-full">
                                          <ShieldCheck className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                          <div className="font-bold text-indigo-300 mb-1">Skapa som Quester Original</div>
                                          <div className="text-xs text-indigo-400/70">Officiellt event från plattformen</div>
                                      </div>
                                  </div>
                                  <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.createAsOfficial ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${formData.createAsOfficial ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                  </div>
                                  <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={formData.createAsOfficial}
                                    onChange={(e) => setFormData({...formData, createAsOfficial: e.target.checked})}
                                  />
                              </label>
                          )}
                      </div>
                 </div>
             )}
         </div>

         {/* Footer Buttons */}
         <div className="p-6 border-t border-gray-800 flex justify-between items-center bg-gray-900">
             {step > 1 ? (
                 <button 
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                 >
                     <ArrowLeft className="w-4 h-4" /> Tillbaka
                 </button>
             ) : (
                 <div></div> // Spacer
             )}
             
             {step < 3 ? (
                 <button 
                    onClick={handleNext}
                    disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/30"
                 >
                     Nästa <ArrowRight className="w-4 h-4" />
                 </button>
             ) : (
                 <button 
                    onClick={handleFinish}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/30 animate-pulse"
                 >
                     <Check className="w-4 h-4" /> Skapa {formData.eventType}
                 </button>
             )}
         </div>

      </div>
    </div>
  );
};
