


import { isMockMode } from "./firebaseConfig";
import { IEventService, ILeaderboardService, ISystemConfigService, IAuthService, IStorageService, IUserService } from "./interfaces";

// Mock Implementations
import { MockEventService, MockAuthService, MockStorageService, MockUserService } from "./storage";
import { MockLeaderboardService } from "./leaderboard";
import { MockConfigService } from "./systemConfig";

// Firebase Implementations
import { FirebaseEventService, FirebaseLeaderboardService, FirebaseConfigService, FirebaseAuthService, FirebaseStorageService, FirebaseUserService } from "./firebaseImplementation";

class DataService {
    public events: IEventService;
    public leaderboard: ILeaderboardService;
    public config: ISystemConfigService;
    public auth: IAuthService;
    public storage: IStorageService;
    public users: IUserService;
    public isOffline: boolean;

    constructor() {
        this.isOffline = isMockMode;
        
        if (isMockMode) {
            console.log("DataService: Using MOCK (LocalStorage) services.");
            this.events = new MockEventService();
            this.leaderboard = new MockLeaderboardService();
            this.config = new MockConfigService();
            this.auth = new MockAuthService();
            this.storage = new MockStorageService();
            this.users = new MockUserService();
        } else {
            console.log("DataService: Using PROD (Firebase) services.");
            this.events = new FirebaseEventService();
            this.leaderboard = new FirebaseLeaderboardService();
            this.config = new FirebaseConfigService();
            this.auth = new FirebaseAuthService();
            this.storage = new FirebaseStorageService();
            this.users = new FirebaseUserService();
        }
    }
}

export const api = new DataService();