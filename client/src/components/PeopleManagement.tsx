import React, { useState, useEffect } from "react";
import UserAuth from "./UserAuth";

interface Person {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  created_at: string;
  active_links: number;
  feedback_count: number;
}

interface FeedbackLink {
  id: number;
  person_id: number;
  link_token: string;
  url: string; // Full URL for the feedback link
  is_active: boolean;
  created_at: string;
  expires_at: string;
  person_name: string;
}

const PeopleManagement: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [links, setLinks] = useState<{ [personId: number]: FeedbackLink[] }>(
    {}
  );
  const [showLinks, setShowLinks] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    position: "",
  });

  const [linkFormData, setLinkFormData] = useState({
    expiresInDays: 30,
  });

  useEffect(() => {
    // Check for existing auth on mount
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("authToken");

    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Error parsing stored user:", err);
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPeople();
    }
  }, [isAuthenticated]);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    localStorage.removeItem("password");
    setUser(null);
    setIsAuthenticated(false);
    setPeople([]);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Not authenticated");
    }
    return {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    };
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

  const fetchPeople = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/people", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error("Authentication required");
        }
        const errorData = await safeJsonParse(response).catch(() => ({
          error: "Failed to fetch people",
        }));
        throw new Error(errorData.error || "Failed to fetch people");
      }
      const data = await safeJsonParse(response);
      setPeople(data);
    } catch (err: any) {
      console.error("Error fetching people:", err);
      setError(err.message || "Failed to fetch people");
    } finally {
      setLoading(false);
    }
  };

  const fetchLinks = async (personId: number) => {
    try {
      const response = await fetch(`/api/people/${personId}/links`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({
          error: "Failed to fetch links",
        }));
        throw new Error(errorData.error || "Failed to fetch links");
      }
      const data = await safeJsonParse(response);
      setLinks((prev) => ({ ...prev, [personId]: data }));
    } catch (err: any) {
      console.error("Error fetching links:", err);
      setError(err.message || "Failed to fetch links");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingPerson
        ? `/api/people/${editingPerson.id}`
        : "/api/people";
      const method = editingPerson ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({
          error: "Failed to save person",
        }));
        throw new Error(errorData.error || "Failed to save person");
      }

      await fetchPeople();
      setShowAddForm(false);
      setEditingPerson(null);
      setFormData({ name: "", email: "", department: "", position: "" });
    } catch (err: any) {
      console.error("Error saving person:", err);
      setError(err.message || "Failed to save person");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (personId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this person? This will also deactivate all their feedback links."
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/people/${personId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({
          error: "Failed to delete person",
        }));
        throw new Error(errorData.error || "Failed to delete person");
      }

      await fetchPeople();
    } catch (err: any) {
      console.error("Error deleting person:", err);
      setError(err.message || "Failed to delete person");
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async (personId: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/people/${personId}/generate-link`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(linkFormData),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({
          error: "Failed to generate link",
        }));
        throw new Error(errorData.error || "Failed to generate link");
      }

      const result = await safeJsonParse(response);

      // Copy link to clipboard
      await navigator.clipboard.writeText(result.link.url);
      alert(
        `Link generated and copied to clipboard!\n\nLink: ${
          result.link.url
        }\nExpires: ${result.link.expires_at || "Never"}`
      );

      // Refresh links for this person
      await fetchLinks(personId);
    } catch (err: any) {
      console.error("Error generating link:", err);
      setError(err.message || "Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const deactivateLink = async (linkId: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/links/${linkId}/deactivate`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response).catch(() => ({
          error: "Failed to deactivate link",
        }));
        throw new Error(errorData.error || "Failed to deactivate link");
      }

      // Refresh all links
      for (const personId of Object.keys(links)) {
        await fetchLinks(parseInt(personId));
      }
    } catch (err: any) {
      console.error("Error deactivating link:", err);
      setError(err.message || "Failed to deactivate link");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      email: person.email || "",
      department: person.department || "",
      position: person.position || "",
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingPerson(null);
    setShowAddForm(false);
    setFormData({ name: "", email: "", department: "", position: "" });
  };

  if (!isAuthenticated) {
    return <UserAuth onLogin={handleLogin} />;
  }

  if (loading && people.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "18px" }}>Loading people...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2>People Management</h2>
          {user && (
            <p style={{ margin: "5px 0", color: "#666", fontSize: "14px" }}>
              Logged in as: <strong>{user.full_name || user.username}</strong>
              {user.role === "admin" && (
                <span style={{ color: "#007bff", marginLeft: "10px" }}>
                  (Admin)
                </span>
              )}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="button"
            onClick={() => setShowAddForm(true)}
            disabled={loading}
          >
            Add Person
          </button>
          <button
            className="button"
            onClick={handleLogout}
            disabled={loading}
            style={{ backgroundColor: "#dc3545" }}
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <div
          className="card"
          style={{
            marginBottom: "20px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          }}
        >
          <h3>{editingPerson ? "Edit Person" : "Add New Person"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                className="input"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                className="input"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input
                type="text"
                id="department"
                className="input"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="position">Position</label>
              <input
                type="text"
                id="position"
                className="input"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="button" disabled={loading}>
                {loading ? "Saving..." : editingPerson ? "Update" : "Add"}{" "}
                Person
              </button>
              <button
                type="button"
                className="button"
                onClick={cancelEdit}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="people-list">
        {people.map((person) => (
          <div key={person.id} className="person-card">
            <div className="person-info">
              <h4>{person.name}</h4>
              {person.email && (
                <p>
                  <strong>Email:</strong> {person.email}
                </p>
              )}
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
              <p>
                <strong>Active Links:</strong> {person.active_links}
              </p>
              <p>
                <strong>Feedback Count:</strong> {person.feedback_count}
              </p>
            </div>

            <div className="person-actions">
              <button
                className="button"
                onClick={() => generateLink(person.id)}
                disabled={loading}
              >
                Generate Link
              </button>

              <button
                className="button"
                onClick={() => {
                  if (showLinks === person.id) {
                    setShowLinks(null);
                  } else {
                    setShowLinks(person.id);
                    fetchLinks(person.id);
                  }
                }}
                disabled={loading}
              >
                {showLinks === person.id ? "Hide Links" : "View Links"}
              </button>

              <button
                className="button"
                onClick={() => startEdit(person)}
                disabled={loading}
              >
                Edit
              </button>

              <button
                className="button"
                onClick={() => handleDelete(person.id)}
                disabled={loading}
                style={{ backgroundColor: "#dc3545" }}
              >
                Delete
              </button>
            </div>

            {showLinks === person.id && links[person.id] && (
              <div className="links-section">
                <h5>Feedback Links</h5>
                {links[person.id].length === 0 ? (
                  <p>No links generated yet.</p>
                ) : (
                  links[person.id].map((link) => (
                    <div key={link.id} className="link-item">
                      <div className="link-info">
                        <p>
                          <strong>Link:</strong>{" "}
                          {link.url ? (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#007bff",
                                textDecoration: "underline",
                                wordBreak: "break-all",
                              }}
                            >
                              {link.url}
                            </a>
                          ) : (
                            <span style={{ color: "#dc3545" }}>
                              URL not available (Token: {link.link_token})
                            </span>
                          )}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          <span
                            style={{
                              color: link.is_active ? "#28a745" : "#dc3545",
                              fontWeight: "bold",
                            }}
                          >
                            {link.is_active ? "Active" : "Inactive"}
                          </span>
                        </p>
                        <p>
                          <strong>Created:</strong>{" "}
                          {new Date(link.created_at).toLocaleString()}
                        </p>
                        {link.expires_at && (
                          <p>
                            <strong>Expires:</strong>{" "}
                            {new Date(link.expires_at).toLocaleString()}
                          </p>
                        )}
                        <p style={{ marginTop: "10px" }}>
                          {link.url && (
                            <button
                              className="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(link.url);
                                  alert("Link copied to clipboard!");
                                } catch (err) {
                                  console.error("Failed to copy:", err);
                                  alert("Failed to copy link to clipboard");
                                }
                              }}
                              style={{
                                fontSize: "12px",
                                padding: "4px 8px",
                                backgroundColor: "#6c757d",
                              }}
                            >
                              Copy Link
                            </button>
                          )}
                        </p>
                      </div>
                      <div className="link-actions">
                        {link.is_active && (
                          <button
                            className="button"
                            onClick={() => deactivateLink(link.id)}
                            disabled={loading}
                            style={{
                              backgroundColor: "#ffc107",
                              color: "#000",
                            }}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {people.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>No people added yet. Click "Add Person" to get started.</p>
        </div>
      )}
    </div>
  );
};

export default PeopleManagement;
