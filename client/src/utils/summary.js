/**
 * Build a summary from an array of categorized transactions.
 * Mirrors the server-side buildSummary for client use.
 */
export function buildSummary(transactions) {
  const debits = transactions.filter((t) => t.type === "debit");

  const byCategory = {};
  for (const txn of debits) {
    const cat = txn.category || "📦 Others";
    if (!byCategory[cat]) byCategory[cat] = 0;
    byCategory[cat] += txn.amount;
  }

  for (const key in byCategory) {
    byCategory[key] = Math.round(byCategory[key]);
  }

  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  const byMonth = {};
  for (const txn of debits) {
    const month = txn.date ? txn.date.substring(0, 7) : "Unknown";
    if (!byMonth[month]) byMonth[month] = 0;
    byMonth[month] += txn.amount;
  }

  return {
    total: Math.round(total),
    byCategory,
    byMonth,
    transactionCount: debits.length,
  };
}
