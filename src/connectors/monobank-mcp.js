// Monobank MCP transport for server-to-server calls from LedgerSync.
// Set MONOBANK_MCP_URL and, if the endpoint supports bearer authentication,
// MONOBANK_MCP_TOKEN as Cloudflare Worker secrets/variables.
// Cloudflare Access browser login is not a server-to-server credential.
export async function callMonobankMcp(env, method, params = {}) {
  const endpoint = env.MONOBANK_MCP_URL;
  if (!endpoint) throw new Error("MONOBANK_MCP_URL is not configured");
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new Error("Monobank MCP requires HTTPS");
  if (!["initialize", "tools/list", "tools/call", "ping"].includes(method)) {
    throw new Error("Unsupported MCP method");
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-03-26"
  };
  // Cloudflare Access service tokens authenticate machine-to-machine requests.
  // Store both values as Worker secrets, never in source control.
  if (env.MONOBANK_ACCESS_CLIENT_ID && env.MONOBANK_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = env.MONOBANK_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = env.MONOBANK_ACCESS_CLIENT_SECRET;
  }
  if (env.MONOBANK_MCP_TOKEN) headers.Authorization = `Bearer ${env.MONOBANK_MCP_TOKEN}`;
  const transport = env.MONOBANK_SERVICE && env.MONOBANK_BINDING_KEY
    ? env.MONOBANK_SERVICE.fetch.bind(env.MONOBANK_SERVICE) : fetch;
  if (transport !== fetch) headers["X-LedgerSync-Internal-Key"] = env.MONOBANK_BINDING_KEY;
  const response = await transport(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const code = response.status;
    const type = code === 401 || code === 403 ? "access_denied"
      : code === 404 ? "endpoint_not_found"
      : code >= 500 ? "upstream_error" : "http_error";
    // Static labels only: never log URL, request/response bodies, IDs, or credentials.
    const stage = method === "initialize" ? "initialize"
      : method === "tools/list" ? "tools_list"
      : method === "ping" ? "ping"
      : params?.name === "list_fop_accounts" ? "list_fop_accounts"
      : params?.name === "get_fop_transactions" ? "get_fop_transactions"
      : "unknown";
    const httpCategory = code === 401 ? "http_401"
      : code === 403 ? "http_403"
      : code === 404 ? "http_404"
      : code === 429 ? "http_429"
      : code >= 500 ? "http_5xx" : "http_other";
    console.error("Monobank MCP HTTP failure", JSON.stringify({
      stage, category: type, http_category: httpCategory
    }));
    const error = new MonobankMcpError(type, code);
    error.stage = ["list_fop_accounts", "get_fop_transactions"].includes(stage) ? stage : "unknown";
    throw error;
  }
  const text = await response.text();
  let data;
  try {
    data = response.headers.get("content-type")?.includes("text/event-stream")
      ? parseSseJsonRpc(text) : JSON.parse(text);
  } catch {
    throw new MonobankMcpError("invalid_mcp_response");
  }
  if (data.error) throw new MonobankMcpError("mcp_rpc_error", data.error.code);
  return data.result;
}

function parseSseJsonRpc(text) {
  const events = text.split(/\r?\n\r?\n/);
  for (const event of events) {
    const data = event.split(/\r?\n/).filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trim()).join("\n");
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.jsonrpc === "2.0") return parsed;
    }
  }
  throw new Error("No JSON-RPC response in MCP event stream");
}

export class MonobankMcpError extends Error {
  constructor(category, status = null) {
    super("Monobank MCP: " + category);
    this.name = "MonobankMcpError";
    this.category = category;
    this.status = status;
  }
}
