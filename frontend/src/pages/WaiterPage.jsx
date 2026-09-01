import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import "../styles/WaiterPage.css";

const API_BASE = "http://127.0.0.1:8000/api";
const PERSON_COUNT = 8;

const getLocalized = (field) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.en || Object.values(field)[0] || "";
};

export default function WaiterPage() {
  const { user } = useAuth();
  const [step, setStep] = useState("tables"); // tables -> person -> menu
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [error, setError] = useState("");

  const [invoice, setInvoice] = useState(null);
  const [cartsByTable, setCartsByTable] = useState({}); // { [tableId]: [items] }
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
    fetchMenuData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const visibleSubCategories = subCategories.filter((s) => s.category_id === activeCategory);
  const visibleFoods = foods.filter((f) => f.sub_category_id === activeSubCategory);

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

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handleBack = () => {
    if (step === "menu") {
      setStep("person");
      setActiveCategory(null);
      setActiveSubCategory(null);
    } else if (step === "person") {
      setStep("tables");
      setSelectedTable(null);
      setInvoice(null);
    }
  };

  const handleSendOrder = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/invoices`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          table_id: selectedTable,
          discount: 0,
          items: cart.map((c) => ({
            food_id: c.food_id,
            person_number: c.person_number,
            quantity: c.quantity,
            note: c.note || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to create invoice");
      }
      setInvoice(data.data);
      setCartsByTable((prev) => ({ ...prev, [selectedTable]: [] }));
      alert("Order sent to the kitchen!");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="waiter-page">
      <div className="waiter-header">
        {step !== "tables" && <button className="waiter-back-btn" onClick={handleBack}>← Back</button>}
        <h1 className="waiter-title">Waiter</h1>
      </div>

      {step !== "tables" && (
        <p className="waiter-breadcrumb">
          Table {tables.find((t) => t.id === selectedTable)?.table_number || selectedTable}
          {selectedPerson && ` · Person ${selectedPerson}`}
        </p>
      )}

      {error && <div className="admin-error" style={{ maxWidth: 500, margin: "0 auto 20px" }}>{error}</div>}

      {step === "tables" && (
        <div className="grid-boxes">
          {tables.map((t) => (
            <button
              key={t.id}
              className="grid-box"
              onClick={() => {
                setSelectedTable(t.id);
                setStep("person");
              }}
            >
              {t.table_number}
            </button>
          ))}
        </div>
      )}

      {step === "person" && (
        <div className="grid-boxes">
          {Array.from({ length: PERSON_COUNT }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              className="grid-box"
              onClick={() => {
                setSelectedPerson(num);
                setStep("menu");
              }}
            >
              {num}
            </button>
          ))}
        </div>
      )}

      {step === "menu" && (
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
            {cart.length === 0 ? (
              <p className="empty-order">No items yet</p>
            ) : (
              <>
                {cart.map((c) => (
                  <div key={`${c.food_id}-${c.person_number}`} className="order-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span>{c.name} (P{c.person_number})</span>
                      <div className="order-item-qty-controls">
                        <button className="qty-btn" onClick={() => changeQty(c.food_id, c.person_number, -1)}>-</button>
                        <span>{c.quantity}</span>
                        <button className="qty-btn" onClick={() => changeQty(c.food_id, c.person_number, 1)}>+</button>
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
                  <span>{total}</span>
                </div>
                <button className="send-order-btn" onClick={handleSendOrder}>Send order to kitchen</button>
              </>
            )}

            {invoice && (
              <div className="invoice-banner">
                Invoice #{invoice.id} created — total so far: {invoice.total}. Add more items and send again to update it, or ask the cashier to close it out.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}