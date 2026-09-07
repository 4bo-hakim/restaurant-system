import { useState, useEffect, useRef } from "react";
import { adminT, t, translatePermission, translateError } from "../adminTranslations";

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

export default function UsersSection({ authHeaders, lang }) {
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
  const formRef = useRef(null);

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
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (!window.confirm(t(adminT.common, "confirmDelete", lang))) return;
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
      <h1 className="admin-title">{t(adminT.users, "title", lang)}</h1>
      {error && <div className="admin-error">{translateError(error, lang)}</div>}

      <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
        <h2>{editingId ? t(adminT.users, "updateUser", lang) : t(adminT.users, "addNew", lang)}</h2>

        <div className="admin-form-row">
          <input type="text" name="name" placeholder={t(adminT.users, "namePlaceholder", lang)} value={form.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder={t(adminT.users, "emailPlaceholder", lang)} value={form.email} onChange={handleChange} required />
        </div>
        {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
        {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}

        <div className="admin-form-row">
          <div className="password-field-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder={editingId ? t(adminT.users, "newPasswordPlaceholder", lang) : t(adminT.users, "passwordPlaceholder", lang)}
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
              placeholder={t(adminT.users, "confirmPasswordPlaceholder", lang)}
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
          <span className="permissions-label">{t(adminT.users, "permissions", lang)}</span>
          <div className="permissions-grid">
            {PERMISSIONS.map((perm) => (
              <label key={perm} className="permission-checkbox">
                <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePermission(perm)} />
                {translatePermission(perm, lang)}
              </label>
            ))}
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">
            {editingId ? t(adminT.common, "update", lang) : t(adminT.common, "add", lang)}
          </button>
          {editingId && (
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>
              {t(adminT.common, "cancel", lang)}
            </button>
          )}
        </div>
      </form>

      <h2 className="admin-subtitle">{t(adminT.users, "allUsers", lang)}</h2>
      {loading ? (
        <p>{t(adminT.common, "loading", lang)}</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t(adminT.common, "name", lang)}</th>
                <th>{t(adminT.common, "email", lang)}</th>
                <th>{t(adminT.users, "roleColumn", lang)}</th>
                <th>{t(adminT.users, "permissions", lang)}</th>
                <th>{t(adminT.common, "actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.roles?.[0]?.name || "-"}</td>
                  <td className="permission-tags-cell">
                    <button className="see-all-btn" onClick={() => handleViewUser(u)}>
                      {t(adminT.users, "viewPermissions", lang)}
                    </button>
                  </td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(u)}>{t(adminT.common, "edit", lang)}</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(u.id)}>{t(adminT.common, "delete", lang)}</button>
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
              {t(adminT.users, "roleColumn", lang)}: {viewingUser.roles?.[0]?.name || "-"} · {t(adminT.users, "permissions", lang)} ({viewingUser.all_permissions?.length || 0})
            </p>
            <div className="modal-permissions-list">
              {viewingUser.all_permissions && viewingUser.all_permissions.length > 0 ? (
                viewingUser.all_permissions.map((p) => (
                  <span key={p} className="permission-tag">{translatePermission(p, lang)}</span>
                ))
              ) : (
                <span className="no-permissions">{t(adminT.users, "noPermissions", lang)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}