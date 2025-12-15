
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
import { ContentGeneratorDialog } from './ContentGeneratorDialog';
import { ShareDialog } from './ShareDialog';
import { AILoader } from './AILoader';
import { MissionControlPanel } from './MissionControlPanel';
import { MousePointer2, PlayCircle, Flag, Plus, Wand2, BrainCircuit, Settings2 } from 'lucide-react';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  
  // Mission Control Visibility (Desktop persistent, Mobile toggle)
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Builder Config
  const [cpConfig, setCpConfig] = useState<CheckpointConfig>({
    points: 10,
    type: 'mandatory',
    color: '#3b82f6',
    name: 'Ny CP'
  });

  // AI & Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
                         return {
                             ...newCp,
                             location: existingCp.location,
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

  // Initial Chat Message
  useEffect(() => {
    if (geminiServiceRef.current && isOnline) {
      geminiServiceRef.current.startNewSession(userProfile.tier);
      if (!isLocationSet) {
           setMessages([{ id: '1', role: 'model', text: `👋 Hej! Börja med att dra ut **Start** och **Mål** på kartan.` }]);
      } else {
           setMessages([{ id: '1', role: 'model', text: `Jag är redo. Vad vill du skapa idag?` }]);
      }
    }
  }, [isOnline, userProfile.tier, isLocationSet]); 

  // --- HANDLERS ---

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !geminiServiceRef.current) return;
    if (!isLocationSet) {
        alert("Sätt start/mål först.");
        return;
    }
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
    setIsLoading(true);

    const checkpointContext = JSON.stringify(
        raceData.checkpoints.map(cp => ({
            id: cp.id,
            name: cp.name,
            desc: cp.description,
            hasQuiz: !!cp.quiz,
            hasChallenge: !!cp.challenge
        }))
    );

    const contextPrompt = `
      CURRENT STATE:
      Event Type: ${raceData.eventType}
      Status: ${raceData.status}
      Language: ${raceData.language || 'sv'}
      Checkpoints List: ${checkpointContext}
      Start Coordinates: ${raceData.startLocation.lat}, ${raceData.startLocation.lng}
      Finish Coordinates: ${raceData.finishLocation.lat}, ${raceData.finishLocation.lng}
      USER REQUEST: "${text}"
    `;

    try {
      const responseText = await geminiServiceRef.current.sendMessage(contextPrompt);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "AI Error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentGeneration = async (prompt: string) => {
    if (!geminiServiceRef.current || !isOnline) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: `🪄 ${prompt}` }]);
    
    setAiLoaderMessage("Skapar innehåll...");
    setIsLoading(true);
    setIsGeneratingContent(true); 
    
    try {
        const fullPrompt = `CONTEXT: ... (omitted for brevity) ... TASK: ${prompt}`; // Re-use logic
        const responseText = await geminiServiceRef.current.sendMessage(fullPrompt);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
        setIsGeneratingContent(false);
    }
  };

  const handleRequestAnalysis = async () => {
    if (!geminiServiceRef.current || !isOnline) return;
    setAiLoaderMessage("Analyserar banan...");
    setIsGeneratingContent(true);
    try {
      await geminiServiceRef.current.sendMessage("Analyze this race plan...");
    } catch (e) {
      alert("Kunde inte genomföra analysen just nu.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handlePublish = async () => {
      if (raceData.checkpoints.length === 0 || !isLocationSet) {
          alert("Du måste ha start, mål och checkpoints för att publicera.");
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
    if (activeTool === 'start') {
      onUpdateRace({ startLocation: coord });
    } else if (activeTool === 'finish') {
      onUpdateRace({ finishLocation: { ...raceData.finishLocation, ...coord } });
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

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
        <AILoader isVisible={isGeneratingContent} message={aiLoaderMessage} />
        
        {/* --- DIALOGS --- */}
        <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} eventName={raceData.name} accessCode={raceData.accessCode || ''} />
        <EventSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} raceData={raceData} onSave={onUpdateRace} onDelete={onDeleteEvent ? () => onDeleteEvent(raceData.id) : undefined} />
        <CheckpointEditorDialog checkpoint={editingCheckpoint} isOpen={!!editingCheckpoint} onClose={() => setEditingCheckpoint(null)} onSave={(updatedCp) => onUpdateRace({ checkpoints: raceData.checkpoints.map(cp => cp.id === updatedCp.id ? updatedCp : cp) })} />
        <AnalysisDialog analysis={analysisData} isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} />
        <ContentGeneratorDialog isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} onGenerate={handleContentGeneration} onApplyUpdate={onUpdateRace} currentRaceData={raceData} />
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
            messages={messages}
            onSendMessage={handleSendMessage}
            isChatLoading={isLoading}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onPublish={handlePublish}
        />

        {/* --- MAIN AREA (Map + Floating Tools) --- */}
        <div className="flex-1 relative h-full w-full">
            
            {/* Map */}
            <div className="absolute inset-0 z-0">
                <MapVisualizer 
                    raceData={raceData} 
                    activeTool={activeTool}
                    onMapClick={handleMapClick}
                    onDeleteCheckpoint={(id) => onUpdateRace({ checkpoints: raceData.checkpoints.filter(cp => cp.id !== id) })}
                    onEditCheckpoint={(id) => { const cp = raceData.checkpoints.find(c => c.id === id); if(cp) setEditingCheckpoint(cp); }}
                    onUpdateLocation={(id, coord, type) => {
                            if (type === 'start') onUpdateRace({ startLocation: coord });
                            else if (type === 'finish') onUpdateRace({ finishLocation: { ...raceData.finishLocation, ...coord } });
                            else if (type === 'checkpoint' && id) onUpdateRace({ checkpoints: raceData.checkpoints.map(cp => cp.id === id ? { ...cp, location: coord } : cp) });
                    }}
                    hideLegend={false}
                />
            </div>

            {/* Top Right Actions (Settings, Test Run) */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3 bg-gray-900/80 hover:bg-gray-800 text-white rounded-xl shadow-lg backdrop-blur border border-gray-700"
                    title="Inställningar"
                >
                    <Settings2 className="w-5 h-5" />
                </button>
                <button
                    onClick={onTestRun}
                    className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg font-bold text-xs uppercase tracking-wider"
                >
                    Test Run
                </button>
            </div>

            {/* Bottom Floating Dock (Tools) */}
            <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-none">
                <div className="bg-gray-900/90 backdrop-blur-md p-2 rounded-2xl flex items-center gap-2 shadow-2xl pointer-events-auto border border-gray-700">
                    
                    <button 
                        onClick={() => setActiveTool('none')}
                        className={`p-3 rounded-xl transition-all ${activeTool === 'none' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Navigera"
                    >
                        <MousePointer2 className="w-5 h-5" />
                    </button>
                    
                    <div className="w-px h-8 bg-gray-700 mx-1"></div>

                    <button 
                        onClick={() => setActiveTool('start')}
                        className={`px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTool === 'start' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-green-400'}`}
                    >
                        <PlayCircle className="w-5 h-5" />
                        <span className="hidden md:inline text-xs font-bold uppercase">Start</span>
                    </button>

                    <button 
                        onClick={() => setActiveTool('finish')}
                        className={`px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTool === 'finish' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-red-400'}`}
                    >
                        <Flag className="w-5 h-5" />
                        <span className="hidden md:inline text-xs font-bold uppercase">Mål</span>
                    </button>

                    <button 
                        onClick={() => setActiveTool('checkpoint')}
                        className={`px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTool === 'checkpoint' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-400'}`}
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline text-xs font-bold uppercase">CP</span>
                    </button>

                    <div className="w-px h-8 bg-gray-700 mx-1"></div>

                    <button 
                        onClick={() => setIsGeneratorOpen(true)}
                        className="p-3 rounded-xl text-purple-400 hover:bg-purple-900/30"
                        title="AI Wizard"
                    >
                        <Wand2 className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={handleRequestAnalysis}
                        className="p-3 rounded-xl text-blue-400 hover:bg-blue-900/30"
                        title="AI Analys"
                    >
                        <BrainCircuit className="w-5 h-5" />
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};
