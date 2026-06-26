import React, { useState, useRef } from "react";
import axios from "axios";

export default function UploadPage({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") {
      setFile(f);
      setError("");
    } else {
      setError("Please upload a PDF file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("statement", file);

    try {
      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Upload API Response:", res.data);
      console.log("Transactions:", res.data.transactions);

      console.log("FULL RESPONSE:", res.data);
      alert(JSON.stringify(res.data).substring(0, 300));

      console.log("Upload Response:", res.data);
      console.log("Transactions:", res.data.transactions);

      onUploadSuccess(res.data.transactions);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to process PDF. Make sure it's a text-based bank statement."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.badge}>🇮🇳 Made for India</div>
        <h1 style={styles.title}>
          UPI Spend <span style={styles.accent}>Analyzer</span>
        </h1>
        <p style={styles.subtitle}>
          Upload your bank statement PDF and instantly see where your money goes — with AI-powered savings tips.
        </p>

        {/* Upload zone */}
        <div
          style={{
            ...styles.dropzone,
            ...(dragging ? styles.dropzoneDragging : {}),
            ...(file ? styles.dropzoneSuccess : {}),
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div style={styles.dropzoneIcon}>{file ? "✅" : "📄"}</div>
          {file ? (
            <>
              <p style={styles.dropzoneTitle}>{file.name}</p>
              <p style={styles.dropzoneSub}>
                {(file.size / 1024).toFixed(0)} KB · Click to change
              </p>
            </>
          ) : (
            <>
              <p style={styles.dropzoneTitle}>Drop your bank statement here</p>
              <p style={styles.dropzoneSub}>or click to browse · PDF only</p>
            </>
          )}
        </div>

        {error && <p style={styles.error}>⚠️ {error}</p>}

        <button
          className="btn btn-primary"
          style={styles.uploadBtn}
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? (
            <>
              <span style={styles.spinner} /> Analyzing...
            </>
          ) : (
            "Analyze My Spending →"
          )}
        </button>

        {/* Supported banks */}
        <div style={styles.banks}>
          <span style={styles.banksLabel}>Supports</span>
          {["HDFC", "SBI", "ICICI", "Axis"].map((b) => (
            <span key={b} style={styles.bankChip}>{b}</span>
          ))}
          <span style={styles.banksLabel}>& more</span>
        </div>

        {/* Privacy note */}
        <p style={styles.privacy}>
          🔒 Your statement is processed in memory and never stored on our servers.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    background: "radial-gradient(ellipse at 50% 0%, rgba(124,106,247,0.12) 0%, transparent 60%)",
  },
  hero: {
    maxWidth: 520,
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  badge: {
    background: "rgba(124,106,247,0.15)",
    color: "#a89ef9",
    border: "1px solid rgba(124,106,247,0.3)",
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
  },
  title: {
    fontSize: "clamp(2rem, 6vw, 3rem)",
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#f1f1f5",
  },
  accent: { color: "#7c6af7" },
  subtitle: {
    fontSize: 16,
    color: "#8888a0",
    lineHeight: 1.6,
    maxWidth: 420,
  },
  dropzone: {
    width: "100%",
    border: "2px dashed #2e2e3a",
    borderRadius: 16,
    padding: "40px 32px",
    cursor: "pointer",
    transition: "all 0.2s",
    background: "#18181f",
  },
  dropzoneDragging: {
    border: "2px dashed #7c6af7",
    background: "rgba(124,106,247,0.07)",
  },
  dropzoneSuccess: {
    border: "2px dashed #34d399",
    background: "rgba(52,211,153,0.05)",
  },
  dropzoneIcon: { fontSize: 40, marginBottom: 12 },
  dropzoneTitle: { fontSize: 16, fontWeight: 600, color: "#f1f1f5", marginBottom: 4 },
  dropzoneSub: { fontSize: 13, color: "#8888a0" },
  error: { color: "#f87171", fontSize: 14, background: "rgba(248,113,113,0.1)", padding: "10px 16px", borderRadius: 8, width: "100%" },
  uploadBtn: { width: "100%", justifyContent: "center", padding: "14px 24px", fontSize: 16 },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  banks: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  banksLabel: { fontSize: 13, color: "#8888a0" },
  bankChip: {
    padding: "3px 10px",
    background: "#22222c",
    border: "1px solid #2e2e3a",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    color: "#f1f1f5",
  },
  privacy: { fontSize: 12, color: "#8888a0" },
};
