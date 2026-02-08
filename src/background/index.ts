/**
 * BostonAi.io — Nexus Service Worker Entry Point
 * 
 * Initializes all subsystems:
 * - Message routing (core communication)
 * - Resonance Field (relationship tracking)
 * 
 * Built by BostonAi.io | The Grace Method
 */

import { messageRouter } from './router';
import { resonanceField } from '../memory/resonance-field';

// ─── Service Worker Entry Point ───────────────────────────────────────────────

console.log('[Nexus by BostonAi.io] Background service worker starting...');

// CRITICAL: Register all Chrome event listeners synchronously in the first
// turn of the service worker. Chrome MV3 drops events whose listeners are
// registered inside async callbacks (after await or .then()).
messageRouter.registerListeners();
console.log('[Nexus by BostonAi.io] Listeners registered (sync)');

// Async initialization: load settings, configure LLM, connect MCP, etc.
messageRouter.initialize().then(() => {
  console.log('[Nexus by BostonAi.io] Message router initialized');
  resonanceField.startSession();
  console.log('[Nexus by BostonAi.io] Resonance field session started');
}).catch((err) => {
  console.error('[Nexus by BostonAi.io] Failed to initialize:', err);
});

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id! });
  } catch {
    // sidePanel API might not be available, try alternative
    console.log('[Nexus] Side panel API not available');
  }
});

// Set up side panel behavior
try {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} catch {
  // Fallback for browsers without sidePanel API
}

// Keep service worker alive
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Nexus by BostonAi.io] Extension installed: ${details.reason}`);
});
