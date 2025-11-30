import React from "react";

interface Axis {
  id: number;
  name: string;
  left_label: string;
  right_label: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  feedback: {
    [key: string]: {
      self: number | null;
      peer: number | null;
      superior: number | null;
      inferior: number | null;
    };
  };
}

interface FeedbackTableProps {
  users: User[];
  axes: Axis[];
}

const FeedbackTable: React.FC<FeedbackTableProps> = ({ users, axes }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFeedbackValueClass = (value: number) => {
    if (value > 0.1) return "positive";
    if (value < -0.1) return "negative";
    return "neutral";
  };

  const getFeedbackLabel = (
    axisName: string,
    value: number,
    source: string
  ) => {
    const axis = axes.find((a) => a.name === axisName);
    if (!axis) return `${value} (${source})`;

    if (value > 0.1) return `${axis.right_label} (${value}) - ${source}`;
    if (value < -0.1) return `${axis.left_label} (${value}) - ${source}`;
    return `Neutral (${value}) - ${source}`;
  };

  if (users.length === 0) {
    return (
      <div className="card">
        <h2>Feedback Responses</h2>
        <div style={{ textAlign: "center", padding: "50px", color: "#666" }}>
          <p>No feedback responses yet. Be the first to submit feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Feedback Responses</h2>
      <p style={{ marginBottom: "20px", color: "#666" }}>
        View all submitted feedback responses from users.
      </p>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Submitted</th>
              {axes.map((axis) => (
                <th key={axis.id} style={{ minWidth: "120px" }}>
                  {axis.name}
                  <br />
                  <small style={{ fontWeight: "normal", color: "#666" }}>
                    {axis.left_label} ↔ {axis.right_label}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: "600" }}>{user.name}</td>
                <td>{user.email || "-"}</td>
                <td style={{ fontSize: "14px", color: "#666" }}>
                  {formatDate(user.created_at)}
                </td>
                {axes.map((axis) => {
                  const feedbackData = user.feedback[axis.name];
                  return (
                    <td key={axis.id}>
                      {feedbackData ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            minWidth: "120px",
                          }}
                        >
                          {Object.entries(feedbackData).map(
                            ([source, value]) => {
                              if (value === null) return null;
                              return (
                                <div
                                  key={source}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <span
                                    className={`feedback-value ${getFeedbackValueClass(
                                      value
                                    )}`}
                                    style={{
                                      fontSize: "12px",
                                      padding: "2px 6px",
                                    }}
                                    title={getFeedbackLabel(
                                      axis.name,
                                      value,
                                      source
                                    )}
                                  >
                                    {value.toFixed(1)}
                                  </span>
                                  <small
                                    style={{
                                      fontSize: "10px",
                                      color: "#666",
                                      textTransform: "capitalize",
                                      fontWeight: "500",
                                    }}
                                  >
                                    {source}
                                  </small>
                                </div>
                              );
                            }
                          )}
                          {Object.values(feedbackData).every(
                            (v) => v === null
                          ) && (
                            <span
                              style={{
                                color: "#999",
                                fontStyle: "italic",
                                fontSize: "12px",
                              }}
                            >
                              No feedback
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#999", fontStyle: "italic" }}>
                          -
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "10px",
        }}
      >
        <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Legend:</h3>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="feedback-value positive">+1.0</span>
            <span style={{ fontSize: "14px" }}>Positive (Right side)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="feedback-value negative">-1.0</span>
            <span style={{ fontSize: "14px" }}>Negative (Left side)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="feedback-value neutral">0.0</span>
            <span style={{ fontSize: "14px" }}>Neutral (Center)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackTable;
