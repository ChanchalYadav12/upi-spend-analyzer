import React, { useState } from "react";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";
import "./index.css";

export default function App() {
  const [transactions, setTransactions] = useState(null);

  return (
    <div className="app">
      {!transactions ? (
        <UploadPage onUploadSuccess={setTransactions} />
      ) : (
        <DashboardPage
          transactions={transactions}
          onReset={() => setTransactions(null)}
        />
      )}
    </div>
  );
}
