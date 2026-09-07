import { useState, useEffect, useRef } from "react";
import { adminT, t, translateError } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";

export default function SubCategoriesSection({ authHeaders, lang }) {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name_en: "", name_ar: "", name_ku: "", category_id: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

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
      setSubCategories(subData.data?.data || subData.data || []);
      setCategories(catData.data?.data || catData.data || []);
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
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
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
      if (imageFile) formData.append("image_path", imageFile);

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
    setImageFile(null);
    setImagePreview(s.image_path ? `http://127.0.0.1:8000/storage/${s.image_path}` : null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(adminT.common, "confirmDelete", lang))) return;
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
      <h1 className="admin-title">{t(adminT.subcategories, "title", lang)}</h1>
      {error && <div className="admin-error">{translateError(error, lang)}</div>}

      <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
        <h2>{editingId ? t(adminT.subcategories, "updateSubCategory", lang) : t(adminT.subcategories, "addNew", lang)}</h2>
        <div className="admin-form-row">
          <input placeholder={t(adminT.categories, "nameEn", lang)} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
            <option value="">{t(adminT.subcategories, "selectCategory", lang)}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name?.en}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <input placeholder={t(adminT.categories, "nameAr", lang)} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
          <input placeholder={t(adminT.categories, "nameKu", lang)} value={form.name_ku} onChange={(e) => setForm({ ...form, name_ku: e.target.value })} required />
        </div>

        <div className="admin-form-row">
          <div>
            <input type="file" accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml" onChange={handleImageChange} />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" style={{ maxWidth: 120, maxHeight: 120, marginTop: 8, borderRadius: 8, display: "block" }} />
            )}
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? t(adminT.common, "update", lang) : t(adminT.common, "add", lang)}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>{t(adminT.common, "cancel", lang)}</button>}
        </div>
      </form>

      <h2 className="admin-subtitle">{t(adminT.subcategories, "allSubCategories", lang)}</h2>
      {loading ? (
        <p>{t(adminT.common, "loading", lang)}</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t(adminT.foods, "image", lang)}</th>
                <th>{t(adminT.categories, "nameEn", lang)}</th>
                <th>{t(adminT.subcategories, "category", lang)}</th>
                <th>{t(adminT.subcategories, "foodsCount", lang)}</th>
                <th>{t(adminT.common, "actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {subCategories.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.image_path ? (
                      <img src={`http://127.0.0.1:8000/storage/${s.image_path}`} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }} />
                    ) : "-"}
                  </td>
                  <td>{s.name?.en || "-"}</td>
                  <td>{s.category?.name?.en || categoryName(s.category_id)}</td>
                  <td>{s.foods_count ?? "-"}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(s)}>{t(adminT.common, "edit", lang)}</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(s.id)}>{t(adminT.common, "delete", lang)}</button>
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