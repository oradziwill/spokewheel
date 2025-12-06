import React, { useState, useEffect, useRef, useCallback } from "react";

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
  const [submitted, setSubmitted] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const fetchData = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        await safeJsonParse(response);
        // Mark as submitted to show thank you message
        setSubmitted(true);
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
      approach_style: {
        left: "🔴 CHALLENGE\n\nIn interactions, they consistently create a sense of being challenged—questioning ideas, work quality, and emotional or intellectual positions.",
        right:
          "🔵 CARE\n\nTheir interactions centre fully on the other person—marked by deep listening, empathy, understanding, and support.",
      },
      planning_style: {
        left: "🔴 STRATEGISING\n\nThey focus strongly on how to act—continually building or refining detailed strategies and action plans, without articulating why a new direction is needed.",
        right:
          "🔵 VISIONEERING\n\nThey focus strongly on why to act—creating and articulating compelling visions of an end state, without translating them into next steps or practical actions.",
      },
      influencing_style: {
        left: "🔴 TELLING\n\nThey communicate only in statements, never asking questions.",
        right:
          "🔵 ASKING\n\nThey communicate only by asking questions, never making statements.",
      },
      interaction_style: {
        left: "🔴 1-on-GROUPS\n\nThey create organisational impact and value only when working with groups of three or more people.",
        right:
          "🔵 1-on-1s\n\nThey create organisational impact and value only in one-on-one settings.",
      },
      prioritising: {
        left: "🔴 PRIORITISING\n\nThey structure work clearly: priorities are explicit, always known, and aligned with all stakeholders.",
        right:
          "🔵 CHAOS\n\nThey allow work to flow according to mood or moment. Direct reports self-organise without guidance, and all tasks feel equally important because priorities are undefined.",
      },
      communication_mode: {
        left: "🔴 EXPRESSING\n\nThey use every available moment to speak, often taking space that others may need.",
        right:
          "🔵 LISTENING\n\nThey dedicate all available time to listening and note-taking, sometimes leaving without saying a word—and feeling satisfied.",
      },
      feedback_style: {
        left: "🔴 NEGATIVE FEEDBACK\n\nThey notice and address only negative or problematic behaviours.",
        right:
          "🔵 POSITIVE FEEDBACK\n\nThey notice and address only positive or desirable behaviours.",
      },
      risk_style: {
        left: "🔴 PREVENTION\n\nWhen faced with an opportunity, they repeatedly analyse and document risks, often delaying action until the opportunity is lost.",
        right:
          "🔵 PRO-MOTION\n\nWhen faced with an opportunity, they take immediate action based on intuition or precedent, without waiting for analysis.",
      },
      behavior_style: {
        left: "🔴 PUSHING\n\nWhen sensing disagreement, they shift into a competitive, win-lose mindset, determined to prevail and prove their viewpoint right.",
        right:
          "🔵 ADAPTIVE\n\nWhen sensing disagreement, they yield fully—accepting the other person's viewpoint without asserting their own.",
      },
      management_style: {
        left: "🔴 MICRO-MANAGEMENT\n\nThey immerse themselves deeply in others' work details, in a way that feels like oversight or surveillance.",
        right:
          '🔵 MACRO-MANAGEMENT\n\nThey remain at a very high, distant "helicopter view," leaving others wishing they understood more about the actual work being done.',
      },
      communication_style: {
        left: "🔴 ASYNCHRONOUS\n\nThey communicate primarily in writing and avoid real-time, synchronous conversations.",
        right:
          "🔵 SYNCHRONOUS\n\nThey communicate primarily through real-time voice or video conversations, responding and adapting on the spot.",
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

  // Show thank you message if feedback has been submitted
  if (submitted) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "60px 40px" }}>
          <div
            style={{ fontSize: "48px", marginBottom: "20px", color: "#28a745" }}
          >
            ✓
          </div>
          <h2 style={{ marginBottom: "20px", color: "#333" }}>
            Thank you for your feedback!
          </h2>
          {person && (
            <p style={{ fontSize: "18px", color: "#666", marginTop: "20px" }}>
              Your feedback for <strong>{person.name}</strong> has been
              received.
            </p>
          )}
          <p style={{ fontSize: "16px", color: "#999", marginTop: "30px" }}>
            This link can only be used once and is now inactive.
          </p>
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
