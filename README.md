# 🧾 UPI Spend Analyzer

> Upload your bank statement PDF and instantly visualize where your money goes — with AI-powered savings tips.

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![Node](https://img.shields.io/badge/Node.js-Express-green?logo=node.js) ![AI](https://img.shields.io/badge/AI-Gemini-orange?logo=google)

---

## ✨ Features

- 📄 **PDF Upload** — Drag & drop your bank statement (HDFC, SBI, ICICI, Axis)
- 🗂️ **Auto Categorization** — Food, Travel, Shopping, Subscriptions, Fuel, and 6 more
- 📊 **Visual Dashboard** — Pie chart by category, bar chart by month
- 💡 **AI Savings Tips** — Personalized advice via Google Gemini API
- 🔒 **Privacy First** — Statements are processed in memory, never stored

---

## 🖥️ Demo

| Upload | Dashboard | AI Tips |
|--------|-----------|---------|
| Drag & drop PDF | Charts + category breakdown | 5 personalized tips |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Recharts, Axios |
| Backend | Node.js, Express |
| PDF Parsing | pdf-parse |
| AI | Google Gemini 1.5 Flash API |
| Styling | Custom CSS with CSS variables |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/upi-spend-analyzer.git
cd upi-spend-analyzer
```

### 2. Set up the backend
```bash
cd server
npm install
cp .env.example .env
# Add your Gemini API key to .env
npm run dev
```

### 3. Set up the frontend
```bash
cd client
npm install
npm start
```

The app will open at `http://localhost:3000`.

---

## 📁 Project Structure

```
upi-spend-analyzer/
├── client/                   # React frontend
│   └── src/
│       ├── pages/
│       │   ├── UploadPage.jsx      # File upload UI
│       │   └── DashboardPage.jsx   # Charts & analysis
│       └── utils/
│           └── summary.js          # Client-side data aggregation
└── server/                   # Node.js backend
    ├── routes/
    │   ├── upload.js               # PDF upload & parsing
    │   └── analyze.js              # Gemini AI tips
    └── utils/
        ├── pdfParser.js            # Multi-bank PDF parser
        └── categorizer.js          # Keyword-based categorizer
```

---

## 🏦 Supported Bank Formats

| Bank | Statement Format |
|------|-----------------|
| HDFC | DD/MM/YY + Dr/Cr |
| SBI | DD Mon YYYY |
| ICICI | DD-MM-YYYY + CR/DR |
| Axis | DD-MM-YYYY columns |
| Generic | Any date + amount format |

---

## 🔧 Environment Variables

```env
PORT=5000
GEMINI_API_KEY=your_key_here
```

> **Note:** AI tips work without a key — the app falls back to smart default tips.

---

## 🗺️ Roadmap

- [ ] Export analysis as PDF report
- [ ] Multi-month comparison
- [ ] Budget goal setting
- [ ] Support for more banks (Kotak, Yes Bank, Federal)
- [ ] Chrome extension for auto-import

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first.

---

## 📄 License

MIT
