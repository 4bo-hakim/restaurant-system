import { useState, useEffect, useRef } from "react";
import { adminT, t, filterT, translateError } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";
const STATUSES = ["pending", "confirmed", "cancelled", "completed"];

export default function ReservationsSection({ authHeaders, lang }) {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [form, setForm] = useState({
    table_id: "", name: "", phone_number: "",
    reservation_at: "", reservation_end: "", guest_count: 1, status: "pending", note: "",
  });
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterTable) params.append("table_id", filterTable);
      if (filterDate) params.append("date", filterDate);

      const [resRes, tableRes] = await Promise.all([
        fetch(`${API_BASE}/admin/reservations?${params.toString()}`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/tables`, { headers: authHeaders }),
      ]);
      if (!resRes.ok || !tableRes.ok) throw new Error("Failed to load data");
      const resData = await resRes.json();
      const tableData = await tableRes.json();
      setReservations(resData.data?.data || resData.data || []);
      setTables(tableData.data?.data || tableData.data || []);
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

  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setForm({
      table_id: r.table_id, name: r.name, phone_number: r.phone_number,
      reservation_at: toLocalInput(r.reservation_at), reservation_end: toLocalInput(r.reservation_end),
      guest_count: r.guest_count, status: r.status, note: r.note || "",
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(adminT.common, "confirmDelete", lang))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/reservations/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("Failed to delete reservation");
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const tableNumber = (id) => tables.find((tItem) => tItem.id === id)?.table_number || "-";

  const statusLabel = (status) => {
    const map = { pending: "pending", confirmed: "confirmed", cancelled: "cancelled", completed: "completed" };
    return t(adminT.dashboard, map[status] || status, lang);
  };

  return (
    <>
      <h1 className="admin-title">{t(adminT.reservations, "title", lang)}</h1>
      {error && <div className="admin-error">{translateError(error, lang)}</div>}

      <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
        <h2>{editingId ? t(adminT.reservations, "updateReservation", lang) : t(adminT.reservations, "addNew", lang)}</h2>
        <div className="admin-form-row">
          <input placeholder={t(adminT.reservations, "guestName", lang)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value })} required>
            <option value="">{t(adminT.reservations, "selectTable", lang)}</option>
            {tables.map((tItem) => <option key={tItem.id} value={tItem.id}>{tItem.table_number}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <input placeholder={t(adminT.reservations, "phoneNumber", lang)} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required />
          <input type="number" min="1" max="50" placeholder={t(adminT.reservations, "guestCount", lang)} value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <input type="datetime-local" value={form.reservation_at} onChange={(e) => setForm({ ...form, reservation_at: e.target.value })} required />
          <input type="datetime-local" value={form.reservation_end} onChange={(e) => setForm({ ...form, reservation_end: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <input placeholder={t(adminT.reservations, "notePlaceholder", lang)} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-primary">{editingId ? t(adminT.common, "update", lang) : t(adminT.common, "add", lang)}</button>
          {editingId && <button type="button" className="admin-btn-secondary" onClick={resetForm}>{t(adminT.common, "cancel", lang)}</button>}
        </div>
      </form>

      <div className="admin-form" style={{ maxWidth: 700 }}>
        <h2>{t(filterT, "filter", lang)}</h2>
        <div className="admin-form-row">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">{t(filterT, "allStatuses", lang)}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <select value={filterTable} onChange={(e) => setFilterTable(e.target.value)}>
            <option value="">{t(filterT, "allTables", lang)}</option>
            {tables.map((tItem) => <option key={tItem.id} value={tItem.id}>{tItem.table_number}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        <div className="admin-form-actions">
          <button className="admin-btn-primary" onClick={fetchData}>{t(adminT.common, "apply", lang)}</button>
        </div>
      </div>

      <h2 className="admin-subtitle">{t(adminT.reservations, "allReservations", lang)}</h2>
      {loading ? <p>{t(adminT.common, "loading", lang)}</p> : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t(adminT.reservations, "guest", lang)}</th>
                <th>{t(adminT.reservations, "table", lang)}</th>
                <th>{t(adminT.reservations, "start", lang)}</th>
                <th>{t(adminT.reservations, "end", lang)}</th>
                <th>{t(adminT.reservations, "guests", lang)}</th>
                <th>{t(adminT.reservations, "status", lang)}</th>
                <th>{t(adminT.common, "actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.table?.table_number || tableNumber(r.table_id)}</td>
                  <td>{new Date(r.reservation_at).toLocaleString()}</td>
                  <td>{new Date(r.reservation_end).toLocaleString()}</td>
                  <td>{r.guest_count}</td>
                  <td>{statusLabel(r.status)}</td>
                  <td>
                    <button className="admin-btn-small" onClick={() => handleEdit(r)}>{t(adminT.common, "edit", lang)}</button>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(r.id)}>{t(adminT.common, "delete", lang)}</button>
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