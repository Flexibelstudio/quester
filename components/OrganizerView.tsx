
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { accessControlService } from '../services/accessControl';
import { RaceEvent, ChatMessage, Coordinate, Checkpoint, RaceAnalysis, UserProfile, TierConfig, EventStatus } from '../types';
import { DEFAULT_COORDINATES } from '../constants';
import { MapVisualizer } from './MapVisualizer';
import { DataPanel } from './DataPanel';
import { EventSettingsDialog } from './EventSettingsDialog';
import { CheckpointEditorDialog } from './CheckpointEditorDialog';
import { ResultManager } from './ResultManager';
import { AnalysisDialog } from './AnalysisDialog';
import { ContentGeneratorDialog } from './ContentGeneratorDialog';
import { ShareDialog } from './ShareDialog';
import { AILoader } from './AILoader';
import { OnboardingGuide } from './OnboardingGuide';
import { Send, Bot, User, Settings, LayoutGrid, Save, PanelLeftClose, PanelLeftOpen, MousePointer2, PlayCircle, Flag, Plus, Sparkles, Lock, Wand2, Trophy, LogOut, Compass, Share2, X, List, Archive, CheckCircle2, Play, Rocket, ChevronLeft, Map, Grid3X3, ArrowUpRight, HelpCircle, BrainCircuit, Gamepad2, Clock, AlertTriangle, Globe } from 'lucide-react';

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
  onDeleteEvent?: (id: string) => void; // Added for self-deletion
}

type ToolType = 'none' | 'start' | 'finish' | 'checkpoint';

interface CheckpointConfig {
  points: number;
  type: 'mandatory' | 'optional';
  color: string;
  name: string;
}

const StatusHeaderBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
    let colorClass = 'bg-gray-800/80 text-gray-400 border-gray-600';
    let label = 'Utkast';
    let icon = <Settings className="w-3 h-3" />;
    
    if (status === 'active') { colorClass = 'bg-blue-500/20 text-blue-300 border-blue-500/50 animate-pulse'; label = 'Pågående'; icon = <PlayCircle className="w-3 h-3" />; }
    else if (status === 'published') { colorClass = 'bg-green-500/20 text-green-300 border-green-500/50'; label = 'Publicerad'; icon = <Globe className="w-3 h-3" />; }
    else if (status === 'completed') { colorClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50'; label = 'Avslutad'; icon = <CheckCircle2 className="w-3 h-3" />; }
    else if (status === 'archived') { colorClass = 'bg-gray-800 text-gray-500 border-gray-700'; label = 'Arkiverad'; icon = <Archive className="w-3 h-3" />; }

    return (
        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border backdrop-blur-sm ${colorClass}`}>
            {icon} {label}
        </span>
    );
};

export const OrganizerView: React.FC<OrganizerViewProps> = ({
  raceData,
  userProfile,
  tierConfigs,
  onUpdateRace,
  onSave,
  onExit,
  hasUnsavedChanges,
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
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  
  // Responsive defaults
  const isMobile = window.innerWidth < 768;
  const [isChatOpen, setIsChatOpen] = useState(false); // Default closed for cleaner UI
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false); 
  
  const [dataPanelTab, setDataPanelTab] = useState<'overview' | 'content'>('overview');
  
  // Builder Config
  const [cpConfig, setCpConfig] = useState<CheckpointConfig>({
    points: 10,
    type: 'mandatory',
    color: '#3b82f6',
    name: 'Ny CP'
  });

  // AI & Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [aiLoaderMessage, setAiLoaderMessage] = useState("Skriver innehåll...");
  const [analysisData, setAnalysisData] = useState<RaceAnalysis | null>(null);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  
  // Keep a Ref to raceData so the Gemini callback can access the LATEST data 
  // without needing to be recreated on every render (which kills the session).
  const raceDataRef = useRef(raceData);
  useEffect(() => { raceDataRef.current = raceData; }, [raceData]);

  // Computed
  const isLocationSet = React.useMemo(() => {
    return raceData.startLocation.lat !== DEFAULT_COORDINATES.lat || 
           raceData.startLocation.lng !== DEFAULT_COORDINATES.lng;
  }, [raceData.startLocation]);

  const hasNotStarted = new Date(raceData.startDateTime) > new Date();
  
  // Determine if manual start button should be shown
  const showManualStartButton = raceData.startMode === 'mass_start' && (raceData.manualStartEnabled ?? true);

  // License / Access Logic for Creator Tier
  const isCreator = userProfile.tier === 'CREATOR';
  const getLicenseStatus = () => {
      if (!isCreator || raceData.status === 'draft') return null;
      
      // If we have an expiration date (simulated for now, would come from DB)
      if (raceData.unlockExpiresAt) {
          const expires = new Date(raceData.unlockExpiresAt);
          const now = new Date();
          const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysLeft <= 0) return { status: 'expired', msg: 'Licens Utgången' };
          return { status: 'active', msg: `${daysLeft} dagar kvar`, days: daysLeft };
      }
      
      // If public/active but no date set (legacy or logic gap), assume 30 days from now for UI
      return { status: 'active', msg: '30 Dagar Access', days: 30 };
  };
  const licenseInfo = getLicenseStatus();

  // --- INITIALIZATION ---
  useEffect(() => {
    geminiServiceRef.current = new GeminiService(
        (updatedData) => {
             const currentRaceData = raceDataRef.current;
             
             // --- SAFETY MERGE LOGIC ---
             // If AI returns checkpoints, ensure we preserve the LOCATION of existing checkpoints.
             // This prevents the AI from accidentally moving pins when it just meant to add a quiz.
             if (updatedData.checkpoints && currentRaceData.checkpoints.length > 0) {
                 updatedData.checkpoints = updatedData.checkpoints.map(newCp => {
                     const existingCp = currentRaceData.checkpoints.find(c => c.id === newCp.id);
                     if (existingCp) {
                         // PRESERVE CRITICAL SPATIAL DATA
                         return {
                             ...newCp,
                             location: existingCp.location,
                             radiusMeters: existingCp.radiusMeters
                         };
                     }
                     return newCp;
                 });
             }

             const currentCheckpoints = updatedData.checkpoints || [];
             if (currentCheckpoints.length > 0) {
                 const validation = accessControlService.validateRacePlan(userProfile, updatedData, tierConfigs);
                 if (!validation.valid && validation.warnings.length > 0) {
                     const limit = tierConfigs[userProfile.tier].maxCheckpointsPerRace;
                     updatedData.checkpoints = updatedData.checkpoints.slice(0, limit);
                     setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `⚠️ NOTIS: ${validation.warnings[0]}` }]);
                 }
             }
             onUpdateRace(updatedData);
        },
        (analysis) => {
             setAnalysisData(analysis);
             setIsAnalysisOpen(true);
        }
    );
  }, [userProfile.tier, tierConfigs, onUpdateRace]);

  // Check if this is a new event (no checkpoints, default start) and show Guide
  useEffect(() => {
      if (raceData.checkpoints.length === 0 && !isLocationSet) {
          // Small delay to let the map load first
          const timer = setTimeout(() => setIsGuideOpen(true), 1000);
          return () => clearTimeout(timer);
      }
  }, []);

  // Initial Chat Message
  useEffect(() => {
    if (geminiServiceRef.current && isOnline) {
      geminiServiceRef.current.startNewSession(userProfile.tier);
      if (!isLocationSet) {
           setMessages([{ 
              id: '1', 
              role: 'model', 
              text: `👋 Hej! Börja med att dra ut **Start** och **Mål** på kartan.` 
          }]);
      } else {
           setMessages([{ 
              id: '1', 
              role: 'model', 
              text: `Jag är redo. Vad vill du skapa idag?` 
          }]);
      }
    }
  }, [isOnline, userProfile.tier, isLocationSet]); 

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  // --- HANDLERS ---

  const handleSend = async () => {
    if (!input.trim() || !geminiServiceRef.current) return;
    if (!isLocationSet) {
        alert("Sätt start/mål först.");
        return;
    }
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Serialize checkpoints to provide context for AI (ID, name, description, quiz presence)
    // This is critical for the AI to "see" existing nodes and update them.
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
      
      USER REQUEST: "${input}"
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
    setIsChatOpen(true); 
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: `🪄 ${prompt}` }]);
    
    const fullPrompt = `
    CONTEXT:
    Current Checkpoints: ${JSON.stringify(raceData.checkpoints.map(c => ({ id: c.id, name: c.name, desc: c.description })))}
    Language: ${raceData.language || 'sv'}
    Start Coordinates: ${raceData.startLocation.lat}, ${raceData.startLocation.lng}
    Finish Coordinates: ${raceData.finishLocation.lat}, ${raceData.finishLocation.lng}
    TASK: ${prompt}
    `;
    
    setAiLoaderMessage("Skapar innehåll...");
    setIsLoading(true);
    setIsGeneratingContent(true); 
    
    try {
        const responseText = await geminiServiceRef.current.sendMessage(fullPrompt);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
        setDataPanelTab('content');
        setIsDataPanelOpen(true);
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

    const contextPrompt = `
      CURRENT RACE PLAN FOR ANALYSIS:
      Name: ${raceData.name}
      Type: ${raceData.eventType}
      Description: ${raceData.description}
      Terrain: ${raceData.terrainType}
      Win Condition: ${raceData.winCondition}
      Start: ${raceData.startLocation.lat}, ${raceData.startLocation.lng}
      Finish: ${raceData.finishLocation.lat}, ${raceData.finishLocation.lng}
      Checkpoints: ${JSON.stringify(raceData.checkpoints.map(c => ({
          name: c.name,
          type: c.type,
          points: c.points,
          hasQuiz: !!c.quiz,
          hasChallenge: !!c.challenge,
          location: c.location
      })))}
      
      TASK: Please analyze this race plan using the provide_race_analysis tool. Give constructive feedback.
    `;

    try {
      await geminiServiceRef.current.sendMessage(contextPrompt);
    } catch (e) {
      console.error(e);
      alert("Kunde inte genomföra analysen just nu.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // --- PUBLISH LOGIC ---
  const handlePublish = async () => {
      // 1. Validation
      if (raceData.checkpoints.length === 0) {
          alert("Du måste lägga till minst en checkpoint innan du kan publicera.");
          return;
      }
      if (!isLocationSet) {
          alert("Du måste ange start och mål.");
          return;
      }

      const confirmMsg = "Är du redo att publicera? Detta gör eventet tillgängligt för deltagare med koden. \n\nDu kan fortfarande redigera banan, men ändringar syns direkt för aktiva deltagare.";
      
      if (confirm(confirmMsg)) {
          // 2. Set Status to Published
          onUpdateRace({ status: 'published' });
          
          // 3. Trigger Save (which handles the backend update)
          // We wait a tiny bit to ensure the state update has processed before saving
          setTimeout(() => {
              onSave();
              setIsShareOpen(true); // 4. Open Share Dialog immediately
          }, 100);
      }
  };

  const handleManualStart = () => {
    if(confirm(`Vill du starta klockan för ALLA deltagare nu?`)) {
        // Set start time to NOW and generate an expiration date (30 days from now)
        const now = new Date();
        const expires = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        onUpdateRace({ 
            startDateTime: now.toISOString(), 
            status: 'active',
            unlockExpiresAt: expires.toISOString() 
        });
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
          // Pass the reason to the upgrade callback
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

  // Determine button state for Header
  const canPublish = raceData.checkpoints.length > 0 && isLocationSet;
  const isPublished = raceData.status === 'published' || raceData.status === 'active';

  return (
    <div className="flex flex-col h-full w-full bg-gray-950 text-gray-100 font-sans overflow-hidden relative selection:bg-blue-500/30">
        <AILoader isVisible={isGeneratingContent} message={aiLoaderMessage} />
        
        {/* --- DIALOGS --- */}
        <OnboardingGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        
        <ShareDialog 
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            eventName={raceData.name}
            accessCode={raceData.accessCode || ''}
        />
        <EventSettingsDialog 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            raceData={raceData}
            onSave={onUpdateRace}
            onDelete={onDeleteEvent ? () => onDeleteEvent(raceData.id) : undefined}
        />
        <CheckpointEditorDialog 
            checkpoint={editingCheckpoint}
            isOpen={!!editingCheckpoint}
            onClose={() => setEditingCheckpoint(null)}
            onSave={(updatedCp) => onUpdateRace({
              checkpoints: raceData.checkpoints.map(cp => cp.id === updatedCp.id ? updatedCp : cp)
            })}
        />
        <AnalysisDialog 
            analysis={analysisData}
            isOpen={isAnalysisOpen}
            onClose={() => setIsAnalysisOpen(false)}
        />
        <ContentGeneratorDialog 
            isOpen={isGeneratorOpen}
            onClose={() => setIsGeneratorOpen(false)}
            onGenerate={handleContentGeneration}
            onApplyUpdate={(updates) => {
                onUpdateRace(updates);
                setDataPanelTab('content');
                setIsDataPanelOpen(true);
            }}
            currentRaceData={raceData}
        />
        {isResultsOpen && (
            <ResultManager 
                raceData={raceData}
                onClose={() => setIsResultsOpen(false)}
                onUpdateResults={(results) => onUpdateRace({ results })}
            />
        )}

        {/* --- FULL SCREEN MAP BACKGROUND --- */}
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
                hideLegend={true} // Hide tactical overview in organizer mode to save space
            />
        </div>

        {/* --- FLOATING HEADER (Glassmorphism) --- */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
            
            {/* Top Left: Back & Title */}
            <div className="flex flex-col gap-2 pointer-events-auto">
                <div className="flex gap-2">
                    <button 
                        onClick={onExit}
                        className="glass-button h-10 w-10 flex items-center justify-center rounded-xl text-white hover:text-gray-200"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="glass-panel px-4 py-2 rounded-xl flex flex-col justify-center h-10 min-w-[120px]">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white line-clamp-1">{raceData.name}</span>
                            <StatusHeaderBadge status={raceData.status || 'draft'} />
                        </div>
                    </div>
                </div>
                
                {/* Creator License Info */}
                {licenseInfo && (
                    <div className={`glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold w-fit ${licenseInfo.status === 'expired' ? 'bg-red-900/80 border-red-500' : 'bg-blue-900/50 border-blue-500/30'}`}>
                        {licenseInfo.status === 'expired' ? <Lock className="w-3 h-3 text-red-200"/> : <Clock className="w-3 h-3 text-blue-200"/>}
                        <span className={licenseInfo.status === 'expired' ? 'text-red-200' : 'text-blue-200'}>{licenseInfo.msg}</span>
                    </div>
                )}
            </div>

            {/* Top Right: Actions */}
            <div className="flex gap-2 pointer-events-auto">
                 <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="glass-button h-10 w-10 flex items-center justify-center rounded-xl text-yellow-400 hover:text-white"
                    title="Visa Guide"
                >
                    <HelpCircle className="w-5 h-5" />
                </button>

                <button
                    onClick={onTestRun}
                    className="h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400"
                    title="Testa loppet direkt som deltagare"
                >
                    <Gamepad2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Test Run</span>
                </button>

                {showManualStartButton && (
                    <button
                        onClick={handleManualStart}
                        className={`h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${hasNotStarted ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-800/80 text-gray-400 border border-gray-700'}`}
                    >
                        <Rocket className="w-4 h-4" /> 
                        <span className="hidden sm:inline">{hasNotStarted ? 'Starta' : 'Pågår'}</span>
                    </button>
                )}
                
                {/* PUBLISH / SHARE ACTION */}
                {isPublished ? (
                    <button 
                        onClick={() => setIsShareOpen(true)}
                        className="glass-button h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-bold text-green-300 border-green-500/30 hover:bg-green-900/30"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Dela Kod</span>
                    </button>
                ) : (
                    <button 
                        onClick={handlePublish}
                        disabled={!canPublish}
                        className={`h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${canPublish ? 'bg-green-600 hover:bg-green-500 text-white animate-pulse' : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}`}
                        title={canPublish ? "Gör eventet live!" : "Lägg till start/mål och checkpoints först"}
                    >
                        <Globe className="w-4 h-4" />
                        <span className="hidden sm:inline">Publicera</span>
                    </button>
                )}

                <button 
                    onClick={() => { onSave(); }}
                    className={`glass-button h-10 w-10 md:w-auto md:px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold ${hasUnsavedChanges ? 'text-blue-300 border-blue-500/50' : 'text-gray-400'}`}
                    title="Spara utkast"
                >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Spara</span>
                </button>
            </div>
        </div>

        {/* --- FLOATING BOTTOM DOCK (Tools) --- */}
        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <div className="glass-panel p-2 rounded-2xl flex items-center gap-2 shadow-2xl pointer-events-auto dock-container transform transition-all duration-300 hover:scale-105">
                
                <button 
                    onClick={() => setActiveTool('none')}
                    className={`dock-item p-3 rounded-xl transition-all ${activeTool === 'none' ? 'bg-gray-700/80 text-white shadow-inner' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}
                    title="Navigera (Hand)"
                >
                    <MousePointer2 className="w-5 h-5" />
                </button>
                
                <div className="w-px h-8 bg-white/10 mx-1"></div>

                <button 
                    onClick={() => setActiveTool('start')}
                    className={`dock-item px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTool === 'start' ? 'bg-green-600/80 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800/50 hover:text-green-400'}`}
                    title="Placera Start"
                >
                    <PlayCircle className="w-5 h-5" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Start</span>
                </button>

                <button 
                    onClick={() => setActiveTool('finish')}
                    className={`dock-item px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTool === 'finish' ? 'bg-red-600/80 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800/50 hover:text-red-400'}`}
                    title="Placera Mål"
                >
                    <Flag className="w-5 h-5" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Mål</span>
                </button>

                <button 
                    onClick={() => setActiveTool('checkpoint')}
                    className={`dock-item px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTool === 'checkpoint' ? 'bg-blue-600/80 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800/50 hover:text-blue-400'}`}
                    title="Lägg till Checkpoint"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">CP</span>
                </button>

                <div className="w-px h-8 bg-white/10 mx-1"></div>

                <button 
                    onClick={() => !isLocationSet ? alert("Placera start/mål först") : setIsGeneratorOpen(true)}
                    disabled={!isLocationSet}
                    className="dock-item p-3 rounded-xl text-purple-400 hover:bg-purple-900/30 hover:text-purple-300 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="AI Content Wizard"
                >
                    <Wand2 className="w-5 h-5" />
                </button>

                <button 
                    onClick={() => !isLocationSet ? alert("Placera start/mål först") : handleRequestAnalysis()}
                    disabled={!isLocationSet}
                    className="dock-item p-3 rounded-xl text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Kör AI-Analys"
                >
                    <BrainCircuit className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* --- FLOATING SIDEBARS (Panels) --- */}

        {/* 1. AI Chat Panel (Moved to Top Left to avoid Legend overlap) */}
        <div className={`absolute top-24 left-4 z-20 flex flex-col items-start transition-all duration-300 ${isChatOpen ? 'w-[320px] h-[400px]' : 'w-auto h-auto'}`}>
            {isChatOpen ? (
                <div className="glass-panel w-full h-full rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-left-4 fade-in duration-300">
                    <div className="p-3 border-b border-white/5 flex justify-between items-center bg-gray-900/40">
                        <span className="text-xs font-bold text-blue-300 flex items-center gap-2">
                             <Sparkles className="w-3 h-3" /> AI-Assistent
                        </span>
                        <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && <div className="text-gray-400 text-xs animate-pulse pl-2">Tänker...</div>}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 bg-gray-900/50">
                         <div className="relative">
                            <input 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Fråga AI..."
                                className="w-full bg-gray-800/50 border border-gray-600 rounded-xl pl-3 pr-10 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <button onClick={handleSend} className="absolute right-2 top-2 text-blue-400 hover:text-white"><Send className="w-4 h-4" /></button>
                         </div>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => setIsChatOpen(true)}
                    className="glass-button h-12 w-12 rounded-full flex items-center justify-center shadow-lg text-blue-400 hover:text-white bg-gray-900/80"
                >
                    <Bot className="w-6 h-6" />
                </button>
            )}
        </div>

        {/* 2. Data/Details Panel (Right Side) */}
        <div className={`absolute top-20 right-4 bottom-24 z-20 transition-transform duration-300 flex ${isDataPanelOpen ? 'translate-x-0' : 'translate-x-[calc(100%+20px)]'}`}>
             <div className="glass-panel w-[350px] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                  <button 
                    onClick={() => setIsDataPanelOpen(false)}
                    className="absolute top-1/2 -left-3 bg-gray-800 border border-gray-600 rounded-full p-1 text-gray-400 hover:text-white shadow-md z-30"
                  >
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                  </button>
                  <DataPanel 
                      raceData={raceData}
                      onDeleteCheckpoint={(id) => onUpdateRace({ checkpoints: raceData.checkpoints.filter(cp => cp.id !== id) })}
                      onEditCheckpoint={(id) => { const cp = raceData.checkpoints.find(c => c.id === id); if(cp) setEditingCheckpoint(cp); }}
                      activeTab={dataPanelTab}
                      onTabChange={(t) => setDataPanelTab(t)}
                      onClose={() => setIsDataPanelOpen(false)}
                  />
             </div>
        </div>

        {/* Toggle Button for Data Panel (when closed) */}
        {!isDataPanelOpen && (
             <div className="absolute top-20 right-4 z-20 flex flex-col gap-2">
                 <button 
                    onClick={() => setIsDataPanelOpen(true)}
                    className="glass-button h-12 w-12 rounded-2xl flex items-center justify-center text-white hover:text-gray-200 shadow-lg"
                    title="Öppna Detaljer"
                 >
                     <List className="w-6 h-6" />
                 </button>
                  <button 
                    onClick={() => setIsResultsOpen(true)}
                    className="glass-button h-12 w-12 rounded-2xl flex items-center justify-center text-yellow-500 hover:text-white shadow-lg"
                    title="Resultat"
                 >
                     <Trophy className="w-6 h-6" />
                 </button>
             </div>
        )}

    </div>
  );
};
