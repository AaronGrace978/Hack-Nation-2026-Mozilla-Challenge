import { mcpClient, type MCPServer } from './client';
import { memoryStore } from '../memory/store';

// ─── MCP Server Registry ─────────────────────────────────────────────────────
// Persists MCP server configurations and auto-reconnects

const SETTINGS_KEY = 'mcp_servers';

interface ServerConfig {
  name: string;
  url: string;
  transport: 'http' | 'sse';
}

class MCPRegistry {
  // ── Load saved servers and connect ────────────────────────────────────────

  async initialize(): Promise<void> {
    const configs = await memoryStore.getSetting<ServerConfig[]>(SETTINGS_KEY, []);
    for (const config of configs) {
      try {
        await mcpClient.addServer(config.name, config.url, config.transport);
      } catch {
        // Silently skip failed servers
        console.warn(`Failed to connect to MCP server: ${config.name}`);
      }
    }
  }

  // ── Add and persist ───────────────────────────────────────────────────────

  async registerServer(name: string, url: string, transport: 'http' | 'sse' = 'http'): Promise<MCPServer> {
    const server = await mcpClient.addServer(name, url, transport);
    await this.saveConfigs();
    return server;
  }

  // ── Remove and persist ────────────────────────────────────────────────────

  async unregisterServer(id: string): Promise<void> {
    mcpClient.removeServer(id);
    await this.saveConfigs();
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private async saveConfigs(): Promise<void> {
    const servers = mcpClient.getServers();
    const configs: ServerConfig[] = servers.map((s) => ({
      name: s.name,
      url: s.url,
      transport: s.transport,
    }));
    await memoryStore.setSetting(SETTINGS_KEY, configs);
  }
}

export const mcpRegistry = new MCPRegistry();
