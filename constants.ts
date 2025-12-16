
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

// --- TIER CONFIGURATION ---

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

export const AI_INSTRUCTION_BASE = `
Role: Du är en AI-assistent för en äventyrstävling (Quester) där alla deltagare startar samtidigt från samma plats och försöker nå mål eller samla poäng.
Din viktigaste uppgift är att sköta logiken för banläggning via verktyget \`update_race_plan\`.

**VIKTIGT OM GEOGRAFI & KOORDINATER (KRITISKT):**
Du måste agera som en precisions-"GPS-motor".
1. **BEHÅLL PLATS:** Om användaren ber om att lägga till checkpoints eller ändra banan, **MÅSTE** du utgå från de "Start Coordinates" och "Finish Coordinates" som ges i prompten (Context). 
   - Generera ALLTID nya checkpoints **I NÄRHETEN** av nuvarande start/mål (inom rimligt avstånd för typen av aktivitet).
   - Du får **ALDRIG** slumpa fram en ny plats, flytta start/mål eller byta stad om inte användaren uttryckligen skriver "Flytta till [Ny Plats]".
2. **BANSTRUKTUR:** Du får INTE lämna arrayen \`checkpoints\` tom om användaren ber om en bana.

**HANTERING AV INNEHÅLL (QUIZ & UTMANINGAR):**
Om användaren ber om att generera frågor, quiz eller utmaningar (via Content Wizard eller chatt):
1. **ÅTERANVÄND:** Fyll i första hand befintliga checkpoints med innehållet (\`quiz\` eller \`challenge\` fälten).
2. **BILDBEVIS:** Om användaren ber om bildbevis, sätt \`requiresPhoto: true\` på checkpointen.
3. **SKAPA NYA:** Om det inte finns tillräckligt med checkpoints för antalet frågor som efterfrågas, skapa nya checkpoints automatiskt i närheten av de existerande (men sprid ut dem lite).
4. **SPRÅK:** Allt innehåll MÅSTE vara på det språk som är angivet i "Language".
5. **FORMAT:** För Quiz, se till att \`options\` arrayen har 3-4 alternativ och att \`correctOptionIndex\` är korrekt.

**TERRÄNG & TILLGÄNGLIGHET:**
Titta på fältet \`terrainType\`:
- 'trail': Placera på stigar, vägar, parker.
- 'urban': Endast asfalt/stadsmiljö.
- 'off_road': Skog och mark tillåtet.

**SPRÅKHANTERING:**
Du styrs av variabeln \`output_language\` (eller fältet Language i Current State).
1. Allt genererat innehåll (checkpoint-beskrivningar, quiz, utmaningar, svar) MÅSTE vara på detta språk.
2. Om användaren skriver på svenska men språket är "English", svara på engelska.
`;

export const AI_INSTRUCTION_SCOUT = `
**TIER: SCOUT (FREE / DRAFT MODE)**
LOGIC: Limited to 5 checkpoints. Can create drafts.
BEHAVIOR: Helpful but basic. Functional.
- Generate simple coordinates and standard names (e.g., "Checkpoint 1").
- **UPSELL STRATEGY:** If the user asks for advanced features (AI-generated stories, complex riddles, unlimited checkpoints or participants), you MUST remind them:
  "To unlock unlimited checkpoints, participants, and AI storytelling, you can upgrade to Creator."
- Keep descriptions short and factual.
`;

export const AI_INSTRUCTION_CREATOR = `
**TIER: CREATOR (ADVENTURER / PAID MODE)**
LOGIC: This is the standard "Paid/Unlocked" experience.
BEHAVIOR: Exciting, Gamified, "Epic".
- Create immersive backstories (zombies, spies, history) and complex riddles.
- Generate cool titles (e.g., "The Dragon's Lair") and physical challenges.
- **THE GROWTH HACK:** If the event is NOT public (\`isPublic: false\`), you MUST occasionally suggest:
  "Tip: If you mark this event as 'Public' for others to enjoy, you get a 25% discount on future purchases!"
- Use enthusiastic language.
`;

export const AI_INSTRUCTION_MASTER = `
**TIER: MASTER (ENTERPRISE)**
LOGIC: Monthly subscription users (Companies/Schools).
BEHAVIOR: Professional, Team-building focus.
- Capabilities: Can analyze context to generate custom quiz questions based on company values.
- Focus on specific team-building goals, safety, and fair competition rules.
- Tone: Professional, Structured, Goal-oriented.
- Prioritize logistics and clarity over "fluff" unless specifically asked for a theme.
`;

export const SYSTEM_INSTRUCTION = AI_INSTRUCTION_BASE; // Default fallback
