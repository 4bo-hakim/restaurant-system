import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import "../styles/WaiterPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const PERSON_COUNT = 8;
const STAGE_ORDER = ["pending", "preparing", "ready"];

const getLocalized = (field) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.en || Object.values(field)[0] || "";
};

export default function WaiterPage() {
  const { user } = useAuth();
  const [step, setStep] = useState("tables"); // tables -> menu
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(1);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [error, setError] = useState("");

  const [invoicesByTable, setInvoicesByTable] = useState({});
  const currentInvoice = invoicesByTable[selectedTable] || null;

  const [tableStatus, setTableStatus] = useState({}); // { [tableId]: 'pending' | 'preparing' | 'ready' }

  const [sentItems, setSentItems] = useState([]);
  const [cartsByTable, setCartsByTable] = useState({});
  const cart = cartsByTable[selectedTable] || [];

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${user?.token}`,
  };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  useEffect(() => {
    const fetchTables = async () => {
      setError("");
      try {
        let res = await fetch(`${API_BASE}/admin/tables/availability`, { headers: authHeaders });
        if (!res.ok) res = await fetch(`${API_BASE}/admin/tables`, { headers: authHeaders });
        if (!res.ok) throw new Error("Failed to load tables");
        const data = await res.json();
        setTables(data.data || []);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTableStatuses = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/invoices`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      const statusMap = {};
      (data.data || []).forEach((inv) => {
        if (inv.status !== "pending") return;
        const items = (inv.invoice_foods || []).filter((f) => f.status !== "cancelled" && f.status !== "served");
        if (items.length === 0) return;
        let lowestIndex = STAGE_ORDER.length - 1;
        items.forEach((item) => {
          const idx = STAGE_ORDER.indexOf(item.status);
          if (idx !== -1 && idx < lowestIndex) lowestIndex = idx;
        });
        statusMap[inv.table_id] = STAGE_ORDER[lowestIndex];
      });
      setTableStatus(statusMap);
    } catch {
      // ignore silently
    }
  };

  useEffect(() => {
  if (step !== "tables") return;
  refreshTableStatuses();
  const interval = setInterval(refreshTableStatuses, 5000); // live update every 5s
  return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [step]);

  useEffect(() => {
    if (step !== "menu") return;

    const fetchMenuData = async () => {
      setError("");
      try {
        const [catRes, subRes, foodRes] = await Promise.all([
          fetch(`${API_BASE}/admin/categories`, { headers: authHeaders }),
          fetch(`${API_BASE}/admin/sub-categories`, { headers: authHeaders }),
          fetch(`${API_BASE}/admin/foods`, { headers: authHeaders }),
        ]);
        if (!catRes.ok || !subRes.ok || !foodRes.ok) throw new Error("Failed to load menu data");
        const catData = await catRes.json();
        const subData = await subRes.json();
        const foodData = await foodRes.json();
        setCategories(catData.data || []);
        setSubCategories(subData.data || []);
        setFoods(foodData.data || []);
      } catch (err) {
        setError(err.message);
      }
    };

    const refreshFoodsOnly = async () => {
      try {
        const foodRes = await fetch(`${API_BASE}/admin/foods`, { headers: authHeaders });
        if (!foodRes.ok) return;
        const foodData = await foodRes.json();
        setFoods(foodData.data || []);
      } catch {
        // silently ignore
      }
    };

    fetchMenuData();
    const interval = setInterval(refreshFoodsOnly, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const loadSentItems = async (invoiceId) => {
    const itemsRes = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/food`, { headers: authHeaders });
    if (itemsRes.ok) {
      const itemsData = await itemsRes.json();
      setSentItems(
        (itemsData.data || [])
          .filter((i) => i.status !== "cancelled")
          .map((i) => ({
            id: i.id,
            food_id: i.food_id,
            name: getLocalized(i.food?.name),
            price: i.unit_price,
            person_number: i.person_number,
            quantity: i.quantity,
            originalQuantity: i.quantity,
            note: i.note || "",
          }))
      );
    }
  };

  useEffect(() => {
    if (step !== "menu" || !selectedTable) return;
    const checkExistingInvoice = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/invoices`, { headers: authHeaders });
        if (!res.ok) return;
        const data = await res.json();
        const existing = (data.data || []).find(
          (inv) => inv.table_id === selectedTable && inv.status === "pending"
        );
        if (existing) {
          setInvoicesByTable((prev) => ({ ...prev, [selectedTable]: existing }));
          await loadSentItems(existing.id);
        } else {
          setSentItems([]);
        }
      } catch {
        // silently ignore
      }
    };
    checkExistingInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedTable]);

  const visibleSubCategories = subCategories.filter((s) => s.category_id === activeCategory);
  const SIZE_RANK = { L: 0, M: 1, S: 2 };

const getSizeRank = (size) => {
  if (!size) return 3;
  const firstLetter = size.trim().charAt(0).toUpperCase();
  return SIZE_RANK[firstLetter] ?? 3;
};

const visibleFoods = foods
  .filter((f) => f.sub_category_id === activeSubCategory)
  .sort((a, b) => {
    const nameA = getLocalized(a.name);
    const nameB = getLocalized(b.name);
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    return getSizeRank(a.size) - getSizeRank(b.size);
  });
  const liveTotal =
    sentItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0) +
    cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const addToCart = (food) => {
    setCartsByTable((prev) => {
      const currentCart = prev[selectedTable] || [];
      const existing = currentCart.find((c) => c.food_id === food.id && c.person_number === selectedPerson);
      let updatedCart;
      if (existing) {
        updatedCart = currentCart.map((c) =>
          c.food_id === food.id && c.person_number === selectedPerson ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        updatedCart = [
          ...currentCart,
          { food_id: food.id, name: getLocalized(food.name), price: food.price, person_number: selectedPerson, quantity: 1, note: "" },
        ];
      }
      return { ...prev, [selectedTable]: updatedCart };
    });
  };

  const changeQty = (food_id, person_number, delta) => {
    setCartsByTable((prev) => {
      const currentCart = prev[selectedTable] || [];
      const updatedCart = currentCart
        .map((c) => (c.food_id === food_id && c.person_number === person_number ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0);
      return { ...prev, [selectedTable]: updatedCart };
    });
  };

  const changeNote = (food_id, person_number, note) => {
    setCartsByTable((prev) => {
      const currentCart = prev[selectedTable] || [];
      const updatedCart = currentCart.map((c) =>
        c.food_id === food_id && c.person_number === person_number ? { ...c, note } : c
      );
      return { ...prev, [selectedTable]: updatedCart };
    });
  };

  const changeSentQty = (itemId, delta) => {
    setSentItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
    );
  };

  const handleBack = () => {
    setStep("tables");
    setSelectedTable(null);
    setActiveCategory(null);
    setActiveSubCategory(null);
    setSentItems([]);
  };

  const handleSendOrder = async () => {
    setError("");
    try {
      let invoiceId = currentInvoice?.id;

      if (!invoiceId) {
        const items = cart.map((c) => ({
          food_id: c.food_id,
          person_number: c.person_number,
          quantity: c.quantity,
          note: c.note || null,
        }));
        const res = await fetch(`${API_BASE}/admin/invoices`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ table_id: selectedTable, discount: 0, items }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to create invoice");
        invoiceId = data.data.id;
      } else {
        for (const item of sentItems) {
          const delta = item.quantity - item.originalQuantity;
          if (delta === 0) continue;

          if (item.quantity <= 0) {
            const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/food/${item.id}`, {
              method: "DELETE",
              headers: authHeaders,
            });
            if (!res.ok) {
              const data = await res.json().catch(() => null);
              throw new Error(data?.message || "Failed to remove an item");
            }
          } else {
            const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/food/${item.id}/quantity`, {
              method: "PATCH",
              headers: jsonHeaders,
              body: JSON.stringify({ delta }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Failed to update item quantity");
          }
        }

        for (const c of cart) {
          const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/food`, {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify({
              food_id: c.food_id,
              person_number: c.person_number,
              quantity: c.quantity,
              note: c.note || null,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || "Failed to add new item");
        }
      }

      const refreshed = await fetch(`${API_BASE}/admin/invoices/${invoiceId}`, { headers: authHeaders });
      const refreshedData = await refreshed.json();
      setInvoicesByTable((prev) => ({ ...prev, [selectedTable]: refreshedData.data }));

      await loadSentItems(invoiceId);
      setCartsByTable((prev) => ({ ...prev, [selectedTable]: [] }));
      refreshTableStatuses();
      alert("Order updated!");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="waiter-page">
      {step === "tables" && (
        <>
          <div className="waiter-header">
            <h1 className="waiter-title">Waiter</h1>
          </div>
          {error && <div className="admin-error" style={{ maxWidth: 500, margin: "0 auto 20px" }}>{error}</div>}
          <div className="grid-boxes">
            {tables.map((t) => (
              <button
                key={t.id}
                className={`grid-box ${tableStatus[t.id] ? `grid-box-${tableStatus[t.id]}` : ""}`}
                onClick={() => {
                  setSelectedTable(t.id);
                  setStep("menu");
                }}
              >
                {t.table_number}
              </button>
            ))}
          </div>
        </>
      )}

      {step === "menu" && (
        <>
          <div className="waiter-header">
            <button className="waiter-back-btn" onClick={handleBack}>← Back</button>
            <div className="person-selector">
              {Array.from({ length: PERSON_COUNT }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`person-box ${selectedPerson === num ? "active" : ""}`}
                  onClick={() => setSelectedPerson(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <p className="waiter-breadcrumb">
            Table {tables.find((t) => t.id === selectedTable)?.table_number || selectedTable} · Person {selectedPerson}
          </p>

          {error && <div className="admin-error" style={{ maxWidth: 500, margin: "0 auto 20px" }}>{error}</div>}

          <div className="menu-layout">
            <div className="menu-browse">
              <h2 className="section-title">Categories</h2>
              <div className="chip-row">
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
                <>
                  <h2 className="section-title">Sub-categories</h2>
                  <div className="chip-row">
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
                </>
              )}

              {activeSubCategory && (
                <>
                  <h2 className="section-title">Food</h2>
                  <div className="food-list">
                    {visibleFoods.map((f) => (
                      <div key={f.id} className="food-card">
                        {f.image_path ? (
                          <img
                            src={`http://127.0.0.1:8000/storage/${f.image_path}`}
                            alt={getLocalized(f.name)}
                            className="food-card-image"
                          />
                        ) : (
                          <div className="food-card-image food-card-image-placeholder">🍽️</div>
                        )}
                        <div>
                          <div className="food-info-name">{getLocalized(f.name)}</div>
                          {f.size && <div className="food-info-size">{f.size}</div>}
                          <div className="food-info-price">{f.price}</div>
                        </div>
                        <button className="food-add-btn" onClick={() => addToCart(f)} disabled={!f.is_available}>
                          {f.is_available ? "Add" : "Unavailable"}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="menu-order">
              <h2 className="section-title">Order</h2>

              {sentItems.length === 0 && cart.length === 0 ? (
                <p className="empty-order">No items yet</p>
              ) : (
                <>
                  {sentItems.map((item) => (
                    <div key={`sent-${item.id}`} className="order-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span>{item.name} (P{item.person_number})</span>
                        <div className="order-item-qty-controls">
                          <button className="qty-btn qty-btn-minus" onClick={() => changeSentQty(item.id, -1)}>−</button>
                          <span>{item.quantity}</span>
                          <button className="qty-btn qty-btn-plus" onClick={() => changeSentQty(item.id, 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {cart.map((c) => (
                    <div key={`new-${c.food_id}-${c.person_number}`} className="order-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span>{c.name} (P{c.person_number}) <em style={{ color: "#3498db", fontStyle: "normal", fontSize: 11 }}>NEW</em></span>
                        <div className="order-item-qty-controls">
                          <button className="qty-btn qty-btn-minus" onClick={() => changeQty(c.food_id, c.person_number, -1)}>−</button>
                          <span>{c.quantity}</span>
                          <button className="qty-btn qty-btn-plus" onClick={() => changeQty(c.food_id, c.person_number, 1)}>+</button>
                        </div>
                      </div>
                      <input
                        className="qty-note-input"
                        placeholder="Note (optional)"
                        value={c.note}
                        onChange={(e) => changeNote(c.food_id, c.person_number, e.target.value)}
                      />
                    </div>
                  ))}

                  <div className="order-total">
                    <span>Total</span>
                    <span>{liveTotal}</span>
                  </div>
                  <button className="send-order-btn" onClick={handleSendOrder}>Send order to kitchen</button>
                </>
              )}

              {currentInvoice && (
                <div className="invoice-banner">
                  Invoice #{currentInvoice.id} — status: pending — total: {currentInvoice.total}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}