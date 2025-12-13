
import { useState, useEffect, useRef } from 'react';
import { Coordinate, Checkpoint } from '../types';

// Game Constants
const MAX_WARMTH = 100;
const WARMTH_DECAY_RATE = 1.0; // Points per second lost (Slightly slower to be fair)
const WARMTH_REGEN_RATE = 15; // Points per second gained at fire
const FREEZE_DURATION = 8000; // ms
const FREEZE_PENALTY_SECONDS = 30; // Time penalty for freezing
const BAG_CAPACITY = 3;
const HEAT_SOURCE_RADIUS = 20; // meters (Sleigh or Bonfire)

// Helper: Haversine distance
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const useChristmasLogic = (
    userLocation: [number, number] | null,
    startLocation: Coordinate,
    checkpoints: Checkpoint[], // Added checkpoints to find bonfires
    isChristmasMode: boolean,
    onToast: (t: {title: string, message: string, type: 'success' | 'danger' | 'info'}) => void
) => {
    const [warmth, setWarmth] = useState(MAX_WARMTH);
    const [bagCount, setBagCount] = useState(0);
    const [bankedScore, setBankedScore] = useState(0); 
    const [isFrozen, setIsFrozen] = useState(false);
    const [isWhiteout, setIsWhiteout] = useState(false);
    const [isAtHeatSource, setIsAtHeatSource] = useState(false);
    const [isAtSleigh, setIsAtSleigh] = useState(false);
    
    // New: Track accumulated time penalty
    const [timePenalty, setTimePenalty] = useState(0);

    // Weather Cycle
    useEffect(() => {
        if (!isChristmasMode) return;
        
        // Random whiteouts every 30-90 seconds
        const loop = () => {
            const timeToNext = 30000 + Math.random() * 60000;
            setTimeout(() => {
                setIsWhiteout(true);
                onToast({ title: "SNÖSTORM!", message: "Sikten försvinner! Hitta värme!", type: 'danger' });
                
                // Storm lasts 15 seconds
                setTimeout(() => {
                    setIsWhiteout(false);
                    loop();
                }, 15000);
            }, timeToNext);
        };
        
        loop();
    }, [isChristmasMode]);

    // Warmth & Physics Loop
    useEffect(() => {
        if (!isChristmasMode || !userLocation || isFrozen) return;

        const interval = setInterval(() => {
            const pLat = userLocation[0];
            const pLng = userLocation[1];

            // 1. Check Sleigh (Start)
            const distToSleigh = getDistanceMeters(pLat, pLng, startLocation.lat, startLocation.lng);
            const atSleigh = distToSleigh < HEAT_SOURCE_RADIUS;
            setIsAtSleigh(atSleigh);

            // 2. Check Bonfires (Checkpoints with specific names)
            // Keywords: Eldstad, Brasa, Fire, Bonfire, Värme
            const isNearBonfire = checkpoints.some(cp => {
                const nameLower = cp.name.toLowerCase();
                const isFire = nameLower.includes('eld') || nameLower.includes('brasa') || nameLower.includes('fire') || nameLower.includes('värme');
                if (!isFire) return false;
                
                return getDistanceMeters(pLat, pLng, cp.location.lat, cp.location.lng) < HEAT_SOURCE_RADIUS;
            });

            const warmingUp = atSleigh || isNearBonfire;
            setIsAtHeatSource(warmingUp);

            setWarmth(prev => {
                if (warmingUp) {
                    return Math.min(MAX_WARMTH, prev + WARMTH_REGEN_RATE);
                } else {
                    return Math.max(0, prev - WARMTH_DECAY_RATE);
                }
            });

        }, 1000);

        return () => clearInterval(interval);
    }, [isChristmasMode, userLocation, isFrozen, startLocation, checkpoints]);

    // Freeze Logic
    useEffect(() => {
        if (warmth <= 0 && !isFrozen && isChristmasMode) {
            setIsFrozen(true);
            
            // Apply Penalty
            setTimePenalty(prev => prev + FREEZE_PENALTY_SECONDS);
            
            onToast({ title: "DU FRÖS TILL IS!", message: `+${FREEZE_PENALTY_SECONDS}s STRAFFTID! Hitta värme!`, type: 'danger' });
            
            // Penalty: Drop 1 package
            if (bagCount > 0) {
                setBagCount(prev => prev - 1);
                setTimeout(() => {
                    onToast({ title: "TAPPARE!", message: "Ett paket gled ur dina frusna händer!", type: 'danger' });
                }, 1000);
            }

            // Thaw out
            setTimeout(() => {
                setIsFrozen(false);
                setWarmth(30); // Give a little grace warmth
                onToast({ title: "UPPTINAD", message: "Skynda dig till värmen!", type: 'info' });
            }, FREEZE_DURATION);
        }
    }, [warmth, isFrozen, isChristmasMode]);

    // Bag Actions
    const addToBag = () => {
        if (bagCount >= BAG_CAPACITY) return false;
        setBagCount(prev => prev + 1);
        return true;
    };

    const depositBag = () => {
        if (bagCount === 0) return 0;
        const points = bagCount; 
        setBagCount(0);
        setBankedScore(prev => prev + points);
        onToast({ title: "SÄCK TÖMD", message: `${points} paket säkrade i släden! Värmen återställd.`, type: 'success' });
        return points;
    };

    return {
        warmth,
        bagCount,
        isFrozen,
        isWhiteout,
        isAtSleigh,
        isAtHeatSource,
        addToBag,
        depositBag,
        bagCapacity: BAG_CAPACITY,
        timePenalty // Expose penalty
    };
};
