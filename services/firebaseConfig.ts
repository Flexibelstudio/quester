// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getFirestore, Firestore } from "firebase/firestore";
// @ts-ignore
import { getAuth, Auth } from "firebase/auth";
// @ts-ignore
import { getStorage, FirebaseStorage } from "firebase/storage";

// Config reads from environment variables (VITE_...)
// Fallbacks provided for immediate backward compatibility if .env is missing
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FB_API_KEY || "AIzaSyBlI3uZpK_JMlLpRA-Z37yGIOeEV3_3SQE",
  authDomain: env.VITE_FB_AUTH_DOMAIN || "quester-17cbd.firebaseapp.com",
  projectId: env.VITE_FB_PROJECT_ID || "quester-17cbd",
  storageBucket: env.VITE_FB_STORAGE_BUCKET || "quester-17cbd.firebasestorage.app",
  messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID || "841757501118",
  appId: env.VITE_FB_APP_ID || "1:841757501118:web:d725f8d5ab56970e6d60ef",
  measurementId: env.VITE_FB_MEASUREMENT_ID || "G-BCR2F3B805"
};

let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let isMockMode = false;

// --- ENVIRONMENT DETECTION LOGIC ---
try {
    const hostname = window.location.hostname;
    
    // PREVIEW / DEV ENVIRONMENTS (BLACKLIST)
    // These domains indicate we are in a code editor preview or sandbox.
    // We force MOCK MODE here to prevent accidental writes to prod DB during dev,
    // and to ensure the app works without valid Firebase config in ephemeral environments.
    const isPreviewEnv = 
        hostname.includes('ai.studio') || 
        hostname.includes('webcontainer') || 
        hostname.includes('stackblitz') || 
        hostname.includes('googleusercontent.com') ||
        // Fallback for long random hash URLs common in preview proxies, but carefully 
        // ensuring we don't catch valid netlify subdomains if they are short.
        (hostname.length > 50 && !hostname.includes('netlify.app') && !hostname.includes('firebaseapp.com'));

    if (isPreviewEnv) {
        console.log(`Environment: Preview Detected (${hostname}). Forcing Mock Mode.`);
        isMockMode = true;
    } else {
        // PRODUCTION / STAGING / LOCALHOST
        // Attempt to initialize Firebase.
        try {
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            
            // Try to init storage, but fail gracefully if not enabled in console
            try {
                storage = getStorage(app);
            } catch (storageError) {
                console.warn("Firebase Storage init failed (check console settings). Image uploads disabled.", storageError);
            }
            
            console.log("Environment: Production/Live (Firebase Active)");
        } catch (initError) {
            console.error("Firebase Initialization Error:", initError);
            // Fallback to Mock Mode if config implies Prod but init fails (e.g. invalid API key)
            isMockMode = true; 
        }
    }
} catch (error) {
    console.warn("Environment detection failed. Defaulting to Mock Mode.", error);
    isMockMode = true;
}

export { db, auth, storage, isMockMode };