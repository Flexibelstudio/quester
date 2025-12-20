
import { RaceEvent, TierConfig, UserTier } from './types';

// Access Control List
// Note: Admin access is now controlled via Firestore 'users' collection with role: 'admin'
export const DEFAULT_COORDINATES = { lat: 59.3293, lng: 18.0686 }; // Stockholm Default

export const RACE_CATEGORIES = [
  'ADV (Motorcykel)',
  'Orientering',
  'Tipspromenad / Quiz',
  'Multisport',
  'Gravel Cykling',
  'MTB (Mountainbike)',
  'Trail Running',
  'Biltävling / Rally',
  'Vandring',
  'Paddling',
  'Annat'
];

export const EVENT_TYPES = [
  'Lopp',
  'Tävling',
  'Event',
  'Spel',
  'Äventyr',
  'Jakt',
  'Utmaning'
];

export const INITIAL_RACE_STATE: RaceEvent = {
  id: 'new-event',
  name: 'Nytt Äventyr',
  eventType: 'Lopp',
  status: 'draft',
  language: 'sv',
  isPublic: false,
  accessCode: 'QUEST123',
  description: 'Beskriv området och upplägget...',
  category: 'ADV (Motorcykel)',
  startDateTime: new Date(Date.now() + 3600 * 1000).toISOString(), // Default start in 1 hour
  startMode: 'mass_start',
  manualStartEnabled: true, // Default to true for better UX
  startLocation: { ...DEFAULT_COORDINATES, radiusMeters: 50 }, // Added radiusMeters
  startLocationConfirmed: false, 
  finishLocation: { ...DEFAULT_COORDINATES, radiusMeters: 50 },
  finishLocationConfirmed: false,
  startCity: '',
  finishCity: '',
  checkpoints: [],
  checkpointOrder: 'free',
  terrainType: 'trail',
  rules: [],
  safetyInstructions: [],
  leaderboardMetric: 'Snabbast total tid',
  winCondition: 'fastest_time',
  // New Defaults
  scoreModel: 'basic',
  parTimeMinutes: 60,
  pointsPerMinute: 10,
  timeLimitMinutes: 60,
  
  leaderboardMode: 'global', // Default to everyone sees everyone
  mapStyle: 'google_standard',
  results: [],
  ratings: [],
  ownerName: '',
  ownerPhotoURL: ''
};

export const INITIAL_TIER_CONFIGS: Record<UserTier, TierConfig> = {
  SCOUT: {
    id: 'SCOUT',
    displayName: 'Scout',
    description: 'Perfekt för att testa idén riskfritt. Bygg småskaliga äventyr för familjen eller teamet och upptäck kraften i Quester helt utan kostnad.',
    priceAmount: 0,
    priceCurrency: 'kr',
    priceFrequency: 'Alltid gratis',
    buttonText: 'Börja Gratis',
    isRecommended: false,
    features: [
      "Riskfri start & test",
      "Grundläggande AI-stöd",
      "Max 6 deltagare & 5 checkpoints",
      "Endast privat läge"
    ],
    // Technical Limits
    maxActiveRaces: 1,
    maxCheckpointsPerRace: 5,
    maxParticipantsPerRace: 6,
    aiComplexity: 'Basic',
    allowCloudStorage: false,
    allowWhiteLabel: false,
    allowLiveMonitoring: false,
  },
  CREATOR: {
    id: 'CREATOR',
    displayName: 'Creator',
    description: 'Ta bort alla begränsningar. Skapa storslagna upplevelser för konferenser, kick-offer och marknadsföring där du behöver full frihet.',
    priceAmount: 149,
    priceCurrency: 'kr',
    priceFrequency: 'engångsköp / event',
    buttonText: 'Välj Creator',
    isRecommended: true,
    features: [
      "Total frihet (Obegränsat)",
      "Full AI-motor & Storytelling",
      "30 dagars access",
      "Professionell leverans"
    ],
    // Technical Limits
    maxActiveRaces: 1, // Begränsad till 1 aktivt event (måste köpa ny licens för nästa)
    maxCheckpointsPerRace: 9999,
    maxParticipantsPerRace: 9999,
    aiComplexity: 'Advanced',
    allowCloudStorage: true,
    allowWhiteLabel: false,
    allowLiveMonitoring: false,
  },
  MASTER: {
    id: 'MASTER',
    displayName: 'Master',
    description: 'För föreningar, företag och skolor som arrangerar aktiviteter regelbundet. Få tillgång till hela plattformen året runt utan begränsningar på antalet event.',
    priceAmount: 'Offert',
    priceCurrency: '',
    priceFrequency: 'årsabonnemang',
    buttonText: 'Kontakta Oss',
    isRecommended: false,
    features: [
      "Obegränsat antal event",
      "Passar skolor & föreningar",
      "Inga tidsgränser",
      "Samla allt på ett konto",
      "Live Tracking & Admin"
    ],
    // Technical Limits
    maxActiveRaces: 9999,
    maxCheckpointsPerRace: 9999,
    maxParticipantsPerRace: 9999,
    aiComplexity: 'Custom',
    allowCloudStorage: true,
    allowWhiteLabel: false,
    allowLiveMonitoring: true,
  }
};

/**
 * Färdiga mallar för äventyr.
 */
export const OFFICIAL_TEMPLATES: RaceEvent[] = [
  {
    ...INITIAL_RACE_STATE,
    id: 'tpl-mystery-1',
    name: 'Stadsjakten: Den Försvunna Nyckeln',
    description: 'Ett spännande mysterium genom stadens gator. Hitta ledtrådar och lös gåtor för att hitta den försvunna nyckeln till stadens skattkammare.',
    category: 'Orientering',
    checkpoints: [
      { id: 'cp1', name: 'Gamla Torget', description: 'Börja vid fontänen. Något är gömt under en bänk.', location: null, radiusMeters: 25, type: 'mandatory', terrainHint: 'Urban area' },
      { id: 'cp2', name: 'Biblioteksparken', description: 'Leta efter statyn. Svara på frågan för att komma vidare.', location: null, radiusMeters: 25, type: 'mandatory', terrainHint: 'Park', quiz: { question: 'Vem föreställer statyn?', options: ['Kungen', 'Författaren', 'Upptäcktsresanden'], correctOptionIndex: 1 } },
      { id: 'cp3', name: 'Gränden', description: 'En mörk gränd med en hemlighet. Ta en bild på dörren.', location: null, radiusMeters: 20, type: 'mandatory', terrainHint: 'Urban', requiresPhoto: true }
    ]
  },
  {
    ...INITIAL_RACE_STATE,
    id: 'tpl-action-1',
    name: 'Team Challenge: Extreme',
    description: 'Fysiska utmaningar och samarbeten. Perfekt för teambuilding eller kompisgänget som vill svettas lite extra.',
    category: 'Multisport',
    winCondition: 'most_points',
    checkpoints: [
      { id: 'cp1', name: 'Uppvärmningen', description: 'Gör 20 knäböj tillsammans!', location: null, radiusMeters: 30, type: 'mandatory', terrainHint: 'Open area', challenge: 'Gör 20 knäböj och ta en lagbild.' },
      { id: 'cp2', name: 'Sprintbacken', description: 'Spring upp för backen och tillbaka.', location: null, radiusMeters: 40, type: 'mandatory', terrainHint: 'Hill', points: 100 }
    ]
  }
];
