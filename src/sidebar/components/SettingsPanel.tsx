import React, { useState, useEffect } from 'react';
import { memoryStore } from '../../memory/store';
import { sendToBackground } from '../hooks/useAgents';
import { ExtMessageType } from '../../shared/messages';
import {
  DEFAULT_COMPARISON_SITES,
  DEFAULT_PRICE_COMPARISON_CONFIG,
  type ComparisonSite,
} from '../../shared/constants';

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

  // ── Price Comparison State ─────────────────────────────────────────────────
  const [pcEnabled, setPcEnabled] = useState(DEFAULT_PRICE_COMPARISON_CONFIG.enabled);
  const [pcAutoCompare, setPcAutoCompare] = useState(DEFAULT_PRICE_COMPARISON_CONFIG.autoCompare);
  const [pcSortBy, setPcSortBy] = useState<string>(DEFAULT_PRICE_COMPARISON_CONFIG.sortBy);
  const [pcMaxParallel, setPcMaxParallel] = useState(DEFAULT_PRICE_COMPARISON_CONFIG.maxParallelSites);
  const [pcMaxResults, setPcMaxResults] = useState(DEFAULT_PRICE_COMPARISON_CONFIG.maxResultsPerSite);
  const [pcSites, setPcSites] = useState<ComparisonSite[]>(DEFAULT_COMPARISON_SITES);
  const [pcCustomUrl, setPcCustomUrl] = useState('');
  const [pcCustomName, setPcCustomName] = useState('');

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

      // Load price comparison settings
      setPcEnabled(await memoryStore.getSetting<boolean>('price_comparison_enabled', DEFAULT_PRICE_COMPARISON_CONFIG.enabled));
      setPcAutoCompare(await memoryStore.getSetting<boolean>('price_comparison_auto_compare', DEFAULT_PRICE_COMPARISON_CONFIG.autoCompare));
      setPcSortBy(await memoryStore.getSetting<string>('price_comparison_sort', DEFAULT_PRICE_COMPARISON_CONFIG.sortBy));
      setPcMaxParallel(await memoryStore.getSetting<number>('price_comparison_max_parallel', DEFAULT_PRICE_COMPARISON_CONFIG.maxParallelSites));
      setPcMaxResults(await memoryStore.getSetting<number>('price_comparison_max_results', DEFAULT_PRICE_COMPARISON_CONFIG.maxResultsPerSite));
      setPcSites(await memoryStore.getSetting<ComparisonSite[]>('price_comparison_sites', DEFAULT_COMPARISON_SITES));
    }
    load();
  }, []);

  const handleSave = async () => {
    for (const [key, value] of Object.entries(settings)) {
      await memoryStore.setSetting(key, value);
    }

    // Persist price comparison settings
    await memoryStore.setSetting('price_comparison_enabled', pcEnabled);
    await memoryStore.setSetting('price_comparison_auto_compare', pcAutoCompare);
    await memoryStore.setSetting('price_comparison_sort', pcSortBy);
    await memoryStore.setSetting('price_comparison_max_parallel', pcMaxParallel);
    await memoryStore.setSetting('price_comparison_max_results', pcMaxResults);
    await memoryStore.setSetting('price_comparison_sites', pcSites);

    sendToBackground(ExtMessageType.UPDATE_SETTINGS, {
      ...settings,
      price_comparison_enabled: pcEnabled,
      price_comparison_auto_compare: pcAutoCompare,
      price_comparison_sort: pcSortBy,
      price_comparison_sites: pcSites,
    });
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

  // ── Price Comparison Helpers ───────────────────────────────────────────────

  const toggleSite = (siteId: string) => {
    setPcSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const addCustomSite = () => {
    if (!pcCustomName.trim() || !pcCustomUrl.trim()) return;
    const id = pcCustomName.toLowerCase().replace(/\s+/g, '-');
    if (pcSites.some((s) => s.id === id)) return; // Prevent duplicates
    const urlTemplate = pcCustomUrl.includes('{query}')
      ? pcCustomUrl
      : `${pcCustomUrl}${pcCustomUrl.includes('?') ? '&' : '?'}q={query}`;
    setPcSites((prev) => [
      ...prev,
      { id, name: pcCustomName.trim(), searchUrl: urlTemplate, enabled: true },
    ]);
    setPcCustomName('');
    setPcCustomUrl('');
  };

  const removeSite = (siteId: string) => {
    setPcSites((prev) => prev.filter((s) => s.id !== siteId));
  };

  const enabledSiteCount = pcSites.filter((s) => s.enabled).length;

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

        {/* Price Comparison */}
        <Section title="Price Comparison">
          <div className="space-y-3">
            {/* Master toggle */}
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <span className="text-[11px] text-surface-0 font-medium">Enable Cross-Site Price Comparison</span>
                <p className="text-[10px] text-dark-4 leading-tight mt-0.5">
                  Search and compare prices across multiple retailers automatically
                </p>
              </div>
              <div
                className={`relative w-9 h-5 rounded-full transition-colors ${pcEnabled ? 'bg-nexus-600' : 'bg-dark-3'}`}
                onClick={() => setPcEnabled(!pcEnabled)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${pcEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </div>
            </label>

            {pcEnabled && (
              <>
                {/* Auto-compare toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[11px] text-surface-3">Auto-suggest on product pages</span>
                    <p className="text-[10px] text-dark-4 leading-tight mt-0.5">
                      Nexus will offer to compare prices when it detects a product page
                    </p>
                  </div>
                  <div
                    className={`relative w-9 h-5 rounded-full transition-colors ${pcAutoCompare ? 'bg-nexus-600' : 'bg-dark-3'}`}
                    onClick={() => setPcAutoCompare(!pcAutoCompare)}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${pcAutoCompare ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </div>
                </label>

                {/* Sort by */}
                <label className="block">
                  <span className="text-[10px] text-dark-4 uppercase tracking-wider">Sort Results By</span>
                  <select
                    value={pcSortBy}
                    onChange={(e) => setPcSortBy(e.target.value)}
                    className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5"
                  >
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Best Rating</option>
                    <option value="relevance">Relevance</option>
                  </select>
                </label>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] text-dark-4 uppercase tracking-wider">Max Sites</span>
                    <select
                      value={pcMaxParallel}
                      onChange={(e) => setPcMaxParallel(Number(e.target.value))}
                      className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5"
                    >
                      {[2, 3, 4, 5, 6, 8].map((n) => (
                        <option key={n} value={n}>{n} sites</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-dark-4 uppercase tracking-wider">Results/Site</span>
                    <select
                      value={pcMaxResults}
                      onChange={(e) => setPcMaxResults(Number(e.target.value))}
                      className="mt-0.5 w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1.5"
                    >
                      {[3, 5, 10, 15].map((n) => (
                        <option key={n} value={n}>{n} results</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Comparison Sites */}
                <div>
                  <span className="text-[10px] text-dark-4 uppercase tracking-wider">
                    Comparison Sites ({enabledSiteCount} active)
                  </span>
                  <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                    {pcSites.map((site) => (
                      <div
                        key={site.id}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-md border transition-colors ${
                          site.enabled
                            ? 'bg-nexus-600/10 border-nexus-600/30 text-surface-0'
                            : 'bg-dark-2 border-dark-3 text-dark-4'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={site.enabled}
                            onChange={() => toggleSite(site.id)}
                            className="w-3.5 h-3.5 rounded border-dark-3 text-nexus-600 focus:ring-nexus-500"
                          />
                          <span className="text-[11px] font-medium">{site.name}</span>
                        </label>
                        {/* Allow removing custom sites (those not in defaults) */}
                        {!DEFAULT_COMPARISON_SITES.some((d) => d.id === site.id) && (
                          <button
                            onClick={() => removeSite(site.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 px-1"
                            title="Remove site"
                          >
                            x
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add custom site */}
                <div className="border border-dashed border-dark-3 rounded-md p-2 space-y-1.5">
                  <span className="text-[10px] text-dark-4 uppercase tracking-wider">Add Custom Site</span>
                  <input
                    type="text"
                    value={pcCustomName}
                    onChange={(e) => setPcCustomName(e.target.value)}
                    placeholder="Site name (e.g. Micro Center)"
                    className="w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1 placeholder-dark-4"
                  />
                  <input
                    type="text"
                    value={pcCustomUrl}
                    onChange={(e) => setPcCustomUrl(e.target.value)}
                    placeholder="Search URL with {query} (e.g. https://example.com/search?q={query})"
                    className="w-full text-xs bg-dark-1 text-surface-0 border border-dark-3 rounded-md px-2 py-1 placeholder-dark-4"
                  />
                  <button
                    onClick={addCustomSite}
                    disabled={!pcCustomName.trim() || !pcCustomUrl.trim()}
                    className="w-full text-[11px] py-1 rounded-md bg-dark-3 text-surface-3 hover:bg-dark-4 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    + Add Site
                  </button>
                </div>
              </>
            )}
          </div>
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
              Nexus by BostonAi.io
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
