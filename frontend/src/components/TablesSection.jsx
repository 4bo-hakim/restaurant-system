import { useState, useEffect, useRef } from "react";
import { adminT, t } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";

export default function TablesSection({ authHeaders, lang }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchTables = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/tables`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load tables");
      const data = await res.json();
      setTables(data.data?.data || data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setTableNumber("");
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const url = editingId ? `${API_BASE}/admin/tables/${editingId}` : `${API_BASE}/admin/tables`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: jsonHeaders, body: JSON.stringify({ table_number: tableNumber }) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to save table");
      }
      resetForm();
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (tItem) => {
    setEditingId(tItem.id);
    setTableNumber(tItem.table_number);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(adminT.common, "confirmDelete", lang))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/tables/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete table");
      }
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1 className="admin-title">{t(adminT.tables, "title", lang)}</h1>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
        <h2>{editingId ? t(adminT.tables, "updateTable", lang) : t(adminT.tables, "addNew", lang)}</h2>
        <div className="admin-form-row">
          <input placeholder={t(adminT.tables, "tableNumberPlaceholder", lang)} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required />
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? t(adminT.common, "update", lang) : t(adminT.common, "add", lang)}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>{t(adminT.common, "cancel", lang)}</button>}
        </div>
      </form>

      <h2 className="admin-subtitle">{t(adminT.tables, "allTables", lang)}</h2>
      {loading ? (
        <p>{t(adminT.common, "loading", lang)}</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>{t(adminT.tables, "tableNumberColumn", lang)}</th><th>{t(adminT.common, "actions", lang)}</th></tr></thead>
            <tbody>
              {tables.map((tItem) => (
                <tr key={tItem.id}>
                  <td>{tItem.table_number}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(tItem)}>{t(adminT.common, "edit", lang)}</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(tItem.id)}>{t(adminT.common, "delete", lang)}</button>
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