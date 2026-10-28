import { callMonobankMcp, MonobankMcpError } from "./connectors/monobank-mcp.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Diagnostic is disabled until a dedicated secret is configured.
    // Do not expose bank connectivity checks as an unauthenticated public endpoint.
    if (url.pathname === "/internal/monobank/check") {
      if (request.method !== "POST") return new Response(null, { status: 405 });
      const expected = env.MONOBANK_DIAGNOSTIC_KEY;
      const provided = request.headers.get("X-LedgerSync-Diagnostic-Key");
      if (!expected || !provided || provided !== expected) {
        return new Response(null, { status: 404 });
      }
      try {
        await callMonobankMcp(env, "initialize", {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "LedgerSync", version: "0.1.0" }
        });
        return Response.json({ service: "LedgerSync", monobank_mcp: "connected" },
          { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        console.error("Monobank MCP connectivity check:", error instanceof MonobankMcpError ? error.category : "transport_failure");
        return Response.json({ service: "LedgerSync", monobank_mcp: "unavailable", reason: error instanceof MonobankMcpError ? error.category : "transport_failure" },
          { status: 502, headers: { "Cache-Control": "no-store" } });
      }
    }

    if (url.pathname === "/health" && request.method === "GET") {
      try {
        if (!env.DB) throw new Error("Missing D1 binding: DB");
        const row = await env.DB.prepare("SELECT 1 AS connected").first();
        if (row?.connected !== 1) throw new Error("D1 query failed");
        return Response.json({
          service: "LedgerSync",
          status: "ok",
          database: "connected",
          timestamp: new Date().toISOString()
        }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        console.error("Health check failed:", error);
        return Response.json({
          service: "LedgerSync",
          status: "error",
          database: "disconnected"
        }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }

    return Response.json({ service: "LedgerSync", status: "running", endpoints: ["/health"] });
  }
};
