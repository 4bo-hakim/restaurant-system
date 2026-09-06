import { useState, useEffect } from "react";
import { adminT, t } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";

export default function InvoicesSection({ authHeaders, lang }) {
  const [invoices, setInvoices] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [invRes, tableRes] = await Promise.all([
        fetch(`${API_BASE}/admin/invoices`, { headers: authHeaders }),
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
      {error && <div className="admin-error">{error}</div>}
      <p style={{ textAlign: "center", color: "#888", marginBottom: 20 }}>
        {t(adminT.invoices, "description", lang)}
      </p>

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