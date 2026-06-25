/**
 * Categorizes transactions based on description keywords.
 * Returns transactions with an added `category` field.
 */

const CATEGORY_KEYWORDS = {
  "🍔 Food & Dining": [
    "swiggy", "zomato", "dominos", "domino", "mcdonald", "mcdonalds",
    "kfc", "pizza", "burger", "restaurant", "cafe", "dhaba", "hotel",
    "food", "biryani", "barbeque", "bbq", "eating", "dine", "canteen",
    "mess", "thali", "udupi", "subway", "dunkin", "starbucks", "chai",
    "bakery", "sweet", "mithai", "haldiram", "blinkit grocery", "instamart"
  ],
  "🚗 Travel & Transport": [
    "uber", "ola", "rapido", "namma yatri", "yatri", "auto", "taxi",
    "irctc", "railway", "railways", "train", "redbus", "bus", "metro",
    "dmrc", "bmtc", "ksrtc", "msrtc", "flight", "indigo", "airindia",
    "air india", "spicejet", "makemytrip", "goibibo", "cleartrip",
    "ixigo", "porter", "dunzo delivery", "travel", "toll", "parking"
  ],
  "🛒 Shopping": [
    "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa",
    "snapdeal", "tata cliq", "reliance", "d mart", "dmart", "big bazaar",
    "jiomart", "zepto", "blinkit", "market", "store", "shop", "mall",
    "lifestyle", "westside", "pantaloons", "max fashion", "h&m", "zara",
    "shopping", "purchase", "buy"
  ],
  "📺 Subscriptions": [
    "netflix", "prime video", "amazon prime", "hotstar", "disney",
    "spotify", "gaana", "wynk", "jiosaavn", "saavn", "youtube premium",
    "zee5", "sonyliv", "voot", "mxplayer", "subscription", "renewal",
    "annual plan", "monthly plan", "membership"
  ],
  "⛽ Fuel": [
    "petrol", "diesel", "fuel", "hp pump", "hpcl", "bpcl", "iocl",
    "indian oil", "bharat petroleum", "hindustan petroleum",
    "shell", "reliance petrol", "fuel station", "cng", "lpg"
  ],
  "🏥 Health & Medical": [
    "pharmeasy", "1mg", "netmeds", "apollo pharmacy", "medplus",
    "hospital", "clinic", "doctor", "medical", "pharmacy", "chemist",
    "medicine", "health", "wellness", "gym", "cult fit", "cultfit",
    "insurance", "lic", "max bupa", "star health"
  ],
  "🎓 Education": [
    "udemy", "coursera", "unacademy", "byjus", "byju", "vedantu",
    "upgrad", "simplilearn", "skillshare", "books", "notion",
    "education", "tuition", "coaching", "college", "university",
    "school fees", "course", "exam"
  ],
  "💡 Utilities & Bills": [
    "electricity", "water bill", "gas bill", "broadband", "wifi",
    "internet", "airtel", "jio", "vi", "vodafone", "idea", "bsnl",
    "recharge", "mobile bill", "dth", "tatasky", "dish tv",
    "municipal", "maintenance", "society", "rent", "paytm postpaid"
  ],
  "🏦 Finance & Transfers": [
    "emi", "loan", "credit card", "cc payment", "insurance premium",
    "mutual fund", "sip", "zerodha", "groww", "upstox", "nps",
    "ppf", "fd", "fixed deposit", "transfer to", "sent to", "neft", "rtgs"
  ],
  "🎮 Entertainment": [
    "bookmyshow", "pvr", "inox", "cinepolis", "movie", "cinema",
    "gaming", "steam", "playstation", "xbox", "paytm games",
    "cricket", "sports", "event", "concert", "amusement"
  ],
};

const DEFAULT_CATEGORY = "📦 Others";

function categorizeTransactions(transactions) {
  return transactions.map((txn) => {
    const desc = (txn.description || "").toLowerCase();
    let matched = DEFAULT_CATEGORY;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => desc.includes(kw.toLowerCase()))) {
        matched = category;
        break;
      }
    }

    return { ...txn, category: matched };
  });
}

/**
 * Build a summary object from categorized transactions
 */
function buildSummary(transactions) {
  const debits = transactions.filter((t) => t.type === "debit");

  const byCategory = {};
  for (const txn of debits) {
    if (!byCategory[txn.category]) byCategory[txn.category] = 0;
    byCategory[txn.category] += txn.amount;
  }

  // Round all values
  for (const key in byCategory) {
    byCategory[key] = Math.round(byCategory[key]);
  }

  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  // Monthly breakdown
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

module.exports = { categorizeTransactions, buildSummary };
