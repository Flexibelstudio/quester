
import React, { useState } from 'react';
import { RaceEvent, Checkpoint, EventStatus } from '../types';
import { 
  ChevronLeft, Flag, Plus, Globe, 
  CheckCircle2, Circle, Sparkles, Trash2, Edit2, 
  LayoutList, ListTodo, PanelLeftClose, PanelLeftOpen,
  Hammer, Wand2, Skull, BookOpen, ChevronDown, ChevronRight, PlayCircle, MousePointer2
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
  // Props for Builder & Content Studio
  cpConfig: CheckpointConfig;
  setCpConfig: (config: CheckpointConfig) => void;
  onGenerateContent: (prompt: string) => void;
}

const StatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
    let colorClass = 'text-gray-400 border-gray-600';
    let label = 'Utkast';
    
    if (status === 'active') { colorClass = 'text-blue-400 border-blue-500/50 animate-pulse'; label = 'Pågående'; }
    else if (status === 'published') { colorClass = 'text-green-400 border-green-500/50'; label = 'Publicerad'; }
    else if (status === 'completed') { colorClass = 'text-purple-300 border-purple-500/50'; label = 'Avslutad'; }

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${colorClass}`}>
            {label}
        </span>
    );
};

// --- CONTENT STUDIO SUB-COMPONENTS ---

const AiGeneratorSection: React.FC<{ onGenerate: (prompt: string) => void }> = ({ onGenerate }) => {
    const [theme, setTheme] = useState('');
    const [count, setCount] = useState(5);
    const [audience, setAudience] = useState('Vuxna / Motionärer');

    const handleRun = () => {
        const prompt = `Skapa ${count} st blandade quiz-frågor och utmaningar. Målgrupp: ${audience}. Tema: ${theme || 'Äventyr'}. Applicera på checkpoints.`;
        onGenerate(prompt);
    };

    return (
        <div className="space-y-3 p-1">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tema</label>
                <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="T.ex. Harry Potter, Natur..." className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mt-1 focus:border-purple-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Målgrupp</label>
                    <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mt-1">
                        <option>Barn</option>
                        <option>Ungdom</option>
                        <option>Vuxna</option>
                        <option>Företag</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Antal CP</label>
                    <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mt-1" />
                </div>
            </div>
            <button onClick={handleRun} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2">
                <Wand2 className="w-4 h-4" /> Generera
            </button>
        </div>
    );
};

const StorySection: React.FC<{ onApply: (updates: Partial<RaceEvent>) => void, raceData: RaceEvent }> = ({ onApply, raceData }) => {
    const [text, setText] = useState('');
    
    const handleApply = () => {
        if (!text.trim()) return;
        const chapters = text.split(/\n\s*\n/).filter(t => t.trim().length > 0);
        const newCheckpoints = [...raceData.checkpoints];
        chapters.forEach((chapter, i) => {
            if (i < newCheckpoints.length) {
                newCheckpoints[i] = { ...newCheckpoints[i], description: chapter, name: `Kapitel ${i+1}` };
            } else {
                newCheckpoints.push({
                    id: `story-${Date.now()}-${i}`,
                    name: `Kapitel ${i+1}`,
                    location: { lat: raceData.startLocation.lat + (Math.random()-0.5)*0.005, lng: raceData.startLocation.lng + (Math.random()-0.5)*0.005 },
                    radiusMeters: 20,
                    type: 'mandatory',
                    description: chapter,
                    color: '#8b5cf6',
                    points: 10
                });
            }
        });
        onApply({ checkpoints: newCheckpoints, checkpointOrder: 'sequential' });
    };

    return (
        <div className="space-y-3 p-1">
            <p className="text-xs text-gray-400">Klistra in din saga. Varje stycke blir en checkpoint.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white h-24 resize-none focus:border-green-500 outline-none" placeholder="Det var en gång..." />
            <button onClick={handleApply} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded text-xs uppercase tracking-wider shadow-lg">Applicera Story</button>
        </div>
    );
};

export const MissionControlPanel: React.FC<MissionControlPanelProps> = ({
  raceData,
  onUpdateRace,
  onExit,
  onEditCheckpoint,
  onDeleteCheckpoint,
  activeTool,
  setActiveTool,
  onPublish,
  isOpen,
  setIsOpen,
  cpConfig,
  setCpConfig,
  onGenerateContent
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'build' | 'layers'>('build');
  const [expandedContent, setExpandedContent] = useState<string | null>(null);

  // Checklist State
  const hasStart = raceData.startLocation.lat !== 59.3293;
  const hasFinish = raceData.finishLocation.lat !== 59.3293;
  const hasCheckpoints = raceData.checkpoints.length > 0;
  const isPublished = raceData.status === 'published' || raceData.status === 'active';

  const ChecklistItem = ({ done, label, onClick, isActive }: { done: boolean, label: string, onClick?: () => void, isActive?: boolean }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${isActive ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'}`}>
      <div className={`shrink-0 ${done ? 'text-green-500' : isActive ? 'text-blue-400' : 'text-gray-500'}`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </div>
      <span className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-200'}`}>{label}</span>
    </button>
  );

  const AccordionItem = ({ id, title, icon, children, colorClass }: any) => (
      <div className="border border-slate-800 rounded-xl overflow-hidden mb-2 bg-slate-900/30">
          <button 
            onClick={() => setExpandedContent(expandedContent === id ? null : id)}
            className={`w-full flex items-center justify-between p-3 text-sm font-bold transition-colors hover:bg-slate-800 ${expandedContent === id ? 'bg-slate-800' : ''}`}
          >
              <div className={`flex items-center gap-2 ${colorClass}`}>
                  {icon} <span>{title}</span>
              </div>
              {expandedContent === id ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
          {expandedContent === id && (
              <div className="p-3 border-t border-slate-800 bg-slate-950/50">
                  {children}
              </div>
          )}
      </div>
  );

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="fixed top-4 left-4 z-30 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white shadow-xl md:hidden">
          <PanelLeftOpen className="w-6 h-6" />
        </button>
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-full md:w-[400px] bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        
        {/* --- HEADER --- */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onExit} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
              <ChevronLeft className="w-4 h-4" /> Tillbaka
            </button>
            <div className="flex items-center gap-2">
               <StatusBadge status={raceData.status} />
               <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500"><PanelLeftClose className="w-5 h-5" /></button>
            </div>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight leading-none mb-1">{raceData.name}</h1>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">Mission Control</p>
        </div>

        {/* --- TABS --- */}
        <div className="flex border-b border-slate-800">
          <button onClick={() => setActiveTab('guide')} className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'guide' ? 'border-green-500 text-green-400 bg-green-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><ListTodo className="w-4 h-4" /><span className="text-xs font-bold uppercase">Guide</span></button>
          <button onClick={() => setActiveTab('build')} className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'build' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><Hammer className="w-4 h-4" /><span className="text-xs font-bold uppercase">Bygg</span></button>
          <button onClick={() => setActiveTab('layers')} className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'layers' ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><LayoutList className="w-4 h-4" /><span className="text-xs font-bold uppercase">Lager</span></button>
        </div>

        {/* --- CONTENT --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0">
          
          {/* TAB: GUIDE (Checklist) */}
          {activeTab === 'guide' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Checklista</div>
              <ChecklistItem done={hasStart} label="Placera Start" isActive={activeTool === 'start'} onClick={() => { setActiveTool('start'); setActiveTab('build'); }} />
              <ChecklistItem done={hasFinish} label="Placera Mål" isActive={activeTool === 'finish'} onClick={() => { setActiveTool('finish'); setActiveTab('build'); }} />
              <ChecklistItem done={hasCheckpoints} label="Lägg till Checkpoints" isActive={activeTool === 'checkpoint'} onClick={() => { setActiveTool('checkpoint'); setActiveTab('build'); }} />
              <div className="my-4 border-t border-slate-800"></div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Publicering</div>
              <button onClick={onPublish} disabled={!hasStart || !hasFinish || !hasCheckpoints || isPublished} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isPublished ? 'bg-green-900/20 text-green-500 border border-green-900 cursor-default' : (!hasStart || !hasFinish || !hasCheckpoints) ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white animate-pulse'}`}>
                {isPublished ? <Globe className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                {isPublished ? 'Eventet är Live' : 'Publicera Event'}
              </button>
            </div>
          )}

          {/* TAB: BUILD (Tools & Content) */}
          {activeTab === 'build' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* TOOLBAR */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Verktyg</label>
                    <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => setActiveTool('none')} className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTool === 'none' ? 'bg-gray-700 text-white shadow-inner' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                            <MousePointer2 className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase">Nav</span>
                        </button>
                        <button onClick={() => setActiveTool('start')} className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTool === 'start' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-green-400 hover:bg-gray-700'}`}>
                            <PlayCircle className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase">Start</span>
                        </button>
                        <button onClick={() => setActiveTool('finish')} className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTool === 'finish' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700'}`}>
                            <Flag className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase">Mål</span>
                        </button>
                        <button onClick={() => setActiveTool('checkpoint')} className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTool === 'checkpoint' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-blue-400 hover:bg-gray-700'}`}>
                            <Plus className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase">CP</span>
                        </button>
                    </div>
                </div>

                {/* CP CONFIG (Visible only when CP tool is active) */}
                {activeTool === 'checkpoint' && (
                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-blue-400 uppercase">Nästa Checkpoint</span>
                            <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">Klicka på kartan</span>
                        </div>
                        <div className="space-y-3">
                            <input value={cpConfig.name} onChange={e => setCpConfig({...cpConfig, name: e.target.value})} className="w-full bg-slate-900 border border-blue-500/30 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Namn (t.ex. CP 1)" />
                            <div className="flex gap-2">
                                <input type="number" value={cpConfig.points} onChange={e => setCpConfig({...cpConfig, points: parseInt(e.target.value)})} className="w-1/3 bg-slate-900 border border-blue-500/30 rounded p-2 text-sm text-white text-center font-mono" placeholder="Poäng" />
                                <div className="flex-1 flex gap-1 bg-slate-900 rounded border border-blue-500/30 p-1">
                                    {['#3b82f6', '#10B981', '#F59E0B', '#EF4444'].map(c => (
                                        <button key={c} onClick={() => setCpConfig({...cpConfig, color: c})} className={`flex-1 rounded transition-transform ${cpConfig.color === c ? 'scale-90 ring-2 ring-white' : ''}`} style={{backgroundColor: c}}></button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="border-t border-slate-800 my-2"></div>

                {/* CONTENT STUDIO */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Content Studio</label>
                    <AccordionItem id="ai" title="AI Generator" icon={<Wand2 className="w-4 h-4" />} colorClass="text-purple-400">
                        <AiGeneratorSection onGenerate={onGenerateContent} />
                    </AccordionItem>
                    
                    <AccordionItem id="zombie" title="Zombie Outbreak" icon={<Skull className="w-4 h-4" />} colorClass="text-red-500">
                        <p className="text-xs text-gray-400 mb-3">Skapar ett överlevnadsscenario med Safe Houses och infekterade zoner baserat på din startplats.</p>
                        <button onClick={() => onGenerateContent("GENERATE_ZOMBIE_MODE")} className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 font-bold py-2 rounded text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                            <Skull className="w-4 h-4" /> Starta Outbreak
                        </button>
                    </AccordionItem>

                    <AccordionItem id="story" title="Story Mode" icon={<BookOpen className="w-4 h-4" />} colorClass="text-green-400">
                        <StorySection onApply={onUpdateRace} raceData={raceData} />
                    </AccordionItem>
                </div>
            </div>
          )}

          {/* TAB: LAYERS (List) */}
          {activeTab === 'layers' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {raceData.checkpoints.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">Inga checkpoints än.</div>}
              {raceData.checkpoints.map((cp, idx) => (
                   <div key={cp.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3 group hover:border-slate-500 transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: cp.color || '#3b82f6' }}>{idx + 1}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="font-bold text-gray-200 text-sm truncate">{cp.name}</span>{(cp.quiz || cp.challenge) && <Sparkles className="w-3 h-3 text-yellow-500" />}</div>
                        <div className="text-[10px] text-gray-500 truncate">{cp.points} poäng</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onEditCheckpoint(cp.id)} className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteCheckpoint(cp.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
