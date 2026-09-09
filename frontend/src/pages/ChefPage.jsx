import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../AuthContext";
import { chefT, t, CHEF_LANGUAGES } from "../chefTranslations";
import "../styles/ChefPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const KITCHEN_ICONS = ["👨‍🍳", "🍳", "🔪"];
const STAGE_ORDER = ["pending", "preparing"];
const NEXT_STATUS = {
  pending: "preparing",
  preparing: "ready",
};

const SIZE_LABELS = {
  L: { en: "Large", ar: "كبير", ku: "گەورە" },
  M: { en: "Medium", ar: "وسط", ku: "ناوەند" },
  S: { en: "Small", ar: "صغير", ku: "بچووک" },
};

export default function ChefPage() {
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem("chefLang") || "en");
  const isRTL = lang === "ar" || lang === "ku";
  const [tab, setTab] = useState("queue"); // queue | availability
  const [invoices, setInvoices] = useState([]);
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [alertTables, setAlertTables] = useState(new Set());

  const knownTableQuantities = useRef({});
  const hasLoadedOnce = useRef(false);
  const tableGroupRefs = useRef({});
  const [highlightLabel, setHighlightLabel] = useState(null);
  const alertAudioRef = useRef(null);

  const changeLanguage = (code) => {
    setLang(code);
    localStorage.setItem("chefLang", code);
  };

  const getLocalized = (field) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[lang] || field.en || Object.values(field)[0] || "";
  };

  const translateSize = (size) => {
    if (!size) return "";
    const letter = size.trim().charAt(0).toUpperCase();
    return SIZE_LABELS[letter]?.[lang] || size;
  };

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
      const invoiceList = data.data?.data || data.data || [];
      setInvoices(invoiceList.filter((inv) => inv.status === "pending"));
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
      setFoods(data.data?.data || data.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/categories`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.data?.data || data.data || []);
    } catch {
      // ignore silently
    }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/sub-categories`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setSubCategories(data.data?.data || data.data || []);
    } catch {
      // ignore silently
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchQueue(), fetchFoods(), fetchCategories(), fetchSubCategories()]).finally(() =>
      setLoading(false)
    );
    const interval = setInterval(fetchQueue, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect increases in active quantity per table (new items OR added quantity)
  useEffect(() => {
    const currentActiveItems = invoices.flatMap((inv) =>
      (inv.invoice_foods || [])
        .filter((f) => f.status === "pending" || f.status === "preparing")
        .map((f) => ({ ...f, tableLabel: inv.table?.table_number || `Invoice #${inv.id}` }))
    );

    const currentQuantities = {};
    currentActiveItems.forEach((item) => {
      currentQuantities[item.tableLabel] = (currentQuantities[item.tableLabel] || 0) + item.quantity;
    });

    if (hasLoadedOnce.current) {
      const newlyAlertingTables = [];
      Object.entries(currentQuantities).forEach(([tableLabel, qty]) => {
        const prevQty = knownTableQuantities.current[tableLabel] || 0;
        if (qty > prevQty) {
          newlyAlertingTables.push(tableLabel);
        }
      });

      if (newlyAlertingTables.length > 0) {
        setAlertTables((prev) => {
          const updated = new Set(prev);
          newlyAlertingTables.forEach((label) => updated.add(label));
          return updated;
        });

        const firstTable = newlyAlertingTables[0];
        setHighlightLabel(firstTable);
        setTimeout(() => {
          tableGroupRefs.current[firstTable]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        setTimeout(() => setHighlightLabel(null), 3000);
      }
    }

    knownTableQuantities.current = currentQuantities;
    hasLoadedOnce.current = true;
  }, [invoices]);

  // Loop the alert sound while any table has an active alert
  useEffect(() => {
    if (alertTables.size === 0) {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current = null;
      }
      return;
    }

    if (!alertAudioRef.current) {
      const audio = new Audio("/new-order-alert.mp3");
      audio.loop = true;
      audio.play().catch(() => {});
      alertAudioRef.current = audio;
    }

    return () => {
      // cleanup happens when alertTables becomes empty (handled above) or on unmount
    };
  }, [alertTables]);

  useEffect(() => {
    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
      }
    };
  }, []);

  const printOrderTicket = (tableLabel, waiterForTable, summary) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    const itemsHtml = summary
      .map(([name, data]) => {
        const notesHtml = data.notes
          .map((n) => `<div style="font-size:11px;color:#555;margin-left:10px;">P${n.person}: ${n.note}</div>`)
          .join("");
        return `
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-weight:bold;">
              <span>${name}</span>
              <span>× ${data.quantity}</span>
            </div>
            ${notesHtml}
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Ticket</title>
          <style>
            body { font-family: monospace; padding: 16px; }
            h2 { text-align: center; margin-bottom: 4px; }
            .meta { text-align: center; font-size: 12px; color: #555; margin-bottom: 16px; }
            hr { border: none; border-top: 1px dashed #000; margin: 12px 0; }
          </style>
        </head>
        <body>
          <h2>Table ${tableLabel}</h2>
          <div class="meta">Waiter: ${waiterForTable}<br/>${new Date().toLocaleString()}</div>
          <hr />
          ${itemsHtml}
          <hr />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const advanceAllInTable = async (items, tableLabel, waiterForTable, summary, wasPending) => {
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

      if (wasPending) {
        printOrderTicket(tableLabel, waiterForTable, summary);
        // Chef acknowledged this table's order — stop the alert for it
        setAlertTables((prev) => {
          const updated = new Set(prev);
          updated.delete(tableLabel);
          return updated;
        });
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
      .filter((f) => f.status === "pending" || f.status === "preparing")
      .map((f) => ({
        ...f,
        invoiceId: inv.id,
        tableNumber: inv.table?.table_number,
        waiterName: inv.creator?.name || `User #${inv.created_by}`,
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
      const key = `${item.foodName}${item.foodSize ? ` (${translateSize(item.foodSize)})` : ""}`;
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
    <div className="chef-page" dir={isRTL ? "rtl" : "ltr"}>
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
            <button className="chef-logout-btn chef-logout-left" onClick={logout}>↩ {t(chefT, "logout", lang)}</button>
            <h1 className="chef-title">{t(chefT, "title", lang)}</h1>
            <div className="chef-lang-inline chef-lang-right">
              🌐 {CHEF_LANGUAGES.map((l, i) => (
                <span key={l.code}>
                  <button className={`chef-lang-btn ${lang === l.code ? "active" : ""}`} onClick={() => changeLanguage(l.code)}>
                    {l.label}
                  </button>
                  {i < CHEF_LANGUAGES.length - 1 && " / "}
                </span>
              ))}
            </div>
          </div>

          <div className="chef-tabs">
            <button className={`chef-tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>
              {t(chefT, "kitchenQueue", lang)}
            </button>
            <button className={`chef-tab ${tab === "availability" ? "active" : ""}`} onClick={() => setTab("availability")}>
              {t(chefT, "foodAvailability", lang)}
            </button>
          </div>
        </div>

        {error && <div className="admin-error" style={{ maxWidth: 500, margin: "0 auto 20px" }}>{error}</div>}

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : tab === "queue" ? (
          Object.keys(groupedByTable).length === 0 ? (
            <p className="empty-queue">{t(chefT, "noActiveOrders", lang)}</p>
          ) : (
            Object.entries(groupedByTable).map(([tableLabel, items]) => {
              const summary = buildSummary(items);
              const overallStatus = getOverallStatus(items);
              const buttonLabel = overallStatus === "pending" || overallStatus === "preparing";
              const waiterForTable = items[0]?.waiterName;

              return (
                <div
                  key={tableLabel}
                  ref={(el) => (tableGroupRefs.current[tableLabel] = el)}
                  className={`table-group ${highlightLabel === tableLabel ? "table-group-highlight" : ""} ${alertTables.has(tableLabel) ? "table-group-alerting" : ""}`}
                >
                  <span className={`status-circle status-circle-${overallStatus}`} />

                  <div className="table-header-block">
                    <div className="table-header-name">{t(chefT, "table", lang)} {tableLabel}</div>
                    <div className="table-header-waiter">{t(chefT, "waiter", lang)}: {waiterForTable}</div>
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

                  {buttonLabel && (
                    <button
                      className="advance-all-btn"
                      onClick={() => advanceAllInTable(items, tableLabel, waiterForTable, summary, overallStatus === "pending")}
                    >
                      {overallStatus === "pending" ? t(chefT, "makeAllPreparing", lang) : t(chefT, "markAllReady", lang)}
                    </button>
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
                {t(chefT, "allCategories", lang)}
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
                  {t(chefT, "allSubCategories", lang)}
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
                      {food.size && <div className="availability-size">{translateSize(food.size)}</div>}
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