const express = require("express");
const adminDb = require("./admin-db");
const { authenticateAdmin } = require("./admin-auth");

const router = express.Router();

// Get all axis names
const getAxisNames = () => {
  return [
    "communication_style",
    "prioritising",
    "interaction_style",
    "influencing_style",
    "planning_style",
    "approach_style",
    "management_style",
    "behavior_style",
    "communication_mode",
    "risk_style",
    "feedback_style",
  ];
};

// Get all feedback results (admin only)
// Returns one row per feedback submission with all axis values as columns
router.get("/feedback-results", authenticateAdmin, (req, res) => {
  const query = `
    SELECT 
      id,
      person_receiving_id,
      person_receiving_name,
      person_giving_name,
      person_giving_email,
      feedback_source,
      submission_date,
      communication_style,
      prioritising,
      interaction_style,
      influencing_style,
      planning_style,
      approach_style,
      management_style,
      behavior_style,
      communication_mode,
      risk_style,
      feedback_style
    FROM admin_feedback_results
    ORDER BY submission_date DESC, person_receiving_name, person_giving_name
  `;

  adminDb.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Helper function to calculate median
const calculateMedian = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

// Helper function to calculate standard deviation
const calculateStdDev = (values, mean) => {
  if (values.length === 0) return null;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
};

// Get feedback summary statistics (admin only)
// Returns average, median, mean, std dev for each source and overall
router.get("/feedback-summary", authenticateAdmin, (req, res) => {
  const axisNames = getAxisNames();
  const query = `
    SELECT 
      feedback_source,
      ${axisNames.join(", ")}
    FROM admin_feedback_results
  `;

  adminDb.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const summary = [];

    // For each axis
    axisNames.forEach((axisName) => {
      // Calculate stats per source
      const sources = ["self", "peer", "superior", "inferior"];
      sources.forEach((source) => {
        const values = rows
          .filter((r) => r.feedback_source === source && r[axisName] != null)
          .map((r) => r[axisName]);

        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          summary.push({
            axis_name: axisName,
            feedback_source: source,
            total_responses: values.length,
            average_value: mean,
            mean_value: mean,
            median_value: calculateMedian(values),
            std_dev: calculateStdDev(values, mean),
          });
        }
      });

      // Calculate stats overall (all sources combined)
      const allValues = rows
        .filter((r) => r[axisName] != null)
        .map((r) => r[axisName]);

      if (allValues.length > 0) {
        const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
        summary.push({
          axis_name: axisName,
          feedback_source: null, // null means "all sources combined"
          total_responses: allValues.length,
          average_value: mean,
          mean_value: mean,
          median_value: calculateMedian(allValues),
          std_dev: calculateStdDev(allValues, mean),
        });
      }
    });

    res.json(summary);
  });
});

// Get evaluator feedback details (admin only)
router.get(
  "/evaluator-feedback/:evaluatorName",
  authenticateAdmin,
  (req, res) => {
    const evaluatorName = req.params.evaluatorName;

    const query = `
      SELECT 
        id,
        person_receiving_id,
        person_receiving_name,
        person_giving_name,
        person_giving_email,
        feedback_source,
        submission_date,
        communication_style,
        prioritising,
        interaction_style,
        influencing_style,
        planning_style,
        approach_style,
        management_style,
        behavior_style,
        communication_mode,
        risk_style,
        feedback_style
      FROM admin_feedback_results
      WHERE person_giving_name = ?
      ORDER BY submission_date DESC
    `;

    adminDb.all(query, [evaluatorName], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  }
);

// Export feedback data (admin only)
router.get("/export", authenticateAdmin, (req, res) => {
  const format = req.query.format || "json";
  const axisNames = getAxisNames();
  const axisColumns = axisNames.join(", ");

  if (format === "csv") {
    // Export as CSV
    const query = `
      SELECT 
        person_receiving_name,
        person_giving_name,
        person_giving_email,
        feedback_source,
        submission_date,
        ${axisColumns}
      FROM admin_feedback_results
      ORDER BY person_receiving_name, person_giving_name, submission_date
    `;

    adminDb.all(query, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Build CSV header
      const csvHeader = `Person Receiving Feedback,Person Giving Feedback,Person Giving Email,Feedback Source,Submission Date,${axisNames.join(
        ","
      )}\n`;
      const csvData = rows
        .map((row) => {
          const values = [
            row.person_receiving_name,
            row.person_giving_name,
            row.person_giving_email || "",
            row.feedback_source,
            row.submission_date,
            ...axisNames.map((axis) => row[axis] || ""),
          ];
          return values.map((v) => `"${v}"`).join(",");
        })
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="feedback_results.csv"'
      );
      res.send(csvHeader + csvData);
    });
  } else {
    // Export as JSON
    const query = `
      SELECT 
        id,
        person_receiving_id,
        person_receiving_name,
        person_giving_name,
        person_giving_email,
        feedback_source,
        submission_date,
        ${axisColumns}
      FROM admin_feedback_results
      ORDER BY submission_date DESC
    `;

    adminDb.all(query, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="feedback_results.json"'
      );
      res.json(rows);
    });
  }
});

module.exports = router;
