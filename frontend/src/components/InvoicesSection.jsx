import { useState, useEffect } from "react";
import { adminT, t, filterT, translateError } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";

export default function InvoicesSection({ authHeaders, lang }) {
  const [invoices, setInvoices] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterTable) params.append("table_id", filterTable);
      if (filterFrom) params.append("from", filterFrom);
      if (filterTo) params.append("to", filterTo);

      const [invRes, tableRes] = await Promise.all([
        fetch(`${API_BASE}/admin/invoices?${params.toString()}`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/tables`, { headers: authHeaders }),
      ]);
      if (!invRes.ok || !tableRes.ok) throw new Error("Failed to load data");
      const invData = await invRes.json();
      const tableData = await tableRes.json();
      setInvoices(invData.data?.data || invData.data || []);
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

  const updateStatus = async (id, status) => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${id}`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error("Failed to update invoice");
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(adminT.common, "confirmDelete", lang))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete invoice");
      }
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const tableNumber = (id) => tables.find((tItem) => tItem.id === id)?.table_number || "-";

  return (
    <>
      <h1 className="admin-title">{t(adminT.invoices, "title", lang)}</h1>
      {error && <div className="admin-error">{translateError(error, lang)}</div>}
       <p style={{ textAlign: "center", color: "#888", marginTop: 30, marginBottom: 20 }}>
       {t(adminT.invoices, "description", lang)}
      </p>

      <div className="admin-form" style={{ maxWidth: 700 }}>
        <h2>{t(filterT, "filter", lang)}</h2>
        <div className="admin-form-row">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">{t(filterT, "allStatuses", lang)}</option>
            <option value="pending">{t(adminT.dashboard, "pending", lang)}</option>
            <option value="completed">{t(adminT.dashboard, "completed", lang)}</option>
            <option value="cancelled">{t(adminT.dashboard, "cancelled", lang)}</option>
          </select>
          <select value={filterTable} onChange={(e) => setFilterTable(e.target.value)}>
            <option value="">{t(filterT, "allTables", lang)}</option>
            {tables.map((tItem) => <option key={tItem.id} value={tItem.id}>{tItem.table_number}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        <div className="admin-form-actions">
          <button className="admin-btn-primary" onClick={fetchData}>{t(adminT.common, "apply", lang)}</button>
        </div>
      </div>

      {loading ? <p>{t(adminT.common, "loading", lang)}</p> : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t(adminT.reservations, "table", lang)}</th>
                <th>{t(adminT.reservations, "status", lang)}</th>
                <th>{t(adminT.invoices, "discount", lang)}</th>
                <th>{t(adminT.invoices, "total", lang)}</th>
                <th>{t(adminT.common, "actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.table?.table_number || tableNumber(inv.table_id)}</td>
                  <td>
                    <select value={inv.status} onChange={(e) => updateStatus(inv.id, e.target.value)}>
                      <option value="pending">{t(adminT.dashboard, "pending", lang)}</option>
                      <option value="completed">{t(adminT.dashboard, "completed", lang)}</option>
                      <option value="cancelled">{t(adminT.dashboard, "cancelled", lang)}</option>
                    </select>
                  </td>
                  <td>{inv.discount}</td>
                  <td>{inv.total}</td>
                  <td>
                    <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(inv.id)}>{t(adminT.common, "delete", lang)}</button>
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