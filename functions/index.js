// OBS: Vi tvingar fram v1 (Generation 1) här för att slippa Cloud Run-problemen
const functions = require("firebase-functions/v1");
const { GoogleGenAI } = require("@google/genai");
const cors = require("cors")({ origin: true });
// Ensure dotenv is loaded if a .env file is present locally or in deployment
require('dotenv').config();

// --- CONFIG ---
// When using secrets, process.env.API_KEY is automatically populated from the secret store
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

// --- TOOL DEFINITIONS ---
const updateRacePlanTool = {
  name: "update_race_plan",
  description: "Updates the current race/event plan with new details, checkpoints, quizzes, challenges, locations, or participant results.",
  parameters: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING", description: "Name of the event" },
      eventType: { 
          type: "STRING", 
          description: "Type of activity, e.g., 'Lopp', 'Tävling', 'Event', 'Spel', 'Äventyr'",
          enum: ["Lopp", "Tävling", "Event", "Spel", "Äventyr", "Jakt", "Utmaning"]
      },
      language: { type: "STRING", enum: ["sv", "en", "de", "es", "fr"], description: "The language for the event content." },
      description: { type: "STRING", description: "General instructions or description" },
      category: { type: "STRING", description: "Category of the race" },
      startDateTime: { type: "STRING", description: "ISO string for start time" },
      startMode: { type: "STRING", enum: ["mass_start", "self_start"] },
      manualStartEnabled: { type: "BOOLEAN" },
      startLocation: {
        type: "OBJECT",
        properties: { lat: { type: "NUMBER" }, lng: { type: "NUMBER" } },
        required: ["lat", "lng"]
      },
      finishLocation: {
        type: "OBJECT",
        properties: { lat: { type: "NUMBER" }, lng: { type: "NUMBER" }, radiusMeters: { type: "NUMBER" } },
        required: ["lat", "lng", "radiusMeters"]
      },
      checkpoints: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            name: { type: "STRING" },
            location: {
              type: "OBJECT",
              properties: { lat: { type: "NUMBER" }, lng: { type: "NUMBER" } },
              required: ["lat", "lng"]
            },
            radiusMeters: { type: "NUMBER" },
            type: { type: "STRING", enum: ["mandatory", "optional"] },
            description: { type: "STRING" },
            points: { type: "NUMBER" },
            color: { type: "STRING" },
            challenge: { type: "STRING" },
            timeModifierSeconds: { type: "NUMBER" },
            requiresPhoto: { type: "BOOLEAN", description: "If true, user must upload a photo to complete this checkpoint." },
            quiz: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                correctOptionIndex: { type: "NUMBER" }
              }
            }
          },
          required: ["name", "location", "type"]
        }
      },
      results: { type: "ARRAY", items: { type: "OBJECT", properties: { /* minimal result schema */ } } }
    }
  }
};

const provideRaceAnalysisTool = {
  name: "provide_race_analysis",
  description: "Provides a structured quality analysis and feedback on the current race plan.",
  parameters: {
    type: "OBJECT",
    properties: {
      overallScore: { type: "INTEGER" },
      safetyScore: { type: "INTEGER" },
      funFactorScore: { type: "INTEGER" },
      summary: { type: "STRING" },
      strengths: { type: "ARRAY", items: { type: "STRING" } },
      weaknesses: { type: "ARRAY", items: { type: "STRING" } },
      suggestions: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["overallScore", "summary"]
  }
};

// --- SYSTEM INSTRUCTIONS ---
const AI_INSTRUCTION_BASE = `
Role: You are the Quest Master (QM), the AI engine behind the app "Quester".
Din viktigaste uppgift är att sköta logiken för banläggning via verktyget \`update_race_plan\`.

**CONTENT GENERATION (QUIZ/CHALLENGES):**
Om användaren ber om att lägga till frågor (quiz) eller utmaningar:
1. TITTA på "Current State" i prompten. Om det finns en lista på checkpoints med ID:n, **ANVÄND DESSA ID:N**.
2. Du ska returnera hela listan av checkpoints i verktyget, men med \`quiz\` eller \`challenge\` tillagt på varje objekt.
3. För Quiz: Måste innehålla \`question\`, \`options\` (3-4 alternativ) och \`correctOptionIndex\`.
4. Skapa INTE nya checkpoints om det redan finns tillräckligt många för uppgiften, uppdatera istället de befintliga.

**ABSOLUT FÖRBUD:**
Du får INTE ändra \`location\` (koordinater) på en checkpoint som redan har ett ID. 
Om du lägger till en fråga på en existerande checkpoint, kopiera exakt samma koordinater som du fick i input. 
Du får bara generera nya koordinater om du skapar en HELT NY checkpoint (som inte fanns i input-listan).

**GEOGRAFI:** Utgå alltid från angivna Start/Mål koordinater.
**BILDER:** Om användaren vill ha bildbevis, sätt \`requiresPhoto: true\` på checkpoints.
`;

// --- MAIN FUNCTION (GEN 1 - Node 20 Compatible) ---
exports.generateAdventure = functions
  .region("us-central1")
  .runWith({ 
    timeoutSeconds: 60, 
    memory: "512MB",
    secrets: ["API_KEY"] // <--- ENABLES SECURE KEY ACCESS
  })
  .https.onRequest((req, res) => {
    return cors(req, res, async () => {
      // 1. Metod-check
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { message, tier, history } = req.body;

        // 2. API Key Check
        if (!API_KEY) {
          console.error("CRITICAL: Server API Key is missing. Make sure to run 'firebase functions:secrets:set API_KEY'.");
          res.status(500).json({ error: "Server Configuration Error: API Key missing." });
          return;
        }

        // 3. Initiera Gemini
        const genAI = new GoogleGenAI({ apiKey: API_KEY });
        // UPGRADED MODEL: gemini-2.5-flash
        const modelId = "gemini-2.5-flash"; 

        const chat = genAI.chats.create({
          model: modelId,
          config: {
            systemInstruction: AI_INSTRUCTION_BASE + (tier === 'CREATOR' ? "\nBe Creative." : "\nBe Simple."),
            tools: [{ functionDeclarations: [updateRacePlanTool, provideRaceAnalysisTool] }],
            temperature: 0.7,
          },
          history: history || []
        });

        // 4. Skicka meddelande
        const result = await chat.sendMessage({ message });
        
        // 5. Hantera svar
        const functionCalls = result.functionCalls || [];
        const textResponse = result.text || "";

        // Formatera för frontend
        const toolCalls = functionCalls.map(fc => ({
            name: fc.name,
            args: fc.args
        }));

        res.status(200).json({
          textResponse,
          toolCalls
        });

      } catch (error) {
        console.error("Gemini Backend Error:", error);
        
        // Improve error reporting for detecting Leaked Keys (403)
        if (error.toString().includes("403") || error.toString().includes("leaked")) {
             res.status(403).json({ 
                error: "API Key Permission Denied. The key may be invalid or flagged as leaked by Google.",
                details: error.message 
            });
            return;
        }

        res.status(500).json({ 
            error: error.message || "Internal Server Error",
            details: error.toString() 
        });
      }
    });
  });