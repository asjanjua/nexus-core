#!/usr/bin/env node

const baseUrl = process.env.NEXUS_MCP_BASE_URL ?? "http://localhost:3000";
const token = process.env.NEXUS_MCP_BEARER_TOKEN;

function write(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function api(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "nexus_api_error");
    return json.data;
  }
  if (!res.ok) throw new Error(`nexus_api_error:${res.status}`);
  return res.text();
}

const tools = [
  {
    name: "save_memory",
    description: "Create a Nexus knowledge note.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        path: { type: "string" },
        tags: { type: "array", items: { type: "string" } }
      },
      required: ["title", "body"]
    }
  },
  {
    name: "search_memory",
    description: "Search Nexus knowledge notes.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] }
  },
  {
    name: "read_note",
    description: "Read a Nexus knowledge note by id.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
  },
  {
    name: "write_note",
    description: "Update a Nexus knowledge note by id.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" }, path: { type: "string" } }, required: ["id"] }
  },
  {
    name: "list_recent_notes",
    description: "List recent Nexus knowledge notes.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } }
  },
  {
    name: "vault_status",
    description: "Read local vault sync status.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "sync_vault",
    description: "Run a local vault sync.",
    inputSchema: { type: "object", properties: { watch: { type: "boolean" } } }
  },
  {
    name: "knowledge_graph",
    description: "Read Nexus knowledge graph nodes and edges.",
    inputSchema: { type: "object", properties: {} }
  }
];

async function callTool(name, args = {}) {
  if (name === "save_memory") {
    return api("/api/knowledge/notes", { method: "POST", body: JSON.stringify({ sourceKind: "mcp", ...args }) });
  }
  if (name === "search_memory") {
    return api(`/api/knowledge/search?q=${encodeURIComponent(args.query ?? "")}&limit=${encodeURIComponent(args.limit ?? 20)}`);
  }
  if (name === "read_note") return api(`/api/knowledge/notes/${encodeURIComponent(args.id)}`);
  if (name === "write_note") {
    const { id, ...body } = args;
    return api(`/api/knowledge/notes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ sourceKind: "mcp", ...body }) });
  }
  if (name === "list_recent_notes") return api(`/api/knowledge/notes?limit=${encodeURIComponent(args.limit ?? 20)}`);
  if (name === "vault_status") return api("/api/knowledge/sync");
  if (name === "sync_vault") return api("/api/knowledge/sync", { method: "POST", body: JSON.stringify({ watch: Boolean(args.watch) }) });
  if (name === "knowledge_graph") return api("/api/knowledge/graph");
  throw new Error(`unknown_tool:${name}`);
}

process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    void (async () => {
      const msg = JSON.parse(line);
      try {
        if (msg.method === "initialize") {
          write({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "nexus-knowledge", version: "0.1.0" } } });
        } else if (msg.method === "tools/list") {
          write({ jsonrpc: "2.0", id: msg.id, result: { tools } });
        } else if (msg.method === "tools/call") {
          const result = await callTool(msg.params?.name, msg.params?.arguments ?? {});
          write({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } });
        } else {
          write({ jsonrpc: "2.0", id: msg.id, result: {} });
        }
      } catch (error) {
        write({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } });
      }
    })();
  }
});
