import { useState } from "react";
import { useAuth } from "../AuthContext";
import UsersSection from "../components/UsersSection";
import CategoriesSection from "../components/CategoriesSection";
import SubCategoriesSection from "../components/SubCategoriesSection";
import FoodsSection from "../components/FoodsSection";
import TablesSection from "../components/TablesSection";
import ReservationsSection from "../components/ReservationsSection";
import InvoicesSection from "../components/InvoicesSection";
import "../styles/AdminPage.css";

const SECTIONS = [
  { key: "users", label: "Manage users", icon: "+" },
  { key: "categories", label: "Categories", icon: "▤" },
  { key: "subcategories", label: "Sub-categories", icon: "▥" },
  { key: "foods", label: "Foods", icon: "🍽" },
  { key: "tables", label: "Tables", icon: "▦" },
  { key: "reservations", label: "Reservations", icon: "📅" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("users");

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${user?.token}`,
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        {SECTIONS.map((s) => (
          <div
            key={s.key}
            className={`sidebar-item ${activeSection === s.key ? "active" : ""}`}
            onClick={() => setActiveSection(s.key)}
          >
            <span className="sidebar-icon">{s.icon}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </aside>

      <main className="admin-main">
        {activeSection === "users" && <UsersSection authHeaders={authHeaders} />}
        {activeSection === "categories" && <CategoriesSection authHeaders={authHeaders} />}
        {activeSection === "subcategories" && <SubCategoriesSection authHeaders={authHeaders} />}
        {activeSection === "foods" && <FoodsSection authHeaders={authHeaders} />}
        {activeSection === "tables" && <TablesSection authHeaders={authHeaders} />}
        {activeSection === "reservations" && <ReservationsSection authHeaders={authHeaders} />}
        {activeSection === "invoices" && <InvoicesSection authHeaders={authHeaders} />}
      </main>
    </div>
  );
}