import { useEffect, useReducer } from 'react';

const PREFIX = 'quickbyte.prototype.';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readStorage(key: string): unknown {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writeStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or disabled: the prototype keeps working in memory.
  }
}

/**
 * useReducer backed by localStorage. Stored data is untrusted, so `revive`
 * validates it and returns null to fall back to the initial state.
 */
export function usePersistentReducer<S, A>(
  key: string,
  reducer: (state: S, action: A) => S,
  fallback: S,
  revive: (raw: unknown) => S | null,
) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const raw = readStorage(key);
    return raw === undefined ? fallback : (revive(raw) ?? fallback);
  });

  useEffect(() => {
    writeStorage(key, state);
  }, [key, state]);

  return [state, dispatch] as const;
}