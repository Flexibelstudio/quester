
import { 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    deleteDoc, 
    getDoc, 
    query, 
    where, 
    updateDoc, 
    arrayUnion, 
    onSnapshot,
    Firestore,
    DocumentData
} from "firebase/firestore";
import { 
    GoogleAuthProvider, 
    FacebookAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInAnonymously,
    updateProfile,
    Auth
} from "firebase/auth";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL,
    FirebaseStorage
} from "firebase/storage";
import { db, auth, storage } from "./firebaseConfig";
import { IEventService, ILeaderboardService, ISystemConfigService, IAuthService, IStorageService, IUserService } from "./interfaces";
import { RaceEvent, GlobalScoreEntry, SystemConfig, UserProfile, ParticipantResult, UserTier } from "../types";

// --- FIREBASE AUTH SERVICE ---
export class FirebaseAuthService implements IAuthService {
    
    /**
     * Ensures that a user document exists in Firestore and is populated with required fields.
     */
    private async ensureUserDocument(user: User): Promise<void> {
        if (!db) {
            console.error("Firestore DB not initialized. Cannot create user document.");
            return;
        }
        
        const userRef = doc(db as Firestore, 'users', user.uid);
        
        try {
            const snapshot = await getDoc(userRef);
            const now = new Date().toISOString();

            if (!snapshot.exists()) {
                console.log(`Creating NEW user document for ${user.uid}`);
                await setDoc(userRef, {
                    email: user.email || '',
                    name: user.displayName || 'Anonym',
                    photoURL: user.photoURL || '',
                    tier: 'SCOUT',
                    role: 'user', 
                    createdAt: now,
                    lastLogin: now
                });
            } else {
                const data = snapshot.data();
                
                const updates: any = {
                    lastLogin: now,
                    email: user.email || data.email,
                    name: user.displayName || data.name,
                    photoURL: user.photoURL || data.photoURL
                };

                if (!data.tier) updates.tier = 'SCOUT';
                if (!data.role) updates.role = 'user'; 
                if (!data.createdAt) updates.createdAt = now;

                await setDoc(userRef, updates, { merge: true });
            }
        } catch (e) {
            console.error("Error ensuring user document:", e);
        }
    }

    private async getExtendedProfile(uid: string): Promise<{role?: 'admin' | 'user', tier?: UserTier} | null> {
        if (!db) return null;
        try {
            const userDoc = await getDoc(doc(db as Firestore, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    role: data.role,
                    tier: data.tier
                };
            }
        } catch (e) {
            console.warn("Failed to fetch extended user profile", e);
        }
        return null;
    }

    private async mapFirebaseUserToProfile(user: User): Promise<UserProfile> {
        const extendedData = await this.getExtendedProfile(user.uid);

        return {
            id: user.uid,
            name: user.displayName || user.email || 'Anonym',
            email: user.email || '',
            tier: extendedData?.tier || 'SCOUT', 
            role: extendedData?.role || 'user',
            createdRaceCount: 0,
            photoURL: user.photoURL || undefined
        };
    }

    async loginWithGoogle(): Promise<UserProfile> {
        if (!auth) throw new Error("Auth not initialized");
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth as Auth, provider);
        
        await this.ensureUserDocument(result.user);
        
        return this.mapFirebaseUserToProfile(result.user);
    }

    async loginWithFacebook(): Promise<UserProfile> {
        if (!auth) throw new Error("Auth not initialized");
        const provider = new FacebookAuthProvider();
        const result = await signInWithPopup(auth as Auth, provider);
        
        await this.ensureUserDocument(result.user);

        return this.mapFirebaseUserToProfile(result.user);
    }

    async loginWithEmail(email: string, password?: string): Promise<UserProfile> {
        if (!auth) throw new Error("Auth not initialized");
        if (!password) throw new Error("Password required for production login");
        
        const result = await signInWithEmailAndPassword(auth as Auth, email, password);
        
        await this.ensureUserDocument(result.user);

        return this.mapFirebaseUserToProfile(result.user);
    }

    async registerWithEmail(email: string, password: string, name: string): Promise<UserProfile> {
        if (!auth) throw new Error("Auth not initialized");
        const result = await createUserWithEmailAndPassword(auth as Auth, email, password);
        
        await updateProfile(result.user, { 
            displayName: name,
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        });
        
        await this.ensureUserDocument(result.user);
        
        return this.mapFirebaseUserToProfile(result.user);
    }

    async loginAnonymously(): Promise<UserProfile> {
        if (!auth) throw new Error("Auth not initialized");
        const result = await signInAnonymously(auth as Auth);
        
        if (!result.user.photoURL) {
            const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`;
            await updateProfile(result.user, { photoURL: avatar });
        }

        await this.ensureUserDocument(result.user);

        return this.mapFirebaseUserToProfile(result.user);
    }

    async updateProfileImage(file: Blob): Promise<string> {
        if (!auth?.currentUser) throw new Error("Auth not initialized");
        
        let url = '';
        
        try {
            if (!storage) throw new Error("Storage not configured");
            const path = `profile-images/${auth.currentUser.uid}`;
            const storageRef = ref(storage as FirebaseStorage, path);
            const snapshot = await uploadBytes(storageRef, file);
            url = await getDownloadURL(snapshot.ref);
        } catch (error: any) {
            console.warn("Firebase Storage Upload Failed (Profile). Falling back to local URL.", error);
            // Fallback: Create a local URL so the UI updates immediately even if backend rejects it
            url = URL.createObjectURL(file);
        }

        await updateProfile(auth.currentUser, { photoURL: url });
        
        if (db) {
            const userRef = doc(db as Firestore, 'users', auth.currentUser.uid);
            await setDoc(userRef, { photoURL: url }, { merge: true });
        }

        return url;
    }

    async logout(): Promise<void> {
        if (!auth) return;
        await signOut(auth as Auth);
    }

    onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
        if (!auth) return () => {};
        
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth as Auth, async (firebaseUser: User | null) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (firebaseUser) {
                await this.ensureUserDocument(firebaseUser);
                
                if (db) {
                    unsubscribeSnapshot = onSnapshot(doc(db as Firestore, 'users', firebaseUser.uid), (docSnap) => {
                        const data = docSnap.data();
                        
                        const profile: UserProfile = {
                            id: firebaseUser.uid,
                            name: data?.name || firebaseUser.displayName || 'Anonym',
                            email: data?.email || firebaseUser.email || '',
                            tier: data?.tier || 'SCOUT', 
                            role: data?.role || 'user',
                            createdRaceCount: data?.createdRaceCount || 0,
                            photoURL: data?.photoURL || firebaseUser.photoURL || undefined
                        };
                        
                        callback(profile);
                    }, (error) => {
                        console.error("User Snapshot Error:", error);
                    });
                } else {
                    const profile = await this.mapFirebaseUserToProfile(firebaseUser);
                    callback(profile);
                }
            } else {
                callback(null);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }
}

// --- FIREBASE USER SERVICE ---
export class FirebaseUserService implements IUserService {
    private collectionName = "users";

    async getAllUsers(): Promise<UserProfile[]> {
        if (!db) throw new Error("Firebase not initialized");
        
        try {
            const snapshot = await getDocs(collection(db as Firestore, this.collectionName));
            
            return snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name || 'Okänd',
                    email: data.email || '',
                    tier: data.tier || 'SCOUT',
                    role: data.role || 'user',
                    createdRaceCount: data.createdRaceCount || 0,
                    photoURL: data.photoURL
                } as UserProfile;
            });
        } catch (error) {
            console.error("Firestore Users Query Error:", error);
            return [];
        }
    }

    async updateUserTier(userId: string, tier: UserTier): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        const userRef = doc(db as Firestore, this.collectionName, userId);
        await updateDoc(userRef, { tier: tier });
    }

    async deleteUser(userId: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        await deleteDoc(doc(db as Firestore, this.collectionName, userId));
    }
}

// --- FIREBASE EVENT SERVICE ---
export class FirebaseEventService implements IEventService {
    private collectionName = "events";

    async getAllEvents(userId?: string, includePrivate?: boolean): Promise<RaceEvent[]> {
        if (!db) throw new Error("Firebase not initialized");
        
        let q;
        if (userId) {
            q = query(collection(db as Firestore, this.collectionName), where("ownerId", "==", userId));
        } else if (includePrivate) {
            q = query(collection(db as Firestore, this.collectionName));
        } else {
            q = query(collection(db as Firestore, this.collectionName), where("isPublic", "==", true));
        }

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as RaceEvent);
        } catch (error) {
            console.error("Firestore Query Error:", error);
            return [];
        }
    }

    async saveEvent(event: RaceEvent): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        if (!event.id) throw new Error("Event ID missing");
        await setDoc(doc(db as Firestore, this.collectionName, event.id), event, { merge: true });
    }

    async deleteEvent(id: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        await deleteDoc(doc(db as Firestore, this.collectionName, id));
    }

    async getEvent(id: string): Promise<RaceEvent | undefined> {
        if (!db) throw new Error("Firebase not initialized");
        const docRef = await getDoc(doc(db as Firestore, this.collectionName, id));
        return docRef.exists() ? (docRef.data() as RaceEvent) : undefined;
    }

    async saveResult(eventId: string, result: ParticipantResult): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        const eventRef = doc(db as Firestore, this.collectionName, eventId);
        
        await updateDoc(eventRef, {
            results: arrayUnion(result),
            participantIds: arrayUnion(result.id)
        });
    }

    async getParticipatedEvents(userId: string): Promise<RaceEvent[]> {
        if (!db) throw new Error("Firebase not initialized");
        
        const qParticipation = query(collection(db as Firestore, this.collectionName), where("participantIds", "array-contains", userId));
        const qOwner = query(collection(db as Firestore, this.collectionName), where("ownerId", "==", userId));

        try {
            const [snapPart, snapOwner] = await Promise.all([
                getDocs(qParticipation),
                getDocs(qOwner)
            ]);

            const eventMap = new Map<string, RaceEvent>();
            
            snapPart.docs.forEach(d => eventMap.set(d.id, d.data() as RaceEvent));
            snapOwner.docs.forEach(d => eventMap.set(d.id, d.data() as RaceEvent));

            return Array.from(eventMap.values());

        } catch (error) {
            console.error("Error fetching participation history:", error);
            return [];
        }
    }
}

// --- FIREBASE LEADERBOARD SERVICE ---
export class FirebaseLeaderboardService implements ILeaderboardService {
    private collectionName = "leaderboard";

    async getAllScores(): Promise<GlobalScoreEntry[]> {
        if (!db) throw new Error("Firebase not initialized");
        const snapshot = await getDocs(collection(db as Firestore, this.collectionName));
        const scores = snapshot.docs.map(doc => doc.data() as GlobalScoreEntry);
        return scores.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeSeconds - b.timeSeconds;
        });
    }

    async saveScore(entry: GlobalScoreEntry): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        await setDoc(doc(collection(db as Firestore, this.collectionName)), entry);
    }
}

// --- FIREBASE CONFIG SERVICE ---
export class FirebaseConfigService implements ISystemConfigService {
    private docPath = "system/config";

    async getConfig(): Promise<SystemConfig> {
        if (!db) throw new Error("Firebase not initialized");
        const docRef = await getDoc(doc(db as Firestore, this.docPath));
        if (docRef.exists()) {
            return docRef.data() as SystemConfig;
        }
        return {
            featuredModes: {
                zombie_survival: { isActive: false, title: "Zombie Survival", description: "" },
                christmas_hunt: { isActive: false, title: "Christmas Hunt", description: "" }
            }
        };
    }

    async updateConfig(config: SystemConfig): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        await setDoc(doc(db as Firestore, this.docPath), config);
    }
}

// --- FIREBASE STORAGE SERVICE ---
export class FirebaseStorageService implements IStorageService {
    async uploadBlob(path: string, file: Blob): Promise<string> {
        // Fallback 1: No storage configured at all
        if (!storage) {
            console.warn("Storage not initialized in FirebaseConfig. Returning local Object URL.");
            return URL.createObjectURL(file);
        }

        try {
            const storageRef = ref(storage as FirebaseStorage, path);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (error: any) {
            // Fallback 2: Permission denied (403) or other storage errors
            console.error("Firebase Storage Upload Error:", error);
            
            if (error.code === 'storage/unauthorized' || error.message?.includes('403')) {
                console.warn("Permission denied (403). Returning local Object URL fallback for this session.");
                // This allows the user to see their image immediately without crashing the app,
                // even if the backend rejects the write.
                return URL.createObjectURL(file);
            }
            
            // Re-throw if it's a critical unknown error, but mostly we want to fail gracefuly
            return URL.createObjectURL(file);
        }
    }
}
