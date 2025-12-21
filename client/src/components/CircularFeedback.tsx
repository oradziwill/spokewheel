import React, { useState, useRef } from "react";

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

interface CircularFeedbackProps {
  axes: Axis[];
  sources: FeedbackSource[];
  onSubmit: (
    userName: string,
    userEmail: string,
    feedback: { [key: string]: number },
    source: string
  ) => void;
}

const CircularFeedback: React.FC<CircularFeedbackProps> = ({
  axes,
  sources,
  onSubmit,
}) => {
  // Place axes in specific ID order: 8, 10, 1, 3, 5, 7, 9, 11, 2, 4, 6
  const desiredIdOrder = [8, 10, 1, 3, 5, 7, 9, 11, 2, 4, 6];

  // Create map by ID for easy lookup
  const axesById = new Map<number, (typeof axes)[0]>();
  axes.forEach((axis) => {
    const id = parseInt(String(axis.id));
    if (!axesById.has(id)) {
      axesById.set(id, axis);
    }
  });

  // Build array in desired ID order
  const sortedAxes: (typeof axes)[0][] = [];
  for (const id of desiredIdOrder) {
    const axis = axesById.get(id);
    if (axis) {
      sortedAxes.push(axis);
    }
  }

  const [userName, setUserName] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [feedback, setFeedback] = useState<{
    [key: string]: { value: number; clickX: number; clickY: number };
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!selectedSource) {
      alert("Please select a feedback source");
      return;
    }

    if (Object.keys(feedback).length === 0) {
      alert("Please provide feedback on at least one axis");
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert feedback to the expected format
      const feedbackValues: { [key: string]: number } = {};
      Object.entries(feedback).forEach(([axisName, data]) => {
        feedbackValues[axisName] = data.value;
      });

      console.log("Submitting feedback:", {
        userName,
        feedbackValues,
        source: selectedSource,
      });
      await onSubmit(userName, "", feedbackValues, selectedSource);
      // Reset form after successful submission
      setUserName("");
      setSelectedSource("");
      setFeedback({});
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMarkerPosition = (axisName: string) => {
    const feedbackData = feedback[axisName];
    if (!feedbackData) return null;

    // Find the axis index to get its angle
    const axisIndex = sortedAxes.findIndex((axis) => axis.name === axisName);
    if (axisIndex === -1) return null;

    // Calculate the axis angle (same as used for rendering axes)
    const angle = (axisIndex * 2 * Math.PI) / sortedAxes.length - Math.PI / 3;

    // Fixed center point (matches axis rendering)
    const centerX = 325; // Center of 650px circle
    const centerY = 325;

    // Calculate distance from center based on the value
    // Value ranges from -1 (left edge) to 1 (right edge)
    // maxDistance accounts for padding (same as in handleAxisClick: rect.width / 2 - 80)
    // For 650px container: (650 / 2) - 80 = 325 - 80 = 245
    const maxDistance = 245;

    // Map value to distance: -1 -> maxDistance (left), 0 -> 0 (center), 1 -> maxDistance (right)
    // Use absolute value for distance, and sign for direction
    const distanceFromCenter = Math.abs(feedbackData.value) * maxDistance;
    const direction = feedbackData.value >= 0 ? 1 : -1;

    // Project position onto the axis line
    // For positive values: go in the direction of the angle (right side)
    // For negative values: go opposite to the angle (left side)
    const markerX = centerX + Math.cos(angle) * distanceFromCenter * direction;
    const markerY = centerY + Math.sin(angle) * distanceFromCenter * direction;

    return { x: markerX, y: markerY };
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

  return (
    <div className="card">
      <h2>Interactive Feedback</h2>
      <p style={{ textAlign: "center", marginBottom: "30px", color: "#666" }}>
        Click on each axis to provide your feedback. The closer to the center,
        the more neutral your response.
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label htmlFor="userName">Your Name *</label>
          <input
            type="text"
            id="userName"
            className="input"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
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
          <div className="center-point"></div>

          {sortedAxes.map((axis, index) => {
            // Start at 1 o'clock position (30 degrees clockwise from top)
            // -Math.PI/2 is 12 o'clock
            // For 1pm (-60°), we use: -Math.PI/2 + Math.PI/6 = -Math.PI/3
            const angle =
              (index * 2 * Math.PI) / sortedAxes.length - Math.PI / 3;
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
            const rightLabelOnLeft = rightLabelX < centerX;

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
                  {axis.left_label
                    .split("\n")
                    .map((line: string, idx: number) => (
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
                  {axis.right_label
                    .split("\n")
                    .map((line: string, idx: number) => (
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

        {/* Feedback summary */}
        {Object.keys(feedback).length > 0 && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#f8f9fa",
              borderRadius: "10px",
            }}
          >
            <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>
              Your Feedback:
            </h3>
            {Object.entries(feedback).map(([axisName, data]) => {
              const axis = sortedAxes.find((a) => a.name === axisName);
              const label =
                data.value > 0 ? axis?.right_label : axis?.left_label;
              return (
                <div
                  key={axisName}
                  style={{ marginBottom: "5px", fontSize: "14px" }}
                >
                  <strong>{axisName}:</strong> {data.value} ({label})
                </div>
              );
            })}
          </div>
        )}

        <button
          type="submit"
          className="button"
          disabled={isSubmitting || Object.keys(feedback).length === 0}
          style={{
            display: "block",
            margin: "100px auto 0",
            maxWidth: "300px",
            opacity:
              isSubmitting || Object.keys(feedback).length === 0 ? 0.6 : 1,
            cursor:
              isSubmitting || Object.keys(feedback).length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
};

export default CircularFeedback;
