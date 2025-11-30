import React, { useState, useEffect } from "react";

interface AdminFeedbackResult {
  id: number;
  person_receiving_id: number;
  person_receiving_name: string;
  person_giving_name: string;
  person_giving_email: string | null;
  feedback_source: string;
  submission_date: string;
  // One column for each axis
  communication_style: number | null;
  prioritising: number | null;
  interaction_style: number | null;
  influencing_style: number | null;
  planning_style: number | null;
  approach_style: number | null;
  management_style: number | null;
  behavior_style: number | null;
  communication_mode: number | null;
  risk_style: number | null;
  feedback_style: number | null;
}

interface AdminSummary {
  axis_name: string;
  feedback_source: string | null; // null means "all sources combined"
  total_responses: number;
  average_value: number;
  median_value: number;
  mean_value: number;
  std_dev: number;
}

const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [feedbackResults, setFeedbackResults] = useState<AdminFeedbackResult[]>(
    []
  );
  const [summary, setSummary] = useState<AdminSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load saved credentials on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("admin_username");
    const savedPassword = localStorage.getItem("admin_password");
    if (savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data when authenticated and credentials are available
  useEffect(() => {
    if (isAuthenticated && username && password) {
      fetchAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, username, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        // Store credentials in localStorage
        localStorage.setItem("admin_username", username);
        localStorage.setItem("admin_password", password);
        setIsAuthenticated(true);
        // fetchAdminData will be called by useEffect
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const safeJsonParse = async (response: Response) => {
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Received non-JSON response:", text.substring(0, 200));
      throw new Error(
        "Server returned an error page. Please check your connection."
      );
    }
    return response.json();
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resultsResponse, summaryResponse] = await Promise.all([
        fetch("/api/admin/feedback-results", {
          headers: {
            Authorization: `Basic ${btoa(`${username}:${password}`)}`,
          },
        }),
        fetch("/api/admin/feedback-summary", {
          headers: {
            Authorization: `Basic ${btoa(`${username}:${password}`)}`,
          },
        }),
      ]);

      if (resultsResponse.ok && summaryResponse.ok) {
        const results = await safeJsonParse(resultsResponse);
        const summaryData = await safeJsonParse(summaryResponse);
        console.log("Fetched results:", results.length, "items");
        console.log("Results data:", results);
        console.log("First result:", results[0]);
        setFeedbackResults(Array.isArray(results) ? results : []);
        setSummary(Array.isArray(summaryData) ? summaryData : []);
      } else {
        console.error(
          "Failed to fetch:",
          resultsResponse.status,
          summaryResponse.status
        );
        const resultsText = await resultsResponse.text();
        const summaryText = await summaryResponse.text();
        console.error("Results response:", resultsText);
        console.error("Summary response:", summaryText);
        try {
          const errorData = await safeJsonParse(resultsResponse);
          setError(errorData.error || "Failed to fetch admin data");
        } catch {
          setError(
            `Failed to fetch admin data. Status: ${resultsResponse.status}`
          );
        }
      }
    } catch (err) {
      setError("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: "json" | "csv") => {
    try {
      const response = await fetch(`/api/admin/export?format=${format}`, {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `feedback_results.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to export data");
      }
    } catch (err) {
      setError("Failed to export data");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card">
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin} className="feedback-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="card">
      {error && (
        <div
          className="error-message"
          style={{ marginBottom: "20px", padding: "15px" }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Admin Panel - Feedback Results</h2>
        <div>
          <button
            onClick={fetchAdminData}
            className="button"
            style={{ marginRight: "10px", backgroundColor: "#28a745" }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => exportData("json")}
            className="button"
            style={{ marginRight: "10px" }}
          >
            Export JSON
          </button>
          <button
            onClick={() => exportData("csv")}
            className="button"
            style={{ marginRight: "10px" }}
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("admin_username");
              localStorage.removeItem("admin_password");
              setIsAuthenticated(false);
              setUsername("");
              setPassword("");
              setFeedbackResults([]);
              setSummary([]);
            }}
            className="button"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div style={{ marginBottom: "30px" }}>
        <h3>Summary Statistics</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Axis</th>
                <th>Feedback Source</th>
                <th>Total Responses</th>
                <th>Average</th>
                <th>Mean</th>
                <th>Median</th>
                <th>Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item, index) => (
                <tr key={index}>
                  <td>{item.axis_name}</td>
                  <td
                    style={{
                      textTransform: "capitalize",
                      fontWeight: item.feedback_source ? "normal" : "bold",
                    }}
                  >
                    {item.feedback_source || "All Sources"}
                  </td>
                  <td>{item.total_responses}</td>
                  <td>{item.average_value?.toFixed(2) || "N/A"}</td>
                  <td>{item.mean_value?.toFixed(2) || "N/A"}</td>
                  <td>{item.median_value?.toFixed(2) || "N/A"}</td>
                  <td>{item.std_dev?.toFixed(2) || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Results */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3>Detailed Feedback Results</h3>
          <p style={{ color: "#666", fontSize: "14px" }}>
            Total: {feedbackResults.length} feedback entries
          </p>
        </div>
        {loading && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            Loading feedback data...
          </div>
        )}
        {!loading && (
          <div className="table-container" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Person Receiving Feedback</th>
                  <th>Person Giving Feedback</th>
                  <th>Feedback Source</th>
                  <th>Date</th>
                  <th>Communication Style</th>
                  <th>Prioritising</th>
                  <th>Interaction Style</th>
                  <th>Influencing Style</th>
                  <th>Planning Style</th>
                  <th>Approach Style</th>
                  <th>Management Style</th>
                  <th>Behavior Style</th>
                  <th>Communication Mode</th>
                  <th>Risk Style</th>
                  <th>Feedback Style</th>
                </tr>
              </thead>
              <tbody>
                {feedbackResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={15}
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      No feedback results yet. Generate a feedback link and
                      share it to collect feedback!
                    </td>
                  </tr>
                ) : (
                  feedbackResults.map((result) => (
                    <tr key={result.id}>
                      <td style={{ fontWeight: "600" }}>
                        {result.person_receiving_name}
                      </td>
                      <td style={{ fontWeight: "500", color: "#007bff" }}>
                        {result.person_giving_name}
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        {result.feedback_source}
                      </td>
                      <td>
                        {new Date(result.submission_date).toLocaleDateString()}
                      </td>
                      <td>{result.communication_style?.toFixed(2) || "-"}</td>
                      <td>{result.prioritising?.toFixed(2) || "-"}</td>
                      <td>{result.interaction_style?.toFixed(2) || "-"}</td>
                      <td>{result.influencing_style?.toFixed(2) || "-"}</td>
                      <td>{result.planning_style?.toFixed(2) || "-"}</td>
                      <td>{result.approach_style?.toFixed(2) || "-"}</td>
                      <td>{result.management_style?.toFixed(2) || "-"}</td>
                      <td>{result.behavior_style?.toFixed(2) || "-"}</td>
                      <td>{result.communication_mode?.toFixed(2) || "-"}</td>
                      <td>{result.risk_style?.toFixed(2) || "-"}</td>
                      <td>{result.feedback_style?.toFixed(2) || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
