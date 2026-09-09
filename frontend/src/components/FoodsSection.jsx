import { useState, useEffect, useRef } from "react";
import { adminT, t, filterT, translateError } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";

export default function FoodsSection({ authHeaders, lang }) {
  const [foods, setFoods] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterSubCategory, setFilterSubCategory] = useState("");
  const [filterAvailable, setFilterAvailable] = useState("");
  const [form, setForm] = useState({
    name_en: "", name_ar: "", name_ku: "",
    description_en: "", description_ar: "", description_ku: "",
    size: "", price: "", is_available: true, sub_category_id: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  const fetchData = async (targetPage = page, overrides = {}) => {
    setLoading(true);
    setError("");
    try {
      const searchVal = overrides.search !== undefined ? overrides.search : search;
      const subCat = overrides.subCategory !== undefined ? overrides.subCategory : filterSubCategory;
      const available = overrides.available !== undefined ? overrides.available : filterAvailable;

      const params = new URLSearchParams({ page: targetPage });
      if (searchVal) params.append("search", searchVal);
      if (subCat) params.append("sub_category_id", subCat);
      if (available) params.append("is_available", available);

      const [foodRes, subRes] = await Promise.all([
        fetch(`${API_BASE}/admin/foods?${params.toString()}`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/sub-categories`, { headers: authHeaders }),
      ]);
      if (!foodRes.ok || !subRes.ok) throw new Error("Failed to load data");
      const foodData = await foodRes.json();
      const subData = await subRes.json();

      setFoods(foodData.data?.data || foodData.data || []);
      setPage(foodData.data?.current_page || 1);
      setLastPage(foodData.data?.last_page || 1);
      setTotal(foodData.data?.total ?? (foodData.data?.length || 0));
      setSubCategories(subData.data?.data || subData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    fetchData(1);
  };

  const resetFilters = () => {
    setSearch("");
    setFilterSubCategory("");
    setFilterAvailable("");
    fetchData(1, { search: "", subCategory: "", available: "" });
  };

  const goToPage = (p) => {
    if (p < 1 || p > lastPage) return;
    fetchData(p);
  };

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
      if (imageFile) formData.append("image_path", imageFile);

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
      fetchData(editingId ? page : 1);
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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(adminT.common, "confirmDelete", lang))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/foods/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete food");
      }
      fetchData(page);
    } catch (err) {
      setError(err.message);
    }
  };

  const subCategoryName = (id) => subCategories.find((s) => s.id === id)?.name?.en || "-";

  return (
    <>
      <h1 className="admin-title">{t(adminT.foods, "title", lang)}</h1>
      {error && <div className="admin-error">{translateError(error, lang)}</div>}

      <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
        <h2>{editingId ? t(adminT.foods, "updateFood", lang) : t(adminT.foods, "addNew", lang)}</h2>

        <div className="admin-form-row">
          <input placeholder={t(adminT.foods, "nameEn", lang)} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
          <select value={form.sub_category_id} onChange={(e) => setForm({ ...form, sub_category_id: e.target.value })} required>
            <option value="">{t(adminT.foods, "selectSubCategory", lang)}</option>
            {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name?.en}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <input placeholder={t(adminT.foods, "nameAr", lang)} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
          <input placeholder={t(adminT.foods, "nameKu", lang)} value={form.name_ku} onChange={(e) => setForm({ ...form, name_ku: e.target.value })} required />
        </div>

        <div className="admin-form-row">
          <input placeholder={t(adminT.foods, "descEn", lang)} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <input placeholder={t(adminT.foods, "descKu", lang)} value={form.description_ku} onChange={(e) => setForm({ ...form, description_ku: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <input placeholder={t(adminT.foods, "descAr", lang)} value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} />
        </div>

        <div className="admin-form-row">
          <input placeholder={t(adminT.foods, "size", lang)} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <input type="number" step="1000" placeholder={t(adminT.foods, "price", lang)} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>

        <div className="admin-form-row available-row">
          <label className="available-checkbox-label">
            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
            <span>{t(adminT.foods, "available", lang)}</span>
          </label>
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

      <div className="admin-form" style={{ maxWidth: 700 }}>
        <h2>{t(filterT, "filter", lang)}</h2>
        <div className="admin-form-row">
          <input placeholder={t(filterT, "searchByName", lang)} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={filterSubCategory} onChange={(e) => setFilterSubCategory(e.target.value)}>
            <option value="">{t(filterT, "allSubCategories", lang)}</option>
            {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name?.en}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <select value={filterAvailable} onChange={(e) => setFilterAvailable(e.target.value)}>
            <option value="">{t(filterT, "all", lang)}</option>
            <option value="1">{t(filterT, "availableOnly", lang)}</option>
            <option value="0">{t(filterT, "unavailableOnly", lang)}</option>
          </select>
        </div>
        <div className="admin-form-actions">
          <button className="admin-btn-primary" onClick={applyFilters}>{t(adminT.common, "apply", lang)}</button>
          <button className="admin-btn-secondary" onClick={resetFilters}>{t(filterT, "resetFilter", lang)}</button>
        </div>
      </div>

      <h2 className="admin-subtitle">{t(adminT.foods, "allFoods", lang)} ({total})</h2>
      {loading ? (
        <p>{t(adminT.common, "loading", lang)}</p>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t(adminT.foods, "image", lang)}</th>
                  <th>{t(adminT.foods, "nameEn", lang)}</th>
                  <th>{t(adminT.foods, "subCategoryColumn", lang)}</th>
                  <th>{t(adminT.foods, "priceColumn", lang)}</th>
                  <th>{t(adminT.foods, "availableColumn", lang)}</th>
                  <th>{t(adminT.common, "actions", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {foods.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.image_path ? (
                        <img src={`http://127.0.0.1:8000/storage/${f.image_path}`} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }} />
                      ) : "-"}
                    </td>
                    <td>{f.name?.en || "-"}</td>
                    <td>{f.sub_category?.name?.en || subCategoryName(f.sub_category_id)}</td>
                    <td>{f.price}</td>
                    <td>{f.is_available ? t(adminT.common, "yes", lang) : t(adminT.common, "no", lang)}</td>
                    <td>
                      <button className="admin-btn-small" onClick={() => handleEdit(f)}>{t(adminT.common, "edit", lang)}</button>
                      <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(f.id)}>{t(adminT.common, "delete", lang)}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => goToPage(page - 1)} disabled={page <= 1}>← Previous</button>
            <span className="pagination-info">{page} / {lastPage}</span>
            <button className="pagination-btn" onClick={() => goToPage(page + 1)} disabled={page >= lastPage}>Next →</button>
          </div>
        </>
      )}
    </>
  );
}