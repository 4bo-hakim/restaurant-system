import { useState, useEffect, useRef } from "react";
import { adminT, t, translateError } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";

export default function CategoriesSection({ authHeaders, lang }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name_en: "", name_ar: "", name_ku: "" });
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/categories`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(data.data?.data || data.data || []);
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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(adminT.common, "confirmDelete", lang))) return;
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
      <h1 className="admin-title">{t(adminT.categories, "title", lang)}</h1>
      {error && <div className="admin-error">{translateError(error, lang)}</div>}

      <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
        <h2>{editingId ? t(adminT.categories, "updateCategory", lang) : t(adminT.categories, "addNew", lang)}</h2>
        <div className="admin-form-row">
          <input placeholder={t(adminT.categories, "nameEn", lang)} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <input placeholder={t(adminT.categories, "nameAr", lang)} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
          <input placeholder={t(adminT.categories, "nameKu", lang)} value={form.name_ku} onChange={(e) => setForm({ ...form, name_ku: e.target.value })} required />
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? t(adminT.common, "update", lang) : t(adminT.common, "add", lang)}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>{t(adminT.common, "cancel", lang)}</button>}
        </div>
      </form>

      <h2 className="admin-subtitle">{t(adminT.categories, "allCategories", lang)}</h2>
      {loading ? (
        <p>{t(adminT.common, "loading", lang)}</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t(adminT.categories, "nameEn", lang)}</th>
                <th>{t(adminT.categories, "nameAr", lang)}</th>
                <th>{t(adminT.categories, "nameKu", lang)}</th>
                <th>{t(adminT.categories, "subCategoriesCount", lang)}</th>
                <th>{t(adminT.common, "actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name?.en || "-"}</td>
                  <td>{c.name?.ar || "-"}</td>
                  <td>{c.name?.ku || "-"}</td>
                  <td>{c.sub_categories_count ?? "-"}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(c)}>{t(adminT.common, "edit", lang)}</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(c.id)}>{t(adminT.common, "delete", lang)}</button>
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