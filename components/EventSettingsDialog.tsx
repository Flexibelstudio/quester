




import React, { useState, useRef } from 'react';
import { RaceEvent, TerrainType, StartMode, LeaderboardMode, EventStatus, ScoreModel, WinCondition } from '../types';
import { RACE_CATEGORIES, EVENT_TYPES } from '../constants';
import { api } from '../services/dataService';
import { X, Save, Type, FileText, Tag, Map, Key, Calendar, Globe, Route, Shuffle, Trees, Mountain, PlayCircle, Clock, Lock, Languages, Eye, User, Archive, AlertTriangle, MousePointer2, Image as ImageIcon, Upload, Loader2, Navigation, Flag, Trash2, Trophy, Calculator } from 'lucide-react';

interface EventSettingsDialogProps {
  raceData: RaceEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<RaceEvent>) => void;
  onDelete?: () => void; // New prop for deletion
}

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Utkast (Planering)',
  published: 'Publicerad (Redo)',
  active: 'Pågående (Live)',
  completed: 'Avslutad (Stängd)',
  archived: 'Arkiverad (Historik)'
};

export const EventSettingsDialog: React.FC<EventSettingsDialogProps> = ({ raceData, isOpen, onClose, onSave, onDelete }) => {
  // Helper to format ISO string to "YYYY-MM-DDTHH:mm" for local input
  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset(); 
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    mapStyle: raceData.mapStyle || 'google_standard',
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
        mapStyle: raceData.mapStyle || 'google_standard',
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

  // Determine categories to show: Standard list + Current category (if it's a hidden system category like 'Survival Run')
  // Using Set to deduplicate
  const availableCategories = Array.from(new Set([formData.category, ...RACE_CATEGORIES]));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Redigera Inställningar
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* Cover Image Upload */}
          <div className="relative w-full h-32 rounded-xl bg-gray-900 border-2 border-dashed border-gray-600 overflow-hidden group hover:border-gray-500 transition-colors">
              {formData.coverImage ? (
                  <>
                    <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-xs font-bold text-white flex items-center gap-2"><Upload className="w-4 h-4" /> Byt Bild</span>
                    </div>
                  </>
              ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                      {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-8 h-8" />}
                      <span className="text-xs font-bold uppercase tracking-wider">{isUploading ? 'Laddar upp...' : 'Ladda upp omslagsbild'}</span>
                  </div>
              )}
              <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isUploading}
              />
          </div>

          {/* Status & Lifecycle Section */}
          <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl">
             <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Archive className="w-3 h-3" /> Eventstatus & Licens
             </label>
             <div className="space-y-3">
                 <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as EventStatus }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                 >
                     <option value="draft">🟡 Utkast (Planering)</option>
                     <option value="published">🟢 Publicerad (Redo för start)</option>
                     <option value="active">🔵 Pågående (Live)</option>
                     <option value="completed">🏁 Avslutad (Stängd)</option>
                     <option value="archived">🗄️ Arkiverad (Räknas ej mot kvot)</option>
                 </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Type className="w-3 h-3" /> Namn
                </label>
                <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="T.ex. Höstrusket 2025"
                />
            </div>
            
            {/* Category */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Kategori
                </label>
                <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                    {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
          </div>

          {/* Location / City Inputs */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> Startort (Stad)
                  </label>
                  <input
                    type="text"
                    value={formData.startCity}
                    onChange={(e) => setFormData(prev => ({ ...prev, startCity: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="T.ex. Stockholm"
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Flag className="w-3 h-3" /> Målort (Stad)
                  </label>
                  <input
                    type="text"
                    value={formData.finishCity}
                    onChange={(e) => setFormData(prev => ({ ...prev, finishCity: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Lämna tom om samma"
                  />
              </div>
          </div>

          {/* Scoring & Win Conditions */}
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
              <label className="block text-xs font-bold text-yellow-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calculator className="w-3 h-3" /> Vinstvillkor & Poängmodell
              </label>
              
              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-gray-400 block mb-2">Vad avgör vinnaren?</label>
                      <div className="grid grid-cols-2 gap-3">
                          <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, winCondition: 'fastest_time', scoreModel: 'basic' }))}
                              className={`p-2 rounded text-sm font-bold border transition-colors ${formData.winCondition === 'fastest_time' ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
                          >
                              Snabbast i Mål
                          </button>
                          <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, winCondition: 'most_points' }))}
                              className={`p-2 rounded text-sm font-bold border transition-colors ${formData.winCondition === 'most_points' ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
                          >
                              Flest Poäng
                          </button>
                      </div>
                  </div>

                  {formData.winCondition === 'most_points' && (
                      <div className="animate-in slide-in-from-top-2 duration-300 space-y-4 pt-4 border-t border-gray-700">
                          <div>
                              <label className="text-xs text-gray-400 block mb-2">Poängmodell</label>
                              <select
                                  value={formData.scoreModel}
                                  onChange={(e) => setFormData(prev => ({ ...prev, scoreModel: e.target.value as any }))}
                                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                              >
                                  <option value="basic">Grund (Ingen tidsfaktor)</option>
                                  <option value="rogaining">Rogaining (Tidsstraff)</option>
                                  <option value="time_bonus">Tidsbonus (Snabb = Mer Poäng)</option>
                              </select>
                          </div>

                          {formData.scoreModel === 'rogaining' && (
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Maxtid (min)</label>
                                      <input 
                                          type="number" 
                                          value={formData.timeLimitMinutes}
                                          onChange={e => setFormData(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) }))}
                                          className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Straff / min (p)</label>
                                      <input 
                                          type="number" 
                                          value={formData.pointsPerMinute}
                                          onChange={e => setFormData(prev => ({ ...prev, pointsPerMinute: parseInt(e.target.value) }))}
                                          className="w-full bg-gray-900 border border-red-900 text-red-300 rounded p-2 text-sm"
                                      />
                                  </div>
                              </div>
                          )}

                          {formData.scoreModel === 'time_bonus' && (
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Par-tid (min)</label>
                                      <input 
                                          type="number" 
                                          value={formData.parTimeMinutes}
                                          onChange={e => setFormData(prev => ({ ...prev, parTimeMinutes: parseInt(e.target.value) }))}
                                          className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Bonus / min (p)</label>
                                      <input 
                                          type="number" 
                                          value={formData.pointsPerMinute}
                                          onChange={e => setFormData(prev => ({ ...prev, pointsPerMinute: parseInt(e.target.value) }))}
                                          className="w-full bg-gray-900 border border-green-900 text-green-300 rounded p-2 text-sm"
                                      />
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* Terrain & Order */}
          <div className="grid grid-cols-2 gap-4">
              {/* Checkpoint Order */}
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Route className="w-3 h-3" /> Banläggning
                  </label>
                  <select
                      value={formData.checkpointOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, checkpointOrder: e.target.value as any }))}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                      <option value="free">Valfri Ordning (Poängjakt)</option>
                      <option value="sequential">Sekventiell (1-2-3)</option>
                  </select>
              </div>

              {/* Terrain Preference */}
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Trees className="w-3 h-3" /> Terrängtyp
                  </label>
                  <select
                      value={formData.terrainType}
                      onChange={(e) => setFormData(prev => ({ ...prev, terrainType: e.target.value as TerrainType }))}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                      <option value="trail">Mestadels Stig/Väg</option>
                      <option value="mixed">Blandat</option>
                      <option value="off_road">Obanat (Svårt)</option>
                      <option value="urban">Stadsmiljö</option>
                  </select>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Start Date & Time */}
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Starttid / Datum
                </label>
                <div className="grid grid-cols-2 gap-4 items-center">
                    <input
                        type="datetime-local"
                        value={formData.startDateTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    
                    {formData.startMode === 'mass_start' && (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    checked={formData.manualStartEnabled}
                                    onChange={(e) => setFormData(prev => ({ ...prev, manualStartEnabled: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                            <span className="text-xs font-bold text-gray-300">Tillåt manuell startknapp</span>
                        </label>
                    )}
                </div>
            </div>
            
            {/* Access Code */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Key className="w-3 h-3" /> Eventkod
                </label>
                <input
                type="text"
                value={formData.accessCode}
                onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value.toUpperCase() }))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="KOD123"
                maxLength={8}
                />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Instruktioner / Beskrivning
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none text-sm"
              placeholder="Beskriv området, regler eller allmän information..."
            />
          </div>

          {/* Delete Event Zone */}
          {onDelete && (
              <div className="mt-8 pt-6 border-t border-red-900/30">
                  <h3 className="text-red-500 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Danger Zone
                  </h3>
                  <button 
                    type="button" 
                    onClick={handleDelete}
                    className="w-full py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                      <Trash2 className="w-4 h-4" /> Radera Event Permanent
                  </button>
                  <p className="text-[10px] text-red-400/60 mt-2 text-center">
                      Detta tar bort eventet och alla resultat. Åtgärden kan inte ångras.
                  </p>
              </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-2 mt-4 border-t border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Spara Ändringar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};