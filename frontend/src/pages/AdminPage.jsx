import { useState } from "react";
import { useAuth } from "../AuthContext";
import UsersSection from "../components/UsersSection";
import CategoriesSection from "../components/CategoriesSection";
import SubCategoriesSection from "../components/SubCategoriesSection";
import FoodsSection from "../components/FoodsSection";
import TablesSection from "../components/TablesSection";
import ReservationsSection from "../components/ReservationsSection";
import InvoicesSection from "../components/InvoicesSection";
import DashboardSection from "../components/DashboardSection";
import { ADMIN_LANGUAGES, adminT, t } from "../adminTranslations";
import "../styles/AdminPage.css";

const SECTION_KEYS = ["users", "dashboard", "categories", "subcategories", "foods", "tables", "reservations", "invoices"];
const SECTION_ICONS = {
  users: "+", dashboard: "📊", categories: "▤", subcategories: "▥",
  foods: "🍽", tables: "▦", reservations: "📅", invoices: "🧾",
};

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("users");
  const [lang, setLang] = useState(() => localStorage.getItem("adminLang") || "en");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const isRTL = lang === "ar" || lang === "ku";

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${user?.token}`,
  };

  const changeLanguage = (code) => {
    setLang(code);
    localStorage.setItem("adminLang", code);
    setShowLangMenu(false);
  };

  return (
    <div className="admin-layout" dir={isRTL ? "rtl" : "ltr"}>
      <aside className="admin-sidebar">
       <div className="sidebar-lang-wrapper">
  <div className="sidebar-lang-inline">
    <span className="sidebar-lang-globe">🌐</span>
    {ADMIN_LANGUAGES.map((l, i) => (
      <span key={l.code}>
        <button
          className={`sidebar-lang-inline-btn ${lang === l.code ? "active" : ""}`}
          onClick={() => changeLanguage(l.code)}
        >
          {l.label}
        </button>
        {i < ADMIN_LANGUAGES.length - 1 && <span className="sidebar-lang-sep"> / </span>}
      </span>
    ))}
  </div>
</div>

        <div className="sidebar-items-top">
          {SECTION_KEYS.map((key) => (
            <div
              key={key}
              className={`sidebar-item ${activeSection === key ? "active" : ""}`}
              onClick={() => setActiveSection(key)}
            >
              <span className="sidebar-icon">{SECTION_ICONS[key]}</span>
              <span>{t(adminT.sidebar, key, lang)}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-item sidebar-logout" onClick={logout}>
        <span className="sidebar-icon">↩</span>
        <span>{t(adminT.sidebar, "logout", lang)}</span>
      </div>
      </aside>

      <main className="admin-main">
        {activeSection === "users" && <UsersSection authHeaders={authHeaders} lang={lang} />}
        {activeSection === "dashboard" && <DashboardSection authHeaders={authHeaders} lang={lang} />}
        {activeSection === "categories" && <CategoriesSection authHeaders={authHeaders} lang={lang} />}
        {activeSection === "subcategories" && <SubCategoriesSection authHeaders={authHeaders} lang={lang} />}
        {activeSection === "foods" && <FoodsSection authHeaders={authHeaders} lang={lang} />}
        {activeSection === "tables" && <TablesSection authHeaders={authHeaders} lang={lang} />}
        {activeSection === "reservations" && <ReservationsSection authHeaders={authHeaders} lang={lang} />}
        {activeSection === "invoices" && <InvoicesSection authHeaders={authHeaders} lang={lang} />}
      </main>
    </div>
  );
}