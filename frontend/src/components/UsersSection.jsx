import { useState, useEffect } from "react";

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

export default function UsersSection({ authHeaders }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    name: "", email: "", password: "", password_confirmation: "", role: "waiter", permissions: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (id) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, { headers: authHeaders });
    if (!res.ok) throw new Error("Failed to load user details");
    const data = await res.json();
    return data.data;
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const togglePermission = (perm) => {
    setForm((prev) => {
      const has = prev.permissions.includes(perm);
      return { ...prev, permissions: has ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm] };
    });
  };

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", password_confirmation: "", role: "waiter", permissions: [] });
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
      const body = { name: form.name, email: form.email, role: form.role, permissions: form.permissions };
      if (form.password) {
        body.password = form.password;
        body.password_confirmation = form.password_confirmation;
      }

      const res = await fetch(url, { method, headers: jsonHeaders, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.errors) {
          const flat = {};
          Object.keys(errData.errors).forEach((key) => { flat[key] = errData.errors[key][0]; });
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

  const handleEdit = async (u) => {
    setError("");
    try {
      const fullUser = await fetchUserDetails(u.id);
      setEditingId(fullUser.id);
      setForm({
        name: fullUser.name, email: fullUser.email, password: "", password_confirmation: "",
        role: fullUser.roles?.[0]?.name || "waiter",
        permissions: fullUser.all_permissions || [],
      });
      setFieldErrors({});
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewUser = async (u) => {
    setError("");
    try {
      const fullUser = await fetchUserDetails(u.id);
      setViewingUser(fullUser);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete user");
      }
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
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
            <button type="button" className="eye-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
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
            <button type="button" className="eye-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
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
                <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePermission(perm)} />
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
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Permissions</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.roles?.[0]?.name || "-"}</td>
                  <td className="permission-tags-cell">
                    <button className="see-all-btn" onClick={() => handleViewUser(u)}>View permissions</button>
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

      {viewingUser && (
        <div className="modal-overlay" onClick={() => setViewingUser(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setViewingUser(null)}>×</button>
            <h2 className="modal-title">{viewingUser.name}</h2>
            <p className="modal-subtitle">
              Role: {viewingUser.roles?.[0]?.name || "-"} · Permissions ({viewingUser.all_permissions?.length || 0})
            </p>
            <div className="modal-permissions-list">
              {viewingUser.all_permissions && viewingUser.all_permissions.length > 0 ? (
                viewingUser.all_permissions.map((p) => (
                  <span key={p} className="permission-tag">{p.replaceAll("_", " ")}</span>
                ))
              ) : (
                <span className="no-permissions">No direct permissions</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}