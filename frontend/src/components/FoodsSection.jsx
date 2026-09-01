import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function FoodsSection({ authHeaders }) {
  const [foods, setFoods] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name_en: "", name_ar: "", name_ku: "",
    description_en: "", description_ar: "", description_ku: "",
    size: "", price: "", is_available: true, sub_category_id: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [foodRes, subRes] = await Promise.all([
        fetch(`${API_BASE}/admin/foods`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/sub-categories`, { headers: authHeaders }),
      ]);
      if (!foodRes.ok || !subRes.ok) throw new Error("Failed to load data");
      const foodData = await foodRes.json();
      const subData = await subRes.json();
      setFoods(foodData.data || []);
      setSubCategories(subData.data || []);
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
    setForm({
      name_en: "", name_ar: "", name_ku: "",
      description_en: "", description_ar: "", description_ku: "",
      size: "", price: "", is_available: true,
      sub_category_id: subCategories[0]?.id || "",
    });
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
      formData.append("description[en]", form.description_en);
      formData.append("description[ar]", form.description_ar);
      formData.append("description[ku]", form.description_ku);
      if (form.size) formData.append("size", form.size);
      formData.append("price", form.price);
      formData.append("is_available", form.is_available ? "1" : "0");
      formData.append("sub_category_id", form.sub_category_id);
      if (imageFile) {
        formData.append("image_path", imageFile);
      }

      let url = `${API_BASE}/admin/foods`;
      if (editingId) {
        url = `${API_BASE}/admin/foods/${editingId}`;
        formData.append("_method", "PUT");
      }

      const res = await fetch(url, { method: "POST", headers: authHeaders, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to save food");
      }
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (f) => {
    setEditingId(f.id);
    setForm({
      name_en: f.name?.en || "", name_ar: f.name?.ar || "", name_ku: f.name?.ku || "",
      description_en: f.description?.en || "", description_ar: f.description?.ar || "", description_ku: f.description?.ku || "",
      size: f.size || "", price: f.price || "",
      is_available: !!f.is_available, sub_category_id: f.sub_category_id,
    });
    setImageFile(null);
    setImagePreview(f.image_path ? `http://127.0.0.1:8000/storage/${f.image_path}` : null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this food item?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/foods/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete food");
      }
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const subCategoryName = (id) => subCategories.find((s) => s.id === id)?.name?.en || "-";

  return (
    <>
      <h1 className="admin-title">Manage foods</h1>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Update food" : "Add new food"}</h2>

        <div className="admin-form-row">
          <input placeholder="Name (English)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
          <select value={form.sub_category_id} onChange={(e) => setForm({ ...form, sub_category_id: e.target.value })} required>
            <option value="">Select sub-category</option>
            {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name?.en}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <input placeholder="Name (Arabic)" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
          <input placeholder="Name (Kurdish)" value={form.name_ku} onChange={(e) => setForm({ ...form, name_ku: e.target.value })} required />
        </div>

        <div className="admin-form-row">
          <input placeholder="Description (English)" value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <input placeholder="Description (Arabic)" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} />
          <input placeholder="Description (Kurdish)" value={form.description_ku} onChange={(e) => setForm({ ...form, description_ku: e.target.value })} />
        </div>

        <div className="admin-form-row">
          <input placeholder="Size (optional)" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>

        <div className="admin-form-row">
          <label className="permission-checkbox" style={{ flex: 1 }}>
            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
            Available
          </label>
        </div>

        <div className="admin-form-row">
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                style={{ maxWidth: 120, maxHeight: 120, marginTop: 8, borderRadius: 8, display: "block" }}
              />
            )}
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? "Update" : "Add"}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <h2 className="admin-subtitle">All foods</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>Image</th><th>Name (EN)</th><th>Sub-category</th><th>Price</th><th>Available</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {foods.map((f) => (
                <tr key={f.id}>
                  <td>
                    {f.image_path ? (
                      <img
                        src={`http://127.0.0.1:8000/storage/${f.image_path}`}
                        alt=""
                        style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{f.name?.en || "-"}</td>
                  <td>{f.sub_category?.name?.en || subCategoryName(f.sub_category_id)}</td>
                  <td>{f.price}</td>
                  <td>{f.is_available ? "Yes" : "No"}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(f)}>Edit</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(f.id)}>Delete</button>
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