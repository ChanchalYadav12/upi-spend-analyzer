const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const uploadRoute = require("./routes/upload");
const analyzeRoute = require("./routes/analyze");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/upload", uploadRoute);
app.use("/api/analyze", analyzeRoute);

app.get("/", (req, res) => {
  res.json({ message: "UPI Spend Analyzer API is running!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
