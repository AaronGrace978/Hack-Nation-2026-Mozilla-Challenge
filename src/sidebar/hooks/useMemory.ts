import { useState, useEffect, useCallback } from 'react';
import { memoryStore, type UserPreference, type BrowsingHistoryEntry } from '../../memory/store';

// ─── Memory Hook ──────────────────────────────────────────────────────────────

export function useMemory() {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [history, setHistory] = useState<BrowsingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prefs, hist] = await Promise.all([
        memoryStore.getPreferences(),
        memoryStore.getHistory({ limit: 50 }),
      ]);
      setPreferences(prefs);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to load memory:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPreference = useCallback(
    async (category: string, key: string, value: unknown, description: string) => {
      await memoryStore.setPreference(category, key, value, description);
      loadData();
    },
    [loadData],
  );

  const deletePreference = useCallback(
    async (id: string) => {
      await memoryStore.deletePreference(id);
      loadData();
    },
    [loadData],
  );

  const clearAll = useCallback(async () => {
    await memoryStore.clearAll();
    loadData();
  }, [loadData]);

  return {
    preferences,
    history,
    isLoading,
    addPreference,
    deletePreference,
    clearAll,
    refresh: loadData,
  };
}
