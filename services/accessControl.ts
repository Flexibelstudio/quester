

import { UserProfile, RaceEvent, UserTier, TierConfig } from '../types';

export const accessControlService = {
  
  // Accepts the current configuration map to check limits
  canCreateRace(user: UserProfile, activeRaceCount: number, tierConfigs: Record<UserTier, TierConfig>): { allowed: boolean; message?: string } {
    const limits = tierConfigs[user.tier];
    
    // Limits apply to ACTIVE (non-archived) races.
    if (activeRaceCount >= limits.maxActiveRaces) {
      return { 
        allowed: false, 
        message: `Din ${limits.displayName}-plan tillåter max ${limits.maxActiveRaces} aktivt event åt gången. Du måste arkivera ett gammalt event (via inställningar) för att skapa ett nytt, eller uppgradera.` 
      };
    }
    return { allowed: true };
  },

  canAddCheckpoint(user: UserProfile, currentCheckpointCount: number, tierConfigs: Record<UserTier, TierConfig>): { allowed: boolean; message?: string } {
    const limits = tierConfigs[user.tier];
    if (currentCheckpointCount >= limits.maxCheckpointsPerRace) {
      return { 
        allowed: false, 
        message: `Max ${limits.maxCheckpointsPerRace} checkpoints tillåtna i ${limits.displayName}-planen. Uppgradera för obegränsat.` 
      };
    }
    return { allowed: true };
  },

  validateRacePlan(user: UserProfile, race: RaceEvent, tierConfigs: Record<UserTier, TierConfig>): { valid: boolean; warnings: string[] } {
    const limits = tierConfigs[user.tier];
    const warnings: string[] = [];

    if (race.checkpoints.length > limits.maxCheckpointsPerRace) {
      warnings.push(`Du har ${race.checkpoints.length} checkpoints, men din plan tillåter bara ${limits.maxCheckpointsPerRace}. Endast de första ${limits.maxCheckpointsPerRace} kommer vara aktiva.`);
    }

    return { valid: warnings.length === 0, warnings };
  },

  getAIInstructionExtension(tier: UserTier): string {
      switch(tier) {
          case 'SCOUT': return "Limit output complexity. Keep descriptions short.";
          case 'CREATOR': return "Use creative storytelling and advanced terrain adaptation.";
          case 'MASTER': return "Use professional corporate language and advanced team building logic.";
          default: return "";
      }
  }
};