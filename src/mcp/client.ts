import { generateId } from '../shared/utils';

// ─── MCP Types ────────────────────────────────────────────────────────────────

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  transport: 'http' | 'sse';
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  lastConnected?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCallResult {
  content: unknown;
  isError: boolean;
}

// ─── MCP Client ───────────────────────────────────────────────────────────────

class MCPClient {
  private servers: Map<string, MCPServer> = new Map();
  private listeners: Set<(servers: MCPServer[]) => void> = new Set();

  // ── Server Management ─────────────────────────────────────────────────────

  async addServer(name: string, url: string, transport: 'http' | 'sse' = 'http'): Promise<MCPServer> {
    const server: MCPServer = {
      id: generateId('mcp'),
      name,
      url,
      transport,
      status: 'disconnected',
      tools: [],
    };

    this.servers.set(server.id, server);
    await this.connect(server.id);
    this.notify();
    return server;
  }

  removeServer(id: string): boolean {
    const removed = this.servers.delete(id);
    if (removed) this.notify();
    return removed;
  }

  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  // ── Connection ────────────────────────────────────────────────────────────

  async connect(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`MCP server ${serverId} not found`);

    try {
      // Discover tools via MCP list_tools endpoint
      const response = await fetch(`${server.url}/mcp/v1/tools/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      });

      if (response.ok) {
        const data = await response.json();
        server.tools = data.result?.tools ?? [];
        server.status = 'connected';
        server.lastConnected = Date.now();
      } else {
        server.status = 'error';
      }
    } catch {
      server.status = 'error';
    }

    this.servers.set(serverId, server);
    this.notify();
  }

  // ── Tool Calling ──────────────────────────────────────────────────────────

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolCallResult> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`MCP server ${serverId} not found`);
    if (server.status !== 'connected') {
      throw new Error(`MCP server ${server.name} is not connected`);
    }

    try {
      const response = await fetch(`${server.url}/mcp/v1/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: toolName, arguments: args },
          id: generateId('call'),
        }),
      });

      if (!response.ok) {
        return { content: `HTTP ${response.status}: ${await response.text()}`, isError: true };
      }

      const data = await response.json();
      if (data.error) {
        return { content: data.error.message, isError: true };
      }

      return { content: data.result?.content ?? data.result, isError: false };
    } catch (err) {
      return { content: String(err), isError: true };
    }
  }

  // ── Tool Discovery ────────────────────────────────────────────────────────

  getAllTools(): { serverId: string; serverName: string; tool: MCPTool }[] {
    const tools: { serverId: string; serverName: string; tool: MCPTool }[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        for (const tool of server.tools) {
          tools.push({ serverId: server.id, serverName: server.name, tool });
        }
      }
    }
    return tools;
  }

  findTool(name: string): { serverId: string; tool: MCPTool } | undefined {
    for (const server of this.servers.values()) {
      const tool = server.tools.find((t) => t.name === name);
      if (tool) return { serverId: server.id, tool };
    }
    return undefined;
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: (servers: MCPServer[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const servers = this.getServers();
    for (const listener of this.listeners) {
      listener(servers);
    }
  }
}

export const mcpClient = new MCPClient();
