import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api";
const STATUSES = ["pending", "confirmed", "cancelled", "completed"];

export default function ReservationsSection({ authHeaders }) {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    table_id: "", name: "", phone_number: "",
    reservation_at: "", reservation_end: "", guest_count: 1, status: "pending", note: "",
  });
  const [editingId, setEditingId] = useState(null);

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resRes, tableRes] = await Promise.all([
        fetch(`${API_BASE}/admin/reservations`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/tables`, { headers: authHeaders }),
      ]);
      if (!resRes.ok || !tableRes.ok) throw new Error("Failed to load data");
      const resData = await resRes.json();
      const tableData = await tableRes.json();
      setReservations(resData.data || []);
      setTables(tableData.data || []);
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
      table_id: tables[0]?.id || "", name: "", phone_number: "",
      reservation_at: "", reservation_end: "", guest_count: 1, status: "pending", note: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const url = editingId ? `${API_BASE}/admin/reservations/${editingId}` : `${API_BASE}/admin/reservations`;
      const method = editingId ? "PUT" : "POST";
      const body = {
        table_id: form.table_id,
        name: form.name,
        phone_number: form.phone_number,
        reservation_at: new Date(form.reservation_at).toISOString(),
        reservation_end: new Date(form.reservation_end).toISOString(),
        guest_count: Number(form.guest_count),
        status: form.status,
        note: form.note || null,
      };
      const res = await fetch(url, { method, headers: jsonHeaders, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to save reservation");
      }
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : "");

  const handleEdit = (r) => {
    setEditingId(r.id);
    setForm({
      table_id: r.table_id, name: r.name, phone_number: r.phone_number,
      reservation_at: toLocalInput(r.reservation_at), reservation_end: toLocalInput(r.reservation_end),
      guest_count: r.guest_count, status: r.status, note: r.note || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reservation?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/reservations/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("Failed to delete reservation");
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const tableNumber = (id) => tables.find((t) => t.id === id)?.table_number || "-";

  return (
    <>
      <h1 className="admin-title">Manage reservations</h1>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Update reservation" : "Add new reservation"}</h2>
        <div className="admin-form-row">
          <input placeholder="Guest name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value })} required>
            <option value="">Select table</option>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.table_number}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <input placeholder="Phone number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required />
          <input type="number" min="1" max="50" placeholder="Guest count" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <input type="datetime-local" value={form.reservation_at} onChange={(e) => setForm({ ...form, reservation_at: e.target.value })} required />
          <input type="datetime-local" value={form.reservation_end} onChange={(e) => setForm({ ...form, reservation_end: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? "Update" : "Add"}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <h2 className="admin-subtitle">All reservations</h2>
      {loading ? <p>Loading...</p> : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Guest</th><th>Table</th><th>Start</th><th>End</th><th>Guests</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.table?.table_number || tableNumber(r.table_id)}</td>
                  <td>{new Date(r.reservation_at).toLocaleString()}</td>
                  <td>{new Date(r.reservation_end).toLocaleString()}</td>
                  <td>{r.guest_count}</td>
                  <td>{r.status}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(r)}>Edit</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(r.id)}>Delete</button>
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