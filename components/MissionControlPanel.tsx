
import React, { useState, useEffect, useRef } from 'react';
import { RaceEvent, ChatMessage, Checkpoint, EventStatus } from '../types';
import { 
  ChevronLeft, Settings, MapPin, Flag, Plus, Globe, 
  CheckCircle2, Circle, Bot, Send, Sparkles, Trash2, Edit2, 
  LayoutList, ListTodo, X, PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';

interface MissionControlPanelProps {
  raceData: RaceEvent;
  onUpdateRace: (updates: Partial<RaceEvent>) => void;
  onExit: () => void;
  onEditCheckpoint: (id: string) => void;
  onDeleteCheckpoint: (id: string) => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isChatLoading: boolean;
  activeTool: string;
  setActiveTool: (tool: 'none' | 'start' | 'finish' | 'checkpoint') => void;
  onPublish: () => void;
  className?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
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

export const MissionControlPanel: React.FC<MissionControlPanelProps> = ({
  raceData,
  onUpdateRace,
  onExit,
  onEditCheckpoint,
  onDeleteCheckpoint,
  messages,
  onSendMessage,
  isChatLoading,
  activeTool,
  setActiveTool,
  onPublish,
  isOpen,
  setIsOpen
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'layers'>('guide');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Determine Checklist State
  const hasStart = raceData.startLocation.lat !== 59.3293; // Not default
  const hasFinish = raceData.finishLocation.lat !== 59.3293;
  const hasCheckpoints = raceData.checkpoints.length > 0;
  const isPublished = raceData.status === 'published' || raceData.status === 'active';

  // Helper for checklist items
  const ChecklistItem = ({ 
    done, 
    label, 
    onClick, 
    isActive 
  }: { done: boolean, label: string, onClick?: () => void, isActive?: boolean }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
        isActive 
          ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
          : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
      }`}
    >
      <div className={`shrink-0 ${done ? 'text-green-500' : isActive ? 'text-blue-400' : 'text-gray-500'}`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </div>
      <span className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
        {label}
      </span>
      {isActive && !done && (
        <span className="ml-auto text-[10px] font-bold text-blue-400 uppercase tracking-wider animate-pulse">
          Aktiv
        </span>
      )}
    </button>
  );

  const handleSend = () => {
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  return (
    <>
      {/* Mobile Toggle Button (Visible only when closed on mobile) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-30 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white shadow-xl md:hidden"
        >
          <PanelLeftOpen className="w-6 h-6" />
        </button>
      )}

      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-full md:w-[400px] bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* --- HEADER --- */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={onExit}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Tillbaka
            </button>
            <div className="flex items-center gap-2">
               <StatusBadge status={raceData.status} />
               <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500">
                 <PanelLeftClose className="w-5 h-5" />
               </button>
            </div>
          </div>
          
          <h1 className="text-xl font-black text-white tracking-tight leading-none mb-1">
            {raceData.name}
          </h1>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">
            Mission Control
          </p>
        </div>

        {/* --- TABS --- */}
        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'guide' 
                ? 'border-blue-500 text-blue-400 bg-blue-900/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-slate-900'
            }`}
          >
            <ListTodo className="w-4 h-4" /> Guide
          </button>
          <button 
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'layers' 
                ? 'border-purple-500 text-purple-400 bg-purple-900/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-slate-900'
            }`}
          >
            <LayoutList className="w-4 h-4" /> Lager ({raceData.checkpoints.length})
          </button>
        </div>

        {/* --- MAIN CONTENT AREA (Scrollable) --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0">
          
          {/* TAB: GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Banläggning</div>
              
              <ChecklistItem 
                done={hasStart} 
                label="Placera Start" 
                isActive={activeTool === 'start'}
                onClick={() => setActiveTool('start')}
              />
              
              <ChecklistItem 
                done={hasFinish} 
                label="Placera Mål" 
                isActive={activeTool === 'finish'}
                onClick={() => setActiveTool('finish')}
              />
              
              <ChecklistItem 
                done={hasCheckpoints} 
                label="Lägg till Checkpoints" 
                isActive={activeTool === 'checkpoint'}
                onClick={() => setActiveTool('checkpoint')}
              />

              <div className="my-4 border-t border-slate-800"></div>
              
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Publicering</div>
              <button 
                onClick={onPublish}
                disabled={!hasStart || !hasFinish || !hasCheckpoints || isPublished}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isPublished 
                    ? 'bg-green-900/20 text-green-500 border border-green-900 cursor-default' 
                    : (!hasStart || !hasFinish || !hasCheckpoints)
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white animate-pulse'
                }`}
              >
                {isPublished ? <Globe className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                {isPublished ? 'Eventet är Live' : 'Publicera Event'}
              </button>
            </div>
          )}

          {/* TAB: LAYERS */}
          {activeTab === 'layers' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {raceData.checkpoints.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Inga checkpoints än. <br/>
                  <button 
                    onClick={() => setActiveTool('checkpoint')} 
                    className="text-blue-400 hover:underline mt-2"
                  >
                    Lägg till nu
                  </button>
                </div>
              )}

              {raceData.checkpoints.map((cp, idx) => {
                 const isMandatory = cp.type === 'mandatory';
                 const color = cp.color || (isMandatory ? '#3b82f6' : '#9B59B6');
                 
                 return (
                   <div key={cp.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3 group hover:border-slate-500 transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: color }}
                        >
                          {idx + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-200 text-sm truncate">{cp.name}</span>
                          {(cp.quiz || cp.challenge) && <Sparkles className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{cp.points} poäng • {isMandatory ? 'Krav' : 'Extra'}</div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditCheckpoint(cp.id)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteCheckpoint(cp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                 );
              })}
            </div>
          )}
        </div>

        {/* --- AI COPILOT (Fixed Bottom) --- */}
        <div className="border-t border-slate-800 bg-slate-900 p-4 flex flex-col h-[280px]">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Bot className="w-4 h-4" /> AI Copilot
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-3 pr-2">
            {messages.length === 0 && (
               <div className="text-xs text-gray-500 italic mt-4 text-center">
                 "Be mig skapa en bana i skogen..."
               </div>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`text-sm rounded-xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600/20 text-blue-100 ml-8 border border-blue-500/20' 
                    : 'bg-slate-800 text-gray-300 mr-8 border border-slate-700'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isChatLoading && (
              <div className="text-xs text-gray-500 flex gap-1 items-center animate-pulse">
                <Sparkles className="w-3 h-3" /> Tänker...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="relative">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Vad ska vi bygga?"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-gray-600"
            />
            <button 
              onClick={handleSend}
              disabled={!chatInput.trim() || isChatLoading}
              className="absolute right-2 top-2 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-transparent disabled:text-gray-600"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
};
