import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function SubCategoriesSection({ authHeaders }) {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name_en: "", name_ar: "", name_ku: "", category_id: "" });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [subRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/admin/sub-categories`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/categories`, { headers: authHeaders }),
      ]);
      if (!subRes.ok || !catRes.ok) throw new Error("Failed to load data");
      const subData = await subRes.json();
      const catData = await catRes.json();
      setSubCategories(subData.data || []);
      setCategories(catData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm({ name_en: "", name_ar: "", name_ku: "", category_id: categories[0]?.id || "" });
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
      formData.append("category_id", form.category_id);

      let url = `${API_BASE}/admin/sub-categories`;
      if (editingId) {
        url = `${API_BASE}/admin/sub-categories/${editingId}`;
        formData.append("_method", "PUT");
      }

      const res = await fetch(url, { method: "POST", headers: authHeaders, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to save sub-category");
      }
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (s) => {
    setEditingId(s.id);
    setForm({ name_en: s.name?.en || "", name_ar: s.name?.ar || "", name_ku: s.name?.ku || "", category_id: s.category_id });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sub-category?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/sub-categories/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete sub-category");
      }
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const categoryName = (id) => categories.find((c) => c.id === id)?.name?.en || "-";

  return (
    <>
      <h1 className="admin-title">Manage sub-categories</h1>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Update sub-category" : "Add new sub-category"}</h2>
        <div className="admin-form-row">
          <input placeholder="Name (English)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name?.en}</option>)}
          </select>
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

      <h2 className="admin-subtitle">All sub-categories</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Name (EN)</th><th>Category</th><th>Foods</th><th>Actions</th></tr></thead>
            <tbody>
              {subCategories.map((s) => (
                <tr key={s.id}>
                  <td>{s.name?.en || "-"}</td>
                  <td>{s.category?.name?.en || categoryName(s.category_id)}</td>
                  <td>{s.foods_count ?? "-"}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(s)}>Edit</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(s.id)}>Delete</button>
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