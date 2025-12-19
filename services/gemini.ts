
import { RaceEvent, RaceAnalysis, UserTier } from "../types";

// --- SECURITY CONFIGURATION ---
const USE_CLOUD_PROXY = true; 
const meta = import.meta as any;
const PROJECT_ID = (meta?.env?.VITE_FB_PROJECT_ID) || 'quester-17cbd'; 
const CLOUD_FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/generateAdventure`;

export class GeminiService {
  private onRaceUpdate: (event: RaceEvent) => void;
  private onRaceAnalysis: (analysis: RaceAnalysis) => void;
  private tier: UserTier = 'SCOUT';
  private conversationHistory: any[] = [];

  constructor(
    onRaceUpdate: (event: RaceEvent) => void,
    onRaceAnalysis: (analysis: RaceAnalysis) => void
  ) {
    this.onRaceUpdate = onRaceUpdate;
    this.onRaceAnalysis = onRaceAnalysis;
  }

  startNewSession(tier: UserTier = 'SCOUT') {
    this.tier = tier;
    this.conversationHistory = []; 
  }

  /**
   * Sends a message to the AI via Cloud Function.
   */
  async sendMessage(message: string | any[], forceTool: boolean = false): Promise<{ text: string, toolCalled: boolean }> {
    if (USE_CLOUD_PROXY) {
        try {
            const payload = {
                message: message,
                tier: this.tier,
                history: this.conversationHistory,
                forceTool: forceTool // Tell backend to force function calling mode
            };

            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Cloud Function Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            
            // Context Tracking
            this.conversationHistory.push({ role: 'user', parts: [{ text: typeof message === 'string' ? message : "Data Update Request" }] });
            this.conversationHistory.push({ role: 'model', parts: [{ text: data.textResponse || "Done." }] });

            let toolCalled = false;

            if (data.toolCalls && data.toolCalls.length > 0) {
                for (const call of data.toolCalls) {
                    if (call.name === "update_race_plan") {
                        this.onRaceUpdate(call.args);
                        toolCalled = true;
                    } else if (call.name === "provide_race_analysis") {
                        this.onRaceAnalysis(call.args);
                        toolCalled = true;
                    }
                }
            }

            return { text: data.textResponse, toolCalled };

        } catch (error) {
            console.error("Gemini Proxy Error:", error);
            throw error;
        }
    }

    return { text: "Cloud Proxy is disabled.", toolCalled: false };
  }
}
