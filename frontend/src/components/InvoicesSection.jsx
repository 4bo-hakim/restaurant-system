import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function InvoicesSection({ authHeaders }) {
  const [invoices, setInvoices] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchData = async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const [invRes, tableRes] = await Promise.all([
        fetch(`${API_BASE}/admin/invoices?page=${targetPage}`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/tables`, { headers: authHeaders }),
      ]);
      if (!invRes.ok || !tableRes.ok) throw new Error("Failed to load data");
      const invData = await invRes.json();
      const tableData = await tableRes.json();

      setInvoices(invData.data?.data || invData.data || []);
      setPage(invData.data?.current_page || 1);
      setLastPage(invData.data?.last_page || 1);
      setTotal(invData.data?.total ?? (invData.data?.length || 0));

      setTables(tableData.data?.data || tableData.data || []);
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

  const goToPage = (p) => {
    if (p < 1 || p > lastPage) return;
    fetchData(p);
  };

  const updateStatus = async (id, status) => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${id}`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error("Failed to update invoice");
      fetchData(page);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice? (only possible if it has no items)")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to delete invoice");
      }
      fetchData(page);
    } catch (err) {
      setError(err.message);
    }
  };

  const tableNumber = (id) => tables.find((t) => t.id === id)?.table_number || "-";

  return (
    <>
      <h1 className="admin-title">Invoices</h1>
      {error && <div className="admin-error">{error}</div>}
      <p style={{ textAlign: "center", color: "#888", marginBottom: 20 }}>
        Invoices are created by waiters/cashiers when taking an order. Here you can review, change status, or delete empty ones.
      </p>

      {loading ? <p>Loading...</p> : (
        <>
          <p style={{ textAlign: "center", color: "#888", marginBottom: 10 }}>Total: {total}</p>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>Table</th><th>Status</th><th>Discount</th><th>Total</th><th>Actions</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.table?.table_number || tableNumber(inv.table_id)}</td>
                    <td>
                      <select value={inv.status} onChange={(e) => updateStatus(inv.id, e.target.value)}>
                        <option value="pending">pending</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td>{inv.discount}</td>
                    <td>{inv.total}</td>
                    <td>
                      <button className="admin-btn-small admin-btn-danger" onClick={() => handleDelete(inv.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => goToPage(page - 1)} disabled={page <= 1}>← Previous</button>
            <span className="pagination-info">Page {page} of {lastPage}</span>
            <button className="pagination-btn" onClick={() => goToPage(page + 1)} disabled={page >= lastPage}>Next →</button>
          </div>
        </>
      )}
    </>
  );
}