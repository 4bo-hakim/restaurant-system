import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import "../styles/AdminPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const ROLES = ["admin", "waiter", "chef", "cashier"];

const PERMISSIONS = [
  "create_category", "update_category", "delete_category",
  "create_sub_category", "update_sub_category", "delete_sub_category",
  "create_food", "update_food", "delete_food",
  "create_table", "update_table", "delete_table",
  "manage_reservations",
  "create_invoice", "update_invoice", "cancel_invoice", "update_invoice_food_status",
  "create_user", "update_user", "delete_user",
];

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "waiter",
    permissions: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${user?.token}`,
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const togglePermission = (perm) => {
    setForm((prev) => {
      const has = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((p) => p !== perm)
          : [...prev.permissions, perm],
      };
    });
  };

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      role: "waiter",
      permissions: [],
    });
    setEditingId(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    try {
      const url = editingId ? `${API_BASE}/admin/users/${editingId}` : `${API_BASE}/admin/users`;
      const method = editingId ? "PUT" : "POST";
      const body = {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: form.permissions,
      };
      if (form.password) {
        body.password = form.password;
        body.password_confirmation = form.password_confirmation;
      }

      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.errors) {
          const flat = {};
          Object.keys(errData.errors).forEach((key) => {
            flat[key] = errData.errors[key][0];
          });
          setFieldErrors(flat);
        }
        throw new Error(errData?.message || "Failed to save user");
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      password_confirmation: "",
      role: u.roles?.[0]?.name || "waiter",
      permissions: u.permissions?.map((p) => p.name) || [],
    });
    setFieldErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("Failed to delete user");
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-item active">
          <span className="sidebar-icon">+</span>
          <span>Manage users</span>
        </div>
      </aside>

      <main className="admin-main">
        <h1 className="admin-title">Manage users</h1>
        {error && <div className="admin-error">{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Update user" : "Add new user"}</h2>

          <div className="admin-form-row">
            <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
            <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          </div>
          {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
          {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}

          <div className="admin-form-row">
            <div className="password-field-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={editingId ? "New password (optional)" : "Password"}
                value={form.password}
                onChange={handleChange}
                required={!editingId}
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <select name="role" value={form.role} onChange={handleChange}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-row">
            <div className="password-field-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password_confirmation"
                placeholder="Confirm password"
                value={form.password_confirmation}
                onChange={handleChange}
                required={!editingId || form.password.length > 0}
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}

          <div className="permissions-box">
            <span className="permissions-label">Permissions</span>
            <div className="permissions-grid">
              {PERMISSIONS.map((perm) => (
                <label key={perm} className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  {perm.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn-primary">{editingId ? "Update" : "Add"}</button>
            {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>Cancel</button>}
          </div>
        </form>

        <h2 className="admin-subtitle">All users</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.roles?.[0]?.name || "-"}</td>
                    <td className="permission-tags-cell">
                      {u.permissions && u.permissions.length > 0 ? (
                        <>
                          {u.permissions.slice(0, 3).map((p) => (
                            <span key={p.id || p.name} className="permission-tag">
                              {p.name.replaceAll("_", " ")}
                            </span>
                          ))}
                          {u.permissions.length > 3 && (
                            <div>
                              <button className="see-all-btn" onClick={() => setViewingUser(u)}>
                                See all ({u.permissions.length})
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="no-permissions">No direct permissions</span>
                      )}
                    </td>
                    <td>
                      <button className="admin-btn-small" onClick={() => handleEdit(u)}>Edit</button>
                      <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {viewingUser && (
        <div className="modal-overlay" onClick={() => setViewingUser(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setViewingUser(null)}>×</button>
            <h2 className="modal-title">{viewingUser.name}</h2>
            <p className="modal-subtitle">All permissions ({viewingUser.permissions?.length || 0})</p>
            <div className="modal-permissions-list">
              {viewingUser.permissions?.map((p) => (
                <span key={p.id || p.name} className="permission-tag">
                  {p.name.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}