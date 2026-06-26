const pdfParse = require("pdf-parse");

/**
 * ====================================================
 * PDF Parser v2
 * Supports:
 * - Yes Bank / ICICI iMobile (OpTransactionHistory)
 * - ICICI NetBanking
 * - HDFC
 * - SBI
 * - Axis
 * - Kotak
 * - Generic fallback
 *
 * Returns:
 * [{ date, description, amount, balance, type }]
 * ====================================================
 */

async function parsePDF(buffer) {
  const { text } = await pdfParse(buffer);

  console.log("========== RAW PDF ==========");
  console.log(text.substring(0, 1500));
  console.log("=============================");

  const bank = detectBank(text);
  console.log("Detected Bank:", bank);
  console.log("Detected:", bank);

  const cleaned = cleanText(text);

  const parserMap = {
    YESBANK:  parseYesBankOp,
    ICICI:    parseICICI,
    HDFC:     parseHDFC,
    SBI:      parseSBI,
    AXIS:     parseAxis,
    KOTAK:    parseKotak,
    GENERIC:  parseGeneric,
  };

  const parserFn = parserMap[bank] || parseGeneric;
  let transactions = parserFn(cleaned);

  // If primary parser found nothing, try all others before giving up
  if (transactions.length === 0) {
    console.log("Primary parser found nothing — trying all parsers...");
    const fallbacks = Object.entries(parserMap)
      .filter(([key]) => key !== bank && key !== "GENERIC");

    for (const [name, fn] of fallbacks) {
      const result = fn(cleaned);
      if (result.length > 0) {
        console.log(`Fallback matched: ${name}`);
        transactions = result;
        break;
      }
    }
  }

  // Last resort
  if (transactions.length === 0) {
    transactions = parseGeneric(cleaned);
  }

  console.log(`Parsed ${transactions.length} transactions`);
  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bank Detection
// ─────────────────────────────────────────────────────────────────────────────

function detectBank(text) {
  const t = text.toLowerCase();

  // Check statement format FIRST
  if (
    /optransactionhistory/i.test(text) ||
    t.includes("transaction remarks") ||
    t.includes("withdrawal amount") ||
    t.includes("deposit amount")
  ) {
    return "YESBANK";
  }

  if (t.includes("yes bank") || t.includes("yesbank"))
    return "YESBANK";

  if (t.includes("icici"))
    return "ICICI";

  if (t.includes("hdfc"))
    return "HDFC";

  if (t.includes("state bank") || t.includes("sbi"))
    return "SBI";

  if (t.includes("axis"))
    return "AXIS";

  if (t.includes("kotak"))
    return "KOTAK";

  return "GENERIC";
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Cleaning
// ─────────────────────────────────────────────────────────────────────────────

function cleanText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Yes Bank / ICICI iMobile — "OpTransactionHistory" vertical-column format
//
// pdf-parse collapses table columns into a stream like:
//
//   125.05.2026          ← S.No (1) glued to Date (25.05.2026)
//   SAFE GOLD            ← merchant name
//   UPI/SAFE GOLD/...    ← remark (multi-line)
//   20.00961.93          ← Withdrawal + Balance glued together
//
// ─────────────────────────────────────────────────────────────────────────────

function parseYesBankOp(text) {
  const transactions = [];

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // A row starts with: optional serial digits + DD.MM.YYYY
  const ROW_START = /^(\d*)(\d{2}[./]\d{2}[./]\d{4})$/;

  // Collect blocks
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(ROW_START);
    if (m) {
      if (current) blocks.push(current);
      current = { date: m[2], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  if (blocks.length === 0) return [];

  for (const block of blocks) {
    const date = normalizeDate(block.date);
    const { lines } = block;
    if (lines.length === 0) continue;

    // Skip header rows
    if (lines[0].match(/S\.?\s*No|Transaction|Cheque|Withdrawal|Deposit|Balance/i))
      continue;

    // Merchant = first non-UPI line
    const merchant = lines.find(l => !/^UPI\//i.test(l) && !/^\d/.test(l)) || lines[0];

    // UPI remark for extra context
    const remark = lines.find(l => /^UPI\//i.test(l)) || "";

    // Amount line = last line that looks like glued numbers "20.00961.93"
    const amountLine = [...lines].reverse().find(l => /^\d+\.\d{2}\d+\.\d{2}$/.test(l.replace(/,/g, "")))
      || [...lines].reverse().find(l => /\d+\.\d{2}/.test(l));

    const { amount, balance, type } = extractYesBankAmounts(amountLine || "", remark + " " + merchant);

    if (amount <= 0) continue;

    // Build clean description
    const vpa = extractVPA(remark);
    const description = [merchant, vpa].filter(Boolean).join(" • ").trim();

    transactions.push({ date, description, amount, balance, type });
  }

  return transactions;
}

/**
 * "20.00961.93" → { amount: 20.00, balance: 961.93, type: "debit" }
 * "0.00500.00"  → { amount: 500.00, balance: ...,   type: "credit" }
 */
function extractYesBankAmounts(line, context = "") {
  const cleaned = line.replace(/,/g, "");

  const nums = [];
  const re = /(\d+\.\d{2})/g;
  let m;

  while ((m = re.exec(cleaned)) !== null) {
    nums.push(parseFloat(m[1]));
  }

  if (nums.length === 0) {
    return {
      amount: 0,
      balance: 0,
      type: "debit",
    };
  }

  // Only one amount
  if (nums.length === 1) {
    return {
      amount: nums[0],
      balance: 0,
      type: isCredit(context) ? "credit" : "debit",
    };
  }

  const amount = nums[0];
  const balance = nums[nums.length - 1];

  let type = "debit";

  if (isCredit(context)) {
    type = "credit";
  }

  return {
    amount,
    balance,
    type,
  };
}

function extractVPA(remark = "") {
  const match = remark.match(/[a-zA-Z0-9._-]+@[a-zA-Z]+/);
  return match ? `(${match[0]})` : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// ICICI NetBanking
// Inline format: DD-MM-YYYY  description  amount  CR/DR  balance
// ─────────────────────────────────────────────────────────────────────────────

function parseICICI(text) {
  const transactions = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const SKIP = /Transaction|Cheque|Withdrawal|Deposit|Balance|Statement|Team ICICI/i;
  const ROW_START = /^(\d+)(\d{2}\.\d{2}\.\d{4})$/;

  let current = null;

  for (const line of lines) {
    if (SKIP.test(line)) continue;

    // Row start: serialNo + DD.MM.YYYY glued
    const startMatch = line.match(ROW_START);
    if (startMatch) {
      if (current) transactions.push(finalise(current));
      current = { date: normalizeDate(startMatch[2]), description: "", amount: 0, balance: 0, type: "debit" };
      continue;
    }

    if (!current) continue;

    // Amount + balance glued: "500.001234.56"
    const moneyMatch = line.match(/^(\d+\.\d{2})(\d+\.\d{2})$/);
    if (moneyMatch) {
      current.amount   = parseFloat(moneyMatch[1]);
      current.balance  = parseFloat(moneyMatch[2]);
      // Check if it's a deposit (second pass — deposit lines sometimes separate)
      current.type = detectType(current.description);
      continue;
    }

    // Explicit CR / DR marker
    const crdrMatch = line.match(/\b(CR|DR)\b/i);
    if (crdrMatch) {
      current.type = crdrMatch[1].toUpperCase() === "CR" ? "credit" : "debit";
      continue;
    }

    current.description += " " + line;
  }

  if (current) transactions.push(finalise(current));

  return transactions.filter(t => t.amount > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// HDFC
// DD/MM/YY(YY)  description  amount  Dr/Cr  balance
// ─────────────────────────────────────────────────────────────────────────────

function parseHDFC(text) {
  const transactions = [];

  // HDFC statements have dates in DD/MM/YY or DD/MM/YYYY format
  const ROW = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(\d[\d,]*\.\d{2})\s+(Dr|Cr)\s+(\d[\d,]*\.\d{2})/gi;

  let m;
  while ((m = ROW.exec(text)) !== null) {
    const [, date, description, amountStr, drCr, balanceStr] = m;
    const amount  = parseAmount(amountStr);
    const balance = parseAmount(balanceStr);
    if (amount > 0) {
      transactions.push({
        date:        normalizeDate(date),
        description: description.trim(),
        amount,
        balance,
        type: drCr.toLowerCase() === "dr" ? "debit" : "credit",
      });
    }
  }

  // Fallback: no balance column (some HDFC exports omit it)
  if (transactions.length === 0) {
    const ROW2 = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(\d[\d,]*\.\d{2})\s+(Dr|Cr)/gi;
    while ((m = ROW2.exec(text)) !== null) {
      const [, date, description, amountStr, drCr] = m;
      const amount = parseAmount(amountStr);
      if (amount > 0) {
        transactions.push({
          date:        normalizeDate(date),
          description: description.trim(),
          amount,
          balance:     0,
          type: drCr.toLowerCase() === "dr" ? "debit" : "credit",
        });
      }
    }
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// SBI
// DD Mon YYYY  description  debit  credit  balance
// ─────────────────────────────────────────────────────────────────────────────

function parseSBI(text) {
  const transactions = [];
  const ROW = /(\d{2}\s+\w{3}\s+\d{4})\s+(.+?)\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})/g;

  let m;
  while ((m = ROW.exec(text)) !== null) {
    const [, date, description, debitStr, creditStr, balanceStr] = m;
    const debit   = parseAmount(debitStr);
    const credit  = parseAmount(creditStr);
    const balance = parseAmount(balanceStr);

    // SBI uses 0.00 for the empty column
    if (debit > 0) {
      transactions.push({ date: normalizeDate(date), description: description.trim(), amount: debit, balance, type: "debit" });
    } else if (credit > 0) {
      transactions.push({ date: normalizeDate(date), description: description.trim(), amount: credit, balance, type: "credit" });
    }
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis Bank
// DD-MM-YYYY  description  debit  credit  balance
// ─────────────────────────────────────────────────────────────────────────────

function parseAxis(text) {
  const transactions = [];
  const ROW = /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})/g;

  let m;
  while ((m = ROW.exec(text)) !== null) {
    const [, date, description, col1, col2, balanceStr] = m;
    const a1 = parseAmount(col1);
    const a2 = parseAmount(col2);
    const balance = parseAmount(balanceStr);

    if (!description.toLowerCase().includes("balance")) {
      // col1 = debit, col2 = credit (one will be 0.00)
      if (a1 > 0) transactions.push({ date: normalizeDate(date), description: description.trim(), amount: a1, balance, type: "debit" });
      else if (a2 > 0) transactions.push({ date: normalizeDate(date), description: description.trim(), amount: a2, balance, type: "credit" });
    }
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kotak Bank
// DD-MM-YYYY  description  amount  Dr/Cr  balance
// ─────────────────────────────────────────────────────────────────────────────

function parseKotak(text) {
  const transactions = [];
  const ROW = /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+(\d[\d,]*\.\d{2})\s+(Dr|Cr|Debit|Credit)/gi;

  let m;
  while ((m = ROW.exec(text)) !== null) {
    const [, date, description, amountStr, type] = m;
    const amount = parseAmount(amountStr);
    if (amount > 0) {
      transactions.push({
        date:        normalizeDate(date),
        description: description.trim(),
        amount,
        balance:     0,
        type: /dr|debit/i.test(type) ? "debit" : "credit",
      });
    }
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fallback — any line with a date + at least one amount
// ─────────────────────────────────────────────────────────────────────────────

function parseGeneric(text) {
  const transactions = [];
  const DATE_RE = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{2}\s+\w{3}\s+\d{4})/;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length < 10) continue;

    const dateMatch = trimmed.match(DATE_RE);
    if (!dateMatch) continue;

    const amounts = [];
    const re = /(\d{1,3}(?:,\d{3})*\.\d{2})/g;
    let nm;
    while ((nm = re.exec(trimmed)) !== null) {
      const v = parseAmount(nm[1]);
      if (v > 0.5 && v < 5_000_000) amounts.push(v);
    }
    if (!amounts.length) continue;

    const description = trimmed
      .replace(dateMatch[0], "")
      .replace(/(\d{1,3}(?:,\d{3})*\.\d{2})/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (description.length < 2) continue;

    transactions.push({
      date:        normalizeDate(dateMatch[1]),
      description,
      amount:      amounts[0],
      balance:     amounts[amounts.length - 1] !== amounts[0] ? amounts[amounts.length - 1] : 0,
      type:        detectType(description),
    });
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function finalise(txn) {
  return {
    ...txn,
    description: txn.description.replace(/\s+/g, " ").trim(),
    type: txn.type || detectType(txn.description),
  };
}

function normalizeDate(date) {
  if (!date) return "Unknown";
  const s = date.trim();

  // DD.MM.YYYY
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // DD/MM/YY or DD/MM/YYYY
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[2]}-${m[1]}`; }

  // DD-MM-YYYY
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // DD Mon YYYY
  m = s.match(/^(\d{2})\s+(\w{3})\s+(\d{4})$/);
  if (m) {
    const mo = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
                 Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
    return `${m[3]}-${mo[m[2]] || "01"}-${m[1]}`;
  }

  return s;
}

function parseAmount(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, "").trim()) || 0;
}

function isCredit(text = "") {
  const t = text.toLowerCase();

  return [
    "salary",
    "salary credit",
    "quin que",
    "foreign inward",
    "refund",
    "cashback",
    "credited",
    "credit",
    "received",
    "deposit",
    "neft",
    "imps",
    "upi/cr",
    "interest",
    "reversal"
  ].some(k => t.includes(k));
}

function detectType(description) {
  return isCredit(description) ? "credit" : "debit";
}

module.exports = { parsePDF };
