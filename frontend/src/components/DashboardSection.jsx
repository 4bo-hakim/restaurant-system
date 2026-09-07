import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { adminT, t } from "../adminTranslations";

const API_BASE = "http://127.0.0.1:8000/api";

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString("en-US");
};

export default function DashboardSection({ authHeaders, lang }) {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [summary, setSummary] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [reservationsSummary, setReservationsSummary] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState({ completed: 0, pending: 0, cancelled: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvoicesAllPages = async (fromDate, toDate) => {
    let page = 1;
    let allInvoices = [];
    while (true) {
      const res = await fetch(`${API_BASE}/admin/invoices?from=${fromDate}&to=${toDate}&page=${page}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load invoices");
      const data = await res.json();
      const pageData = data.data?.data || data.data || [];
      allInvoices = allInvoices.concat(pageData);
      const lastPage = data.data?.last_page || 1;
      if (page >= lastPage) break;
      page++;
    }
    return allInvoices;
  };

  const fetchAll = async (fromDate, toDate) => {
    setLoading(true);
    setError("");
    try {
      const qs = `?from=${fromDate}&to=${toDate}`;
      const [summaryRes, topRes, resRes, allInvoices] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard/summary${qs}`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/dashboard/top-items${qs}`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/dashboard/reservations-summary${qs}`, { headers: authHeaders }),
        fetchInvoicesAllPages(fromDate, toDate),
      ]);

      if (!summaryRes.ok || !topRes.ok || !resRes.ok) throw new Error("Failed to load dashboard data");

      const summaryData = await summaryRes.json();
      const topData = await topRes.json();
      const resData = await resRes.json();

      setSummary(summaryData.data);
      setTopItems(topData.data || []);
      setReservationsSummary(resData.data);

      const completedInvoices = allInvoices.filter((inv) => inv.status === "completed");
      const byDay = {};
      completedInvoices.forEach((inv) => {
        const day = (inv.created_at || "").slice(0, 10);
        if (!day) return;
        byDay[day] = (byDay[day] || 0) + (inv.total || 0);
      });
      const sortedDays = Object.keys(byDay).sort();
      setDailySales(sortedDays.map((day) => ({ date: day, Revenue: byDay[day] })));

      const counts = { completed: 0, pending: 0, cancelled: 0, total: allInvoices.length };
      allInvoices.forEach((inv) => {
        if (inv.status === "completed") counts.completed++;
        else if (inv.status === "pending") counts.pending++;
        else if (inv.status === "cancelled") counts.cancelled++;
      });
      setInvoiceSummary(counts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = () => {
    if (from > to) {
      setError("'From' date cannot be after 'To' date");
      return;
    }
    fetchAll(from, to);
  };

  const topItemsChartData = topItems.map((i) => ({ name: i.food_name, Sold: i.total_quantity_sold }));

  return (
    <>
      <h1 className="admin-title">{t(adminT.dashboard, "title", lang)}</h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-form" style={{ maxWidth: 500 }}>
        <h2>{t(adminT.dashboard, "dateRange", lang)}</h2>
                    <div className="admin-form-row date-range-row">
            <div className="date-input-group">
                <label className="date-input-label">{t(adminT.reservations, "start", lang)}</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="date-input-group">
                <label className="date-input-label">{t(adminT.reservations, "end", lang)}</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            </div>
        <div className="admin-form-actions">
          <button className="admin-btn-primary" onClick={applyFilter}>{t(adminT.common, "apply", lang)}</button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: "center" }}>{t(adminT.common, "loading", lang)}</p>
      ) : (
        <>
          <h2 className="admin-subtitle">{t(adminT.dashboard, "summary", lang)}</h2>
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "totalRevenue", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(summary?.total_revenue)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "completedOrders", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(summary?.total_completed_orders)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "discountGiven", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(summary?.total_discount_given)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "avgOrderValue", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(summary?.average_order_value)}</span>
            </div>
            <div className="dashboard-card dashboard-card-highlight">
              <span className="dashboard-card-label">{t(adminT.dashboard, "activeTablesNow", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(summary?.active_tables)}</span>
            </div>
          </div>

          <h2 className="admin-subtitle">{t(adminT.dashboard, "dailySales", lang)}</h2>
          <div className="dashboard-panel">
            {dailySales.length === 0 ? (
              <p className="dashboard-empty">{t(adminT.dashboard, "noSales", lang)}</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#1A1B20" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#1A1B20" }} />
                  <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Line type="monotone" dataKey="Revenue" stroke="#14707F" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <h2 className="admin-subtitle">{t(adminT.dashboard, "invoiceSummary", lang)}</h2>
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "totalInvoices", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(invoiceSummary.total)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "completed", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(invoiceSummary.completed)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "pending", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(invoiceSummary.pending)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "cancelled", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(invoiceSummary.cancelled)}</span>
            </div>
          </div>

          <h2 className="admin-subtitle">{t(adminT.dashboard, "topSelling", lang)}</h2>
          <div className="dashboard-panel">
            {topItemsChartData.length === 0 ? (
              <p className="dashboard-empty">{t(adminT.dashboard, "noSalesRange", lang)}</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topItemsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#1A1B20" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#1A1B20" }} />
                  <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="Sold" fill="#14707F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <h2 className="admin-subtitle">{t(adminT.dashboard, "reservationsSummary", lang)}</h2>
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "pending", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(reservationsSummary?.pending)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "confirmed", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(reservationsSummary?.confirmed)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "cancelled", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(reservationsSummary?.cancelled)}</span>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-card-label">{t(adminT.dashboard, "completed", lang)}</span>
              <span className="dashboard-card-value">{formatNumber(reservationsSummary?.completed)}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}