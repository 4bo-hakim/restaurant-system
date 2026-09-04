import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../AuthContext";
import "../styles/CashierPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const CASHIER_ICONS = ["💵", "🧾", "💳"];
const STAGE_ORDER = ["pending", "preparing", "ready"];

const getLocalized = (field) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.en || Object.values(field)[0] || "";
};

export default function CashierPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [discountInput, setDiscountInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const floatingItems = useMemo(() => {
    const items = [];
    CASHIER_ICONS.forEach((icon) => {
      for (let i = 0; i < 20; i++) {
        items.push({
          icon,
          left: Math.random() * 100,
          top: Math.random() * 100,
          duration: 15 + Math.random() * 15,
          delay: Math.random() * -20,
          size: 24 + Math.random() * 24,
        });
      }
    });
    return items;
  }, []);

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${user?.token}`,
  };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const fetchTables = async () => {
    try {
      let res = await fetch(`${API_BASE}/admin/tables/availability`, { headers: authHeaders });
      if (!res.ok) res = await fetch(`${API_BASE}/admin/tables`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setTables(data.data || []);
    } catch {
      // ignore silently
    }
  };

  const fetchInvoices = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load invoices");
      const data = await res.json();
      setInvoices((data.data || []).filter((inv) => inv.status === "pending"));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      // ignore silently
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTables(), fetchInvoices(), fetchUsers()]).finally(() => setLoading(false));
    const interval = setInterval(fetchInvoices, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waiterName = (id) => users.find((u) => u.id === id)?.name || `User #${id}`;

  const getOverallStatus = (invoice) => {
    const items = (invoice.invoice_foods || []).filter((f) => f.status !== "cancelled" && f.status !== "served");
    if (items.length === 0) return null;
    let lowestIndex = STAGE_ORDER.length - 1;
    items.forEach((item) => {
      const idx = STAGE_ORDER.indexOf(item.status);
      if (idx !== -1 && idx < lowestIndex) lowestIndex = idx;
    });
    return STAGE_ORDER[lowestIndex];
  };

  const invoiceForTable = (tableId) => invoices.find((inv) => inv.table_id === tableId) || null;

  const selectedInvoice = selectedTableId ? invoiceForTable(selectedTableId) : null;
  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  const openTable = (table) => {
    const invoice = invoiceForTable(table.id);
    if (!invoice) return;
    setSelectedTableId(table.id);
    setDiscountInput(String(invoice.discount || 0));
    setError("");
  };

  const closePanel = () => {
    setSelectedTableId(null);
    setError("");
  };

  const detailedItems = (invoice) =>
    (invoice.invoice_foods || [])
      .filter((f) => f.status !== "cancelled")
      .map((f) => ({
        ...f,
        name: getLocalized(f.food?.name),
        size: f.food?.size || null,
      }));

  const subtotal = (invoice) =>
    (invoice.invoice_foods || [])
      .filter((f) => f.status !== "cancelled")
      .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const saveDiscount = async () => {
    if (!selectedInvoice) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${selectedInvoice.id}`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({ discount: Number(discountInput) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update discount");
      fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const markAsPaid = async () => {
    if (!selectedInvoice) return;
    if (!window.confirm("Mark this order as paid?")) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${selectedInvoice.id}`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to mark as paid");
      closePanel();
      fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelOrder = async () => {
    if (!selectedInvoice) return;
    if (!window.confirm("Cancel this entire order?")) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${selectedInvoice.id}`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to cancel order");
      closePanel();
      fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="cashier-page">
      <div className="floating-background">
        {floatingItems.map((item, i) => (
          <span
            key={i}
            className="floating-icon"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}px`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
            }}
          >
            {item.icon}
          </span>
        ))}
      </div>

      <div className="cashier-content">
        <div className="cashier-header">
          {selectedTable && <button className="cashier-back-btn" onClick={closePanel}>← Back</button>}
          <h1 className="cashier-title">Cashier</h1>
        </div>

        {error && <div className="admin-error" style={{ maxWidth: 500, margin: "0 auto 20px" }}>{error}</div>}

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : !selectedTable ? (
          <div className="grid-boxes">
            {tables.map((t) => {
              const invoice = invoiceForTable(t.id);
              const status = invoice ? getOverallStatus(invoice) : null;
              return (
                <button
                  key={t.id}
                  className={`grid-box ${status ? `grid-box-${status}` : ""}`}
                  onClick={() => openTable(t)}
                  disabled={!invoice}
                >
                  {t.table_number}
                  {invoice && <span className="grid-box-total">{invoice.total}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="invoice-panel">
            <h2 className="invoice-panel-title">Table {selectedTable.table_number}</h2>
            <p className="invoice-panel-waiter">Waiter: {waiterName(selectedInvoice.created_by)}</p>

            {detailedItems(selectedInvoice).map((item, index, arr) => {
              const isNewPerson = index > 0 && arr[index - 1].person_number !== item.person_number;
              const isDone = item.status === "ready" || item.status === "served";
              return (
                <div key={item.id}>
                  {isNewPerson && <div className="person-divider" />}
                  <div className={`invoice-item-row ${isDone ? "invoice-item-row-done" : ""}`}>
                    <span>
                      {item.name}{item.size && ` (${item.size})`} × {item.quantity} (P{item.person_number})
                    </span>
                    <span className="invoice-item-dots"></span>
                    <span className="invoice-item-price">{item.quantity * item.unit_price}</span>
                  </div>
                </div>
              );
            })}

            <div className="invoice-totals-row" style={{ marginTop: 16 }}>
              <span>Subtotal</span>
              <span>{subtotal(selectedInvoice)}</span>
            </div>

            <div className="discount-row">
              <input
                type="number"
                min="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="Discount amount"
              />
              <button className="discount-save-btn" onClick={saveDiscount}>Apply</button>
            </div>

            <div className="invoice-totals">
              <div className="invoice-totals-row final">
                <span>Total after discount</span>
                <span>{selectedInvoice.total}</span>
              </div>
            </div>

            <div className="invoice-actions">
              <button className="pay-btn" onClick={markAsPaid}>Mark as paid</button>
              <button className="cancel-btn" onClick={cancelOrder}>Cancel order</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}