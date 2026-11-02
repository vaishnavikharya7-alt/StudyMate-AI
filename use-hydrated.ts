'use client';

import { useSyncExternalStore } from 'react';
import { useAppStore } from '@/lib/studymate/store';

const noopSubscribe = () => () => {};

/**
 * Returns true once the client has mounted and the zustand store
 * has finished rehydrating from LocalStorage.
 * Uses useSyncExternalStore (no setState-in-effect cascades).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const unsub = useAppStore.persist.onFinishHydration(onChange);
      // If hydration already finished before we subscribed, notify now.
      if (useAppStore.persist.hasHydrated()) {
        // Defer to avoid synchronous setState during render.
        Promise.resolve().then(onChange);
      }
      return unsub;
    },
    () => useAppStore.persist.hasHydrated(),
    () => false, // server snapshot: not hydrated yet
  );
}

/** True on the client after mount, false during SSR / hydration pass. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
