
import React, { useState } from 'react';
import { RaceEvent, Checkpoint, EventStatus, QuizData } from '../types';
import { 
  ChevronLeft, Flag, Plus, Globe, 
  CheckCircle2, Circle, Sparkles, Trash2, Edit2, 
  LayoutList, ListTodo, PanelLeftClose, PanelLeftOpen,
  Hammer, Wand2, BookOpen, ChevronDown, ChevronRight, PlayCircle, MousePointer2,
  Settings2, Play, Share2, MapPin, XCircle, BrainCircuit, Rocket, Smile, PenTool, FileSpreadsheet, Search
} from 'lucide-react';

interface CheckpointConfig {
  points: number;
  type: 'mandatory' | 'optional';
  color: string;
  name: string;
}

interface MissionControlPanelProps {
  raceData: RaceEvent;
  onUpdateRace: (updates: Partial<RaceEvent>) => void;
  onExit: () => void;
  onEditCheckpoint: (id: string) => void;
  onDeleteCheckpoint: (id: string) => void;
  activeTool: string;
  setActiveTool: (tool: 'none' | 'start' | 'finish' | 'checkpoint') => void;
  onPublish: () => void;
  className?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  cpConfig: CheckpointConfig;
  setCpConfig: (config: CheckpointConfig) => void;
  onGenerateContent: (prompt: string) => void;
  onTestRun: () => void;
  onSettings: () => void;
  onShare: () => void;
  onStartPlacing: (id: string) => void;
}

const StatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
    let colorClass = 'text-gray-400 border-gray-600 bg-gray-800';
    let label = 'Utkast';
    if (status === 'active') { colorClass = 'text-blue-400 border-blue-500/50 bg-blue-900/20 animate-pulse'; label = 'Pågående'; }
    else if (status === 'published') { colorClass = 'text-green-400 border-green-500/50 bg-green-900/20'; label = 'Publicerad'; }
    return <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold border ${colorClass}`}>{label}</span>;
};

type BlueprintId = 'mystery' | 'quiz' | 'action' | 'family';
interface Blueprint { id: BlueprintId; title: string; description: string; icon: React.ElementType; colorFrom: string; colorTo: string; promptTemplate: string; }

const BLUEPRINTS: Blueprint[] = [
    { id: 'mystery', title: 'Mysterium', description: 'En story där varje plats är ett kapitel.', icon: Search, colorFrom: 'from-purple-600', colorTo: 'to-indigo-900', promptTemplate: "Skapa ett mysterium med en sammanhängande story." },
    { id: 'quiz', title: 'Quiz', description: 'Klassisk tipspromenad med frågor.', icon: BrainCircuit, colorFrom: 'from-blue-600', colorTo: 'to-cyan-800', promptTemplate: "Skapa en tipspromenad med engagerande frågor." },
    { id: 'action', title: 'Action', description: 'Fysiska utmaningar och uppdrag.', icon: Rocket, colorFrom: 'from-orange-500', colorTo: 'to-red-800', promptTemplate: "Skapa ett action-fyllt event med fysiska utmaningar." },
    { id: 'family', title: 'Familj', description: 'Enkel mix för alla åldrar.', icon: Smile, colorFrom: 'from-green-500', colorTo: 'to-emerald-800', promptTemplate: "Skapa ett familjevänligt äventyr." }
];

export const MissionControlPanel: React.FC<MissionControlPanelProps> = ({
  raceData, onUpdateRace, onExit, onEditCheckpoint, onDeleteCheckpoint, activeTool, setActiveTool, onPublish, isOpen, setIsOpen, cpConfig, setCpConfig, onGenerateContent, onTestRun, onSettings, onShare, onStartPlacing
}) => {
  const [activeTab, setActiveTab] = useState<'build' | 'layers'>('build');
  const [selectedBlueprint, setSelectedBlueprint] = useState<BlueprintId | null>(null);
  const [themeInput, setThemeInput] = useState('');
  const [audience, setAudience] = useState('Vuxna');
  const [cpCount, setCpCount] = useState(5);
  const [showManualStory, setShowManualStory] = useState(false);
  const [showManualBulk, setShowManualBulk] = useState(false);
  const [manualText, setManualText] = useState('');

  const hasStart = !!raceData.startLocationConfirmed;
  const hasFinish = !!raceData.finishLocationConfirmed;
  const hasCheckpoints = raceData.checkpoints.length > 0;
  const isPublished = raceData.status === 'published' || raceData.status === 'active';

  const draftCheckpoints = raceData.checkpoints.filter(cp => !cp.location);
  const placedCheckpoints = raceData.checkpoints.filter(cp => !!cp.location);

  const ChecklistItem = ({ done, label, onClick, isActive, icon: Icon }: { done: boolean, label: string, onClick?: () => void, isActive?: boolean, icon: any }) => (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isActive ? 'bg-blue-900/20 border-blue-500 shadow-md scale-[1.01]' : done ? 'bg-green-900/5 border-green-900/10' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded ${done ? 'bg-green-500/20 text-green-500' : isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className={`text-[11px] font-black uppercase tracking-tight ${done ? 'text-green-500/60' : 'text-slate-200'}`}>{label}</div>
      </div>
      <div className={`${done ? 'text-green-500' : isActive ? 'text-blue-400' : 'text-slate-700'}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
      </div>
    </button>
  );

  const handleArchitectRun = () => {
    if (!selectedBlueprint) return;
    const blueprint = BLUEPRINTS.find(b => b.id === selectedBlueprint);
    onGenerateContent(`${blueprint?.promptTemplate} Tema: ${themeInput || 'Blandat'}. Målgrupp: ${audience}. Antal: ${cpCount}.`);
  };

  const handleManualStoryApply = () => {
    if (!manualText.trim()) return;
    const chapters = manualText.split(/\n\s*\n/).filter(t => t.trim().length > 0);
    const newCheckpoints = [...raceData.checkpoints];
    chapters.forEach((chapter, i) => {
      newCheckpoints.push({
        id: `manual-st-${Date.now()}-${i}`,
        name: `Kapitel ${i + 1}`,
        location: null,
        radiusMeters: 25,
        type: 'mandatory',
        description: chapter,
        points: 10
      });
    });
    onUpdateRace({ checkpoints: newCheckpoints });
    setManualText('');
    setShowManualStory(false);
  };

  const handleManualBulkApply = () => {
    if (!manualText.trim()) return;
    const lines = manualText.split('\n').filter(l => l.includes('|'));
    const newCheckpoints = [...raceData.checkpoints];
    lines.forEach((line, i) => {
      const [q, opts, correct] = line.split('|');
      newCheckpoints.push({
        id: `manual-qz-${Date.now()}-${i}`,
        name: `Fråga ${i + 1}`,
        location: null,
        radiusMeters: 25,
        type: 'mandatory',
        quiz: {
          question: q.trim(),
          options: opts.split(',').map(o => o.trim()),
          correctOptionIndex: parseInt(correct) || 0
        }
      });
    });
    onUpdateRace({ checkpoints: newCheckpoints });
    setManualText('');
    setShowManualBulk(false);
  };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="fixed top-4 left-4 z-30 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white shadow-xl md:hidden">
          <PanelLeftOpen className="w-6 h-6" />
        </button>
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-full md:w-[380px] bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        
        {/* --- COMPACT HEADER --- */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <button onClick={onExit} className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest group">
              <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> Dashboard
            </button>
            <div className="flex items-center gap-1.5">
                <button onClick={onSettings} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-700" title="Inställningar"><Settings2 className="w-3.5 h-3.5" /></button>
                <button onClick={onTestRun} className="p-1.5 rounded-lg bg-gray-800 text-green-500 hover:bg-green-900/30 transition-colors border border-gray-700" title="Testkör"><Play className="w-3.5 h-3.5 fill-current" /></button>
                {isPublished ? <button onClick={onShare} className="p-1.5 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/30"><Share2 className="w-3.5 h-3.5" /></button> : null}
                <button onClick={() => setIsOpen(false)} className="md:hidden ml-1 text-gray-500"><PanelLeftClose className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
              <h1 className="text-xs font-black text-white truncate uppercase tracking-tight">{raceData.name}</h1>
              <StatusBadge status={raceData.status} />
          </div>
        </div>

        {/* --- SUPER COMPACT CHECKLIST --- */}
        <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Checklista</span>
              <div className="h-px flex-1 bg-slate-800/50 ml-3"></div>
            </div>
            
            <div className="grid grid-cols-1 gap-1.5">
                <ChecklistItem done={hasStart} label="Placera Start" icon={PlayCircle} isActive={activeTool === 'start'} onClick={() => setActiveTool('start')} />
                <ChecklistItem done={hasFinish} label="Placera Mål" icon={Flag} isActive={activeTool === 'finish'} onClick={() => setActiveTool('finish')} />
                <ChecklistItem done={hasCheckpoints} label="Checkpoints" icon={MapPin} isActive={activeTool === 'checkpoint'} onClick={() => setActiveTool('checkpoint')} />
            </div>
            
            {!isPublished && (
                <button 
                    onClick={onPublish} 
                    disabled={!hasStart || !hasFinish || !hasCheckpoints}
                    className={`w-full py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(!hasStart || !hasFinish || !hasCheckpoints) ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50 border border-slate-700' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg active:scale-95'}`}
                >
                    <Globe className="w-3 h-3" /> Publicera Event
                </button>
            )}
        </div>

        {/* --- MINI TABS --- */}
        <div className="flex bg-slate-950 shrink-0 border-b border-slate-800">
          <button onClick={() => setActiveTab('build')} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'build' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-gray-600'}`}>
            <div className="flex items-center justify-center gap-1.5"><Hammer className="w-3 h-3" /> Bygg</div>
          </button>
          <button onClick={() => setActiveTab('layers')} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'layers' ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-transparent text-gray-600'}`}>
            <div className="flex items-center justify-center gap-1.5"><LayoutList className="w-3 h-3" /> Checkpoints ({raceData.checkpoints.length})</div>
          </button>
        </div>

        {/* --- SCROLLABLE WORKSPACE --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-950 space-y-6">
          
          {activeTab === 'build' && (
            <div className="space-y-6 animate-in fade-in duration-200 pb-10">
                {/* TOOL TOGGLES (When none of the fixed guide tools are active) */}
                {activeTool === 'none' && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center py-6 text-center border-dashed">
                        <MousePointer2 className="w-6 h-6 text-slate-600 mb-1.5" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Navigeringsläge</span>
                        <p className="text-[9px] text-slate-600 mt-0.5">Använd checklistan för att placera objekt.</p>
                    </div>
                )}

                {/* CP QUICK CONFIG */}
                {activeTool === 'checkpoint' && (
                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Checkpoint-info</span>
                        </div>
                        <div className="space-y-2.5">
                            <input value={cpConfig.name} onChange={e => setCpConfig({...cpConfig, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500" placeholder="Namn" />
                            <div className="flex gap-2">
                                <input type="number" value={cpConfig.points} onChange={e => setCpConfig({...cpConfig, points: parseInt(e.target.value) || 0})} className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white text-center font-mono" placeholder="Poäng" />
                                <div className="flex-1 flex gap-1 bg-slate-950 rounded-lg border border-slate-800 p-1">
                                    {['#3b82f6', '#10B981', '#F59E0B', '#EF4444'].map(c => (
                                        <button key={c} onClick={() => setCpConfig({...cpConfig, color: c})} className={`flex-1 rounded transition-transform ${cpConfig.color === c ? 'scale-75 ring-2 ring-white shadow-lg' : 'opacity-30'}`} style={{backgroundColor: c}}></button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setActiveTool('none')} className="w-full py-1.5 text-[9px] font-bold text-slate-500 uppercase hover:text-white transition-colors bg-slate-900 rounded-lg">Avbryt</button>
                        </div>
                    </div>
                )}

                <div className="border-t border-slate-800"></div>

                {/* AI ARCHITECT */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">AI Arkitekt</label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {BLUEPRINTS.map(bp => (
                            <button key={bp.id} onClick={() => setSelectedBlueprint(selectedBlueprint === bp.id ? null : bp.id)} className={`p-3 rounded-xl border text-left transition-all ${selectedBlueprint === bp.id ? 'bg-purple-900/20 border-purple-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                <bp.icon className={`w-4 h-4 mb-1.5 ${selectedBlueprint === bp.id ? 'text-purple-400' : 'text-slate-500'}`} />
                                <div className="text-[10px] font-bold text-gray-200">{bp.title}</div>
                            </button>
                        ))}
                    </div>
                    
                    {selectedBlueprint && (
                        <div className="mt-2.5 p-3 bg-slate-900 border border-purple-500/30 rounded-xl space-y-3 animate-in slide-in-from-top-2 shadow-2xl">
                            <input value={themeInput} onChange={e => setThemeInput(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500" placeholder="Tema (t.ex. Spioner)" />
                            <div className="flex gap-2">
                                <select value={audience} onChange={e => setAudience(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] text-white outline-none"><option>Barn</option><option>Vuxna</option><option>Företag</option></select>
                                <input type="number" value={cpCount} onChange={e => setCpCount(parseInt(e.target.value))} className="w-12 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white text-center font-bold" />
                            </div>
                            <button onClick={handleArchitectRun} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5">
                              <Wand2 className="w-3 h-3" /> Generera
                            </button>
                        </div>
                    )}
                </div>

                {/* MANUAL INGEST */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                      <PenTool className="w-3.5 h-3.5 text-blue-500" />
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Import</label>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setShowManualStory(!showManualStory); setShowManualBulk(false); }} className={`flex-1 p-2 rounded-lg border text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 ${showManualStory ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}><BookOpen className="w-3 h-3" /> Story</button>
                        <button onClick={() => { setShowManualBulk(!showManualBulk); setShowManualStory(false); }} className={`flex-1 p-2 rounded-lg border text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 ${showManualBulk ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}><FileSpreadsheet className="w-3 h-3" /> Quiz</button>
                    </div>
                    {(showManualStory || showManualBulk) && (
                        <div className="mt-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl space-y-2">
                            <textarea value={manualText} onChange={e => setManualText(e.target.value)} className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white resize-none outline-none" placeholder={showManualStory ? "Klistra in story..." : "Fråga | Svar... | Index"} />
                            <button onClick={showManualStory ? handleManualStoryApply : handleManualBulkApply} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold py-2 rounded-lg uppercase tracking-widest">Klar</button>
                        </div>
                    )}
                </div>
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="space-y-6 animate-in fade-in duration-200 pb-10">
              {draftCheckpoints.length > 0 && (
                  <div>
                      <h4 className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></span>
                        Oplacerade ({draftCheckpoints.length})
                      </h4>
                      <div className="space-y-1.5">
                          {draftCheckpoints.map((cp, idx) => (
                              <div key={cp.id} className="bg-purple-900/5 border border-purple-500/20 rounded-lg p-2 flex items-center gap-2.5 group">
                                  <div className="w-6 h-6 rounded bg-purple-900/30 flex items-center justify-center text-[9px] font-bold text-purple-400 border border-purple-500/20 shrink-0">{idx+1}</div>
                                  <div className="flex-1 min-w-0"><div className="font-bold text-purple-100 text-[11px] truncate">{cp.name}</div></div>
                                  <button onClick={() => onStartPlacing(cp.id)} className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[8px] font-black uppercase rounded shadow-sm">Placera</button>
                                  <button onClick={() => onEditCheckpoint(cp.id)} className="text-slate-600 hover:text-white transition-colors"><Edit2 className="w-3 h-3" /></button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              <div>
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Placerade ({placedCheckpoints.length})</h4>
                  <div className="space-y-1.5">
                      {placedCheckpoints.map((cp, idx) => (
                           <div key={cp.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2.5 group hover:border-slate-600 transition-colors">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm shrink-0" style={{ backgroundColor: cp.color || '#3b82f6' }}>{idx + 1}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-200 text-[11px] truncate">{cp.name}</div>
                                <div className="text-[8px] text-slate-600 font-bold uppercase truncate">{cp.points}p</div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEditCheckpoint(cp.id)} className="p-1 bg-slate-800 rounded text-slate-500 hover:text-white" title="Redigera"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => onDeleteCheckpoint(cp.id)} className="p-1 bg-slate-800 rounded text-slate-500 hover:text-red-400" title="Ta bort"><Trash2 className="w-3 h-3" /></button>
                              </div>
                           </div>
                      ))}
                      {placedCheckpoints.length === 0 && (
                        <div className="text-center py-6 border border-slate-800 border-dashed rounded-xl">
                          <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Tomt på kartan</span>
                        </div>
                      )}
                  </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
