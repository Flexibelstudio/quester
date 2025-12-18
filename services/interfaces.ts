
import { RaceEvent, GlobalScoreEntry, SystemConfig, UserProfile, ParticipantResult, UserTier, ContactRequest } from '../types';

export interface IEventService {
    getAllEvents(userId?: string, includePrivate?: boolean): Promise<RaceEvent[]>;
    saveEvent(event: RaceEvent): Promise<void>;
    deleteEvent(id: string): Promise<void>;
    getEvent(id: string): Promise<RaceEvent | undefined>;
    // New: Safe atomic add for results
    saveResult(eventId: string, result: ParticipantResult): Promise<void>;
    // New: Get events where user participated
    getParticipatedEvents(userId: string): Promise<RaceEvent[]>;
}

export interface ILeaderboardService {
    getAllScores(): Promise<GlobalScoreEntry[]>;
    saveScore(entry: GlobalScoreEntry): Promise<void>;
}

export interface ISystemConfigService {
    getConfig(): Promise<SystemConfig>;
    updateConfig(config: SystemConfig): Promise<void>;
}

export interface IAuthService {
    loginWithGoogle(): Promise<UserProfile>;
    loginWithFacebook(): Promise<UserProfile>;
    loginWithEmail(email: string, password?: string): Promise<UserProfile>; 
    registerWithEmail(email: string, password: string, name: string): Promise<UserProfile>;
    loginAnonymously(): Promise<UserProfile>;
    logout(): Promise<void>;
    updateProfileImage(file: Blob): Promise<string>;
    onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void;
}

export interface IUserService {
    getAllUsers(): Promise<UserProfile[]>;
    updateUserTier(userId: string, tier: UserTier): Promise<void>;
    deleteUser(userId: string): Promise<void>;
}

export interface IStorageService {
    uploadBlob(path: string, file: Blob): Promise<string>;
}

export interface ILeadService {
    saveRequest(request: ContactRequest): Promise<void>;
    getAllRequests(): Promise<ContactRequest[]>;
    deleteRequest(id: string): Promise<void>;
}
