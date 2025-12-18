
import { RaceEvent, UserProfile, ParticipantResult, UserTier, ContactRequest } from '../types';
import { INITIAL_RACE_STATE } from '../constants';
import { IEventService, IAuthService, IStorageService, IUserService, ILeadService } from './interfaces';

const STORAGE_KEY = 'race_day_events';
const LEADS_KEY = 'quester_leads';
const MOCK_USER_ID = 'mock-user-123';

// --- MOCK LEAD SERVICE ---
export class MockLeadService implements ILeadService {
    async saveRequest(request: ContactRequest): Promise<void> {
        const stored = localStorage.getItem(LEADS_KEY);
        const leads: ContactRequest[] = stored ? JSON.parse(stored) : [];
        leads.push(request);
        localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    }

    async getAllRequests(): Promise<ContactRequest[]> {
        const stored = localStorage.getItem(LEADS_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    async deleteRequest(id: string): Promise<void> {
        const stored = localStorage.getItem(LEADS_KEY);
        if (stored) {
            const leads: ContactRequest[] = JSON.parse(stored);
            localStorage.setItem(LEADS_KEY, JSON.stringify(leads.filter(l => l.id !== id)));
        }
    }
}

// --- MOCK STORAGE SERVICE ---
export class MockStorageService implements IStorageService {
    async uploadBlob(path: string, file: Blob): Promise<string> {
        // Create a local object URL to simulate a cloud URL
        return new Promise((resolve) => {
            setTimeout(() => {
                const url = URL.createObjectURL(file);
                console.log(`[MockStorage] Uploaded to ${path} -> ${url}`);
                resolve(url);
            }, 800);
        });
    }
}

// --- MOCK AUTH SERVICE ---
export class MockAuthService implements IAuthService {
    private currentUser: UserProfile | null = null;
    private listeners: ((user: UserProfile | null) => void)[] = [];

    constructor() {
        const stored = localStorage.getItem('mock_auth_user');
        if (stored) {
            this.currentUser = JSON.parse(stored);
        }
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.currentUser));
    }

    async loginWithGoogle(): Promise<UserProfile> {
        this.currentUser = {
            id: MOCK_USER_ID,
            name: 'Mock Google User',
            email: 'google@mock.com',
            tier: 'SCOUT',
            role: 'user', // Default mock role
            createdRaceCount: 0,
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser'
        };
        localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
        this.notifyListeners();
        return this.currentUser;
    }

    async loginWithFacebook(): Promise<UserProfile> {
        this.currentUser = {
            id: MOCK_USER_ID,
            name: 'Mock Facebook User',
            email: 'fb@mock.com',
            tier: 'SCOUT',
            role: 'user',
            createdRaceCount: 0
        };
        localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
        this.notifyListeners();
        return this.currentUser;
    }

    async loginWithEmail(email: string, password?: string): Promise<UserProfile> {
        // Mock login - accepts any password
        // Generates a consistent ID based on email for "persistence" feeling in mock
        const pseudoId = btoa(email).substring(0, 12);
        
        // Allow simulated admin login for testing in mock mode
        const isAdmin = email.includes('admin');

        this.currentUser = {
            id: `mock-${pseudoId}`,
            name: email.split('@')[0],
            email: email,
            tier: 'SCOUT',
            role: isAdmin ? 'admin' : 'user',
            createdRaceCount: 0,
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        };
        localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
        this.notifyListeners();
        return this.currentUser;
    }

    async registerWithEmail(email: string, password: string, name: string): Promise<UserProfile> {
        const pseudoId = btoa(email).substring(0, 12);
        
        this.currentUser = {
            id: `mock-${pseudoId}`,
            name: name,
            email: email,
            tier: 'SCOUT',
            role: 'user',
            createdRaceCount: 0,
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        };
        localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
        this.notifyListeners();
        return this.currentUser;
    }

    async loginAnonymously(): Promise<UserProfile> {
        const guestId = 'guest-' + Date.now();
        this.currentUser = {
            id: guestId,
            name: 'Gäst',
            email: '',
            tier: 'SCOUT',
            role: 'user',
            createdRaceCount: 0,
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`
        };
        localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
        this.notifyListeners();
        return this.currentUser;
    }

    async updateProfileImage(file: Blob): Promise<string> {
        // Create a fake URL
        const url = URL.createObjectURL(file);
        
        if (this.currentUser) {
            this.currentUser = { ...this.currentUser, photoURL: url };
            localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
            this.notifyListeners();
        }
        return url;
    }

    async logout(): Promise<void> {
        this.currentUser = null;
        localStorage.removeItem('mock_auth_user');
        this.notifyListeners();
    }

    onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
        this.listeners.push(callback);
        // Async delay to simulate auth check
        setTimeout(() => callback(this.currentUser), 100);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }
}

// --- MOCK USER SERVICE ---
export class MockUserService implements IUserService {
    async getAllUsers(): Promise<UserProfile[]> {
        // Return current logged in mock user + some fake ones for the table
        const current = localStorage.getItem('mock_auth_user');
        const users: UserProfile[] = current ? [JSON.parse(current)] : [];
        
        // Add fake users for admin view testing
        users.push(
            { id: 'user-1', name: 'Anders Andersson', email: 'anders@test.se', tier: 'SCOUT', role: 'user', createdRaceCount: 1 },
            { id: 'user-2', name: 'Beata Berg', email: 'beata@eventbolaget.se', tier: 'CREATOR', role: 'user', createdRaceCount: 5 },
            { id: 'user-3', name: 'Cecilia Ceder', email: 'cecilia@skolan.se', tier: 'MASTER', role: 'user', createdRaceCount: 12 }
        );
        
        return Promise.resolve(users);
    }

    async updateUserTier(userId: string, tier: UserTier): Promise<void> {
        console.log(`[Mock] User ${userId} upgraded to ${tier}`);
        const current = localStorage.getItem('mock_auth_user');
        if (current) {
            const user = JSON.parse(current);
            if (user.id === userId) {
                user.tier = tier;
                localStorage.setItem('mock_auth_user', JSON.stringify(user));
            }
        }
    }

    async deleteUser(userId: string): Promise<void> {
        console.log(`[Mock] User ${userId} deleted.`);
        const current = localStorage.getItem('mock_auth_user');
        if (current) {
            const user = JSON.parse(current);
            if (user.id === userId) {
                localStorage.removeItem('mock_auth_user');
            }
        }
    }
}

// --- MOCK EVENT SERVICE ---
export class MockEventService implements IEventService {
  
  async getAllEvents(userId?: string, includePrivate?: boolean): Promise<RaceEvent[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                let events: RaceEvent[] = [];
                
                if (!stored) {
                    const initial: RaceEvent = { 
                        ...INITIAL_RACE_STATE, 
                        id: 'demo-race-1', 
                        name: 'Demo: Äventyrsloppet',
                        ownerId: MOCK_USER_ID
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([initial]));
                    events = [initial];
                } else {
                    events = JSON.parse(stored);
                }

                if (userId) {
                    // In mock mode, we are lenient with ownership to make testing easier
                    resolve(events.filter(e => e.ownerId === userId || !e.ownerId));
                } else if (includePrivate) {
                    // Admin view sees all
                    resolve(events);
                } else {
                    // Public query
                    resolve(events.filter(e => e.isPublic)); 
                }
            } catch (e) {
                console.error("Failed to load events", e);
                resolve([]);
            }
        }, 300);
    });
  }

  async saveEvent(event: RaceEvent): Promise<void> {
    const events = await this.getAllEvents(undefined, true); // Gets all, ignoring filter for save
    // We need to fetch raw from storage to ensure we don't lose other users' mock events if we filtered above
    const rawStored = localStorage.getItem(STORAGE_KEY);
    let allEvents: RaceEvent[] = rawStored ? JSON.parse(rawStored) : [];

    const index = allEvents.findIndex(e => e.id === event.id);
    
    if (index >= 0) {
      allEvents[index] = event;
    } else {
      allEvents.push(event);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allEvents));
  }

  async deleteEvent(id: string): Promise<void> {
    const rawStored = localStorage.getItem(STORAGE_KEY);
    let allEvents: RaceEvent[] = rawStored ? JSON.parse(rawStored) : [];
    
    const filtered = allEvents.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  async getEvent(id: string): Promise<RaceEvent | undefined> {
    const rawStored = localStorage.getItem(STORAGE_KEY);
    let allEvents: RaceEvent[] = rawStored ? JSON.parse(rawStored) : [];
    return allEvents.find(e => e.id === id);
  }

  async saveResult(eventId: string, result: ParticipantResult): Promise<void> {
      const event = await this.getEvent(eventId);
      if (event) {
          const currentResults = event.results || [];
          const idx = currentResults.findIndex(r => r.id === result.id);
          if (idx !== -1) currentResults[idx] = result;
          else currentResults.push(result);
          
          event.results = currentResults;
          
          // Also update participantIds helper array
          const pIds = new Set(event.participantIds || []);
          pIds.add(result.id);
          event.participantIds = Array.from(pIds);

          await this.saveEvent(event);
      }
  }

  async getParticipatedEvents(userId: string): Promise<RaceEvent[]> {
      const rawStored = localStorage.getItem(STORAGE_KEY);
      if (!rawStored) return [];
      const allEvents: RaceEvent[] = JSON.parse(rawStored);
      
      return allEvents.filter(e => {
          // Check explicit participant list or scan results
          if (e.participantIds?.includes(userId)) return true;
          return e.results?.some(r => r.id === userId);
      });
  }
}
