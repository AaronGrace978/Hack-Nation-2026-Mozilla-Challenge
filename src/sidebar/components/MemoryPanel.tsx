import React, { useState } from 'react';
import { useMemory } from '../hooks/useMemory';
import { formatTimestamp } from '../../shared/utils';

// ─── Memory Panel ─────────────────────────────────────────────────────────────

export function MemoryPanel() {
  const { preferences, history, isLoading, addPreference, deletePreference, clearAll, refresh } =
    useMemory();
  const [activeTab, setActiveTab] = useState<'preferences' | 'history'>('preferences');
  const [showAddForm, setShowAddForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xs text-dark-4">Loading memory...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-dark-3">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${
            activeTab === 'preferences'
              ? 'bg-nexus-600/20 text-nexus-400'
              : 'text-dark-4 hover:text-surface-3'
          }`}
        >
          Preferences ({preferences.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${
            activeTab === 'history'
              ? 'bg-nexus-600/20 text-nexus-400'
              : 'text-dark-4 hover:text-surface-3'
          }`}
        >
          History ({history.length})
        </button>
        <div className="flex-1" />
        <button
          onClick={refresh}
          className="text-[10px] text-dark-4 hover:text-surface-3 p-1"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeTab === 'preferences' && (
          <PreferencesList
            preferences={preferences}
            onDelete={deletePreference}
            onAdd={() => setShowAddForm(true)}
          />
        )}
        {activeTab === 'history' && <HistoryList history={history} />}
      </div>

      {/* Add Preference Form */}
      {showAddForm && (
        <AddPreferenceForm
          onAdd={async (cat, key, val, desc) => {
            await addPreference(cat, key, val, desc);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Footer Actions */}
      <div className="px-3 py-2 border-t border-dark-3 flex gap-2">
        {activeTab === 'preferences' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-[11px] px-3 py-1.5 bg-nexus-600/20 text-nexus-400 rounded-md hover:bg-nexus-600/30"
          >
            + Add Preference
          </button>
        )}
        <button
          onClick={clearAll}
          className="text-[11px] px-3 py-1.5 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 ml-auto"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}

// ─── Preferences List ─────────────────────────────────────────────────────────

function PreferencesList({
  preferences,
  onDelete,
  onAdd,
}: {
  preferences: { id: string; category: string; key: string; value: unknown; description: string }[];
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  if (preferences.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-dark-4 mb-2">No preferences saved yet.</p>
        <p className="text-[11px] text-dark-4">
          Tell Nexus about your budget, preferred brands, or accessibility needs.
        </p>
      </div>
    );
  }

  // Group by category
  const grouped = preferences.reduce(
    (acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    },
    {} as Record<string, typeof preferences>,
  );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, prefs]) => (
        <div key={category}>
          <h4 className="text-[10px] font-semibold text-dark-4 uppercase tracking-wider mb-1 capitalize">
            {category}
          </h4>
          <div className="space-y-1">
            {prefs.map((pref) => (
              <div
                key={pref.id}
                className="flex items-center justify-between bg-dark-2 rounded-lg px-2.5 py-2"
              >
                <div>
                  <span className="text-xs text-surface-0">{pref.description}</span>
                  <div className="text-[10px] text-dark-4">
                    {pref.key}: {JSON.stringify(pref.value)}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(pref.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── History List ─────────────────────────────────────────────────────────────

function HistoryList({
  history,
}: {
  history: { id: string; url: string; title: string; summary?: string; action?: string; timestamp: number }[];
}) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-dark-4">
        No browsing history recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {history.map((entry) => (
        <div key={entry.id} className="bg-dark-2 rounded-lg px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-0 truncate flex-1">{entry.title}</span>
            <span className="text-[10px] text-dark-4 ml-2">
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>
          <p className="text-[10px] text-dark-4 truncate">{entry.url}</p>
          {entry.summary && (
            <p className="text-[11px] text-surface-3 mt-0.5">{entry.summary}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Add Preference Form ──────────────────────────────────────────────────────

function AddPreferenceForm({
  onAdd,
  onCancel,
}: {
  onAdd: (category: string, key: string, value: unknown, description: string) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState('budget');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="border-t border-dark-3 p-3 bg-dark-2 space-y-2">
      <h4 className="text-xs font-semibold text-surface-0">Add Preference</h4>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5"
      >
        <option value="budget">Budget</option>
        <option value="brand">Brand</option>
        <option value="accessibility">Accessibility</option>
        <option value="dietary">Dietary</option>
        <option value="general">General</option>
      </select>
      <input
        placeholder="Key (e.g., max_price)"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5 placeholder-dark-4"
      />
      <input
        placeholder="Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5 placeholder-dark-4"
      />
      <input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5 placeholder-dark-4"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-dark-3 text-surface-3 rounded-md text-xs"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (key && value) {
              let parsedValue: unknown = value;
              try { parsedValue = JSON.parse(value); } catch { /* keep as string */ }
              onAdd(category, key, parsedValue, description || `${category}.${key}`);
            }
          }}
          disabled={!key || !value}
          className="flex-1 py-1.5 bg-nexus-600 text-white rounded-md text-xs disabled:opacity-30"
        >
          Save
        </button>
      </div>
    </div>
  );
}
