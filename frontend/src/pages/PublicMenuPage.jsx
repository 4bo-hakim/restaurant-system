import { useState, useEffect, useRef } from "react";
import "../styles/PublicMenuPage.css";

const API_BASE = "http://127.0.0.1:8000/api";

const getLocalized = (field, lang) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.en || Object.values(field)[0] || "";
};

const SIZE_RANK = { L: 0, M: 1, S: 2 };
const getSizeRank = (size) => {
  if (!size) return 3;
  const letter = size.trim().charAt(0).toUpperCase();
  return SIZE_RANK[letter] ?? 3;
};

const groupFoodsByName = (foods) => {
  const groups = {};
  foods.forEach((food) => {
    const key = JSON.stringify(food.name);
    if (!groups[key]) {
      groups[key] = {
        name: food.name,
        description: food.description,
        image_path: food.image_path,
        sizes: [],
      };
    }
    groups[key].sizes.push({ size: food.size, price: food.price });
  });
  return Object.values(groups).map((g) => ({
    ...g,
    sizes: g.sizes.sort((a, b) => getSizeRank(a.size) - getSizeRank(b.size)),
  }));
};

const slugify = (str) => str.replace(/\s+/g, "-");

const LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

const SEARCH_PLACEHOLDER = { en: "Search menu...", ar: "ابحث في القائمة...", ku: "لە مینیو بگەڕێ..." };

export default function PublicMenuPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSub, setActiveSub] = useState(null);
  const [lang, setLang] = useState(() => sessionStorage.getItem("menuLang") || "en");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoIndex, setPromoIndex] = useState(0);
  const isRTL = lang === "ar" || lang === "ku";

  const sectionRefs = useRef({});
  const navRefs = useRef({});
  const navScrollRef = useRef(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API_BASE}/menu`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Failed to load menu");
        const data = await res.json();
        setMenu(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const changeLanguage = (code) => {
    setLang(code);
    sessionStorage.setItem("menuLang", code);
    setShowLangMenu(false);
    setPromoIndex(0);
  };

  const promoImages = [1, 2, 3].map((n) => `/promo-${lang}-${n}.jpg`);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promoImages.length);
    }, 2100);
    return () => clearInterval(interval);
  }, [promoImages.length]);

  const allSubCategories = menu.flatMap((cat) =>
    (cat.sub_categories || []).map((sub) => ({
      id: slugify(getLocalized(sub.name, lang)),
      name: getLocalized(sub.name, lang),
      image_path: sub.image_path,
    }))
  );

  useEffect(() => {
    if (allSubCategories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSub(entry.target.dataset.subId);
          }
        });
      },
      { rootMargin: "-160px 0px -70% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, lang]);

  useEffect(() => {
    if (!activeSub) return;
    const navEl = navRefs.current[activeSub];
    if (navEl && navScrollRef.current) {
      navEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeSub]);

  const scrollToSub = (id) => {
    const el = sectionRefs.current[id];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (food) => {
    if (!query) return true;
    const name = getLocalized(food.name, lang).toLowerCase();
    return name.includes(query);
  };

  return (
    <div className="public-menu-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="menu-topbar">
        <div className="menu-topbar-left">
          <div className="menu-logo-circle">🍕</div>
          <span className="menu-brand-name">Our Restaurant</span>
        </div>
        <div className="menu-topbar-right">
          <button className="menu-topbar-icon-btn" onClick={() => setSearchOpen((s) => !s)} aria-label="Search">
            🔍
          </button>
          <div className="menu-lang-wrapper">
            <button className="menu-topbar-icon-btn" onClick={() => setShowLangMenu((s) => !s)} aria-label="Language">
              🌐
            </button>
            {showLangMenu && (
              <div className="menu-lang-dropdown">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`menu-lang-option ${lang === l.code ? "active" : ""}`}
                    onClick={() => changeLanguage(l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="menu-search-bar">
          <input
            type="text"
            autoFocus
            className="menu-search-input"
            placeholder={SEARCH_PLACEHOLDER[lang]}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="menu-promo-banner">
        <div
          className="menu-promo-track"
          style={{ transform: `translateX(${isRTL ? promoIndex * 100 : -promoIndex * 100}%)` }}
        >
          {promoImages.map((src, i) => (
            <div key={i} className="menu-promo-slide">
              <img src={src} alt={`Promo ${i + 1}`} className="menu-promo-image" />
            </div>
          ))}
        </div>
        <div className="menu-promo-dots">
          {promoImages.map((_, i) => (
            <span key={i} className={`menu-promo-dot ${promoIndex === i ? "active" : ""}`} />
          ))}
        </div>
      </div>

      {allSubCategories.length > 0 && (
        <div className="menu-nav">
          <div className="menu-nav-scroll" ref={navScrollRef}>
            {allSubCategories.map((sub) => (
              <button
                key={sub.id}
                ref={(el) => (navRefs.current[sub.id] = el)}
                className={`menu-nav-tile ${activeSub === sub.id ? "active" : ""}`}
                onClick={() => scrollToSub(sub.id)}
              >
                <div className="menu-nav-tile-image-wrap">
                  {sub.image_path ? (
                    <img
                      src={`http://127.0.0.1:8000/storage/${sub.image_path}`}
                      alt={sub.name}
                      className="menu-nav-tile-image"
                    />
                  ) : (
                    <span className="menu-nav-tile-fallback">🍽️</span>
                  )}
                </div>
                <span className="menu-nav-tile-label">{sub.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="menu-body">
        {loading && <p className="menu-status">Loading menu...</p>}
        {error && <p className="menu-status menu-status-error">{error}</p>}

        {!loading && !error && menu.length === 0 && (
          <p className="menu-status">No menu items available right now.</p>
        )}

        {menu.map((category) => {
          const catName = getLocalized(category.name, lang);
          return (
            <section key={catName} className="menu-category-section">
              <h2 className="menu-category-title">{catName}</h2>

              {category.sub_categories?.map((sub, subIdx) => {
                const subId = slugify(getLocalized(sub.name, lang));
                const groupedFoods = groupFoodsByName(sub.foods || []).filter(
                  (f) => matchesSearch(f)
                );
                if (query && groupedFoods.length === 0) return null;

                return (
                  <div
                    key={subIdx}
                    id={subId}
                    data-sub-id={subId}
                    ref={(el) => (sectionRefs.current[subId] = el)}
                    className="menu-subcategory-block"
                  >
                    <h3 className="menu-subcategory-title">{getLocalized(sub.name, lang)}</h3>

                    <div className="menu-food-grid">
                      {groupedFoods.map((food, foodIdx) => (
                        <div key={foodIdx} className="menu-food-card">
                          {food.image_path ? (
                            <img
                              src={`http://127.0.0.1:8000/storage/${food.image_path}`}
                              alt={getLocalized(food.name, lang)}
                              className="menu-food-image"
                            />
                          ) : (
                            <div className="menu-food-image menu-food-image-placeholder">🍽️</div>
                          )}

                          <div className="menu-food-info">
                            <h4 className="menu-food-name">{getLocalized(food.name, lang)}</h4>
                            {food.description && getLocalized(food.description, lang) && (
                              <p className="menu-food-desc">{getLocalized(food.description, lang)}</p>
                            )}

                            <div className="menu-food-sizes">
                              {food.sizes.map((s, i) => (
                                <div key={i} className="menu-food-size-row">
                                  {s.size && <span className="menu-food-size-label">{s.size}</span>}
                                  <span className="menu-food-size-dots"></span>
                                  <span className="menu-food-size-price">{s.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}