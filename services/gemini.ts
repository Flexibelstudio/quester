
import { RaceEvent, RaceAnalysis, UserTier } from "../types";

// --- SECURITY CONFIGURATION ---
// Set to true to route traffic through your Firebase Cloud Function.
const USE_CLOUD_PROXY = true; 

// Dynamically build the URL based on the Firebase Project ID from environment variables
// Ensure this matches your firebase project ID
// Use safe navigation (?. and ||) to prevent crashes in environments where import.meta.env is undefined
const meta = import.meta as any;
const PROJECT_ID = (meta?.env?.VITE_FB_PROJECT_ID) || 'quester-17cbd'; 

// Updated region to us-central1 to match backend configuration
const CLOUD_FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/generateAdventure`;

export class GeminiService {
  private onRaceUpdate: (event: RaceEvent) => void;
  private onRaceAnalysis: (analysis: RaceAnalysis) => void;
  private tier: UserTier = 'SCOUT';
  
  // History tracking for Cloud Mode (stateless requests)
  private conversationHistory: any[] = [];

  constructor(
    onRaceUpdate: (event: RaceEvent) => void,
    onRaceAnalysis: (analysis: RaceAnalysis) => void
  ) {
    this.onRaceUpdate = onRaceUpdate;
    this.onRaceAnalysis = onRaceAnalysis;
  }

  /**
   * Initializes a session. 
   */
  startNewSession(tier: UserTier = 'SCOUT') {
    this.tier = tier;
    this.conversationHistory = []; // Reset history
    
    if (USE_CLOUD_PROXY) {
        console.log(`GeminiService: Initialized in CLOUD PROXY mode. Endpoint: ${CLOUD_FUNCTION_URL}`);
    }
  }

  /**
   * Sends a message to the AI via Cloud Function.
   * Returns object indicating if a tool was successfully called.
   */
  async sendMessage(message: string | any[]): Promise<{ text: string, toolCalled: boolean }> {
    if (USE_CLOUD_PROXY) {
        try {
            const payload = {
                message: message,
                tier: this.tier,
                history: this.conversationHistory // Pass history to maintain context
            };

            console.log("Sending to Cloud Function:", CLOUD_FUNCTION_URL);

            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Cloud Function Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            
            // Add user message and response to local history to keep context alive on next request
            this.conversationHistory.push({ role: 'user', parts: [{ text: typeof message === 'string' ? message : JSON.stringify(message) }] });
            this.conversationHistory.push({ role: 'model', parts: [{ text: data.textResponse || "Action executed." }] });

            let toolCalled = false;

            // Handle Tool Calls returned from Server
            if (data.toolCalls) {
                for (const call of data.toolCalls) {
                    console.log("GeminiService: Received Tool Call via Cloud:", call.name);
                    
                    if (call.name === "update_race_plan") {
                        this.onRaceUpdate(call.args);
                        toolCalled = true;
                    } else if (call.name === "provide_race_analysis") {
                        this.onRaceAnalysis(call.args);
                        toolCalled = true;
                    }
                }
            }

            return { text: data.textResponse || "Jag har uppdaterat kartan enligt önskemål.", toolCalled };

        } catch (error) {
            console.error("Gemini Proxy Error:", error);
            throw error; // Re-throw to let UI handle the alert
        }
    }

    return { text: "Cloud Proxy is disabled.", toolCalled: false };
  }
}
