import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function TablesSection({ authHeaders }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [editingId, setEditingId] = useState(null);

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchTables = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/tables`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load tables");
      const data = await res.json();
      setTables(data.data || []);
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

  const handleEdit = (t) => {
    setEditingId(t.id);
    setTableNumber(t.table_number);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this table?")) return;
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
      <h1 className="admin-title">Manage tables</h1>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Update table" : "Add new table"}</h2>
        <div className="admin-form-row">
          <input placeholder="Table number (e.g. T-01)" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required />
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? "Update" : "Add"}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <h2 className="admin-subtitle">All tables</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Table number</th><th>Actions</th></tr></thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id}>
                  <td>{t.table_number}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(t)}>Edit</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
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