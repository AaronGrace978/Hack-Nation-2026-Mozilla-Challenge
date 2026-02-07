import React, { useState, useEffect } from 'react';
import { memoryStore } from '../../memory/store';
import { sendToBackground } from '../hooks/useAgents';
import { ExtMessageType } from '../../shared/messages';

// ─── Settings Panel ───────────────────────────────────────────────────────────

export function SettingsPanel() {
  const [settings, setSettings] = useState({
    llm_provider: 'openai',
    llm_model: 'gpt-5-mini',
    openai_api_key: '',
    anthropic_api_key: '',
    ollama_api_key: '',
    tabstack_api_key: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const provider = await memoryStore.getSetting<string>('llm_provider', 'openai');
      const model = await memoryStore.getSetting<string>('llm_model', 'gpt-4o-mini');
      const openaiKey = await memoryStore.getSetting<string>('openai_api_key', '');
      const anthropicKey = await memoryStore.getSetting<string>('anthropic_api_key', '');
      const ollamaKey = await memoryStore.getSetting<string>('ollama_api_key', '');
      const tabstackKey = await memoryStore.getSetting<string>('tabstack_api_key', '');
      setSettings({
        llm_provider: provider,
        llm_model: model,
        openai_api_key: openaiKey,
        anthropic_api_key: anthropicKey,
        ollama_api_key: ollamaKey,
        tabstack_api_key: tabstackKey,
      });
    }
    load();
  }, []);

  const handleSave = async () => {
    for (const [key, value] of Object.entries(settings)) {
      await memoryStore.setSetting(key, value);
    }
    sendToBackground(ExtMessageType.UPDATE_SETTINGS, settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Auto-select default model when provider changes
  const DEFAULT_MODELS: Record<string, string> = {
    openai: 'gpt-5-mini',
    anthropic: 'claude-opus-4-6-20260205',
    ollama: 'qwen3-coder-next',
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      // When provider changes, auto-switch to that provider's default model
      if (key === 'llm_provider') {
        next.llm_model = DEFAULT_MODELS[value] ?? 'gpt-5-mini';
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 space-y-4">
        {/* LLM Configuration */}
        <Section title="LLM Configuration">
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10px] text-dark-4 uppercase tracking-wider">Provider</span>
              <select
                value={settings.llm_provider}
                onChange={(e) => updateSetting('llm_provider', e.target.value)}
                className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama (local or cloud)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] text-dark-4 uppercase tracking-wider">Model</span>
              <select
                value={settings.llm_model}
                onChange={(e) => updateSetting('llm_model', e.target.value)}
                className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5"
              >
                {settings.llm_provider === 'openai' ? (
                  <>
                    <optgroup label="GPT-5 Series (Latest)">
                      <option value="gpt-5.2">GPT-5.2 — Best for coding & agentic</option>
                      <option value="gpt-5.2-pro">GPT-5.2 Pro — Smarter, more precise</option>
                      <option value="gpt-5.1">GPT-5.1 — Configurable reasoning</option>
                      <option value="gpt-5">GPT-5 — Previous flagship</option>
                      <option value="gpt-5-mini">GPT-5 Mini — Fast & cost-efficient</option>
                      <option value="gpt-5-nano">GPT-5 Nano — Fastest & cheapest</option>
                    </optgroup>
                    <optgroup label="GPT-4.1 Series">
                      <option value="gpt-4.1">GPT-4.1 — Smartest non-reasoning</option>
                      <option value="gpt-4.1-mini">GPT-4.1 Mini — Smaller, faster</option>
                      <option value="gpt-4.1-nano">GPT-4.1 Nano — Ultra-fast</option>
                    </optgroup>
                    <optgroup label="Reasoning (o-series)">
                      <option value="o3-pro">o3-pro — Max compute reasoning</option>
                      <option value="o3">o3 — Complex reasoning</option>
                      <option value="o4-mini">o4-mini — Fast reasoning</option>
                      <option value="o3-mini">o3-mini — Small reasoning</option>
                    </optgroup>
                    <optgroup label="Legacy">
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </optgroup>
                  </>
                ) : settings.llm_provider === 'anthropic' ? (
                  <>
                    <optgroup label="Claude 4 Series (Latest)">
                      <option value="claude-opus-4-6-20260205">Claude Opus 4.6 — Latest flagship</option>
                      <option value="claude-opus-4-20250514">Claude Opus 4 — Best coding</option>
                      <option value="claude-sonnet-4-20250514">Claude Sonnet 4 — Fast & capable</option>
                    </optgroup>
                    <optgroup label="Claude 3.5 Series">
                      <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku — Fast</option>
                    </optgroup>
                  </>
                ) : (
                  <>
                    <optgroup label="Coding Models">
                      <option value="qwen3-coder-next">Qwen3 Coder Next — Best for coding</option>
                      <option value="devstral-small-2">Devstral Small 2 — 24B coding agent</option>
                      <option value="devstral-2">Devstral 2 — 123B coding agent</option>
                    </optgroup>
                    <optgroup label="Reasoning Models">
                      <option value="deepseek-v3.2">DeepSeek V3.2 — Reasoning + agent</option>
                      <option value="deepseek-v3.1">DeepSeek V3.1 — 671B thinking</option>
                      <option value="qwen3-next">Qwen3 Next — 80B thinking</option>
                      <option value="kimi-k2.5">Kimi K2.5 — Multimodal agentic</option>
                    </optgroup>
                    <optgroup label="Vision Models">
                      <option value="qwen3-vl">Qwen3 VL — Vision + language</option>
                      <option value="ministral-3">Ministral 3 — Edge vision</option>
                    </optgroup>
                    <optgroup label="General">
                      <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                      <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                      <option value="nemotron-3-nano">Nemotron 3 Nano — 30B agentic</option>
                    </optgroup>
                  </>
                )}
              </select>
            </label>

            {settings.llm_provider === 'ollama' && (
              <label className="block">
                <span className="text-[10px] text-dark-4 uppercase tracking-wider">Ollama API Key (optional)</span>
                <input
                  type="password"
                  value={settings.ollama_api_key}
                  onChange={(e) => updateSetting('ollama_api_key', e.target.value)}
                  placeholder="Leave empty for local; add key for Ollama Cloud"
                  className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5 placeholder-dark-4"
                />
                <p className="text-[10px] text-dark-4 mt-0.5">
                  <a href="https://docs.ollama.com/cloud" target="_blank" rel="noopener" className="text-nexus-400 hover:underline">Ollama Cloud</a>
                  {' '}— get key at ollama.com/settings/keys
                </p>
              </label>
            )}

            {settings.llm_provider !== 'ollama' && (
              <label className="block">
                <span className="text-[10px] text-dark-4 uppercase tracking-wider">
                  {settings.llm_provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key
                </span>
                <input
                  type="password"
                  value={settings.llm_provider === 'openai' ? settings.openai_api_key : settings.anthropic_api_key}
                  onChange={(e) =>
                    updateSetting(
                      settings.llm_provider === 'openai' ? 'openai_api_key' : 'anthropic_api_key',
                      e.target.value,
                    )
                  }
                  placeholder="sk-..."
                  className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5 placeholder-dark-4"
                />
              </label>
            )}
          </div>
        </Section>

        {/* Tabstack Configuration */}
        <Section title="Tabstack (Web Automation)">
          <label className="block">
            <span className="text-[10px] text-dark-4 uppercase tracking-wider">Tabstack API Key</span>
            <input
              type="password"
              value={settings.tabstack_api_key}
              onChange={(e) => updateSetting('tabstack_api_key', e.target.value)}
              placeholder="Your Tabstack API key"
              className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5 placeholder-dark-4"
            />
            <p className="text-[10px] text-dark-4 mt-0.5">
              Get your key at{' '}
              <a href="https://console.tabstack.ai" target="_blank" rel="noopener" className="text-nexus-400 hover:underline">
                console.tabstack.ai
              </a>
            </p>
          </label>
        </Section>

        {/* Permission Defaults */}
        <Section title="Permission Defaults">
          <p className="text-[11px] text-dark-4 leading-relaxed">
            Nexus uses a tiered permission system. By default:
          </p>
          <ul className="text-[11px] text-dark-4 space-y-0.5 mt-1 list-disc pl-4">
            <li><strong className="text-surface-3">Read Only</strong> -- auto-granted (30 min)</li>
            <li><strong className="text-surface-3">Navigate</strong> -- auto-granted (10 min)</li>
            <li><strong className="text-surface-3">Interact</strong> -- requires approval (5 min)</li>
            <li><strong className="text-surface-3">Submit</strong> -- always asks (2 min)</li>
            <li><strong className="text-surface-3">Purchase</strong> -- always asks (1 min, single-use)</li>
          </ul>
        </Section>

        {/* About */}
        <Section title="About Nexus">
          <div className="bg-dark-2 rounded-lg p-3 border border-dark-3 space-y-2">
            <p className="text-xs font-semibold firefox-flame">
              🦊 Nexus by BostonAi.io
            </p>
            <p className="text-[11px] text-dark-4 leading-relaxed">
              Built for the <strong className="text-nexus-400">Mozilla Web Agent API Hackathon</strong> —
              <em> Bring Your Own AI to Every Website</em>. Nexus treats AI as a
              browser capability with permission-first design, multi-agent coordination,
              and consciousness-powered memory.
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-dark-3">
              <span className="text-[10px] text-dark-4">v1.0.0</span>
              <a href="https://bostonai.io" target="_blank" rel="noopener" className="text-[10px] text-nexus-400 hover:underline">
                BostonAi.io
              </a>
              <a href="https://mozilla.org" target="_blank" rel="noopener" className="text-[10px] text-moz-blue hover:underline">
                Mozilla
              </a>
            </div>
          </div>
        </Section>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 p-3 bg-dark-0 border-t border-dark-3">
        <button
          onClick={handleSave}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
            saved
              ? 'bg-green-500/20 text-green-400'
              : 'bg-nexus-600 text-white hover:bg-nexus-700'
          }`}
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-surface-0 mb-2">{title}</h3>
      {children}
    </div>
  );
}
