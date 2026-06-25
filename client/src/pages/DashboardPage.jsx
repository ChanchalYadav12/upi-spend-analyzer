import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { buildSummary } from "../utils/summary";

const COLORS = ["#7c6af7","#34d399","#fbbf24","#f87171","#60a5fa","#f472b6","#a78bfa","#4ade80","#fb923c","#38bdf8"];

export default function DashboardPage({ transactions, onReset }) {
  const [tips, setTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [filter, setFilter] = useState("all");

  const summary = buildSummary(transactions);

  const categoryData = Object.entries(summary.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const monthData = Object.entries(summary.byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({
      month: new Date(month + "-01").toLocaleString("default", { month: "short", year: "2-digit" }),
      amount: Math.round(value),
    }));

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    setTipsLoading(true);
    try {
      const res = await axios.post("/api/analyze/tips", { summary });
      setTips(res.data.tips || []);
    } catch {
      setTips(["Set a monthly budget for your top spending category.",
        "Review subscriptions monthly and cancel unused ones.",
        "Try cooking at home 3x per week to cut food costs.",
        "Use cashback offers on your UPI app for regular purchases.",
        "Automate savings: set aside 20% on the first day of the month."]);
    } finally {
      setTipsLoading(false);
    }
  };

  const filteredTxns = transactions.filter((t) => {
    if (filter === "debit") return t.type === "debit";
    if (filter === "credit") return t.type === "credit";
    return true;
  });

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Spend Analysis</h1>
          <p style={styles.headerSub}>{summary.transactionCount} transactions analyzed</p>
        </div>
        <button className="btn btn-ghost" onClick={onReset}>← Upload New</button>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: "Total Spent", value: `₹${summary.total.toLocaleString("en-IN")}`, color: "#f87171" },
          { label: "Transactions", value: summary.transactionCount, color: "#7c6af7" },
          { label: "Categories", value: Object.keys(summary.byCategory).length, color: "#34d399" },
          { label: "Top Category", value: categoryData[0]?.name?.split(" ").slice(1).join(" ") || "—", color: "#fbbf24" },
        ].map((s) => (
          <div key={s.label} className="card" style={styles.statCard}>
            <p style={styles.statLabel}>{s.label}</p>
            <p style={{ ...styles.statValue, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {["overview", "transactions", "tips"].map((tab) => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" ? "📊 Overview" : tab === "transactions" ? "📋 Transactions" : "💡 AI Tips"}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div style={styles.grid}>
          <div className="card">
            <h3 style={styles.cardTitle}>Spending by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ background: "#22222c", border: "1px solid #2e2e3a", borderRadius: 8, color: "#f1f1f5" }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              {categoryData.map((d, i) => (
                <div key={d.name} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: COLORS[i % COLORS.length] }} />
                  <span style={styles.legendLabel}>{d.name}</span>
                  <span style={styles.legendValue}>₹{d.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={styles.cardTitle}>Monthly Trend</h3>
            {monthData.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e3a" />
                  <XAxis dataKey="month" tick={{ fill: "#8888a0", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#8888a0", fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Spent"]} contentStyle={{ background: "#22222c", border: "1px solid #2e2e3a", borderRadius: 8, color: "#f1f1f5" }} />
                  <Bar dataKey="amount" fill="#7c6af7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.empty}>Only one month of data found.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Transactions */}
      {activeTab === "transactions" && (
        <div className="card">
          <div style={styles.txnHeader}>
            <h3 style={styles.cardTitle}>All Transactions</h3>
            <div style={styles.filterRow}>
              {["all", "debit", "credit"].map((f) => (
                <button
                  key={f}
                  style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.txnList}>
            {filteredTxns.slice(0, 100).map((txn, i) => (
              <div key={i} style={styles.txnRow}>
                <div style={styles.txnLeft}>
                  <span style={styles.txnCat}>{txn.category?.split(" ")[0] || "📦"}</span>
                  <div>
                    <p style={styles.txnDesc}>{txn.description}</p>
                    <p style={styles.txnMeta}>{txn.category} · {txn.date}</p>
                  </div>
                </div>
                <span style={{ ...styles.txnAmount, color: txn.type === "debit" ? "#f87171" : "#34d399" }}>
                  {txn.type === "debit" ? "-" : "+"}₹{txn.amount.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
            {filteredTxns.length > 100 && (
              <p style={{ textAlign: "center", color: "#8888a0", padding: 12, fontSize: 13 }}>
                Showing 100 of {filteredTxns.length} transactions
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: AI Tips */}
      {activeTab === "tips" && (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={styles.cardTitle}>💡 AI Savings Tips</h3>
          <p style={{ color: "#8888a0", fontSize: 13, marginBottom: 20 }}>
            Personalized based on your spending patterns
          </p>
          {tipsLoading ? (
            <div style={styles.empty}>Generating tips...</div>
          ) : (
            <div style={styles.tipsList}>
              {tips.map((tip, i) => (
                <div key={i} style={styles.tip}>
                  <span style={styles.tipNum}>{i + 1}</span>
                  <p style={styles.tipText}>{tip}</p>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={fetchTips}>
            🔄 Regenerate Tips
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  headerTitle: { fontSize: 28, fontWeight: 700, color: "#f1f1f5" },
  headerSub: { fontSize: 14, color: "#8888a0", marginTop: 4 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 },
  statCard: { padding: "20px 24px" },
  statLabel: { fontSize: 13, color: "#8888a0", marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: 700 },
  tabs: { display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #2e2e3a", paddingBottom: 0 },
  tab: { padding: "10px 18px", background: "transparent", border: "none", color: "#8888a0", fontWeight: 500, fontSize: 14, cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1, transition: "all 0.2s", borderRadius: "8px 8px 0 0" },
  tabActive: { color: "#7c6af7", borderBottomColor: "#7c6af7", background: "rgba(124,106,247,0.07)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#f1f1f5" },
  legend: { marginTop: 16, display: "flex", flexDirection: "column", gap: 8 },
  legendItem: { display: "flex", alignItems: "center", gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  legendLabel: { fontSize: 13, color: "#8888a0", flex: 1 },
  legendValue: { fontSize: 13, fontWeight: 600, color: "#f1f1f5" },
  empty: { textAlign: "center", color: "#8888a0", padding: "40px 0" },
  txnHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  filterRow: { display: "flex", gap: 6 },
  filterBtn: { padding: "5px 14px", background: "#22222c", border: "1px solid #2e2e3a", borderRadius: 20, fontSize: 12, color: "#8888a0", cursor: "pointer" },
  filterBtnActive: { background: "rgba(124,106,247,0.15)", borderColor: "#7c6af7", color: "#a89ef9" },
  txnList: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 520, overflowY: "auto" },
  txnRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 8px", borderRadius: 8, transition: "background 0.15s" },
  txnLeft: { display: "flex", alignItems: "center", gap: 12 },
  txnCat: { fontSize: 22, width: 36, textAlign: "center" },
  txnDesc: { fontSize: 14, fontWeight: 500, color: "#f1f1f5", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  txnMeta: { fontSize: 12, color: "#8888a0", marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: 600, flexShrink: 0 },
  tipsList: { display: "flex", flexDirection: "column", gap: 12 },
  tip: { display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", background: "#22222c", borderRadius: 10, border: "1px solid #2e2e3a" },
  tipNum: { width: 26, height: 26, background: "rgba(124,106,247,0.2)", color: "#a89ef9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  tipText: { fontSize: 14, color: "#c8c8dc", lineHeight: 1.6 },
};
