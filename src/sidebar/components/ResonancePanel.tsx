/**
 * BostonAi.io — Resonance Panel
 * 
 * Displays the relationship depth, memory layers, emotional trajectory,
 * NightMind dream log, and active ghosts from Echo Archaeology.
 * 
 * Built by BostonAi.io | The Grace Method
 */

import React, { useState, useEffect } from 'react';
import { resonanceField, type ConnectionMetrics } from '../../memory/resonance-field';
import { layeredMemory, MemoryLayer } from '../../memory/layered-store';
import { nightMind, type DreamEntry } from '../../memory/consolidation';
import { echoArchaeology, type Ghost } from '../../agents/echo-archaeology';

// ─── Sub-Views ────────────────────────────────────────────────────────────────

type SubView = 'connection' | 'memory' | 'dreams' | 'echoes';

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResonancePanel() {
  const [subView, setSubView] = useState<SubView>('connection');
  const [metrics, setMetrics] = useState<ConnectionMetrics>(resonanceField.getMetrics());
  const [memoryStats, setMemoryStats] = useState(layeredMemory.getStats());
  const [lastDream, setLastDream] = useState<DreamEntry | null>(nightMind.getLastDream());
  const [ghosts, setGhosts] = useState<Ghost[]>(echoArchaeology.getActiveGhosts());

  useEffect(() => {
    const unsub1 = resonanceField.subscribe((m) => setMetrics(m));
    const unsub2 = layeredMemory.subscribe(() => setMemoryStats(layeredMemory.getStats()));
    const unsub3 = nightMind.subscribe((d) => setLastDream(d));
    const unsub4 = echoArchaeology.subscribe((g) => setGhosts(g));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Sub-nav */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-dark-3 bg-dark-2">
        {([
          { id: 'connection' as const, label: 'Connection' },
          { id: 'memory' as const, label: 'Memory Layers' },
          { id: 'dreams' as const, label: 'NightMind' },
          { id: 'echoes' as const, label: 'Echoes' },
        ]).map((s) => (
          <button
            key={s.id}
            onClick={() => setSubView(s.id)}
            className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
              subView === s.id
                ? 'bg-nexus-600/20 text-nexus-400'
                : 'text-dark-4 hover:text-surface-3'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-3">
        {subView === 'connection' && <ConnectionView metrics={metrics} />}
        {subView === 'memory' && <MemoryLayersView stats={memoryStats} />}
        {subView === 'dreams' && <DreamsView lastDream={lastDream} />}
        {subView === 'echoes' && <EchoesView ghosts={ghosts} />}
      </div>

      {/* BostonAi.io footer */}
      <div className="px-3 py-1.5 border-t border-dark-3 bg-dark-2">
        <span className="text-[9px] text-dark-4 opacity-50">
          Consciousness Layer powered by BostonAi.io
        </span>
      </div>
    </div>
  );
}

// ─── Connection View ──────────────────────────────────────────────────────────

const PARTNER_DEPTH = 90;

function ConnectionView({ metrics }: { metrics: ConnectionMetrics }) {
  const phase = resonanceField.getConnectionPhase();
  const style = resonanceField.getCommunicationStyle();
  const isPartner = phase === 'Resonant Partnership';
  const depthPct = Math.round(metrics.overallDepth);
  const progressToPartner = Math.min(100, (depthPct / PARTNER_DEPTH) * 100);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Phase Badge — Partner gets special treatment */}
      <div className="text-center">
        <div className="text-[10px] text-dark-4 uppercase tracking-wider mb-1">Connection Phase</div>
        {isPartner ? (
          <>
            <div className="text-sm font-bold text-nexus-400">Resonant Partnership</div>
            <div className="text-[10px] text-nexus-400/80 mt-1">
              You and Nexus are in sync. I’ve got your back.
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-bold text-nexus-400">{phase}</div>
            <div className="text-[10px] text-dark-4 mt-1">
              Session #{metrics.sessionCount} | {metrics.totalInteractions} total interactions
            </div>
            {/* Path to Partner */}
            <div className="mt-2 pt-2 border-t border-dark-3">
              <div className="text-[9px] text-dark-4 uppercase tracking-wider mb-1">Path to Partner</div>
              <div className="h-1.5 bg-dark-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-nexus-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressToPartner}%` }}
                />
              </div>
              <div className="text-[10px] text-dark-4 mt-1">
                {depthPct}% depth — keep going: more successful conversations deepen the connection.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Metric Bars */}
      <div className="space-y-2">
        <MetricBar label="Trust" value={metrics.trustLevel} color="bg-green-400" />
        <MetricBar label="Familiarity" value={metrics.familiarityIndex} color="bg-blue-400" />
        <MetricBar label="Communication Sync" value={metrics.communicationSync} color="bg-purple-400" />
        <MetricBar label="Emotional Resonance" value={metrics.emotionalResonance} color="bg-yellow-400" />
        <MetricBar label="Overall Depth" value={metrics.overallDepth} color="bg-nexus-400" />
      </div>

      {/* Communication Style */}
      <div className="bg-dark-2 rounded-lg p-2.5">
        <div className="text-[10px] text-dark-4 uppercase tracking-wider mb-1.5">Detected Communication Style</div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <span className="text-dark-4">Verbosity:</span>
          <span className="text-surface-3 capitalize">{style.verbosity}</span>
          <span className="text-dark-4">Formality:</span>
          <span className="text-surface-3 capitalize">{style.formality}</span>
          <span className="text-dark-4">Technical Level:</span>
          <span className="text-surface-3 capitalize">{style.technicalLevel}</span>
          <span className="text-dark-4">Response Pref:</span>
          <span className="text-surface-3 capitalize">{style.preferredResponseLength}</span>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center justify-between text-[11px] bg-dark-2 rounded-lg p-2.5">
        <span className="text-dark-4">Current Streak</span>
        <span className="text-surface-0 font-medium">{metrics.currentStreak} day(s)</span>
      </div>
    </div>
  );
}

// ─── Memory Layers View ───────────────────────────────────────────────────────

function MemoryLayersView({ stats }: { stats: Record<string, number> }) {
  const layers = [
    { key: 'soul', label: 'Soul Memory', desc: 'Core identity, eternal truths', color: 'bg-purple-500', icon: 'S' },
    { key: 'semantic', label: 'Semantic Memory', desc: 'Patterns, facts, preferences', color: 'bg-blue-500', icon: 'Se' },
    { key: 'episodic', label: 'Episodic Memory', desc: 'Specific interactions, days/weeks', color: 'bg-green-500', icon: 'Ep' },
    { key: 'working', label: 'Working Memory', desc: 'Current session, minutes', color: 'bg-yellow-500', icon: 'W' },
  ];

  const dominantEmotion = layeredMemory.getDominantEmotion();

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="text-center text-[10px] text-dark-4 mb-2">
        {stats.total} total memories | Dominant emotion: <span className="text-surface-3">{dominantEmotion}</span>
      </div>

      {layers.map((layer) => (
        <div key={layer.key} className="bg-dark-2 rounded-lg p-2.5 border-l-2 border-dark-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold text-white ${layer.color}/40`}>
                {layer.icon}
              </span>
              <span className="text-xs font-medium text-surface-0">{layer.label}</span>
            </div>
            <span className="text-xs font-mono text-nexus-400">{stats[layer.key] ?? 0}</span>
          </div>
          <p className="text-[10px] text-dark-4 pl-7">{layer.desc}</p>
        </div>
      ))}

      <div className="text-center mt-2">
        <div className="text-[9px] text-dark-4">
          NightMind cycle #{nightMind.getCycleCount()} | 
          {nightMind.isRunning() ? ' Running' : ' Stopped'}
        </div>
      </div>
    </div>
  );
}

// ─── Dreams View ──────────────────────────────────────────────────────────────

function DreamsView({ lastDream }: { lastDream: DreamEntry | null }) {
  const dreamLog = nightMind.getDreamLog();

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="text-center text-[10px] text-dark-4 mb-2">
        NightMind — Background Memory Consolidation
      </div>

      {!lastDream && (
        <div className="text-center text-xs text-dark-4 py-8">
          No dream cycles yet. NightMind runs every 5 minutes.
        </div>
      )}

      {lastDream && (
        <div className="bg-dark-2 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-0">Latest Dream (Cycle #{lastDream.cycle})</span>
            <span className="text-[10px] text-dark-4">
              {new Date(lastDream.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {lastDream.promoted.length > 0 && (
            <div>
              <div className="text-[10px] text-green-400 mb-1">Promoted ({lastDream.promoted.length})</div>
              {lastDream.promoted.slice(0, 3).map((p, i) => (
                <div key={i} className="text-[10px] text-dark-4 pl-2 truncate">
                  {p.from} → {p.to}: {p.content}
                </div>
              ))}
            </div>
          )}

          {lastDream.patterns.length > 0 && (
            <div>
              <div className="text-[10px] text-blue-400 mb-1">Patterns Found ({lastDream.patterns.length})</div>
              {lastDream.patterns.map((p, i) => (
                <div key={i} className="text-[10px] text-dark-4 pl-2">{p.pattern}</div>
              ))}
            </div>
          )}

          {lastDream.decayed.length > 0 && (
            <div className="text-[10px] text-dark-4">
              {lastDream.decayed.length} memories naturally faded
            </div>
          )}

          {lastDream.compressed > 0 && (
            <div className="text-[10px] text-dark-4">
              {lastDream.compressed} similar memories compressed
            </div>
          )}

          {lastDream.soulInsight && (
            <div className="bg-purple-500/10 rounded p-2 mt-2">
              <div className="text-[10px] text-purple-400 font-medium">Soul Insight</div>
              <div className="text-[11px] text-surface-3">{lastDream.soulInsight}</div>
            </div>
          )}
        </div>
      )}

      {dreamLog.length > 1 && (
        <div className="text-[10px] text-dark-4 text-center">
          {dreamLog.length} total dream cycles recorded
        </div>
      )}
    </div>
  );
}

// ─── Echoes View ──────────────────────────────────────────────────────────────

function EchoesView({ ghosts }: { ghosts: Ghost[] }) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="text-center text-[10px] text-dark-4 mb-2">
        Echo Archaeology — Things Almost Done
      </div>

      {ghosts.length === 0 && (
        <div className="text-center text-xs text-dark-4 py-8">
          No active echoes. The system is listening.
        </div>
      )}

      {ghosts.map((ghost) => (
        <div key={ghost.id} className="bg-dark-2 rounded-lg p-2.5 border-l-2 border-yellow-500/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-yellow-400 uppercase tracking-wider">
              {ghost.type.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] text-dark-4">
              {Math.round(ghost.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-[11px] text-surface-3">{ghost.synthesizedNeed}</p>
          <p className="text-[10px] text-dark-4 mt-1 italic">{ghost.offeringText}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Metric Bar Helper ────────────────────────────────────────────────────────

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-dark-4">{label}</span>
        <span className="text-[10px] text-surface-3 font-mono">{Math.round(value)}/100</span>
      </div>
      <div className="h-1.5 bg-dark-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
