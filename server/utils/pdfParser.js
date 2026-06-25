const pdfParse = require("pdf-parse");

/**
 * Parse a PDF buffer and extract transactions.
 * Supports HDFC, SBI, ICICI, Axis bank statement formats.
 * Returns array of: { date, description, amount, type: 'debit'|'credit' }
 */
async function parsePDF(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text;

  // Try each bank parser in order
  const parsers = [parseHDFC, parseSBI, parseICICI, parseAxis, parseGeneric];

  for (const parser of parsers) {
    const transactions = parser(text);
    if (transactions && transactions.length > 0) {
      console.log(`Parsed ${transactions.length} transactions`);
      return transactions;
    }
  }

  return [];
}

/**
 * HDFC Bank statement format
 * Lines like: 01/06/24  ZOMATO ORDER   1,200.00  (Dr)  45,000.00
 */
function parseHDFC(text) {
  const transactions = [];
  // HDFC pattern: date, narration, amount, Dr/Cr, balance
  const pattern =
    /(\d{2}\/\d{2}\/\d{2,4})\s+(.*?)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(Dr|Cr)/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, date, description, amountStr, type] = match;
    const amount = parseFloat(amountStr.replace(/,/g, ""));
    if (amount > 0) {
      transactions.push({
        date: normalizeDate(date),
        description: description.trim(),
        amount,
        type: type.toLowerCase() === "dr" ? "debit" : "credit",
      });
    }
  }
  return transactions;
}

/**
 * SBI Bank statement format
 * Lines like: 01 Jun 2024  BY TRANSFER-UPI  -  5,000.00  10,000.00
 */
function parseSBI(text) {
  const transactions = [];
  const pattern =
    /(\d{2}\s+\w{3}\s+\d{4})\s+(.*?)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, date, description, debit] = match;
    const amount = parseFloat(debit.replace(/,/g, ""));
    if (amount > 0 && description.trim().length > 2) {
      transactions.push({
        date: normalizeDate(date),
        description: description.trim(),
        amount,
        type: "debit",
      });
    }
  }
  return transactions;
}

/**
 * ICICI Bank statement format
 */
function parseICICI(text) {
  const transactions = [];
  // ICICI: DD-MM-YYYY  description  amount  CR/DR
  const pattern =
    /(\d{2}-\d{2}-\d{4})\s+(.*?)\s+(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(CR|DR)/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, date, description, amountStr, type] = match;
    const amount = parseFloat(amountStr.replace(/,/g, ""));
    if (amount > 0) {
      transactions.push({
        date: normalizeDate(date),
        description: description.trim(),
        amount,
        type: type.toUpperCase() === "DR" ? "debit" : "credit",
      });
    }
  }
  return transactions;
}

/**
 * Axis Bank statement format
 */
function parseAxis(text) {
  const transactions = [];
  // Axis: DD-MM-YYYY  narration  debit  credit  balance
  const pattern =
    /(\d{2}-\d{2}-\d{4})\s+(.*?)\s+(\d{1,3}(?:,\d{3})*\.\d{2})\s+(\d{1,3}(?:,\d{3})*\.\d{2})/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, date, description, debitStr] = match;
    const amount = parseFloat(debitStr.replace(/,/g, ""));
    if (amount > 0 && !description.toLowerCase().includes("balance")) {
      transactions.push({
        date: normalizeDate(date),
        description: description.trim(),
        amount,
        type: "debit",
      });
    }
  }
  return transactions;
}

/**
 * Generic fallback: look for any line with a date and rupee amount
 */
function parseGeneric(text) {
  const transactions = [];
  const lines = text.split("\n");

  for (const line of lines) {
    // Match lines with date-like pattern and a number
    const dateMatch = line.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
    const amountMatch = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);

    if (dateMatch && amountMatch && amountMatch.length >= 1) {
      const amounts = amountMatch
        .map((a) => parseFloat(a.replace(/,/g, "")))
        .filter((a) => a > 10 && a < 1000000);

      if (amounts.length > 0) {
        // Remove date from description
        const description = line
          .replace(dateMatch[0], "")
          .replace(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "")
          .trim()
          .replace(/\s+/g, " ");

        if (description.length > 2) {
          transactions.push({
            date: normalizeDate(dateMatch[1]),
            description,
            amount: amounts[0],
            type: "debit",
          });
        }
      }
    }
  }

  return transactions;
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr) {
  // Try DD/MM/YY or DD/MM/YYYY
  let match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (match) {
    const [, dd, mm, yy] = match;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm}-${dd}`;
  }

  // Try DD-MM-YYYY
  match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Try DD Mon YYYY
  match = dateStr.match(/(\d{2})\s+(\w{3})\s+(\d{4})/);
  if (match) {
    const months = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    const [, dd, mon, yyyy] = match;
    return `${yyyy}-${months[mon] || "01"}-${dd}`;
  }

  return dateStr;
}

module.exports = { parsePDF };
