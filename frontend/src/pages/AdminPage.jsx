import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import "../styles/AdminPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const ROLES = ["admin", "captain", "chef", "cashier"];

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "captain" });
  const [editingId, setEditingId] = useState(null);

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

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", role: "captain" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const url = editingId ? `${API_BASE}/admin/users/${editingId}` : `${API_BASE}/admin/users`;
      const method = editingId ? "PUT" : "POST";
      const body = { name: form.name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;

      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
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
    setForm({ name: u.name, email: u.email, password: "", role: u.roles?.[0]?.name || "captain" });
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
          <div className="admin-form-row">
            <input
              type="password"
              name="password"
              placeholder={editingId ? "New password (optional)" : "Password"}
              value={form.password}
              onChange={handleChange}
              required={!editingId}
            />
            <select name="role" value={form.role} onChange={handleChange}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
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
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.roles?.[0]?.name || "-"}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(u)}>Edit</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}