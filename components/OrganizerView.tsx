
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
import { Settings2 } from 'lucide-react';

interface OrganizerViewProps {
  raceData: RaceEvent;
  userProfile: UserProfile;
  tierConfigs: Record<string, TierConfig>;
  onUpdateRace: (updates: Partial<RaceEvent>) => void;
  onSave: () => void;
  onExit: () => void;
  hasUnsavedChanges: boolean;
  isOnline: boolean;
  onUpgradeRequest: (reason?: string) => void;
  onTestRun: () => void;
  onDeleteEvent?: (id: string) => void;
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
  onDeleteEvent
}) => {
  // --- LOCAL STATE ---
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [placingCheckpointId, setPlacingCheckpointId] = useState<string | null>(null); // New: ID of draft being placed
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Builder Config
  const [cpConfig, setCpConfig] = useState<CheckpointConfig>({
    points: 10,
    type: 'mandatory',
    color: '#3b82f6',
    name: 'Ny CP'
  });

  // AI State (Used for AILoader message & Content Generation)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [aiLoaderMessage, setAiLoaderMessage] = useState("Skriver innehåll...");
  const [analysisData, setAnalysisData] = useState<RaceAnalysis | null>(null);

  const geminiServiceRef = useRef<GeminiService | null>(null);
  const raceDataRef = useRef(raceData);
  useEffect(() => { raceDataRef.current = raceData; }, [raceData]);

  const isLocationSet = React.useMemo(() => {
    return raceData.startLocation.lat !== DEFAULT_COORDINATES.lat || 
           raceData.startLocation.lng !== DEFAULT_COORDINATES.lng;
  }, [raceData.startLocation]);

  // --- INITIALIZATION ---
  useEffect(() => {
    geminiServiceRef.current = new GeminiService(
        (updatedData) => {
             const currentRaceData = raceDataRef.current;
             if (updatedData.checkpoints && currentRaceData.checkpoints.length > 0) {
                 updatedData.checkpoints = updatedData.checkpoints.map(newCp => {
                     const existingCp = currentRaceData.checkpoints.find(c => c.id === newCp.id);
                     if (existingCp) {
                         // Preserve location if AI returns partial update, or overwrite if newCp has location
                         // If AI returns null location (draft), it overwrites existing location?
                         // Instruction says: "Copy exact same coordinates... if exisiting".
                         // Safe to assume we keep existing unless new is explicitly provided AND different?
                         // Actually, let's trust the AI output but fallback to existing location if new is missing/null AND it's an update.
                         // But for Draft Mode feature, we allow AI to create nulls.
                         return {
                             ...newCp,
                             location: newCp.location || existingCp.location, // Prefer new, fallback to old
                             radiusMeters: existingCp.radiusMeters
                         };
                     }
                     return newCp;
                 });
             }
             onUpdateRace(updatedData);
        },
        (analysis) => {
             setAnalysisData(analysis);
             setIsAnalysisOpen(true);
        }
    );
  }, [userProfile.tier, tierConfigs, onUpdateRace]);

  // Initial Session (Silent)
  useEffect(() => {
    if (geminiServiceRef.current && isOnline) {
      geminiServiceRef.current.startNewSession(userProfile.tier);
    }
  }, [isOnline, userProfile.tier]); 

  // --- HANDLERS ---

  const handleContentGeneration = async (prompt: string) => {
    if (!geminiServiceRef.current || !isOnline) return;
    
    // Check for special commands from Sidebar
    if (prompt === "GENERATE_ZOMBIE_MODE") {
        setAiLoaderMessage("Simulerar zombie-utbrott...");
        const startLat = raceData.startLocation.lat;
        const startLng = raceData.startLocation.lng;
        prompt = `
          TASK: Create a 'Zombie Run' scenario.
          Start Location: { lat: ${startLat}, lng: ${startLng} }
          Difficulty: Medium.
          RULES:
          1. Generate 3 "Safe Houses" (Mandatory, Green, 100p).
          2. Generate 5 "Zombie Nests" (Optional, Red, -50p).
          3. Write a dramatic intro description.
          4. Set Category to 'Survival Run'.
        `;
    } else {
        setAiLoaderMessage("Genererar innehåll...");
    }
    
    setIsGeneratingContent(true); 
    
    try {
        const fullPrompt = `CONTEXT: User Location ${raceData.startLocation.lat},${raceData.startLocation.lng}. TASK: ${prompt}. VIKTIGT: Du MÅSTE använda verktyget 'update_race_plan' för att utföra ändringarna. Svara inte bara med text.`;
        const result = await geminiServiceRef.current.sendMessage(fullPrompt);
        
        if (!result.toolCalled) {
            console.warn("AI returned text but no tool call:", result.text);
            alert(`AI:n förstod kommandot men kunde inte uppdatera kartan. Svar från AI: "${result.text || 'Inget svar'}"`);
        }

    } catch (e: any) {
        console.error("Content Gen Error:", e);
        alert(`Ett fel uppstod vid kontakt med AI-tjänsten: ${e.message || "Okänt fel"}. Försök igen.`);
    } finally {
        setIsGeneratingContent(false);
    }
  };

  const handlePublish = async () => {
      // Allow publishing even if some drafts exist? Probably not recommended, but let's enforce at least 1 valid CP
      const validCPs = raceData.checkpoints.filter(cp => cp.location);
      if (validCPs.length === 0 || !isLocationSet) {
          alert("Du måste ha start, mål och minst en placerad checkpoint för att publicera.");
          return;
      }
      if (confirm("Är du redo att publicera?")) {
          onUpdateRace({ status: 'published' });
          setTimeout(() => {
              onSave();
              setIsShareOpen(true);
          }, 100);
      }
  };

  const handleMapClick = (coord: Coordinate) => {
    // 1. PLACING DRAFT MODE
    if (placingCheckpointId) {
        onUpdateRace({
            checkpoints: raceData.checkpoints.map(cp => 
                cp.id === placingCheckpointId ? { ...cp, location: coord } : cp
            )
        });
        setPlacingCheckpointId(null);
        setActiveTool('none'); // Reset
        return;
    }

    // 2. STANDARD TOOLS
    if (activeTool === 'start') {
      onUpdateRace({ startLocation: coord, startLocationConfirmed: true });
    } else if (activeTool === 'finish') {
      onUpdateRace({ finishLocation: { ...raceData.finishLocation, ...coord }, finishLocationConfirmed: true });
    } else if (activeTool === 'checkpoint') {
      const check = accessControlService.canAddCheckpoint(userProfile, raceData.checkpoints.length, tierConfigs);
      if (!check.allowed) {
          onUpgradeRequest(check.message);
          return;
      }
      const newCheckpoint: Checkpoint = {
        id: Date.now().toString(),
        name: cpConfig.name,
        location: coord,
        radiusMeters: 25,
        type: cpConfig.type,
        points: cpConfig.points,
        color: cpConfig.color,
        description: 'Manuell placering',
        level: 2
      };
      onUpdateRace({ checkpoints: [...raceData.checkpoints, newCheckpoint] });
      
      const match = cpConfig.name.match(/(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        setCpConfig(prev => ({ ...prev, name: cpConfig.name.replace(/\d+$/, nextNum.toString()) }));
      }
    }
  };

  const handleStartPlacing = (id: string) => {
      setPlacingCheckpointId(id);
      setActiveTool('none'); // We handle the "tool" visually via MapVisualizer props or just overlay hint?
      // Actually, MapVisualizer uses activeTool to determine if cursor is crosshair.
      // Let's rely on `activeTool` not being 'none' OR pass a specific prop.
      // For simplicity, we can temporarily set activeTool to 'checkpoint' visually, 
      // but logic handles placingId first.
  };

  // Derived state for MapVisualizer to show crosshair
  // We want crosshair if activeTool is set OR if placingCheckpointId is set
  const showCrosshair = activeTool !== 'none' || !!placingCheckpointId;

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
        <AILoader isVisible={isGeneratingContent} message={aiLoaderMessage} />
        
        {/* --- DIALOGS --- */}
        <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} eventName={raceData.name} accessCode={raceData.accessCode || ''} />
        <EventSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} raceData={raceData} onSave={onUpdateRace} onDelete={onDeleteEvent ? () => onDeleteEvent(raceData.id) : undefined} />
        <CheckpointEditorDialog checkpoint={editingCheckpoint} isOpen={!!editingCheckpoint} onClose={() => setEditingCheckpoint(null)} onSave={(updatedCp) => onUpdateRace({ checkpoints: raceData.checkpoints.map(cp => cp.id === updatedCp.id ? updatedCp : cp) })} />
        <AnalysisDialog analysis={analysisData} isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} />
        {isResultsOpen && <ResultManager raceData={raceData} onClose={() => setIsResultsOpen(false)} onUpdateResults={(results) => onUpdateRace({ results })} />}

        {/* --- MISSION CONTROL SIDEBAR --- */}
        <MissionControlPanel 
            isOpen={isPanelOpen}
            setIsOpen={setIsPanelOpen}
            raceData={raceData}
            onUpdateRace={onUpdateRace}
            onExit={onExit}
            onEditCheckpoint={(id) => { const cp = raceData.checkpoints.find(c => c.id === id); if(cp) setEditingCheckpoint(cp); }}
            onDeleteCheckpoint={(id) => onUpdateRace({ checkpoints: raceData.checkpoints.filter(cp => cp.id !== id) })}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onPublish={handlePublish}
            // Builder Props
            cpConfig={cpConfig}
            setCpConfig={setCpConfig}
            onGenerateContent={handleContentGeneration}
            // New Actions
            onTestRun={onTestRun}
            onSettings={() => setIsSettingsOpen(true)}
            onShare={() => setIsShareOpen(true)}
            onStartPlacing={handleStartPlacing}
        />

        {/* --- MAIN AREA (Map) --- */}
        <div className="flex-1 relative h-full w-full">
            
            {/* Placement Toast */}
            {placingCheckpointId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1500] bg-purple-900/90 text-white px-6 py-3 rounded-full shadow-2xl border border-purple-500 animate-in slide-in-from-top-4 flex items-center gap-3">
                    <span className="animate-pulse w-3 h-3 bg-purple-400 rounded-full"></span>
                    <span className="font-bold text-sm">Klicka på kartan för att placera {raceData.checkpoints.find(c => c.id === placingCheckpointId)?.name}</span>
                    <button onClick={() => setPlacingCheckpointId(null)} className="ml-2 bg-purple-800 hover:bg-purple-700 rounded-full p-1 text-xs">Avbryt</button>
                </div>
            )}

            <div className="absolute inset-0 z-0">
                <MapVisualizer 
                    raceData={raceData} 
                    // Pass checkpoint tool style if placing draft, or standard activeTool
                    activeTool={placingCheckpointId ? 'checkpoint' : activeTool}
                    onMapClick={handleMapClick}
                    onDeleteCheckpoint={(id) => onUpdateRace({ checkpoints: raceData.checkpoints.filter(cp => cp.id !== id) })}
                    onEditCheckpoint={(id) => { const cp = raceData.checkpoints.find(c => c.id === id); if(cp) setEditingCheckpoint(cp); }}
                    onUpdateLocation={(id, coord, type) => {
                            if (type === 'start') onUpdateRace({ startLocation: coord, startLocationConfirmed: true });
                            else if (type === 'finish') onUpdateRace({ finishLocation: { ...raceData.finishLocation, ...coord }, finishLocationConfirmed: true });
                            else if (type === 'checkpoint' && id) onUpdateRace({ checkpoints: raceData.checkpoints.map(cp => cp.id === id ? { ...cp, location: coord } : cp) });
                    }}
                    hideLegend={false}
                />
            </div>

        </div>
    </div>
  );
};