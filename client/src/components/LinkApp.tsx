import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "../App.css";
import LinkFeedback from "./LinkFeedback";

interface Person {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
}

function LinkApp() {
  const { token } = useParams<{ token: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      fetchPersonInfo(token);
    } else {
      setError("Invalid feedback link");
      setLoading(false);
    }
  }, [token]);

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

  const fetchPersonInfo = async (token: string) => {
    try {
      const response = await fetch(`/api/feedback/${token}`);
      if (!response.ok) {
        try {
          const errorData = await safeJsonParse(response);
          setError(errorData.error || "Invalid link");
        } catch {
          setError("Invalid or expired link");
        }
        setLoading(false);
        return;
      }

      const data = await safeJsonParse(response);
      setPerson(data.person);
    } catch (error) {
      console.error("Error fetching person info:", error);
      setError("Failed to load person information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "18px", marginBottom: "20px" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                color: "#dc3545",
                fontSize: "18px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
            <p>Please check the link and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>SpokeWheel</h1>
      <LinkFeedback token={token || ""} />
    </div>
  );
}

export default LinkApp;
