import React, { useState } from "react";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";
import "./index.css";

export default function App() {
  const [transactions, setTransactions] = useState([]);

  return (
    <div className="app">
      {transactions.length === 0 ? (
        <UploadPage
          onUploadSuccess={(txns) => {
            console.log("App received:", txns);
            setTransactions(txns);
          }}
        />
      ) : (
        <DashboardPage
          transactions={transactions}
          onReset={() => setTransactions([])}
        />
      )}
    </div>
  );
}