
import { useEffect, useRef, useState } from 'react';

export const useWakeLock = (enabled: boolean) => {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      release();
      return;
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          sentinelRef.current = sentinel;
          setIsActive(true);
          
          sentinel.addEventListener('release', () => {
            setIsActive(false);
            console.log('Wake Lock released');
          });
          
          console.log('Wake Lock active');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    requestWakeLock();

    // Re-acquire lock if visibility changes (e.g. user switches tabs and comes back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  const release = () => {
    if (sentinelRef.current) {
      sentinelRef.current.release();
      sentinelRef.current = null;
    }
  };

  return { isWakeLockActive: isActive };
};
