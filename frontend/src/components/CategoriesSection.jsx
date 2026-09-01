import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function CategoriesSection({ authHeaders }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name_en: "", name_ar: "", name_ku: "" });
  const [editingId, setEditingId] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/categories`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm({ name_en: "", name_ar: "", name_ku: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const formData = new FormData();
      formData.append("name[en]", form.name_en);
      formData.append("name[ar]", form.name_ar);
      formData.append("name[ku]", form.name_ku);

      let url = `${API_BASE}/admin/categories`;
      if (editingId) {
        url = `${API_BASE}/admin/categories/${editingId}`;
        formData.append("_method", "PUT");
      }

      const res = await fetch(url, { method: "POST", headers: authHeaders, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to save category");
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({ name_en: c.name?.en || "", name_ar: c.name?.ar || "", name_ku: c.name?.ku || "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/categories/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete category");
      }
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1 className="admin-title">Manage categories</h1>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Update category" : "Add new category"}</h2>
        <div className="admin-form-row">
          <input placeholder="Name (English)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <input placeholder="Name (Arabic)" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
          <input placeholder="Name (Kurdish)" value={form.name_ku} onChange={(e) => setForm({ ...form, name_ku: e.target.value })} required />
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? "Update" : "Add"}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <h2 className="admin-subtitle">All categories</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Name (EN)</th><th>Name (AR)</th><th>Name (KU)</th><th>Sub-categories</th><th>Actions</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name?.en || "-"}</td>
                  <td>{c.name?.ar || "-"}</td>
                  <td>{c.name?.ku || "-"}</td>
                  <td>{c.sub_categories_count ?? "-"}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(c)}>Edit</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}