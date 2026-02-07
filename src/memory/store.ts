import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { generateId } from '../shared/utils';

// ─── Database Schema ──────────────────────────────────────────────────────────

interface NexusDB extends DBSchema {
  preferences: {
    key: string;
    value: UserPreference;
    indexes: {
      'by-category': string;
    };
  };
  history: {
    key: string;
    value: BrowsingHistoryEntry;
    indexes: {
      'by-domain': string;
      'by-timestamp': number;
    };
  };
  context: {
    key: string;
    value: ContextEntry;
    indexes: {
      'by-type': string;
      'by-timestamp': number;
    };
  };
  settings: {
    key: string;
    value: SettingEntry;
  };
}

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface UserPreference {
  id: string;
  category: string;           // e.g. 'budget', 'brand', 'accessibility', 'dietary'
  key: string;                // e.g. 'max_price', 'preferred_brands'
  value: unknown;
  description: string;        // Human-readable
  createdAt: number;
  updatedAt: number;
}

export interface BrowsingHistoryEntry {
  id: string;
  url: string;
  domain: string;
  title: string;
  summary?: string;           // AI-generated summary of what was done
  action?: string;            // What happened (searched, purchased, read, etc.)
  data?: Record<string, unknown>; // Extracted product info, prices, etc.
  timestamp: number;
}

export interface ContextEntry {
  id: string;
  type: 'interaction' | 'purchase' | 'research' | 'preference_inferred';
  content: string;
  relatedUrls?: string[];
  metadata?: Record<string, unknown>;
  timestamp: number;
  expiresAt?: number;          // Optional TTL for context
}

export interface SettingEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

// ─── Memory Store ─────────────────────────────────────────────────────────────

const DB_NAME = 'nexus-memory';
const DB_VERSION = 1;

class MemoryStore {
  private db: IDBPDatabase<NexusDB> | null = null;
  private initPromise: Promise<void> | null = null;

  private async getDB(): Promise<IDBPDatabase<NexusDB>> {
    if (this.db) return this.db;
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
    return this.db!;
  }

  private async init(): Promise<void> {
    this.db = await openDB<NexusDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Preferences store
        const prefStore = db.createObjectStore('preferences', { keyPath: 'id' });
        prefStore.createIndex('by-category', 'category');

        // History store
        const histStore = db.createObjectStore('history', { keyPath: 'id' });
        histStore.createIndex('by-domain', 'domain');
        histStore.createIndex('by-timestamp', 'timestamp');

        // Context store
        const ctxStore = db.createObjectStore('context', { keyPath: 'id' });
        ctxStore.createIndex('by-type', 'type');
        ctxStore.createIndex('by-timestamp', 'timestamp');

        // Settings store
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }

  // ── Preferences ─────────────────────────────────────────────────────────

  async setPreference(
    category: string,
    key: string,
    value: unknown,
    description: string,
  ): Promise<UserPreference> {
    const db = await this.getDB();

    // Check for existing
    const all = await db.getAllFromIndex('preferences', 'by-category', category);
    const existing = all.find((p) => p.key === key);

    const pref: UserPreference = {
      id: existing?.id ?? generateId('pref'),
      category,
      key,
      value,
      description,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    await db.put('preferences', pref);
    return pref;
  }

  async getPreferences(category?: string): Promise<UserPreference[]> {
    const db = await this.getDB();
    if (category) {
      return db.getAllFromIndex('preferences', 'by-category', category);
    }
    return db.getAll('preferences');
  }

  async deletePreference(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('preferences', id);
  }

  // ── Browsing History ────────────────────────────────────────────────────

  async addHistory(entry: Omit<BrowsingHistoryEntry, 'id'>): Promise<BrowsingHistoryEntry> {
    const db = await this.getDB();
    const full: BrowsingHistoryEntry = { id: generateId('hist'), ...entry };
    await db.put('history', full);
    return full;
  }

  async getHistory(options?: {
    domain?: string;
    limit?: number;
    since?: number;
  }): Promise<BrowsingHistoryEntry[]> {
    const db = await this.getDB();
    let results: BrowsingHistoryEntry[];

    if (options?.domain) {
      results = await db.getAllFromIndex('history', 'by-domain', options.domain);
    } else {
      results = await db.getAll('history');
    }

    if (options?.since) {
      results = results.filter((r) => r.timestamp >= options.since!);
    }

    // Sort by newest first
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async searchHistory(query: string): Promise<BrowsingHistoryEntry[]> {
    const db = await this.getDB();
    const all = await db.getAll('history');
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (entry) =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.url.toLowerCase().includes(lowerQuery) ||
        entry.summary?.toLowerCase().includes(lowerQuery) ||
        entry.action?.toLowerCase().includes(lowerQuery),
    );
  }

  // ── Context ─────────────────────────────────────────────────────────────

  async addContext(entry: Omit<ContextEntry, 'id'>): Promise<ContextEntry> {
    const db = await this.getDB();
    const full: ContextEntry = { id: generateId('ctx'), ...entry };
    await db.put('context', full);
    return full;
  }

  async getContext(options?: {
    type?: ContextEntry['type'];
    limit?: number;
  }): Promise<ContextEntry[]> {
    const db = await this.getDB();
    let results: ContextEntry[];

    if (options?.type) {
      results = await db.getAllFromIndex('context', 'by-type', options.type);
    } else {
      results = await db.getAll('context');
    }

    // Filter expired
    const now = Date.now();
    results = results.filter((r) => !r.expiresAt || r.expiresAt > now);

    // Sort by newest first
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ── Settings ────────────────────────────────────────────────────────────

  async setSetting(key: string, value: unknown): Promise<void> {
    const db = await this.getDB();
    await db.put('settings', { key, value, updatedAt: Date.now() });
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const db = await this.getDB();
    const entry = await db.get('settings', key);
    return (entry?.value as T) ?? defaultValue;
  }

  // ── Clear ───────────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    await Promise.all([
      db.clear('preferences'),
      db.clear('history'),
      db.clear('context'),
    ]);
  }
}

export const memoryStore = new MemoryStore();
