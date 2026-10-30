// Pure, read-only reconciliation. Inputs are normalized bank and QBO records.
// Never infer an exact match from a date+amount if multiple candidates exist.
const day = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid reconciliation date");
  return Math.floor(date.getTime() / 86400000);
};
const key = tx => [tx.source ?? "monobank", tx.account_id, tx.external_id].join("\u001f");
export function reconcileTransactions(bank, book, options = {}) {
  const { dateToleranceDays = 1 } = options;
  if (!Number.isInteger(dateToleranceDays) || dateToleranceDays < 0 || dateToleranceDays > 5)
    throw new Error("Invalid date tolerance");
  const usedBank = new Set(), usedBook = new Set();
  const matches = [], ambiguous = [], missingInBooks = [];
  const candidates = bank.map((b,i) => {
    if (!Number.isSafeInteger(b.amount_minor) || !b.account_id || !b.external_id || !b.currency)
      throw new Error("Invalid bank record");
    return book.map((q,j) => {
      if (!Number.isSafeInteger(q.amount_minor) || !q.transaction_id || !q.currency || !q.bank_account_id)
        throw new Error("Invalid book record");
      if (String(q.bank_account_id) !== String(b.qbo_account_id) ||
          q.currency !== b.currency || q.amount_minor !== b.amount_minor) return null;
      const distance = Math.abs(day(q.txn_date) - day(b.occurred_at));
      return distance <= dateToleranceDays ? { j, distance } : null;
    }).filter(Boolean);
  });
  // One-to-one only: do not consume any row when a second eligible bank row exists.
  candidates.forEach((c,i) => {
    if (c.length !== 1) return;
    const j = c[0].j;
    if (candidates.some((other,k)=>k!==i && other.some(x=>x.j===j))) return;
    if (!usedBook.has(j)) {
      usedBank.add(i); usedBook.add(j);
      matches.push({ bank_key:key(bank[i]), qbo_transaction_id:String(book[j].transaction_id), date_delta_days:c[0].distance });
    }
  });
  bank.forEach((b,i) => {
    if (usedBank.has(i)) return;
    const c=candidates[i].filter(x=>!usedBook.has(x.j));
    if (c.length || candidates[i].length) ambiguous.push({ bank_key:key(b), candidate_count:c.length });
    else missingInBooks.push({ bank_key:key(b) });
  });
  const unmatchedBooks = book.filter((_,j)=>!usedBook.has(j)).map(q=>String(q.transaction_id));
  return { matches, ambiguous, missingInBooks, unmatchedBooks,
    summary:{ matched:matches.length, ambiguous:ambiguous.length, missing_in_books:missingInBooks.length, unmatched_books:unmatchedBooks.length } };
}
