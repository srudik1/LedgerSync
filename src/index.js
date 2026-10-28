export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
