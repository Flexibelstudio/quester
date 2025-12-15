
import React, { useState, useEffect } from 'react';
import { api } from './services/dataService'; 
import { INITIAL_RACE_STATE, INITIAL_TIER_CONFIGS } from './constants';
import { RaceEvent, UserTier, TierConfig } from './types';
import { ParticipantView } from './components/ParticipantView';
import { PublicEventBrowser } from './components/PublicEventBrowser';
import { SystemAdminView } from './components/SystemAdminView';
import { RaceCreationWizard } from './components/RaceCreationWizard';
import { Dashboard } from './components/Dashboard';
import { UpgradeDialog } from './components/UpgradeDialog';
import { LandingPage } from './components/LandingPage';
import { OrganizerView } from './components/OrganizerView';
import { ProfileDialog } from './components/ProfileDialog';
import { EventSettingsDialog } from './components/EventSettingsDialog'; // Hoisted
import { ErrorBoundary } from './components/ErrorBoundary'; 
import { WifiOff, Loader2 } from 'lucide-react';
import { accessControlService } from './services/accessControl';
import { AuthProvider, useAuth } from './contexts/AuthContext';

type ViewMode = 'landing' | 'dashboard' | 'organizer' | 'participant' | 'browser' | 'system_admin';

// Inner App Component that uses the AuthContext
function AppContent() {
  const { user, isLoading: authLoading, updateUserTier } = useAuth();
  
  // --- STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('landing');
  const [allEvents, setAllEvents] = useState<RaceEvent[]>([]);
  const [raceData, setRaceData] = useState<RaceEvent>(INITIAL_RACE_STATE);
  
  // Dashboard Settings State
  const [dashboardSettingsEvent, setDashboardSettingsEvent] = useState<RaceEvent | null>(null);
  
  // Dynamic Tier Configuration
  const [tierConfigs, setTierConfigs] = useState<Record<UserTier, TierConfig>>(INITIAL_TIER_CONFIGS);

  // UI Flags
  const [isCreatingRace, setIsCreatingRace] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  // NEW: State to hold the specific reason why the upgrade dialog was opened
  const [upgradeTriggerMessage, setUpgradeTriggerMessage] = useState<string>('');
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');
  const [isTestRun, setIsTestRun] = useState(false); 
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // System State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // --- EFFECT HOOKS ---

  // Check URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
        setInitialJoinCode(code);
        setViewMode('browser');
    }
  }, []);

  // Redirect to landing page on logout if inside restricted views
  useEffect(() => {
    if (!authLoading && !user && ['dashboard', 'organizer', 'system_admin'].includes(viewMode)) {
        setViewMode('landing');
    }
  }, [user, authLoading, viewMode]);

  // Network Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Unsaved changes protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = ''; 
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Data Loading Logic based on Auth State
  const refreshEvents = async () => {
      setIsLoadingData(true);
      try {
          if (viewMode === 'dashboard' || viewMode === 'organizer') {
              // Load MY events if logged in
              if (user) {
                  const events = await api.events.getAllEvents(user.id);
                  setAllEvents(events);
              } else {
                  setAllEvents([]);
              }
          } else if (viewMode === 'browser') {
              // Load PUBLIC events (pass undefined user ID implies public/all)
              const events = await api.events.getAllEvents();
              setAllEvents(events);
          } else if (viewMode === 'system_admin') {
              // Admin mode fetches ALL events, including private ones
              const events = await api.events.getAllEvents(undefined, true);
              setAllEvents(events);
          }
      } catch (error) {
          console.error("Error fetching events:", error);
      } finally {
          setIsLoadingData(false);
      }
  };

  useEffect(() => {
    refreshEvents();
  }, [viewMode, user]); // Reload when view changes or user logs in

  // --- HANDLERS ---

  const handleUpgrade = (tier: UserTier) => {
      updateUserTier(tier);
      if (raceData) {
          setRaceData(prev => ({ ...prev, creatorTier: tier }));
      }
      setIsUpgradeOpen(false);
      setUpgradeTriggerMessage('');
  };

  const handleCreateEventClick = () => {
    if (!user) {
        alert("Du måste logga in för att skapa event.");
        return;
    }
    const activeRaces = allEvents.filter(e => e.status !== 'archived').length;
    const check = accessControlService.canCreateRace(user, activeRaces, tierConfigs);
    
    if (!check.allowed) {
         setUpgradeTriggerMessage(check.message || "Du har nått gränsen för antal events.");
         setIsUpgradeOpen(true);
         return;
    }
    setIsCreatingRace(true);
  };

  const handleRaceWizardComplete = async (newRaceData: Partial<RaceEvent>) => {
      if (!user) return;
      
      // Determine if this is an official "Quester" event created by an admin
      // The wizard sets ownerId to 'QUESTER_SYSTEM' in that case.
      // Otherwise, default to current user.
      const isOfficial = newRaceData.ownerId === 'QUESTER_SYSTEM';

      const finalRaceData: RaceEvent = {
          ...INITIAL_RACE_STATE,
          ...newRaceData,
          id: `race-${Date.now()}`,
          // If official, preserve the overrides from wizard. Else use user profile.
          ownerId: isOfficial ? 'QUESTER_SYSTEM' : user.id,
          ownerName: isOfficial ? 'Quester Original' : user.name,
          ownerPhotoURL: isOfficial ? '' : user.photoURL, // Empty string = Use Quester Logo in UI
          creatorTier: user.tier,
          status: newRaceData.status || 'draft',
          results: []
      } as RaceEvent;

      await api.events.saveEvent(finalRaceData);
      await refreshEvents();

      setRaceData(finalRaceData);
      setHasUnsavedChanges(false);
      setIsCreatingRace(false);
      setViewMode('organizer');
  };

  const handleDirectRaceCreate = async (event: RaceEvent) => {
     if (user) {
         event.ownerId = user.id; // Set Owner
         event.ownerName = user.name;
         event.ownerPhotoURL = user.photoURL;
         event.creatorTier = user.tier;
         // Mark as instant game so it doesn't clutter Organizer Dashboard
         event.isInstantGame = true; 
     }
     
     await api.events.saveEvent(event);
     await refreshEvents();
     
     setRaceData(event);
     setHasUnsavedChanges(false);
     
     setIsTestRun(false); 
     setPreviousViewMode('landing');
     setViewMode('participant');
  };

  const handleRaceUpdate = (updates: Partial<RaceEvent>) => {
      setRaceData(prev => ({ ...prev, ...updates }));
      setHasUnsavedChanges(true);
  };

  const handleManualSave = async () => {
      // Ensure ownerId is preserved or set
      const dataToSave = { ...raceData };
      if (user) {
          // Only force override owner info if it is missing OR if it's not a special system ID
          // This prevents overwriting 'QUESTER_SYSTEM' with the admin's personal ID during edit
          if (!dataToSave.ownerId) {
              dataToSave.ownerId = user.id;
              dataToSave.ownerName = user.name;
          } else if (dataToSave.ownerId !== 'QUESTER_SYSTEM' && dataToSave.ownerId === user.id) {
              // Only update name if it matches current user, keeping profile sync
              if (!dataToSave.ownerName) dataToSave.ownerName = user.name;
          }
      }
      
      await api.events.saveEvent(dataToSave);
      await refreshEvents();
      setHasUnsavedChanges(false);
      
      const originalText = document.title;
      document.title = "Sparat! ✅";
      setTimeout(() => document.title = originalText, 2000);
  };

  const handleDashboardSettingsSave = async (updates: Partial<RaceEvent>) => {
      if (!dashboardSettingsEvent) return;
      const updatedEvent = { ...dashboardSettingsEvent, ...updates };
      await api.events.saveEvent(updatedEvent);
      await refreshEvents(); // Refresh dashboard list
      setDashboardSettingsEvent(null);
  };

  const handleExitOrganizer = async () => {
      if (hasUnsavedChanges) {
          if (!window.confirm('Du har osparade ändringar. Är du säker på att du vill lämna?')) {
              return;
          }
          await refreshEvents(); // Revert to saved
      }
      setHasUnsavedChanges(false);
      setViewMode('dashboard');
  };

  const handleTestRun = async () => {
      if (hasUnsavedChanges) await handleManualSave();
      setIsTestRun(true);
      setPreviousViewMode('organizer');
      setViewMode('participant');
  };

  const handleDeleteEvent = async (id: string) => {
      await api.events.deleteEvent(id);
      await refreshEvents();
  };

  const renderOfflineBanner = () => (api.isOffline || !isOnline) && (
    <div className="bg-red-600 text-white px-4 py-1 text-xs font-bold text-center flex items-center justify-center gap-2 z-[9999]">
        <WifiOff className="w-3 h-3" />
        {api.isOffline ? 'OFFLINE / MOCK MODE (Sparar till LocalStorage)' : 'INGEN INTERNETANSLUTNING'}
    </div>
  );

  if (authLoading || (isLoadingData && viewMode !== 'landing')) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Laddar Quester...</p>
          </div>
      )
  }

  // Fallback user profile for views that expect it (prevents null checks everywhere)
  const safeProfile = user || { id: 'guest', name: 'Gäst', email: '', tier: 'SCOUT', createdRaceCount: 0 };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-gray-100 font-sans">
      <UpgradeDialog 
        currentTier={safeProfile.tier} 
        isOpen={isUpgradeOpen} 
        onClose={() => {
            setIsUpgradeOpen(false);
            setUpgradeTriggerMessage('');
        }}
        onUpgrade={handleUpgrade} 
        tierConfigs={tierConfigs}
        customMessage={upgradeTriggerMessage} 
      />
      
      {/* Profile Dialog */}
      {user && (
          <ProfileDialog 
            isOpen={isProfileOpen} 
            onClose={() => setIsProfileOpen(false)} 
            user={user} 
            onOpenSystemAdmin={() => setViewMode('system_admin')}
          />
      )}

      {/* Dashboard Specific Settings Dialog */}
      {dashboardSettingsEvent && (
          <EventSettingsDialog
              isOpen={!!dashboardSettingsEvent}
              raceData={dashboardSettingsEvent}
              onClose={() => setDashboardSettingsEvent(null)}
              onSave={handleDashboardSettingsSave}
              onDelete={() => handleDeleteEvent(dashboardSettingsEvent.id)}
          />
      )}

      {renderOfflineBanner()}

      {viewMode === 'landing' && (
        <LandingPage 
            userProfile={safeProfile}
            onSelectTier={(t) => { 
                // PREVENT DOWNGRADE LOGIC
                const isGuest = safeProfile.id === 'guest';
                const tierLevels: Record<string, number> = { 'SCOUT': 0, 'CREATOR': 1, 'MASTER': 2 };
                
                const currentLevel = tierLevels[safeProfile.tier] || 0;
                const newLevel = tierLevels[t] || 0;

                if (isGuest || newLevel > currentLevel) {
                    updateUserTier(t); 
                }
                
                setViewMode('dashboard'); 
            }}
            onRegisterUser={(name, email) => {}}
            onBrowseEvents={() => {
                setPreviousViewMode('landing');
                setViewMode('browser');
            }}
            tierConfigs={tierConfigs}
            onInstantGame={handleDirectRaceCreate}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenSystemAdmin={() => setViewMode('system_admin')}
            onCreateEvent={() => {
                setViewMode('dashboard');
                handleCreateEventClick();
            }}
        />
      )}
      
      {viewMode === 'dashboard' && (
        <>
          {isCreatingRace && <RaceCreationWizard onCancel={() => setIsCreatingRace(false)} onComplete={handleRaceWizardComplete} user={user} />}
          <Dashboard 
            events={allEvents} 
            userTier={safeProfile.tier}
            userProfile={safeProfile}
            tierConfigs={tierConfigs}
            onSelectEvent={(e) => { 
                setRaceData(e); 
                setHasUnsavedChanges(false); 
                setViewMode('organizer'); 
            }}
            onCreateEvent={handleCreateEventClick}
            onDeleteEvent={async (id) => {
                if (confirm('Är du säker på att du vill radera detta event permanent?')) {
                    await handleDeleteEvent(id);
                }
            }}
            onOpenParticipant={(e) => { 
                if(e) setRaceData(e); 
                setIsTestRun(false);
                setPreviousViewMode('dashboard');
                setViewMode('browser'); 
            }}
            onOpenSystemAdmin={() => setViewMode('system_admin')}
            onUpgradeClick={() => {
                setUpgradeTriggerMessage('');
                setIsUpgradeOpen(true);
            }}
            onDirectRaceCreate={handleDirectRaceCreate}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenSettings={(e) => setDashboardSettingsEvent(e)}
          />
        </>
      )}

      {viewMode === 'browser' && (
        <PublicEventBrowser 
            events={allEvents}
            initialJoinCode={initialJoinCode} 
            onJoinRace={(e) => { setRaceData(e); setIsTestRun(false); setViewMode('participant'); }}
            onBackToAdmin={() => setViewMode('dashboard')}
            onOpenSystemAdmin={() => setViewMode('system_admin')}
            onDirectRaceCreate={handleDirectRaceCreate}
            onGoHome={() => setViewMode('landing')}
            userProfile={safeProfile}
            onBack={() => setViewMode(previousViewMode)}
        />
      )}

      {viewMode === 'system_admin' && (
          <SystemAdminView 
              events={allEvents}
              onUpdateEvent={async (e) => { await api.events.saveEvent(e); refreshEvents(); }}
              tierConfigs={tierConfigs}
              onUpdateTierConfig={(newConfigs) => setTierConfigs(newConfigs)}
              onExit={() => setViewMode('dashboard')}
              userProfile={safeProfile}
              onDeleteEvent={handleDeleteEvent}
          />
      )}

      {viewMode === 'participant' && (
        <ParticipantView 
            raceData={raceData} 
            initialJoinCode={initialJoinCode}
            isTestMode={isTestRun} 
            userProfile={user} 
            onExit={() => {
                setIsTestRun(false);
                setViewMode(previousViewMode);
            }} 
            onUpdateResult={async (res) => {
                const currentResults = raceData.results || [];
                const idx = currentResults.findIndex(r => r.id === res.id);
                const newResults = idx !== -1 ? currentResults.map((r, i) => i === idx ? res : r) : [...currentResults, res];
                setRaceData({ ...raceData, results: newResults });

                if (!isTestRun) {
                    await api.events.saveResult(raceData.id, res);
                }
            }}
            onRateEvent={async (r) => {
                 if (isTestRun) return;
                 const newData = { ...raceData, ratings: [...(raceData.ratings || []), r] };
                 setRaceData(newData);
                 api.events.saveEvent(newData);
            }}
        />
      )}

      {viewMode === 'organizer' && (
        <OrganizerView 
            raceData={raceData}
            userProfile={safeProfile}
            tierConfigs={tierConfigs}
            onUpdateRace={handleRaceUpdate}
            onSave={handleManualSave}
            onExit={handleExitOrganizer}
            hasUnsavedChanges={hasUnsavedChanges}
            isOnline={isOnline}
            onUpgradeRequest={(msg) => {
                setUpgradeTriggerMessage(msg || '');
                setIsUpgradeOpen(true);
            }}
            onTestRun={handleTestRun}
            onDeleteEvent={async (id) => {
                await handleDeleteEvent(id);
                setViewMode('dashboard');
            }}
        />
      )}
    </div>
  );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ErrorBoundary>
    );
}
