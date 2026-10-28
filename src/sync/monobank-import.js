import { callMonobankMcp } from "../connectors/monobank-mcp.js";
import { stageTransactions } from "./ledger.js";

const CURRENCIES = { 980: "UAH", 840: "USD", 978: "EUR", 985: "PLN" };

function unwrap(value) {
  if (value?.structuredContent) return value.structuredContent;
  if (value?.isError) throw new Error("Monobank MCP tool failed");
  if (Array.isArray(value?.content)) {
    const text = value.content.filter(x => x.type === "text").map(x => x.text).join("\n");
    if (text) return JSON.parse(text);
  }
  return value;
}

async function callTool(env, name, args) {
  return unwrap(await callMonobankMcp(env, "tools/call", { name, arguments: args }));
}

export async function importMonobankLast30Days(env) {
  if (!env.DB) throw new Error("D1 binding missing");
  const accountsResponse = await callTool(env, "list_fop_accounts", {});
  const accounts = Array.isArray(accountsResponse) ? accountsResponse : accountsResponse?.accounts;
  if (!Array.isArray(accounts)) throw new Error("Unexpected Monobank accounts response");
  if (accounts.length > 30) throw new Error("Unexpected number of bank accounts");

  const to = Math.floor(Date.now() / 1000);
  const from = to - 30 * 86400;
  const summary = { accounts: 0, received: 0, inserted: 0, duplicates: 0 };
  for (const account of accounts) {
    if (!account?.id || account.type !== "fop") continue;
    const response = await callTool(env, "get_fop_transactions", { account: account.id, from, to });
    const transactions = Array.isArray(response) ? response
      : response?.transactions ?? response?.statements ?? response?.items;
    if (!Array.isArray(transactions)) throw new Error("Unexpected Monobank transactions response");
    const currency = CURRENCIES[account.currencyCode] ?? String(account.currencyCode);
    // No transfers or exports to accounting providers here.
    const normalized = transactions.map(tx => {
      if (!tx?.id || !Number.isSafeInteger(tx.amount) || !Number.isFinite(tx.time)) {
        throw new Error("Unexpected Monobank transaction shape");
      }
      return {
        source: "monobank",
        accountId: account.id,
        id: String(tx.id),
        occurredAt: new Date(tx.time * 1000).toISOString(),
        amountMinor: tx.amount,
        currency,
        description: tx.description ?? null,
        raw: tx
      };
    });
    for (let i = 0; i < normalized.length; i += 500) {
      const result = await stageTransactions(env.DB, normalized.slice(i, i + 500));
      summary.received += result.received;
      summary.inserted += result.inserted;
      summary.duplicates += result.duplicates;
    }
    summary.accounts++;
  }
  return summary;
}
