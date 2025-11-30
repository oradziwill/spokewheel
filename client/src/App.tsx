import React, { useState } from "react";
import "./App.css";
import AdminPanel from "./components/AdminPanel";
import PeopleManagement from "./components/PeopleManagement";

function App() {
  const [activeTab, setActiveTab] = useState<"admin" | "people">("people");

  return (
    <div className="container">
      <h1>SpokeWheel</h1>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "people" ? "active" : ""}`}
          onClick={() => setActiveTab("people")}
        >
          People Management
        </button>
        <button
          className={`tab ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => setActiveTab("admin")}
        >
          Admin Panel
        </button>
      </div>

      {activeTab === "people" && <PeopleManagement />}

      {activeTab === "admin" && <AdminPanel />}
    </div>
  );
}

export default App;
