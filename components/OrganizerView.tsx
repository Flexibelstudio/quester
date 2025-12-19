
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { accessControlService } from '../services/accessControl';
import { RaceEvent, ChatMessage, Coordinate, Checkpoint, RaceAnalysis, UserProfile, TierConfig } from '../types';
import { DEFAULT_COORDINATES } from '../constants';
import { MapVisualizer } from './MapVisualizer';
import { EventSettingsDialog } from './EventSettingsDialog';
import { CheckpointEditorDialog } from './CheckpointEditorDialog';
import { ResultManager } from './ResultManager';
import { AnalysisDialog } from './AnalysisDialog';
import { ShareDialog } from './ShareDialog';
import { AILoader } from './AILoader';
import { MissionControlPanel } from './MissionControlPanel';
import { Settings2, Rocket } from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';

interface OrganizerViewProps {
  raceData: RaceEvent;
  userProfile: UserProfile;
  tierConfigs: Record<string, TierConfig>;
  onUpdateRace: (updates: Partial<RaceEvent>) => void;
  onSave: (updates?: Partial<RaceEvent>) => void;
  onExit: () => void;
  hasUnsavedChanges: boolean;
  isOnline: boolean;
  onUpgradeRequest: (reason?: string) => void;
  onTestRun: () => void;
  onDeleteEvent?: (id: string) => void;
  onCreateTemplate?: (templateData: RaceEvent) => void;
}

type ToolType = 'none' | 'start' | 'finish' | 'checkpoint';

interface CheckpointConfig {
  points: number;
  type: 'mandatory' | 'optional';
  color: string;
  name: string;
}

export const OrganizerView: React.FC<OrganizerViewProps> = ({
  raceData,
  userProfile,
  tierConfigs,
  onUpdateRace,
  onSave,
  onExit,
  isOnline,
  onUpgradeRequest,
  onTestRun,
  onDeleteEvent,
  onCreateTemplate
}) => {
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [placingCheckpointId, setPlacingCheckpointId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [editingSpecialType, setEditingSpecialType] = useState<'checkpoint' | 'start' | 'finish'>('checkpoint');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [cpConfig, setCpConfig] = useState<CheckpointConfig>({
    points: 10,
    type: 'mandatory',
    color: '#3b82f6',
    name: 'Ny CP'
  });

  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [aiLoaderMessage, setAiLoaderMessage] = useState("AI-Arkitekten arbetar...");
  const [analysisData, setAnalysisData] = useState<RaceAnalysis | null>(null);

  const geminiServiceRef = useRef<GeminiService | null>(null);
  const raceDataRef = useRef(raceData);
  useEffect(() => { raceDataRef.current = raceData; }, [raceData]);

  const isLocationSet = React.useMemo(() => {
    return raceData.startLocation.lat !== DEFAULT_COORDINATES.lat || 
           raceData.startLocation.lng !== DEFAULT_COORDINATES.lng;
  }, [raceData.startLocation]);

  useEffect(() => {
    geminiServiceRef.current = new GeminiService(
        (updatedData) => {
             const currentRaceData = raceDataRef.current;
             if (updatedData.checkpoints) {
                 const mergedCheckpoints = [...currentRaceData.checkpoints];
                 updatedData.checkpoints.forEach((incomingCp: Checkpoint) => {
                     if (!incomingCp.id) incomingCp.id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                     const existingIdx = mergedCheckpoints.findIndex(c => c.id === incomingCp.id);
                     if (existingIdx !== -1) {
                         mergedCheckpoints[existingIdx] = { ...mergedCheckpoints[existingIdx], ...incomingCp };
                     } else {
                         const newCp = { ...incomingCp };
                         if (!newCp.location) newCp.location = null;
                         mergedCheckpoints.push(newCp);
                     }
                 });
                 updatedData.checkpoints = mergedCheckpoints;
             }
             onUpdateRace(updatedData);
        },
        (analysis) => {
             setAnalysisData(analysis);
             setIsAnalysisOpen(true);
        }
    );
  }, [onUpdateRace]);

  useEffect(() => {
    if (geminiServiceRef.current && isOnline) {
      geminiServiceRef.current.startNewSession(userProfile.tier);
    }
  }, [isOnline, userProfile.tier]); 

  const handleContentGeneration = async (prompt: string) => {
    if (!geminiServiceRef.current || !isOnline) return;
    
    if (prompt.includes("Mysterium")) setAiLoaderMessage("Väver en mystisk historia...");
    else if (prompt.includes("Quiz")) setAiLoaderMessage("Skapar kluriga frågor...");
    else if (prompt.includes("Action")) setAiLoaderMessage("Planerar utmaningar...");
    else setAiLoaderMessage("AI-Arkitekten arbetar...");
    
    setIsGeneratingContent(true); 
    
    try {
        const fullPrompt = `CONTEXT: Current race data provided. TASK: ${prompt}.`;
        // PASS forceTool: true because this is a generation task
        const result = await geminiServiceRef.current.sendMessage(fullPrompt, true);
        
        if (!result.toolCalled) {
            console.warn("AI returned text but no tool call:", result.text);
            alert(`AI:n förstod kommandot men kunde inte uppdatera kartan. Svar från AI: "${result.text}"`);
        }
    } catch (e: any) {
        alert(`Ett fel uppstod: ${e.message || "Okänt fel"}.`);
    } finally {
        setIsGeneratingContent(false);
    }
  };

  const handlePublishRequest = () => {
      const validCPs = raceData.checkpoints.filter(cp => cp.location);
      if (validCPs.length === 0 || !isLocationSet) {
          alert("Du måste ha start, mål och minst en placerad checkpoint för att publicera.");
          return;
      }
      setShowPublishDialog(true);
  };

  const confirmPublish = () => {
      onSave({ status: 'published' });
      setIsShareOpen(true);
  };

  const handleMapClick = (coord: Coordinate) => {
    if (placingCheckpointId) {
        onUpdateRace({ checkpoints: raceData.checkpoints.map(cp => cp.id === placingCheckpointId ? { ...cp, location: coord } : cp) });
        setPlacingCheckpointId(null);
        setActiveTool('none');
        return;
    }
    if (activeTool === 'start') {
      onUpdateRace({ startLocation: { ...raceData.startLocation, ...coord }, startLocationConfirmed: true });
    } else if (activeTool === 'finish') {
      onUpdateRace({ finishLocation: { ...raceData.finishLocation, ...coord }, finishLocationConfirmed: true });
    } else if (activeTool === 'checkpoint') {
      const check = accessControlService.canAddCheckpoint(userProfile, raceData.checkpoints.length, tierConfigs);
      if (!check.allowed) { onUpgradeRequest(check.message); return; }
      const effectiveType = raceData.checkpointOrder === 'sequential' ? 'mandatory' : cpConfig.type;
      const newCheckpoint: Checkpoint = {
        id: Date.now().toString(),
        name: cpConfig.name,
        location: coord,
        radiusMeters: 25,
        type: effectiveType,
        points: cpConfig.points,
        color: cpConfig.color,
        description: 'Manuell placering'
      };
      onUpdateRace({ checkpoints: [...raceData.checkpoints, newCheckpoint] });
      const match = cpConfig.name.match(/(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        setCpConfig(prev => ({ ...prev, name: cpConfig.name.replace(/\d+$/, nextNum.toString()) }));
      }
    }
  };

  const handleStartPlacing = (id: string) => { setPlacingCheckpointId(id); setActiveTool('none'); };

  const handleEditSpecial = (type: 'start' | 'finish') => {
      setEditingSpecialType(type);
      const fakeCheckpoint: Checkpoint = {
          id: type,
          name: type === 'start' ? 'Startplats' : 'Målområde',
          location: type === 'start' ? raceData.startLocation : raceData.finishLocation,
          radiusMeters: type === 'start' ? (raceData.startLocation.radiusMeters || 50) : raceData.finishLocation.radiusMeters,
          type: 'mandatory',
          points: 0,
          color: '#ffffff'
      };
      setEditingCheckpoint(fakeCheckpoint);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
        <AILoader isVisible={isGeneratingContent} message={aiLoaderMessage} />
        <ConfirmationDialog isOpen={showPublishDialog} onClose={() => setShowPublishDialog(false)} onConfirm={confirmPublish} title="Gå Live?" description="När du publicerar blir eventet tillgängligt för deltagare med koden. Är du redo?" confirmText="Publicera Nu" variant="success" icon={Rocket} />
        <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} eventName={raceData.name} accessCode={raceData.accessCode || ''} />
        <EventSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} raceData={raceData} onSave={(updates) => { onUpdateRace(updates); onSave(updates); }} onDelete={onDeleteEvent ? () => onDeleteEvent(raceData.id) : undefined} onCreateTemplate={onCreateTemplate} />
        <CheckpointEditorDialog checkpoint={editingCheckpoint} isOpen={!!editingCheckpoint} onClose={() => { setEditingCheckpoint(null); setEditingSpecialType('checkpoint'); }} variant={editingSpecialType} checkpointOrder={raceData.checkpointOrder} onSave={(updatedCp) => { if (updatedCp.id === 'start') onUpdateRace({ startLocation: { ...raceData.startLocation, radiusMeters: updatedCp.radiusMeters }}); else if (updatedCp.id === 'finish') onUpdateRace({ finishLocation: { ...raceData.finishLocation, radiusMeters: updatedCp.radiusMeters }}); else onUpdateRace({ checkpoints: raceData.checkpoints.map(cp => cp.id === updatedCp.id ? updatedCp : cp) }); }} />
        <AnalysisDialog analysis={analysisData} isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} />
        {isResultsOpen && <ResultManager raceData={raceData} onClose={() => setIsResultsOpen(false)} onUpdateResults={(results) => onUpdateRace({ results })} />}

        <MissionControlPanel isOpen={isPanelOpen} setIsOpen={setIsPanelOpen} raceData={raceData} onUpdateRace={onUpdateRace} onExit={onExit} onEditCheckpoint={(id) => { const cp = raceData.checkpoints.find(c => c.id === id); if(cp) { setEditingCheckpoint(cp); setEditingSpecialType('checkpoint'); } }} onDeleteCheckpoint={(id) => onUpdateRace({ checkpoints: raceData.checkpoints.filter(cp => cp.id !== id) })} activeTool={activeTool} setActiveTool={setActiveTool} onPublish={handlePublishRequest} cpConfig={cpConfig} setCpConfig={setCpConfig} onGenerateContent={handleContentGeneration} onTestRun={onTestRun} onSettings={() => setIsSettingsOpen(true)} onShare={() => setIsShareOpen(true)} onStartPlacing={handleStartPlacing} />

        <div className="flex-1 relative h-full w-full">
            {placingCheckpointId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1500] bg-purple-900/90 text-white px-6 py-3 rounded-full shadow-2xl border border-purple-500 animate-in slide-in-from-top-4 flex items-center gap-3">
                    <span className="animate-pulse w-3 h-3 bg-purple-400 rounded-full"></span>
                    <span className="font-bold text-sm">Klicka på kartan för att placera {raceData.checkpoints.find(c => c.id === placingCheckpointId)?.name}</span>
                    <button onClick={() => setPlacingCheckpointId(null)} className="ml-2 bg-purple-800 hover:bg-purple-700 rounded-full p-1 text-xs">Avbryt</button>
                </div>
            )}
            <div className="absolute inset-0 z-0">
                <MapVisualizer raceData={raceData} activeTool={placingCheckpointId ? 'checkpoint' : activeTool} onMapClick={handleMapClick} onDeleteCheckpoint={(id) => onUpdateRace({ checkpoints: raceData.checkpoints.filter(cp => cp.id !== id) })} onEditCheckpoint={(id) => { const cp = raceData.checkpoints.find(c => c.id === id); if(cp) { setEditingCheckpoint(cp); setEditingSpecialType('checkpoint'); } }} onUpdateLocation={(id, coord, type) => { if (type === 'start') onUpdateRace({ startLocation: { ...raceData.startLocation, ...coord }, startLocationConfirmed: true }); else if (type === 'finish') onUpdateRace({ finishLocation: { ...raceData.finishLocation, ...coord }, finishLocationConfirmed: true }); else if (type === 'checkpoint' && id) onUpdateRace({ checkpoints: raceData.checkpoints.map(cp => cp.id === id ? { ...cp, location: coord } : cp) }); }} hideLegend={false} onEditSpecial={handleEditSpecial} />
            </div>
        </div>
    </div>
  );
};
