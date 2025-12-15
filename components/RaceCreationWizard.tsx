
import React, { useState, useEffect, useRef } from 'react';
import { RaceEvent, WinCondition, CheckpointOrder, TerrainType, StartMode, UserProfile, ScoreModel, LeaderboardMode } from '../types';
import { RACE_CATEGORIES, EVENT_TYPES, DEFAULT_COORDINATES } from '../constants';
import { api } from '../services/dataService';
import { X, ArrowRight, ArrowLeft, Check, Trophy, Timer, Route, Shuffle, Key, FileText, Tag, Flag, Mountain, Trees, Clock, MousePointer2, Languages, PenTool, MapPin, ShieldCheck, Compass, Info, Eye, EyeOff, ChevronDown, CheckCircle2, Lock, Globe, Users, Loader2, Image as ImageIcon, Upload, LayoutTemplate, Play, Radio, Crown, Zap } from 'lucide-react';

interface RaceCreationWizardProps {
  onCancel: () => void;
  onComplete: (raceData: Partial<RaceEvent>) => void;
  user?: UserProfile;
}

export const RaceCreationWizard: React.FC<RaceCreationWizardProps> = ({ onCancel, onComplete, user }) => {
  const [step, setStep] = useState(1);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: '',
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
    
    // Step 3 Settings
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
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          // Upload to a temp path, using timestamp to ensure uniqueness
          const path = `event-covers/temp-${Date.now()}`;
          const url = await api.storage.uploadBlob(path, file);
          setFormData(prev => ({ ...prev, coverImage: url }));
      } catch (error) {
          console.error("Upload failed", error);
          alert("Kunde inte ladda upp bilden.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleFinish = async () => {
    setIsGeocoding(true);

    // 1. Determine Start Location
    // Priority: Text Input Geocode -> GPS -> Default (Stockholm)
    let startLoc = userLocation;

    if (formData.startCity) {
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
    // If Self Start, force start time to NOW (so it's open immediately upon publish)
    const effectiveStartTime = formData.startMode === 'self_start' 
        ? new Date().toISOString() 
        : new Date(formData.startDateTime).toISOString();

    const partialData: Partial<RaceEvent> = {
        ...formData,
        id: `race-${Date.now()}`,
        startDateTime: effectiveStartTime,
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
                 {step === 1 ? 'Koncept & Identitet' : step === 2 ? 'Välj Spelregler' : 'Start & Synlighet'}
             </h2>
             <p className="text-gray-400 text-sm mt-1">
                 {step === 1 ? 'Sätt grunden för eventet' : step === 2 ? 'Hur vinner man?' : 'Detaljer för genomförandet'}
             </p>
         </div>

         {/* Body Content */}
         <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar scroll-smooth">
             
             {/* STEP 1: IDENTITY */}
             {step === 1 && (
                 <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                     
                     {/* Cover Image Upload (Prominent) */}
                     <div className="relative w-full h-40 rounded-2xl bg-gray-800 border-2 border-dashed border-gray-700 overflow-hidden group hover:border-blue-500 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          {formData.coverImage ? (
                              <>
                                <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-sm font-bold text-white flex items-center gap-2"><Upload className="w-4 h-4" /> Byt Omslagsbild</span>
                                </div>
                              </>
                          ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2 group-hover:text-blue-400">
                                  {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-10 h-10" />}
                                  <span className="text-sm font-bold uppercase tracking-wider">{isUploading ? 'Laddar upp...' : 'Ladda upp omslagsbild'}</span>
                                  <span className="text-xs opacity-70">Gör eventet snyggt på dashboarden</span>
                              </div>
                          )}
                          <input 
                              type="file" 
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              className="hidden"
                              disabled={isUploading}
                          />
                     </div>

                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Eventnamn</label>
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

                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 sm:col-span-1">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Typ av Aktivitet</label>
                             <div className="relative">
                                <LayoutTemplate className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                                <select 
                                    value={formData.eventType}
                                    onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                >
                                    {EVENT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                             </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Språk</label>
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
                         
                         {/* 1. CLASSIC RACE */}
                         <button
                            onClick={() => selectArchetype('classic')}
                            className={`group relative flex flex-col items-start text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                                activeArchetype === 'classic'
                                ? 'bg-blue-900/20 border-blue-500 shadow-xl shadow-blue-900/20'
                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                            }`}
                         >
                             <div className="flex justify-between w-full mb-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeArchetype === 'classic' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                    <Flag className="w-6 h-6" />
                                </div>
                                {activeArchetype === 'classic' && <div className="text-blue-500"><CheckCircle2 className="w-6 h-6" /></div>}
                             </div>
                             <h3 className={`text-lg font-bold mb-1 ${activeArchetype === 'classic' ? 'text-white' : 'text-gray-300'}`}>Banlopp</h3>
                             <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                 Klassiskt lopp A till B. Deltagarna måste ta checkpoints i nummerordning.
                             </p>
                             <div className="mt-auto flex flex-wrap gap-2">
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-400">Sekventiell</span>
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-400">Tid</span>
                             </div>
                         </button>

                         {/* 2. ROGAINING */}
                         <button
                            onClick={() => selectArchetype('rogaining')}
                            className={`group relative flex flex-col items-start text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                                activeArchetype === 'rogaining'
                                ? 'bg-yellow-900/20 border-yellow-500 shadow-xl shadow-yellow-900/20'
                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                            }`}
                         >
                             <div className="flex justify-between w-full mb-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeArchetype === 'rogaining' ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-gray-500'}`}>
                                    <Timer className="w-6 h-6" />
                                </div>
                                {activeArchetype === 'rogaining' && <div className="text-yellow-500"><CheckCircle2 className="w-6 h-6" /></div>}
                             </div>
                             <h3 className={`text-lg font-bold mb-1 ${activeArchetype === 'rogaining' ? 'text-white' : 'text-gray-300'}`}>Poängjakt</h3>
                             <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                 Samla max poäng på begränsad tid. Valfri ordning. Strategi och vägval avgör.
                             </p>
                             <div className="mt-auto flex flex-wrap gap-2">
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-400">Fri Ordning</span>
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-400">Maxtid</span>
                             </div>
                         </button>

                         {/* 3. ADVENTURE */}
                         <button
                            onClick={() => selectArchetype('adventure')}
                            className={`group relative flex flex-col items-start text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                                activeArchetype === 'adventure'
                                ? 'bg-purple-900/20 border-purple-500 shadow-xl shadow-purple-900/20'
                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                            }`}
                         >
                             <div className="flex justify-between w-full mb-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeArchetype === 'adventure' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                    <Compass className="w-6 h-6" />
                                </div>
                                {activeArchetype === 'adventure' && <div className="text-purple-500"><CheckCircle2 className="w-6 h-6" /></div>}
                             </div>
                             <h3 className={`text-lg font-bold mb-1 ${activeArchetype === 'adventure' ? 'text-white' : 'text-gray-300'}`}>Äventyr</h3>
                             <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                 Uppdrag och quiz i egen takt. Ingen stress. Fokus på upplevelsen.
                             </p>
                             <div className="mt-auto flex flex-wrap gap-2">
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-400">Fri Ordning</span>
                                 <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-400">Utan Tid</span>
                             </div>
                         </button>

                         {/* Rogaining Settings (Conditional) */}
                         {activeArchetype === 'rogaining' && (
                             <div className="col-span-1 md:col-span-3 relative bg-yellow-900/10 border border-yellow-500/30 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300 mt-2">
                                 <div className="flex items-center gap-3">
                                     <Clock className="w-6 h-6 text-yellow-500" />
                                     <div>
                                         <h4 className="text-sm font-bold text-yellow-100">Tidsgräns (Maxtid)</h4>
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

             {/* STEP 3: LOGISTICS, START & VISIBILITY */}
             {step === 3 && (
                 <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                      
                      {/* SEKTION A: STARTMETOD (Moved to Top) */}
                      <div>
                          <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                              <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">A</span>
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Startmetod</label>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                              <button
                                onClick={() => setFormData({...formData, startMode: 'mass_start'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.startMode === 'mass_start'
                                    ? 'bg-blue-900/20 border-blue-500 text-white'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                              >
                                  <Users className="w-6 h-6 mb-2" />
                                  <span className="text-sm font-bold">Gemensam Start</span>
                                  <span className="text-[10px] opacity-70 mt-1">Tävling på klockslag</span>
                              </button>

                              <button
                                onClick={() => setFormData({...formData, startMode: 'self_start'})}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                    formData.startMode === 'self_start'
                                    ? 'bg-blue-900/20 border-blue-500 text-white'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                              >
                                  <Play className="w-6 h-6 mb-2" />
                                  <span className="text-sm font-bold">Fri Start (GPS)</span>
                                  <span className="text-[10px] opacity-70 mt-1">Öppen start vid publicering</span>
                              </button>
                          </div>

                          {/* Manual Start Toggle */}
                          {formData.startMode === 'mass_start' && (
                              <div className="flex items-center justify-between bg-gray-900 border border-gray-800 p-3 rounded-xl mb-4">
                                  <div className="flex items-center gap-2">
                                      <div className="bg-gray-800 p-2 rounded-lg"><Zap className="w-4 h-4 text-yellow-500" /></div>
                                      <div>
                                          <div className="text-xs font-bold text-white">Tillåt manuell startknapp</div>
                                          <div className="text-[10px] text-gray-500">Arrangören kan tvinga igång loppet i appen</div>
                                      </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          checked={formData.manualStartEnabled}
                                          onChange={(e) => setFormData({...formData, manualStartEnabled: e.target.checked})}
                                          className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                  </label>
                              </div>
                          )}
                      </div>

                      {/* SEKTION B: PLATS & TID */}
                      <div>
                          <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                              <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">B</span>
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tid & Plats</label>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                              <div className="relative">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Startort (Söker automatiskt)</label>
                                <MapPin className={`absolute left-3 top-8 w-5 h-5 ${userLocation ? 'text-green-500' : 'text-gray-500'}`} />
                                <input 
                                    type="text"
                                    value={formData.startCity}
                                    onChange={(e) => setFormData({...formData, startCity: e.target.value})}
                                    placeholder={userLocation ? "Använder din GPS (eller skriv stad)" : "T.ex. Stockholm"}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-blue-500 transition-all"
                                />
                              </div>

                              {formData.startMode === 'mass_start' ? (
                                  <div className="relative animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Datum & Starttid</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.startDateTime}
                                        onChange={(e) => setFormData({...formData, startDateTime: e.target.value})}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all"
                                    />
                                  </div>
                              ) : (
                                  <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                      <div className="bg-blue-900/50 p-2 rounded-lg"><Info className="w-4 h-4 text-blue-400" /></div>
                                      <span>Eventet blir tillgängligt för deltagare direkt när du publicerar det. Ingen starttid behövs.</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* SEKTION C: SYNLIGHET & RESULTAT */}
                      <div>
                          <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                              <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">C</span>
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Synlighet & Resultat</label>
                          </div>

                          {/* Access / Public Toggle */}
                          <div className="mb-4">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Vem kan delta?</label>
                              <div className="grid grid-cols-2 gap-4">
                                  <button
                                    onClick={() => setFormData({...formData, isPublic: false})}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                        !formData.isPublic
                                        ? 'bg-gray-800 border-gray-600 text-white'
                                        : 'bg-gray-950 border-gray-800 text-gray-500'
                                    }`}
                                  >
                                      <Lock className="w-5 h-5 mb-1" />
                                      <span className="text-xs font-bold">Privat (Kod)</span>
                                  </button>
                                  <button
                                    onClick={() => setFormData({...formData, isPublic: true})}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                        formData.isPublic
                                        ? 'bg-green-900/20 border-green-500 text-white'
                                        : 'bg-gray-950 border-gray-800 text-gray-500'
                                    }`}
                                  >
                                      <Globe className="w-5 h-5 mb-1" />
                                      <span className="text-xs font-bold">Publikt</span>
                                  </button>
                              </div>
                              {!formData.isPublic && (
                                  <div className="mt-2 flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-800">
                                      <Key className="w-4 h-4 text-gray-500" />
                                      <span className="text-xs text-gray-400">Accesskod:</span>
                                      <input 
                                          value={formData.accessCode}
                                          onChange={(e) => setFormData({...formData, accessCode: e.target.value.toUpperCase()})}
                                          className="bg-transparent text-white font-mono font-bold w-20 outline-none uppercase"
                                          maxLength={8}
                                      />
                                  </div>
                              )}
                          </div>

                          {/* Leaderboard Mode */}
                          <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Resultatvisning</label>
                              <div className="flex gap-2 p-1 bg-gray-950 border border-gray-800 rounded-xl mb-2">
                                  <button 
                                      onClick={() => setFormData({...formData, leaderboardMode: 'global'})}
                                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.leaderboardMode === 'global' ? 'bg-yellow-600 text-white shadow' : 'text-gray-500 hover:bg-gray-900'}`}
                                  >
                                      {formData.isPublic ? "🏆 Publik Topplista (Tävling)" : "🏆 Topplista"}
                                  </button>
                                  <button 
                                      onClick={() => setFormData({...formData, leaderboardMode: 'private'})}
                                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.leaderboardMode === 'private' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-900'}`}
                                  >
                                      👤 Enskilt Resultat (Utmaning)
                                  </button>
                              </div>
                              
                              {/* Dynamic Explanation */}
                              <div className="text-[10px] text-gray-400 px-1">
                                  {formData.leaderboardMode === 'global' 
                                      ? "Alla deltagare i detta event ser varandras tider och poäng." 
                                      : "Deltagaren ser endast sin egen tid/poäng. Ingen ranking visas."
                                  }
                              </div>

                              {/* Private Event Context Note */}
                              {!formData.isPublic && formData.leaderboardMode === 'global' && (
                                  <div className="mt-2 flex items-start gap-2 bg-blue-900/20 p-2 rounded-lg border border-blue-500/20">
                                      <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                                      <span className="text-[10px] text-blue-200">
                                          Eftersom eventet är privat visas topplistan endast för de som har koden.
                                      </span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* SEKTION D: ADMIN (Official) */}
                      {user?.role === 'admin' && (
                          <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl mt-4">
                              <div className="flex items-center gap-2 mb-2 border-b border-red-900/30 pb-2">
                                  <ShieldCheck className="w-4 h-4 text-red-500" />
                                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Admin Zone</span>
                              </div>
                              <div className="flex items-center justify-between">
                                  <div>
                                      <div className="text-sm font-bold text-white flex items-center gap-1">
                                          <Crown className="w-3 h-3 text-yellow-500" /> Quester Original
                                      </div>
                                      <div className="text-[10px] text-red-300/70">Markera som officiellt system-event (visas med badge)</div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          checked={formData.createAsOfficial}
                                          onChange={(e) => setFormData({...formData, createAsOfficial: e.target.checked})}
                                          className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                  </label>
                              </div>
                          </div>
                      )}
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
                     {isGeocoding ? 'Hittar plats...' : `Skapa Event`}
                 </button>
             )}
         </div>

      </div>
    </div>
  );
};
