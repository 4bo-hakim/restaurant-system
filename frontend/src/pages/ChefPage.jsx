import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../AuthContext";
import "../styles/ChefPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const KITCHEN_ICONS = ["👨‍🍳", "🍳", "🔪"];
const STAGE_ORDER = ["pending", "preparing", "ready"];
const NEXT_STATUS = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};
const STAGE_BUTTON_LABEL = {
  pending: "Make all preparing",
  preparing: "Mark all ready",
};

const getLocalized = (field) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.en || Object.values(field)[0] || "";
};

export default function ChefPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("queue"); // queue | availability
  const [invoices, setInvoices] = useState([]);
  const [foods, setFoods] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const knownItemIds = useRef(new Set());
  const tableGroupRefs = useRef({});
  const [highlightLabel, setHighlightLabel] = useState(null);

  const floatingItems = useMemo(() => {
    const items = [];
    KITCHEN_ICONS.forEach((icon) => {
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

  const fetchQueue = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setInvoices((data.data || []).filter((inv) => inv.status === "pending"));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchFoods = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/foods`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load foods");
      const data = await res.json();
      setFoods(data.data || []);
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

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/categories`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.data || []);
    } catch {
      // ignore silently
    }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/sub-categories`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setSubCategories(data.data || []);
    } catch {
      // ignore silently
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchQueue(), fetchFoods(), fetchUsers(), fetchCategories(), fetchSubCategories()]).finally(() =>
      setLoading(false)
    );
    const interval = setInterval(fetchQueue, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentItems = invoices.flatMap((inv) =>
      (inv.invoice_foods || []).filter((f) => f.status !== "cancelled")
    );
    const currentIds = new Set(currentItems.map((i) => i.id));
    const isFirstLoad = knownItemIds.current.size === 0;
    const newItems = currentItems.filter((i) => !knownItemIds.current.has(i.id));

    if (!isFirstLoad && newItems.length > 0) {
      const newItem = newItems[0];
      const invoice = invoices.find((inv) =>
        (inv.invoice_foods || []).some((f) => f.id === newItem.id)
      );
      const label = invoice?.table?.table_number || `Invoice #${invoice?.id}`;

      setHighlightLabel(label);
      setTimeout(() => {
        tableGroupRefs.current[label]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setHighlightLabel(null), 3000);
    }

    knownItemIds.current = currentIds;
  }, [invoices]);

  const waiterName = (id) => users.find((u) => u.id === id)?.name || `User #${id}`;

  const advanceAllInTable = async (items) => {
    setError("");
    try {
      for (const item of items) {
        const nextStatus = NEXT_STATUS[item.status];
        if (!nextStatus) continue;
        const res = await fetch(`${API_BASE}/admin/invoices/${item.invoiceId}/food/${item.id}/status`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ status: nextStatus }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to update status");
      }
      fetchQueue();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleAvailability = async (food) => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/foods/${food.id}`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ _method: "PUT", is_available: !food.is_available }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update availability");
      fetchFoods();
    } catch (err) {
      setError(err.message);
    }
  };

  const activeItems = invoices.flatMap((inv) =>
    (inv.invoice_foods || [])
      .filter((f) => f.status !== "cancelled" && f.status !== "served")
      .map((f) => ({
        ...f,
        invoiceId: inv.id,
        tableNumber: inv.table?.table_number,
        waiterName: waiterName(inv.created_by),
        foodName: getLocalized(f.food?.name),
        foodSize: f.food?.size || null,
      }))
  );

  const groupedByTable = activeItems.reduce((groups, item) => {
    const key = item.tableNumber || `Invoice #${item.invoiceId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});

  const buildSummary = (items) => {
    const summary = {};
    items.forEach((item) => {
      const key = `${item.foodName}${item.foodSize ? ` (${item.foodSize})` : ""}`;
      if (!summary[key]) {
        summary[key] = { quantity: 0, notes: [] };
      }
      summary[key].quantity += item.quantity;
      if (item.note) {
        summary[key].notes.push({ person: item.person_number, note: item.note });
      }
    });
    return Object.entries(summary);
  };

  const getOverallStatus = (items) => {
    let lowestIndex = STAGE_ORDER.length - 1;
    items.forEach((item) => {
      const idx = STAGE_ORDER.indexOf(item.status);
      if (idx !== -1 && idx < lowestIndex) lowestIndex = idx;
    });
    return STAGE_ORDER[lowestIndex];
  };

  const visibleSubCategories = subCategories.filter((s) => s.category_id === activeCategory);
  const filteredFoods = foods.filter((f) => {
    if (activeSubCategory) return f.sub_category_id === activeSubCategory;
    if (activeCategory) {
      const subIds = subCategories.filter((s) => s.category_id === activeCategory).map((s) => s.id);
      return subIds.includes(f.sub_category_id);
    }
    return true;
  });

  return (
    <div className="chef-page">
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

      <div className="chef-content">
        <div className="chef-sticky-top">
          <div className="chef-header">
            <h1 className="chef-title">Chef</h1>
          </div>

          <div className="chef-tabs">
            <button className={`chef-tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>
              Kitchen queue
            </button>
            <button className={`chef-tab ${tab === "availability" ? "active" : ""}`} onClick={() => setTab("availability")}>
              Food availability
            </button>
          </div>
        </div>

        {error && <div className="admin-error" style={{ maxWidth: 500, margin: "0 auto 20px" }}>{error}</div>}

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : tab === "queue" ? (
          Object.keys(groupedByTable).length === 0 ? (
            <p className="empty-queue">No active orders right now.</p>
          ) : (
            Object.entries(groupedByTable).map(([tableLabel, items]) => {
              const summary = buildSummary(items);
              const overallStatus = getOverallStatus(items);
              const buttonLabel = STAGE_BUTTON_LABEL[overallStatus];
              const waiterForTable = items[0]?.waiterName;

              return (
                <div
                  key={tableLabel}
                  ref={(el) => (tableGroupRefs.current[tableLabel] = el)}
                  className={`table-group ${highlightLabel === tableLabel ? "table-group-highlight" : ""}`}
                >
                  <span className={`status-circle status-circle-${overallStatus}`} />

                  <div className="table-header-block">
                    <div className="table-header-name">Table {tableLabel}</div>
                    <div className="table-header-waiter">Waiter: {waiterForTable}</div>
                  </div>

                  <div className="table-summary">
                    {summary.map(([name, data]) => (
                      <div key={name} className="table-summary-block">
                        <div className="table-summary-row">
                          <span>{name}</span>
                          <span className="table-summary-dots"></span>
                          <span className="table-summary-qty">× {data.quantity}</span>
                        </div>
                        {data.notes.map((n, i) => (
                          <div key={i} className="table-summary-note">
                            P{n.person}: {n.note}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {buttonLabel ? (
                    <button className="advance-all-btn" onClick={() => advanceAllInTable(items)}>
                      {buttonLabel}
                    </button>
                  ) : (
                    <p className="ready-note">Ready — sent to cashier</p>
                  )}
                </div>
              );
            })
          )
        ) : (
          <>
            <div className="chip-row" style={{ maxWidth: 700, margin: "0 auto 12px" }}>
              <button
                className={`chip ${!activeCategory ? "active" : ""}`}
                onClick={() => { setActiveCategory(null); setActiveSubCategory(null); }}
              >
                All categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`chip ${activeCategory === c.id ? "active" : ""}`}
                  onClick={() => { setActiveCategory(c.id); setActiveSubCategory(null); }}
                >
                  {getLocalized(c.name)}
                </button>
              ))}
            </div>

            {activeCategory && (
              <div className="chip-row" style={{ maxWidth: 700, margin: "0 auto 20px" }}>
                <button
                  className={`chip ${!activeSubCategory ? "active" : ""}`}
                  onClick={() => setActiveSubCategory(null)}
                >
                  All sub-categories
                </button>
                {visibleSubCategories.map((s) => (
                  <button
                    key={s.id}
                    className={`chip ${activeSubCategory === s.id ? "active" : ""}`}
                    onClick={() => setActiveSubCategory(s.id)}
                  >
                    {getLocalized(s.name)}
                  </button>
                ))}
              </div>
            )}

            <div className="availability-list">
              {filteredFoods.map((food) => (
                <div key={food.id} className="availability-row">
                  <div className="availability-info">
                    {food.image_path ? (
                      <img
                        src={`http://127.0.0.1:8000/storage/${food.image_path}`}
                        alt={getLocalized(food.name)}
                        className="availability-image"
                      />
                    ) : (
                      <div className="availability-image availability-image-placeholder">🍽️</div>
                    )}
                    <div>
                      <div className="availability-name">{getLocalized(food.name)}</div>
                      {food.size && <div className="availability-size">{food.size}</div>}
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!food.is_available}
                      onChange={() => toggleAvailability(food)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}