
import React, { useState, useEffect } from 'react';
import { RaceEvent, UserTier, TierConfig, SystemConfig, UserProfile, ContactRequest } from '../types';
import { api } from '../services/dataService'; // DataService
import { ShieldAlert, Search, Lock, Unlock, Users, Star, Calendar, Globe, EyeOff, ArrowLeft, Banknote, ListPlus, Save, Skull, Gift, AlertOctagon, Terminal, Loader2, MousePointerClick, X, Trash2, Trophy, MoreVertical, Edit2, Mail, MessageSquare, Clock } from 'lucide-react';

interface SystemAdminViewProps {
  events: RaceEvent[];
  onUpdateEvent: (event: RaceEvent) => void;
  tierConfigs: Record<UserTier, TierConfig>;
  onUpdateTierConfig: (configs: Record<UserTier, TierConfig>) => void;
  onExit: () => void;
  userProfile: UserProfile;
  onDeleteEvent: (id: string) => void; // Added onDeleteEvent prop
}

export const SystemAdminView: React.FC<SystemAdminViewProps> = ({ events, onUpdateEvent, tierConfigs, onUpdateTierConfig, onExit, userProfile, onDeleteEvent }) => {
  const [activeTab, setActiveTab] = useState<'features' | 'events' | 'pricing' | 'users' | 'leads'>('features');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Global Config State
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  // Local state for editing tiers
  const [editingTiers, setEditingTiers] = useState<Record<UserTier, TierConfig>>(tierConfigs);

  // User Management State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userEvents, setUserEvents] = useState<RaceEvent[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Leads State
  const [leads, setLeads] = useState<ContactRequest[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // --- ACCESS CONTROL CHECK (Role Based) ---
  useEffect(() => {
    // Check role from Firestore profile
    if (userProfile.role === 'admin') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [userProfile]);

  useEffect(() => {
      api.config.getConfig().then(setSystemConfig);
  }, []);

  // Fetch data when tabs are active
  useEffect(() => {
      if (activeTab === 'users' && isAuthorized) {
          setIsLoadingUsers(true);
          api.users.getAllUsers().then(users => {
              setAllUsers(users);
              setIsLoadingUsers(false);
          });
      } else if (activeTab === 'leads' && isAuthorized) {
          setIsLoadingLeads(true);
          api.leads.getAllRequests().then(requests => {
              setLeads(requests);
              setIsLoadingLeads(false);
          });
      }
  }, [activeTab, isAuthorized]);

  // If not authorized, show Access Denied screen
  if (!isAuthorized) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-950 text-white relative overflow-hidden">
         {/* Background Effects */}
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-gray-950 to-black pointer-events-none"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

         <div className="glass-panel p-10 rounded-3xl border border-red-900/50 shadow-2xl flex flex-col items-center max-w-md w-full relative z-10 animate-in zoom-in-95 duration-300">
             <div className="w-24 h-24 rounded-full bg-red-900/30 flex items-center justify-center mb-6 shadow-inner border border-red-500/20">
                 <Lock className="w-10 h-10 text-red-500" />
             </div>
             <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Access Denied</h1>
             <p className="text-gray-400 text-center mb-8">
                 Route <code>/sys-admin</code> is restricted to System Administrators. 
                 <br/><br/>
                 <span className="text-xs font-mono bg-gray-900 px-2 py-1 rounded text-red-300 border border-red-900/50">
                    Current Role: {userProfile.role || 'user'}
                 </span>
             </p>
             <button 
                onClick={onExit}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition-all"
             >
                 <ArrowLeft className="w-5 h-5" /> Return to Dashboard
             </button>
         </div>
      </div>
    );
  }

  // --- AUTHORIZED VIEW ---

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleLock = (event: RaceEvent) => {
    const isCurrentlyLocked = event.isLockedByAdmin || false;
    
    // If we are locking it, we must also set isPublic to false (unpublish)
    const updates: Partial<RaceEvent> = {
        isLockedByAdmin: !isCurrentlyLocked,
        isPublic: !isCurrentlyLocked ? false : event.isPublic // Keep original state if unlocking, force false if locking
    };

    onUpdateEvent({ ...event, ...updates });
  };

  const handleDeleteRequest = (id: string) => {
      if (window.confirm("Är du säker på att du vill radera detta event permanent? Det går inte att ångra.")) {
          onDeleteEvent(id);
      }
  };

  const handleDeleteLead = async (id: string) => {
      if (confirm("Vill du ta bort denna förfrågan permanent?")) {
          await api.leads.deleteRequest(id);
          setLeads(prev => prev.filter(l => l.id !== id));
      }
  };

  const calculateAvgRating = (ratings: any[]) => {
      if (!ratings || ratings.length === 0) return 0;
      return (ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length).toFixed(1);
  };

  const handleTierChange = (tier: UserTier, field: keyof TierConfig, value: any) => {
      setEditingTiers(prev => ({
          ...prev,
          [tier]: {
              ...prev[tier],
              [field]: value
          }
      }));
  };

  const handleFeatureChange = (tier: UserTier, index: number, value: string) => {
      const newFeatures = [...editingTiers[tier].features];
      newFeatures[index] = value;
      handleTierChange(tier, 'features', newFeatures);
  };

  const addFeature = (tier: UserTier) => {
       const newFeatures = [...editingTiers[tier].features, "Ny funktion"];
       handleTierChange(tier, 'features', newFeatures);
  };

  const removeFeature = (tier: UserTier, index: number) => {
       const newFeatures = editingTiers[tier].features.filter((_, i) => i !== index);
       handleTierChange(tier, 'features', newFeatures);
  };

  const saveTiers = () => {
      onUpdateTierConfig(editingTiers);
      alert("Prisplaner och paket uppdaterade!");
  };

  const toggleGlobalFeature = (featureKey: keyof SystemConfig['featuredModes']) => {
      if (!systemConfig) return;
      const newConfig = { ...systemConfig };
      newConfig.featuredModes[featureKey].isActive = !newConfig.featuredModes[featureKey].isActive;
      setSystemConfig(newConfig);
      api.config.updateConfig(newConfig);
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleUserTierUpdate = async (userId: string, newTier: UserTier) => {
      if (confirm(`Är du säker på att du vill ändra denna användare till ${newTier}?`)) {
          await api.users.updateUserTier(userId, newTier);
          // Optimistic update
          setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, tier: newTier } : u));
      }
  };

  const handleDeleteUser = async (userId: string) => {
      if (confirm("VARNING: Detta tar bort användarprofilen permanent. Denna åtgärd går inte att ångra. Fortsätt?")) {
          await api.users.deleteUser(userId);
          setAllUsers(prev => prev.filter(u => u.id !== userId));
      }
  };

  const handleViewUserEvents = async (user: UserProfile) => {
      setSelectedUser(user);
      const userEvts = await api.events.getAllEvents(user.id);
      setUserEvents(userEvts);
  };

  if (!systemConfig) return <div className="h-full w-full flex items-center justify-center bg-gray-950"><Loader2 className="w-10 h-10 animate-spin text-red-500" /></div>;

  return (
    <div className="h-full bg-gray-950 text-gray-100 font-sans flex flex-col overflow-y-auto">
      {/* Admin Header */}
      <div className="bg-red-900/20 border-b border-red-900/50 p-6 shrink-0">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-3">
                 <div className="p-3 bg-red-600 rounded-lg shadow-lg shadow-red-900/50 animate-pulse">
                     <ShieldAlert className="w-6 h-6 text-white" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-black uppercase tracking-tight text-white">System Admin</h1>
                     <div className="flex items-center gap-2">
                         <p className="text-red-300 text-sm font-mono">Secured Route • System Administrator</p>
                         <span className="px-2 py-0.5 rounded bg-red-950 text-red-500 text-[10px] font-bold border border-red-800 hidden sm:inline-block">{userProfile.email}</span>
                     </div>
                 </div>
             </div>
             <button 
                onClick={onExit}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-700"
             >
                 <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Tillbaka</span>
             </button>
         </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-6 shrink-0">
          <div className="flex gap-4 border-b border-gray-800 overflow-x-auto pb-1">
              <button 
                onClick={() => setActiveTab('features')}
                className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'features' ? 'border-red-500 text-white bg-red-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  Live Ops Features
              </button>
              <button 
                onClick={() => setActiveTab('events')}
                className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'events' ? 'border-red-500 text-white bg-red-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  Hantera Event
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'users' ? 'border-red-500 text-white bg-red-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  Användare & Konton
              </button>
              <button 
                onClick={() => setActiveTab('leads')}
                className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'leads' ? 'border-red-500 text-white bg-red-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  Leads ({leads.length})
              </button>
              <button 
                onClick={() => setActiveTab('pricing')}
                className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'pricing' ? 'border-red-500 text-white bg-red-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                  Prissättning
              </button>
          </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1">
          
          {/* TAB: FEATURES (LIVE OPS) */}
          {activeTab === 'features' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl mb-6 flex items-start gap-3">
                      <AlertOctagon className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                          <h3 className="font-bold text-blue-200 text-sm">Real-time Database Control</h3>
                          <p className="text-xs text-blue-300/70">
                              {api.isOffline ? "Running in Mock Mode. Changes saved to LocalStorage." : "Running in Production. Changes propagate via Firebase."}
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Zombie Survival Toggle */}
                      <div className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group ${systemConfig.featuredModes.zombie_survival.isActive ? 'bg-red-950/30 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'bg-gray-900 border-gray-700'}`}>
                          {/* Background Glow */}
                          <div className={`absolute -right-10 -top-10 w-40 h-40 bg-red-600/20 rounded-full blur-3xl transition-opacity duration-500 ${systemConfig.featuredModes.zombie_survival.isActive ? 'opacity-100' : 'opacity-0'}`}></div>

                          <div className="relative z-10 flex justify-between items-start mb-4">
                              <div className="flex items-center gap-4">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${systemConfig.featuredModes.zombie_survival.isActive ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-600'}`}>
                                      <Skull className="w-8 h-8" />
                                  </div>
                                  <div>
                                      <h3 className="text-xl font-black uppercase text-white tracking-tight">{systemConfig.featuredModes.zombie_survival.title}</h3>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className={`w-2 h-2 rounded-full transition-colors ${systemConfig.featuredModes.zombie_survival.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
                                          <span className={`text-xs font-bold uppercase transition-colors ${systemConfig.featuredModes.zombie_survival.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                                              {systemConfig.featuredModes.zombie_survival.isActive ? 'Active' : 'Disabled'}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Toggle Switch */}
                              <button 
                                 onClick={() => toggleGlobalFeature('zombie_survival')}
                                 className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 ${systemConfig.featuredModes.zombie_survival.isActive ? 'bg-green-600' : 'bg-gray-700'}`}
                              >
                                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${systemConfig.featuredModes.zombie_survival.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                              </button>
                          </div>
                          <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                              Activates the "Quick Start" Zombie Survival mode on the landing page. Users can instantly generate horror-themed runs based on their location.
                          </p>
                      </div>

                      {/* Christmas Hunt Toggle */}
                      <div className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group ${systemConfig.featuredModes.christmas_hunt.isActive ? 'bg-blue-950/30 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'bg-gray-900 border-gray-700'}`}>
                           {/* Background Glow */}
                          <div className={`absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl transition-opacity duration-500 ${systemConfig.featuredModes.christmas_hunt.isActive ? 'opacity-100' : 'opacity-0'}`}></div>

                          <div className="relative z-10 flex justify-between items-start mb-4">
                              <div className="flex items-center gap-4">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${systemConfig.featuredModes.christmas_hunt.isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-600'}`}>
                                      <Gift className="w-8 h-8" />
                                  </div>
                                  <div>
                                      <h3 className="text-xl font-black uppercase text-white tracking-tight">{systemConfig.featuredModes.christmas_hunt.title}</h3>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className={`w-2 h-2 rounded-full transition-colors ${systemConfig.featuredModes.christmas_hunt.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
                                          <span className={`text-xs font-bold uppercase transition-colors ${systemConfig.featuredModes.christmas_hunt.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                                              {systemConfig.featuredModes.christmas_hunt.isActive ? 'Active' : 'Disabled'}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Toggle Switch */}
                              <button 
                                 onClick={() => toggleGlobalFeature('christmas_hunt')}
                                 className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 ${systemConfig.featuredModes.christmas_hunt.isActive ? 'bg-green-600' : 'bg-gray-700'}`}
                              >
                                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${systemConfig.featuredModes.christmas_hunt.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                              </button>
                          </div>
                          <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                              Enables the Seasonal "Christmas Hunt" event. Adds snow effects and gift-collecting mechanics to the instant game generator.
                          </p>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: LEADS (New) */}
          {activeTab === 'leads' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="w-6 h-6 text-blue-400" /> Intresseanmälningar (MASTER)</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Sök leads..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-900 border border-gray-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950 text-gray-500 text-[10px] uppercase font-bold tracking-widest border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4">Inkommet</th>
                                    <th className="px-6 py-4">Kontakt</th>
                                    <th className="px-6 py-4">Organisation</th>
                                    <th className="px-6 py-4">Meddelande</th>
                                    <th className="px-6 py-4 text-right">Åtgärd</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {isLoadingLeads ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Hämtar förfrågningar...
                                        </td>
                                    </tr>
                                ) : filteredLeads.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Inga förfrågningar hittades.</td></tr>
                                ) : (
                                    filteredLeads.map(lead => (
                                        <tr key={lead.id} className="hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white font-mono">{new Date(lead.timestamp).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-gray-600 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(lead.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white">{lead.name}</div>
                                                <a href={`mailto:${lead.email}`} className="text-xs text-blue-400 hover:underline flex items-center gap-1"><Mail className="w-3 h-3"/> {lead.email}</a>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-300 font-bold">{lead.organization}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-400 max-w-xs line-clamp-2 italic" title={lead.message}>
                                                    {lead.message ? `"${lead.message}"` : <span className="opacity-30">Inget meddelande</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleDeleteLead(lead.id)}
                                                    className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded-lg hover:bg-red-900/20"
                                                    title="Radera"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
          )}

          {/* TAB: EVENTS */}
          {activeTab === 'events' && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="text-gray-500 text-xs font-bold uppercase">Totalt antal event</div>
                        <div className="text-3xl font-black text-white">{events.length}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="text-gray-500 text-xs font-bold uppercase">Publika Event</div>
                        <div className="text-3xl font-black text-green-400">{events.filter(e => e.isPublic).length}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="text-gray-500 text-xs font-bold uppercase">Låsta av Admin</div>
                        <div className="text-3xl font-black text-red-400">{events.filter(e => e.isLockedByAdmin).length}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="text-gray-500 text-xs font-bold uppercase">Totalt antal deltagare</div>
                        <div className="text-3xl font-black text-blue-400">
                            {events.reduce((acc, curr) => acc + (curr.results?.length || 0), 0)}
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Sök på event-ID eller namn..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                {/* Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Event</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4">Datum</th>
                                    <th className="px-6 py-4 text-center">Deltagare</th>
                                    <th className="px-6 py-4 text-center">Betyg</th>
                                    <th className="px-6 py-4 text-right">Åtgärder</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{event.name}</div>
                                            <div className="text-xs text-gray-500 font-mono">{event.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {event.isLockedByAdmin ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs font-bold border border-red-900/50">
                                                    <Lock className="w-3 h-3" /> LÅST (Privat)
                                                </span>
                                            ) : event.isPublic ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs font-bold border border-green-900/50">
                                                    <Globe className="w-3 h-3" /> PUBLIKT
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-800 text-gray-400 text-xs font-bold border border-gray-700">
                                                    <EyeOff className="w-3 h-3" /> PRIVAT
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {event.category}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-gray-500" />
                                                {new Date(event.startDateTime).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 text-gray-300 font-mono">
                                                <Users className="w-3 h-3 text-blue-500" />
                                                {event.results?.length || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 text-yellow-400 font-bold bg-yellow-900/10 px-2 py-1 rounded">
                                                <Star className="w-3 h-3 fill-yellow-400" />
                                                {calculateAvgRating(event.ratings || [])}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => toggleLock(event)}
                                                    className={`px-3 py-1.5 rounded text-xs font-bold border transition-all inline-flex items-center gap-2 ${
                                                        event.isLockedByAdmin 
                                                        ? 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700' 
                                                        : 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40'
                                                    }`}
                                                >
                                                    {event.isLockedByAdmin ? (
                                                        <> <Unlock className="w-3 h-3" /> Lås upp </>
                                                    ) : (
                                                        <> <Lock className="w-3 h-3" /> Lås & Avpublicera </>
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteRequest(event.id)}
                                                    className="px-3 py-1.5 rounded text-xs font-bold bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 transition-all inline-flex items-center gap-2"
                                                    title="Radera Permanent"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredEvents.length === 0 && (
                            <div className="p-8 text-center text-gray-500 italic">Inga event matchade sökningen.</div>
                        )}
                    </div>
                </div>
              </>
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="text-gray-500 text-xs font-bold uppercase">Totalt antal konton</div>
                        <div className="text-3xl font-black text-white">{allUsers.length}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="text-gray-500 text-xs font-bold uppercase">Arrangörer (Creators/Masters)</div>
                        <div className="text-3xl font-black text-purple-400">{allUsers.filter(u => u.tier !== 'SCOUT').length}</div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Sök på namn, email eller ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                {/* Users Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Användare</th>
                                    <th className="px-6 py-4">Roll</th>
                                    <th className="px-6 py-4">Abonnemang (Tier)</th>
                                    <th className="px-6 py-4 text-center">Event Skapade</th>
                                    <th className="px-6 py-4 text-right">Åtgärder</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {isLoadingUsers ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Laddar användare...
                                        </td>
                                    </tr>
                                ) : filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-500">{user.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                    <div className="text-[10px] text-gray-600 font-mono mt-0.5" title={user.id}>{user.id.substring(0,8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                                user.role === 'admin' 
                                                ? 'bg-red-900/30 text-red-400 border-red-900/50' 
                                                : 'bg-gray-800 text-gray-400 border-gray-700'
                                            }`}>
                                                {user.role || 'user'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={user.tier}
                                                onChange={(e) => handleUserTierUpdate(user.id, e.target.value as UserTier)}
                                                className="bg-gray-950 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="SCOUT">SCOUT</option>
                                                <option value="CREATOR">CREATOR</option>
                                                <option value="MASTER">MASTER</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono text-white font-bold">{user.createdRaceCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleViewUserEvents(user)}
                                                    className="p-2 rounded bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-blue-900/50 transition-colors"
                                                    title="Se event"
                                                >
                                                    <ListPlus className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 rounded bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 transition-colors"
                                                    title="Ta bort konto"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!isLoadingUsers && filteredUsers.length === 0 && (
                            <div className="p-8 text-center text-gray-500 italic">Inga användare matchade sökningen.</div>
                        )}
                    </div>
                </div>
              </>
          )}

          {/* TAB: PRICING */}
          {activeTab === 'pricing' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex justify-between items-center bg-blue-900/20 p-4 rounded-xl border border-blue-900/50">
                       <div className="flex items-center gap-3">
                           <Banknote className="w-6 h-6 text-blue-400" />
                           <p className="text-sm text-blue-200">
                               Här konfigurerar du vad som ingår i varje nivå och vad det kostar. Ändringar slår igenom direkt i appen.
                           </p>
                       </div>
                       <button onClick={saveTiers} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                           <Save className="w-4 h-4" /> Spara Konfiguration
                       </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {(['SCOUT', 'CREATOR', 'MASTER'] as UserTier[]).map((tier) => (
                           <div key={tier} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                               <div className="p-6 border-b border-gray-800 bg-gray-950">
                                   <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Tier ID: {tier}</div>
                                   <input 
                                      type="text" 
                                      value={editingTiers[tier].displayName}
                                      onChange={(e) => handleTierChange(tier, 'displayName', e.target.value)}
                                      className="text-2xl font-black bg-transparent text-white border-b border-gray-700 focus:border-blue-500 outline-none w-full mb-2"
                                   />
                                   <textarea 
                                      value={editingTiers[tier].description}
                                      onChange={(e) => handleTierChange(tier, 'description', e.target.value)}
                                      className="w-full bg-gray-900 text-sm text-gray-400 p-2 rounded border border-gray-800 focus:border-blue-500 outline-none resize-none h-20"
                                   />
                               </div>

                               <div className="p-6 space-y-4 flex-1">
                                   <div>
                                       <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Prisinställningar</label>
                                       <div className="grid grid-cols-2 gap-2">
                                           <input 
                                                type="text" 
                                                value={editingTiers[tier].priceAmount}
                                                onChange={(e) => handleTierChange(tier, 'priceAmount', e.target.value)}
                                                className="bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                                placeholder="Belopp/Text"
                                           />
                                           <input 
                                                type="text" 
                                                value={editingTiers[tier].priceCurrency}
                                                onChange={(e) => handleTierChange(tier, 'priceCurrency', e.target.value)}
                                                className="bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                                placeholder="Valuta (kr)"
                                           />
                                       </div>
                                       <input 
                                            type="text" 
                                            value={editingTiers[tier].priceFrequency}
                                            onChange={(e) => handleTierChange(tier, 'priceFrequency', e.target.value)}
                                            className="bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm w-full mt-2"
                                            placeholder="Frekvens (ex: /mån, engångsköp)"
                                       />
                                   </div>

                                   <div>
                                       <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Marknadsföring</label>
                                       <div className="space-y-2">
                                           <div className="flex items-center gap-2">
                                               <MousePointerClick className="w-4 h-4 text-gray-500" />
                                               <input 
                                                    type="text" 
                                                    value={editingTiers[tier].buttonText}
                                                    onChange={(e) => handleTierChange(tier, 'buttonText', e.target.value)}
                                                    className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                                    placeholder="Knapptext (t.ex. Välj Creator)"
                                               />
                                           </div>
                                           <label className="flex items-center gap-2 cursor-pointer p-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-750">
                                               <input 
                                                    type="checkbox" 
                                                    checked={editingTiers[tier].isRecommended}
                                                    onChange={(e) => handleTierChange(tier, 'isRecommended', e.target.checked)}
                                                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                               />
                                               <span className="text-sm text-gray-300 font-bold">Rekommenderad / Populärast</span>
                                           </label>
                                       </div>
                                   </div>

                                   <div>
                                       <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs text-gray-500 font-bold uppercase">Tekniska Begränsningar</label>
                                       </div>
                                       <div className="space-y-2 text-sm">
                                           <div className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                               <span>Aktiva Event</span>
                                               <input type="number" value={editingTiers[tier].maxActiveRaces} onChange={(e) => handleTierChange(tier, 'maxActiveRaces', parseInt(e.target.value))} className="w-16 bg-gray-900 border border-gray-700 rounded text-center text-white"/>
                                           </div>
                                            <div className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                               <span>Max Checkpoints</span>
                                               <input type="number" value={editingTiers[tier].maxCheckpointsPerRace} onChange={(e) => handleTierChange(tier, 'maxCheckpointsPerRace', parseInt(e.target.value))} className="w-16 bg-gray-900 border border-gray-700 rounded text-center text-white"/>
                                           </div>
                                            <div className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                               <span>Max Deltagare</span>
                                               <input type="number" value={editingTiers[tier].maxParticipantsPerRace} onChange={(e) => handleTierChange(tier, 'maxParticipantsPerRace', parseInt(e.target.value))} className="w-16 bg-gray-900 border border-gray-700 rounded text-center text-white"/>
                                           </div>
                                       </div>
                                   </div>

                                   <div>
                                       <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs text-gray-500 font-bold uppercase">Funktionslista (UI)</label>
                                            <button onClick={() => addFeature(tier)} className="text-blue-400 hover:text-white"><ListPlus className="w-4 h-4" /></button>
                                       </div>
                                       <div className="space-y-2">
                                           {editingTiers[tier].features.map((feat, idx) => (
                                               <div key={idx} className="flex gap-2">
                                                   <input 
                                                      value={feat}
                                                      onChange={(e) => handleFeatureChange(tier, idx, e.target.value)}
                                                      className="flex-1 bg-gray-800 border border-gray-700 rounded p-1.5 text-white text-xs"
                                                   />
                                                   <button onClick={() => removeFeature(tier, idx)} className="text-red-500 hover:text-red-400 px-1">×</button>
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
              </div>
          )}
      </div>

      {/* USER DETAIL DIALOG */}
      {selectedUser && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950 rounded-t-3xl">
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Users className="w-5 h-5 text-blue-400" />
                              Events av {selectedUser.name}
                          </h2>
                          <p className="text-sm text-gray-500">{selectedUser.email} • {selectedUser.tier}</p>
                      </div>
                      <button onClick={() => setSelectedUser(null)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-900 rounded-b-3xl">
                      {userEvents.length === 0 ? (
                          <div className="text-center text-gray-500 py-10">Inga event skapade av denna användare.</div>
                      ) : (
                          <div className="grid grid-cols-1 gap-4">
                              {userEvents.map(evt => (
                                  <div key={evt.id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex justify-between items-center">
                                      <div>
                                          <div className="font-bold text-white">{evt.name}</div>
                                          <div className="text-xs text-gray-400 flex items-center gap-2">
                                              <span>{evt.category}</span>
                                              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                              <span>{evt.status || 'Draft'}</span>
                                              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                              <span>{(evt.results || []).length} Deltagare</span>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-sm font-mono text-gray-300">{evt.accessCode || '-'}</div>
                                          <div className="text-xs text-gray-500">{new Date(evt.startDateTime).toLocaleDateString()}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
