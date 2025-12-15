
import React, { useState, useEffect, useRef } from 'react';
import { RaceEvent, WinCondition, CheckpointOrder, TerrainType, StartMode, UserProfile, ScoreModel, LeaderboardMode } from '../types';
import { RACE_CATEGORIES, EVENT_TYPES, DEFAULT_COORDINATES } from '../constants';
import { X, ArrowRight, ArrowLeft, Check, Trophy, Timer, Route, Shuffle, Key, FileText, Tag, Flag, Mountain, Trees, Clock, MousePointer2, Languages, PenTool, MapPin, ShieldCheck, Compass, Info, Eye, EyeOff, ChevronDown, CheckCircle2, Lock, Globe, Users, Loader2 } from 'lucide-react';

interface RaceCreationWizardProps {
  onCancel: () => void;
  onComplete: (raceData: Partial<RaceEvent>) => void;
  user?: UserProfile;
}

export const RaceCreationWizard: React.FC<RaceCreationWizardProps> = ({ onCancel, onComplete, user }) => {
  const [step, setStep] = useState(1);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '', 
    eventType: 'Lopp',
    language: 'sv',
    startCity: '',
    
    // Logic Settings (Controlled by Archetype in Step 2)
    winCondition: 'fastest_time' as WinCondition,
    checkpointOrder: 'sequential' as CheckpointOrder,
    scoreModel: 'basic' as ScoreModel,
    timeLimitMinutes: 60, // Default for Rogaining
    
    // Other Settings
    terrainType: 'trail' as TerrainType,
    startMode: 'mass_start' as StartMode,
    manualStartEnabled: true,
    leaderboardMode: 'global' as LeaderboardMode,
    
    // Default to 24 hours from now to indicate planning mode
    startDateTime: new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 16),
    accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    isPublic: false,
    createAsOfficial: false 
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

  // Scroll to top when changing steps
  useEffect(() => {
    if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const isStep1Valid = formData.name.length > 0 && formData.description.length > 0 && formData.category.length > 0;
  // Step 2 is always valid as it has defaults, but we ensure logic is sound
  const isStep2Valid = true;

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  
  const handleFinish = async () => {
    setIsGeocoding(true);

    // 1. Determine Start Location
    // Priority: GPS -> Text Input Geocode -> Default (Stockholm)
    let startLoc = userLocation;

    if (!startLoc && formData.startCity) {
        try {
            // Fetch coordinates for the city name using OpenStreetMap Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.startCity)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                startLoc = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.warn("Geocoding failed, falling back to default.", error);
        }
    }

    // Final fallback
    if (!startLoc) startLoc = DEFAULT_COORDINATES;

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
    setIsGeocoding(false);
  };

  // Helper for Custom Category
  const isCustomCategory = formData.category === 'Annat' || (formData.category !== '' && !RACE_CATEGORIES.includes(formData.category));

  // Archetype Selection Logic
  const selectArchetype = (type: 'classic' | 'rogaining' | 'adventure') => {
      if (type === 'classic') {
          setFormData({
              ...formData,
              winCondition: 'fastest_time',
              checkpointOrder: 'sequential',
              scoreModel: 'basic'
          });
      } else if (type === 'rogaining') {
          setFormData({
              ...formData,
              winCondition: 'most_points',
              checkpointOrder: 'free',
              scoreModel: 'rogaining'
          });
      } else if (type === 'adventure') {
          setFormData({
              ...formData,
              winCondition: 'most_points',
              checkpointOrder: 'free',
              scoreModel: 'basic'
          });
      }
  };

  // Determine active archetype for UI highlight
  const activeArchetype = 
      formData.scoreModel === 'rogaining' ? 'rogaining' :
      formData.winCondition === 'most_points' ? 'adventure' : 'classic';

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
                 {step === 1 ? 'Starta ditt Äventyr' : step === 2 ? 'Välj Spelupplägg' : 'Start & Synlighet'}
             </h2>
             <p className="text-gray-400 text-sm mt-1">
                 {step === 1 ? 'Namn, plats och kategori' : step === 2 ? 'Bestäm reglerna för hur man vinner' : 'Hur får deltagarna tillgång?'}
             </p>
         </div>

         {/* Body Content */}
         <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar scroll-smooth">
             
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

                     {/* Updated Category Selection (Dropdown) */}
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori</label>
                        <div className="relative">
                            <Compass className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                            <select 
                                value={RACE_CATEGORIES.includes(formData.category) ? formData.category : (formData.category ? 'Annat' : '')}
                                onChange={(e) => setFormData({...formData, category: e.target.value === 'Annat' ? '' : e.target.value})}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Välj kategori...</option>
                                {RACE_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Custom Input if 'Annat' is selected (or active custom value) */}
                        {isCustomCategory && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                                <input 
                                    type="text"
                                    value={formData.category === 'Annat' ? '' : formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    placeholder="Skriv din kategori..."
                                    className="w-full bg-gray-900 border border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                        )}
                     </div>
                     
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Språk (Innehåll)</label>
                            <div className="relative">
                                <Languages className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                                <select 
                                    value={formData.language}
                                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="sv">Svenska</option>
                                    <option value="en">English</option>
                                </select>
                             </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Startort / Stad</label>
                            <div className="relative">
                                <MapPin className={`absolute left-3 top-3.5 w-5 h-5 ${userLocation ? 'text-green-500' : 'text-gray-500'}`} />
                                <input 
                                    type="text"
                                    value={formData.startCity}
                                    onChange={(e) => setFormData({...formData, startCity: e.target.value})}
                                    placeholder={userLocation ? "Din nuvarande plats" : "T.ex. Stockholm"}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
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
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px] resize-none transition-all"
                            />
                         </div>
                     </div>
                 </div>
             )}

             {/* STEP 2: ARCHETYPES (RULES) */}
             {step === 2 && (
                 <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         
                         {/* 1. CLASSIC RACE (Order 1) */}
                         <button
                            onClick={() => selectArchetype('classic')}
                            className={`order-1 relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-300 group hover:-translate-y-1 ${
                                activeArchetype === 'classic'
                                ? 'bg-blue-900/20 border-blue-500 shadow-xl shadow-blue-900/20'
                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                            }`}
                         >
                             {activeArchetype === 'classic' && (
                                 <div className="absolute top-3 right-3 text-blue-500"><CheckCircle2 className="w-6 h-6" /></div>
                             )}
                             <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${activeArchetype === 'classic' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                 <Flag className="w-7 h-7" />
                             </div>
                             <h3 className={`text-lg font-bold mb-2 ${activeArchetype === 'classic' ? 'text-white' : 'text-gray-300'}`}>Banlopp</h3>
                             <p className="text-xs text-gray-400 leading-relaxed">
                                 Klassiskt lopp. Snabbast tid från start till mål vinner. Du måste ta alla checkpoints i ordning.
                             </p>
                             <div className="mt-4 flex gap-2 justify-center">
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-800 rounded text-gray-400">Sekventiell</span>
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-800 rounded text-gray-400">På Tid</span>
                             </div>
                         </button>

                         {/* 2. ROGAINING (Order 2) */}
                         <button
                            onClick={() => selectArchetype('rogaining')}
                            className={`order-2 relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-300 group hover:-translate-y-1 ${
                                activeArchetype === 'rogaining'
                                ? 'bg-yellow-900/20 border-yellow-500 shadow-xl shadow-yellow-900/20'
                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                            }`}
                         >
                             {activeArchetype === 'rogaining' && (
                                 <div className="absolute top-3 right-3 text-yellow-500"><CheckCircle2 className="w-6 h-6" /></div>
                             )}
                             <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${activeArchetype === 'rogaining' ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-gray-500'}`}>
                                 <Timer className="w-7 h-7" />
                             </div>
                             <h3 className={`text-lg font-bold mb-2 ${activeArchetype === 'rogaining' ? 'text-white' : 'text-gray-300'}`}>Poängjakt</h3>
                             <p className="text-xs text-gray-400 leading-relaxed">
                                 Samla max poäng på begränsad tid. Valfri ordning. Strategi avgör. Minuspoäng vid sen målgång.
                             </p>
                             <div className="mt-4 flex gap-2 justify-center">
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-800 rounded text-gray-400">Fri Ordning</span>
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-800 rounded text-gray-400">Tidsgräns</span>
                             </div>
                         </button>

                         {/* 3. ADVENTURE (Order 4 on mobile, 3 on desktop) */}
                         <button
                            onClick={() => selectArchetype('adventure')}
                            className={`order-4 md:order-3 relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-300 group hover:-translate-y-1 ${
                                activeArchetype === 'adventure'
                                ? 'bg-purple-900/20 border-purple-500 shadow-xl shadow-purple-900/20'
                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                            }`}
                         >
                             {activeArchetype === 'adventure' && (
                                 <div className="absolute top-3 right-3 text-purple-500"><CheckCircle2 className="w-6 h-6" /></div>
                             )}
                             <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${activeArchetype === 'adventure' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                 <Compass className="w-7 h-7" />
                             </div>
                             <h3 className={`text-lg font-bold mb-2 ${activeArchetype === 'adventure' ? 'text-white' : 'text-gray-300'}`}>Äventyr</h3>
                             <p className="text-xs text-gray-400 leading-relaxed">
                                 Lös uppdrag och quiz i egen takt. Ingen tidsstress. Fokus på upplevelsen och poängen.
                             </p>
                             <div className="mt-4 flex gap-2 justify-center">
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-800 rounded text-gray-400">Fri Ordning</span>
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-800 rounded text-gray-400">Ingen Tid</span>
                             </div>
                         </button>

                         {/* Rogaining Settings (Order 3 on mobile, 4 on desktop) */}
                         {activeArchetype === 'rogaining' && (
                             <div className="order-3 md:order-4 col-span-1 md:col-span-3 relative bg-yellow-900/10 border border-yellow-500/30 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300 mt-2">
                                 {/* Connector Arrow */}
                                 <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-900/10 border-t border-l border-yellow-500/30 transform rotate-45"></div>
                                 
                                 <div className="flex items-center gap-3">
                                     <Clock className="w-6 h-6 text-yellow-500" />
                                     <div>
                                         <h4 className="text-sm font-bold text-yellow-100">Inställningar för Poängjakt</h4>
                                         <p className="text-xs text-yellow-200/70">Hur länge får deltagarna vara ute?</p>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <input 
                                        type="number"
                                        value={formData.timeLimitMinutes}
                                        onChange={(e) => setFormData({...formData, timeLimitMinutes: parseInt(e.target.value) || 60})}
                                        className="w-20 bg-gray-900 border border-yellow-500/50 rounded-lg p-2 text-center text-white font-bold"
                                     />
                                     <span className="text-sm font-bold text-gray-400">minuter</span>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
             )}

             {/* STEP 3: RESTRUCTURED FOR CLARITY */}
             {step === 3 && (
                 <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                      
                      {/* SECTION A: ACCESS & VISIBILITY */}
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">A</span>
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tillgång & Synlighet</label>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <button
                                onClick={() => setFormData({...formData, isPublic: false})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    !formData.isPublic
                                    ? 'bg-red-900/20 border-red-500 text-white shadow-lg shadow-red-900/10'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                              >
                                  <Lock className={`w-6 h-6 mb-2 ${!formData.isPublic ? 'text-red-400' : 'text-gray-600'}`} />
                                  <span className="text-sm font-bold">Privat Event</span>
                                  <span className="text-[10px] opacity-70 mt-1 text-center">Kräver kod. Syns ej i listan.</span>
                              </button>

                              <button
                                onClick={() => setFormData({...formData, isPublic: true})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.isPublic
                                    ? 'bg-green-900/20 border-green-500 text-white shadow-lg shadow-green-900/10'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                              >
                                  <Globe className={`w-6 h-6 mb-2 ${formData.isPublic ? 'text-green-400' : 'text-gray-600'}`} />
                                  <span className="text-sm font-bold">Publikt Event</span>
                                  <span className="text-[10px] opacity-70 mt-1 text-center">Öppet för alla. Syns i Utforska.</span>
                              </button>
                          </div>

                          {/* Access Code logic display */}
                          {!formData.isPublic ? (
                              <div className="relative animate-in fade-in slide-in-from-top-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Accesskod (Dela denna)</label>
                                <Key className="absolute left-3 top-8 text-gray-500 w-5 h-5 z-10" />
                                <input
                                    type="text"
                                    value={formData.accessCode}
                                    onChange={(e) => setFormData({...formData, accessCode: e.target.value.toUpperCase()})}
                                    maxLength={8}
                                    className="w-full bg-gray-900 border border-red-500/50 rounded-xl py-3 pl-10 pr-4 text-white font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                              </div>
                          ) : (
                              <div className="p-3 bg-green-900/10 border border-green-500/20 rounded-xl text-center animate-in fade-in slide-in-from-top-1">
                                  <p className="text-xs text-green-300">
                                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                      Deltagare kan gå med direkt via listan.
                                  </p>
                              </div>
                          )}
                      </div>

                      <div className="h-px bg-gray-800 w-full"></div>

                      {/* SECTION B: START METHOD */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                              <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">B</span>
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Startmetod</label>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button
                                onClick={() => setFormData({...formData, startMode: 'mass_start'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.startMode === 'mass_start'
                                    ? 'bg-blue-900/30 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                            >
                                <Clock className={`w-6 h-6 mb-2 ${formData.startMode === 'mass_start' ? 'text-blue-400' : 'text-gray-600'}`} />
                                <span className="text-sm font-bold">Gemensam Start</span>
                                <span className="text-[10px] opacity-70 mt-1 text-center">Alla startar samtidigt.</span>
                            </button>

                            <button
                                onClick={() => setFormData({...formData, startMode: 'self_start'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.startMode === 'self_start'
                                    ? 'bg-purple-900/30 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                            >
                                <MousePointer2 className={`w-6 h-6 mb-2 ${formData.startMode === 'self_start' ? 'text-purple-400' : 'text-gray-600'}`} />
                                <span className="text-sm font-bold">Fri Start (GPS)</span>
                                <span className="text-[10px] opacity-70 mt-1 text-center">Starta när man är på plats.</span>
                            </button>
                        </div>

                        {/* Manual Start Toggle (Only for Mass Start) */}
                        {formData.startMode === 'mass_start' && (
                            <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl animate-in fade-in slide-in-from-top-1">
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
                                            <div className="text-xs text-gray-500">Arrangören får en knapp för att starta loppet</div>
                                        </div>
                                    </label>
                            </div>
                        )}
                      </div>

                      <div className="h-px bg-gray-800 w-full"></div>

                      {/* SECTION C: LEADERBOARD */}
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">C</span>
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resultatlista</label>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <button
                                onClick={() => setFormData({...formData, leaderboardMode: 'global'})}
                                className={`flex flex-col p-3 rounded-xl border transition-all text-left ${
                                    formData.leaderboardMode === 'global'
                                    ? 'bg-yellow-900/20 border-yellow-500'
                                    : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                                }`}
                              >
                                  <div className="flex items-center gap-2 mb-2">
                                      <Trophy className={`w-4 h-4 ${formData.leaderboardMode === 'global' ? 'text-yellow-400' : 'text-gray-500'}`} />
                                      <span className={`text-sm font-bold ${formData.leaderboardMode === 'global' ? 'text-white' : 'text-gray-400'}`}>Publik Topplista</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 leading-tight">Alla ser allas resultat. Tävling.</span>
                              </button>

                              <button
                                onClick={() => setFormData({...formData, leaderboardMode: 'private'})}
                                className={`flex flex-col p-3 rounded-xl border transition-all text-left ${
                                    formData.leaderboardMode === 'private'
                                    ? 'bg-gray-800 border-gray-500'
                                    : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                                }`}
                              >
                                  <div className="flex items-center gap-2 mb-2">
                                      <EyeOff className={`w-4 h-4 ${formData.leaderboardMode === 'private' ? 'text-white' : 'text-gray-500'}`} />
                                      <span className={`text-sm font-bold ${formData.leaderboardMode === 'private' ? 'text-white' : 'text-gray-400'}`}>Privat Resultat</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 leading-tight">Ser bara sin egen tid. Utmaning.</span>
                              </button>
                          </div>

                          {/* ADMIN ONLY: OFFICIAL QUESTER EVENT TOGGLE */}
                          {user?.role === 'admin' && (
                              <label className="flex items-center justify-between cursor-pointer p-4 mt-6 bg-indigo-900/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-900/20 transition-colors">
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
                    disabled={isGeocoding}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/30 animate-pulse disabled:opacity-50 disabled:animate-none"
                 >
                     {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 
                     {isGeocoding ? 'Hittar plats...' : `Skapa ${formData.eventType}`}
                 </button>
             )}
         </div>

      </div>
    </div>
  );
};
