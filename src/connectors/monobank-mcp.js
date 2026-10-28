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
  if (env.MONOBANK_MCP_TOKEN) headers.Authorization = `Bearer ${env.MONOBANK_MCP_TOKEN}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Monobank MCP HTTP ${response.status}`);
  const text = await response.text();
  const data = response.headers.get("content-type")?.includes("text/event-stream")
    ? parseSseJsonRpc(text)
    : JSON.parse(text);
  if (data.error) throw new Error(`Monobank MCP error ${data.error.code ?? "unknown"}`);
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
