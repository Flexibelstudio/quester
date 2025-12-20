
export interface Coordinate {
  lat: number;
  lng: number;
}

export interface QuizData {
  question: string;
  options: string[];
  correctOptionIndex: number; // 0-based index
}

export type CheckInMode = 'active' | 'passive';

export interface Checkpoint {
  id: string;
  name: string;
  location: Coordinate | null; // Nullable for Draft Mode
  radiusMeters: number;
  type: 'mandatory' | 'optional';
  description?: string;
  level?: number;
  points?: number;
  color?: string;
  checkInMode?: CheckInMode; // NEW: active = popup, passive = auto-pass
  // New features for "Tipspromenad" and Challenges
  quiz?: QuizData;
  challenge?: string;
  // New feature for Time Adjustment (Rally style)
  timeModifierSeconds?: number; // Negative = Bonus (deduction), Positive = Penalty
  // New feature for photo proof
  requiresPhoto?: boolean;
  // New for Templates
  terrainHint?: string; // Hint for AI placement (e.g. "Park", "Water", "Urban")
}

export interface Rating {
  score: number; // 1-5
  comment?: string;
  timestamp: string;
  authorName?: string;
}

export type WinCondition = 'fastest_time' | 'most_points';

// NEW: Scoring Models
export type ScoreModel = 'basic' | 'rogaining' | 'time_bonus';

export type CheckpointOrder = 'free' | 'sequential';

export type MapStyle = 'standard' | 'dark' | 'google_standard' | 'google_hybrid' | 'google_terrain';

export type TerrainType = 'trail' | 'off_road' | 'urban' | 'mixed';

export type StartMode = 'mass_start' | 'self_start';

export type UserTier = 'SCOUT' | 'CREATOR' | 'MASTER';

export type LeaderboardMode = 'global' | 'private';

export type EventStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived';

// NEW: Detailed log of a visited checkpoint
export interface CheckpointVisitLog {
  checkpointId: string;
  timestamp: string;
  pointsEarned: number;
  quizAnswer?: string;      // The text of the selected option
  isQuizCorrect?: boolean;  // If it was a quiz, was it right?
  photoURL?: string;        // If photo required, the url
}

export interface ParticipantResult {
  id: string;
  name: string;
  teamName?: string;
  profileImage?: string; // New: User uploaded avatar
  authProvider?: 'google' | 'facebook' | 'guest'; // New: Login method
  finishTime: string; // HH:MM:SS or elapsed time string
  totalPoints: number;
  
  // NEW: Scoring Breakdown
  basePoints?: number; // Points from checkpoints only
  timePenaltyPoints?: number; // Points deducted due to time
  timeBonusPoints?: number; // Points added due to speed
  
  checkpointsVisited: number;
  visitedCheckpointIds?: string[]; // New: Specific IDs taken for resuming state
  log?: CheckpointVisitLog[]; // NEW: Detailed audit trail
  status: 'finished' | 'dnf' | 'running';
  lastPosition?: Coordinate; // For Live Tracking (Master Tier)
}

// --- NAVIGATION GRAPH FOR ZOMBIES ---
export interface NavNode {
    id: string;
    lat: number;
    lng: number;
    neighbors: string[]; // IDs of connected nodes
}

export interface NavGraph {
    nodes: Record<string, NavNode>;
}

export interface RaceEvent {
  id: string;
  ownerId?: string; // New: Links event to a specific user (Firebase UID)
  ownerName?: string; // New: Display name of creator
  ownerPhotoURL?: string; // New: Avatar of creator
  name: string;
  coverImage?: string; // New: Event cover image URL
  creatorTier?: UserTier; // Tracks which plan created this event to enforce limits/features
  eventType: string; // New field: "Race", "Event", "Competition", etc.
  status: EventStatus; // New field: Controls lifecycle and billing limits
  language?: string; // New field: Output language for AI and content
  isPublic?: boolean; // New field: visible to community
  isLockedByAdmin?: boolean; // New field: prevents user from publishing
  isInstantGame?: boolean; // New: Marks event as a played system game (Zombie/Xmas) to hide from organizer dashboard
  isTemplate?: boolean; // NEW: Marks this event as a reusable blueprint
  participantIds?: string[]; // New: Array of user IDs who have participated (for efficient history queries)
  unlockExpiresAt?: string; // ISO Date string. When the 30-day edit window expires.
  accessCode?: string; // Code for participants to join
  description: string;
  category: string;
  startDateTime: string;
  startMode?: StartMode; // New field for start logic
  manualStartEnabled?: boolean; // New field: toggle start button availability
  startLocation: Coordinate & { radiusMeters?: number }; // Modified to include optional radius
  startLocationConfirmed?: boolean; // New: True if user has manually placed/confirmed start
  finishLocation: Coordinate & { radiusMeters: number };
  finishLocationConfirmed?: boolean; // New: True if user has manually placed/confirmed finish
  startCity?: string; // New: Manual city name for start
  finishCity?: string; // New: Manual city name for finish
  checkpoints: Checkpoint[];
  checkpointOrder?: CheckpointOrder; // New field for strict order or free
  terrainType?: TerrainType; // New field for path preference
  rules: string[];
  safetyInstructions: string[];
  leaderboardMetric?: string;
  winCondition: WinCondition;
  
  // NEW: Scoring Configuration
  scoreModel?: ScoreModel;
  parTimeMinutes?: number; // Target time for Time Bonus model
  pointsPerMinute?: number; // Points to add/deduct per minute
  
  leaderboardMode?: LeaderboardMode; // New field for result visibility
  timeLimitMinutes?: number;
  mapStyle?: MapStyle;
  results?: ParticipantResult[]; // New field for storing results
  ratings?: Rating[]; // New field for user ratings
  navGraph?: NavGraph; // New: Road network for AI movement
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isToolResponse?: boolean;
}

export interface RaceAnalysis {
  overallScore: number; // 0-100
  safetyScore: number; // 0-100
  funFactorScore: number; // 0-100
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

// --- BILLING & ACCESS CONTROL ---

export interface TierConfig {
  id: UserTier;
  displayName: string;
  description: string;
  priceAmount: number | string; // Allow string for "Offert"
  priceCurrency: string; // "kr", "EUR", etc.
  priceFrequency: string; // "mån", "engångsköp", ""
  buttonText: string; // New: Customizable CTA button text
  isRecommended: boolean; // New: Toggle "Populärast" badge
  features: string[]; // List of strings to display in UI
  
  // Technical Limits
  maxActiveRaces: number;
  maxCheckpointsPerRace: number;
  maxParticipantsPerRace: number;
  aiComplexity: 'Basic' | 'Advanced' | 'Custom';
  allowCloudStorage: boolean;
  allowWhiteLabel: boolean;
  allowLiveMonitoring: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  tier: UserTier;
  name: string;
  role?: 'admin' | 'user'; // RBAC: Role Based Access Control
  createdRaceCount: number;
  photoURL?: string; 
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  organization: string;
  message: string;
  timestamp: string;
  userId?: string;
  status: 'new' | 'contacted' | 'closed';
}

// --- SYSTEM CONFIG (GLOBAL EVENTS) ---

export interface GlobalFeatureConfig {
  isActive: boolean;
  title: string;
  description: string;
}

export interface SystemConfig {
  featuredModes: {
    zombie_survival: GlobalFeatureConfig;
    christmas_hunt: GlobalFeatureConfig;
  };
}

// --- GLOBAL LEADERBOARD ---

export interface GlobalScoreEntry {
  id: string;
  playerName: string;
  groupTag?: string; // School, Company, City
  score: number;
  timeSeconds: number; // For sorting
  timeString: string;
  timestamp: string;
  location: Coordinate; // For geo-filtering
  mode: 'zombie_survival' | 'christmas_hunt';
  status?: 'finished' | 'dnf'; // New field to track if they finished or aborted
}
