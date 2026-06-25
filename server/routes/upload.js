const express = require("express");
const multer = require("multer");
const path = require("path");
const { parsePDF } = require("../utils/pdfParser");
const { categorizeTransactions } = require("../utils/categorizer");

const router = express.Router();

// Store in memory (no disk writes)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
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

    // Parse PDF from buffer
    const rawTransactions = await parsePDF(req.file.buffer);

    if (!rawTransactions || rawTransactions.length === 0) {
      return res.status(422).json({
        error:
          "Could not extract transactions from this PDF. Make sure it is a text-based bank statement.",
      });
    }

    // Categorize
    const transactions = categorizeTransactions(rawTransactions);

    res.json({ success: true, transactions });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message || "Failed to process PDF" });
  }
});

module.exports = router;
