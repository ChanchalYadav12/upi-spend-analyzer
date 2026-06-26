const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { parsePDF } = require("../utils/pdfParser");
const { categorizeTransactions } = require("../utils/categorizer");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

router.post("/", upload.single("statement"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const rawTransactions = await parsePDF(req.file.buffer);

    if (!rawTransactions || rawTransactions.length === 0) {
      // Expose raw text in dev so you can diagnose format mismatches
      let rawPreview = "";
      try {
        const data = await pdfParse(req.file.buffer);
        rawPreview = data.text.substring(0, 1000);
      } catch (_) {}

      return res.status(422).json({
        error: "Could not extract transactions from this PDF. Make sure it is a text-based bank statement.",
        raw_preview: process.env.NODE_ENV !== "production" ? rawPreview : undefined,
      });
    }

    const transactions = categorizeTransactions(rawTransactions);
      console.log("RAW:", rawTransactions.length);
      console.log("FINAL:", transactions.length);
      console.log(transactions.slice(0, 5));
    res.json({ success: true, transactions });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message || "Failed to process PDF" });
  }
});

module.exports = router;
