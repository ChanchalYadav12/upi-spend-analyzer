const express = require("express");

const router = express.Router();

router.post("/tips", async (req, res) => {
  const { summary } = req.body;

  if (!summary) {
    return res.status(400).json({ error: "No summary provided" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return mock tips if no API key configured
    return res.json({
      tips: getMockTips(summary),
    });
  }

  try {
    const prompt = buildPrompt(summary);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse bullet points from Gemini response
    const tips = text
      .split("\n")
      .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("•"))
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);

    res.json({ tips: tips.length > 0 ? tips : getMockTips(summary) });
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.json({ tips: getMockTips(summary) });
  }
});

function buildPrompt(summary) {
  const lines = Object.entries(summary.byCategory)
    .map(([cat, amt]) => `  - ${cat}: ₹${amt}`)
    .join("\n");

  return `You are a friendly personal finance advisor for an Indian user.
Here is their UPI spending summary for this month:
Total Spent: ₹${summary.total}
By Category:
${lines}

Give exactly 5 short, specific, actionable saving tips based on this data.
Format each tip as a bullet point starting with "- ".
Keep each tip under 2 sentences. Be specific with rupee amounts where helpful.
Focus on the categories where they spend the most.`;
}

function getMockTips(summary) {
  const topCategory = Object.entries(summary.byCategory || {}).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return [
    topCategory
      ? `Your highest spend is on ${topCategory[0]} (₹${topCategory[1]}). Try setting a monthly budget cap for it.`
      : "Track your top spending category and set a monthly limit.",
    "Switch to weekly grocery shopping instead of daily — it reduces impulse buys by ~20%.",
    "Cancel unused subscriptions. Check your Subscriptions category for recurring charges you forgot about.",
    "Use cashback UPI offers from your bank app — you can save 1–5% on every transaction.",
    "Set aside 20% of your monthly income into savings on the first day of the month before spending.",
  ];
}

module.exports = router;
