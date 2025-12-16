
import { useState, useEffect, useRef } from 'react';
import { Checkpoint } from '../types';

// --- GAME CONFIGURATION ---
const DETECTION_RADIUS = 60; // meters (Wake up distance)
const CATCH_RADIUS = 8;      // meters (Win condition - slightly generous for GPS drift)
const BOUNDARY_RADIUS = 250; // meters (Max distance from spawn before circling back)
const MAX_FLEE_DISTANCE = 40; // meters (NEW: If he gets this far from player, he stops/rests)

// --- MOVEMENT PHYSICS ---
const SPRINT_SPEED = 5.5;    // m/s (Very fast run, hard to catch)
const SPRINT_DURATION = 8000; // ms (Max run duration if player keeps up)
const REST_DURATION = 6000;   // ms (How long he stands still panting/sleeping)

// Math Constants
const METERS_PER_DEG_LAT = 111132;
const degToRad = (deg: number) => deg * (Math.PI / 180);

// Audio Assets
const SFX_ALERT = 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg';
const SFX_WIN = 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg'; 

export interface GrinchEntity {
    id: string;
    lat: number;
    lng: number;
    spawnLat: number;
    spawnLng: number;
    state: 'guarding' | 'fleeing' | 'resting' | 'caught';
    nextStateChange: number; // Timestamp for when sprint/rest ends
    distanceToPlayer: number;
    name: string;
}

// Helper: Haversine Distance
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export const useGrinchLogic = (
    userLocation: [number, number] | null,
    checkpoints: Checkpoint[],
    isChristmasMode: boolean,
    onCheckpointComplete: (cp: Checkpoint, success: boolean) => void
) => {
    const [grinches, setGrinches] = useState<GrinchEntity[]>([]);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const lastUpdateRef = useRef<number>(Date.now());

    // Initialize Grinches when mode starts
    useEffect(() => {
        if (!isChristmasMode || checkpoints.length === 0) return;
        
        setGrinches(prev => {
            // Filter out Bonfires - they should be static safe zones, not running Grinches
            const targets = checkpoints.filter(cp => {
                const n = cp.name.toLowerCase();
                return !n.includes('eldstad') && !n.includes('bonfire') && !n.includes('värme');
            });

            // If count matches (and IDs likely match), preserve state
            if (prev.length > 0 && prev.length === targets.length) return prev;

            return targets.map(cp => ({
                id: cp.id,
                name: cp.name,
                lat: cp.location.lat,
                lng: cp.location.lng,
                spawnLat: cp.location.lat,
                spawnLng: cp.location.lng,
                state: 'guarding',
                nextStateChange: 0,
                distanceToPlayer: 9999
            }));
        });
    }, [isChristmasMode, checkpoints.length]); // Only re-init if count changes

    // Game Loop
    useEffect(() => {
        if (!isChristmasMode || !userLocation) return;

        const intervalId = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - lastUpdateRef.current) / 1000; // Seconds
            lastUpdateRef.current = now;

            const pLat = userLocation[0];
            const pLng = userLocation[1];

            setGrinches(currentGrinches => {
                let updated = false;
                
                const nextGrinches = currentGrinches.map((grinch): GrinchEntity => {
                    // Skip inactive entities
                    if (grinch.state === 'caught') return grinch;

                    // 1. Calculate Distances
                    const distToPlayer = getDistanceMeters(pLat, pLng, grinch.lat, grinch.lng);
                    const distFromSpawn = getDistanceMeters(grinch.spawnLat, grinch.spawnLng, grinch.lat, grinch.lng);

                    // Explicitly type nextState to allow full enum range, preventing narrowing issues
                    let nextState: GrinchEntity['state'] = grinch.state;
                    let nextStateChange = grinch.nextStateChange;
                    let nextLat = grinch.lat;
                    let nextLng = grinch.lng;

                    // --- STATE MACHINE ---

                    // A. GUARDING -> FLEEING
                    if (nextState === 'guarding') {
                        if (distToPlayer < DETECTION_RADIUS) {
                            nextState = 'fleeing';
                            nextStateChange = now + SPRINT_DURATION;
                            updated = true;
                            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                            new Audio(SFX_ALERT).play().catch(() => {});
                            setStatusMessage("GRINCHEN SÅG DIG! GÖM KNÄCKEN! 🏃");
                        }
                    }

                    // B. FLEEING -> RESTING (Interval Logic OR Distance Logic)
                    else if (nextState === 'fleeing') {
                        const timeIsUp = now > nextStateChange;
                        const isTooFar = distToPlayer > MAX_FLEE_DISTANCE; // "The Leash"

                        if (timeIsUp || isTooFar) {
                            nextState = 'resting';
                            nextStateChange = now + REST_DURATION;
                            updated = true;
                            
                            if (isTooFar) {
                                setStatusMessage("GRINCHEN TAPPADE BORT DIG! HAN TAR EN TUPPLUR! 💤");
                            } else {
                                setStatusMessage("HAN FICK HÅLL AV GRÖTEN! TA HONOM NU! 🥵");
                            }
                        }
                    }

                    // C. RESTING -> FLEEING
                    else if (nextState === 'resting') {
                        if (now > nextStateChange) {
                            nextState = 'fleeing';
                            nextStateChange = now + SPRINT_DURATION;
                            updated = true;
                            setStatusMessage("HAN STAL EN LUSSEKATT OCH FICK NY ENERGI! 💨");
                        }
                    }

                    // --- WIN CONDITION ---
                    if (distToPlayer < CATCH_RADIUS) {
                        nextState = 'caught';
                        updated = true;
                        new Audio(SFX_WIN).play().catch(() => {});
                        setStatusMessage(`JULEN ÄR RÄDDAD! Snyggt jobbat nisse!`);
                        
                        const cp = checkpoints.find(c => c.id === grinch.id);
                        if(cp) onCheckpointComplete(cp, true);
                        
                        return { ...grinch, state: 'caught', distanceToPlayer: 0 };
                    }

                    // --- MOVEMENT PHYSICS ---
                    if (nextState === 'fleeing') {
                        updated = true;

                        // Calculate Flee Vector (Away from Player)
                        const dLatM = (grinch.lat - pLat) * METERS_PER_DEG_LAT;
                        const dLngM = (grinch.lng - pLng) * (METERS_PER_DEG_LAT * Math.cos(degToRad(grinch.lat)));
                        
                        const fleeMag = Math.sqrt(dLatM*dLatM + dLngM*dLngM);
                        // Avoid division by zero
                        let fleeVx = fleeMag > 0 ? dLngM / fleeMag : 1; 
                        let fleeVy = fleeMag > 0 ? dLatM / fleeMag : 0;

                        // Rubber Band Logic: If too far from spawn, steer back
                        // But prioritze MAX_FLEE_DISTANCE logic (state change) over this movement tweak
                        if (distFromSpawn > BOUNDARY_RADIUS) {
                            const spawnDLatM = (grinch.spawnLat - grinch.lat) * METERS_PER_DEG_LAT;
                            const spawnDLngM = (grinch.spawnLng - grinch.lng) * (METERS_PER_DEG_LAT * Math.cos(degToRad(grinch.lat)));
                            const spawnDist = Math.sqrt(spawnDLatM*spawnDLatM + spawnDLngM*spawnDLngM);
                            
                            const spawnVx = spawnDLngM / spawnDist;
                            const spawnVy = spawnDLatM / spawnDist;

                            // Strong steering weight to force him back
                            const weight = 2.5; 
                            
                            fleeVx = fleeVx + (spawnVx * weight);
                            fleeVy = fleeVy + (spawnVy * weight);

                            const moveMag = Math.sqrt(fleeVx*fleeVx + fleeVy*fleeVy);
                            fleeVx /= moveMag;
                            fleeVy /= moveMag;
                        }

                        // Apply Speed
                        const distanceToMove = SPRINT_SPEED * deltaTime;
                        const deltaLngM = fleeVx * distanceToMove;
                        const deltaLatM = fleeVy * distanceToMove;

                        nextLat = grinch.lat + (deltaLatM / METERS_PER_DEG_LAT);
                        nextLng = grinch.lng + (deltaLngM / (METERS_PER_DEG_LAT * Math.cos(degToRad(grinch.lat))));
                    }

                    return {
                        ...grinch,
                        lat: nextLat,
                        lng: nextLng,
                        state: nextState,
                        nextStateChange,
                        distanceToPlayer: distToPlayer
                    };
                });

                return updated ? nextGrinches : currentGrinches;
            });

        }, 200); // 5Hz update rate for smoother movement

        return () => clearInterval(intervalId);
    }, [isChristmasMode, userLocation, checkpoints]);

    // Clear toast message after delay
    useEffect(() => {
        if(statusMessage) {
            const t = setTimeout(() => setStatusMessage(null), 3000);
            return () => clearTimeout(t);
        }
    }, [statusMessage]);

    return { grinches, statusMessage };
};
