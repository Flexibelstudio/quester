
import React, { useState, useRef } from 'react';
import { RaceEvent, TerrainType, StartMode, LeaderboardMode, EventStatus, ScoreModel, WinCondition, CheckpointOrder } from '../types';
import { RACE_CATEGORIES, EVENT_TYPES } from '../constants';
import { api } from '../services/dataService';
import { X, Save, Flag, Trophy, Globe, Upload, Loader2, ImageIcon, Calculator, Clock, AlertTriangle, Users, Play, Lock, Key, Trash2, LayoutTemplate, Compass, AlertOctagon, CheckCircle2, Mountain, Trees, Timer, Copy, MapPin } from 'lucide-react';

interface EventSettingsDialogProps {
  raceData: RaceEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<RaceEvent>) => void;
  onDelete?: () => void;
  onCreateTemplate?: (templateData: RaceEvent) => void; // New callback
}

type SettingsTab = 'concept' | 'rules' | 'logistics';

export const EventSettingsDialog: React.FC<EventSettingsDialogProps> = ({ raceData, isOpen, onClose, onSave, onDelete, onCreateTemplate }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('concept');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false); // Modal for template choice

  // Helper to format ISO string to "YYYY-MM-DDTHH:mm" for local input
  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const offset = date.getTimezoneOffset(); 
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    name: raceData.name,
    coverImage: raceData.coverImage || '',
    eventType: raceData.eventType || 'Lopp',
    status: raceData.status || 'draft',
    language: raceData.language || 'sv',
    isPublic: raceData.isPublic || false,
    accessCode: raceData.accessCode || '',
    description: raceData.description,
    category: raceData.category || 'ADV (Motorcykel)',
    startDateTime: formatDateForInput(raceData.startDateTime),
    startMode: raceData.startMode || 'mass_start',
    manualStartEnabled: raceData.manualStartEnabled ?? true,
    checkpointOrder: raceData.checkpointOrder || 'free',
    terrainType: raceData.terrainType || 'trail',
    leaderboardMode: raceData.leaderboardMode || 'global',
    startCity: raceData.startCity || '',
    finishCity: raceData.finishCity || '',
    winCondition: raceData.winCondition || 'fastest_time',
    scoreModel: raceData.scoreModel || 'basic',
    timeLimitMinutes: raceData.timeLimitMinutes || 60,
    parTimeMinutes: raceData.parTimeMinutes || 60,
    pointsPerMinute: raceData.pointsPerMinute || 10
  });

  // Reset form when opening
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: raceData.name,
        coverImage: raceData.coverImage || '',
        eventType: raceData.eventType || 'Lopp',
        status: raceData.status || 'draft',
        language: raceData.language || 'sv',
        isPublic: raceData.isPublic || false,
        accessCode: raceData.accessCode || '',
        description: raceData.description,
        category: raceData.category || 'ADV (Motorcykel)',
        startDateTime: formatDateForInput(raceData.startDateTime),
        startMode: raceData.startMode || 'mass_start',
        manualStartEnabled: raceData.manualStartEnabled ?? true,
        checkpointOrder: raceData.checkpointOrder || 'free',
        terrainType: raceData.terrainType || 'trail',
        leaderboardMode: raceData.leaderboardMode || 'global',
        startCity: raceData.startCity || '',
        finishCity: raceData.finishCity || '',
        winCondition: raceData.winCondition || 'fastest_time',
        scoreModel: raceData.scoreModel || 'basic',
        timeLimitMinutes: raceData.timeLimitMinutes || 60,
        parTimeMinutes: raceData.parTimeMinutes || 60,
        pointsPerMinute: raceData.pointsPerMinute || 10
      });
    }
  }, [isOpen, raceData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
        ...formData,
        startDateTime: new Date(formData.startDateTime).toISOString(),
        winCondition: formData.winCondition as WinCondition,
        scoreModel: formData.scoreModel as ScoreModel,
        checkpointOrder: formData.checkpointOrder as CheckpointOrder
    });
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          const path = `event-covers/${raceData.id}-${Date.now()}`;
          const url = await api.storage.uploadBlob(path, file);
          setFormData(prev => ({ ...prev, coverImage: url }));
      } catch (error) {
          console.error("Upload failed", error);
          alert("Kunde inte ladda upp bilden. Försök igen.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleDelete = () => {
      if (confirm('Är du helt säker på att du vill radera detta event permanent? Det går inte att ångra.')) {
          if (onDelete) onDelete();
          onClose();
      }
  };

  const handleTemplateCreation = (mode: 'fixed' | 'flexible') => {
      if (!onCreateTemplate) return;

      const baseTemplate: RaceEvent = {
          ...raceData,
          ...formData, // Include unsaved form changes
          id: `tpl-custom-${Date.now()}`, // New ID
          name: `${formData.name} (Kopia)`,
          isTemplate: true,
          status: 'draft',
          results: [], // Clear results
          ratings: [], // Clear ratings
          participantIds: [],
          startDateTime: new Date().toISOString() // Reset time
      };

      if (mode === 'flexible') {
          // BLUEPRINT MODE: Clear coordinates
          baseTemplate.name = `${formData.name} (Blueprint)`;
          baseTemplate.startCity = '';
          baseTemplate.finishCity = '';
          // Reset Start/Finish locations but keep radius config
          baseTemplate.startLocation = { lat: 0, lng: 0, radiusMeters: baseTemplate.startLocation.radiusMeters };
          baseTemplate.finishLocation = { lat: 0, lng: 0, radiusMeters: baseTemplate.finishLocation.radiusMeters };
          
          // Clear checkpoint locations
          baseTemplate.checkpoints = baseTemplate.checkpoints.map(cp => ({
              ...cp,
              location: null, // Wipe coords
              // Auto-generate a simple terrain hint if missing, based on name
              terrainHint: cp.terrainHint || (cp.name.toLowerCase().includes('skog') ? 'Forest' : 'Open area')
          }));
      }

      onCreateTemplate(baseTemplate);
      setShowTemplateModal(false);
      onClose();
  };

  // Logic to set archetype
  const setGameType = (type: 'classic' | 'rogaining' | 'adventure') => {
      if (type === 'classic') {
          setFormData(prev => ({
              ...prev,
              winCondition: 'fastest_time',
              checkpointOrder: 'sequential',
              scoreModel: 'basic'
          }));
      } else if (type === 'rogaining') {
          setFormData(prev => ({
              ...prev,
              winCondition: 'most_points',
              checkpointOrder: 'free',
              scoreModel: 'rogaining'
          }));
      } else if (type === 'adventure') {
          setFormData(prev => ({
              ...prev,
              winCondition: 'most_points',
              checkpointOrder: 'free',
              scoreModel: 'basic'
          }));
      }
  };

  // Determine current active archetype
  const activeArchetype = 
      formData.scoreModel === 'rogaining' ? 'rogaining' :
      formData.winCondition === 'most_points' ? 'adventure' : 'classic';

  // Determine categories to show
  const availableCategories = Array.from(new Set([formData.category, ...RACE_CATEGORIES]));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* TEMPLATE CHOICE MODAL */}
      {showTemplateModal && (
          <div className="absolute inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-900/30 rounded-full text-purple-400">
                          <Copy className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Spara som Mall</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-6">
                      Hur vill du spara detta event?
                  </p>
                  
                  <div className="space-y-3">
                      <button 
                          onClick={() => handleTemplateCreation('fixed')}
                          className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-left transition-all group"
                      >
                          <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span className="font-bold text-white">Exakt Kopia (Låst Plats)</span>
                          </div>
                          <p className="text-xs text-gray-500 group-hover:text-gray-400">
                              Behåller alla GPS-koordinater. Bra för återkommande lopp på samma plats.
                          </p>
                      </button>

                      <button 
                          onClick={() => handleTemplateCreation('flexible')}
                          className="w-full p-4 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-500/30 hover:border-purple-500/50 rounded-xl text-left transition-all group"
                      >
                          <div className="flex items-center gap-2 mb-1">
                              <LayoutTemplate className="w-4 h-4 text-purple-400" />
                              <span className="font-bold text-white">Blueprint (Flyttbar Mall)</span>
                          </div>
                          <p className="text-xs text-gray-400 group-hover:text-gray-300">
                              Rensar alla koordinater men behåller frågor och story. AI kan sedan placera ut detta event på vilken ort som helst.
                          </p>
                      </button>
                  </div>

                  <button onClick={() => setShowTemplateModal(false)} className="w-full mt-6 py-3 text-sm font-bold text-gray-500 hover:text-white">
                      Avbryt
                  </button>
              </div>
          </div>
      )}

      <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-950 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Inställningar
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900 shrink-0">
            <button 
                onClick={() => setActiveTab('concept')}
                className={`flex-1 py-4 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 uppercase tracking-wide ${activeTab === 'concept' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <Flag className="w-4 h-4" /> Koncept
            </button>
            <button 
                onClick={() => setActiveTab('rules')}
                className={`flex-1 py-4 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 uppercase tracking-wide ${activeTab === 'rules' ? 'border-yellow-500 text-yellow-400 bg-yellow-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <Trophy className="w-4 h-4" /> Regler
            </button>
            <button 
                onClick={() => setActiveTab('logistics')}
                className={`flex-1 py-4 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 uppercase tracking-wide ${activeTab === 'logistics' ? 'border-green-500 text-green-400 bg-green-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <Globe className="w-4 h-4" /> Logistik
            </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* TAB 1: KONCEPT */}
          {activeTab === 'concept' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {/* Cover Image */}
                  <div className="relative w-full h-48 rounded-2xl bg-gray-800 border-2 border-dashed border-gray-700 overflow-hidden group hover:border-blue-500 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
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
                          </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" disabled={isUploading} />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Eventnamn</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Typ av Aktivitet</label>
                          <select value={formData.eventType} onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white focus:border-blue-500">
                              {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Språk</label>
                          <select value={formData.language} onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white focus:border-blue-500">
                              <option value="sv">Svenska</option>
                              <option value="en">English</option>
                          </select>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori (Sport/Tema)</label>
                      <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white focus:border-blue-500">
                          {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Beskrivning</label>
                      <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px] resize-none" placeholder="Beskriv eventet..." />
                  </div>
              </div>
          )}

          {/* TAB 2: REGLER (Redesigned) */}
          {activeTab === 'rules' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  
                  {/* Game Type Cards */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Välj Speltyp</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* 1. Banlopp */}
                          <button
                            type="button"
                            onClick={() => setGameType('classic')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                activeArchetype === 'classic'
                                ? 'bg-blue-900/20 border-blue-500 text-white shadow-lg'
                                : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600'
                            }`}
                          >
                              <Flag className={`w-8 h-8 mb-2 ${activeArchetype === 'classic' ? 'text-blue-400' : 'text-gray-600'}`} />
                              <span className="font-bold text-sm">Banlopp</span>
                              <div className="flex gap-1 mt-2">
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700">Tid</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700">Sekventiell</span>
                              </div>
                          </button>

                          {/* 2. Poängjakt */}
                          <button
                            type="button"
                            onClick={() => setGameType('rogaining')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                activeArchetype === 'rogaining'
                                ? 'bg-yellow-900/20 border-yellow-500 text-white shadow-lg'
                                : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600'
                            }`}
                          >
                              <Timer className={`w-8 h-8 mb-2 ${activeArchetype === 'rogaining' ? 'text-yellow-400' : 'text-gray-600'}`} />
                              <span className="font-bold text-sm">Poängjakt</span>
                              <div className="flex gap-1 mt-2">
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700">Poäng</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700">Fri</span>
                              </div>
                          </button>

                          {/* 3. Äventyr */}
                          <button
                            type="button"
                            onClick={() => setGameType('adventure')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                activeArchetype === 'adventure'
                                ? 'bg-purple-900/20 border-purple-500 text-white shadow-lg'
                                : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600'
                            }`}
                          >
                              <Compass className={`w-8 h-8 mb-2 ${activeArchetype === 'adventure' ? 'text-purple-400' : 'text-gray-600'}`} />
                              <span className="font-bold text-sm">Äventyr</span>
                              <div className="flex gap-1 mt-2">
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700">Upplevelse</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700">Fri</span>
                              </div>
                          </button>
                      </div>
                  </div>

                  {/* Contextual Settings: Rogaining Time Limit */}
                  {activeArchetype === 'rogaining' && (
                      <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-yellow-500/20 rounded-lg">
                                  <Clock className="w-5 h-5 text-yellow-500" />
                              </div>
                              <div>
                                  <h4 className="text-sm font-bold text-yellow-100">Tidsgräns & Straff</h4>
                                  <p className="text-xs text-yellow-200/70">Hur länge får deltagarna vara ute?</p>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-yellow-500 mb-1">Maxtid (min)</label>
                                <input 
                                    type="number"
                                    value={formData.timeLimitMinutes}
                                    onChange={(e) => setFormData(prev => ({...prev, timeLimitMinutes: parseInt(e.target.value) || 60}))}
                                    className="w-20 bg-gray-900 border border-yellow-500/50 rounded-lg p-2 text-center text-white font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-red-400 mb-1">Straff/min</label>
                                <input 
                                    type="number"
                                    value={formData.pointsPerMinute}
                                    onChange={(e) => setFormData(prev => ({...prev, pointsPerMinute: parseInt(e.target.value) || 10}))}
                                    className="w-20 bg-gray-900 border border-red-500/50 rounded-lg p-2 text-center text-white font-bold"
                                />
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Other Settings */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Övrigt</label>
                      
                      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Terräng</label>
                          <div className="grid grid-cols-2 gap-4">
                              <button 
                                type="button"
                                onClick={() => setFormData(prev => ({...prev, terrainType: 'trail'}))}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${formData.terrainType === 'trail' ? 'bg-green-900/20 border-green-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                              >
                                  <Trees className="w-4 h-4" /> Stig/Väg
                              </button>
                              <button 
                                type="button"
                                onClick={() => setFormData(prev => ({...prev, terrainType: 'off_road'}))}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${formData.terrainType === 'off_road' ? 'bg-orange-900/20 border-orange-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                              >
                                  <Mountain className="w-4 h-4" /> Obanat
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB 3: LOGISTIK */}
          {activeTab === 'logistics' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  
                  {/* Start Mode & Visibility */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Startmetod</label>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, startMode: 'mass_start' }))} className={`p-4 rounded-xl border text-left transition-all ${formData.startMode === 'mass_start' ? 'bg-blue-900/20 border-blue-500 text-white shadow' : 'bg-gray-950 border-gray-700 text-gray-400'}`}>
                              <div className="flex justify-between mb-1"><Users className="w-5 h-5"/> {formData.startMode === 'mass_start' && <CheckCircle2 className="w-4 h-4 text-blue-500"/>}</div>
                              <div className="font-bold text-sm">Gemensam Start</div>
                              <div className="text-[10px] opacity-70">Specifik starttid</div>
                          </button>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, startMode: 'self_start' }))} className={`p-4 rounded-xl border text-left transition-all ${formData.startMode === 'self_start' ? 'bg-blue-900/20 border-blue-500 text-white shadow' : 'bg-gray-950 border-gray-700 text-gray-400'}`}>
                              <div className="flex justify-between mb-1"><Play className="w-5 h-5"/> {formData.startMode === 'self_start' && <CheckCircle2 className="w-4 h-4 text-blue-500"/>}</div>
                              <div className="font-bold text-sm">Fri Start</div>
                              <div className="text-[10px] opacity-70">Starta när du vill</div>
                          </button>
                      </div>

                      {formData.startMode === 'mass_start' && (
                          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Starttid</label>
                                  <input type="datetime-local" value={formData.startDateTime} onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={formData.manualStartEnabled} onChange={(e) => setFormData(prev => ({ ...prev, manualStartEnabled: e.target.checked }))} className="rounded bg-gray-800 border-gray-600" />
                                  <span className="text-xs text-gray-300">Tillåt manuell startknapp (Tvinga start)</span>
                              </label>
                          </div>
                      )}
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-4">
                          <label className="text-sm font-bold text-white uppercase tracking-wide">Synlighet</label>
                          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, isPublic: false }))} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${!formData.isPublic ? 'bg-gray-700 text-white shadow' : 'text-gray-500'}`}>Privat</button>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, isPublic: true }))} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${formData.isPublic ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>Publikt</button>
                          </div>
                      </div>
                      
                      {!formData.isPublic && (
                          <div className="flex items-center gap-2 bg-gray-900 p-3 rounded-xl border border-gray-800 mb-4">
                              <Key className="w-4 h-4 text-gray-500" />
                              <span className="text-xs text-gray-400 font-bold uppercase">Kod:</span>
                              <input value={formData.accessCode} onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value.toUpperCase() }))} className="bg-transparent text-white font-mono font-bold w-full outline-none uppercase" maxLength={8} />
                          </div>
                      )}

                      {/* Leaderboard Mode */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Resultatvisning</label>
                          <div className="flex gap-2">
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, leaderboardMode: 'global' }))} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${formData.leaderboardMode === 'global' ? 'bg-blue-900/30 border-blue-500 text-blue-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                                  {formData.isPublic ? "🏆 Publik Topplista" : "🏆 Topplista"}
                              </button>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, leaderboardMode: 'private' }))} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${formData.leaderboardMode === 'private' ? 'bg-purple-900/30 border-purple-500 text-purple-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                                  👤 Enskilt Resultat
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Compass className="w-3 h-3"/> Startort</label>
                          <input type="text" value={formData.startCity} onChange={(e) => setFormData(prev => ({ ...prev, startCity: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white" placeholder="Stad" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Flag className="w-3 h-3"/> Målort</label>
                          <input type="text" value={formData.finishCity} onChange={(e) => setFormData(prev => ({ ...prev, finishCity: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white" placeholder="Samma" />
                      </div>
                  </div>

                  {/* Template & Delete Zone */}
                  <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col gap-3">
                      {onCreateTemplate && (
                          <button 
                            type="button" 
                            onClick={() => setShowTemplateModal(true)} 
                            className="w-full py-3 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border border-purple-500/30 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                          >
                              <Copy className="w-4 h-4" /> Spara som Mall (Blueprint)
                          </button>
                      )}
                      
                      {onDelete && (
                          <button type="button" onClick={handleDelete} className="w-full py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                              <Trash2 className="w-4 h-4" /> Radera Event Permanent
                          </button>
                      )}
                  </div>
              </div>
          )}

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-950 shrink-0 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:bg-gray-700 transition-colors">
              Avbryt
            </button>
            <button onClick={handleSubmit} className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center gap-2">
              <Save className="w-4 h-4" /> Spara
            </button>
        </div>

      </div>
    </div>
  );
};
