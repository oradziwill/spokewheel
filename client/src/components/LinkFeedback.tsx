import React, { useState, useEffect, useRef } from "react";

interface Axis {
  id: number;
  name: string;
  left_label: string;
  right_label: string;
}

interface FeedbackSource {
  id: number;
  name: string;
  description: string;
}

interface Person {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
}

interface LinkFeedbackProps {
  token: string;
}

const LinkFeedback: React.FC<LinkFeedbackProps> = ({ token }) => {
  const [axes, setAxes] = useState<Axis[]>([]);
  const [sources, setSources] = useState<FeedbackSource[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    [axisName: string]: { value: number; clickX: number; clickY: number };
  }>({});
  const [selectedSource, setSelectedSource] = useState("");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    try {
      // Fetch person info
      const personResponse = await fetch(`/api/feedback/${token}`);
      if (!personResponse.ok) {
        try {
          const errorData = await safeJsonParse(personResponse);
          setError(errorData.error || "Invalid link");
        } catch {
          setError("Invalid or expired link");
        }
        setLoading(false);
        return;
      }
      const personData = await safeJsonParse(personResponse);
      setPerson(personData.person);

      // Fetch axes and sources
      const [axesResponse, sourcesResponse] = await Promise.all([
        fetch("/api/axes"),
        fetch("/api/sources"),
      ]);

      if (axesResponse.ok && sourcesResponse.ok) {
        const axesData = await safeJsonParse(axesResponse);
        const sourcesData = await safeJsonParse(sourcesResponse);
        setAxes(axesData);
        setSources(sourcesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAxisClick = (
    axisName: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clickX = event.clientX;
    const clickY = event.clientY;

    // Calculate distance from center
    const deltaX = clickX - centerX;
    const deltaY = clickY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Determine if click is on left (red) or right (blue) side of circle
    // Left side of circle = negative values (-1 to 0)
    // Right side of circle = positive values (0 to 1)
    const isRightSide = deltaX > 0; // Positive X means right side of circle

    // Calculate value based on distance from center (normalized to [0, 1])
    const maxDistance = rect.width / 2 - 80; // Account for padding and labels
    const normalizedDistance = Math.min(distance / maxDistance, 1);

    // Left side (red): -1 to 0, Right side (blue): 0 to 1
    const value = isRightSide ? normalizedDistance : -normalizedDistance;

    // Store the exact click position for the marker
    setFeedback((prev) => ({
      ...prev,
      [axisName]: {
        value: Math.round(value * 100) / 100,
        clickX: clickX - rect.left,
        clickY: clickY - rect.top,
      },
    }));
  };

  const getMarkerPosition = (axisName: string) => {
    const data = feedback[axisName];
    if (!data) return null;

    return {
      x: data.clickX,
      y: data.clickY,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource || !evaluatorName) {
      alert("Please select a feedback source and enter your name");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evaluatorName,
          evaluatorEmail: "",
          feedback: Object.fromEntries(
            Object.entries(feedback).map(([axis, data]) => [axis, data.value])
          ),
          source: selectedSource,
        }),
      });

      if (response.ok) {
        const result = await safeJsonParse(response);
        alert(`Feedback submitted successfully for ${result.person_name}!`);
        // Reset form
        setFeedback({});
        setEvaluatorName("");
        setSelectedSource("");
      } else {
        try {
          const errorData = await safeJsonParse(response);
          alert(`Error submitting feedback: ${errorData.error}`);
        } catch {
          alert("Error submitting feedback. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Error submitting feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getLabelDescription = (axisName: string, side: "left" | "right") => {
    const descriptions: { [key: string]: { left: string; right: string } } = {
      personality: {
        left: "🔴 INTROVERT\n\n• Prefers quiet, low-stimulation environments\n• Gains energy from alone time and reflection\n• Thinks before speaking, processes internally\n• Values deep, meaningful conversations\n• Works best with minimal interruptions",
        right:
          "🔵 EXTROVERT\n\n• Enjoys social interactions and group activities\n• Gains energy from being around people\n• Thinks out loud, processes externally\n• Values networking and social connections\n• Works best in collaborative environments",
      },
      communication: {
        left: "🔴 DIRECT\n\n• Straightforward, no-nonsense communication\n• Gets to the point quickly and efficiently\n• Values clarity and brevity over politeness\n• Prefers facts over emotions in discussions\n• May seem blunt but means well",
        right:
          "🔵 DIPLOMATIC\n\n• Tactful and considerate communication\n• Carefully considers others' feelings\n• Values harmony and positive relationships\n• Uses gentle language and soft approaches\n• Skilled at navigating sensitive topics",
      },
      decision_making: {
        left: "🔴 ANALYTICAL\n\n• Data-driven, evidence-based decisions\n• Uses logical reasoning and systematic analysis\n• Prefers thorough research before deciding\n• Values objective facts over subjective feelings\n• Methodical and detail-oriented approach",
        right:
          "🔵 INTUITIVE\n\n• Gut-feeling and instinct-based decisions\n• Creative problem-solving and flexible thinking\n• Trusts inner voice and first impressions\n• Values creativity and innovation\n• Quick to adapt and pivot when needed",
      },
      work_style: {
        left: "🔴 INDEPENDENT\n\n• Prefers working alone and self-directed tasks\n• Takes full ownership and responsibility\n• Values autonomy and personal control\n• Works well with minimal supervision\n• Focuses deeply on individual projects",
        right:
          "🔵 COLLABORATIVE\n\n• Enjoys team work and group projects\n• Values input and perspectives from others\n• Builds on collective ideas and synergy\n• Thrives in team environments\n• Believes in the power of diverse thinking",
      },
      feedback_style: {
        left: "🔴 CONSTRUCTIVE\n\n• Focuses on improvement and growth\n• Points out specific areas for development\n• Direct, honest feedback for better results\n• Values actionable suggestions\n• Helps others reach their potential",
        right:
          "🔵 SUPPORTIVE\n\n• Encourages and motivates others\n• Focuses on strengths and positive aspects\n• Gentle, uplifting feedback approach\n• Builds confidence and self-esteem",
      },
    };

    return descriptions[axisName]?.[side] || `${side} side of ${axisName}`;
  };

  if (loading) {
    return (
      <div className="card">
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
      <div className="card">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div
            style={{ color: "#dc3545", fontSize: "18px", marginBottom: "20px" }}
          >
            {error}
          </div>
          <p>Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "18px", marginBottom: "20px" }}>
            Loading person information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Feedback for {person.name}</h2>
      {person.department && (
        <p>
          <strong>Department:</strong> {person.department}
        </p>
      )}
      {person.position && (
        <p>
          <strong>Position:</strong> {person.position}
        </p>
      )}

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label htmlFor="evaluatorName">Your Name *</label>
          <input
            type="text"
            id="evaluatorName"
            className="input"
            value={evaluatorName}
            onChange={(e) => setEvaluatorName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="feedbackSource">Feedback Source *</label>
          <select
            id="feedbackSource"
            className="input"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            required
          >
            <option value="">Select feedback source</option>
            {sources.map((source) => (
              <option key={source.id} value={source.name}>
                {source.name.charAt(0).toUpperCase() + source.name.slice(1)} -{" "}
                {source.description}
              </option>
            ))}
          </select>
        </div>

        <div
          className="circular-container"
          ref={containerRef}
          style={{ marginTop: "80px" }}
        >
          {axes.map((axis, index) => {
            const angle = (index * 2 * Math.PI) / axes.length - Math.PI / 2;
            const markerPosition = getMarkerPosition(axis.name);

            // Calculate label positions - use perpendicular offset from axis
            const centerX = 325; // Center of 650px circle
            const centerY = 325;
            const labelRadius = 380; // Distance from center for labels (outside circle)
            const perpendicularAngle = Math.PI / 2; // 90 degrees perpendicular

            // Calculate positions for both labels
            const leftLabelX =
              Math.cos(angle - perpendicularAngle) * labelRadius + centerX;
            const leftLabelY =
              Math.sin(angle - perpendicularAngle) * labelRadius + centerY;

            const rightLabelX =
              Math.cos(angle + perpendicularAngle) * labelRadius + centerX;
            const rightLabelY =
              Math.sin(angle + perpendicularAngle) * labelRadius + centerY;

            // Force red labels to left side, blue to right side
            // If left label is on right side, swap positions
            const leftLabelOnLeft = leftLabelX < centerX;

            // Determine final positions: red on left, blue on right
            let redLabelX, redLabelY, blueLabelX, blueLabelY;
            if (leftLabelOnLeft) {
              // Left label is already on left - use as red
              redLabelX = leftLabelX;
              redLabelY = leftLabelY;
              blueLabelX = rightLabelX;
              blueLabelY = rightLabelY;
            } else {
              // Left label is on right - swap them
              redLabelX = rightLabelX;
              redLabelY = rightLabelY;
              blueLabelX = leftLabelX;
              blueLabelY = leftLabelY;
            }

            return (
              <div key={axis.id}>
                {/* Axis line */}
                <div
                  className="axis"
                  style={{
                    transform: `translateX(-50%) rotate(${angle}rad)`,
                  }}
                  onClick={(e) => handleAxisClick(axis.name, e)}
                />

                {/* Red label (always on left side) */}
                <div
                  className="axis-label left"
                  style={{
                    left: redLabelX,
                    top: redLabelY,
                    transform: "translate(-50%, -50%)",
                    color: "#dc3545", // Red color
                    textAlign: "center",
                    lineHeight: "1.2",
                  }}
                  onMouseEnter={() => setHoveredLabel(`${axis.name}-left`)}
                  onMouseLeave={() => setHoveredLabel(null)}
                >
                  {axis.left_label.split("\n").map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontWeight: idx === 0 ? "bold" : "normal",
                        fontSize: idx === 0 ? "13px" : "11px",
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>

                {/* Blue label (always on right side) */}
                <div
                  className="axis-label right"
                  style={{
                    left: blueLabelX,
                    top: blueLabelY,
                    transform: "translate(-50%, -50%)",
                    color: "#007bff", // Blue color
                    textAlign: "center",
                    lineHeight: "1.2",
                  }}
                  onMouseEnter={() => setHoveredLabel(`${axis.name}-right`)}
                  onMouseLeave={() => setHoveredLabel(null)}
                >
                  {axis.right_label.split("\n").map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontWeight: idx === 0 ? "bold" : "normal",
                        fontSize: idx === 0 ? "13px" : "11px",
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Feedback markers - rendered separately to avoid duplication */}
          {Object.entries(feedback).map(([axisName, data]) => {
            const markerPosition = getMarkerPosition(axisName);
            if (!markerPosition) return null;

            return (
              <div
                key={`marker-${axisName}`}
                className="axis-marker"
                style={{
                  left: markerPosition.x,
                  top: markerPosition.y,
                }}
                title={`${axisName}: ${data.value}`}
              />
            );
          })}

          {/* Tooltip for label descriptions */}
          {hoveredLabel && (
            <div className="label-tooltip">
              {getLabelDescription(
                hoveredLabel.split("-")[0],
                hoveredLabel.split("-")[1] as "left" | "right"
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="button"
          disabled={submitting || Object.keys(feedback).length === 0}
          style={{
            display: "block",
            margin: "100px auto 0",
            maxWidth: "300px",
          }}
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
};

export default LinkFeedback;
