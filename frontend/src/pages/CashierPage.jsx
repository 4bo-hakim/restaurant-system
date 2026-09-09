import { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { cashierT, t, CASHIER_LANGUAGES } from "../cashierTranslations";
import "../styles/CashierPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const STAGE_ORDER = ["pending", "preparing", "ready"];
const STATUSES = ["pending", "confirmed", "cancelled", "completed"];

const getLocalized = (field, lang) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.en || Object.values(field)[0] || "";
};

export default function CashierPage() {
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem("cashierLang") || "en");
  const isRTL = lang === "ar" || lang === "ku";
  const [section, setSection] = useState("orders"); // orders | reservations

  const [tables, setTables] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [discountInput, setDiscountInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Reservations tab state
  const [reservations, setReservations] = useState([]);
  const [resForm, setResForm] = useState({
    table_id: "", name: "", phone_number: "",
    reservation_at: "", reservation_end: "", guest_count: 1, status: "pending", note: "",
  });
  const [editingResId, setEditingResId] = useState(null);
  const [resSuccess, setResSuccess] = useState("");
  const resFormRef = useRef(null);

  const changeLanguage = (code) => {
    setLang(code);
    localStorage.setItem("cashierLang", code);
  };

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
      setTables(data.data?.data || data.data || []);
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
      const invoiceList = data.data?.data || data.data || [];
      setInvoices(invoiceList.filter((inv) => inv.status === "pending"));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/reservations`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setReservations(data.data?.data || data.data || []);
    } catch {
      // ignore silently
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTables(), fetchInvoices(), fetchReservations()]).finally(() => setLoading(false));
    const interval = setInterval(fetchInvoices, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        name: getLocalized(f.food?.name, lang),
        size: f.food?.size || null,
      }));

  const subtotal = (invoice) =>
    (invoice.invoice_foods || [])
      .filter((f) => f.status !== "cancelled")
      .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const allItemsReady = (invoice) => {
    const items = (invoice.invoice_foods || []).filter((f) => f.status !== "cancelled");
    if (items.length === 0) return false;
    return items.every((item) => item.status === "ready" || item.status === "served");
  };

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
    if (!allItemsReady(selectedInvoice)) {
      setError(t(cashierT, "notReadyYet", lang));
      return;
    }
    if (!window.confirm(t(cashierT, "confirmMarkPaid", lang))) return;
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
    if (!window.confirm(t(cashierT, "confirmCancel", lang))) return;
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

  // ===== Print Bill =====
  const printBill = async () => {
    if (!selectedInvoice) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices/${selectedInvoice.id}/bill`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load bill");
      const data = await res.json();
      const bill = data.data || data;

      const printWindow = window.open("", "_blank", "width=400,height=600");

      let personsHtml = "";

      if (bill.persons && bill.persons.length > 0) {
        personsHtml = bill.persons.map((p) => {
          const itemsHtml = (p.items || [])
            .map((it) => `
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0;">
                <span>${it.name || it.food_name}${it.size ? ` (${it.size})` : ""} × ${it.quantity}</span>
                <span>${it.line_total ?? (it.unit_price * it.quantity)}</span>
              </div>
            `)
            .join("");
          return `
            <div style="margin-bottom:12px;">
              <div style="font-weight:bold;font-size:13px;border-bottom:1px solid #ccc;margin-bottom:4px;">Person ${p.person_number}</div>
              ${itemsHtml}
              <div style="text-align:right;font-size:12px;color:#555;margin-top:2px;">Subtotal: ${p.subtotal}</div>
            </div>
          `;
        }).join("");
      } else {
        const items = detailedItems(selectedInvoice);
        const grouped = {};
        items.forEach((item) => {
          if (!grouped[item.person_number]) grouped[item.person_number] = [];
          grouped[item.person_number].push(item);
        });

        personsHtml = Object.entries(grouped)
          .map(([personNum, personItems]) => {
            const itemsHtml = personItems
              .map((it) => `
                <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0;">
                  <span>${it.name}${it.size ? ` (${it.size})` : ""} × ${it.quantity}</span>
                  <span>${it.quantity * it.unit_price}</span>
                </div>
              `)
              .join("");
            const personSubtotal = personItems.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
            return `
              <div style="margin-bottom:12px;">
                <div style="font-weight:bold;font-size:13px;border-bottom:1px solid #ccc;margin-bottom:4px;">Person ${personNum}</div>
                ${itemsHtml}
                <div style="text-align:right;font-size:12px;color:#555;margin-top:2px;">Subtotal: ${personSubtotal}</div>
              </div>
            `;
          })
          .join("");
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Bill</title>
            <style>
              body { font-family: monospace; padding: 16px; }
              h2 { text-align: center; margin-bottom: 4px; }
              .meta { text-align: center; font-size: 12px; color: #555; margin-bottom: 16px; }
              hr { border: none; border-top: 1px dashed #000; margin: 12px 0; }
              .totals-row { display: flex; justify-content: space-between; font-size: 14px; padding: 3px 0; }
              .totals-row.final { font-weight: bold; font-size: 16px; }
            </style>
          </head>
          <body>
            <h2>${t(cashierT, "table", lang)} ${bill.table?.table_number || selectedTable?.table_number || ""}</h2>
            <div class="meta">${t(cashierT, "waiter", lang)}: ${bill.served_by || selectedInvoice.creator?.name || `User #${selectedInvoice.created_by}`}<br/>${new Date().toLocaleString()}</div>
            <hr />
            ${personsHtml}
            <hr />
            <div class="totals-row"><span>${t(cashierT, "subtotal", lang)}</span><span>${bill.subtotal ?? subtotal(selectedInvoice)}</span></div>
            <div class="totals-row"><span>${t(cashierT, "discount", lang)}</span><span>${bill.discount ?? selectedInvoice.discount}</span></div>
            <div class="totals-row final"><span>${t(cashierT, "totalAfterDiscount", lang)}</span><span>${bill.total ?? selectedInvoice.total}</span></div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      setError(err.message);
    }
  };

  // ===== Reservations tab =====
  const resetResForm = () => {
    setResForm({
      table_id: tables[0]?.id || "", name: "", phone_number: "",
      reservation_at: "", reservation_end: "", guest_count: 1, status: "pending", note: "",
    });
    setEditingResId(null);
  };

  const handleResSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResSuccess("");
    try {
      const url = editingResId ? `${API_BASE}/admin/reservations/${editingResId}` : `${API_BASE}/admin/reservations`;
      const method = editingResId ? "PUT" : "POST";
      const body = {
        table_id: resForm.table_id,
        name: resForm.name,
        phone_number: resForm.phone_number,
        reservation_at: new Date(resForm.reservation_at).toISOString(),
        reservation_end: new Date(resForm.reservation_end).toISOString(),
        guest_count: Number(resForm.guest_count),
        status: resForm.status,
        note: resForm.note || null,
      };
      const res = await fetch(url, { method, headers: jsonHeaders, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to save reservation");
      }
      const wasEditing = !!editingResId;
      resetResForm();
      fetchReservations();
      setResSuccess(wasEditing ? t(cashierT, "updateSuccess", lang) : t(cashierT, "addSuccess", lang));
      setTimeout(() => setResSuccess(""), 3000);
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

  const handleResEdit = (r) => {
    setEditingResId(r.id);
    setResForm({
      table_id: r.table_id, name: r.name, phone_number: r.phone_number,
      reservation_at: toLocalInput(r.reservation_at), reservation_end: toLocalInput(r.reservation_end),
      guest_count: r.guest_count, status: r.status, note: r.note || "",
    });
    resFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleResDelete = async (id) => {
    if (!window.confirm(t(cashierT, "confirmDelete", lang))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/reservations/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("Failed to delete reservation");
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const tableNumber = (id) => tables.find((t) => t.id === id)?.table_number || "-";
  const statusLabel = (status) => t(cashierT, status, lang);

  return (
    <div className="cashier-layout" dir={isRTL ? "rtl" : "ltr"}>
      <aside className="cashier-sidebar">
        <div className="cashier-lang-wrapper">
          <div className="cashier-lang-inline">
            🌐 {CASHIER_LANGUAGES.map((l, i) => (
              <span key={l.code}>
                <button className={`cashier-lang-btn ${lang === l.code ? "active" : ""}`} onClick={() => changeLanguage(l.code)}>
                  {l.label}
                </button>
                {i < CASHIER_LANGUAGES.length - 1 && " / "}
              </span>
            ))}
          </div>
        </div>

        <div className="cashier-welcome">
          {t(cashierT, "welcome", lang)}{user?.name ? `, ${user.name}` : ""}
        </div>

        <div className="cashier-sidebar-items">
          <div
            className={`cashier-sidebar-item ${section === "orders" ? "active" : ""}`}
            onClick={() => { setSection("orders"); closePanel(); }}
          >
            <span className="cashier-sidebar-icon">🧾</span>
            <span>{t(cashierT, "ordersTab", lang)}</span>
          </div>
          <div
            className={`cashier-sidebar-item ${section === "reservations" ? "active" : ""}`}
            onClick={() => { setSection("reservations"); closePanel(); }}
          >
            <span className="cashier-sidebar-icon">📅</span>
            <span>{t(cashierT, "reservationsTab", lang)}</span>
          </div>
        </div>

        <div className="cashier-sidebar-item cashier-logout" onClick={logout}>
          <span className="cashier-sidebar-icon">↩</span>
          <span>{t(cashierT, "logout", lang)}</span>
        </div>
      </aside>

      <main className="cashier-main">
        {error && <div className="admin-error" style={{ maxWidth: 500, margin: "0 auto 20px" }}>{error}</div>}

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : selectedTable ? (
          <div className="cashier-invoice-panel">
            <button className="cashier-back-btn" onClick={closePanel}>← {t(cashierT, "back", lang)}</button>
            <h2 className="cashier-invoice-panel-title">{t(cashierT, "table", lang)} {selectedTable.table_number}</h2>
            <p className="cashier-invoice-panel-waiter">{t(cashierT, "waiter", lang)}: {selectedInvoice.creator?.name || `User #${selectedInvoice.created_by}`}</p>

            {detailedItems(selectedInvoice).map((item, index, arr) => {
              const isNewPerson = index > 0 && arr[index - 1].person_number !== item.person_number;
              const isDone = item.status === "ready" || item.status === "served";
              return (
                <div key={item.id}>
                  {isNewPerson && <div className="cashier-person-divider" />}
                  <div className={`cashier-invoice-item-row ${isDone ? "cashier-invoice-item-row-done" : ""}`}>
                    <span>
                      {item.name}{item.size && ` (${item.size})`} × {item.quantity}
                      <span className="cashier-person-tag"> — Person {item.person_number}</span>
                    </span>
                    <span className="cashier-invoice-item-dots"></span>
                    <span className="cashier-invoice-item-price">{item.quantity * item.unit_price}</span>
                  </div>
                </div>
              );
            })}

            <div className="cashier-invoice-totals-row" style={{ marginTop: 16 }}>
              <span>{t(cashierT, "subtotal", lang)}</span>
              <span>{subtotal(selectedInvoice)}</span>
            </div>

            <div className="cashier-discount-section">
              <label className="cashier-discount-label">{t(cashierT, "discount", lang)}</label>
              <div className="cashier-discount-row">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                />
                <button className="cashier-discount-save-btn" onClick={saveDiscount}>{t(cashierT, "apply", lang)}</button>
              </div>
            </div>

            <div className="cashier-invoice-totals">
              <div className="cashier-invoice-totals-row final">
                <span>{t(cashierT, "totalAfterDiscount", lang)}</span>
                <span>{selectedInvoice.total}</span>
              </div>
            </div>

            <div className="cashier-invoice-actions">
              <button
                className="cashier-pay-btn"
                onClick={markAsPaid}
                disabled={!allItemsReady(selectedInvoice)}
                title={!allItemsReady(selectedInvoice) ? t(cashierT, "notReadyYet", lang) : ""}
              >
                {t(cashierT, "markAsPaid", lang)}
              </button>
              <button className="cashier-cancel-btn" onClick={cancelOrder}>{t(cashierT, "cancelOrder", lang)}</button>
            </div>
            {!allItemsReady(selectedInvoice) && (
              <p className="cashier-not-ready-note">{t(cashierT, "notReadyYet", lang)}</p>
            )}
            <button className="cashier-print-bill-btn" onClick={printBill}>🖨️ {t(cashierT, "printBill", lang)}</button>
          </div>
        ) : section === "orders" ? (
          <>
            <h1 className="cashier-title">{t(cashierT, "ordersTab", lang)}</h1>
            <div className="cashier-grid-boxes">
              {tables.map((tItem) => {
                const invoice = invoiceForTable(tItem.id);
                const status = invoice ? getOverallStatus(invoice) : null;
                return (
                  <button
                    key={tItem.id}
                    className={`cashier-grid-box ${status ? `cashier-grid-box-${status}` : ""}`}
                    onClick={() => openTable(tItem)}
                    disabled={!invoice}
                  >
                    {tItem.table_number}
                    {invoice && <span className="cashier-grid-box-total">{invoice.total}</span>}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h1 className="cashier-title">{t(cashierT, "reservationsTab", lang)}</h1>
            <form className="cashier-form" onSubmit={handleResSubmit} ref={resFormRef}>
              <h2>{editingResId ? t(cashierT, "updateReservation", lang) : t(cashierT, "addNew", lang)}</h2>
              {resSuccess && <div className="cashier-success">{resSuccess}</div>}
              <div className="cashier-form-row">
                <input placeholder={t(cashierT, "guestName", lang)} value={resForm.name} onChange={(e) => setResForm({ ...resForm, name: e.target.value })} required />
                <select value={resForm.table_id} onChange={(e) => setResForm({ ...resForm, table_id: e.target.value })} required>
                  <option value="">{t(cashierT, "selectTable", lang)}</option>
                  {tables.map((tItem) => <option key={tItem.id} value={tItem.id}>{tItem.table_number}</option>)}
                </select>
              </div>
              <div className="cashier-form-row">
                <input placeholder={t(cashierT, "phoneNumber", lang)} value={resForm.phone_number} onChange={(e) => setResForm({ ...resForm, phone_number: e.target.value })} required />
                <input type="number" min="1" max="50" placeholder={t(cashierT, "guestCount", lang)} value={resForm.guest_count} onChange={(e) => setResForm({ ...resForm, guest_count: e.target.value })} required />
              </div>
              <div className="cashier-form-row cashier-date-range-row">
                <div className="cashier-date-input-group">
                  <label className="cashier-date-input-label">{t(cashierT, "start", lang)}</label>
                  <input type="datetime-local" value={resForm.reservation_at} onChange={(e) => setResForm({ ...resForm, reservation_at: e.target.value })} required />
                </div>
                <div className="cashier-date-input-group">
                  <label className="cashier-date-input-label">{t(cashierT, "end", lang)}</label>
                  <input type="datetime-local" value={resForm.reservation_end} onChange={(e) => setResForm({ ...resForm, reservation_end: e.target.value })} required />
                </div>
              </div>
              <div className="cashier-form-row">
                <select value={resForm.status} onChange={(e) => setResForm({ ...resForm, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
                <input placeholder={t(cashierT, "notePlaceholder", lang)} value={resForm.note} onChange={(e) => setResForm({ ...resForm, note: e.target.value })} />
              </div>
              <div className="cashier-form-actions">
                <button type="submit" className="cashier-btn-primary">{editingResId ? t(cashierT, "update", lang) : t(cashierT, "add", lang)}</button>
                {editingResId && <button type="button" className="cashier-btn-secondary" onClick={resetResForm}>{t(cashierT, "cancel", lang)}</button>}
              </div>
            </form>

            <h2 className="cashier-subtitle">{t(cashierT, "allReservations", lang)}</h2>
            <div className="cashier-table-wrapper">
              <table className="cashier-table">
                <thead>
                  <tr>
                    <th>{t(cashierT, "guest", lang)}</th>
                    <th>{t(cashierT, "table", lang)}</th>
                    <th>{t(cashierT, "start", lang)}</th>
                    <th>{t(cashierT, "end", lang)}</th>
                    <th>{t(cashierT, "guests", lang)}</th>
                    <th>{t(cashierT, "status", lang)}</th>
                    <th>{t(cashierT, "actions", lang)}</th>
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
                        <button className="cashier-btn-small" onClick={() => handleResEdit(r)}>{t(cashierT, "edit", lang)}</button>
                        <button className="cashier-btn-small cashier-btn-danger" onClick={() => handleResDelete(r.id)}>{t(cashierT, "delete", lang)}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}