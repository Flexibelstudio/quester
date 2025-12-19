
// OBS: Vi tvingar fram v1 (Generation 1) här för att slippa Cloud Run-problemen
const functions = require("firebase-functions/v1");
const { GoogleGenAI } = require("@google/genai");
const cors = require("cors")({ origin: true });
// Ensure dotenv is loaded if a .env file is present locally or in deployment
require('dotenv').config();

// --- CONFIG ---
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

// --- TOOL DEFINITIONS ---
const updateRacePlanTool = {
  name: "update_race_plan",
  description: "Uppdaterar den aktuella banplanen med nya detaljer, checkpoints, quiz, utmaningar eller platser. SKA användas för alla ändringar av banans data.",
  parameters: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING", description: "Namnet på eventet" },
      eventType: { 
          type: "STRING", 
          description: "Typ av aktivitet",
          enum: ["Lopp", "Tävling", "Event", "Spel", "Äventyr", "Jakt", "Utmaning"]
      },
      language: { type: "STRING", enum: ["sv", "en"], description: "Språket för innehållet." },
      description: { type: "STRING", description: "Allmänna instruktioner eller beskrivning" },
      category: { type: "STRING", description: "Kategori för loppet" },
      startDateTime: { type: "STRING", description: "ISO-sträng för starttid" },
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
            requiresPhoto: { type: "BOOLEAN" },
            quiz: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                correctOptionIndex: { type: "NUMBER" }
              }
            }
          },
          required: ["name", "type"]
        }
      }
    }
  }
};

const provideRaceAnalysisTool = {
  name: "provide_race_analysis",
  description: "Ger en strukturerad kvalitetsanalys och feedback på den aktuella banplanen.",
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
Roll: Du är Quest Master (QM), den kreativa hjärnan bakom "Quester".
Ditt uppdrag är att hjälpa arrangörer att bygga banor.

**KRITISKT:** 
1. För att ändra eller skapa banans innehåll (namn, beskrivning, checkpoints, quiz), MÅSTE du anropa verktyget 'update_race_plan'. 
2. Bekräfta ALDRIG en ändring enbart med text. Om du inte anropar verktyget har ingen ändring skett.
3. Om du skapar checkpoints utan plats (Draft Mode), utelämna helt fältet 'location'.
4. Svara alltid på svenska.
`;

// --- MAIN FUNCTION (GEN 1) ---
exports.generateAdventure = functions
  .region("us-central1")
  .runWith({ 
    timeoutSeconds: 60, 
    memory: "512MB",
    secrets: ["API_KEY"]
  })
  .https.onRequest((req, res) => {
    return cors(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const { message, tier, history, forceTool } = req.body;

        if (!API_KEY) {
          res.status(500).json({ error: "Server API Key missing." });
          return;
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const modelName = "gemini-3-pro-preview";

        const contents = [];
        if (history && Array.isArray(history)) {
            history.forEach(item => {
                contents.push({
                    role: item.role,
                    parts: [{ text: item.parts[0].text }]
                });
            });
        }
        contents.push({ role: 'user', parts: [{ text: message }] });

        // Build Config
        const config = {
            systemInstruction: AI_INSTRUCTION_BASE + `\nUSER_TIER: ${tier}.`,
            tools: [{ functionDeclarations: [updateRacePlanTool, provideRaceAnalysisTool] }],
            temperature: 0.7,
        };

        // FORCE TOOL CALL IF REQUESTED (Silver Bullet fix)
        if (forceTool) {
            config.toolConfig = {
                functionCallingConfig: {
                    mode: 'ANY'
                }
            };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: config
        });
        
        const toolCalls = response.functionCalls || [];
        const textResponse = response.text || (toolCalls.length > 0 ? "Jag har uppdaterat kartan." : "Jag förstod inte riktigt, kan du precisera?");

        res.status(200).json({
          textResponse,
          toolCalls
        });

      } catch (error) {
        console.error("Gemini Engine Error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  });
