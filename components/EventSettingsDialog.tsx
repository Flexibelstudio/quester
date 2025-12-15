
import React, { useState, useRef } from 'react';
import { RaceEvent, TerrainType, StartMode, LeaderboardMode, EventStatus, ScoreModel, WinCondition } from '../types';
import { RACE_CATEGORIES, EVENT_TYPES } from '../constants';
import { api } from '../services/dataService';
import { X, Save, Flag, Trophy, Globe, Upload, Loader2, ImageIcon, Calculator, Clock, AlertTriangle, Users, Play, Lock, Key, Trash2, LayoutTemplate, Compass, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface EventSettingsDialogProps {
  raceData: RaceEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<RaceEvent>) => void;
  onDelete?: () => void;
}

type SettingsTab = 'concept' | 'rules' | 'logistics';

export const EventSettingsDialog: React.FC<EventSettingsDialogProps> = ({ raceData, isOpen, onClose, onSave, onDelete }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('concept');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
        scoreModel: formData.scoreModel as ScoreModel
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

  // Determine categories to show
  const availableCategories = Array.from(new Set([formData.category, ...RACE_CATEGORIES]));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-950 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Inställningar: {raceData.name}
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

          {/* TAB 2: REGLER */}
          {activeTab === 'rules' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  
                  {/* Vinstvillkor */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Vinstvillkor</label>
                      <div className="grid grid-cols-2 gap-4">
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, winCondition: 'fastest_time', scoreModel: 'basic', checkpointOrder: 'sequential' }))} className={`p-4 rounded-xl border text-left transition-all ${formData.winCondition === 'fastest_time' ? 'bg-blue-900/20 border-blue-500 text-white shadow-lg' : 'bg-gray-950 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                              <div className="flex justify-between mb-2">
                                  <Clock className={`w-6 h-6 ${formData.winCondition === 'fastest_time' ? 'text-blue-400' : 'text-gray-600'}`} />
                                  {formData.winCondition === 'fastest_time' && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                              </div>
                              <div className="font-bold mb-1">Snabbast Tid</div>
                              <div className="text-xs opacity-70">Först i mål vinner.</div>
                          </button>
                          
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, winCondition: 'most_points', checkpointOrder: 'free' }))} className={`p-4 rounded-xl border text-left transition-all ${formData.winCondition === 'most_points' ? 'bg-yellow-900/20 border-yellow-500 text-white shadow-lg' : 'bg-gray-950 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                              <div className="flex justify-between mb-2">
                                  <Trophy className={`w-6 h-6 ${formData.winCondition === 'most_points' ? 'text-yellow-400' : 'text-gray-600'}`} />
                                  {formData.winCondition === 'most_points' && <CheckCircle2 className="w-5 h-5 text-yellow-500" />}
                              </div>
                              <div className="font-bold mb-1">Flest Poäng</div>
                              <div className="text-xs opacity-70">Samla poäng.</div>
                          </button>
                      </div>
                  </div>

                  {/* Poängmodell (Advanced Scoring) - Only valid for "Most Points" */}
                  {formData.winCondition === 'most_points' && (
                      <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                          <h3 className="text-sm font-bold text-yellow-200 uppercase tracking-wide mb-4 flex items-center gap-2">
                              <Calculator className="w-4 h-4" /> Poängmodell & Regler
                          </h3>
                          
                          <div className="mb-4">
                              <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Speltyp</label>
                              <select value={formData.scoreModel} onChange={(e) => setFormData(prev => ({ ...prev, scoreModel: e.target.value as any }))} className="w-full bg-gray-900 border border-yellow-500/30 rounded-xl px-4 py-2 text-white">
                                  <option value="basic">Grund (Ingen tidsfaktor)</option>
                                  <option value="rogaining">Rogaining (Maxtid + Straff)</option>
                                  <option value="time_bonus">Tidsbonus (Snabb = Mer Poäng)</option>
                              </select>
                          </div>

                          {/* Rogaining Settings */}
                          {formData.scoreModel === 'rogaining' && (
                              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-yellow-500/20">
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Maxtid (min)</label>
                                      <input type="number" value={formData.timeLimitMinutes} onChange={e => setFormData(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-red-400 uppercase mb-1 flex items-center gap-1"><AlertOctagon className="w-3 h-3"/> Straff / min</label>
                                      <input type="number" value={formData.pointsPerMinute} onChange={e => setFormData(prev => ({ ...prev, pointsPerMinute: parseInt(e.target.value) }))} className="w-full bg-gray-900 border border-red-900/50 text-red-300 rounded-lg p-2" />
                                  </div>
                              </div>
                          )}

                          {/* Time Bonus Settings */}
                          {formData.scoreModel === 'time_bonus' && (
                              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-yellow-500/20">
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Par-tid (min)</label>
                                      <input type="number" value={formData.parTimeMinutes} onChange={e => setFormData(prev => ({ ...prev, parTimeMinutes: parseInt(e.target.value) }))} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-green-400 uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Bonus / min</label>
                                      <input type="number" value={formData.pointsPerMinute} onChange={e => setFormData(prev => ({ ...prev, pointsPerMinute: parseInt(e.target.value) }))} className="w-full bg-gray-900 border border-green-900/50 text-green-300 rounded-lg p-2" />
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banläggning</label>
                          <select value={formData.checkpointOrder} onChange={(e) => setFormData(prev => ({ ...prev, checkpointOrder: e.target.value as any }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white">
                              <option value="free">Valfri Ordning (Poängjakt)</option>
                              <option value="sequential">Sekventiell (1-2-3)</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Terräng</label>
                          <select value={formData.terrainType} onChange={(e) => setFormData(prev => ({ ...prev, terrainType: e.target.value as TerrainType }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white">
                              <option value="trail">Stig/Väg</option>
                              <option value="mixed">Blandat</option>
                              <option value="off_road">Obanat</option>
                              <option value="urban">Stad</option>
                          </select>
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

                  {/* Delete Zone */}
                  {onDelete && (
                      <div className="mt-8 pt-6 border-t border-red-900/30">
                          <button type="button" onClick={handleDelete} className="w-full py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                              <Trash2 className="w-4 h-4" /> Radera Event Permanent
                          </button>
                      </div>
                  )}
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
